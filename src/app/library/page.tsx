import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/supabase/server";
import { getLang } from "@/lib/lang";
import { t } from "@/lib/i18n";
import { getBooks, getPendingEbooks } from "@/lib/data";
import { BookGrid } from "@/components/BookCard";
import { SecHead } from "@/components/Bits";
import { Cover } from "@/components/Cover";
import { IconCheck, IconClock, IconLibrary, IconRead, IconRight } from "@/components/icons";
import { BOOK_COLUMNS, type Book } from "@/lib/types";

export const metadata = { title: "Китепканам" };

type Tab = "reading" | "done" | "open" | "waiting";

export default async function LibraryPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab: tabParam } = await searchParams;
  const lang = await getLang();
  const { supabase, user } = await getSession();
  if (!user) redirect("/login?next=/library");

  const [{ data: ents }, { data: prog }, pending, all] = await Promise.all([
    supabase.from("entitlements").select(`created_at, books(${BOOK_COLUMNS})`).eq("user_id", user.id).is("revoked_at", null).order("created_at", { ascending: false }),
    supabase.from("reading_progress").select("book_id, percent, finished, updated_at").eq("user_id", user.id),
    getPendingEbooks(user.id),
    getBooks(),
  ]);
  const progress = new Map((prog ?? []).map((p) => [p.book_id as string, p]));
  const mine = (ents ?? []).map((e) => e.books as unknown as Book).filter(Boolean);
  const owned = new Set(mine.map((b) => b.id));

  const reading = mine.filter((b) => progress.has(b.id) && !progress.get(b.id)!.finished)
    .sort((a, b) => String(progress.get(b.id)!.updated_at).localeCompare(String(progress.get(a.id)!.updated_at)));
  const done = mine.filter((b) => progress.get(b.id)?.finished);
  const waiting = all.filter((b) => pending.has(b.id) && !owned.has(b.id));
  const current = reading[0];

  const lists: Record<Tab, { title: string; books: Book[]; Icon: typeof IconRead }> = {
    reading: { title: t(lang, "reading_list"), books: reading, Icon: IconRead },
    open: { title: t(lang, "open_list"), books: mine, Icon: IconLibrary },
    done: { title: t(lang, "done_list"), books: done, Icon: IconCheck },
    waiting: { title: t(lang, "waiting_list"), books: waiting, Icon: IconClock },
  };
  const tab: Tab = (["reading", "open", "done", "waiting"] as Tab[]).includes(tabParam as Tab) ? (tabParam as Tab) : reading.length ? "reading" : "open";
  const sel = lists[tab];
  const notes = new Map(sel.books.map((b) => {
    const p = progress.get(b.id);
    return [b.id, p?.finished ? t(lang, "finished") : p ? `${Math.round(Number(p.percent))}%` : b.author] as [string, string];
  }));

  return (
    <div className="wrap">
      <div className="pt-6"><h1 className="text-[clamp(26px,7vw,36px)] font-bold">{t(lang, "nav_mylib")}</h1></div>

      {/* ---------- Азыр окуп жаткан китеп текчеде ---------- */}
      <section className="pt-4">
        {current ? (
          <Link href={current.file_path ? `/read/${current.id}` : `/books/${current.id}`} className="block overflow-hidden rounded-hero glass px-5 pt-6">
            <div className="grid grid-cols-[104px_1fr] items-end gap-5">
              <Cover book={current} className="relative z-[1] -mb-1 shadow-book" />
              <div className="min-w-0 pb-5">
                <b className="block truncate text-[18px] font-semibold">{current.title}</b>
                <span className="block truncate text-[14px] text-muted">{current.author}</span>
                <div className="mt-4 flex items-center gap-3">
                  <IconRead className="h-5 w-5 flex-none text-muted" />
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-soft-2"><i className="block h-full rounded-full bg-accent" style={{ width: `${Number(progress.get(current.id)?.percent ?? 0)}%` }} /></div>
                  <span className="text-[15px] font-semibold tabular-nums text-ink2">{Math.round(Number(progress.get(current.id)?.percent ?? 0))}%</span>
                </div>
              </div>
            </div>
            <div className="shelf-plank -mx-5" />
          </Link>
        ) : (
          <div className="grid justify-items-center gap-4 rounded-hero glass p-7 text-center">
            <p className="max-w-[34ch] text-ink2">{t(lang, "no_reading")}</p>
            <Link href="/books?fmt=ebook" className="btn btn-sm">{t(lang, "free_t")}</Link>
          </div>
        )}
      </section>

      {/* ---------- Тизмелер ---------- */}
      <nav className="pt-4">
        {(Object.keys(lists) as Tab[]).filter((k) => k !== "waiting" || waiting.length).map((k) => {
          const { title, books, Icon } = lists[k];
          return (
            <Link key={k} href={`/library?tab=${k}`} scroll={false} aria-current={tab === k ? "page" : undefined}
              className="flex items-center gap-4 border-b border-line py-4">
              <span className={`grid h-12 w-12 flex-none place-items-center rounded-full ${tab === k ? "bg-accent text-accent-ink" : "bg-soft"}`}><Icon className="h-6 w-6" /></span>
              <span className="min-w-0 flex-1">
                <b className="block text-[18px] font-medium">{title}</b>
                <span className="text-[14px] text-muted">{t(lang, "n_books", { n: books.length })}</span>
              </span>
              <IconRight className="h-5 w-5 text-muted" />
            </Link>
          );
        })}
      </nav>

      <section className="grid gap-4 pt-7">
        <SecHead title={sel.title} />
        {sel.books.length
          ? <BookGrid books={sel.books} lang={lang} owned={owned} notes={notes} />
          : <p className="tile text-center text-[15px] text-muted">{t(lang, "lib_empty")}</p>}
      </section>
    </div>
  );
}
