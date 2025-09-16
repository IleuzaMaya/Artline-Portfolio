import { createContext, useCallback, useContext, useMemo, useState } from "react";

const ToastCtx = createContext({ show: () => {} });

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);

  const show = useCallback((message, opts = {}) => {
    const id = crypto.randomUUID();
    const item = { id, message, ...opts };
    setItems((prev) => [...prev, item]);
    const ms = Math.max(2000, Math.min(8000, opts.duration ?? 5000));
    setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), ms);
  }, []);

  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastCtx.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-6 flex justify-center px-4">
        <div className="flex w-full max-w-lg flex-col gap-3">
          {items.map((t) => (
            <div
              key={t.id}
              className="pointer-events-auto rounded-xl border bg-white/95 p-4 shadow-lg backdrop-blur"
            >
              <div className="flex items-center gap-3">
                <div className="text-sm font-medium">{t.message}</div>
                <div className="ml-auto flex items-center gap-2">
                  {t.href && (
                    <a
                      href={t.href}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-md border px-2 py-1 text-xs hover:bg-gray-50"
                    >
                      Abrir
                    </a>
                  )}
                  {t.copy && (
                    <button
                      onClick={() => navigator.clipboard?.writeText(t.copy)}
                      className="rounded-md border px-2 py-1 text-xs hover:bg-gray-50"
                    >
                      Copiar
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  return useContext(ToastCtx);
}
