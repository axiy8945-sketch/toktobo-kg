import Link from "next/link";
import type React from "react";
import type { Book } from "@/lib/types";
import { Cover } from "./Cover";

/** Бөлүмдүн аталышы жана «Баары →» шилтемеси */
export function SecHead({ title, href, more, children }: { title: string; href?: string; more?: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="h2">{title}</h2>
      {children}
      {href && more && <Link href={href} className="lnk">{more} <span aria-hidden="true">→</span></Link>}
    </div>
  );
}

/** Жыгач текчеде турган китептер */
export function Shelf({ books, size = "md" }: { books: Pick<Book, "id" | "title" | "author" | "cover_path">[]; size?: "sm" | "md" }) {
  const w = size === "sm" ? "w-[30%] max-w-[110px]" : "w-[30%] max-w-[150px]";
  return (
    <div className="relative">
      <div className="relative z-[1] flex items-end justify-center gap-[3%] px-[6%]">
        {books.map((b) => (
          <Link key={b.id} href={`/books/${b.id}`} className={`${w} -mb-1 transition hover:-translate-y-1`}>
            <Cover book={b} className="shadow-book" />
          </Link>
        ))}
      </div>
      <div className="shelf-plank mx-[2%]" />
    </div>
  );
}

/** Кыргыз оймосу (кочкор мүйүз) — рубрика плиткалары үчүн */
export function Ornament({ color, className = "" }: { color: string; className?: string }) {
  const horn = "M50 50c0-14-15-20-21-12-4 6 3 12 7 8M50 50c0-14 15-20 21-12 4 6-3 12-7 8";
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <g fill="none" stroke={color} strokeWidth="5" strokeLinecap="round">
        {[0, 90, 180, 270].map((r) => <path key={r} d={horn} transform={`rotate(${r} 50 50)`} />)}
        <circle cx="50" cy="50" r="6" fill={color} stroke="none" />
      </g>
    </svg>
  );
}

export const RUBRIC_COLORS: Record<string, [bg: string, fg: string]> = {
  classic: ["#FBEFD8", "#B5762A"],
  modern: ["#D5D2F8", "#2A2F8F"],
  epos: ["#8FCB9B", "#21402A"],
  poetry: ["#F6D1D8", "#8E2D45"],
  history: ["#E7D3B5", "#6B4520"],
  selfdev: ["#CFE6F5", "#1F5A80"],
  kids: ["#FFE09A", "#7A4D00"],
};
