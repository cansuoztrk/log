import clsx from "clsx";
import { ArrowDownWideNarrow, CheckCircle2, CircleMinus, Radar, XCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { Gauge } from "../components/charts";
import { ActionBadge, Badge, Card, CardHeader, CoinIcon, Empty, RegimeBadge, Segmented, Skeleton } from "../components/ui";
import { enc } from "../lib/api";
import { base, fmtDuration, fmtNum, fmtPct, fmtPrice, fmtSignedPct } from "../lib/format";
import { useFetch, useLive, useNow } from "../lib/live";
import type { SignalDetail, SignalSummary } from "../lib/types";

export default function Signals() {
  const { state } = useLive();
  const [view, setView] = useState<"cards" | "table">("cards");
  const [sort, setSort] = useState<"prob" | "symbol">("prob");
  const rows = useMemo(() => {
    const s = [...(state?.signals ?? [])];
    return sort === "prob" ? s.sort((a, b) => (b.prob ?? b.confidence) - (a.prob ?? a.confidence)) : s.sort((a, b) => a.symbol.localeCompare(b.symbol));
  }, [state?.signals, sort]);
  if (!state) return <Skeleton className="h-96" />;
  const buys = rows.filter((r) => r.action === "BUY").length;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-fg-2">
            <b className="text-fg">{rows.length}</b> sembol izleniyor · <b className="text-up">{buys}</b> aktif AL sinyali
          </p>
          <p className="text-xs text-muted">Sinyaller her mum kapanışında yeniden hesaplanır. Olasılık, modelin örneklem dışı kalibre edilmiş tahminidir.</p>
        </div>
        <div className="flex gap-2">
          <Segmented
            size="sm"
            value={sort}
            onChange={setSort}
            options={[
              { value: "prob", label: <span className="flex items-center gap-1"><ArrowDownWideNarrow className="h-3.5 w-3.5" /> Olasılık</span> },
              { value: "symbol", label: "A-Z" },
            ]}
          />
          <Segmented
            size="sm"
            value={view}
            onChange={setView}
            options={[
              { value: "cards", label: "Kartlar" },
              { value: "table", label: "Tablo" },
            ]}
          />
        </div>
      </div>
      {!rows.length ? (
        <Card>
          <Empty icon={<Radar className="h-5 w-5" />} title="Sinyaller hesaplanıyor" text="İlk veri çekimi birkaç saniye sürebilir." />
        </Card>
      ) : view === "cards" ? (
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {rows.map((s) => (
            <SignalCard key={s.symbol} s={s} />
          ))}
        </div>
      ) : (
        <SignalTable rows={rows} />
      )}
    </div>
  );
}

function SignalCard({ s }: { s: SignalSummary }) {
  const detail = useFetch<SignalDetail>(`/api/signal?symbol=${enc(s.symbol)}`, 30000, [s.time]);
  const now = useNow(1000);
  const d = detail.data;
  const thr = s.threshold <= 1 ? s.threshold : null;
  const icon = { positive: <CheckCircle2 className="h-3.5 w-3.5 text-up" />, negative: <XCircle className="h-3.5 w-3.5 text-down" />, neutral: <CircleMinus className="h-3.5 w-3.5 text-muted" /> };
  return (
    <Card className={clsx("flex flex-col", s.action === "BUY" && "ring-1 ring-up/40")}>
      <div className="flex items-center justify-between gap-3 px-5 pt-4">
        <a href={`#/piyasa/${s.symbol.replace("/", "-")}`} className="flex items-center gap-3">
          <CoinIcon symbol={s.symbol} size={38} />
          <div>
            <div className="flex items-center gap-2 font-semibold">
              {base(s.symbol)}
              <span className="text-xs font-normal text-muted">/USDT</span>
            </div>
            <div className="num text-sm">
              {fmtPrice(s.price, s.price_digits)} <span className={clsx("text-xs", s.change_24 >= 0 ? "text-up" : "text-down")}>{fmtSignedPct(s.change_24)}</span>
            </div>
          </div>
        </a>
        <div className="flex flex-col items-end gap-1">
          <ActionBadge action={s.action} size="lg" inPosition={s.in_position} />
          {s.in_position && <Badge tone="accent">pozisyonda</Badge>}
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 px-5 pt-3">
        <Gauge value={s.prob} threshold={thr} size={150} label={s.prob != null ? "AI olasılığı" : "kural modu"} />
        <div className="flex-1 space-y-2 text-xs">
          <Row k="Rejim" v={<RegimeBadge regime={s.regime} label={s.regime_label} />} />
          <Row k="Kural skoru" v={<b className={clsx("num", s.rule_score >= 0 ? "text-up" : "text-down")}>{s.rule_score >= 0 ? "+" : ""}{fmtNum(s.rule_score, 2)}</b>} />
          <Row k="Güven" v={<b className="num">{fmtPct(s.confidence, 0)}</b>} />
          <Row k="RSI" v={<b className="num">{fmtNum(s.rsi, 1)}</b>} />
          <Row k="Sonraki mum" v={<span className="num">{s.next_close > now ? fmtDuration(s.next_close - now) : "—"}</span>} />
        </div>
      </div>
      <div className="mt-3 flex-1 border-t border-line px-5 py-3">
        {d ? (
          <ul className="space-y-1.5">
            {d.reasons.slice(0, 5).map((r, i) => (
              <li key={i} className="flex gap-2 text-xs leading-snug text-fg-2">
                <span className="mt-px shrink-0">{icon[r.impact]}</span>
                {r.text}
              </li>
            ))}
          </ul>
        ) : (
          <div className="space-y-2">
            <Skeleton className="h-3 w-4/5" />
            <Skeleton className="h-3 w-3/5" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        )}
      </div>
      {d && (
        <div className="grid grid-cols-6 gap-1 border-t border-line px-5 py-3" aria-label="Uzman oyları">
          {d.experts.map((e) => (
            <div key={e.key} title={`${e.label}: ${e.score.toFixed(2)}`} className="flex flex-col items-center gap-1">
              <div className="relative h-10 w-2.5 rounded-full bg-surface-3">
                <span className="absolute top-1/2 left-0 h-px w-full bg-line-strong" />
                <div
                  className={clsx("absolute left-0 w-full rounded-full", e.score >= 0 ? "bg-up" : "bg-down")}
                  style={e.score >= 0 ? { bottom: "50%", height: `${e.score * 50}%` } : { top: "50%", height: `${-e.score * 50}%` }}
                />
              </div>
              <span className="w-full truncate text-center text-[0.6rem] text-muted">{e.label.split(" ")[0]}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted">{k}</span>
      {v}
    </div>
  );
}

function SignalTable({ rows }: { rows: SignalSummary[] }) {
  return (
    <Card>
      <CardHeader title="Sinyal tablosu" icon={<Radar className="h-4 w-4" />} />
      <div className="overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th>Sembol</th>
              <th className="text-right">Fiyat</th>
              <th className="text-right">24 mum</th>
              <th>Rejim</th>
              <th className="text-right">RSI</th>
              <th className="text-right">Kural</th>
              <th>AI olasılığı</th>
              <th>Karar</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => {
              const thr = s.threshold <= 1 ? s.threshold : null;
              return (
                <tr key={s.symbol} className="cursor-pointer" onClick={() => (location.hash = `#/piyasa/${s.symbol.replace("/", "-")}`)}>
                  <td>
                    <div className="flex items-center gap-2">
                      <CoinIcon symbol={s.symbol} size={24} />
                      <b>{base(s.symbol)}</b>
                    </div>
                  </td>
                  <td className="num text-right">{fmtPrice(s.price, s.price_digits)}</td>
                  <td className={clsx("num text-right", s.change_24 >= 0 ? "text-up" : "text-down")}>{fmtSignedPct(s.change_24)}</td>
                  <td>
                    <RegimeBadge regime={s.regime} label={s.regime_label} />
                  </td>
                  <td className="num text-right">{fmtNum(s.rsi, 1)}</td>
                  <td className={clsx("num text-right", s.rule_score >= 0 ? "text-up" : "text-down")}>
                    {s.rule_score >= 0 ? "+" : ""}
                    {fmtNum(s.rule_score, 2)}
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="relative h-1.5 w-28 overflow-hidden rounded-full bg-surface-3">
                        <div className={clsx("h-full rounded-full", s.prob != null && thr != null && s.prob >= thr ? "bg-up" : "ai-gradient")} style={{ width: `${(s.prob ?? 0) * 100}%` }} />
                        {thr != null && <span className="absolute top-0 h-full w-0.5 bg-fg" style={{ left: `${thr * 100}%` }} />}
                      </div>
                      <span className="num text-xs">{s.prob != null ? fmtPct(s.prob, 0) : "—"}</span>
                    </div>
                  </td>
                  <td>
                    <ActionBadge action={s.action} inPosition={s.in_position} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
