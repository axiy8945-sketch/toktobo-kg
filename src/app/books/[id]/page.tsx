import Link from "next/link";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/supabase/server";
import { getLang } from "@/lib/lang";
import { catName, LANG_NAME, som, t } from "@/lib/i18n";
import { getAccessSet, getBook, getCategories, getPendingEbooks } from "@/lib/data";
import { Cover } from "@/components/Cover";
import { BONUS_PER_BOOK } from "@/lib/types";
import { TELEGRAM_BOT, waShop } from "@/lib/brand";
import { IconTelegram, IconWhatsApp } from "@/components/Contacts";
import { IconBooks, IconEbook, IconLeft } from "@/components/icons";
import { BookActions } from "./BookActions";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const book = await getBook(id);
  if (!book || !book.is_published) return { title: "Toktobo" };
  const cover = book.cover_path ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/covers/${book.cover_path}` : undefined;
  const description = (book.description ?? `${book.title} — ${book.author}. Toktobo басма үйү.`).slice(0, 160);
  return {
    title: `${book.title} — ${book.author}`,
    description,
    openGraph: { title: book.title, description, images: cover ? [cover] : undefined, type: "book" },
  };
}

export default async function BookPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lang = await getLang();
  const book = await getBook(id);
  if (!book || (!book.is_published)) notFound();
  const { user } = await getSession();
  const [cats, access, pending] = await Promise.all([getCategories(), getAccessSet(user?.id), getPendingEbooks(user?.id)]);
  const cat = cats.find((c) => c.id === book.category_id);
  const owned = access.has(book.id);
  const ebookState = owned ? "owned" : pending.has(book.id) ? "pending" : "none";

  return (
    <div className="wrap">
      <div className="pt-4">
        <Link href="/books" className="inline-flex items-center gap-2 py-1.5 font-mono text-xs uppercase tracking-[0.12em] text-muted">
          <IconLeft className="h-4 w-4" /> {t(lang, "nav_books")}
        </Link>
      </div>
      <div className="grid gap-[22px] pt-[22px] md:grid-cols-[.9fr_1.1fr] md:items-start md:gap-10">
        <div className="grid place-items-center rounded-hero glass py-[34px] md:sticky md:top-24">
          <Cover book={book} className="w-[min(260px,64%)] shadow-book" />
        </div>
        <div className="grid min-w-0 gap-[22px]">
          <div>
            <span className="eb">{catName(lang, cat)}</span>
            <h1 className="mt-2.5 text-[clamp(30px,8vw,46px)] font-semibold leading-[1.08] tracking-[-0.03em]">{book.title}</h1>
            <div className="mt-2 text-lg text-muted">{book.author}</div>
            <div className="mt-3.5 flex flex-wrap gap-1.5"><span className="tag">{t(lang, "lang_l")}: {LANG_NAME[book.lang]}</span></div>
          </div>
          {book.description && <p className="max-w-[62ch] whitespace-pre-line text-[17px] leading-[1.7] text-ink2">{book.description}</p>}

          <div className="grid gap-3">
            {book.ebook_mode !== "none" && (
              <div className="grid gap-3 rounded-[20px] glass p-[18px]">
                <div className="flex items-center gap-3">
                  <IconEbook className="h-6 w-6 flex-none text-accent-deep" />
                  <div className="min-w-0 flex-1">
                    <b className="block text-[17px] font-semibold">{t(lang, "ebook")}</b>
                    <span className="text-[13px] text-muted">{book.ebook_mode === "free" ? t(lang, "eb_free_d") : t(lang, "eb_paid_d")}</span>
                  </div>
                  <span className="whitespace-nowrap text-[19px] font-semibold tabular-nums">{book.ebook_mode === "free" ? t(lang, "free") : som(lang, book.ebook_price)}</span>
                </div>
                {book.ebook_mode === "paid" && ebookState === "none" && <span className="tag tag-on justify-self-start">{t(lang, "bonus_per_book", { n: BONUS_PER_BOOK })}</span>}
                {ebookState === "owned" && <span className="state state-ok justify-self-start">{t(lang, "acc_on")}</span>}
                {ebookState === "pending" && <span className="state state-wait justify-self-start">{t(lang, "acc_wait")}</span>}
                <BookActions kind="ebook" bookId={book.id} mode={book.ebook_mode} state={ebookState} hasFile={!!book.file_path} loggedIn={!!user} />
              </div>
            )}
            {book.paper_price ? (
              <div className="grid gap-3 rounded-[20px] glass p-[18px]">
                <div className="flex items-center gap-3">
                  <IconBooks className="h-6 w-6 flex-none text-accent-deep" />
                  <div className="min-w-0 flex-1">
                    <b className="block text-[17px] font-semibold">{t(lang, "paper")}</b>
                    <span className="text-[13px] text-muted">{t(lang, "paper_d")}</span>
                  </div>
                  <span className="whitespace-nowrap text-[19px] font-semibold tabular-nums">{som(lang, book.paper_price)}</span>
                </div>
                <span className="tag tag-on justify-self-start">{t(lang, "bonus_per_book", { n: BONUS_PER_BOOK })}</span>
                <BookActions kind="paper" bookId={book.id} mode={book.ebook_mode} state="none" hasFile={false} loggedIn={!!user} />
              </div>
            ) : null}
          </div>
          {book.paper_price ? (
            <div className="grid gap-2 rounded-[20px] glass p-4">
              <span className="text-[14px] font-semibold">{t(lang, "order_other")}</span>
              <div className="flex flex-wrap gap-2">
                <a href={waShop(t(lang, "wa_book_msg", { t: book.title }))} target="_blank" rel="noopener noreferrer" className="chip !border-transparent !bg-[#25D366] !text-white"><IconWhatsApp className="h-4 w-4" /> WhatsApp</a>
                <a href={TELEGRAM_BOT.url} target="_blank" rel="noopener noreferrer" className="chip !border-transparent !bg-[#229ED9] !text-white"><IconTelegram className="h-4 w-4" /> Telegram бот</a>
              </div>
            </div>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Link href={`/coach?book=${book.id}`} className="btn btn-line btn-sm">{t(lang, "coach_btn")}</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
