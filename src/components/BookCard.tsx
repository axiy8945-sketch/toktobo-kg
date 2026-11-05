import Link from "next/link";
import type { Book, Lang } from "@/lib/types";
import { som, t } from "@/lib/i18n";
import { Cover } from "./Cover";
import { IconNE } from "./icons";

export function priceLine(lang: Lang, b: Book) {
  if (b.paper_price) return som(lang, b.paper_price);
  if (b.ebook_mode === "free") return t(lang, "free");
  if (b.ebook_mode === "paid") return som(lang, b.ebook_price);
  return "";
}

export function BookCard({ book, lang, owned = false }: { book: Book; lang: Lang; owned?: boolean }) {
  return (
    <article className="relative grid min-w-0 justify-items-center gap-3.5 rounded-card border border-line bg-card px-3.5 pb-5 pt-[22px] text-center transition hover:-translate-y-0.5 hover:shadow-book">
      <Link href={`/books/${book.id}`} className="grid w-full justify-items-center gap-3.5 rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent">
        <Cover book={book} className="w-full" />
        <div className="text-[17px] font-medium leading-snug [overflow-wrap:anywhere]">
          {book.title}
          <span className="mt-1 block text-sm text-muted">{book.author}</span>
        </div>
        <div className="text-[19px] font-semibold tabular-nums">{priceLine(lang, book)}</div>
      </Link>
      <div className="flex flex-wrap justify-center gap-1.5">
        {book.paper_price ? <span className="tag">{t(lang, "f_paper")}</span> : null}
        {book.ebook_mode !== "none" && <span className="tag tag-on">{book.ebook_mode === "free" ? t(lang, "free") : t(lang, "f_ebook")}</span>}
      </div>
      <Link href={owned ? `/read/${book.id}` : `/books/${book.id}`} className="lnk">
        {owned ? t(lang, "read_online") : t(lang, "more")} <IconNE className="h-4 w-4" />
      </Link>
    </article>
  );
}
