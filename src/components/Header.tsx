"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useCart } from "./Providers";
import { IconBag, IconChevron, IconMenu, IconNE, IconX, Mark } from "./icons";
import { LANG_COOKIE, t } from "@/lib/i18n";
import type { Lang } from "@/lib/types";
import { supabaseBrowser } from "@/lib/supabase/client";

export function Header({ lang, loggedIn, isStaff }: { lang: Lang; loggedIn: boolean; isStaff: boolean }) {
  const router = useRouter();
  const path = usePathname();
  const { items } = useCart();
  const [open, setOpen] = useState(false);
  const count = items.reduce((a, c) => a + c.qty, 0);

  useEffect(() => setOpen(false), [path]);

  function setLang(v: string) {
    document.cookie = `${LANG_COOKIE}=${v}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  }
  async function logout() {
    await supabaseBrowser().auth.signOut();
    router.push("/");
    router.refresh();
  }

  const links: [string, string][] = [
    ["/", t(lang, "nav_home")],
    ["/books", t(lang, "nav_books")],
    ["/library", t(lang, "nav_lib")],
    ["/coach", t(lang, "nav_coach")],
    ["/progress", t(lang, "nav_prog")],
    ["/orders", t(lang, "nav_orders")],
    ...(isStaff ? ([["/admin", t(lang, "nav_admin")]] as [string, string][]) : []),
  ];

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-line bg-bg/90 pt-[env(safe-area-inset-top)] backdrop-blur-md">
        <div className="wrap flex items-center gap-3.5 py-3">
          <Link href="/" className="mr-auto flex items-center gap-2.5 text-ink" aria-label="ТОКТОБО KG">
            <Mark className="h-[38px] w-[38px]" />
            <span className="grid leading-none">
              <b className="text-[19px] font-bold tracking-[0.06em]">ТОКТОБО</b>
              <small className="mt-1 font-mono text-[9px] tracking-[0.32em] text-muted">KG · КИТЕП</small>
            </span>
          </Link>
          <label className="relative flex items-center">
            <span className="sr-only">Language</span>
            <select value={lang} onChange={(e) => setLang(e.target.value)}
              className="appearance-none bg-transparent py-2 pl-1.5 pr-6 font-mono text-[15px] font-semibold tracking-[0.08em]">
              <option value="ky">KY</option><option value="uz">UZ</option><option value="ru">RU</option>
            </select>
            <IconChevron className="pointer-events-none absolute right-0.5 h-3.5 w-3.5" />
          </label>
          <Link href="/cart" className="relative grid h-[46px] w-[46px] place-items-center rounded-[14px]" aria-label={t(lang, "cart")}>
            <IconBag className="h-6 w-6" />
            {count > 0 && <span className="absolute right-0.5 top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-accent px-1 text-[11px] font-bold text-accent-ink">{count}</span>}
          </Link>
          <button onClick={() => setOpen(true)} className="grid h-[46px] w-[46px] place-items-center rounded-[14px] border border-line bg-card" aria-label={t(lang, "menu")} aria-expanded={open}>
            <IconMenu className="h-6 w-6" />
          </button>
        </div>
      </header>

      {open && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
          <button className="absolute inset-0 bg-black/45" aria-label={t(lang, "back")} onClick={() => setOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 mx-auto max-h-[92vh] max-w-[640px] overflow-auto rounded-t-[26px] bg-bg px-[18px] pb-[calc(26px+env(safe-area-inset-bottom))] pt-3">
            <div className="mb-3.5 flex items-center justify-between">
              <h2 className="text-2xl font-semibold">{t(lang, "menu")}</h2>
              <button onClick={() => setOpen(false)} className="grid h-10 w-10 place-items-center rounded-xl border border-line" aria-label={t(lang, "back")}><IconX className="h-5 w-5" /></button>
            </div>
            <nav className="grid">
              {links.map(([href, label]) => (
                <Link key={href} href={href} aria-current={path === href ? "page" : undefined}
                  className="flex items-center justify-between border-b border-line px-1 py-4 text-[22px] font-medium aria-[current=page]:text-accent">
                  {label}<IconNE className="h-5 w-5 text-muted" />
                </Link>
              ))}
              {loggedIn ? (
                <button onClick={logout} className="flex items-center justify-between px-1 py-4 text-left text-[22px] font-medium text-muted">{t(lang, "logout")}</button>
              ) : (
                <Link href="/login" className="btn mt-4">{t(lang, "login")}</Link>
              )}
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
