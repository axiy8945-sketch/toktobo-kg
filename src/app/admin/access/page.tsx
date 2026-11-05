import { supabaseServer } from "@/lib/supabase/server";
import { getLang } from "@/lib/lang";
import { t } from "@/lib/i18n";
import { grantAccess, revokeAccess } from "../actions";

export default async function AdminAccess() {
  const lang = await getLang();
  const sb = await supabaseServer();
  const [{ data: ents }, { data: books }, { data: people }] = await Promise.all([
    sb.from("entitlements").select("user_id, book_id, source, created_at, books(title)")
      .is("revoked_at", null).order("created_at", { ascending: false }).limit(300),
    sb.from("books").select("id, title").neq("ebook_mode", "none").order("title"),
    sb.from("profiles").select("id, full_name, phone").order("created_at", { ascending: false }).limit(500),
  ]);
  const byId = new Map((people ?? []).map((p) => [p.id, p]));
  const via = (s: string) => (s === "free" ? t(lang, "via_free") : s === "order" ? t(lang, "via_order") : t(lang, "via_manual"));

  return (
    <div className="grid gap-6">
      <form action={grantAccess} className="grid gap-3 rounded-card border border-line bg-card p-5">
        <b className="text-lg">{t(lang, "grant")}</b>
        <label className="field">{t(lang, "grant_user")}
          <select name="user_id" className="input" required>
            {(people ?? []).map((p) => <option key={p.id} value={p.id}>{p.full_name || "—"} · {p.phone || p.id.slice(0, 8)}</option>)}
          </select>
        </label>
        <label className="field">{t(lang, "a_books")}
          <select name="book_id" className="input" required>
            {(books ?? []).map((b) => <option key={b.id} value={b.id}>{b.title}</option>)}
          </select>
        </label>
        <button className="btn btn-sm justify-self-start">{t(lang, "grant")}</button>
      </form>

      <div>
        {!ents?.length && <p className="text-muted">{t(lang, "acc_empty")}</p>}
        {ents?.map((e) => {
          const b = e.books as unknown as { title: string } | null;
          const p = byId.get(e.user_id);
          return (
            <div key={`${e.user_id}-${e.book_id}`} className="flex flex-wrap items-center justify-between gap-3 border-b border-line py-3.5 text-sm">
              <div className="min-w-0">
                <b className="block text-[15px]">{b?.title ?? "—"}</b>
                <span className="text-muted">{p?.full_name || "—"} · {p?.phone || e.user_id.slice(0, 8)} · {via(e.source)} · {new Date(e.created_at).toLocaleDateString("ru-RU")}</span>
              </div>
              <form action={revokeAccess.bind(null, e.user_id, e.book_id)}><button className="btn btn-line btn-sm">{t(lang, "revoke")}</button></form>
            </div>
          );
        })}
      </div>
    </div>
  );
}
