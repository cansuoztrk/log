import clsx from "clsx";
import { Bot, BrainCircuit, CandlestickChart, CheckCircle2, CircleMinus, Layers as LayersIcon, Lightbulb, ListChecks, Plus, ShieldAlert, Sparkles, Target, TrendingDown, TrendingUp, XCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { CandleChart, type Layers } from "../components/CandleChart";
import { Gauge } from "../components/charts";
import { toast } from "../components/Toasts";
import { ActionBadge, Badge, Button, Card, CardHeader, CoinIcon, Empty, Modal, RegimeBadge, Skeleton, Spinner } from "../components/ui";
import { api, enc, post } from "../lib/api";
import { base, fmtDateTime, fmtDuration, fmtNum, fmtPct, fmtPrice, fmtSignedPct } from "../lib/format";
import { useFetch, useLive, useNow } from "../lib/live";
import type { Analysis, CandleData, SignalDetail, Snapshot } from "../lib/types";

const LAYER_KEY = "akb_layers";
const DEFAULT_LAYERS: Layers = { ema: true, bb: false, vwap: false, st: false, signals: true, trades: true, rsi: true, macd: false };
const LAYER_LABELS: Record<keyof Layers, string> = {
  ema: "EMA 20/50/200",
  bb: "Bollinger",
  vwap: "VWAP",
  st: "Supertrend",
  signals: "AI sinyalleri",
  trades: "İşlemler",
  rsi: "RSI",
  macd: "MACD",
};

function loadLayers(): Layers {
  try {
    return { ...DEFAULT_LAYERS, ...JSON.parse(localStorage.getItem(LAYER_KEY) || "{}") };
  } catch {
    return DEFAULT_LAYERS;
  }
}

export default function Market({ param }: { param?: string }) {
  const { state } = useLive();
  const symbols = state?.signals.map((s) => s.symbol) ?? [];
  const symbol = param ? param.replace("-", "/") : symbols[0];
  const [layers, setLayers] = useState<Layers>(loadLayers);
  useEffect(() => {
    try {
      localStorage.setItem(LAYER_KEY, JSON.stringify(layers));
    } catch {
      /* ignore */
    }
  }, [layers]);

  const candles = useFetch<CandleData>(symbol ? `/api/candles?symbol=${enc(symbol)}&limit=500` : null, 20000);
  const signal = useFetch<SignalDetail>(symbol ? `/api/signal?symbol=${enc(symbol)}` : null, 20000);
  const summary = state?.signals.find((s) => s.symbol === symbol);

  if (!state) return <Skeleton className="h-[600px]" />;
  if (!symbol) return <Empty title="Sembol yok" text="Ayarlar sayfasından işlem yapılacak sembolleri ekleyin." />;

  return (
    <div className="space-y-4">
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        {state.signals.map((s) => (
          <a
            key={s.symbol}
            href={`#/piyasa/${s.symbol.replace("/", "-")}`}
            className={clsx(
              "flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2 ring-1 transition",
              s.symbol === symbol ? "bg-surface-3 ring-line-strong" : "bg-surface ring-line hover:bg-surface-2",
            )}
          >
            <CoinIcon symbol={s.symbol} size={26} />
            <div className="leading-tight">
              <div className="flex items-center gap-1.5 text-sm font-semibold">
                {base(s.symbol)}
                {s.action === "BUY" && <span className="h-1.5 w-1.5 rounded-full bg-up" />}
              </div>
              <div className="num text-[0.7rem] text-fg-2">
                {fmtPrice(s.price, s.price_digits)} <span className={s.change_24 >= 0 ? "text-up" : "text-down"}>{fmtSignedPct(s.change_24)}</span>
              </div>
            </div>
          </a>
        ))}
      </div>

      <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_400px] xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="flex min-w-0 flex-col">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
            <div className="flex items-center gap-3">
              <CoinIcon symbol={symbol} size={36} />
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold tracking-tight">{symbol}</h2>
                  <Badge>{state.status.timeframe}</Badge>
                  {summary && <RegimeBadge regime={summary.regime} label={summary.regime_label} />}
                </div>
                {summary && (
                  <div className="num text-sm">
                    <span className="font-semibold">{fmtPrice(summary.price, summary.price_digits)}</span>{" "}
                    <span className={summary.change_24 >= 0 ? "text-up" : "text-down"}>{fmtSignedPct(summary.change_24)} (24 mum)</span>
                  </div>
                )}
              </div>
            </div>
            <LayerPicker layers={layers} setLayers={setLayers} />
          </div>
          <div className={clsx("relative flex-1", layers.rsi || layers.macd ? "min-h-[480px] sm:min-h-[620px]" : "min-h-[420px] sm:min-h-[520px]")}>
            {candles.data && candles.data.symbol === symbol ? (
              <CandleChart data={candles.data} layers={layers} />
            ) : candles.error ? (
              <Empty icon={<CandlestickChart className="h-5 w-5" />} title="Grafik yüklenemedi" text={candles.error} />
            ) : (
              <div className="grid h-full place-items-center">
                <Spinner />
              </div>
            )}
          </div>
          <ChartLegend layers={layers} />
        </Card>

        <div className="space-y-4">
          {signal.data && signal.data.symbol === symbol ? (
            <>
              <SignalPanel sig={signal.data} onChanged={signal.reload} />
              <IndicatorsCard sig={signal.data} />
            </>
          ) : (
            <Skeleton className="h-[420px]" />
          )}
        </div>
      </div>

      {signal.data && signal.data.symbol === symbol && (
        <div className="grid gap-4 lg:grid-cols-2">
          <ExpertsCard sig={signal.data} />
          <ReasonsCard sig={signal.data} />
        </div>
      )}
      {signal.data && signal.data.symbol === symbol && <AnalystCard sig={signal.data} enabled={state.status.has_ai_analyst} />}
    </div>
  );
}

function LayerPicker({ layers, setLayers }: { layers: Layers; setLayers: (l: Layers) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <LayersIcon className="mr-1 h-4 w-4 text-muted" />
      {(Object.keys(LAYER_LABELS) as (keyof Layers)[]).map((k) => (
        <button
          key={k}
          onClick={() => setLayers({ ...layers, [k]: !layers[k] })}
          aria-pressed={layers[k]}
          className={clsx(
            "rounded-lg px-2 py-1 text-[0.7rem] font-medium ring-1 transition",
            layers[k] ? "bg-accent-soft text-accent ring-accent/30" : "text-muted ring-line hover:text-fg-2",
          )}
        >
          {LAYER_LABELS[k]}
        </button>
      ))}
    </div>
  );
}

function ChartLegend({ layers }: { layers: Layers }) {
  const items: { label: string; color: string }[] = [];
  if (layers.ema) items.push({ label: "EMA 20", color: "var(--c4)" }, { label: "EMA 50", color: "var(--c1)" }, { label: "EMA 200", color: "var(--c5)" });
  if (layers.bb) items.push({ label: "Bollinger", color: "var(--c3)" });
  if (layers.vwap) items.push({ label: "VWAP", color: "var(--c2)" });
  if (layers.signals) items.push({ label: "AI AL sinyali (olasılık)", color: "var(--accent)" });
  if (!items.length) return null;
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-line px-4 py-2.5 text-[0.7rem] text-fg-2">
      {items.map((i) => (
        <span key={i.label} className="flex items-center gap-1.5">
          <span className="h-0.5 w-3.5 rounded-full" style={{ background: i.color }} />
          {i.label}
        </span>
      ))}
    </div>
  );
}

function SignalPanel({ sig, onChanged }: { sig: SignalDetail; onChanged: () => void }) {
  const { setState } = useLive();
  const now = useNow(1000);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const d = sig.price_digits;
  const lv = sig.levels;
  const thr = sig.threshold <= 1 ? sig.threshold : null;
  const open = async () => {
    setBusy(true);
    try {
      setState(await post<Snapshot>("/api/positions/open", { symbol: sig.symbol }));
      toast("success", "Pozisyon açıldı", sig.symbol);
      setConfirm(false);
      onChanged();
    } catch (e) {
      toast("error", "Pozisyon açılamadı", (e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const verdict =
    sig.action === "BUY"
      ? "Tüm filtreler geçti — bot otomatik modda bu mumda alım yapar."
      : sig.action === "EXIT"
        ? sig.position
          ? "Olasılık ve kural skoru düştü — bot pozisyonu kapatır."
          : "Olasılık ve kural skoru zayıf — satış baskısı var, alım için uygun değil."
        : sig.prob != null && thr != null && sig.prob < thr
          ? `AI olasılığı eşiğin ${fmtNum((thr - sig.prob) * 100, 1)} puan altında.`
          : "Giriş koşulları henüz oluşmadı.";
  return (
    <Card className="relative overflow-hidden">
      <div className={clsx("pointer-events-none absolute -top-20 -right-20 h-48 w-48 rounded-full opacity-25 blur-3xl", sig.action === "BUY" ? "bg-up" : sig.action === "EXIT" ? "bg-down" : "ai-gradient")} />
      <CardHeader
        title="AI sinyali"
        subtitle={`Mum kapanışı ${fmtDateTime(sig.bar_close ?? sig.time)}`}
        icon={<Sparkles className="h-4 w-4 text-accent" />}
        right={<ActionBadge action={sig.action} size="lg" inPosition={!!sig.position} />}
      />
      <div className="px-5 pb-5">
        <div className="flex items-center justify-around gap-2">
          <Gauge value={sig.prob} threshold={thr} label={sig.prob != null ? "Kazanma olasılığı" : "Model yok"} size={170} />
          <div className="space-y-2.5 text-sm">
            <KV k="Eşik" v={thr != null ? fmtPct(thr, 0) : "kapalı"} />
            <KV k="Güven" v={fmtPct(sig.confidence, 0)} />
            <KV k="Kural skoru" v={`${sig.rule_score >= 0 ? "+" : ""}${fmtNum(sig.rule_score, 2)}`} tone={sig.rule_score >= 0 ? "up" : "down"} />
            <KV k="Rejim" v={sig.regime_label} />
          </div>
        </div>
        <p className="mt-3 rounded-lg bg-surface-2 px-3 py-2 text-xs leading-relaxed text-fg-2 ring-1 ring-line">{verdict}</p>

        <div className="mt-4 space-y-1.5">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="font-medium text-fg-2">Önerilen işlem planı</span>
            <span className="text-muted">Sonraki mum: {sig.next_close && sig.next_close > now ? fmtDuration(sig.next_close - now) : "—"}</span>
          </div>
          <LevelRow label="Giriş" price={lv.entry} digits={d} ref_={lv.entry} tone="neutral" />
          <LevelRow label="Stop loss" price={lv.stop_loss} digits={d} ref_={lv.entry} tone="down" />
          <LevelRow label="TP1 (yarısı)" price={lv.tp1} digits={d} ref_={lv.entry} tone="up" />
          <LevelRow label="TP2 / takip" price={lv.tp2} digits={d} ref_={lv.entry} tone="up" />
          <div className="flex justify-between pt-1 text-[0.7rem] text-muted">
            <span>Risk mesafesi {fmtPct(lv.risk_pct / 100, 2)}</span>
            <span>Ödül/Risk 1:{fmtNum(lv.rr, 1)}</span>
          </div>
        </div>

        {sig.position ? (
          <div className="mt-4 rounded-xl bg-accent-soft px-3 py-2.5 text-xs text-accent ring-1 ring-accent/25">Bu sembolde açık pozisyon var — yönetimi Genel Bakış'tan izleyebilirsiniz.</div>
        ) : (
          <Button className="mt-4 w-full" variant={sig.action === "BUY" ? "success" : "secondary"} icon={<Plus className="h-4 w-4" />} onClick={() => setConfirm(true)}>
            Manuel pozisyon aç
          </Button>
        )}
      </div>
      <Modal
        open={confirm}
        onClose={() => setConfirm(false)}
        title={`${sig.symbol} manuel alım`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirm(false)}>
              Vazgeç
            </Button>
            <Button variant="success" loading={busy} onClick={open}>
              Alım yap
            </Button>
          </>
        }
      >
        <div className="space-y-2 text-sm text-fg-2">
          <p>Botun risk kuralları uygulanır: pozisyon büyüklüğü, ATR tabanlı stop ve hedefler otomatik ayarlanır ve bot pozisyonu yönetir.</p>
          {sig.action !== "BUY" && (
            <p className="flex gap-2 rounded-lg bg-warn-soft px-3 py-2 text-warn">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" /> AI şu an alım önermiyor. Manuel işlemler botun istatistiklerini etkiler.
            </p>
          )}
        </div>
      </Modal>
    </Card>
  );
}

function KV({ k, v, tone }: { k: string; v: string; tone?: "up" | "down" }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-xs text-muted">{k}</span>
      <span className={clsx("num font-semibold", tone === "up" && "text-up", tone === "down" && "text-down")}>{v}</span>
    </div>
  );
}

function LevelRow({ label, price, digits, ref_, tone }: { label: string; price: number; digits: number; ref_: number; tone: "up" | "down" | "neutral" }) {
  const pct = (price / ref_ - 1) * 100;
  return (
    <div className="flex items-center justify-between rounded-lg px-2.5 py-1.5 text-sm odd:bg-surface-2">
      <span className="flex items-center gap-2 text-fg-2">
        <span className={clsx("h-2 w-2 rounded-full", tone === "up" ? "bg-up" : tone === "down" ? "bg-down" : "bg-info")} />
        {label}
      </span>
      <span className="num">
        <span className="font-semibold">{fmtPrice(price, digits)}</span>
        {tone !== "neutral" && <span className={clsx("ml-2 text-xs", tone === "up" ? "text-up" : "text-down")}>{fmtSignedPct(pct)}</span>}
      </span>
    </div>
  );
}

function ExpertsCard({ sig }: { sig: SignalDetail }) {
  return (
    <Card>
      <CardHeader title="Uzman oyları" subtitle={`${sig.regime_label} rejimine göre ağırlıklandırıldı`} icon={<Bot className="h-4 w-4" />} />
      <div className="space-y-3 px-5 pb-5">
        {sig.experts.map((e) => (
          <div key={e.key}>
            <div className="mb-1 flex justify-between text-xs">
              <span className="text-fg-2">{e.label}</span>
              <span className="num text-muted">
                ağırlık %{Math.round(e.weight * 100)} ·{" "}
                <b className={e.score >= 0 ? "text-up" : "text-down"}>
                  {e.score >= 0 ? "+" : ""}
                  {fmtNum(e.score, 2)}
                </b>
              </span>
            </div>
            <div className="relative h-2 rounded-full bg-surface-3">
              <span className="absolute top-[-2px] left-1/2 h-3 w-px bg-line-strong" />
              <div
                className={clsx("absolute top-0 h-2 rounded-full", e.score >= 0 ? "bg-up" : "bg-down")}
                style={e.score >= 0 ? { left: "50%", width: `${e.score * 50}%` } : { right: "50%", width: `${-e.score * 50}%` }}
              />
            </div>
          </div>
        ))}
        <div className="flex justify-between pt-1 text-[0.68rem] text-muted">
          <span>← Satış baskısı</span>
          <span>Alım baskısı →</span>
        </div>
      </div>
    </Card>
  );
}

function ReasonsCard({ sig }: { sig: SignalDetail }) {
  const icon = { positive: <CheckCircle2 className="h-4 w-4 text-up" />, negative: <XCircle className="h-4 w-4 text-down" />, neutral: <CircleMinus className="h-4 w-4 text-muted" /> };
  return (
    <Card>
      <CardHeader title="Karar gerekçeleri" subtitle="Botun bu mumu nasıl okuduğu" icon={<ListChecks className="h-4 w-4" />} />
      <ul className="space-y-2 px-5 pb-5">
        {sig.reasons.map((r, i) => (
          <li key={i} className="flex gap-2.5 text-sm leading-snug">
            <span className="mt-0.5 shrink-0">{icon[r.impact]}</span>
            <span className="text-fg-2">{r.text}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function IndicatorsCard({ sig }: { sig: SignalDetail }) {
  const i = sig.indicators;
  const d = sig.price_digits;
  const rows: { k: string; v: string; tone?: "up" | "down"; hint?: string }[] = [
    { k: "RSI (14)", v: fmtNum(i.rsi, 1), tone: i.rsi >= 70 ? "down" : i.rsi <= 30 ? "up" : undefined, hint: i.rsi >= 70 ? "aşırı alım" : i.rsi <= 30 ? "aşırı satım" : "nötr" },
    { k: "Stoch RSI %K", v: fmtNum(i.stoch_k, 1) },
    { k: "MFI", v: fmtNum(i.mfi, 1), hint: "para akışı" },
    { k: "CCI", v: fmtNum(i.cci, 0) },
    { k: "ADX", v: fmtNum(i.adx, 1), hint: i.adx >= 25 ? "güçlü trend" : "zayıf trend" },
    { k: "ATR", v: `${fmtPrice(i.atr, d)} (%${fmtNum(i.atr_pct, 2)})`, hint: "volatilite" },
    { k: "MACD hist.", v: fmtNum(i.macd_hist, d), tone: i.macd_hist >= 0 ? "up" : "down" },
    { k: "Bollinger %B", v: fmtNum(i.bb_pctb, 2) },
    { k: "Hacim oranı", v: `${fmtNum(i.vol_ratio, 2)}×`, hint: "20 mum ort." },
    { k: "EMA 20", v: fmtPrice(i.ema20, d) },
    { k: "EMA 50", v: fmtPrice(i.ema50, d) },
    { k: "EMA 200", v: fmtPrice(i.ema200, d) },
    { k: "VWAP (24)", v: fmtPrice(i.vwap, d) },
  ];
  return (
    <Card>
      <CardHeader title="Gösterge paneli" subtitle="Son kapanan mum" icon={<Target className="h-4 w-4" />} />
      <div className="grid grid-cols-2 gap-2 px-5 pb-5">
        {rows.map((r) => (
          <div key={r.k} className="card-inset px-3 py-2">
            <div className="text-[0.68rem] text-muted">{r.k}</div>
            <div className={clsx("num text-sm font-semibold", r.tone === "up" && "text-up", r.tone === "down" && "text-down")}>{r.v}</div>
            {r.hint && <div className="text-[0.65rem] text-muted">{r.hint}</div>}
          </div>
        ))}
      </div>
    </Card>
  );
}

function AnalystCard({ sig, enabled }: { sig: SignalDetail; enabled: boolean }) {
  const [data, setData] = useState<Analysis | null>(sig.analysis);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    setData(sig.analysis);
    setError(null);
  }, [sig.symbol, sig.analysis]);
  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      setData(await api<Analysis>("/api/analyze", { method: "POST", json: { symbol: sig.symbol } }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const a = data?.analysis;
  const tone = useMemo(() => (a?.gorunum === "olumlu" ? "up" : a?.gorunum === "olumsuz" ? "down" : "neutral"), [a]) as "up" | "down" | "neutral";
  return (
    <Card className="relative overflow-hidden">
      <div className="ai-gradient pointer-events-none absolute -bottom-24 -left-24 h-56 w-56 rounded-full opacity-15 blur-3xl" />
      <CardHeader
        title={<span className="ai-text">AI Analist (Claude)</span>}
        subtitle="Botun verilerini doğal dilde yorumlar · işlem kararlarını etkilemez"
        icon={<BrainCircuit className="h-4 w-4 text-accent" />}
        right={
          <Button variant="ai" size="sm" loading={busy} onClick={run} disabled={!enabled} icon={<Sparkles className="h-3.5 w-3.5" />}>
            {a ? "Yenile" : "Yorum al"}
          </Button>
        }
      />
      <div className="px-5 pb-5">
        {!enabled && !a && (
          <p className="text-sm text-fg-2">
            Bu özellik için <code className="rounded bg-surface-2 px-1.5 py-0.5 text-xs">.env</code> dosyasına <code className="rounded bg-surface-2 px-1.5 py-0.5 text-xs">ANTHROPIC_API_KEY</code>{" "}
            ekleyip uygulamayı yeniden başlatın.
          </p>
        )}
        {error && <p className="rounded-lg bg-down-soft px-3 py-2 text-sm text-down">{error}</p>}
        {busy && !a && (
          <div className="space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        )}
        {a && (
          <div className="fade-up space-y-4">
            <div className="flex flex-wrap items-start gap-3">
              <Badge tone={tone === "neutral" ? "neutral" : tone} className="px-3 py-1 text-xs">
                {tone === "up" ? <TrendingUp className="h-3.5 w-3.5" /> : tone === "down" ? <TrendingDown className="h-3.5 w-3.5" /> : null}
                Görünüm: {a.gorunum === "notr" ? "nötr" : a.gorunum}
              </Badge>
              <p className="flex-1 text-sm leading-relaxed">{a.ozet}</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="card-inset p-3.5">
                <h4 className="mb-1.5 text-xs font-semibold text-fg-2">Teknik görünüm</h4>
                <p className="text-sm leading-relaxed text-fg-2">{a.teknik}</p>
              </div>
              <div className="card-inset p-3.5">
                <h4 className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-fg-2">
                  <Lightbulb className="h-3.5 w-3.5 text-accent" /> Botun kararı hakkında
                </h4>
                <p className="text-sm leading-relaxed text-fg-2">{a.bot_karari}</p>
              </div>
              <ListBox title="Fırsatlar" items={a.firsatlar} tone="up" />
              <ListBox title="Riskler" items={a.riskler} tone="down" />
              <div className="card-inset p-3.5">
                <h4 className="mb-1.5 text-xs font-semibold text-up">Yükseliş senaryosu</h4>
                <p className="text-sm leading-relaxed text-fg-2">{a.yukselis_senaryosu}</p>
              </div>
              <div className="card-inset p-3.5">
                <h4 className="mb-1.5 text-xs font-semibold text-down">Düşüş senaryosu</h4>
                <p className="text-sm leading-relaxed text-fg-2">{a.dusus_senaryosu}</p>
              </div>
            </div>
            {a.izlenecek_seviyeler.length > 0 && (
              <div>
                <h4 className="mb-2 text-xs font-semibold text-fg-2">İzlenecek seviyeler</h4>
                <div className="flex flex-wrap gap-2">
                  {a.izlenecek_seviyeler.map((l, i) => (
                    <div key={i} className="card-inset px-3 py-2">
                      <div className="num text-sm font-semibold">{fmtPrice(l.seviye, sig.price_digits)}</div>
                      <div className="text-[0.7rem] text-muted">{l.aciklama}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <p className="text-[0.68rem] text-muted">
              {data?.model} · {data && fmtDateTime(data.created)} · Yatırım tavsiyesi değildir.
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}

function ListBox({ title, items, tone }: { title: string; items: string[]; tone: "up" | "down" }) {
  return (
    <div className="card-inset p-3.5">
      <h4 className={clsx("mb-1.5 text-xs font-semibold", tone === "up" ? "text-up" : "text-down")}>{title}</h4>
      <ul className="space-y-1.5">
        {items.map((t, i) => (
          <li key={i} className="flex gap-2 text-sm leading-snug text-fg-2">
            <span className={clsx("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full", tone === "up" ? "bg-up" : "bg-down")} />
            {t}
          </li>
        ))}
      </ul>
    </div>
  );
}
