import { getSession } from "@/lib/supabase/server";
import { getLang } from "@/lib/lang";
import { t } from "@/lib/i18n";
import { getBooks } from "@/lib/data";
import { CoachChat } from "./CoachChat";
import Link from "next/link";

export const metadata = { title: "AI коуч" };

export default async function CoachPage({ searchParams }: { searchParams: Promise<{ book?: string }> }) {
  const { book } = await searchParams;
  const lang = await getLang();
  const { user } = await getSession();
  const books = await getBooks();
  const focus = books.find((b) => b.id === book);

  return (
    <div className="wrap max-w-[760px]">
      <div className="grid gap-2.5 pt-7">
        <span className="eb">{t(lang, "eb_coach")}</span>
        <h1 className="text-[clamp(26px,7vw,36px)] font-bold">{t(lang, "coach_t")}</h1>
        <span className="text-sm text-muted">{t(lang, "ai_disc")}</span>
      </div>
      {user ? (
        <CoachChat books={books.map((b) => ({ id: b.id, title: b.title, author: b.author }))} focus={focus ? { title: focus.title, author: focus.author } : null} />
      ) : (
        <div className="mt-6 grid justify-items-start gap-4 rounded-hero glass p-7">
          <p>{t(lang, "coach_p")}</p>
          <Link href="/login?next=/coach" className="btn btn-sm">{t(lang, "login")}</Link>
        </div>
      )}
    </div>
  );
}
