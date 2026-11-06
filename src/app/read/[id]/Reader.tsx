"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLang } from "@/components/Providers";
import { IconBookmark, IconLeft, IconRight, IconX } from "@/components/icons";
import { t } from "@/lib/i18n";
import { supabaseBrowser } from "@/lib/supabase/client";

type Mark = { id: string; location: string; label: string | null };
type Note = { id: string; location: string; body: string };

// epubjs'тин минималдуу типтери
type Rendition = {
  display: (target?: string) => Promise<void>;
  next: () => Promise<void>;
  prev: () => Promise<void>;
  on: (ev: string, cb: (loc: { start: { cfi: string; displayed: { page: number; total: number } } }) => void) => void;
  themes: { fontSize: (s: string) => void; default: (s: Record<string, Record<string, string>>) => void };
  destroy: () => void;
};
type EpubBook = {
  renderTo: (el: HTMLElement, opts: Record<string, unknown>) => Rendition;
  ready: Promise<void>;
  locations: { generate: (n: number) => Promise<unknown>; percentageFromCfi: (cfi: string) => number };
  destroy: () => void;
};
type PdfDoc = { numPages: number; getPage: (n: number) => Promise<PdfPage>; destroy: () => void };
type PdfPage = {
  getViewport: (o: { scale: number }) => { width: number; height: number };
  render: (o: { canvasContext: CanvasRenderingContext2D; viewport: unknown }) => { promise: Promise<void> };
};

export function Reader({ bookId, title, fileType, initialLocation, initialBookmarks, initialNotes }: {
  bookId: string; title: string; fileType: "pdf" | "epub";
  initialLocation: string | null; initialBookmarks: Mark[]; initialNotes: Note[];
}) {
  const lang = useLang();
  const sb = supabaseBrowser();
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [loc, setLoc] = useState<string>(initialLocation ?? (fileType === "pdf" ? "1" : ""));
  const [label, setLabel] = useState("");
  const [pct, setPct] = useState(0);
  const [marks, setMarks] = useState<Mark[]>(initialBookmarks);
  const [notes, setNotes] = useState<Note[]>(initialNotes);
  const [panel, setPanel] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [font, setFont] = useState(100);
  const [sessionSec, setSessionSec] = useState(0);

  const host = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const rendition = useRef<Rendition | null>(null);
  const epub = useRef<EpubBook | null>(null);
  const pdf = useRef<PdfDoc | null>(null);
  const pdfPage = useRef(1);
  const renderSeq = useRef(0);

  /* ---------- прогрессти сактоо (debounce) ---------- */
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const saveProgress = useCallback((location: string, percent: number) => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const { data: { user } } = await sb.auth.getUser();
      if (!user) return;
      await sb.from("reading_progress").upsert({
        user_id: user.id, book_id: bookId, location, percent: Math.round(percent * 100) / 100,
        finished: percent >= 99.5, updated_at: new Date().toISOString(),
      });
    }, 800);
  }, [sb, bookId]);

  /* ---------- окуу убактысы: көрүнүп турганда 30 сек сайын ---------- */
  useEffect(() => {
    let acc = 0;
    const tick = setInterval(() => {
      if (document.hidden) return;
      acc++; setSessionSec((s) => s + 1);
      if (acc >= 30) { acc = 0; sb.rpc("add_reading_seconds", { p_seconds: 30 }); }
    }, 1000);
    const flush = () => { if (acc > 0) { sb.rpc("add_reading_seconds", { p_seconds: acc }); acc = 0; } };
    document.addEventListener("visibilitychange", flush);
    return () => { clearInterval(tick); flush(); document.removeEventListener("visibilitychange", flush); };
  }, [sb]);

  /* ---------- PDF ---------- */
  const drawPdf = useCallback(async (n: number) => {
    const doc = pdf.current, c = canvas.current, h = host.current;
    if (!doc || !c || !h) return;
    const seq = ++renderSeq.current;
    const page = await doc.getPage(n);
    if (seq !== renderSeq.current) return;
    const dpr = window.devicePixelRatio || 1;
    const w = Math.min(860, h.clientWidth - 32) * (font / 100);
    const base = page.getViewport({ scale: 1 });
    const vp = page.getViewport({ scale: (w * dpr) / base.width });
    c.width = vp.width; c.height = vp.height;
    c.style.width = `${w}px`;
    await page.render({ canvasContext: c.getContext("2d")!, viewport: vp }).promise;
    const p = (n / doc.numPages) * 100;
    setLoc(String(n)); setLabel(t(lang, "page_of", { a: n, b: doc.numPages })); setPct(p);
    saveProgress(String(n), p);
  }, [font, lang, saveProgress]);

  /* ---------- файлды ачуу ---------- */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/book-file/${bookId}`, { cache: "no-store" });
        if (!res.ok) throw new Error(String(res.status));
        const { url } = (await res.json()) as { url: string };
        if (cancelled) return;

        if (fileType === "pdf") {
          const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
          pdfjs.GlobalWorkerOptions.workerSrc = "https://unpkg.com/pdfjs-dist@4.8.69/legacy/build/pdf.worker.min.mjs";
          const doc = (await pdfjs.getDocument({ url }).promise) as unknown as PdfDoc;
          if (cancelled) return doc.destroy();
          pdf.current = doc;
          pdfPage.current = Math.min(Math.max(1, parseInt(initialLocation ?? "1") || 1), doc.numPages);
          setStatus("ready");
          await drawPdf(pdfPage.current);
        } else {
          const ePub = (await import("epubjs")).default as unknown as (u: string, o: Record<string, unknown>) => EpubBook;
          const book = ePub(url, { openAs: "epub" });
          epub.current = book;
          const r = book.renderTo(host.current!, { width: "100%", height: "100%", flow: "paginated", spread: "none", allowScriptedContent: false });
          rendition.current = r;
          r.themes.default({ body: { "font-family": "Georgia, serif", "line-height": "1.7" } });
          r.on("relocated", (l) => {
            const cfi = l.start.cfi;
            setLoc(cfi);
            let p = 0;
            try { p = book.locations.percentageFromCfi(cfi) * 100; } catch { /* локациялар даяр эмес */ }
            setPct(p);
            setLabel(l.start.displayed ? t(lang, "page_of", { a: l.start.displayed.page, b: l.start.displayed.total }) : "");
            saveProgress(cfi, p);
          });
          await r.display(initialLocation || undefined);
          if (cancelled) return;
          setStatus("ready");
          book.ready.then(() => book.locations.generate(1600)).catch(() => {});
        }
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
      rendition.current?.destroy(); epub.current?.destroy(); pdf.current?.destroy();
      rendition.current = null; epub.current = null; pdf.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookId, fileType]);

  useEffect(() => {
    if (fileType === "epub") rendition.current?.themes.fontSize(`${font}%`);
    else if (pdf.current) drawPdf(pdfPage.current);
  }, [font, fileType, drawPdf]);

  /* ---------- навигация ---------- */
  const go = useCallback((d: 1 | -1) => {
    if (fileType === "epub") { if (d > 0) rendition.current?.next(); else rendition.current?.prev(); return; }
    const doc = pdf.current; if (!doc) return;
    const n = Math.min(doc.numPages, Math.max(1, pdfPage.current + d));
    if (n !== pdfPage.current) { pdfPage.current = n; drawPdf(n); host.current?.scrollTo({ top: 0 }); }
  }, [fileType, drawPdf]);

  const jump = (location: string) => {
    setPanel(false);
    if (fileType === "epub") rendition.current?.display(location);
    else { pdfPage.current = parseInt(location) || 1; drawPdf(pdfPage.current); }
  };

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "TEXTAREA") return;
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [go]);

  /* ---------- белги жана жазуу ---------- */
  const marked = marks.find((m) => m.location === loc);
  async function toggleMark() {
    const { data: { user } } = await sb.auth.getUser(); if (!user) return;
    if (marked) {
      await sb.from("bookmarks").delete().eq("id", marked.id);
      setMarks(marks.filter((m) => m.id !== marked.id));
    } else {
      const { data } = await sb.from("bookmarks").insert({ user_id: user.id, book_id: bookId, location: loc, label }).select("id, location, label").single();
      if (data) setMarks([...marks, data]);
    }
  }
  async function addNote() {
    const body = noteText.trim(); if (!body) return;
    const { data: { user } } = await sb.auth.getUser(); if (!user) return;
    const { data } = await sb.from("notes").insert({ user_id: user.id, book_id: bookId, location: loc, body }).select("id, location, body").single();
    if (data) { setNotes([...notes, data]); setNoteText(""); }
  }
  async function delNote(id: string) {
    await sb.from("notes").delete().eq("id", id);
    setNotes(notes.filter((n) => n.id !== id));
  }

  const mmss = `${String(Math.floor(sessionSec / 60)).padStart(2, "0")}:${String(sessionSec % 60).padStart(2, "0")}`;
  const tool = "grid h-10 min-w-10 place-items-center rounded-xl border border-line bg-card px-2.5 font-mono text-[13px] font-semibold";

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-bg pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]">
      <div className="flex items-center gap-2 border-b border-line px-3.5 py-2.5">
        <Link href="/library" className={tool} aria-label={t(lang, "back")}><IconLeft className="h-[18px] w-[18px]" /></Link>
        <div className="min-w-0 flex-1 truncate text-[15px] font-semibold">{title}</div>
        <span className="font-mono text-[13px] tabular-nums text-accent-deep">{mmss}</span>
        <button className={tool} onClick={() => setFont((f) => Math.max(80, f - 10))} aria-label="A-">A−</button>
        <button className={tool} onClick={() => setFont((f) => Math.min(160, f + 10))} aria-label="A+">A+</button>
        <button className={`${tool} ${marked ? "!border-transparent !bg-accent !text-accent-ink" : ""}`} onClick={toggleMark} aria-pressed={!!marked} aria-label={t(lang, "bookmarks")} disabled={status !== "ready"}>
          <IconBookmark className="h-[18px] w-[18px]" />
        </button>
        <button className={tool} onClick={() => setPanel(true)} aria-label={t(lang, "notes")}>≡</button>
      </div>

      <div ref={host} className={`relative flex-1 ${fileType === "pdf" ? "overflow-auto p-4" : "overflow-hidden px-2"}`}>
        {fileType === "pdf" && <canvas ref={canvas} className="mx-auto block rounded-md bg-white shadow-book" />}
        {status === "loading" && <p className="absolute inset-0 grid place-items-center text-muted">{t(lang, "loading")}</p>}
        {status === "error" && <p role="alert" className="absolute inset-0 grid place-items-center px-6 text-center text-muted">{t(lang, "read_err")}</p>}
      </div>

      <div className="flex items-center gap-2 border-t border-line px-3.5 py-2.5">
        <button className={tool} onClick={() => go(-1)} aria-label="prev"><IconLeft className="h-[18px] w-[18px]" /></button>
        <div className="flex-1 text-center text-[13px] text-muted">
          {label || `${Math.round(pct)}%`}
          <div className="mt-1.5 h-1.5 overflow-hidden rounded bg-soft2"><i className="block h-full rounded bg-accent" style={{ width: `${pct}%` }} /></div>
        </div>
        <button className={tool} onClick={() => go(1)} aria-label="next"><IconRight className="h-[18px] w-[18px]" /></button>
      </div>

      {panel && (
        <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true">
          <button className="absolute inset-0 bg-black/45" onClick={() => setPanel(false)} aria-label={t(lang, "back")} />
          <div className="absolute inset-x-0 bottom-0 mx-auto grid max-h-[85vh] max-w-[640px] gap-4 overflow-auto rounded-t-[26px] bg-bg p-[18px] pb-[calc(24px+env(safe-area-inset-bottom))]">
            <div className="flex items-center justify-between"><h2 className="text-xl font-semibold">{t(lang, "notes")}</h2>
              <button className={tool} onClick={() => setPanel(false)} aria-label={t(lang, "back")}><IconX className="h-4 w-4" /></button></div>
            <label className="field">{t(lang, "add_note")}
              <textarea className="input" rows={3} maxLength={5000} placeholder={t(lang, "note_ph")} value={noteText} onChange={(e) => setNoteText(e.target.value)} />
            </label>
            <button className="btn btn-sm justify-self-start" onClick={addNote} disabled={!noteText.trim()}>{t(lang, "save")}</button>
            {notes.map((n) => (
              <div key={n.id} className="grid gap-1 rounded-xl border border-line p-3 text-sm">
                <p className="whitespace-pre-wrap">{n.body}</p>
                <div className="flex gap-3"><button className="text-accent-deep" onClick={() => jump(n.location)}>{t(lang, "cont")}</button><button className="text-bad" onClick={() => delNote(n.id)}>{t(lang, "del")}</button></div>
              </div>
            ))}
            <span className="eb pt-2">{t(lang, "bookmarks")}</span>
            {marks.map((m) => (
              <button key={m.id} className="border-b border-line py-3 text-left text-[15px]" onClick={() => jump(m.location)}>{m.label || m.location}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
