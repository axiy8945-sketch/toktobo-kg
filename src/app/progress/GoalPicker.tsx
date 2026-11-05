"use client";
import { useState, useTransition } from "react";
import { useLang } from "@/components/Providers";
import { t } from "@/lib/i18n";
import { setDailyGoal } from "@/app/actions";

export function GoalPicker({ goal }: { goal: number }) {
  const lang = useLang();
  const [g, setG] = useState(goal);
  const [pending, start] = useTransition();
  return (
    <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
      {[10, 15, 20, 30, 45, 60].map((v) => (
        <button key={v} disabled={pending} aria-pressed={g === v} className={`chip ${g === v ? "chip-on" : ""}`}
          onClick={() => { setG(v); start(async () => { await setDailyGoal(v); }); }}>
          {v} {t(lang, "m")}
        </button>
      ))}
    </div>
  );
}
