import "server-only";
import { supabaseServer } from "./supabase/server";
import { BOOK_COLUMNS, type Book, type Category } from "./types";
import { computeStats, localDay, type DayRow } from "./stats";

export async function getBooks(): Promise<Book[]> {
  const sb = await supabaseServer();
  const { data } = await sb.from("books").select(BOOK_COLUMNS).eq("is_published", true).order("created_at", { ascending: false });
  return (data ?? []) as Book[];
}

export async function getBook(id: string): Promise<Book | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const sb = await supabaseServer();
  const { data } = await sb.from("books").select(BOOK_COLUMNS).eq("id", id).maybeSingle();
  return (data as Book) ?? null;
}

export async function getCategories(): Promise<Category[]> {
  const sb = await supabaseServer();
  const { data } = await sb.from("categories").select("*").order("sort");
  return (data ?? []) as Category[];
}

/** Колдонуучунун ачык доступтары (book_id жыйындысы). */
export async function getAccessSet(userId: string | undefined): Promise<Set<string>> {
  if (!userId) return new Set();
  const sb = await supabaseServer();
  const { data } = await sb.from("entitlements").select("book_id").eq("user_id", userId).is("revoked_at", null);
  return new Set((data ?? []).map((r) => r.book_id as string));
}

/** Төлөмү текшерилип жаткан электрондук китептер. */
export async function getPendingEbooks(userId: string | undefined): Promise<Set<string>> {
  if (!userId) return new Set();
  const sb = await supabaseServer();
  const { data } = await sb
    .from("orders")
    .select("status, order_items(book_id, kind)")
    .eq("user_id", userId)
    .in("status", ["pending", "qr_sent"]);
  const s = new Set<string>();
  for (const o of data ?? []) for (const i of ((o.order_items ?? []) as unknown as { book_id: string; kind: string }[])) if (i.kind === "ebook") s.add(i.book_id);
  return s;
}

export async function getStats(userId: string | undefined, goal: number) {
  if (!userId) return null;
  const sb = await supabaseServer();
  const since = new Date(Date.now() - 400 * 86400_000);
  const { data } = await sb.from("reading_days").select("day, seconds").eq("user_id", userId).gte("day", localDay(since));
  return computeStats((data ?? []) as DayRow[], goal);
}
