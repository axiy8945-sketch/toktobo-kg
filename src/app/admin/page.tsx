import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { getLang } from "@/lib/lang";
import { som, t } from "@/lib/i18n";
import { BOOK_COLUMNS, type Book } from "@/lib/types";
import { Cover } from "@/components/Cover";

export default async function AdminBooks() {
  const lang = await getLang();
  const sb = await supabaseServer();
  const { data } = await sb.from("books").select(BOOK_COLUMNS).order("created_at", { ascending: false });
  const books = (data ?? []) as Book[];

  return (
    <div className="grid gap-4">
      <Link href="/admin/books/new" className="btn justify-self-start">+ {t(lang, "add_book")}</Link>
      <div>
        {books.map((b) => (
          <div key={b.id} className="grid grid-cols-[54px_1fr_auto] items-center gap-3.5 border-b border-line py-3.5">
            <Cover book={b} />
            <div className="min-w-0">
              <b className="block font-semibold">{b.title}</b>
              <span className="text-sm text-muted">{b.author}</span>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {!b.is_published && <span className="tag">draft</span>}
                {b.paper_price ? <span className="tag">{som(lang, b.paper_price)}</span> : null}
                {b.ebook_mode !== "none" && <span className="tag tag-on">{b.ebook_mode === "free" ? t(lang, "free") : som(lang, b.ebook_price)}</span>}
                {b.ebook_mode !== "none" && <span className={`tag ${b.file_path ? "" : "!text-bad"}`}>{b.file_path ? b.file_type?.toUpperCase() : t(lang, "no_file")}</span>}
              </div>
            </div>
            <Link href={`/admin/books/${b.id}`} className="btn btn-line btn-sm">{t(lang, "edit")}</Link>
          </div>
        ))}
        {!books.length && <p className="text-muted">{t(lang, "no_books")}</p>}
      </div>
    </div>
  );
}
