import clsx from "clsx";
import { AlertTriangle, ArrowUpRight, Bell, BrainCircuit, CheckCircle2, CircleDot, Info, ShieldAlert, Sparkles, X, XCircle } from "lucide-react";
import { useState } from "react";
import { post } from "../lib/api";
import { base, fmtAgo, fmtDateTime, fmtDuration, fmtPct, fmtPrice, fmtQty, fmtR, fmtSignedPct, fmtTime, fmtUsd } from "../lib/format";
import { useLive, useNow } from "../lib/live";
import type { BotEvent, Position, SignalSummary, Snapshot, Trade } from "../lib/types";
import { toast } from "./Toasts";
import { ActionBadge, Badge, Button, CoinIcon, Empty, Modal, Pnl, REGIME_TONE } from "./ui";

/** Where price sits between stop and TP2, as a small progress track. */
function LevelTrack({ p }: { p: Position }) {
  const lo = Math.min(p.stop, p.initial_stop);
  const hi = p.tp2;
  const pos = (v: number) => `${Math.max(0, Math.min(100, ((v - lo) / (hi - lo || 1)) * 100))}%`;
  return (
    <div className="relative mt-1.5 h-1.5 w-36 rounded-full bg-surface-3">
      <div className="absolute inset-y-0 left-0 rounded-l-full bg-down/30" style={{ width: pos(p.entry_price) }} />
      <div className="absolute inset-y-0 rounded-r-full bg-up/30" style={{ left: pos(p.entry_price), right: 0 }} />
      <span className="absolute top-1/2 h-3 w-0.5 -translate-y-1/2 bg-fg-2" style={{ left: pos(p.tp1) }} title="TP1" />
      <span
        className={clsx("absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-surface", p.price >= p.entry_price ? "bg-up" : "bg-down")}
        style={{ left: pos(p.price) }}
      />
    </div>
  );
}

export function PositionsTable({ positions, compact }: { positions: Position[]; compact?: boolean }) {
  const { setState } = useLive();
  const [closing, setClosing] = useState<Position | null>(null);
  const [busy, setBusy] = useState(false);
  const now = useNow(10000);
  if (!positions.length)
    return <Empty icon={<CircleDot className="h-5 w-5" />} title="Açık pozisyon yok" text="Bot AI filtresinden geçen yüksek olasılıklı bir fırsat bulduğunda burada görünecek." />;
  const close = async () => {
    if (!closing) return;
    setBusy(true);
    try {
      setState(await post<Snapshot>("/api/positions/close", { symbol: closing.symbol }));
      toast("success", "Pozisyon kapatıldı", closing.symbol);
      setClosing(null);
    } catch (e) {
      toast("error", "Kapatılamadı", (e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <div className="overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th>Varlık</th>
              <th className="text-right">Giriş / Şimdi</th>
              {!compact && <th className="text-right">Miktar</th>}
              <th>Stop · Hedefler</th>
              <th className="text-right">K/Z</th>
              {!compact && <th className="text-right">Süre</th>}
              <th />
            </tr>
          </thead>
          <tbody>
            {positions.map((p) => (
              <tr key={p.id}>
                <td>
                  <a href={`#/piyasa/${p.symbol.replace("/", "-")}`} className="flex items-center gap-2.5">
                    <CoinIcon symbol={p.symbol} size={28} />
                    <div>
                      <div className="font-semibold">{base(p.symbol)}</div>
                      <div className="flex gap-1 text-[0.68rem] text-muted">
                        {p.tp1_hit ? <span className="text-up">TP1 ✓ · risk sıfır</span> : <span>güven %{Math.round(p.confidence * 100)}</span>}
                      </div>
                    </div>
                  </a>
                </td>
                <td className="num text-right">
                  <div className="text-fg-2">{fmtPrice(p.entry_price, p.price_digits)}</div>
                  <div className="font-medium">{fmtPrice(p.price, p.price_digits)}</div>
                </td>
                {!compact && (
                  <td className="num text-right">
                    <div>{fmtQty(p.qty)}</div>
                    <div className="text-[0.7rem] text-muted">{fmtUsd(p.value)}</div>
                  </td>
                )}
                <td>
                  <div className="num flex gap-2 text-[0.72rem]">
                    <span className="text-down">SL {fmtPrice(p.stop, p.price_digits)}</span>
                    <span className="text-up">TP {fmtPrice(p.tp1_hit ? p.tp2 : p.tp1, p.price_digits)}</span>
                  </div>
                  <LevelTrack p={p} />
                </td>
                <td className="text-right">
                  <Pnl value={p.pnl} />
                  <div className={clsx("num text-[0.7rem]", p.r_multiple >= 0 ? "text-up" : "text-down")}>
                    {fmtSignedPct(p.pnl_pct)} · {fmtR(p.r_multiple)}
                  </div>
                </td>
                {!compact && <td className="num text-right text-fg-2">{fmtDuration(now - p.entry_time)}</td>}
                <td className="text-right">
                  <Button size="sm" variant="ghost" onClick={() => setClosing(p)} aria-label={`${p.symbol} kapat`}>
                    <X className="h-3.5 w-3.5" /> Kapat
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Modal
        open={!!closing}
        onClose={() => setClosing(null)}
        title="Pozisyonu kapat"
        footer={
          <>
            <Button variant="ghost" onClick={() => setClosing(null)}>
              Vazgeç
            </Button>
            <Button variant="danger" loading={busy} onClick={close}>
              Piyasa fiyatından sat
            </Button>
          </>
        }
      >
        {closing && (
          <p className="text-sm text-fg-2">
            <b className="text-fg">{closing.symbol}</b> pozisyonunun tamamı ({fmtQty(closing.qty)}) piyasa fiyatından satılacak. Güncel K/Z: <Pnl value={closing.pnl} />
          </p>
        )}
      </Modal>
    </>
  );
}

export function TradesTable({ trades, limit }: { trades: Trade[]; limit?: number }) {
  const rows = limit ? trades.slice(0, limit) : trades;
  if (!rows.length) return <Empty icon={<ArrowUpRight className="h-5 w-5" />} title="Henüz kapanan işlem yok" text="Bot işlem yaptıkça sonuçlar ve istatistikler burada birikir." />;
  return (
    <div className="overflow-x-auto">
      <table className="table-base">
        <thead>
          <tr>
            <th>Varlık</th>
            <th>Kapanış</th>
            <th className="text-right">Giriş → Çıkış</th>
            <th>Çıkış nedeni</th>
            <th className="text-right">AI</th>
            <th className="text-right">K/Z</th>
            <th className="text-right">R</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((t) => (
            <tr key={t.id}>
              <td>
                <div className="flex items-center gap-2">
                  <CoinIcon symbol={t.symbol} size={22} />
                  <span className="font-medium">{base(t.symbol)}</span>
                </div>
              </td>
              <td className="text-fg-2">
                <div>{fmtDateTime(t.exit_time)}</div>
                <div className="text-[0.68rem] text-muted">{fmtDuration(t.exit_time - t.entry_time)} sürdü</div>
              </td>
              <td className="num text-right text-fg-2">
                {fmtPrice(t.entry_price)} → <span className="text-fg">{fmtPrice(t.exit_price)}</span>
              </td>
              <td>
                <Badge tone={t.pnl > 0 ? "up" : t.exit_reason === "manual" ? "neutral" : "down"}>{t.exit_label}</Badge>
              </td>
              <td className="num text-right text-fg-2">{t.prob != null ? fmtPct(t.prob, 0) : "kural"}</td>
              <td className="text-right">
                <Pnl value={t.pnl} />
              </td>
              <td className={clsx("num text-right font-medium", t.r_multiple >= 0 ? "text-up" : "text-down")}>{fmtR(t.r_multiple)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const EV_ICON: Record<BotEvent["level"], React.ReactNode> = {
  info: <Info className="h-3.5 w-3.5 text-info" />,
  success: <CheckCircle2 className="h-3.5 w-3.5 text-up" />,
  warning: <AlertTriangle className="h-3.5 w-3.5 text-warn" />,
  error: <XCircle className="h-3.5 w-3.5 text-down" />,
  critical: <ShieldAlert className="h-3.5 w-3.5 text-down" />,
  signal: <Sparkles className="h-3.5 w-3.5 text-accent" />,
};

export function EventFeed({ events, limit = 12, filter }: { events: BotEvent[]; limit?: number; filter?: (e: BotEvent) => boolean }) {
  useNow(15000);
  const rows = (filter ? events.filter(filter) : events).slice(0, limit);
  if (!rows.length) return <Empty icon={<Bell className="h-5 w-5" />} title="Henüz olay yok" />;
  return (
    <ol className="relative space-y-0.5">
      {rows.map((e) => (
        <li key={e.id} className="flex gap-3 rounded-lg px-2 py-2 hover:bg-surface-2">
          <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-surface-2 ring-1 ring-line">
            {e.kind === "model" ? <BrainCircuit className="h-3.5 w-3.5 text-accent" /> : EV_ICON[e.level]}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[0.8rem] leading-snug break-words">{e.message}</p>
            <p className="mt-0.5 text-[0.68rem] text-muted" title={fmtDateTime(e.ts)}>
              {fmtTime(e.ts)} · {fmtAgo(e.ts)}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function SignalRow({ s }: { s: SignalSummary }) {
  const now = useNow(30000);
  const pct = s.prob;
  const thr = s.threshold <= 1 ? s.threshold : null;
  return (
    <a href={`#/piyasa/${s.symbol.replace("/", "-")}`} className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition hover:bg-surface-2">
      <CoinIcon symbol={s.symbol} size={32} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold">{base(s.symbol)}</span>
          <span className={clsx("num text-xs", s.change_24 >= 0 ? "text-up" : "text-down")}>{fmtSignedPct(s.change_24)}</span>
          {s.in_position && <Badge tone="accent">pozisyonda</Badge>}
        </div>
        <div className="mt-1 flex items-center gap-2">
          <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-surface-3">
            <div className={clsx("h-full rounded-full", pct != null && thr != null && pct >= thr ? "bg-up" : "ai-gradient")} style={{ width: `${(pct ?? s.confidence) * 100}%` }} />
            {thr != null && <span className="absolute top-0 h-full w-0.5 bg-fg" style={{ left: `${thr * 100}%` }} />}
          </div>
          <span className="num w-9 text-right text-xs font-medium">{fmtPct(pct ?? s.confidence, 0)}</span>
        </div>
      </div>
      <div className="flex flex-col items-end gap-1">
        <ActionBadge action={s.action} inPosition={s.in_position} />
        <span className="text-[0.65rem] text-muted">{s.next_close > now ? `${fmtDuration(s.next_close - now)} sonra` : "hesaplanıyor"}</span>
      </div>
    </a>
  );
}

export function RegimeDot({ regime }: { regime: SignalSummary["regime"] }) {
  const tone = REGIME_TONE[regime];
  const color = { up: "bg-up", down: "bg-down", info: "bg-info", warn: "bg-warn", neutral: "bg-muted", accent: "bg-accent" }[tone];
  return <span className={clsx("inline-block h-2 w-2 rounded-full", color)} />;
}
