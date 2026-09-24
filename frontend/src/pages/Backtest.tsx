import clsx from "clsx";
import { AlertTriangle, BarChart3, CalendarRange, ChevronDown, FlaskConical, History, LineChart, LogOut, PieChart, Play, Shapes, TrendingDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { BarList, DrawdownChart, EquityChart, LegendRow, MonthlyHeatmap, RHistogram } from "../components/charts";
import { TradesTable } from "../components/domain";
import { toast } from "../components/Toasts";
import { Badge, Button, Card, CardHeader, Empty, Field, NumberInput, Progress, Segmented, Stat } from "../components/ui";
import { api, post } from "../lib/api";
import { base, fmtDate, fmtDateTime, fmtNum, fmtPct, fmtR, fmtSigned } from "../lib/format";
import { useFetch, useLive } from "../lib/live";
import type { BacktestJob, BacktestListItem, BacktestResult } from "../lib/types";
import { QUALITY } from "./Dashboard";
import { StatsGrid } from "./Trades";

type Mode = "oos" | "current" | "rules";
const MODE_TEXT: Record<Mode, string> = {
  oos: "Test döneminden ÖNCEKİ verilerle yeni bir model eğitilir, sonra hiç görmediği dönemde test edilir. En gerçekçi sonuç.",
  current: "Şu anki model kullanılır. Model test dönemini eğitimde gördüyse sonuçlar iyimser olur.",
  rules: "AI kapalı; yalnızca 6 kural uzmanının ağırlıklı oyu. AI'ın kattığı değeri görmek için karşılaştırın.",
};

export default function Backtest() {
  const { state } = useLive();
  const cfgSymbols = state?.signals.map((s) => s.symbol) ?? [];
  const [symbols, setSymbols] = useState<string[]>([]);
  const [timeframe, setTimeframe] = useState<string>("");
  const [days, setDays] = useState(180);
  const [mode, setMode] = useState<Mode>("oos");
  const [balance, setBalance] = useState(10000);
  const [adv, setAdv] = useState(false);
  const [ov, setOv] = useState<Record<string, number>>({});
  const [job, setJob] = useState<BacktestJob | null>(null);
  const [result, setResult] = useState<BacktestJob | null>(null);
  const list = useFetch<{ backtests: BacktestListItem[] }>("/api/backtests");
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!symbols.length && cfgSymbols.length) setSymbols(cfgSymbols);
    if (!timeframe && state) setTimeframe(state.status.timeframe);
  }, [cfgSymbols, symbols.length, timeframe, state]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const poll = (id: string) => {
    timer.current = window.setTimeout(async () => {
      try {
        const j = await api<BacktestJob>(`/api/backtest/${id}`);
        setJob(j);
        if (j.state === "running") poll(id);
        else if (j.state === "done") {
          setResult(j);
          list.reload();
          toast("success", "Backtest tamamlandı");
        } else toast("error", "Backtest başarısız", j.message);
      } catch (e) {
        toast("error", "Backtest durumu alınamadı", (e as Error).message);
      }
    }, 1200);
  };

  const run = async () => {
    try {
      const j = await post<BacktestJob>("/api/backtest", { symbols, timeframe, days, ai_mode: mode, initial_balance: balance, overrides: adv ? ov : {} });
      setJob(j);
      poll(j.id);
    } catch (e) {
      toast("error", "Başlatılamadı", (e as Error).message);
    }
  };

  const load = async (id: string) => {
    try {
      const j = await api<BacktestJob>(`/api/backtest/${id}`);
      setResult(j);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      toast("error", "Yüklenemedi", (e as Error).message);
    }
  };

  const running = job?.state === "running";
  return (
    <div className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-[400px_minmax(0,1fr)]">
        <div className="space-y-5">
          <Card>
            <CardHeader title="Test parametreleri" subtitle="Canlı botla birebir aynı karar ve çıkış mantığı" icon={<FlaskConical className="h-4 w-4" />} />
            <div className="space-y-4 px-5 pb-5">
              <div>
                <span className="label">Semboller</span>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {cfgSymbols.map((s) => {
                    const on = symbols.includes(s);
                    return (
                      <button
                        key={s}
                        onClick={() => setSymbols(on ? symbols.filter((x) => x !== s) : [...symbols, s])}
                        className={clsx("rounded-lg px-2.5 py-1 text-xs font-medium ring-1", on ? "bg-accent-soft text-accent ring-accent/30" : "text-muted ring-line")}
                      >
                        {base(s)}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Zaman dilimi">
                  <select className="input" value={timeframe} onChange={(e) => setTimeframe(e.target.value)}>
                    {["15m", "30m", "1h", "4h", "1d"].map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Test süresi">
                  <select className="input" value={days} onChange={(e) => setDays(Number(e.target.value))}>
                    {[30, 60, 90, 180, 365, 730].map((d) => (
                      <option key={d} value={d}>
                        {d} gün
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <div>
                <span className="label">Strateji</span>
                <div className="mt-1.5">
                  <Segmented
                    size="sm"
                    value={mode}
                    onChange={setMode}
                    options={[
                      { value: "oos", label: "AI (örneklem dışı)" },
                      { value: "current", label: "Mevcut model" },
                      { value: "rules", label: "Sadece kurallar" },
                    ]}
                  />
                </div>
                <p className="mt-1.5 text-[0.7rem] leading-snug text-muted">{MODE_TEXT[mode]}</p>
              </div>
              <Field label="Başlangıç bakiyesi" suffix="USDT">
                <NumberInput value={balance} onChange={setBalance} step={100} />
              </Field>
              <button onClick={() => setAdv(!adv)} className="flex items-center gap-1 text-xs font-medium text-fg-2 hover:text-fg">
                <ChevronDown className={clsx("h-3.5 w-3.5 transition", adv && "rotate-180")} /> Gelişmiş: parametreleri bu test için değiştir
              </button>
              {adv && (
                <div className="grid grid-cols-2 gap-3">
                  {(
                    [
                      ["risk_per_trade_pct", "İşlem riski %"],
                      ["sl_atr_mult", "Stop (ATR ×)"],
                      ["tp1_r", "TP1 (R)"],
                      ["tp2_r", "TP2 (R)"],
                      ["ai_threshold", "AI eşiği (0=oto)"],
                      ["max_open_positions", "Maks. pozisyon"],
                    ] as const
                  ).map(([k, label]) => (
                    <Field key={k} label={label}>
                      <input
                        className="input num"
                        placeholder="ayarlardaki"
                        value={ov[k] ?? ""}
                        onChange={(e) => {
                          const v = e.target.value.replace(",", ".");
                          const next = { ...ov };
                          if (v === "" || !Number.isFinite(Number(v))) delete next[k];
                          else next[k] = Number(v);
                          setOv(next);
                        }}
                      />
                    </Field>
                  ))}
                </div>
              )}
              <Button variant="ai" size="lg" className="w-full" loading={running} disabled={!symbols.length} onClick={run} icon={<Play className="h-4 w-4 fill-current" />}>
                Backtest'i çalıştır
              </Button>
              {running && job && (
                <div className="space-y-1.5">
                  <Progress value={job.progress} />
                  <p className="text-xs text-muted">{job.message}</p>
                </div>
              )}
            </div>
          </Card>
          <Card>
            <CardHeader title="Önceki testler" icon={<History className="h-4 w-4" />} />
            <div className="max-h-[420px] overflow-y-auto px-3 pb-3">
              {list.data?.backtests.length ? (
                list.data.backtests.map((b) => (
                  <button key={b.id} onClick={() => load(b.id)} className={clsx("flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-surface-2", result?.id === b.id && "bg-surface-2 ring-1 ring-line")}>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">
                        {b.params.timeframe} · {b.params.days} gün · {b.params.ai_mode === "oos" ? "AI" : b.params.ai_mode === "rules" ? "Kurallar" : "Mevcut model"}
                      </div>
                      <div className="truncate text-[0.7rem] text-muted">
                        {fmtDateTime(b.created)} · {b.params.symbols.map(base).join(", ")}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={clsx("num text-sm font-semibold", (b.stats.total_return ?? 0) >= 0 ? "text-up" : "text-down")}>{fmtPct(b.stats.total_return ?? 0, 1)}</div>
                      <div className="num text-[0.7rem] text-muted">{b.stats.trades} işlem · %{fmtNum((b.stats.win_rate ?? 0) * 100, 0)}</div>
                    </div>
                  </button>
                ))
              ) : (
                <p className="px-2 py-4 text-xs text-muted">Henüz test yok.</p>
              )}
            </div>
          </Card>
        </div>

        <div className="min-w-0 space-y-5">
          {result?.result ? (
            <Results job={result} />
          ) : (
            <Card>
              <Empty
                icon={<LineChart className="h-5 w-5" />}
                title="Stratejiyi geçmiş verilerle test edin"
                text="Backtest, botun tüm kurallarını (AI filtresi, ATR stopları, kısmi kâr alma, takip eden stop, komisyon ve kayma) geçmiş mumlar üzerinde çalıştırır. Sinyal bir mumun kapanışında oluşur, işlem bir sonraki mumun açılışında yapılır."
              />
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function Results({ job }: { job: BacktestJob }) {
  const r = job.result as BacktestResult;
  const s = r.stats;
  const beat = (s.total_return ?? 0) - (s.benchmark_return ?? 0);
  const q = r.model?.quality ? QUALITY[r.model.quality] : null;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
        <Badge tone="accent">{job.params?.timeframe}</Badge>
        <span>
          {fmtDate(r.start)} – {fmtDate(r.end)}
        </span>
        <span>· {job.params?.symbols.map(base).join(", ")}</span>
        {r.data_source === "demo" && <Badge tone="warn">simülasyon verisi</Badge>}
        {q && <Badge tone={q.tone}>Model: {q.label}</Badge>}
      </div>
      {r.warning && (
        <div className="flex gap-2 rounded-xl bg-warn-soft px-4 py-3 text-xs text-warn ring-1 ring-warn/25">
          <AlertTriangle className="h-4 w-4 shrink-0" /> {r.warning}
        </div>
      )}
      {r.model && !r.model.has_edge && (
        <div className="flex gap-2 rounded-xl bg-down-soft px-4 py-3 text-xs text-down ring-1 ring-down/25">
          <AlertTriangle className="h-4 w-4 shrink-0" /> Test öncesi verilerle eğitilen model doğrulamada avantaj bulamadığı için AI işlem açmadı. Bu, sermayeyi korumak için tasarlanmış bir davranıştır.
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 2xl:grid-cols-6">
        <Stat label="Toplam getiri" value={fmtPct(s.total_return ?? 0, 2)} tone={(s.total_return ?? 0) >= 0 ? "up" : "down"} sub={`Al & tut: ${fmtPct(s.benchmark_return ?? 0, 1)}`} />
        <Stat label="Al & tut'a göre" value={`${beat >= 0 ? "+" : "−"}${fmtNum(Math.abs(beat) * 100, 1)} puan`} tone={beat >= 0 ? "up" : "down"} sub="eşit ağırlıklı sepet" />
        <Stat label="Maks. düşüş" value={fmtPct(s.max_drawdown ?? 0, 2)} tone="down" sub={`Al & tut: ${fmtPct(s.benchmark_max_drawdown ?? 0, 1)}`} />
        <Stat label="Sharpe" value={s.sharpe != null ? fmtNum(s.sharpe, 2) : "—"} hint="Yıllıklandırılmış risk-ayarlı getiri. 1 üzeri iyi, 2 üzeri çok iyi." sub={`Sortino ${s.sortino != null ? fmtNum(s.sortino, 2) : "—"}`} />
        <Stat label="Yıllık getiri (CAGR)" value={s.cagr != null ? fmtPct(s.cagr, 1) : "—"} sub={`Calmar ${s.calmar != null ? fmtNum(s.calmar, 2) : "—"}`} />
        <Stat label="Piyasada kalma" value={fmtPct(s.exposure ?? 0, 0)} hint="Sermayenin ortalama ne kadarının pozisyonda olduğu" sub={`${s.signals} sinyal · ${s.kill_switch_events} acil durdurma`} />
      </div>
      {s.trades > 0 && <StatsGrid s={s} narrow />}

      <Card>
        <CardHeader title="Sermaye eğrisi" subtitle="Bot vs eşit ağırlıklı al & tut" icon={<BarChart3 className="h-4 w-4" />} right={<LegendRow items={[{ label: "Bot", color: (s.total_return ?? 0) >= 0 ? "var(--up)" : "var(--down)" }, { label: "Al & tut", color: "var(--muted)", dashed: true }]} />} />
        <div className="px-2 pb-2">
          <EquityChart data={r.equity} benchmark height={300} />
        </div>
        <div className="border-t border-line px-2 pt-3 pb-2">
          <div className="flex items-center gap-2 px-3 pb-1 text-xs font-medium text-fg-2">
            <TrendingDown className="h-3.5 w-3.5 text-down" /> Zirveden düşüş
          </div>
          <DrawdownChart data={r.equity} height={130} />
        </div>
      </Card>

      {s.trades > 0 && (
        <>
          <div className="grid gap-5 lg:grid-cols-2 2xl:grid-cols-4">
            <Card>
              <CardHeader title="R dağılımı" icon={<Shapes className="h-4 w-4" />} />
              <div className="px-2 pb-3">
                <RHistogram bins={r.breakdowns.r_histogram} />
              </div>
            </Card>
            <Card>
              <CardHeader title="Sembol bazında" icon={<PieChart className="h-4 w-4" />} />
              <div className="px-5 pb-5">
                <BarList signed format={(v) => fmtSigned(v, 0, " $")} items={r.breakdowns.by_symbol.map((x) => ({ key: x.key, label: base(x.key), value: x.net_pnl, sub: `${x.trades} · %${fmtNum(x.win_rate * 100, 0)}` }))} />
              </div>
            </Card>
            <Card>
              <CardHeader title="Çıkış nedenleri" icon={<LogOut className="h-4 w-4" />} />
              <div className="px-5 pb-5">
                <BarList format={(v) => fmtNum(v, 0)} items={r.breakdowns.exit_reasons.map((x) => ({ key: x.label, label: x.label, value: x.count }))} />
              </div>
            </Card>
            <Card>
              <CardHeader title="Atlanan sinyaller" subtitle="Risk kuralları nedeniyle" icon={<AlertTriangle className="h-4 w-4" />} />
              <div className="space-y-2 px-5 pb-5 text-sm">
                {Object.entries({
                  max_positions: "Maks. pozisyon dolu",
                  cooldown: "Zarar sonrası bekleme",
                  daily_limit: "Günlük zarar limiti",
                  kill_switch: "Acil durdurma",
                  cash: "Yetersiz bakiye",
                }).map(([k, label]) => (
                  <div key={k} className="flex justify-between">
                    <span className="text-fg-2">{label}</span>
                    <span className="num font-medium">{r.skipped[k] ?? 0}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
          <Card>
            <CardHeader title="Aylık getiri" icon={<CalendarRange className="h-4 w-4" />} />
            <div className="px-5 pb-5">
              <MonthlyHeatmap months={r.monthly} />
            </div>
          </Card>
          <Card>
            <CardHeader title="Test işlemleri" subtitle={`${r.trades.length} işlem · ortalama ${fmtR(s.expectancy_r ?? 0)}`} icon={<History className="h-4 w-4" />} />
            <div className="max-h-[560px] overflow-y-auto">
              <TradesTable trades={[...r.trades].reverse()} />
            </div>
          </Card>
        </>
      )}
      {r.model?.summary && (
        <p className="text-xs text-muted">
          Test için eğitilen model: {fmtDate(r.model.data_from)} – {fmtDate(r.model.data_to)} verisi · walk-forward başarı {fmtPct(r.model.summary.pooled_win_rate ?? 0, 1)} · eşik{" "}
          {r.model.threshold > 1 ? "kapalı" : fmtNum(r.model.threshold, 2)}
        </p>
      )}
    </div>
  );
}
