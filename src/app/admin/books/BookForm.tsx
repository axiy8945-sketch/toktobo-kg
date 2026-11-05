"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useLang } from "@/components/Providers";
import { Cover } from "@/components/Cover";
import { catName, LANG_NAME, t } from "@/lib/i18n";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { Book, Category, EbookMode, Lang } from "@/lib/types";

export function BookForm({ cats, book }: { cats: Category[]; book: Book | null }) {
  const lang = useLang();
  const router = useRouter();
  const sb = supabaseBrowser();
  const [f, setF] = useState({
    title: book?.title ?? "", author: book?.author ?? "", category_id: book?.category_id ?? cats[0]?.id ?? "",
    lang: (book?.lang ?? "ky") as Lang, description: book?.description ?? "",
    paper_price: book?.paper_price?.toString() ?? "", ebook_mode: (book?.ebook_mode ?? "none") as EbookMode,
    ebook_price: book?.ebook_price ? String(book.ebook_price) : "", is_published: book?.is_published ?? true,
  });
  const [cover, setCover] = useState<File | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [askDel, setAskDel] = useState(false);
  const set = (k: keyof typeof f, v: string | boolean) => setF((x) => ({ ...x, [k]: v }));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!f.title.trim() || !f.author.trim()) return setErr(t(lang, "err_book"));
    const eprice = parseInt(f.ebook_price) || 0;
    if (f.ebook_mode === "paid" && eprice <= 0) return setErr(t(lang, "err_eprice"));
    let ftype: "pdf" | "epub" | null = null;
    if (file) {
      const n = file.name.toLowerCase();
      ftype = n.endsWith(".pdf") ? "pdf" : n.endsWith(".epub") ? "epub" : null;
      if (!ftype) return setErr(t(lang, "err_file"));
    }
    setErr(""); setBusy(true);
    try {
      const id = book?.id ?? crypto.randomUUID();
      const row: Record<string, unknown> = {
        id, title: f.title.trim(), author: f.author.trim(), category_id: f.category_id || null, lang: f.lang,
        description: f.description.trim() || null, paper_price: f.paper_price ? Math.max(0, parseInt(f.paper_price) || 0) : null,
        ebook_mode: f.ebook_mode, ebook_price: f.ebook_mode === "paid" ? eprice : 0, is_published: f.is_published,
        updated_at: new Date().toISOString(),
      };
      if (cover) {
        const ext = (cover.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
        const path = `${id}/${Date.now()}.${ext}`;
        const { error } = await sb.storage.from("covers").upload(path, cover, { contentType: cover.type, upsert: true });
        if (error) throw error;
        row.cover_path = path;
      }
      if (file && ftype) {
        const path = `${id}/book.${ftype}`;
        const { error } = await sb.storage.from("books").upload(path, file, {
          contentType: ftype === "pdf" ? "application/pdf" : "application/epub+zip", upsert: true });
        if (error) throw error;
        row.file_path = path; row.file_type = ftype;
      }
      const { error } = book ? await sb.from("books").update(row).eq("id", id) : await sb.from("books").insert(row);
      if (error) throw error;
      router.push("/admin");
      router.refresh();
    } catch (e) {
      setErr(`${t(lang, "err_generic")} (${(e as Error).message})`);
    } finally { setBusy(false); }
  }

  async function remove() {
    if (!book) return;
    setBusy(true);
    if (book.file_path) await sb.storage.from("books").remove([book.file_path]);
    if (book.cover_path) await sb.storage.from("covers").remove([book.cover_path]);
    const { error } = await sb.from("books").delete().eq("id", book.id);
    setBusy(false);
    if (error) return setErr(`${t(lang, "err_generic")} (${error.message})`);
    router.push("/admin"); router.refresh();
  }

  return (
    <form onSubmit={save} noValidate className="grid max-w-[720px] gap-3.5 rounded-card border border-line bg-card p-5">
      <h2 className="text-[22px] font-semibold">{book ? t(lang, "edit_book") : t(lang, "add_book")}</h2>
      {book && <div className="w-24"><Cover book={book} /></div>}
      <label className="field">{t(lang, "f_title")}<input className="input" value={f.title} onChange={(e) => set("title", e.target.value)} /></label>
      <label className="field">{t(lang, "f_author")}<input className="input" value={f.author} onChange={(e) => set("author", e.target.value)} /></label>
      <div className="grid grid-cols-2 gap-3">
        <label className="field">{t(lang, "f_cat")}
          <select className="input" value={f.category_id} onChange={(e) => set("category_id", e.target.value)}>
            {cats.map((c) => <option key={c.id} value={c.id}>{catName(lang, c)}</option>)}
          </select>
        </label>
        <label className="field">{t(lang, "lang_l")}
          <select className="input" value={f.lang} onChange={(e) => set("lang", e.target.value)}>
            {(["ky", "uz", "ru"] as Lang[]).map((l) => <option key={l} value={l}>{LANG_NAME[l]}</option>)}
          </select>
        </label>
      </div>
      <label className="field">{t(lang, "f_desc")}<textarea className="input" rows={4} value={f.description} onChange={(e) => set("description", e.target.value)} /></label>
      <label className="field">{t(lang, "f_cover")}<input className="input" type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setCover(e.target.files?.[0] ?? null)} /></label>
      <label className="field">{t(lang, "fa_paper")}<input className="input" type="number" min={0} inputMode="numeric" value={f.paper_price} onChange={(e) => set("paper_price", e.target.value)} /></label>

      <fieldset className="field">
        <legend className="mb-1.5">{t(lang, "f_eb")}</legend>
        <div className="flex flex-wrap gap-1.5">
          {([["none", "eb_none"], ["free", "eb_freeo"], ["paid", "eb_paid"]] as const).map(([v, l]) => (
            <label key={v} className={`relative cursor-pointer rounded-[10px] border px-3.5 py-2 text-sm font-medium ${f.ebook_mode === v ? "border-transparent bg-ink text-bg" : "border-line bg-card"}`}>
              <input type="radio" name="ebook_mode" value={v} checked={f.ebook_mode === v} onChange={() => set("ebook_mode", v)} className="absolute opacity-0" />
              {t(lang, l)}
            </label>
          ))}
        </div>
      </fieldset>
      {f.ebook_mode === "paid" && (
        <label className="field">{t(lang, "f_eprice")}<input className="input" type="number" min={1} inputMode="numeric" value={f.ebook_price} onChange={(e) => set("ebook_price", e.target.value)} /></label>
      )}
      {f.ebook_mode !== "none" && (
        <label className="field">{t(lang, "f_file")}
          <input className="input" type="file" accept=".pdf,.epub,application/pdf,application/epub+zip" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          {book?.file_path && <small className="font-normal text-muted">{t(lang, "f_file_has", { n: book.file_path.split("/").pop() ?? "" })}</small>}
        </label>
      )}
      <label className="flex items-center gap-2.5 text-sm font-semibold">
        <input type="checkbox" checked={f.is_published} onChange={(e) => set("is_published", e.target.checked)} className="h-4 w-4 accent-[rgb(var(--accent))]" />
        {t(lang, "f_pub")}
      </label>

      {err && <p role="alert" className="text-sm text-bad">{err}</p>}
      <div className="flex flex-wrap gap-2">
        <button className="btn" disabled={busy}>{busy ? t(lang, "uploading") : t(lang, "save")}</button>
        <button type="button" className="btn btn-line" onClick={() => router.push("/admin")}>{t(lang, "cancel")}</button>
      </div>
      {book && (
        askDel ? (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span>{t(lang, "del_q")}</span>
            <button type="button" className="btn btn-sm !bg-bad !text-white" onClick={remove} disabled={busy}>{t(lang, "del")}</button>
            <button type="button" className="btn btn-line btn-sm" onClick={() => setAskDel(false)}>{t(lang, "cancel")}</button>
          </div>
        ) : <button type="button" className="justify-self-start text-sm font-semibold text-bad" onClick={() => setAskDel(true)}>{t(lang, "del")}</button>
      )}
    </form>
  );
}
