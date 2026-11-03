"use client";
import { createContext, useCallback, useContext, useState } from "react";

type ToastFn = (msg: string, type?: "error") => void;
const Ctx = createContext<ToastFn>(() => {});
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<{ id: number; msg: string; type?: string }[]>([]);
  const toast = useCallback<ToastFn>((msg, type) => {
    const id = Date.now() + Math.random();
    setItems((l) => [...l, { id, msg, type }]);
    setTimeout(() => setItems((l) => l.filter((x) => x.id !== id)), 3500);
  }, []);
  return (
    <Ctx.Provider value={toast}>
      {children}
      <div id="toasts" aria-live="polite">
        {items.map((t) => <div key={t.id} className={`toast ${t.type ?? ""}`}>{t.msg}</div>)}
      </div>
    </Ctx.Provider>
  );
}
