"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useLang } from "@/components/Providers";
import { t } from "@/lib/i18n";
import { updateProfile } from "@/app/actions";

export function ProfileEdit({ name, phone }: { name: string; phone: string }) {
  const lang = useLang();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ full_name: name, phone });
  const [err, setErr] = useState("");
  const [pending, start] = useTransition();

  if (!open)
    return <button onClick={() => setOpen(true)} className="btn btn-line btn-sm mb-1 flex-1">{t(lang, "edit_profile")}</button>;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
      <button className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" aria-label={t(lang, "back")} onClick={() => setOpen(false)} />
      <form className="absolute inset-x-0 bottom-0 mx-auto grid max-w-[560px] gap-3.5 rounded-t-[28px] bg-bg p-5 pb-[calc(24px+env(safe-area-inset-bottom))]"
        onSubmit={(e) => { e.preventDefault(); start(async () => {
          const r = await updateProfile(f);
          if (!r.ok) return setErr(t(lang, "err_generic"));
          setOpen(false); router.refresh();
        }); }}>
        <h2 className="text-xl font-bold">{t(lang, "edit_profile")}</h2>
        <label className="field">{t(lang, "name")}<input className="input" autoComplete="name" maxLength={80} value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} /></label>
        <label className="field">{t(lang, "phone")}<input className="input" type="tel" inputMode="tel" autoComplete="tel" maxLength={30} placeholder="+996 ___ ___ ___" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></label>
        {err && <p role="alert" className="text-sm text-bad">{err}</p>}
        <div className="flex gap-2"><button className="btn flex-1" disabled={pending}>{t(lang, "save")}</button><button type="button" className="btn btn-line" onClick={() => setOpen(false)}>{t(lang, "cancel")}</button></div>
      </form>
    </div>
  );
}
