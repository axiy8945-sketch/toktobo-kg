import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/supabase/server";
import { getLang } from "@/lib/lang";
import { t } from "@/lib/i18n";
import { getBook } from "@/lib/data";
import { Reader } from "./Reader";

export default async function ReadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lang = await getLang();
  const { supabase, user, profile } = await getSession();
  if (!user) redirect(`/login?next=/read/${id}`);
  const book = await getBook(id);
  if (!book) notFound();

  const isStaff = profile?.role === "staff" || profile?.role === "admin";
  const { data: ent } = await supabase.from("entitlements").select("book_id").eq("user_id", user.id).eq("book_id", id).is("revoked_at", null).maybeSingle();
  if (!ent && !isStaff) {
    return (
      <div className="wrap max-w-[520px] pt-10">
        <div className="grid justify-items-start gap-4 rounded-hero bg-soft p-7">
          <p>{t(lang, "no_access")}</p>
          <Link href={`/books/${id}`} className="btn btn-sm">{t(lang, "more")}</Link>
        </div>
      </div>
    );
  }
  if (!book.file_path || !book.file_type) {
    return <div className="wrap pt-10 text-muted">{t(lang, "no_file")}</div>;
  }

  const [{ data: prog }, { data: bms }, { data: notes }] = await Promise.all([
    supabase.from("reading_progress").select("location").eq("user_id", user.id).eq("book_id", id).maybeSingle(),
    supabase.from("bookmarks").select("id, location, label").eq("user_id", user.id).eq("book_id", id).order("created_at"),
    supabase.from("notes").select("id, location, body").eq("user_id", user.id).eq("book_id", id).order("created_at"),
  ]);

  return (
    <Reader
      bookId={book.id}
      title={book.title}
      fileType={book.file_type}
      initialLocation={prog?.location ?? null}
      initialBookmarks={bms ?? []}
      initialNotes={notes ?? []}
    />
  );
}
