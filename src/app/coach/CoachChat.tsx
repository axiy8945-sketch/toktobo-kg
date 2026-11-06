"use client";
import { useEffect, useRef, useState } from "react";
import { useLang } from "@/components/Providers";
import { IconSend } from "@/components/icons";
import { t } from "@/lib/i18n";
import { supabaseBrowser } from "@/lib/supabase/client";

type Msg = { role: "user" | "assistant"; content: string };
type Q = { q: string; options: string[]; answer: number; why?: string };
type Quiz = { bookId: string; title: string; qs: Q[]; i: number; picked: number | null; score: number };

const KEY = "toktobo.chat";

export function CoachChat({ books, focus }: { books: { id: string; title: string; author: string }[]; focus: { title: string; author: string } | null }) {
  const lang = useLang();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [quizPick, setQuizPick] = useState(false);
  const [quizBook, setQuizBook] = useState(books[0]?.id ?? "");
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [quizLoading, setQuizLoading] = useState(false);
  const ctl = useRef<AbortController | null>(null);
  const end = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    try { setMsgs(JSON.parse(sessionStorage.getItem(KEY) || "[]")); } catch { /* жок */ }
  }, []);
  useEffect(() => {
    try { sessionStorage.setItem(KEY, JSON.stringify(msgs.slice(-20))); } catch { /* жок */ }
    end.current?.scrollIntoView({ block: "end" });
  }, [msgs]);
  useEffect(() => {
    if (focus && !started.current) {
      started.current = true;
      const q = { ky: `«${focus.title}» (${focus.author}) китеби жөнүндө кыскача айтып берчи жана окууга кеңеш бер.`,
        uz: `«${focus.title}» (${focus.author}) kitobi haqida qisqacha aytib ber va o'qish bo'yicha maslahat ber.`,
        ru: `Коротко расскажи о книге «${focus.title}» (${focus.author}) и дай совет, как её читать.` }[lang];
      send(q);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus]);

  async function send(text: string) {
    text = text.trim();
    if (!text || busy) return;
    const next: Msg[] = [...msgs, { role: "user", content: text }];
    setMsgs([...next, { role: "assistant", content: "" }]);
    setDraft(""); setErr(""); setBusy(true);
    ctl.current = new AbortController();
    try {
      const res = await fetch("/api/coach", {
        method: "POST", headers: { "Content-Type": "application/json" }, signal: ctl.current.signal,
        body: JSON.stringify({ mode: "chat", lang, messages: next }),
      });
      if (res.status === 429) throw new Error("limit");
      if (res.status === 503) throw new Error("off");
      if (!res.ok || !res.body) throw new Error("err");
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += dec.decode(value, { stream: true });
        setMsgs([...next, { role: "assistant", content: acc }]);
      }
      if (!acc.trim()) throw new Error("err");
    } catch (e) {
      const aborted = (e as Error).name === "AbortError";
      setMsgs((m) => (m[m.length - 1]?.content ? m : m.slice(0, -1)));
      const m = (e as Error).message;
      if (!aborted) setErr(m === "limit" ? t(lang, "ai_limit") : m === "off" ? t(lang, "ai_off") : t(lang, "ai_err"));
    } finally {
      setBusy(false); ctl.current = null;
    }
  }

  async function startQuiz() {
    setQuizPick(false); setQuizLoading(true); setErr("");
    try {
      const res = await fetch("/api/coach", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "quiz", lang, bookId: quizBook }) });
      if (res.status === 429) throw new Error("limit");
      if (res.status === 503) throw new Error("off");
      if (!res.ok) throw new Error("err");
      const j = (await res.json()) as { questions: Q[]; bookId: string; title: string };
      setQuiz({ bookId: j.bookId, title: j.title, qs: j.questions, i: 0, picked: null, score: 0 });
    } catch (e) {
      const m = (e as Error).message;
      setErr(m === "limit" ? t(lang, "ai_limit") : m === "off" ? t(lang, "ai_off") : t(lang, "ai_err"));
    } finally { setQuizLoading(false); }
  }
  async function nextQ() {
    if (!quiz) return;
    const i = quiz.i + 1;
    setQuiz({ ...quiz, i, picked: null });
    if (i >= quiz.qs.length) {
      const sb = supabaseBrowser();
      const { data: { user } } = await sb.auth.getUser();
      if (user) await sb.from("quiz_results").insert({ user_id: user.id, book_id: quiz.bookId, score: quiz.score, total: quiz.qs.length });
    }
  }

  const quick: [Parameters<typeof t>[1], Parameters<typeof t>[1]][] = [["q_plan", "p_plan"], ["q_rec", "p_rec"]];

  return (
    <>
      <div className="grid gap-3 py-4" aria-live="polite">
        <div className="max-w-[88%] justify-self-start whitespace-pre-wrap rounded-[20px] rounded-bl-md bg-soft px-4 py-3">{t(lang, "c_hello")}</div>
        {msgs.map((m, i) => (
          <div key={i} className={`max-w-[88%] whitespace-pre-wrap rounded-[20px] px-4 py-3 [overflow-wrap:anywhere] ${m.role === "user" ? "justify-self-end rounded-br-md bg-accent text-accent-ink" : "justify-self-start rounded-bl-md bg-soft"}`}>
            {m.content || <span className="text-muted">{t(lang, "thinking")}</span>}
          </div>
        ))}
        {busy && <button className="btn btn-line btn-sm justify-self-start" onClick={() => ctl.current?.abort()}>{t(lang, "stop")}</button>}

        {quizPick && (
          <div className="grid gap-3.5 rounded-card border border-line bg-card p-5">
            <b className="text-lg">{t(lang, "quiz_pick")}</b>
            <select className="input" value={quizBook} onChange={(e) => setQuizBook(e.target.value)}>
              {books.map((b) => <option key={b.id} value={b.id}>{b.title} — {b.author}</option>)}
            </select>
            <div className="flex gap-2"><button className="btn btn-sm" onClick={startQuiz} disabled={!quizBook}>{t(lang, "quiz_go")}</button><button className="btn btn-line btn-sm" onClick={() => setQuizPick(false)}>{t(lang, "cancel")}</button></div>
          </div>
        )}
        {quizLoading && <p className="text-muted">{t(lang, "quiz_making")}</p>}
        {quiz && (
          <div className="grid gap-3.5 rounded-card border border-line bg-card p-5">
            <span className="eb">{quiz.title}</span>
            {quiz.i >= quiz.qs.length ? (
              <>
                <b className="text-lg">{t(lang, "quiz_done", { s: quiz.score, t: quiz.qs.length })}</b>
                <button className="btn btn-sm justify-self-start" onClick={() => setQuiz(null)}>{t(lang, "quiz_close")}</button>
              </>
            ) : (
              <>
                <b className="text-lg">{quiz.qs[quiz.i].q}</b>
                <div className="grid gap-2">
                  {quiz.qs[quiz.i].options.map((o, j) => {
                    const q = quiz.qs[quiz.i], pk = quiz.picked;
                    const cls = pk == null ? "border-line" : j === q.answer ? "border-ok ring-1 ring-ok" : j === pk ? "border-bad ring-1 ring-bad" : "border-line";
                    return (
                      <button key={j} disabled={pk != null} className={`rounded-[14px] border bg-bg px-4 py-3 text-left ${cls}`}
                        onClick={() => setQuiz({ ...quiz, picked: j, score: quiz.score + (j === q.answer ? 1 : 0) })}>{o}</button>
                    );
                  })}
                </div>
                {quiz.picked != null && (
                  <>
                    {quiz.qs[quiz.i].why && <p className="text-sm text-muted">{quiz.qs[quiz.i].why}</p>}
                    <button className="btn btn-sm justify-self-start" onClick={nextQ}>{t(lang, "quiz_next")}</button>
                  </>
                )}
              </>
            )}
          </div>
        )}
        {err && <p role="alert" className="text-sm text-bad">{err}</p>}
        <div ref={end} />
      </div>

      <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
        {quick.map(([l, p]) => <button key={l} className="chip" disabled={busy} onClick={() => send(t(lang, p))}>{t(lang, l)}</button>)}
        <button className="chip" disabled={busy} onClick={() => setDraft(t(lang, "p_exp"))}>{t(lang, "q_exp")}</button>
        <button className="chip" disabled={busy || !books.length} onClick={() => { setQuiz(null); setQuizPick(true); }}>{t(lang, "q_quiz")}</button>
      </div>
      <form className="sticky bottom-[calc(70px+env(safe-area-inset-bottom))] flex gap-2 bg-bg py-2.5" onSubmit={(e) => { e.preventDefault(); send(draft); }}>
        <textarea rows={1} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={t(lang, "input_ph")} aria-label={t(lang, "input_ph")} maxLength={4000}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(draft); } }}
          className="max-h-32 min-w-0 flex-1 resize-none rounded-[22px] border border-line bg-card px-4 py-3" />
        <button className="grid h-[50px] w-[50px] flex-none place-items-center self-end rounded-full bg-accent text-accent-ink disabled:opacity-50" disabled={busy || !draft.trim()} aria-label="Send">
          <IconSend className="h-5 w-5" />
        </button>
      </form>
    </>
  );
}
