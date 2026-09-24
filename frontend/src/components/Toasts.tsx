import clsx from "clsx";
import { AlertTriangle, CheckCircle2, Info, Sparkles, X, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useLive } from "../lib/live";

type Kind = "success" | "error" | "info" | "warning" | "signal";
interface Toast {
  id: number;
  kind: Kind;
  title: string;
  text?: string;
}

let seq = 1;
const listeners = new Set<(t: Toast) => void>();

export function toast(kind: Kind, title: string, text?: string) {
  const t = { id: seq++, kind, title, text };
  listeners.forEach((fn) => fn(t));
}

const ICONS = {
  success: <CheckCircle2 className="h-4 w-4 text-up" />,
  error: <XCircle className="h-4 w-4 text-down" />,
  warning: <AlertTriangle className="h-4 w-4 text-warn" />,
  info: <Info className="h-4 w-4 text-info" />,
  signal: <Sparkles className="h-4 w-4 text-accent" />,
};

export function Toaster() {
  const [items, setItems] = useState<Toast[]>([]);
  const { onEvent } = useLive();

  useEffect(() => {
    const add = (t: Toast) => {
      setItems((prev) => [...prev.slice(-3), t]);
      window.setTimeout(() => setItems((prev) => prev.filter((p) => p.id !== t.id)), t.kind === "error" ? 8000 : 5500);
    };
    listeners.add(add);
    const off = onEvent((ev) => {
      if (ev.kind === "trade" || ev.kind === "signal" || ev.level === "critical" || ev.kind === "model") {
        const kind: Kind =
          ev.level === "critical" || ev.level === "error" ? "error" : ev.level === "warning" ? "warning" : ev.level === "signal" ? "signal" : ev.level === "success" ? "success" : "info";
        const title = ev.kind === "trade" ? "İşlem" : ev.kind === "signal" ? "Yeni AI Sinyali" : ev.kind === "model" ? "AI Model" : "Uyarı";
        add({ id: seq++, kind, title, text: ev.message });
      }
    });
    return () => {
      listeners.delete(add);
      off();
    };
  }, [onEvent]);

  return (
    <div className="pointer-events-none fixed right-3 bottom-20 z-[200] flex w-[min(380px,calc(100vw-24px))] flex-col gap-2 lg:bottom-4">
      {items.map((t) => (
        <div key={t.id} role="status" className={clsx("card fade-up pointer-events-auto flex items-start gap-3 px-4 py-3")}>
          <div className="mt-0.5">{ICONS[t.kind]}</div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">{t.title}</p>
            {t.text && <p className="mt-0.5 text-xs leading-relaxed break-words text-fg-2">{t.text}</p>}
          </div>
          <button className="text-muted hover:text-fg" aria-label="Kapat" onClick={() => setItems((p) => p.filter((x) => x.id !== t.id))}>
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
