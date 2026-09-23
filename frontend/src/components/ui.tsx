import clsx from "clsx";
import { Info, Loader2, X } from "lucide-react";
import { useEffect, useId, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import type { Action, Regime } from "../lib/types";

export function Card({ className, children, ...rest }: { className?: string; children: ReactNode } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={clsx("card", className)} {...rest}>
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, icon, right, className }: { title: ReactNode; subtitle?: ReactNode; icon?: ReactNode; right?: ReactNode; className?: string }) {
  return (
    <div className={clsx("flex items-start justify-between gap-3 px-5 pt-4 pb-3", className)}>
      <div className="flex min-w-0 items-center gap-2.5">
        {icon && <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-surface-2 text-fg-2 ring-1 ring-line">{icon}</div>}
        <div className="min-w-0">
          <h3 className="truncate text-[0.9rem] font-semibold tracking-tight">{title}</h3>
          {subtitle && <p className="mt-0.5 truncate text-xs text-muted">{subtitle}</p>}
        </div>
      </div>
      {right && <div className="flex shrink-0 items-center gap-2">{right}</div>}
    </div>
  );
}

type Variant = "primary" | "secondary" | "ghost" | "danger" | "success" | "ai";
export function Button({
  variant = "secondary",
  size = "md",
  loading,
  icon,
  className,
  children,
  disabled,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: "sm" | "md" | "lg"; loading?: boolean; icon?: ReactNode }) {
  const styles: Record<Variant, string> = {
    primary: "bg-fg text-bg hover:opacity-90",
    secondary: "bg-surface-2 text-fg ring-1 ring-line-strong hover:bg-surface-3",
    ghost: "text-fg-2 hover:bg-surface-2 hover:text-fg",
    danger: "bg-down text-white hover:brightness-110",
    success: "bg-up text-white hover:brightness-110",
    ai: "ai-gradient text-white shadow-[0_8px_24px_-10px_var(--accent)] hover:brightness-110",
  };
  const sizes = { sm: "h-8 px-3 text-xs gap-1.5", md: "h-9 px-3.5 text-sm gap-2", lg: "h-11 px-5 text-sm gap-2" };
  return (
    <button
      className={clsx(
        "inline-flex select-none items-center justify-center rounded-xl font-medium whitespace-nowrap transition active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50",
        styles[variant],
        sizes[size],
        className,
      )}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      {children}
    </button>
  );
}

type Tone = "neutral" | "up" | "down" | "warn" | "accent" | "info";
export function Badge({ tone = "neutral", children, className, dot }: { tone?: Tone; children: ReactNode; className?: string; dot?: boolean }) {
  const tones: Record<Tone, string> = {
    neutral: "bg-surface-2 text-fg-2 ring-line-strong",
    up: "bg-up-soft text-up ring-up/25",
    down: "bg-down-soft text-down ring-down/25",
    warn: "bg-warn-soft text-warn ring-warn/25",
    accent: "bg-accent-soft text-accent ring-accent/25",
    info: "bg-info-soft text-info ring-info/25",
  };
  return (
    <span className={clsx("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[0.7rem] font-semibold tracking-wide ring-1 ring-inset", tones[tone], className)}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

export function ActionBadge({ action, size = "md", inPosition = true }: { action: Action; size?: "md" | "lg"; inPosition?: boolean }) {
  const map = {
    BUY: { tone: "up" as Tone, text: "AL" },
    EXIT: { tone: "down" as Tone, text: inPosition ? "ÇIK" : "UZAK DUR" },
    WAIT: { tone: "neutral" as Tone, text: "BEKLE" },
  }[action];
  return (
    <Badge tone={map.tone} className={size === "lg" ? "px-3 py-1 text-xs" : ""} dot>
      {map.text}
    </Badge>
  );
}

export const REGIME_TONE: Record<Regime, Tone> = {
  trend_up: "up",
  trend_down: "down",
  range: "info",
  volatile: "warn",
  neutral: "neutral",
};

export function RegimeBadge({ regime, label }: { regime: Regime; label: string }) {
  return <Badge tone={REGIME_TONE[regime]}>{label}</Badge>;
}

export function Stat({
  label,
  value,
  sub,
  icon,
  tone,
  hint,
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  sub?: ReactNode;
  icon?: ReactNode;
  tone?: "up" | "down" | "neutral";
  hint?: string;
  className?: string;
}) {
  return (
    <div className={clsx("card relative overflow-hidden px-4 py-3.5", className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1 text-xs font-medium text-muted">
          {label}
          {hint && <InfoTip text={hint} />}
        </span>
        {icon && <span className="text-muted">{icon}</span>}
      </div>
      <div className={clsx("num mt-1.5 truncate text-[1.3rem] leading-tight font-semibold tracking-tight", tone === "up" && "text-up", tone === "down" && "text-down")}>{value}</div>
      {sub && <div className="num mt-1 truncate text-xs text-fg-2">{sub}</div>}
    </div>
  );
}

export function InfoTip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <span className="relative inline-flex">
      <button
        type="button"
        aria-describedby={open ? id : undefined}
        aria-label="Bilgi"
        className="text-muted/80 hover:text-fg-2"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen((o) => !o)}
      >
        <Info className="h-3.5 w-3.5" />
      </button>
      {open && (
        <span
          id={id}
          role="tooltip"
          className="absolute bottom-full left-1/2 z-50 mb-2 w-60 -translate-x-1/2 rounded-lg bg-surface-3 px-3 py-2 text-xs leading-relaxed font-normal text-fg-2 shadow-xl ring-1 ring-line-strong"
        >
          {text}
        </span>
      )}
    </span>
  );
}

export function Toggle({ checked, onChange, label, description, disabled }: { checked: boolean; onChange: (v: boolean) => void; label?: ReactNode; description?: ReactNode; disabled?: boolean }) {
  return (
    <label className={clsx("flex cursor-pointer items-start justify-between gap-4", disabled && "cursor-not-allowed opacity-60")}>
      {(label || description) && (
        <span className="min-w-0">
          {label && <span className="block text-sm font-medium">{label}</span>}
          {description && <span className="mt-0.5 block text-xs text-muted">{description}</span>}
        </span>
      )}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={clsx("relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition", checked ? "ai-gradient" : "bg-surface-3 ring-1 ring-line-strong")}
      >
        <span className={clsx("absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform", checked && "translate-x-5")} />
      </button>
    </label>
  );
}

export function Segmented<T extends string>({ value, options, onChange, size = "md" }: { value: T; options: { value: T; label: ReactNode }[]; onChange: (v: T) => void; size?: "sm" | "md" }) {
  return (
    <div className="inline-flex rounded-xl bg-surface-2 p-1 ring-1 ring-line" role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={o.value === value}
          onClick={() => onChange(o.value)}
          className={clsx(
            "rounded-lg font-medium whitespace-nowrap transition",
            size === "sm" ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-sm",
            o.value === value ? "bg-surface-3 text-fg shadow-sm ring-1 ring-line-strong" : "text-muted hover:text-fg-2",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Progress({ value, className, tone = "ai" }: { value: number; className?: string; tone?: "ai" | "up" | "down" | "warn" }) {
  const bg = { ai: "ai-gradient", up: "bg-up", down: "bg-down", warn: "bg-warn" }[tone];
  return (
    <div className={clsx("h-1.5 w-full overflow-hidden rounded-full bg-surface-3", className)}>
      <div className={clsx("h-full rounded-full transition-[width] duration-500", bg)} style={{ width: `${Math.max(0, Math.min(100, value * 100))}%` }} />
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={clsx("h-5 w-5 animate-spin text-muted", className)} />;
}

export function Empty({ icon, title, text, action }: { icon?: ReactNode; title: string; text?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      {icon && <div className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-surface-2 text-muted ring-1 ring-line">{icon}</div>}
      <p className="text-sm font-medium">{title}</p>
      {text && <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx("skeleton", className)} />;
}

export function Modal({ open, onClose, title, children, footer, wide }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/55 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        className={clsx("card fade-up max-h-[92dvh] w-full overflow-y-auto rounded-b-none sm:rounded-2xl", wide ? "sm:max-w-2xl" : "sm:max-w-md")}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h3 className="font-semibold">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-muted hover:bg-surface-2 hover:text-fg" aria-label="Kapat">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-line px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

export function Field({ label, hint, children, suffix }: { label: ReactNode; hint?: ReactNode; children: ReactNode; suffix?: ReactNode }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <div className="relative mt-1.5">
        {children}
        {suffix && <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted">{suffix}</span>}
      </div>
      {hint && <span className="mt-1 block text-[0.7rem] leading-snug text-muted">{hint}</span>}
    </label>
  );
}

export function NumberInput({ value, onChange, step = 0.1, min, max, suffix }: { value: number; onChange: (v: number) => void; step?: number; min?: number; max?: number; suffix?: string }) {
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);
  return (
    <input
      className={clsx("input num", suffix && "pr-10")}
      inputMode="decimal"
      value={text}
      step={step}
      min={min}
      max={max}
      onChange={(e) => {
        setText(e.target.value);
        const v = Number(e.target.value.replace(",", "."));
        if (e.target.value.trim() !== "" && Number.isFinite(v)) onChange(v);
      }}
      onBlur={() => setText(String(value))}
    />
  );
}

export function Pnl({ value, pct, className, digits = 2 }: { value: number; pct?: number; className?: string; digits?: number }) {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  const abs = new Intl.NumberFormat("tr-TR", { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(Math.abs(value));
  return (
    <span className={clsx("num font-medium", value > 0 ? "text-up" : value < 0 ? "text-down" : "text-fg-2", className)}>
      {sign}
      {abs} $
      {pct !== undefined && (
        <span className="ml-1 text-[0.85em] opacity-80">
          ({sign}%{new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(pct))})
        </span>
      )}
    </span>
  );
}

export function CoinIcon({ symbol, size = 32 }: { symbol: string; size?: number }) {
  const base = symbol.split("/")[0];
  let h = 0;
  for (const ch of base) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full font-bold text-white"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.34,
        background: `linear-gradient(135deg, hsl(${h} 70% 55%), hsl(${(h + 40) % 360} 75% 42%))`,
      }}
      aria-hidden
    >
      {base.slice(0, base.length > 4 ? 3 : 4)}
    </span>
  );
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="text-sm font-semibold tracking-tight text-fg-2">{children}</h2>
      {right}
    </div>
  );
}
