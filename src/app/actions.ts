"use server";
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";
import type { CartItem } from "@/lib/types";
import { notifyNewOrder } from "@/lib/notify";

type Result<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };

export async function claimFreeBook(bookId: string): Promise<Result> {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { ok: false, error: "auth" };
  const { error } = await sb.rpc("claim_free_book", { p_book: bookId });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/library");
  revalidatePath(`/books/${bookId}`);
  return { ok: true };
}

export async function placeOrder(input: {
  items: CartItem[]; name: string; phone: string; address: string; comment: string; pay: "mbank" | "cash"; useBonus?: number;
}): Promise<Result<{ id: string }>> {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { ok: false, error: "auth" };
  if (!Array.isArray(input.items) || input.items.length === 0 || input.items.length > 50) return { ok: false, error: "empty" };
  const items = input.items.map((i) => ({ book_id: String(i.book_id), kind: i.kind === "ebook" ? "ebook" : "paper", qty: Math.max(1, Math.min(50, Number(i.qty) || 1)) }));
  const { data, error } = await sb.rpc("place_order", {
    p_items: items,
    p_name: input.name.slice(0, 120),
    p_phone: input.phone.slice(0, 40),
    p_address: input.address.slice(0, 300),
    p_comment: input.comment.slice(0, 1000),
    p_pay: input.pay === "cash" ? "cash" : "mbank",
    p_use_bonus: Math.max(0, Math.floor(Number(input.useBonus) || 0)),
  });
  if (error) return { ok: false, error: error.message };
  const { data: o } = await sb.from("orders")
    .select("number, name, phone, address, pay_method, total, bonus_used, order_items(title, kind, qty)")
    .eq("id", data as string).single();
  if (o) await notifyNewOrder({ ...o, items: (o.order_items ?? []) as unknown as { title: string; kind: string; qty: number }[] });
  revalidatePath("/orders");
  return { ok: true, data: { id: data as string } };
}

export async function setDailyGoal(goal: number): Promise<Result> {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { ok: false, error: "auth" };
  const g = Math.max(5, Math.min(240, Math.round(goal)));
  const { error } = await sb.from("profiles").update({ daily_goal: g }).eq("id", user.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/progress");
  revalidatePath("/");
  return { ok: true };
}

export async function updateProfile(input: { full_name: string; phone: string }): Promise<Result> {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { ok: false, error: "auth" };
  const { error } = await sb.from("profiles").update({
    full_name: input.full_name.trim().slice(0, 80) || null,
    phone: input.phone.trim().slice(0, 30) || null,
  }).eq("id", user.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/progress");
  return { ok: true };
}
