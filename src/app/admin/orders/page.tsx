import { supabaseServer } from "@/lib/supabase/server";
import { getLang } from "@/lib/lang";
import { som, t, type DictKey } from "@/lib/i18n";
import { setOrderStatus } from "../actions";

export default async function AdminOrders({ searchParams }: { searchParams: Promise<{ s?: string }> }) {
  const { s = "open" } = await searchParams;
  const lang = await getLang();
  const sb = await supabaseServer();
  let q = sb.from("orders").select("id, number, user_id, name, phone, address, comment, pay_method, status, total, created_at, order_items(title, kind, qty, unit_price)").order("created_at", { ascending: false }).limit(200);
  if (s === "open") q = q.in("status", ["pending", "qr_sent"]);
  const { data: orders } = await q;

  return (
    <div className="grid gap-4">
      <div className="flex gap-2">
        <a href="/admin/orders" className={`chip ${s === "open" ? "chip-on" : ""}`}>{t(lang, "s_pending")}</a>
        <a href="/admin/orders?s=all" className={`chip ${s !== "open" ? "chip-on" : ""}`}>{t(lang, "all")}</a>
      </div>
      {!orders?.length && <p className="text-muted">{t(lang, "orders_empty")}</p>}
      {orders?.map((o) => (
        <div key={o.id} className="grid gap-1.5 rounded-[18px] border border-line bg-card p-4 text-sm">
          <div className="flex justify-between gap-2.5 text-[15px] font-semibold"><span className="tabular-nums">№ {o.number}</span><span className="tabular-nums">{som(lang, o.total)}</span></div>
          <span>{t(lang, "customer")}: <b>{o.name}</b> · <a href={`tel:${o.phone}`} className="tabular-nums text-accent">{o.phone}</a></span>
          {o.address && <span className="text-muted">{o.address}</span>}
          {o.comment && <span className="text-muted">«{o.comment}»</span>}
          <ul className="my-1 grid gap-0.5">
            {(o.order_items as unknown as { title: string; kind: string; qty: number; unit_price: number }[]).map((i, k) => (
              <li key={k}>{i.title} · {i.kind === "ebook" ? t(lang, "kind_ebook") : t(lang, "kind_paper")}{i.qty > 1 ? ` × ${i.qty}` : ""} · {som(lang, i.unit_price * i.qty)}</li>
            ))}
          </ul>
          <span className="text-muted">{new Date(o.created_at).toLocaleString("ru-RU", { timeZone: "Asia/Bishkek" })} · {o.pay_method === "mbank" ? "MBank QR" : t(lang, "cash")}</span>
          <span className={`state justify-self-start ${o.status === "confirmed" ? "state-ok" : "state-wait"}`}>{t(lang, `s_${o.status}` as DictKey)}</span>
          {(o.status === "pending" || o.status === "qr_sent") && (
            <div className="mt-1.5 flex flex-wrap gap-2">
              {o.pay_method === "mbank" && o.status === "pending" && (
                <form action={setOrderStatus.bind(null, o.id, "qr_sent")}><button className="btn btn-line btn-sm">{t(lang, "mark_qr")}</button></form>
              )}
              <form action={setOrderStatus.bind(null, o.id, "confirmed")}><button className="btn btn-sm">{t(lang, "conf_pay")}</button></form>
              <form action={setOrderStatus.bind(null, o.id, "cancelled")}><button className="btn btn-line btn-sm">{t(lang, "cancel_ord")}</button></form>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
