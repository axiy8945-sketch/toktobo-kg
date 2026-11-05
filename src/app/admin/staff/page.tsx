import { getSession } from "@/lib/supabase/server";
import { getLang } from "@/lib/lang";
import { t } from "@/lib/i18n";
import { setRole } from "../actions";

const ROLE_L: Record<string, [string, string, string]> = {
  reader: ["Окурман", "O'quvchi", "Читатель"],
  staff: ["Кызматкер", "Xodim", "Сотрудник"],
  admin: ["Админ", "Admin", "Админ"],
};

export default async function StaffPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const lang = await getLang();
  const li = lang === "uz" ? 1 : lang === "ru" ? 2 : 0;
  const { supabase, profile, user } = await getSession();
  if (profile?.role !== "admin") return <p className="text-muted">{t(lang, "staff_only")}</p>;

  let query = supabase.from("profiles").select("id, full_name, phone, role, created_at").order("role", { ascending: false }).order("created_at", { ascending: false }).limit(200);
  const needle = q.trim().replace(/[%,()]/g, "");
  if (needle) query = query.or(`full_name.ilike.%${needle}%,phone.ilike.%${needle}%`);
  const { data: people } = await query;

  return (
    <div className="grid gap-4">
      <form className="flex gap-2"><input name="q" defaultValue={q} className="input" placeholder={t(lang, "grant_user")} /><button className="btn btn-sm">OK</button></form>
      {people?.map((p) => (
        <form key={p.id} action={setRole.bind(null, p.id)} className="flex flex-wrap items-center justify-between gap-3 border-b border-line py-3 text-sm">
          <div className="min-w-0"><b className="block text-[15px]">{p.full_name || "—"}</b><span className="text-muted">{p.phone || p.id.slice(0, 8)}</span></div>
          <div className="flex items-center gap-2">
            <select name="role" defaultValue={p.role} className="input !w-auto !py-2" disabled={p.id === user?.id}>
              {Object.keys(ROLE_L).map((r) => <option key={r} value={r}>{ROLE_L[r][li]}</option>)}
            </select>
            {p.id !== user?.id && <button className="btn btn-line btn-sm">{t(lang, "save")}</button>}
          </div>
        </form>
      ))}
    </div>
  );
}
