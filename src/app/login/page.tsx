"use client";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useLang } from "@/components/Providers";
import { t } from "@/lib/i18n";
import { supabaseBrowser } from "@/lib/supabase/client";

function LoginForm() {
  const lang = useLang();
  const next = useSearchParams().get("next") || "/";
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) return setState("error");
    setState("sending");
    const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/";
    const { error } = await supabaseBrowser().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeNext)}` },
    });
    setState(error ? "error" : "sent");
  }

  return (
    <div className="wrap max-w-[520px] pt-10">
      <div className="grid gap-5 rounded-hero bg-soft p-7">
        <h1 className="text-[clamp(30px,8vw,40px)] font-semibold">{t(lang, "login_t")}</h1>
        <p className="text-ink2">{t(lang, "login_p")}</p>
        {state === "sent" ? (
          <p role="status" className="state state-ok">{t(lang, "link_sent")}</p>
        ) : (
          <form onSubmit={submit} className="grid gap-3.5" noValidate>
            <label className="field">Email
              <input className="input" type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            {state === "error" && <p role="alert" className="text-sm text-bad">{t(lang, "err_generic")}</p>}
            <button className="btn" disabled={state === "sending"}>{t(lang, "send_link")}</button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return <Suspense><LoginForm /></Suspense>;
}
