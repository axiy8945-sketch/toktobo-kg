import Link from "next/link";
import type { Book, Lang } from "@/lib/types";
import { som, t } from "@/lib/i18n";
import { Cover } from "./Cover";
import { IconRead } from "./icons";

export function priceLine(lang: Lang, b: Book) {
  if (b.ebook_mode === "free") return t(lang, "free");
  if (b.paper_price) return som(lang, b.paper_price);
  if (b.ebook_mode === "paid") return som(lang, b.ebook_price);
  return "";
}

/** Бир китеп: мукаба, аталыш, автор жана тегерек аракет баскычы */
export function BookCard({ book, lang, owned = false, note }: { book: Book; lang: Lang; owned?: boolean; note?: string }) {
  const href = owned && book.file_path ? `/read/${book.id}` : `/books/${book.id}`;
  return (
    <article className="grid min-w-0 content-start justify-items-center gap-3 bg-card px-4 pb-5 pt-6 text-center">
      <Link href={`/books/${book.id}`} className="grid w-full justify-items-center gap-3 rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent">
        <Cover book={book} className="w-[76%] shadow-book" />
        <div className="w-full min-w-0">
          <div className="line-clamp-2 text-[16px] font-medium leading-snug">{book.title}</div>
          <div className="mt-0.5 truncate text-[14px] text-muted">{note ?? book.author}</div>
        </div>
      </Link>
      <Link href={href}
        className="inline-flex h-11 w-[76%] min-w-0 items-center justify-center gap-2 rounded-full border border-line px-3 text-[14px] font-semibold">
        {owned ? (<><IconRead className="h-[18px] w-[18px] flex-none" /> {t(lang, "read_btn")}</>)
          : <span className="truncate tabular-nums">{priceLine(lang, book) || t(lang, "more")}</span>}
      </Link>
    </article>
  );
}

/** Китептер торчосу: бир рамка ичинде ичке сызыктар менен бөлүнгөн уячалар */
export function BookGrid({ books, lang, owned, notes }: { books: Book[]; lang: Lang; owned: Set<string>; notes?: Map<string, string> }) {
  const n = books.length;
  const p2 = (2 - (n % 2)) % 2, p3 = (3 - (n % 3)) % 3, p4 = (4 - (n % 4)) % 4;
  const pads = Math.max(p2, p3, p4);
  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-card border border-line bg-line md:grid-cols-3 lg:grid-cols-4">
      {books.map((b) => <BookCard key={b.id} book={b} lang={lang} owned={owned.has(b.id)} note={notes?.get(b.id)} />)}
      {Array.from({ length: pads }, (_, i) => (
        <div key={`pad${i}`} aria-hidden="true"
          className={`bg-card ${i < p2 ? "block" : "hidden"} ${i < p3 ? "md:block" : "md:hidden"} ${i < p4 ? "lg:block" : "lg:hidden"}`} />
      ))}
    </div>
  );
}
