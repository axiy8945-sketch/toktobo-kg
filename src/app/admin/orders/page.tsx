import { supabaseServer } from "@/lib/supabase/server";
import { getLang } from "@/lib/lang";
import { som, t, type DictKey } from "@/lib/i18n";
import { setOrderStatus } from "../actions";
import { waLink } from "@/lib/whatsapp";

export default async function AdminOrders({ searchParams }: { searchParams: Promise<{ s?: string }> }) {
  const { s = "open" } = await searchParams;
  const lang = await getLang();
  const sb = await supabaseServer();
  let q = sb.from("orders").select("id, number, user_id, name, phone, address, comment, pay_method, status, total, bonus_used, bonus_earned, created_at, order_items(title, kind, qty, unit_price)").order("created_at", { ascending: false }).limit(200);
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
          <span>{t(lang, "customer")}: <b>{o.name}</b> · <a href={`tel:${o.phone}`} className="tabular-nums text-accent-deep">{o.phone}</a></span>
          {o.address && <span className="text-muted">{o.address}</span>}
          {o.comment && <span className="text-muted">«{o.comment}»</span>}
          <ul className="my-1 grid gap-0.5">
            {(o.order_items as unknown as { title: string; kind: string; qty: number; unit_price: number }[]).map((i, k) => (
              <li key={k}>{i.title} · {i.kind === "ebook" ? t(lang, "kind_ebook") : t(lang, "kind_paper")}{i.qty > 1 ? ` × ${i.qty}` : ""} · {som(lang, i.unit_price * i.qty)}</li>
            ))}
          </ul>
          {o.bonus_used > 0 && <span className="font-semibold text-accent-deep">{t(lang, "bonus_used_n", { n: o.bonus_used })} · {t(lang, "sum")}: {som(lang, o.total)}</span>}
          <span className="text-muted">{new Date(o.created_at).toLocaleString("ru-RU", { timeZone: "Asia/Bishkek" })} · {o.pay_method === "mbank" ? "MBank QR" : t(lang, "cash")}</span>
          <span className={`state justify-self-start ${o.status === "confirmed" ? "state-ok" : "state-wait"}`}>{t(lang, `s_${o.status}` as DictKey)}</span>
          {(() => {
            const msg = o.pay_method === "mbank"
              ? `Саламатсызбы, ${o.name}! Toktobo: №${o.number} заказыңыз кабыл алынды. Төлөнө турган сумма: ${o.total} сом. Азыр MBank QR-кодун жөнөтөм.`
              : `Саламатсызбы, ${o.name}! Toktobo: №${o.number} заказыңыз кабыл алынды (${o.total} сом, накталай). Жеткирүү убактысын тактап алалы.`;
            const wa = waLink(o.phone, msg);
            return wa ? (
              <a href={wa} target="_blank" rel="noopener noreferrer"
                className="mt-1 inline-flex items-center justify-center gap-2 justify-self-start rounded-full bg-[#25D366] px-4 py-2.5 text-[13px] font-semibold text-white">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5.2 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.1-4.6-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.9s.7-2 1-2.3c.3-.3.6-.3.8-.3h.6c.2 0 .4 0 .6.5l.9 2.1c.1.2.1.4 0 .6l-.4.6-.4.4c-.1.2-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.3 2.4 1.5.3.1.5.1.6-.1l.9-1c.2-.3.4-.2.6-.1l2 .9c.3.1.5.2.5.3.1.2.1.7-.1 1.3z"/></svg>
                WhatsApp
              </a>
            ) : null;
          })()}
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
