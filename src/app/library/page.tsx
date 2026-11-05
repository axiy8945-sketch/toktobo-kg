import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/supabase/server";
import { getLang } from "@/lib/lang";
import { t } from "@/lib/i18n";
import { getBooks, getPendingEbooks } from "@/lib/data";
import { BookCard } from "@/components/BookCard";
import { Cover } from "@/components/Cover";
import { IconRight } from "@/components/icons";
import { BOOK_COLUMNS, type Book } from "@/lib/types";

export const metadata = { title: "Менин китептерим" };

export default async function LibraryPage() {
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
  const mine = (ents ?? []).map((e) => e.books as unknown as Book).filter(Boolean)
    .sort((a, b) => String(progress.get(b.id)?.updated_at ?? "").localeCompare(String(progress.get(a.id)?.updated_at ?? "")));
  const owned = new Set(mine.map((b) => b.id));
  const waiting = all.filter((b) => pending.has(b.id) && !owned.has(b.id));
  const free = all.filter((b) => b.ebook_mode === "free" && !owned.has(b.id)).slice(0, 8);

  return (
    <div className="wrap">
      <div className="grid gap-2.5 pt-7">
        <span className="eb">{t(lang, "nav_lib")}</span>
        <h1 className="text-[clamp(32px,9vw,52px)] font-semibold leading-[1.05] tracking-[-0.035em]">{t(lang, "my_lib")}</h1>
      </div>
      <section className="grid gap-3 pt-[22px]">
        {mine.length ? mine.map((b) => {
          const p = progress.get(b.id);
          const pct = p?.finished ? 100 : Number(p?.percent ?? 0);
          return (
            <Link key={b.id} href={b.file_path ? `/read/${b.id}` : `/books/${b.id}`} className="grid grid-cols-[72px_1fr_auto] items-center gap-4 rounded-[20px] border border-line bg-card p-3.5">
              <Cover book={b} />
              <div className="min-w-0">
                <b className="block font-semibold">{b.title}</b>
                <span className="text-[13px] text-muted">{b.author} · {p?.finished ? t(lang, "finished") : !b.file_path ? t(lang, "no_file") : p ? `${Math.round(pct)}%` : t(lang, "not_started")}</span>
                <div className="mt-2 h-1.5 overflow-hidden rounded bg-soft2"><i className="block h-full rounded bg-accent" style={{ width: `${pct}%` }} /></div>
              </div>
              <IconRight className="h-5 w-5 text-muted" />
            </Link>
          );
        }) : (
          <div className="grid justify-items-center gap-3.5 rounded-card border border-dashed border-line p-7 text-center text-muted">
            {t(lang, "lib_empty")}<Link href="/books" className="btn btn-sm">{t(lang, "nav_books")}</Link>
          </div>
        )}
      </section>

      {waiting.length > 0 && (
        <section className="grid gap-3 pt-11">
          <span className="eb">{t(lang, "acc_wait")}</span>
          {waiting.map((b) => (
            <Link key={b.id} href={`/books/${b.id}`} className="grid grid-cols-[72px_1fr] items-center gap-4 rounded-[20px] border border-line bg-card p-3.5">
              <Cover book={b} /><div><b className="block font-semibold">{b.title}</b><span className="state state-wait mt-1.5">{t(lang, "acc_wait")}</span></div>
            </Link>
          ))}
        </section>
      )}

      {free.length > 0 && (
        <section className="grid gap-[22px] pt-11">
          <div className="grid gap-2.5"><span className="eb">{t(lang, "eb_free")}</span><h2 className="h2">{t(lang, "free_t")}</h2></div>
          <div className="grid grid-cols-2 gap-3.5 md:grid-cols-3 lg:grid-cols-4">{free.map((b) => <BookCard key={b.id} book={b} lang={lang} />)}</div>
        </section>
      )}
    </div>
  );
}
