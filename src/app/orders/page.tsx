import { redirect } from "next/navigation";
import { getSession } from "@/lib/supabase/server";
import { getLang } from "@/lib/lang";
import { som, t, type DictKey } from "@/lib/i18n";

export const metadata = { title: "Заказдар" };

export default async function OrdersPage() {
  const lang = await getLang();
  const { supabase, user } = await getSession();
  if (!user) redirect("/login?next=/orders");
  const { data: orders } = await supabase
    .from("orders")
    .select("id, number, status, pay_method, total, bonus_used, bonus_earned, created_at, order_items(kind, qty, title)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="wrap max-w-[760px] pt-7">
      <h1 className="text-[clamp(26px,7vw,36px)] font-bold">{t(lang, "nav_orders")}</h1>
      <div className="mt-6 grid gap-3">
        {!orders?.length && <p className="text-muted">{t(lang, "orders_empty")}</p>}
        {orders?.map((o) => (
          <div key={o.id} className="grid gap-1.5 rounded-[18px] glass p-4 text-sm">
            <div className="flex justify-between gap-2.5 text-[15px] font-semibold">
              <span className="tabular-nums">№ {o.number}</span><span className="tabular-nums">{som(lang, o.total)}</span>
            </div>
            <span className="text-muted">{new Date(o.created_at).toLocaleString("ru-RU", { timeZone: "Asia/Bishkek" })} · {o.pay_method === "mbank" ? "MBank QR" : t(lang, "cash")}</span>
            <span>
              {(o.order_items as unknown as { kind: string; qty: number; title: string }[]).map((i) =>
                `${i.title} (${i.kind === "ebook" ? t(lang, "kind_ebook") : t(lang, "kind_paper")})${i.qty > 1 ? " × " + i.qty : ""}`).join(", ")}
            </span>
            {(o.bonus_used > 0 || o.bonus_earned > 0) && (
              <span className="flex flex-wrap gap-1.5">
                {o.bonus_used > 0 && <span className="tag">{t(lang, "bonus_used_n", { n: o.bonus_used })}</span>}
                {o.bonus_earned > 0 && o.status !== "cancelled" && <span className="tag tag-on">{t(lang, "bonus_earned_n", { n: o.bonus_earned })}{o.status === "confirmed" ? " ✓" : ""}</span>}
              </span>
            )}
            <span className={`state justify-self-start ${o.status === "confirmed" ? "state-ok" : "state-wait"}`}>{t(lang, `s_${o.status}` as DictKey)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
