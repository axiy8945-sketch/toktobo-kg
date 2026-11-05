"use server";
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";

async function staffClient() {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error("auth");
  const { data: p } = await sb.from("profiles").select("role").eq("id", user.id).single();
  if (p?.role !== "staff" && p?.role !== "admin") throw new Error("forbidden");
  return { sb, user };
}

export async function setOrderStatus(orderId: string, status: "qr_sent" | "confirmed" | "cancelled") {
  const { sb } = await staffClient();
  const { error } = await sb.rpc("set_order_status", { p_order: orderId, p_status: status });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/orders");
  revalidatePath("/admin/access");
}

export async function revokeAccess(userId: string, bookId: string) {
  const { sb } = await staffClient();
  const { error } = await sb.from("entitlements").update({ revoked_at: new Date().toISOString() }).eq("user_id", userId).eq("book_id", bookId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/access");
}

export async function setRole(userId: string, formData: FormData) {
  const { sb, user } = await staffClient();
  const role = String(formData.get("role"));
  if (!["reader", "staff", "admin"].includes(role) || userId === user.id) return;
  // RLS: ролду admin гана өзгөртө алат (profiles_admin саясаты)
  const { error } = await sb.from("profiles").update({ role }).eq("id", userId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/staff");
}

export async function grantAccess(formData: FormData) {
  const { sb, user } = await staffClient();
  const userId = String(formData.get("user_id") || "");
  const bookId = String(formData.get("book_id") || "");
  if (!userId || !bookId) return;
  const { error } = await sb.from("entitlements").upsert({
    user_id: userId, book_id: bookId, source: "manual", granted_by: user.id, revoked_at: null,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/access");
}
