import { redirect } from "next/navigation";
import { getSession } from "@/lib/supabase/server";
import { getLang } from "@/lib/lang";
import { t } from "@/lib/i18n";
import { getStats } from "@/lib/data";
import Link from "next/link";
import { GoalPicker } from "./GoalPicker";
import { BONUS_PER_BOOK } from "@/lib/types";
import { ProfileEdit } from "./ProfileEdit";
import type { Lang } from "@/lib/types";

export const metadata = { title: "Прогресс" };

const WD: Record<Lang, string[]> = {
  ky: ["Дш", "Шш", "Шр", "Бш", "Жм", "Иш", "Жк"],
  uz: ["Du", "Se", "Ch", "Pa", "Ju", "Sh", "Ya"],
  ru: ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"],
};
const ACH: { id: string; n: [string, string, string]; d: [string, string, string] }[] = [
  { id: "open", n: ["Биринчи барак", "Birinchi sahifa", "Первая страница"], d: ["Онлайн окууну ачтың", "Onlayn o'qishni ochdingiz", "Открыл чтение онлайн"] },
  { id: "goal", n: ["Түндүк жарыгы", "Tunduk nuri", "Свет тундука"], d: ["Күнүмдүк максат", "Kunlik maqsad", "Дневная цель"] },
  { id: "s3", n: ["Үч күн катар", "Uch kun ketma-ket", "Три дня подряд"], d: ["3 күндүк серия", "3 kunlik seriya", "Серия 3 дня"] },
  { id: "s7", n: ["Жети күн", "Yetti kun", "Семь дней"], d: ["7 күндүк серия", "7 kunlik seriya", "Серия 7 дней"] },
  { id: "hour", n: ["Биринчи саат", "Birinchi soat", "Первый час"], d: ["Жалпы 60 мүнөт", "Jami 60 daqiqa", "Всего 60 минут"] },
  { id: "note", n: ["Ойчул", "Mutafakkir", "Мыслитель"], d: ["Биринчи жазуу", "Birinchi qayd", "Первая заметка"] },
  { id: "quiz", n: ["Билимдүү", "Bilimdon", "Знаток"], d: ["Биринчи тест", "Birinchi test", "Первый тест"] },
  { id: "done", n: ["Аягына чейин", "Oxirigacha", "До конца"], d: ["Китепти бүтүрдүң", "Kitobni tugatdingiz", "Дочитал книгу"] },
  { id: "order", n: ["Биринчи заказ", "Birinchi buyurtma", "Первый заказ"], d: ["Китепке заказ", "Kitobga buyurtma", "Заказ книги"] },
];

export default async function ProgressPage() {
  const lang = await getLang();
  const { supabase, user, profile } = await getSession();
  if (!user) redirect("/login?next=/progress");
  const goal = profile?.daily_goal ?? 15;
  const [stats, prog, notes, quizzes, orders, me] = await Promise.all([
    getStats(user.id, goal),
    supabase.from("reading_progress").select("finished").eq("user_id", user.id),
    supabase.from("notes").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("quiz_results").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("profiles").select("full_name, phone, created_at").eq("id", user.id).single(),
  ]);
  const { data: bonusBal } = await supabase.rpc("bonus_balance");
  const name = me.data?.full_name || user.email?.split("@")[0] || t(lang, "reader_default");
  const joinedYear = new Date(me.data?.created_at ?? user.created_at).getFullYear();
  const s = stats!;
  const unlocked: Record<string, boolean> = {
    open: (prog.data ?? []).length > 0, goal: s.goalHit, s3: s.streak >= 3, s7: s.streak >= 7, hour: s.totalMin >= 60,
    note: (notes.count ?? 0) > 0, quiz: (quizzes.count ?? 0) > 0, done: (prog.data ?? []).some((p) => p.finished), order: (orders.count ?? 0) > 0,
  };
  const li = lang === "uz" ? 1 : lang === "ru" ? 2 : 0;
  const wm = s.week.reduce((a, d) => a + d.min, 0), wd = s.week.filter((d) => d.min > 0).length;
  const mx = Math.max(goal, ...s.week.map((d) => d.min));
  const chal: [string, number, number][] = [[t(lang, "ch7"), Math.min(s.streak, 7), 7], [t(lang, "ch300"), Math.min(s.monthMin, 300), 300], [t(lang, "ch3q"), Math.min(quizzes.count ?? 0, 3), 3]];

  return (
    <div className="wrap">
      {/* ---------- Профиль башы ---------- */}
      <section className="-mx-[18px] md:mx-0">
        <div className="h-28 bg-gradient-to-br from-accent-soft via-accent/70 to-accent md:rounded-b-hero" />
        <div className="px-[18px] md:px-0">
          <div className="-mt-12 flex items-end gap-3">
            <span className="grid h-24 w-24 flex-none place-items-center rounded-full border-4 border-bg bg-gradient-to-br from-accent to-accent-deep text-3xl font-bold text-accent-ink">
              {name.trim()[0]?.toUpperCase() ?? "T"}
            </span>
            <ProfileEdit name={me.data?.full_name ?? ""} phone={me.data?.phone ?? ""} />
          </div>
          <h1 className="mt-3 text-[26px] font-bold">{name}</h1>
          <p className="mt-1 text-[15px] text-muted">{user.email} · {t(lang, "joined", { y: joinedYear })}</p>
        </div>
      </section>

      {/* ---------- Бонус ---------- */}
      <section className="pt-6">
        <div className="grid grid-cols-[auto_1fr] items-center gap-4 rounded-card bg-accent p-5 text-accent-ink">
          <span className="grid h-14 w-14 place-items-center rounded-full border-[3px] border-accent-ink/80 text-2xl font-extrabold">B</span>
          <div className="min-w-0">
            <span className="text-[14px] font-medium opacity-80">{t(lang, "bonus_balance_t")}</span>
            <b className="block text-[30px] font-extrabold leading-tight tabular-nums">{Number(bonusBal) || 0}</b>
          </div>
          <p className="col-span-2 text-[13px] opacity-80">{t(lang, "bonus_how", { n: BONUS_PER_BOOK })}</p>
        </div>
      </section>

      {/* ---------- Статистика плиткалары ---------- */}
      <section className="grid grid-cols-2 gap-3 pt-3">
        {([[t(lang, "total_read"), `${s.totalMin} ${t(lang, "m")}`], [t(lang, "last7"), `${s.last7Min} ${t(lang, "m")}`],
          [t(lang, "streak"), `${s.streak} ${t(lang, "d")}`], [t(lang, "quizzes_t"), String(quizzes.count ?? 0)]] as [string, string][]).map(([k, v]) => (
          <div key={k} className="tile grid gap-1.5">
            <span className="text-[14px] text-muted">{k}</span>
            <b className="text-[24px] font-bold tabular-nums">{v}</b>
          </div>
        ))}
      </section>
      <div className="flex flex-wrap gap-2 pt-4">
        <Link href="/orders" className="chip">{t(lang, "nav_orders")}</Link>
        {(profile?.role === "staff" || profile?.role === "admin") && <Link href="/admin" className="chip">{t(lang, "nav_admin")}</Link>}
      </div>

      <section className="grid gap-4 pt-9">
        <span className="eb">{t(lang, "this_week")}</span>
        <div className="grid h-[170px] grid-cols-7 gap-2 rounded-card border border-line bg-card px-4 pb-3.5 pt-[18px]" role="img" aria-label={t(lang, "week_sum", { m: wm, d: wd })}>
          {s.week.map((d, i) => {
            const h = d.min ? Math.max(4, (d.min / mx) * 100) : 0;
            return (
              <div key={d.day} className="grid min-w-0 grid-rows-[1fr_auto] justify-items-center gap-2">
                <div className="relative flex w-full max-w-[30px] flex-col justify-end">
                  <i className={`block rounded-t-md ${d.today ? "bg-accent" : "bg-accent-soft"}`} style={{ height: `${h}%` }} />
                  {d.min > 0 && <span className="absolute left-1/2 -translate-x-1/2 text-[10px] text-muted" style={{ bottom: `calc(${h}% + 4px)` }}>{d.min}</span>}
                </div>
                <small className={`text-[10px] ${d.today ? "font-semibold text-ink" : "text-muted"}`}>{WD[lang][i]}</small>
              </div>
            );
          })}
        </div>
        <p className="text-sm text-muted">{wm ? t(lang, "week_sum", { m: wm, d: wd }) : t(lang, "week_empty")}</p>
      </section>

      <section className="grid gap-4 pt-9"><span className="eb">{t(lang, "goal_t")}</span><GoalPicker goal={goal} /></section>

      <section className="grid gap-2.5 pt-9"><span className="eb">{t(lang, "chal_t")}</span>
        {chal.map(([n, a, b]) => (
          <div key={n} className="grid gap-2.5 rounded-[18px] border border-line bg-card px-4 py-3.5">
            <div className="flex justify-between gap-2.5 font-semibold">{n}<span className="font-mono text-xs font-medium text-muted">{a} / {b}</span></div>
            <div className="h-1.5 overflow-hidden rounded bg-soft2"><i className="block h-full rounded bg-accent" style={{ width: `${(a / b) * 100}%` }} /></div>
          </div>
        ))}
      </section>

      <section className="grid gap-4 pt-9">
        <div className="flex justify-between"><span className="eb">{t(lang, "ach_t")}</span><span className="text-sm tabular-nums text-muted">{Object.values(unlocked).filter(Boolean).length} / {ACH.length}</span></div>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(102px,1fr))] gap-2.5">
          {ACH.map((a) => (
            <div key={a.id} className={`grid justify-items-center gap-1.5 rounded-[18px] border border-line bg-card px-2 py-3.5 text-center ${unlocked[a.id] ? "" : "opacity-50"}`}>
              <span className={`grid h-10 w-10 place-items-center rounded-full border ${unlocked[a.id] ? "border-accent bg-accent-soft text-accent-deep" : "border-line text-muted"}`}>★</span>
              <b className="text-[13px] leading-tight">{a.n[li]}</b>
              <span className="text-[11px] leading-snug text-muted">{a.d[li]}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
