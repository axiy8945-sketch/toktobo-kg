import Link from "next/link";
import { getSession } from "@/lib/supabase/server";
import { getLang } from "@/lib/lang";
import { catName, t } from "@/lib/i18n";
import { getAccessSet, getBooks, getCategories, getStats } from "@/lib/data";
import { BookCard } from "@/components/BookCard";
import { Cover } from "@/components/Cover";
import { IconArrow, IconNE } from "@/components/icons";

export default async function Home() {
  const lang = await getLang();
  const { user, profile } = await getSession();
  const goal = profile?.daily_goal ?? 15;
  const [books, cats, access, stats] = await Promise.all([getBooks(), getCategories(), getAccessSet(user?.id), getStats(user?.id, goal)]);
  const hero = books.find((b) => b.cover_path) ?? books[0];
  const free = books.filter((b) => b.ebook_mode === "free").slice(0, 4);
  const topics = cats.map((c) => ({ c, list: books.filter((b) => b.category_id === c.id) })).filter((x) => x.list.length);
  const [l1, l2, l3] = t(lang, "hero_t").split("|");

  const m = stats?.todayMin ?? 0, s = stats?.streak ?? 0, p = Math.min(1, m / goal), C = 2 * Math.PI * 42;

  return (
    <div className="wrap">
      <section className="mt-5 grid gap-[22px] overflow-hidden rounded-hero bg-soft px-6 pb-[30px] pt-[34px] md:grid-cols-[1.2fr_.8fr] md:items-center md:p-14">
        <div className="grid gap-[22px]">
          <h1 className="text-[clamp(40px,11.5vw,72px)] font-semibold leading-[1.02] tracking-[-0.035em]">
            <span className="block">{l1}</span><span className="block">{l2}</span><span className="block text-accent">{l3}</span>
          </h1>
          <p className="max-w-[32ch] text-[19px] leading-relaxed text-ink2">{t(lang, "hero_p")}</p>
          <div className="grid justify-items-start gap-3">
            <Link href="/books" className="btn">{t(lang, "cta_books")} <IconArrow className="h-[18px] w-[18px]" /></Link>
            <Link href="/library" className="btn btn-line">{t(lang, "cta_read")} <IconArrow className="h-[18px] w-[18px]" /></Link>
          </div>
        </div>
        {hero && (
          <Link href={`/books/${hero.id}`} className="mt-1.5 w-[min(270px,72%)] justify-self-center md:w-full">
            <Cover book={hero} className="shadow-book" />
          </Link>
        )}
      </section>

      <section className="grid gap-[22px] pt-11">
        <span className="eb">{t(lang, "eb_today")}</span>
        <div className="grid grid-cols-[auto_1fr] items-center gap-[18px] rounded-card border border-line bg-card p-[22px]">
          <div className="relative h-24 w-24">
            <svg viewBox="0 0 96 96" className="h-full w-full -rotate-90" aria-hidden="true">
              <circle cx="48" cy="48" r="42" fill="none" stroke="rgb(var(--soft-2))" strokeWidth="7" />
              <circle cx="48" cy="48" r="42" fill="none" stroke="rgb(var(--accent))" strokeWidth="7" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - p)} />
            </svg>
            <div className="absolute inset-0 grid place-items-center text-center leading-tight">
              <span><b className="block text-2xl font-semibold tabular-nums">{m}</b><small className="text-[11px] text-muted">{t(lang, "of_goal", { g: goal })}</small></span>
            </div>
          </div>
          <div className="min-w-0">
            <h3 className="text-xl font-semibold">{m >= goal ? t(lang, "goal_done") : t(lang, "task", { n: goal })}</h3>
            <p className="mb-3 mt-1 text-sm text-muted">
              {!user ? t(lang, "today_guest") : m >= goal ? t(lang, "today_p2", { s }) : m > 0 || s > 0 ? t(lang, "today_p1", { r: goal - m, s }) : t(lang, "today_p0")}
            </p>
            <Link href={user ? "/library" : "/login"} className="btn btn-sm">{user ? t(lang, "start") : t(lang, "login")}</Link>
          </div>
        </div>
      </section>

      <section className="grid gap-[22px] pt-11">
        <div className="flex items-end justify-between gap-4">
          <div className="grid gap-2.5"><span className="eb">{t(lang, "eb_books")}</span><h2 className="h2">{t(lang, "new_t")}</h2></div>
          <Link href="/books" className="lnk">{t(lang, "all")} <IconNE className="h-4 w-4" /></Link>
        </div>
        {books.length ? (
          <div className="grid grid-cols-2 gap-3.5 md:grid-cols-3 md:gap-[18px] lg:grid-cols-4">
            {books.slice(0, 8).map((b) => <BookCard key={b.id} book={b} lang={lang} owned={access.has(b.id)} />)}
          </div>
        ) : <p className="rounded-card border border-dashed border-line p-7 text-center text-muted">{t(lang, "no_books")}</p>}
      </section>

      {free.length > 0 && (
        <section className="grid gap-[22px] pt-11">
          <div className="grid gap-2.5"><span className="eb">{t(lang, "eb_free")}</span><h2 className="h2">{t(lang, "free_t")}</h2></div>
          <div className="grid grid-cols-2 gap-3.5 md:grid-cols-3 lg:grid-cols-4">
            {free.map((b) => <BookCard key={b.id} book={b} lang={lang} owned={access.has(b.id)} />)}
          </div>
        </section>
      )}

      {topics.length > 0 && (
        <section className="grid gap-[22px] pt-11">
          <div className="grid gap-2.5"><span className="eb">{t(lang, "eb_topic")}</span><h2 className="h2">{t(lang, "topic_t")}</h2></div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {topics.map(({ c, list }) => {
              const b = list.find((x) => x.cover_path) ?? list[0];
              return (
                <Link key={c.id} href={`/books?cat=${c.id}`} className="grid gap-2 rounded-card bg-soft px-[26px] pb-7 pt-[30px]">
                  <Cover book={b} className="mb-[22px] w-[min(230px,62%)] justify-self-center shadow-book" />
                  <b className="text-2xl font-medium tracking-[-0.02em]">{catName(lang, c)}</b>
                  <span className="text-[17px] text-muted">{t(lang, "n_books", { n: list.length })}</span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <section className="pt-11">
        <div className="grid gap-3.5 rounded-card bg-accent px-6 py-7 text-accent-ink">
          <span className="font-mono text-[13px] uppercase tracking-[0.16em] opacity-75">{t(lang, "eb_coach")}</span>
          <h3 className="text-[26px] font-semibold leading-tight">{t(lang, "coach_t")}</h3>
          <p className="opacity-85">{t(lang, "coach_p")}</p>
          <Link href="/coach" className="btn btn-sm justify-self-start !bg-accent-ink !text-accent">{t(lang, "coach_btn")} <IconArrow className="h-4 w-4" /></Link>
        </div>
      </section>

      <footer className="mt-14 grid gap-2.5 border-t border-line pb-2.5 pt-7 text-sm text-muted">
        <span className="font-semibold tracking-[0.06em] text-ink">ТОКТОБО KG</span>
        <span>© 2026 ТОКТОБО KG</span>
      </footer>
    </div>
  );
}
