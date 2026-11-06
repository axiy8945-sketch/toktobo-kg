import Link from "next/link";
import { getSession } from "@/lib/supabase/server";
import { getLang } from "@/lib/lang";
import { catName, t } from "@/lib/i18n";
import { getAccessSet, getBooks, getCategories, getStats } from "@/lib/data";
import { BookGrid } from "@/components/BookCard";
import { Ornament, RUBRIC_COLORS, SecHead, Shelf } from "@/components/Bits";
import { INSTAGRAM } from "@/lib/brand";
import { IconInsta, IconSparkle, Logo } from "@/components/icons";

type SP = Promise<{ top?: string }>;

export default async function Home({ searchParams }: { searchParams: SP }) {
  const { top = "1" } = await searchParams;
  const days = top === "30" ? 30 : top === "7" ? 7 : 1;
  const lang = await getLang();
  const { supabase, user, profile } = await getSession();
  const goal = profile?.daily_goal ?? 15;

  const [books, cats, access, stats, topRes] = await Promise.all([
    getBooks(), getCategories(), getAccessSet(user?.id), getStats(user?.id, goal),
    supabase.rpc("top_books", { p_days: days, p_limit: 4 }),
  ]);

  const byId = new Map(books.map((b) => [b.id, b]));
  const shelf = [...books.filter((b) => b.cover_path), ...books.filter((b) => !b.cover_path)].slice(0, 3);
  const fresh = books.slice(0, 4);
  const free = books.filter((b) => b.ebook_mode === "free").slice(0, 4);
  const topRows = ((topRes.data ?? []) as { book_id: string; readers: number }[]).filter((r) => byId.has(r.book_id));
  const topBooks = topRows.map((r) => byId.get(r.book_id)!);
  const topNotes = new Map(topRows.map((r) => [r.book_id, t(lang, "readers_n", { n: r.readers })]));

  const authors = [...books.reduce((m, b) => m.set(b.author, (m.get(b.author) ?? 0) + 1), new Map<string, number>())]
    .sort((a, b) => b[1] - a[1]).slice(0, 12);
  const rubrics = cats.map((c) => ({ c, n: books.filter((b) => b.category_id === c.id).length })).filter((x) => x.n);

  const m = stats?.todayMin ?? 0, s = stats?.streak ?? 0, p = Math.min(1, m / goal), C = 2 * Math.PI * 34;
  const periods: [string, Parameters<typeof t>[1]][] = [["1", "per_day"], ["7", "per_week"], ["30", "per_month"]];

  return (
    <div className="wrap">
      {/* ---------- Баш бөлүк: текчедеги китептер ---------- */}
      <section className="mt-4 grid gap-5 overflow-hidden rounded-hero bg-soft px-5 pb-7 pt-8 text-center md:grid-cols-2 md:items-center md:px-10 md:py-12 md:text-left">
        <div className="grid justify-items-center gap-3 md:justify-items-start">
          <h1 className="text-[clamp(26px,7.4vw,44px)] font-bold leading-tight">{t(lang, "hero2_t")}</h1>
          <p className="max-w-[36ch] text-[16px] leading-relaxed text-ink2">{t(lang, "hero2_p")}</p>
          <Link href="/books" className="btn mt-2">{t(lang, "start")}</Link>
        </div>
        {shelf.length > 0 && <div className="mt-3"><Shelf books={shelf} /></div>}
      </section>

      {/* ---------- Бүгүнкү окуу ---------- */}
      {user && (
        <section className="pt-6">
          <Link href="/progress" className="grid grid-cols-[auto_1fr] items-center gap-4 rounded-card border border-line bg-card p-4">
            <div className="relative h-[76px] w-[76px]">
              <svg viewBox="0 0 76 76" className="h-full w-full -rotate-90" aria-hidden="true">
                <circle cx="38" cy="38" r="34" fill="none" stroke="rgb(var(--soft-2))" strokeWidth="6" />
                <circle cx="38" cy="38" r="34" fill="none" stroke="rgb(var(--accent))" strokeWidth="6" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - p)} />
              </svg>
              <span className="absolute inset-0 grid place-items-center text-center leading-tight">
                <span><b className="block text-xl font-bold tabular-nums">{m}</b><small className="text-[10px] text-muted">{t(lang, "of_goal", { g: goal })}</small></span>
              </span>
            </div>
            <div className="min-w-0">
              <b className="block text-[17px]">{m >= goal ? t(lang, "goal_done") : t(lang, "task", { n: goal })}</b>
              <span className="text-sm text-muted">{m >= goal ? t(lang, "today_p2", { s }) : m > 0 || s > 0 ? t(lang, "today_p1", { r: goal - m, s }) : t(lang, "today_p0")}</span>
            </div>
          </Link>
        </section>
      )}

      {/* ---------- Жаңы китептер ---------- */}
      <section className="grid gap-4 pt-9">
        <SecHead title={t(lang, "new_t")} href="/books" more={t(lang, "see_all")} />
        {fresh.length
          ? <BookGrid books={fresh} lang={lang} owned={access} />
          : <p className="rounded-card border border-dashed border-line p-7 text-center text-muted">{t(lang, "no_books")}</p>}
      </section>

      {/* ---------- Топ китептер ---------- */}
      <section className="grid gap-4 pt-9">
        <SecHead title={t(lang, "top_t")}>
          <div className="flex gap-1">
            {periods.map(([v, k]) => (
              <Link key={v} href={v === "1" ? "/" : `/?top=${v}`} scroll={false} aria-current={String(days) === v ? "page" : undefined}
                className={`rounded-full px-3.5 py-1.5 text-[14px] font-medium ${String(days) === v ? "bg-soft-2 text-ink shadow-sm" : "text-muted"}`}>
                {t(lang, k)}
              </Link>
            ))}
          </div>
        </SecHead>
        {topBooks.length
          ? <BookGrid books={topBooks} lang={lang} owned={access} notes={topNotes} />
          : <p className="tile text-center text-[15px] text-muted">{t(lang, "top_empty")}</p>}
      </section>

      {/* ---------- Авторлор ---------- */}
      {authors.length > 0 && (
        <section className="grid gap-4 pt-9">
          <SecHead title={t(lang, "authors_t")} href="/books" more={t(lang, "see_all")} />
          <div className="no-scrollbar -mx-[18px] flex gap-3 overflow-x-auto px-[18px] pb-1">
            {authors.map(([name, n]) => (
              <Link key={name} href={`/books?q=${encodeURIComponent(name)}`} className="flex w-[230px] flex-none items-center gap-3 rounded-[20px] bg-soft p-3 pr-4">
                <span className="grid h-14 w-14 flex-none place-items-center rounded-full bg-accent-soft text-lg font-bold text-accent-deep">
                  {name.replace(/[^\p{L}\s]/gu, "").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "•"}
                </span>
                <span className="min-w-0">
                  <b className="block truncate text-[16px] font-semibold">{name}</b>
                  <span className="text-[14px] text-muted">{t(lang, "n_books", { n })}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ---------- Рубрикалар ---------- */}
      {rubrics.length > 0 && (
        <section className="grid gap-4 pt-9">
          <SecHead title={t(lang, "rubrics_t")} href="/books" more={t(lang, "see_all")} />
          <div className="no-scrollbar -mx-[18px] flex gap-3 overflow-x-auto px-[18px] pb-1">
            {rubrics.map(({ c, n }) => {
              const [bg, fg] = RUBRIC_COLORS[c.id] ?? ["#EEE", "#333"];
              return (
                <Link key={c.id} href={`/books?cat=${c.id}`} className="grid w-[150px] flex-none gap-2">
                  <span className="grid aspect-[4/5] place-items-center rounded-[20px]" style={{ background: bg }}>
                    <Ornament color={fg} className="w-[70%]" />
                  </span>
                  <span className="min-w-0">
                    <b className="block truncate text-[15px] font-semibold">{catName(lang, c)}</b>
                    <span className="text-[13px] text-muted">{t(lang, "n_books", { n })}</span>
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* ---------- Акысыз окуу ---------- */}
      {free.length > 0 && (
        <section className="grid gap-4 pt-9">
          <SecHead title={t(lang, "free_t")} href="/books?fmt=ebook" more={t(lang, "see_all")} />
          <BookGrid books={free} lang={lang} owned={access} />
        </section>
      )}

      {/* ---------- AI коуч ---------- */}
      <section className="pt-9">
        <Link href="/coach" className="grid grid-cols-[auto_1fr] items-center gap-4 rounded-card bg-accent p-5 text-accent-ink">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-white/50"><IconSparkle className="h-7 w-7" /></span>
          <span className="min-w-0">
            <b className="block text-[18px]">{t(lang, "coach_t")}</b>
            <span className="text-[14px] opacity-80">{t(lang, "coach_p")}</span>
          </span>
        </Link>
      </section>

      {/* ---------- Футер ---------- */}
      <footer className="mt-12 grid gap-4 border-t border-line pb-3 pt-7">
        <Logo />
        <p className="text-sm text-muted">{t(lang, "publisher")} · Оку. Өнүк. Токтобо.</p>
        <div className="flex flex-wrap gap-2">
          {INSTAGRAM.map((i) => (
            <a key={i.handle} href={i.url} target="_blank" rel="noopener noreferrer" className="chip"><IconInsta className="h-4 w-4" /> @{i.handle}</a>
          ))}
        </div>
        <span className="text-xs text-muted">© 2026 Toktobo</span>
      </footer>
    </div>
  );
}
