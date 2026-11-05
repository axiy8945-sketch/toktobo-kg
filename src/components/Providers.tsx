"use client";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { CartItem, Lang } from "@/lib/types";

/* ---------- Тил ---------- */
const LangCtx = createContext<Lang>("ky");
export const useLang = () => useContext(LangCtx);

/* ---------- Себет (браузерде сакталат; баа серверде эсептелет) ---------- */
interface CartApi {
  items: CartItem[];
  add: (book_id: string, kind: CartItem["kind"]) => void;
  setQty: (i: number, qty: number) => void;
  remove: (i: number) => void;
  clear: () => void;
}
const CartCtx = createContext<CartApi | null>(null);
export function useCart() {
  const c = useContext(CartCtx);
  if (!c) throw new Error("useCart outside Providers");
  return c;
}
const KEY = "toktobo.cart";

export function Providers({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    try { setItems(JSON.parse(localStorage.getItem(KEY) || "[]")); } catch { /* бош */ }
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  const persist = useCallback((next: CartItem[]) => {
    setItems(next);
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* жок */ }
  }, []);

  const api: CartApi = {
    items,
    add: (book_id, kind) => {
      const ex = items.find((x) => x.book_id === book_id && x.kind === kind);
      if (ex) { if (kind === "paper") persist(items.map((x) => (x === ex ? { ...x, qty: x.qty + 1 } : x))); }
      else persist([...items, { book_id, kind, qty: 1 }]);
    },
    setQty: (i, qty) => persist(qty <= 0 ? items.filter((_, j) => j !== i) : items.map((x, j) => (j === i ? { ...x, qty } : x))),
    remove: (i) => persist(items.filter((_, j) => j !== i)),
    clear: () => persist([]),
  };

  return (
    <LangCtx.Provider value={lang}>
      <CartCtx.Provider value={api}>{children}</CartCtx.Provider>
    </LangCtx.Provider>
  );
}
