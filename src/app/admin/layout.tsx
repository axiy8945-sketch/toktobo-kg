import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/supabase/server";
import { getLang } from "@/lib/lang";
import { t } from "@/lib/i18n";
import { AdminTabs } from "./AdminTabs";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const lang = await getLang();
  const { user, profile } = await getSession();
  if (!user) redirect("/login?next=/admin");
  if (profile?.role !== "staff" && profile?.role !== "admin") {
    return (
      <div className="wrap max-w-[560px] pt-10">
        <div className="grid justify-items-start gap-4 rounded-hero bg-soft p-7"><p>{t(lang, "staff_only")}</p><Link href="/" className="btn btn-sm">{t(lang, "nav_home")}</Link></div>
      </div>
    );
  }
  return (
    <div className="wrap">
      <div className="grid gap-2.5 pt-7">
        <span className="eb">ТОКТОБО KG</span>
        <h1 className="text-[clamp(26px,7vw,36px)] font-bold">{t(lang, "nav_admin")}</h1>
      </div>
      <AdminTabs isAdmin={profile?.role === "admin"} labels={{ books: t(lang, "a_books"), orders: t(lang, "a_orders"), access: t(lang, "a_access"), staff: t(lang, "a_staff") }} />
      <div className="pt-5">{children}</div>
    </div>
  );
}
