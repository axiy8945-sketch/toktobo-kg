import Link from "next/link";
import { getSession } from "@/lib/supabase/server";
import { getLang } from "@/lib/lang";
import { catName, t } from "@/lib/i18n";
import { getAccessSet, getBooks, getCategories } from "@/lib/data";
import { BookCard } from "@/components/BookCard";
import { IconSearch } from "@/components/icons";

export const metadata = { title: "Китептер" };

type SP = Promise<{ q?: string; cat?: string; fmt?: string }>;

export default async function BooksPage({ searchParams }: { searchParams: SP }) {
  const { q = "", cat = "", fmt = "all" } = await searchParams;
  const lang = await getLang();
  const { user } = await getSession();
  const [books, cats, access] = await Promise.all([getBooks(), getCategories(), getAccessSet(user?.id)]);
  const needle = q.trim().toLowerCase();
  const list = books.filter((b) => {
    if (needle && !(b.title.toLowerCase().includes(needle) || b.author.toLowerCase().includes(needle))) return false;
    if (cat && b.category_id !== cat) return false;
    if (fmt === "paper" && !b.paper_price) return false;
    if (fmt === "ebook" && b.ebook_mode === "none") return false;
    return true;
  });
  const href = (p: Record<string, string>) => {
    const base: Record<string, string> = {};
    if (q) base.q = q;
    if (cat) base.cat = cat;
    if (fmt !== "all") base.fmt = fmt;
    const sp = new URLSearchParams({ ...base, ...p });
    for (const [k, v] of [...sp.entries()]) if (!v || (k === "fmt" && v === "all")) sp.delete(k);
    const s = sp.toString();
    return s ? `/books?${s}` : "/books";
  };
  const counts = new Map<string, number>();
  for (const b of books) if (b.category_id) counts.set(b.category_id, (counts.get(b.category_id) ?? 0) + 1);

  return (
    <div className="wrap">
      <div className="grid gap-2.5 pt-7">
        <span className="eb">{t(lang, "eb_books")}</span>
        <h1 className="text-[clamp(32px,9vw,52px)] font-semibold leading-[1.05] tracking-[-0.035em]">{t(lang, "all_books")}</h1>
      </div>
      <section className="grid gap-3.5 pt-[22px]">
        <form action="/books" className="flex items-center gap-2.5 rounded-2xl bg-soft px-4">
          <IconSearch className="h-5 w-5 flex-none text-muted" />
          {cat && <input type="hidden" name="cat" value={cat} />}
          {fmt !== "all" && <input type="hidden" name="fmt" value={fmt} />}
          <input name="q" type="search" defaultValue={q} placeholder={t(lang, "search_ph")} aria-label={t(lang, "search_ph")}
            className="min-w-0 flex-1 bg-transparent py-[15px] text-base outline-none" />
        </form>
        <div className="no-scrollbar -mx-0.5 flex gap-2 overflow-x-auto px-0.5 pb-1">
          <Link href={href({ cat: "" })} className={`chip ${!cat ? "chip-on" : ""}`}>{t(lang, "all")} <small className="opacity-70">{books.length}</small></Link>
          {cats.filter((c) => counts.get(c.id)).map((c) => (
            <Link key={c.id} href={href({ cat: c.id })} className={`chip ${cat === c.id ? "chip-on" : ""}`}>
              {catName(lang, c)} <small className="opacity-70">{counts.get(c.id)}</small>
            </Link>
          ))}
        </div>
        <div className="no-scrollbar -mx-0.5 flex gap-2 overflow-x-auto px-0.5 pb-1">
          {([["all", "f_all"], ["paper", "f_paper"], ["ebook", "f_ebook"]] as const).map(([k, l]) => (
            <Link key={k} href={href({ fmt: k })} className={`chip ${fmt === k ? "chip-on" : ""}`}>{t(lang, l)}</Link>
          ))}
        </div>
      </section>
      <section className="pt-[18px]">
        {list.length ? (
          <div className="grid grid-cols-2 gap-3.5 md:grid-cols-3 md:gap-[18px] lg:grid-cols-4">
            {list.map((b) => <BookCard key={b.id} book={b} lang={lang} owned={access.has(b.id)} />)}
          </div>
        ) : <p className="rounded-card border border-dashed border-line p-7 text-center text-muted">{t(lang, "no_results")}</p>}
      </section>
    </div>
  );
}
