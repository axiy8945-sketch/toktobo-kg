import type React from "react";
import type { Book } from "@/lib/types";
import { Mark } from "./icons";

export function coverUrl(path: string | null) {
  if (!path) return null;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/covers/${path}`;
}

function hue(id: string) {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) % 360;
  return (h * 7 + 200) % 360;
}

export function Cover({ book, className = "" }: { book: Pick<Book, "id" | "title" | "author" | "cover_path">; className?: string }) {
  const url = coverUrl(book.cover_path);
  if (url)
    return (
      <div className={`cv ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={book.title} loading="lazy" />
      </div>
    );
  return (
    <div className={`cv ${className}`} style={{ "--h": hue(book.id) } as React.CSSProperties} role="img" aria-label={book.title}>
      <div className="bk">
        <i>{book.author}</i>
        <b>{book.title}</b>
        <Mark className="w-[22%] opacity-75" />
      </div>
    </div>
  );
}
