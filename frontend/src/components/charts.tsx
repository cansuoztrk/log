import clsx from "clsx";
import { useId, type ReactNode } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fmtDate, fmtDateTime, fmtNum, fmtPct, fmtUsd } from "../lib/format";

type TipRow = { name: string; value: string; color?: string };
interface TipProps {
  active?: boolean;
  payload?: readonly { payload?: Record<string, unknown> }[];
}

function TipBox({ title, rows }: { title: ReactNode; rows: TipRow[] }) {
  return (
    <div className="rounded-xl bg-surface-3/95 px-3 py-2 text-xs shadow-xl ring-1 ring-line-strong backdrop-blur">
      <div className="mb-1 font-medium text-fg-2">{title}</div>
      {rows.map((r) => (
        <div key={r.name} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-muted">
            {r.color && <span className="h-2 w-2 rounded-full" style={{ background: r.color }} />}
            {r.name}
          </span>
          <span className="num font-semibold text-fg">{r.value}</span>
        </div>
      ))}
    </div>
  );
}

const axisProps = {
  stroke: "var(--muted)",
  tick: { fill: "var(--muted)", fontSize: 11 },
  tickLine: false,
  axisLine: false,
} as const;

function compactUsd(v: number) {
  return Math.abs(v) >= 1e6 ? `${fmtNum(v / 1e6, 2)}M` : fmtNum(v, 0);
}

export function LegendRow({ items }: { items: { label: string; color: string; dashed?: boolean }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-4 text-xs text-fg-2">
      {items.map((i) => (
        <span key={i.label} className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded-full" style={{ background: i.dashed ? `repeating-linear-gradient(90deg, ${i.color} 0 4px, transparent 4px 7px)` : i.color }} />
          {i.label}
        </span>
      ))}
    </div>
  );
}

export function EquityChart({
  data,
  height = 260,
  benchmark,
}: {
  data: { time: number; equity: number; benchmark?: number }[];
  height?: number;
  benchmark?: boolean;
}) {
  const gid = useId().replace(/:/g, "");
  const first = data[0]?.equity ?? 0;
  const last = data[data.length - 1]?.equity ?? 0;
  const color = last >= first ? "var(--up)" : "var(--down)";
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={`eq-${gid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.28} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="var(--grid)" vertical={false} />
        <XAxis dataKey="time" type="number" domain={["dataMin", "dataMax"]} tickFormatter={(t) => fmtDate(t).slice(0, 6)} minTickGap={40} {...axisProps} />
        <YAxis domain={["auto", "auto"]} tickFormatter={compactUsd} width={60} {...axisProps} />
        <Tooltip
          cursor={{ stroke: "var(--line-strong)" }}
          content={(p: TipProps) => {
            const row = p.active ? p.payload?.[0]?.payload : null;
            if (!row) return null;
            const rows: TipRow[] = [{ name: "Bakiye", value: fmtUsd(row.equity as number), color }];
            if (benchmark && row.benchmark != null) rows.push({ name: "Al & Tut", value: fmtUsd(row.benchmark as number), color: "var(--muted)" });
            if (first) rows.push({ name: "Getiri", value: fmtPct((row.equity as number) / first - 1, 2) });
            return <TipBox title={fmtDateTime(row.time as number)} rows={rows} />;
          }}
        />
        {benchmark && <Line type="monotone" dataKey="benchmark" stroke="var(--muted)" strokeWidth={1.5} strokeDasharray="4 3" dot={false} isAnimationActive={false} />}
        <Area type="monotone" dataKey="equity" stroke={color} strokeWidth={2} fill={`url(#eq-${gid})`} dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--surface)" }} isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function DrawdownChart({ data, height = 140 }: { data: { time: number; drawdown: number }[]; height?: number }) {
  const gid = useId().replace(/:/g, "");
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={`dd-${gid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--down)" stopOpacity={0.05} />
            <stop offset="100%" stopColor="var(--down)" stopOpacity={0.35} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="var(--grid)" vertical={false} />
        <XAxis dataKey="time" type="number" domain={["dataMin", "dataMax"]} tickFormatter={(t) => fmtDate(t).slice(0, 6)} minTickGap={40} {...axisProps} />
        <YAxis tickFormatter={(v) => fmtPct(v, 0)} width={48} {...axisProps} />
        <Tooltip
          cursor={{ stroke: "var(--line-strong)" }}
          content={(p: TipProps) => {
            const row = p.active ? p.payload?.[0]?.payload : null;
            if (!row) return null;
            return <TipBox title={fmtDateTime(row.time as number)} rows={[{ name: "Zirveden düşüş", value: fmtPct(row.drawdown as number, 2), color: "var(--down)" }]} />;
          }}
        />
        <Area type="monotone" dataKey="drawdown" stroke="var(--down)" strokeWidth={1.5} fill={`url(#dd-${gid})`} dot={false} isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/** Horizontal bar list rendered with plain HTML (crisp, responsive, accessible). */
export function BarList({
  items,
  format,
  signed,
  color = "var(--c1)",
}: {
  items: { label: ReactNode; value: number; sub?: ReactNode; key: string }[];
  format: (v: number) => string;
  signed?: boolean;
  color?: string;
}) {
  const max = Math.max(1e-9, ...items.map((i) => Math.abs(i.value)));
  return (
    <ul className="space-y-2.5">
      {items.map((i) => {
        const w = (Math.abs(i.value) / max) * 100;
        const c = signed ? (i.value >= 0 ? "var(--up)" : "var(--down)") : color;
        return (
          <li key={i.key}>
            <div className="mb-1 flex items-center justify-between gap-3 text-xs">
              <span className="truncate text-fg-2">{i.label}</span>
              <span className="num flex shrink-0 items-center gap-2 font-medium">
                {i.sub && <span className="text-muted">{i.sub}</span>}
                <span className={clsx(signed && (i.value >= 0 ? "text-up" : "text-down"))}>{format(i.value)}</span>
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
              <div className="h-full rounded-full" style={{ width: `${Math.max(2, w)}%`, background: c }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function RHistogram({ bins, height = 180 }: { bins: { from: number; to: number; count: number }[]; height?: number }) {
  const data = bins.map((b) => ({ ...b, label: `${b.from >= 0 ? "+" : ""}${b.from.toFixed(1)}R` }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 4, left: -18, bottom: 0 }} barCategoryGap={2}>
        <CartesianGrid stroke="var(--grid)" vertical={false} />
        <XAxis dataKey="label" interval={1} {...axisProps} />
        <YAxis allowDecimals={false} {...axisProps} />
        <Tooltip
          cursor={{ fill: "var(--surface-2)" }}
          content={(p: TipProps) => {
            const row = p.active ? p.payload?.[0]?.payload : null;
            if (!row) return null;
            const from = row.from as number;
            const to = row.to as number;
            return <TipBox title={`${from.toFixed(1)}R … ${to.toFixed(1)}R`} rows={[{ name: "İşlem", value: String(row.count) }]} />;
          }}
        />
        <Bar dataKey="count" radius={[4, 4, 0, 0]} isAnimationActive={false}>
          {data.map((d) => (
            <Cell key={d.from} fill={d.from < 0 ? "var(--down)" : "var(--up)"} fillOpacity={0.85} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

const MONTHS = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];

export function MonthlyHeatmap({ months }: { months: { month: string; return: number }[] }) {
  if (!months.length) return <p className="py-6 text-center text-xs text-muted">Henüz aylık veri yok</p>;
  const years = Array.from(new Set(months.map((m) => m.month.slice(0, 4)))).sort();
  const map = new Map(months.map((m) => [m.month, m.return]));
  const max = Math.max(0.02, ...months.map((m) => Math.abs(m.return)));
  const cell = (r: number | undefined) => {
    if (r === undefined) return { background: "transparent" };
    const a = Math.min(1, Math.abs(r) / max);
    const c = r >= 0 ? "var(--up)" : "var(--down)";
    return { background: `color-mix(in srgb, ${c} ${Math.round(12 + a * 58)}%, var(--surface-2))` };
  };
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] border-separate border-spacing-1 text-center text-[0.7rem]">
        <thead>
          <tr>
            <th className="w-12 font-medium text-muted" />
            {MONTHS.map((m) => (
              <th key={m} className="font-medium text-muted">
                {m}
              </th>
            ))}
            <th className="font-medium text-muted">Yıl</th>
          </tr>
        </thead>
        <tbody>
          {years.map((y) => {
            const vals = MONTHS.map((_, i) => map.get(`${y}-${String(i + 1).padStart(2, "0")}`));
            const yr = vals.reduce<number>((acc, v) => (v === undefined ? acc : (1 + acc) * (1 + v) - 1), 0);
            return (
              <tr key={y}>
                <td className="text-left font-medium text-fg-2">{y}</td>
                {vals.map((v, i) => (
                  <td key={i} className="num h-9 rounded-md font-medium" style={cell(v)} title={v === undefined ? "" : fmtPct(v, 2)}>
                    {v === undefined ? "" : `${v >= 0 ? "+" : "−"}${fmtNum(Math.abs(v) * 100, 1)}`}
                  </td>
                ))}
                <td className={clsx("num font-semibold", yr >= 0 ? "text-up" : "text-down")}>{fmtPct(yr, 1)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Semi-circular probability gauge with the decision threshold marked. */
export function Gauge({ value, threshold, label, size = 180 }: { value: number | null; threshold?: number | null; label?: ReactNode; size?: number }) {
  const gid = useId().replace(/:/g, "");
  const r = 70;
  const cx = 90;
  const cy = 86;
  const arc = (v: number) => {
    const a = Math.PI * (1 - v);
    return [cx + r * Math.cos(a), cy - r * Math.sin(a)] as const;
  };
  const path = (from: number, to: number) => {
    const [x1, y1] = arc(from);
    const [x2, y2] = arc(to);
    return `M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`;
  };
  const v = value === null ? 0 : Math.max(0, Math.min(1, value));
  const pass = value !== null && threshold != null && threshold <= 1 && value >= threshold;
  const [tx, ty] = threshold != null && threshold <= 1 ? arc(threshold) : [0, 0];
  const [tx2, ty2] = threshold != null && threshold <= 1 ? [cx + (r + 11) * Math.cos(Math.PI * (1 - threshold)), cy - (r + 11) * Math.sin(Math.PI * (1 - threshold))] : [0, 0];
  return (
    <div className="flex flex-col items-center" style={{ width: size }}>
      <svg viewBox="0 0 180 100" width={size} height={size * 0.56} role="img" aria-label={`Olasılık ${value === null ? "yok" : Math.round(v * 100) + "%"}`}>
        <defs>
          <linearGradient id={`g-${gid}`} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="var(--accent)" />
            <stop offset="100%" stopColor="var(--accent-2)" />
          </linearGradient>
        </defs>
        <path d={path(0, 1)} stroke="var(--surface-3)" strokeWidth={12} fill="none" strokeLinecap="round" />
        {value !== null && v > 0.001 && <path d={path(0, v)} stroke={pass ? "var(--up)" : `url(#g-${gid})`} strokeWidth={12} fill="none" strokeLinecap="round" />}
        {threshold != null && threshold <= 1 && <line x1={tx} y1={ty} x2={tx2} y2={ty2} stroke="var(--fg)" strokeWidth={2} strokeLinecap="round" />}
        <text x={cx} y={cy - 12} textAnchor="middle" className="num" fill="var(--fg)" fontSize={26} fontWeight={700}>
          {value === null ? "—" : `%${Math.round(v * 100)}`}
        </text>
      </svg>
      {label && <div className="-mt-1 text-center text-xs text-muted">{label}</div>}
    </div>
  );
}

export function Sparkline({ values, width = 96, height = 28, className }: { values: number[]; width?: number; height?: number; className?: string }) {
  if (values.length < 2) return <div style={{ width, height }} />;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * width},${height - 2 - ((v - min) / span) * (height - 4)}`).join(" ");
  const up = values[values.length - 1] >= values[0];
  return (
    <svg width={width} height={height} className={className} aria-hidden>
      <polyline points={pts} fill="none" stroke={up ? "var(--up)" : "var(--down)"} strokeWidth={1.6} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export function ThresholdCharts({
  curve,
  threshold,
}: {
  curve: { threshold: number; trades: number; win_rate: number | null; expectancy_r: number | null }[];
  threshold: number | null;
}) {
  const data = curve.map((c) => ({ ...c, t: c.threshold }));
  const ref = threshold != null && threshold <= 1 ? threshold : undefined;
  const common = { margin: { top: 8, right: 8, left: 0, bottom: 0 } };
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {[
        { key: "win_rate", title: "Kazanma oranı", fmt: (v: number) => fmtPct(v, 0), color: "var(--up)", type: "line" },
        { key: "expectancy_r", title: "Beklenti (R, maliyet sonrası)", fmt: (v: number) => `${fmtNum(v, 2)}R`, color: "var(--c1)", type: "line" },
        { key: "trades", title: "Sinyal sayısı", fmt: (v: number) => fmtNum(v, 0), color: "var(--c5)", type: "bar" },
      ].map((cfg) => (
        <div key={cfg.key} className="card-inset p-3">
          <div className="mb-1 text-xs font-medium text-fg-2">{cfg.title}</div>
          <ResponsiveContainer width="100%" height={150}>
            {cfg.type === "line" ? (
              <LineChart data={data} {...common}>
                <CartesianGrid stroke="var(--grid)" vertical={false} />
                <XAxis dataKey="t" type="number" domain={["dataMin", "dataMax"]} tickFormatter={(v) => fmtNum(v, 2)} {...axisProps} />
                <YAxis tickFormatter={cfg.fmt} width={52} {...axisProps} />
                {cfg.key === "expectancy_r" && <ReferenceLine y={0} stroke="var(--line-strong)" />}
                {ref !== undefined && <ReferenceLine x={ref} stroke="var(--fg-2)" strokeDasharray="3 3" />}
                <Tooltip
                  content={(p: TipProps) => {
                    const row = p.active ? p.payload?.[0]?.payload : null;
                    if (!row || row[cfg.key] == null) return null;
                    return <TipBox title={`Eşik ${fmtNum(row.t as number, 2)}`} rows={[{ name: cfg.title, value: cfg.fmt(row[cfg.key] as number), color: cfg.color }]} />;
                  }}
                />
                <Line type="monotone" dataKey={cfg.key} stroke={cfg.color} strokeWidth={2} dot={false} connectNulls isAnimationActive={false} />
              </LineChart>
            ) : (
              <BarChart data={data} {...common} barCategoryGap={1}>
                <CartesianGrid stroke="var(--grid)" vertical={false} />
                <XAxis dataKey="t" tickFormatter={(v) => fmtNum(v, 2)} minTickGap={20} {...axisProps} />
                <YAxis width={44} {...axisProps} />
                {ref !== undefined && <ReferenceLine x={ref} stroke="var(--fg-2)" strokeDasharray="3 3" />}
                <Tooltip
                  cursor={{ fill: "var(--surface-3)" }}
                  content={(p: TipProps) => {
                    const row = p.active ? p.payload?.[0]?.payload : null;
                    if (!row) return null;
                    return <TipBox title={`Eşik ${fmtNum(row.t as number, 2)}`} rows={[{ name: "Sinyal", value: fmtNum(row.trades as number, 0), color: cfg.color }]} />;
                  }}
                />
                <Bar dataKey="trades" fill={cfg.color} radius={[3, 3, 0, 0]} isAnimationActive={false} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      ))}
    </div>
  );
}
