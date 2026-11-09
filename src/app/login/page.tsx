"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useLang } from "@/components/Providers";
import { Logo } from "@/components/icons";
import { t, type DictKey } from "@/lib/i18n";
import { supabaseBrowser } from "@/lib/supabase/client";

type Mode = "login" | "signup";

function errKey(msg: string): DictKey {
  const m = msg.toLowerCase();
  if (m.includes("invalid login")) return "auth_bad_creds";
  if (m.includes("already registered") || m.includes("already exists")) return "auth_exists";
  if (m.includes("not confirmed")) return "auth_unconfirmed";
  if (m.includes("password")) return "auth_weak";
  if (m.includes("rate limit") || m.includes("too many")) return "auth_rate";
  return "err_generic";
}

function LoginForm() {
  const lang = useLang();
  const router = useRouter();
  const nextParam = useSearchParams().get("next") || "/";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/";
  const [mode, setMode] = useState<Mode>("login");
  const [f, setF] = useState({ name: "", email: "", password: "" });
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<DictKey | "">("");
  const [info, setInfo] = useState<DictKey | "">("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(""); setInfo("");
    const email = f.email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) return setErr("auth_bad_email");
    if (f.password.length < 6) return setErr("auth_weak");
    if (mode === "signup" && !f.name.trim()) return setErr("auth_need_name");
    setBusy(true);
    const sb = supabaseBrowser();
    const res = mode === "login"
      ? await sb.auth.signInWithPassword({ email, password: f.password })
      : await sb.auth.signUp({ email, password: f.password, options: { data: { full_name: f.name.trim().slice(0, 80) } } });
    setBusy(false);
    if (res.error) return setErr(errKey(res.error.message));
    if (!res.data.session) return setInfo("auth_check_mail"); // email ырастоо дагы эле күйүк болсо
    router.push(next);
    router.refresh();
  }

  return (
    <div className="wrap max-w-[480px] pt-8">
      <div className="grid gap-5 rounded-hero glass p-6">
        <Logo />
        <div className="grid grid-cols-2 gap-1 rounded-full bg-soft-2 p-1" role="tablist">
          {(["login", "signup"] as Mode[]).map((m) => (
            <button key={m} type="button" role="tab" aria-selected={mode === m} onClick={() => { setMode(m); setErr(""); setInfo(""); }}
              className={`rounded-full py-2.5 text-[15px] font-semibold ${mode === m ? "bg-card text-ink shadow-sm" : "text-muted"}`}>
              {t(lang, m === "login" ? "login" : "signup")}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="grid gap-3.5" noValidate>
          {mode === "signup" && (
            <label className="field">{t(lang, "name")}
              <input className="input" autoComplete="name" maxLength={80} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
            </label>
          )}
          <label className="field">Email
            <input className="input" type="email" inputMode="email" autoComplete="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
          </label>
          <label className="field">{t(lang, "password")}
            <span className="relative">
              <input className="input pr-20" type={show ? "text" : "password"} autoComplete={mode === "login" ? "current-password" : "new-password"}
                minLength={6} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
              <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[13px] font-semibold text-accent-deep">
                {t(lang, show ? "pw_hide" : "pw_show")}
              </button>
            </span>
            {mode === "signup" && <small className="font-normal text-muted">{t(lang, "pw_hint")}</small>}
          </label>
          {err && <p role="alert" className="text-sm text-bad">{t(lang, err)}</p>}
          {info && <p role="status" className="state state-ok">{t(lang, info)}</p>}
          <button className="btn" disabled={busy}>{busy ? "…" : t(lang, mode === "login" ? "login" : "signup")}</button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return <Suspense><LoginForm /></Suspense>;
}
