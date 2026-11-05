"use client";
import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useCart, useLang } from "@/components/Providers";
import { Cover } from "@/components/Cover";
import { IconArrow, IconInfo } from "@/components/icons";
import { som, t } from "@/lib/i18n";
import { supabaseBrowser } from "@/lib/supabase/client";
import { placeOrder } from "@/app/actions";
import type { Book } from "@/lib/types";

type B = Pick<Book, "id" | "title" | "author" | "cover_path" | "paper_price" | "ebook_mode" | "ebook_price">;

export default function CartPage() {
  const lang = useLang();
  const cart = useCart();
  const [books, setBooks] = useState<Record<string, B>>({});
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", address: "", comment: "", pay: "mbank" as "mbank" | "cash" });
  const [err, setErr] = useState("");
  const [done, setDone] = useState<{ hasE: boolean; pay: string } | null>(null);
  const [pending, start] = useTransition();

  const ids = useMemo(() => [...new Set(cart.items.map((i) => i.book_id))], [cart.items]);
  useEffect(() => {
    const sb = supabaseBrowser();
    sb.auth.getUser().then(async ({ data }) => {
      setLoggedIn(!!data.user);
      if (data.user) {
        const { data: p } = await sb.from("profiles").select("full_name, phone").eq("id", data.user.id).single();
        if (p) setForm((f) => ({ ...f, name: f.name || p.full_name || "", phone: f.phone || p.phone || "" }));
      }
    });
  }, []);
  useEffect(() => {
    if (!ids.length) return;
    supabaseBrowser().from("books").select("id,title,author,cover_path,paper_price,ebook_mode,ebook_price").in("id", ids)
      .then(({ data }) => setBooks(Object.fromEntries((data ?? []).map((b: B) => [b.id, b]))));
  }, [ids]);

  const lines = cart.items.map((it, i) => {
    const b = books[it.book_id];
    const price = b ? (it.kind === "ebook" ? b.ebook_price : b.paper_price ?? 0) : 0;
    return { it, i, b, price };
  });
  const total = lines.reduce((a, l) => a + l.price * l.it.qty, 0);
  const needAddr = cart.items.some((i) => i.kind === "paper");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || form.phone.replace(/\D/g, "").length < 9) return setErr(t(lang, "err_contact"));
    if (needAddr && !form.address.trim()) return setErr(t(lang, "err_addr"));
    setErr("");
    start(async () => {
      const r = await placeOrder({ items: cart.items, ...form });
      if (!r.ok) return setErr(t(lang, "err_generic"));
      setDone({ hasE: cart.items.some((i) => i.kind === "ebook"), pay: form.pay });
      cart.clear();
    });
  }

  if (done) {
    const steps = done.pay === "mbank" ? ["st1", "st2", "st3", "st4"] as const : ["st1", "st4"] as const;
    return (
      <div className="wrap max-w-[640px] pt-7">
        <h1 className="text-[clamp(30px,8vw,44px)] font-semibold">{t(lang, "order_ok")}</h1>
        <ol className="my-5 grid gap-3">
          {[...steps, ...(done.hasE ? (["st5e"] as const) : [])].map((k, i) => (
            <li key={k} className="grid grid-cols-[30px_1fr] items-start gap-3 text-[15px]">
              <span className={`grid h-7 w-7 place-items-center rounded-full font-mono text-xs font-semibold ${i === 0 ? "bg-accent text-accent-ink" : "bg-soft2 text-muted"}`}>{i + 1}</span>
              {t(lang, k)}
            </li>
          ))}
        </ol>
        <div className="flex flex-wrap gap-2"><Link href="/orders" className="btn">{t(lang, "nav_orders")}</Link><Link href="/books" className="btn btn-line">{t(lang, "nav_books")}</Link></div>
      </div>
    );
  }

  return (
    <div className="wrap max-w-[720px] pt-7">
      <h1 className="text-[clamp(32px,9vw,52px)] font-semibold tracking-[-0.035em]">{t(lang, "cart")}</h1>
      {!cart.items.length ? (
        <div className="mt-6 grid justify-items-center gap-3.5 rounded-card border border-dashed border-line p-7 text-center text-muted">
          {t(lang, "cart_empty")}<Link href="/books" className="btn btn-sm">{t(lang, "nav_books")}</Link>
        </div>
      ) : (
        <>
          <div className="mt-4">
            {lines.map(({ it, i, b, price }) => (
              <div key={i} className="grid grid-cols-[56px_1fr_auto] items-center gap-3.5 border-b border-line py-3">
                {b ? <Cover book={b} /> : <div className="cv" />}
                <div className="min-w-0">
                  <b className="block text-[15px] font-semibold">{b?.title ?? "…"}</b>
                  <span className="text-sm text-muted">{it.kind === "ebook" ? t(lang, "kind_ebook") : t(lang, "kind_paper")} · {som(lang, price)}</span>
                </div>
                {it.kind === "ebook" ? (
                  <button className="h-8 w-8 rounded-full border border-line" aria-label={t(lang, "del")} onClick={() => cart.remove(i)}>×</button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button className="h-8 w-8 rounded-full border border-line font-bold" aria-label="−" onClick={() => cart.setQty(i, it.qty - 1)}>−</button>
                    <span className="tabular-nums">{it.qty}</span>
                    <button className="h-8 w-8 rounded-full border border-line font-bold" aria-label="+" onClick={() => cart.setQty(i, it.qty + 1)}>+</button>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="flex items-baseline justify-between py-4 font-semibold"><span>{t(lang, "sum")}</span><b className="text-[22px] tabular-nums">{som(lang, total)}</b></div>

          {loggedIn === false ? (
            <Link href="/login?next=/cart" className="btn w-full">{t(lang, "login_to")}</Link>
          ) : (
            <form onSubmit={submit} noValidate className="grid gap-3.5">
              <h2 className="text-2xl font-semibold">{t(lang, "checkout")}</h2>
              <label className="field">{t(lang, "name")}<input className="input" autoComplete="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
              <label className="field">{t(lang, "phone")}<input className="input" type="tel" inputMode="tel" autoComplete="tel" placeholder="+996 ___ ___ ___" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
              {needAddr
                ? <label className="field">{t(lang, "address")}<input className="input" autoComplete="street-address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></label>
                : <p className="text-sm text-muted">{t(lang, "no_addr")}</p>}
              <label className="field">{t(lang, "comment")}<textarea className="input" rows={2} value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })} /></label>
              <fieldset className="grid gap-2.5">
                <legend className="eb mb-2">{t(lang, "pay_m")}</legend>
                {([["mbank", "MBank QR", "mbank_d"], ["cash", t(lang, "cash"), "cash_d"]] as const).map(([v, label, d]) => (
                  <label key={v} className={`grid cursor-pointer grid-cols-[auto_1fr] gap-x-3 gap-y-1 rounded-[14px] border bg-card p-3.5 font-semibold ${form.pay === v ? "border-accent ring-1 ring-accent" : "border-line"}`}>
                    <input type="radio" name="pay" value={v} checked={form.pay === v} onChange={() => setForm({ ...form, pay: v })} className="mt-1 accent-[rgb(var(--accent))]" />
                    {label}
                    <span className="col-start-2 text-[13px] font-normal text-muted">{t(lang, d)}</span>
                  </label>
                ))}
              </fieldset>
              {err && <p role="alert" className="text-sm text-bad">{err}</p>}
              <button className="btn w-full" disabled={pending}>{t(lang, "send_order")} <IconArrow className="h-[18px] w-[18px]" /></button>
              <p className="note"><IconInfo className="mt-0.5 h-4 w-4 flex-none" />{t(lang, "mbank_d")}</p>
            </form>
          )}
        </>
      )}
    </div>
  );
}
