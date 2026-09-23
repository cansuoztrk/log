import { BarChart3, CalendarRange, Download, History, LogOut, PieChart, Shapes } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { BarList, EquityChart, MonthlyHeatmap, RHistogram } from "../components/charts";
import { TradesTable } from "../components/domain";
import { Card, CardHeader, Empty, Segmented, Skeleton, Stat } from "../components/ui";
import { base, fmtDuration, fmtNum, fmtPct, fmtR, fmtSigned, fmtUsd } from "../lib/format";
import { useFetch, useLive } from "../lib/live";
import type { Performance, TradeStats, Trade } from "../lib/types";

const REGIMES: Record<string, string> = { trend_up: "Yükseliş trendi", trend_down: "Düşüş trendi", range: "Yatay", volatile: "Aşırı volatil", neutral: "Kararsız" };

export function StatsGrid({ s, extra, narrow }: { s: TradeStats; extra?: React.ReactNode; narrow?: boolean }) {
  return (
    <div className={narrow ? "grid grid-cols-2 gap-3 md:grid-cols-3 2xl:grid-cols-6" : "grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6"}>
      <Stat label="Net K/Z" value={fmtSigned(s.net_pnl ?? 0, 2, " $")} tone={(s.net_pnl ?? 0) >= 0 ? "up" : "down"} sub={`${s.trades} işlem · komisyon ${fmtUsd(s.fees ?? 0)}`} />
      <Stat
        label="Başarı oranı"
        value={fmtPct(s.win_rate ?? 0, 1)}
        sub={`${s.wins} kazanç · ${s.losses} kayıp`}
        hint="Kârla kapanan işlem oranı. TP1'de kısmi kâr alınıp stop başabaşa çekildiği için bu oran yüksek tutulur."
      />
      <Stat label="Kâr faktörü" value={s.profit_factor == null ? "∞" : fmtNum(s.profit_factor, 2)} hint="Brüt kâr / brüt zarar. 1,5 üzeri iyi, 2 üzeri çok iyi." sub={`Brüt ${fmtUsd(s.gross_profit ?? 0, 0)} / ${fmtUsd(s.gross_loss ?? 0, 0)}`} />
      <Stat label="Beklenti" value={fmtR(s.expectancy_r ?? 0)} hint="İşlem başına ortalama kazanç, risk birimi (R) cinsinden. 1R = stop olunca kaybedilen tutar." sub={`${fmtSigned(s.expectancy ?? 0, 2, " $")} / işlem`} />
      <Stat label="Ort. kazanç" value={fmtR(s.avg_r_win ?? 0)} tone="up" sub={`Ort. kayıp ${fmtR(s.avg_r_loss ?? 0)} · ${fmtUsd(s.avg_win ?? 0)} / ${fmtUsd(s.avg_loss ?? 0)}`} />
      <Stat label="TP1'e ulaşma" value={fmtPct(s.tp1_rate ?? 0, 1)} hint="Fiyatın ilk hedefe (1R) ulaştığı işlemlerin oranı — AI modelinin tahmin ettiği olay budur." sub={`Ort. süre ${fmtDuration((s.avg_hold_hours ?? 0) * 3600)}`} />
      {extra}
    </div>
  );
}

export default function Trades() {
  const { state } = useLive();
  const [days, setDays] = useState<"7" | "30" | "90" | "0">("0");
  const [symbol, setSymbol] = useState<string>("");
  const perf = useFetch<Performance>(`/api/performance?days=${days}`, 60000, [days]);
  const trades = useFetch<{ trades: Trade[] }>(`/api/trades?limit=2000`, 60000);
  const count = state?.stats.trades ?? 0;
  useEffect(() => {
    perf.reload();
    trades.reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count]);

  const since = days === "0" ? 0 : Date.now() / 1000 - Number(days) * 86400;
  const rows = useMemo(() => (trades.data?.trades ?? []).filter((t) => t.exit_time >= since && (!symbol || t.symbol === symbol)), [trades.data, since, symbol]);
  const symbols = useMemo(() => Array.from(new Set((trades.data?.trades ?? []).map((t) => t.symbol))).sort(), [trades.data]);

  const exportCsv = () => {
    const head = ["id", "sembol", "giris_zamani", "cikis_zamani", "giris", "cikis", "miktar", "kz_usdt", "kz_yuzde", "r", "komisyon", "cikis_nedeni", "ai_olasilik", "rejim"];
    const lines = rows.map((t) =>
      [t.id, t.symbol, new Date(t.entry_time * 1000).toISOString(), new Date(t.exit_time * 1000).toISOString(), t.entry_price, t.exit_price, t.qty, t.pnl.toFixed(4), t.pnl_pct.toFixed(3), t.r_multiple.toFixed(3), t.fees.toFixed(4), `"${t.exit_label}"`, t.prob ?? "", t.regime].join(","),
    );
    const blob = new Blob(["﻿" + [head.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `islemler-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const p = perf.data;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented
          value={days}
          onChange={setDays}
          options={[
            { value: "7", label: "7 gün" },
            { value: "30", label: "30 gün" },
            { value: "90", label: "90 gün" },
            { value: "0", label: "Tümü" },
          ]}
        />
        <p className="text-xs text-muted">{state?.status.mode === "live" ? "Canlı hesap işlemleri" : "Paper trading işlemleri"}</p>
      </div>

      {!p ? (
        <Skeleton className="h-48" />
      ) : !p.stats.trades ? (
        <Card>
          <Empty icon={<History className="h-5 w-5" />} title="Bu aralıkta kapanan işlem yok" text="Botu başlattığınızda yapılan işlemlerin ayrıntılı istatistikleri burada görünür. Stratejiyi önceden görmek için Backtest sayfasını kullanın." />
        </Card>
      ) : (
        <>
          <StatsGrid s={p.stats} />
          <div className="grid gap-5 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <CardHeader title="Sermaye eğrisi" icon={<BarChart3 className="h-4 w-4" />} />
              <div className="px-2 pb-3">{p.equity.length > 1 ? <EquityChart data={p.equity} height={260} /> : <Empty title="Yeterli veri yok" />}</div>
            </Card>
            <Card>
              <CardHeader title="R dağılımı" subtitle="İşlem sonuçlarının risk birimi cinsinden dağılımı" icon={<Shapes className="h-4 w-4" />} />
              <div className="px-2 pb-3">{p.breakdowns && <RHistogram bins={p.breakdowns.r_histogram} height={250} />}</div>
            </Card>
          </div>
          {p.breakdowns && (
            <div className="grid gap-5 lg:grid-cols-3">
              <Card>
                <CardHeader title="Sembol bazında" icon={<PieChart className="h-4 w-4" />} />
                <div className="px-5 pb-5">
                  <BarList
                    signed
                    format={(v) => fmtSigned(v, 2, " $")}
                    items={p.breakdowns.by_symbol.map((r) => ({ key: r.key, label: base(r.key), value: r.net_pnl, sub: `${r.trades} işlem · %${fmtNum(r.win_rate * 100, 0)}` }))}
                  />
                </div>
              </Card>
              <Card>
                <CardHeader title="Çıkış nedenleri" icon={<LogOut className="h-4 w-4" />} />
                <div className="px-5 pb-5">
                  <BarList format={(v) => `${fmtNum(v, 0)} işlem`} items={p.breakdowns.exit_reasons.map((r) => ({ key: r.label, label: r.label, value: r.count }))} />
                </div>
              </Card>
              <Card>
                <CardHeader title="Piyasa rejimine göre" icon={<Shapes className="h-4 w-4" />} />
                <div className="px-5 pb-5">
                  <BarList
                    signed
                    format={(v) => fmtSigned(v, 2, " $")}
                    items={p.breakdowns.by_regime.map((r) => ({ key: r.key, label: REGIMES[r.key] ?? r.key, value: r.net_pnl, sub: `${r.trades} · ${fmtR(r.avg_r)}` }))}
                  />
                </div>
              </Card>
            </div>
          )}
          <Card>
            <CardHeader title="Aylık getiri" subtitle="Sermaye eğrisinden hesaplanır" icon={<CalendarRange className="h-4 w-4" />} />
            <div className="px-5 pb-5">
              <MonthlyHeatmap months={p.monthly} />
            </div>
          </Card>
        </>
      )}

      <Card>
        <CardHeader
          title="İşlem geçmişi"
          subtitle={`${rows.length} işlem`}
          icon={<History className="h-4 w-4" />}
          right={
            <>
              <select className="input h-8 w-auto py-0 text-xs" value={symbol} onChange={(e) => setSymbol(e.target.value)} aria-label="Sembol filtresi">
                <option value="">Tüm semboller</option>
                {symbols.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <button onClick={exportCsv} disabled={!rows.length} className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs text-fg-2 ring-1 ring-line hover:bg-surface-2 disabled:opacity-40">
                <Download className="h-3.5 w-3.5" /> CSV
              </button>
            </>
          }
        />
        <div className="max-h-[640px] overflow-y-auto">
          <TradesTable trades={rows} />
        </div>
      </Card>
    </div>
  );
}
