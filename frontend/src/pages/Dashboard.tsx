import clsx from "clsx";
import { Activity, BrainCircuit, CircleDollarSign, Gauge as GaugeIcon, Percent, Scale, ShieldCheck, Target, TrendingUp, Wallet, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { EquityChart } from "../components/charts";
import { EventFeed, PositionsTable, SignalRow, TradesTable } from "../components/domain";
import { Badge, Card, CardHeader, Empty, Progress, Segmented, Skeleton, Stat } from "../components/ui";
import { fmtDuration, fmtNum, fmtPct, fmtR, fmtSigned, fmtSignedPct, fmtUsd } from "../lib/format";
import { useFetch, useLive, useNow } from "../lib/live";
import type { Performance, Snapshot, Trade } from "../lib/types";

export const QUALITY: Record<string, { label: string; tone: "up" | "warn" | "down" }> = {
  strong: { label: "Güçlü avantaj", tone: "up" },
  weak: { label: "Zayıf avantaj", tone: "warn" },
  none: { label: "Avantaj yok", tone: "down" },
};

export default function Dashboard() {
  const { state, events } = useLive();
  const [range, setRange] = useState<"7" | "30" | "0">("30");
  const perf = useFetch<Performance>(`/api/performance?days=${range}`, 60000, [range]);
  const trades = useFetch<{ trades: Trade[] }>("/api/trades?limit=8", 0);
  const tradeCount = state?.stats.trades ?? 0;
  useEffect(() => {
    trades.reload();
    perf.reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tradeCount]);

  if (!state) return <DashboardSkeleton />;
  const a = state.account;
  const s = state.stats;
  const equityData = [...(perf.data?.equity ?? []).map((e) => ({ time: e.time, equity: e.equity })), { time: state.server_time, equity: a.equity }];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Stat label="Toplam varlık" icon={<Wallet className="h-4 w-4" />} value={fmtUsd(a.equity)} sub={`Nakit ${fmtUsd(a.cash)}`} />
        <Stat
          label="Bugün"
          icon={<Activity className="h-4 w-4" />}
          value={fmtSigned(a.day_pnl, 2, " $")}
          tone={a.day_pnl > 0 ? "up" : a.day_pnl < 0 ? "down" : "neutral"}
          sub={fmtSignedPct(a.day_pnl_pct)}
        />
        <Stat
          label="Toplam K/Z"
          icon={<TrendingUp className="h-4 w-4" />}
          value={fmtSigned(a.total_pnl, 2, " $")}
          tone={a.total_pnl > 0 ? "up" : a.total_pnl < 0 ? "down" : "neutral"}
          sub={`${fmtSignedPct(a.total_pnl_pct)} · açık ${fmtSigned(a.unrealized, 2, " $")}`}
        />
        <Stat
          label="Başarı oranı"
          icon={<Target className="h-4 w-4" />}
          hint="Kârla kapanan işlemlerin oranı. TP1'e ulaşıp stopu başabaşa çekilen işlemler de kârlı sayılır."
          value={s.trades ? fmtPct(s.win_rate, 1) : "—"}
          sub={s.trades ? `${s.wins} kazanç · ${s.losses} kayıp` : "Henüz işlem yok"}
        />
        <Stat
          label="Kâr faktörü"
          icon={<Scale className="h-4 w-4" />}
          hint="Toplam kazanç / toplam kayıp. 1'in üzeri kârlı sistem demektir; 1,5+ iyi kabul edilir."
          value={s.trades && s.profit_factor != null ? fmtNum(s.profit_factor, 2) : s.trades ? "∞" : "—"}
          sub={s.trades ? `Beklenti ${fmtR(s.expectancy_r)} / işlem` : "—"}
        />
        <Stat
          label="Zirveden düşüş"
          icon={<ShieldCheck className="h-4 w-4" />}
          hint="Hesabın ulaştığı en yüksek değerden şu anki uzaklığı. Limit aşılırsa bot kendini durdurur."
          value={fmtSignedPct(a.drawdown_pct)}
          tone={a.drawdown_pct < -5 ? "down" : "neutral"}
          sub={`Zirve ${fmtUsd(a.peak, 0)}`}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            title="Sermaye eğrisi"
            subtitle={state.status.mode === "live" ? "Canlı hesap" : "Paper trading hesabı"}
            icon={<CircleDollarSign className="h-4 w-4" />}
            right={
              <Segmented
                size="sm"
                value={range}
                onChange={setRange}
                options={[
                  { value: "7", label: "7G" },
                  { value: "30", label: "30G" },
                  { value: "0", label: "Tümü" },
                ]}
              />
            }
          />
          <div className="px-2 pb-3">
            {equityData.length > 2 ? (
              <EquityChart data={equityData} height={280} />
            ) : (
              <Empty icon={<Activity className="h-5 w-5" />} title="Eğri oluşuyor" text="Bakiye her 5 dakikada kaydedilir. Bot çalıştıkça sermaye eğrisi burada belirir." />
            )}
          </div>
        </Card>
        <AiEngineCard state={state} />
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Açık pozisyonlar" subtitle={`${state.positions.length} pozisyon · piyasadaki pay %${fmtNum(a.exposure_pct, 1)}`} icon={<GaugeIcon className="h-4 w-4" />} />
          <PositionsTable positions={state.positions} compact />
        </Card>
        <Card>
          <CardHeader title="AI sinyalleri" subtitle="Son kapanan mum · eşik çizgisi beyaz" icon={<Zap className="h-4 w-4" />} right={<a href="#/sinyaller" className="text-xs text-accent hover:underline">Tümü</a>} />
          <div className="px-3 pb-3">
            {state.signals.length ? state.signals.map((sig) => <SignalRow key={sig.symbol} s={sig} />) : <Empty title="Sinyaller hesaplanıyor…" />}
          </div>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Son işlemler" icon={<Percent className="h-4 w-4" />} right={<a href="#/islemler" className="text-xs text-accent hover:underline">Tüm geçmiş</a>} />
          <TradesTable trades={trades.data?.trades ?? []} limit={8} />
        </Card>
        <Card>
          <CardHeader title="Canlı olay akışı" icon={<Activity className="h-4 w-4" />} right={<a href="#/gunluk" className="text-xs text-accent hover:underline">Günlük</a>} />
          <div className="max-h-[420px] overflow-y-auto px-3 pb-3">
            <EventFeed events={events} limit={25} />
          </div>
        </Card>
      </div>
    </div>
  );
}

function AiEngineCard({ state }: { state: Snapshot }) {
  const m = state.model;
  const now = useNow(1000);
  const next = Math.min(...state.signals.map((s) => s.next_close).filter((t) => t > now), Infinity);
  const sm = m.summary;
  const q = m.quality ? QUALITY[m.quality] : null;
  const buys = state.signals.filter((s) => s.action === "BUY").length;
  return (
    <Card className="relative overflow-hidden">
      <div className="ai-gradient pointer-events-none absolute -top-24 -right-24 h-56 w-56 rounded-full opacity-20 blur-3xl" />
      <CardHeader
        title={<span className="ai-text">AI motoru</span>}
        subtitle={state.status.strategy_mode === "ai" ? "Gradient boosting + 6 kural uzmanı" : "Kural tabanlı mod (AI kapalı)"}
        icon={<BrainCircuit className="h-4 w-4 text-accent" />}
        right={q && <Badge tone={q.tone}>{q.label}</Badge>}
      />
      <div className="space-y-4 px-5 pb-5">
        {m.training.state === "running" ? (
          <div className="card-inset p-3">
            <div className="mb-2 flex justify-between text-xs">
              <span className="text-fg-2">{m.training.message}</span>
              <span className="num text-muted">{Math.round(m.training.progress * 100)}%</span>
            </div>
            <Progress value={m.training.progress} />
          </div>
        ) : !m.ready ? (
          <p className="text-sm text-fg-2">Model henüz eğitilmedi. İlk eğitim otomatik başlar; Model sayfasından elle de başlatabilirsiniz.</p>
        ) : null}

        <div className="grid grid-cols-2 gap-3">
          <Metric label="OOS başarı oranı" value={sm?.pooled_win_rate != null ? fmtPct(sm.pooled_win_rate, 1) : "—"} hint="örneklem dışı" />
          <Metric label="Beklenti / sinyal" value={sm?.pooled_expectancy_r != null ? fmtR(sm.pooled_expectancy_r) : "—"} hint="maliyet sonrası" />
          <Metric label="Karar eşiği" value={m.threshold != null ? (m.threshold > 1 ? "kapalı" : fmtPct(m.threshold, 0)) : "—"} hint="kalibre olasılık" />
          <Metric label="Aktif AL sinyali" value={String(buys)} hint={`${state.signals.length} sembol izleniyor`} />
        </div>

        {m.stale.length > 0 && (
          <div className="rounded-lg bg-warn-soft px-3 py-2 text-xs text-warn ring-1 ring-warn/20">
            {m.stale[0]} — modeli yeniden eğitmeniz önerilir.
          </div>
        )}
        {m.ready && m.has_edge === false && (
          <div className="rounded-lg bg-down-soft px-3 py-2 text-xs text-down ring-1 ring-down/20">
            Model doğrulamada maliyet sonrası pozitif beklenti bulamadı; sermayeyi korumak için AI işlem açmıyor.
          </div>
        )}

        <div className="flex items-center justify-between rounded-xl bg-surface-2 px-3.5 py-2.5 ring-1 ring-line">
          <span className="text-xs text-muted">Sonraki mum kapanışı</span>
          <span className="num text-sm font-semibold">{Number.isFinite(next) ? fmtDuration(next - now) : "—"}</span>
        </div>
        <div className={clsx("flex items-center gap-2 text-xs", state.status.running ? "text-up" : "text-muted")}>
          <span className={clsx("h-2 w-2 rounded-full", state.status.running ? "live-dot bg-up" : "bg-muted")} />
          {state.status.running ? "Otomatik işlem açık — sinyaller emre dönüşür" : "İzleme modu — sinyaller hesaplanır, emir verilmez"}
        </div>
      </div>
    </Card>
  );
}

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="card-inset px-3 py-2.5">
      <div className="text-[0.7rem] text-muted">{label}</div>
      <div className="num mt-0.5 text-lg font-semibold">{value}</div>
      {hint && <div className="text-[0.65rem] text-muted">{hint}</div>}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-[92px]" />
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-3">
        <Skeleton className="h-[340px] xl:col-span-2" />
        <Skeleton className="h-[340px]" />
      </div>
    </div>
  );
}
