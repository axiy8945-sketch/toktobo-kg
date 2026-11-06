"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useCart } from "./Providers";
import { IconBag, IconMenu, IconNE, IconSearch, IconX, Logo } from "./icons";
import { LANG_COOKIE, t } from "@/lib/i18n";
import type { Lang } from "@/lib/types";
import { supabaseBrowser } from "@/lib/supabase/client";
import { ContactChips } from "./Contacts";


/** Бүгүнкү окуу максатынын тегерек көрсөткүчү */
function TodayRing({ min, goal }: { min: number; goal: number }) {
  const C = 2 * Math.PI * 19, p = Math.min(1, min / goal);
  return (
    <span className="relative grid h-11 w-11 place-items-center">
      <svg viewBox="0 0 44 44" className="absolute inset-0 -rotate-90" aria-hidden="true">
        <circle cx="22" cy="22" r="19" fill="none" stroke="rgb(var(--soft-2))" strokeWidth="4" />
        <circle cx="22" cy="22" r="19" fill="none" stroke="rgb(var(--accent))" strokeWidth="4" strokeLinecap="round"
          strokeDasharray={C} strokeDashoffset={C * (1 - p)} />
      </svg>
      <b className="text-[14px] font-bold tabular-nums text-accent-deep">{min}</b>
    </span>
  );
}

export function Header({ lang, loggedIn, isStaff, today }: {
  lang: Lang; loggedIn: boolean; isStaff: boolean; today: { min: number; goal: number } | null;
}) {
  const router = useRouter();
  const path = usePathname();
  const { items } = useCart();
  const [open, setOpen] = useState(false);
  const count = items.reduce((a, c) => a + c.qty, 0);

  useEffect(() => { setOpen(false); }, [path]);

  function setLang(v: Lang) {
    document.cookie = `${LANG_COOKIE}=${v}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  }
  async function logout() {
    await supabaseBrowser().auth.signOut();
    setOpen(false);
    router.push("/");
    router.refresh();
  }

  const links: [string, string][] = [
    ["/", t(lang, "nav_home")],
    ["/books", t(lang, "nav_books")],
    ["/library", t(lang, "nav_mylib")],
    ["/coach", t(lang, "nav_coach")],
    ["/progress", t(lang, "nav_profile")],
    ["/orders", t(lang, "nav_orders")],
    ...(isStaff ? ([["/admin", t(lang, "nav_admin")]] as [string, string][]) : []),
  ];
  const round = "grid h-11 w-11 place-items-center rounded-full bg-soft";

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-line bg-bg/90 pt-[env(safe-area-inset-top)] backdrop-blur-md">
        <div className="wrap flex items-center gap-1.5 py-2.5">
          <Link href="/" className="mr-auto" aria-label="Toktobo"><Logo /></Link>
          {today && (
            <Link href="/progress" aria-label={`${t(lang, "today")}: ${today.min} ${t(lang, "m")}`}><TodayRing {...today} /></Link>
          )}
          <Link href="/books?focus=1" className={round} aria-label={t(lang, "search_ph")}><IconSearch className="h-[22px] w-[22px]" /></Link>
          <Link href="/cart" className={`relative ${round}`} aria-label={t(lang, "cart")}>
            <IconBag className="h-[22px] w-[22px]" />
            {count > 0 && <span className="absolute -right-0.5 -top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-accent px-1 text-[11px] font-bold text-accent-ink">{count}</span>}
          </Link>
          <button onClick={() => setOpen(true)} className={round} aria-label={t(lang, "menu")} aria-expanded={open}>
            <IconMenu className="h-[22px] w-[22px]" />
          </button>
        </div>
      </header>

      {open && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
          <button className="absolute inset-0 bg-black/45" aria-label={t(lang, "back")} onClick={() => setOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 mx-auto max-h-[92vh] max-w-[640px] overflow-auto rounded-t-[28px] bg-bg px-[18px] pb-[calc(26px+env(safe-area-inset-bottom))] pt-3">
            <div className="mx-auto mb-3 h-1.5 w-11 rounded-full bg-line" />
            <div className="mb-2 flex items-center justify-between">
              <Logo />
              <button onClick={() => setOpen(false)} className={round} aria-label={t(lang, "back")}><IconX className="h-5 w-5" /></button>
            </div>

            <div className="my-3 grid grid-cols-3 gap-1 rounded-full bg-soft p-1" role="group" aria-label={t(lang, "lang_l")}>
              {(["ky", "uz", "ru"] as Lang[]).map((l) => (
                <button key={l} onClick={() => setLang(l)} aria-pressed={lang === l}
                  className={`rounded-full py-2 text-sm font-semibold ${lang === l ? "bg-card text-ink shadow-sm" : "text-muted"}`}>
                  {l === "ky" ? "Кыргызча" : l === "uz" ? "O'zbekcha" : "Русский"}
                </button>
              ))}
            </div>

            <nav className="grid">
              {links.map(([href, label]) => (
                <Link key={href} href={href} aria-current={path === href ? "page" : undefined}
                  className="flex items-center justify-between border-b border-line px-1 py-4 text-[20px] font-medium aria-[current=page]:text-accent-deep">
                  {label}<IconNE className="h-5 w-5 text-muted" />
                </Link>
              ))}
              {loggedIn ? (
                <button onClick={logout} className="px-1 py-4 text-left text-[20px] font-medium text-muted">{t(lang, "logout")}</button>
              ) : (
                <Link href="/login" className="btn mt-4">{t(lang, "login")}</Link>
              )}
            </nav>

            <div className="mt-5"><ContactChips /></div>
          </div>
        </div>
      )}
    </>
  );
}
