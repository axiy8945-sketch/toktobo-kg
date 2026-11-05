"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useCart, useLang } from "@/components/Providers";
import { IconArrow } from "@/components/icons";
import { t } from "@/lib/i18n";
import { claimFreeBook } from "@/app/actions";
import type { EbookMode } from "@/lib/types";

export function BookActions({ kind, bookId, mode, state, hasFile, loggedIn }: {
  kind: "paper" | "ebook"; bookId: string; mode: EbookMode; state: "owned" | "pending" | "none"; hasFile: boolean; loggedIn: boolean;
}) {
  const lang = useLang();
  const router = useRouter();
  const cart = useCart();
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  const inCart = cart.items.some((i) => i.book_id === bookId && i.kind === kind);

  if (kind === "paper")
    return (
      <>
        <button className="btn btn-line w-full" onClick={() => { cart.add(bookId, "paper"); setMsg(t(lang, "added")); }}>{t(lang, "add_cart")}</button>
        {msg && <p role="status" className="text-sm text-ok">{msg}</p>}
      </>
    );

  if (state === "owned")
    return hasFile
      ? <Link href={`/read/${bookId}`} className="btn w-full">{t(lang, "read_online")} <IconArrow className="h-[18px] w-[18px]" /></Link>
      : <p className="text-sm text-muted">{t(lang, "no_file")}</p>;
  if (state === "pending") return null;

  if (!loggedIn)
    return <Link href={`/login?next=/books/${bookId}`} className="btn w-full">{t(lang, "login_to")}</Link>;

  if (mode === "free")
    return (
      <>
        <button className="btn w-full" disabled={pending} onClick={() => start(async () => {
          const r = await claimFreeBook(bookId);
          if (r.ok) router.push(hasFile ? `/read/${bookId}` : "/library");
          else setMsg(t(lang, "err_generic"));
        })}>{t(lang, "open_free")} <IconArrow className="h-[18px] w-[18px]" /></button>
        {msg && <p role="alert" className="text-sm text-bad">{msg}</p>}
      </>
    );

  return inCart
    ? <Link href="/cart" className="btn btn-line w-full">{t(lang, "cart")}</Link>
    : <button className="btn w-full" onClick={() => cart.add(bookId, "ebook")}>{t(lang, "buy")} <IconArrow className="h-[18px] w-[18px]" /></button>;
}
