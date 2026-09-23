import clsx from "clsx";
import { BrainCircuit, CheckCircle2, Coins, Cpu, LogOut, Plug, Plus, RotateCcw, Save, ShieldCheck, Wallet, X, XCircle } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "../components/Toasts";
import { Badge, Button, Card, CardHeader, Field, Modal, NumberInput, Segmented, Skeleton, Toggle } from "../components/ui";
import { post, put } from "../lib/api";
import { fmtNum, fmtUsd } from "../lib/format";
import { useFetch, useLive } from "../lib/live";
import type { BotConfig, ConfigResponse, Snapshot } from "../lib/types";

export default function Settings() {
  const { state, setState, refresh } = useLive();
  const cfg = useFetch<ConfigResponse>("/api/config");
  const markets = useFetch<{ markets: string[] }>("/api/markets");
  const [draft, setDraft] = useState<BotConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [newSym, setNewSym] = useState("");
  const [resetOpen, setResetOpen] = useState(false);
  const [resetBal, setResetBal] = useState(10000);

  useEffect(() => {
    if (cfg.data && !draft) {
      setDraft(cfg.data.config);
      setResetBal(cfg.data.config.paper_starting_balance);
    }
  }, [cfg.data, draft]);

  const dirty = useMemo(() => !!draft && !!cfg.data && JSON.stringify(draft) !== JSON.stringify(cfg.data.config), [draft, cfg.data]);
  if (!draft || !cfg.data || !state) return <Skeleton className="h-96" />;
  const set = <K extends keyof BotConfig>(k: K, v: BotConfig[K]) => setDraft({ ...draft, [k]: v });
  const d = cfg.data.defaults;

  const save = async () => {
    setSaving(true);
    try {
      const r = await put<{ config: BotConfig }>("/api/config", draft);
      cfg.setData({ ...cfg.data!, config: r.config });
      setDraft(r.config);
      await refresh();
      toast("success", "Ayarlar kaydedildi", "Sinyaller yeni ayarlarla bir sonraki döngüde yeniden hesaplanır.");
    } catch (e) {
      toast("error", "Kaydedilemedi", (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const addSymbol = () => {
    let s = newSym.trim().toUpperCase().replace("-", "/");
    if (!s) return;
    if (!s.includes("/")) s = s.endsWith("USDT") ? `${s.slice(0, -4)}/USDT` : `${s}/USDT`;
    if (markets.data && !markets.data.markets.includes(s)) {
      toast("warning", "Sembol bulunamadı", `${s} bu borsada spot USDT paritesi olarak listelenmiyor.`);
      return;
    }
    if (!draft.symbols.includes(s)) set("symbols", [...draft.symbols, s]);
    setNewSym("");
  };

  const resetPaper = async () => {
    try {
      setState(await post<Snapshot>("/api/paper/reset", { balance: resetBal }));
      toast("success", "Paper hesap sıfırlandı", fmtUsd(resetBal));
      setResetOpen(false);
      setDraft({ ...draft, paper_starting_balance: resetBal });
      cfg.reload();
    } catch (e) {
      toast("error", "Sıfırlanamadı", (e as Error).message);
    }
  };

  const riskUsd = (state.account.equity * draft.risk_per_trade_pct) / 100;
  const liveReady = cfg.data.live_enabled && cfg.data.has_keys && state.status.data_source === "exchange";

  return (
    <div className="space-y-5 pb-16">
      <div className="grid gap-5 xl:grid-cols-2">
        <Section title="İşlem modu" icon={<Wallet className="h-4 w-4" />} subtitle="Önce paper modda test edin">
          <div className="space-y-4">
            <Segmented
              value={draft.mode}
              onChange={(v) => set("mode", v)}
              options={[
                { value: "paper", label: "Paper (sanal para)" },
                { value: "live", label: "Canlı (gerçek para)" },
              ]}
            />
            {draft.mode === "live" && (
              <div className="card-inset space-y-2 p-3.5 text-sm">
                <p className="text-xs font-medium text-fg-2">Canlı işlem gereksinimleri</p>
                <Check ok={cfg.data.live_enabled} text=".env: ENABLE_LIVE_TRADING=true" />
                <Check ok={cfg.data.has_keys} text=".env: EXCHANGE_API_KEY ve EXCHANGE_API_SECRET (yalnızca spot işlem izni, para çekme KAPALI)" />
                <Check ok={state.status.data_source === "exchange"} text={`${state.status.exchange} borsasına bağlantı`} />
                {!liveReady && <p className="pt-1 text-xs text-warn">Eksikler giderilmeden canlı moda geçilemez.</p>}
              </div>
            )}
            <div>
              <span className="label">Karar motoru</span>
              <div className="mt-1.5">
                <Segmented
                  size="sm"
                  value={draft.strategy_mode}
                  onChange={(v) => set("strategy_mode", v)}
                  options={[
                    { value: "ai", label: "AI + kural uzmanları (önerilen)" },
                    { value: "rules", label: "Sadece kurallar" },
                  ]}
                />
              </div>
            </div>
          </div>
        </Section>

        <Section title="Semboller ve zaman dilimi" icon={<Coins className="h-4 w-4" />} subtitle="Model tüm semboller üzerinde ortak eğitilir">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-1.5">
              {draft.symbols.map((s) => (
                <span key={s} className="inline-flex items-center gap-1 rounded-lg bg-surface-2 py-1 pr-1 pl-2.5 text-xs font-medium ring-1 ring-line">
                  {s}
                  <button
                    onClick={() => draft.symbols.length > 1 && set("symbols", draft.symbols.filter((x) => x !== s))}
                    className="rounded p-0.5 text-muted hover:bg-surface-3 hover:text-down"
                    aria-label={`${s} kaldır`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                className="input"
                list="markets"
                placeholder="Sembol ekle (ör. AVAX veya AVAX/USDT)"
                value={newSym}
                onChange={(e) => setNewSym(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addSymbol()}
              />
              <datalist id="markets">
                {markets.data?.markets.slice(0, 800).map((m) => (
                  <option key={m} value={m} />
                ))}
              </datalist>
              <Button onClick={addSymbol} icon={<Plus className="h-4 w-4" />}>
                Ekle
              </Button>
            </div>
            <Field label="Zaman dilimi" hint="4h önerilir: komisyonun riske oranı düşer, gürültü azalır. Değiştirirseniz model yeniden eğitilir.">
              <Segmented size="sm" value={draft.timeframe} onChange={(v) => set("timeframe", v)} options={cfg.data.timeframes.map((t) => ({ value: t, label: t }))} />
            </Field>
          </div>
        </Section>

        <Section title="Risk yönetimi" icon={<ShieldCheck className="h-4 w-4" />} subtitle={`Şu anki bakiyeyle işlem başına maks. risk ≈ ${fmtUsd(riskUsd)}`}>
          <div className="grid grid-cols-2 gap-4">
            <Num label="İşlem başına risk" suffix="%" v={draft.risk_per_trade_pct} def={d.risk_per_trade_pct} on={(v) => set("risk_per_trade_pct", v)} hint="Stop olursa kaybedilecek bakiye oranı. Önerilen %0,5–1." />
            <Num label="Maks. açık pozisyon" v={draft.max_open_positions} def={d.max_open_positions} step={1} on={(v) => set("max_open_positions", Math.round(v))} />
            <Num label="Pozisyon başına maks." suffix="%" v={draft.max_position_pct} def={d.max_position_pct} on={(v) => set("max_position_pct", v)} hint="Tek pozisyonun bakiyedeki en yüksek payı" />
            <Num label="Günlük zarar limiti" suffix="%" v={draft.daily_loss_limit_pct} def={d.daily_loss_limit_pct} on={(v) => set("daily_loss_limit_pct", v)} hint="Aşılırsa o gün yeni işlem açılmaz" />
            <Num label="Maks. düşüş (acil durdurma)" suffix="%" v={draft.max_drawdown_pct} def={d.max_drawdown_pct} on={(v) => set("max_drawdown_pct", v)} hint="Zirveden bu kadar düşülürse tüm pozisyonlar kapanır ve bot durur" />
            <Num label="Zarar sonrası bekleme" suffix="mum" v={draft.cooldown_bars} def={d.cooldown_bars} step={1} on={(v) => set("cooldown_bars", Math.round(v))} />
            <div className="col-span-2">
              <Toggle checked={draft.confidence_sizing} onChange={(v) => set("confidence_sizing", v)} label="Güvene göre boyutlandırma" description="Olasılık eşiğin ne kadar üzerindeyse risk 0,75× ile 1,25× arasında ölçeklenir." />
            </div>
          </div>
        </Section>

        <Section title="Çıkış stratejisi" icon={<LogOut className="h-4 w-4" />} subtitle="Yüksek başarı oranı için kısmi kâr + başabaş stop">
          <div className="grid grid-cols-2 gap-4">
            <Num label="Stop mesafesi" suffix="× ATR" v={draft.sl_atr_mult} def={d.sl_atr_mult} on={(v) => set("sl_atr_mult", v)} hint="1R = bu mesafe" />
            <Num label="TP1 hedefi" suffix="R" v={draft.tp1_r} def={d.tp1_r} on={(v) => set("tp1_r", v)} hint="AI bu hedefe ulaşma olasılığını tahmin eder" />
            <Num label="TP1'de kapatılan" suffix="%" v={draft.tp1_close_pct} def={d.tp1_close_pct} step={5} on={(v) => set("tp1_close_pct", v)} />
            <Num label="TP2 hedefi" suffix="R" v={draft.tp2_r} def={d.tp2_r} on={(v) => set("tp2_r", v)} />
            <Num label="Takip eden stop" suffix="× ATR" v={draft.trailing_atr_mult} def={d.trailing_atr_mult} on={(v) => set("trailing_atr_mult", v)} hint="TP1 sonrası zirveden bu mesafede izler" />
            <Num label="Zaman stopu" suffix="mum" v={draft.time_stop_bars} def={d.time_stop_bars} step={1} on={(v) => set("time_stop_bars", Math.round(v))} hint="TP1'e ulaşamayan işlem bu süre sonunda kapanır (0 = kapalı)" />
            <div className="col-span-2 space-y-3">
              <Toggle checked={draft.breakeven_after_tp1} onChange={(v) => set("breakeven_after_tp1", v)} label="TP1 sonrası stopu başabaşa çek" description="Kalan pozisyon artık zararla kapanamaz." />
              <Toggle checked={draft.exit_on_signal_reversal} onChange={(v) => set("exit_on_signal_reversal", v)} label="Sinyal dönünce çık" description="AI olasılığı %40'ın, kural skoru −0,25'in altına düşerse pozisyon kapanır." />
            </div>
          </div>
        </Section>

        <Section title="AI ve sinyal filtreleri" icon={<BrainCircuit className="h-4 w-4" />} subtitle="Eşik yükseldikçe daha az ama daha isabetli işlem">
          <div className="grid grid-cols-2 gap-4">
            <Num label="AI olasılık eşiği" v={draft.ai_threshold} def={d.ai_threshold} step={0.01} on={(v) => set("ai_threshold", v)} hint="0 = modelin doğrulamada seçtiği eşik (önerilen). Elle 0,55–0,80 arası girilebilir." />
            <Num label="Min. kural skoru" v={draft.min_rule_score} def={d.min_rule_score} step={0.05} on={(v) => set("min_rule_score", v)} hint="−1 ile +1 arası; uzmanların ağırlıklı oyu" />
            <div className="col-span-2 space-y-3">
              <Toggle checked={draft.trend_filter} onChange={(v) => set("trend_filter", v)} label="Trend filtresi" description="Coin düşüş trendindeyken (EMA50 < EMA200 ve fiyat altında) alım yapma." />
              <Toggle checked={draft.btc_filter} onChange={(v) => set("btc_filter", v)} label="BTC filtresi" description="BTC düşüş trendindeyken hiçbir coinde alım yapma — altcoinler genellikle BTC'yi takip eder." />
            </div>
          </div>
        </Section>

        <Section title="Maliyetler ve motor" icon={<Cpu className="h-4 w-4" />} subtitle="Backtest ve eğitim bu maliyetleri hesaba katar">
          <div className="grid grid-cols-2 gap-4">
            <Num label="Komisyon (tek yön)" suffix="%" v={draft.fee_pct} def={d.fee_pct} step={0.01} on={(v) => set("fee_pct", v)} hint="Binance spot: %0,1 (BNB ile %0,075)" />
            <Num label="Kayma (slippage)" suffix="%" v={draft.slippage_pct} def={d.slippage_pct} step={0.01} on={(v) => set("slippage_pct", v)} />
            <Num label="Fiyat kontrol aralığı" suffix="sn" v={draft.poll_interval_sec} def={d.poll_interval_sec} step={1} on={(v) => set("poll_interval_sec", Math.round(v))} hint="Stop/hedef kontrol sıklığı" />
            <Num label="Eğitim geçmişi" suffix="gün" v={draft.train_days} def={d.train_days} step={30} on={(v) => set("train_days", Math.round(v))} />
            <Num label="Otomatik yeniden eğitim" suffix="saat" v={draft.auto_retrain_hours} def={d.auto_retrain_hours} step={6} on={(v) => set("auto_retrain_hours", Math.round(v))} hint="0 = kapalı" />
          </div>
        </Section>

        <div className="space-y-5">
          <Section title="Bağlantılar" icon={<Plug className="h-4 w-4" />}>
            <div className="space-y-2.5 text-sm">
              <Check ok={state.status.data_source === "exchange"} text={`Piyasa verisi: ${state.status.data_source === "exchange" ? `${state.status.exchange} (canlı)` : "simülasyon"}`} />
              <Check ok={cfg.data.has_keys} text="Borsa API anahtarları" optional />
              <Check ok={cfg.data.live_enabled} text="Canlı işlem izni (ENABLE_LIVE_TRADING)" optional />
              <Check ok={state.status.has_ai_analyst} text="AI Analist (ANTHROPIC_API_KEY)" optional />
            </div>
          </Section>
          <Section title="Paper hesap" icon={<RotateCcw className="h-4 w-4" />} subtitle={`Başlangıç bakiyesi ${fmtUsd(draft.paper_starting_balance)}`}>
            <p className="mb-3 text-xs text-fg-2">Sanal bakiyeyi sıfırlar, açık paper pozisyonlarını ve paper işlem geçmişini siler.</p>
            <Button variant="secondary" onClick={() => setResetOpen(true)} disabled={state.status.mode !== "paper"} icon={<RotateCcw className="h-4 w-4" />}>
              Paper hesabı sıfırla
            </Button>
          </Section>
        </div>
      </div>

      <div
        className={clsx(
          "fixed inset-x-0 bottom-16 z-30 border-t border-line bg-surface/90 backdrop-blur-xl transition lg:bottom-0 lg:left-64",
          dirty ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-full opacity-0",
        )}
      >
        <div className="mx-auto flex max-w-[1600px] items-center justify-end gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <span className="mr-auto text-sm text-fg-2">Kaydedilmemiş değişiklikler var</span>
          <Button variant="ghost" onClick={() => setDraft(cfg.data!.config)}>
            Geri al
          </Button>
          <Button variant="ai" loading={saving} onClick={save} icon={<Save className="h-4 w-4" />}>
            Kaydet
          </Button>
        </div>
      </div>

      <Modal
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        title="Paper hesabı sıfırla"
        footer={
          <>
            <Button variant="ghost" onClick={() => setResetOpen(false)}>
              Vazgeç
            </Button>
            <Button variant="danger" onClick={resetPaper}>
              Sıfırla
            </Button>
          </>
        }
      >
        <Field label="Yeni başlangıç bakiyesi" suffix="USDT">
          <NumberInput value={resetBal} onChange={setResetBal} step={500} />
        </Field>
        <p className="mt-3 text-xs text-muted">Paper işlem geçmişi ve sermaye eğrisi silinir. Bu işlem geri alınamaz.</p>
      </Modal>
    </div>
  );
}

function Section({ title, subtitle, icon, children }: { title: string; subtitle?: string; icon: ReactNode; children: ReactNode }) {
  return (
    <Card>
      <CardHeader title={title} subtitle={subtitle} icon={icon} />
      <div className="px-5 pb-5">{children}</div>
    </Card>
  );
}

function Num({ label, v, def, on, suffix, step = 0.1, hint }: { label: string; v: number; def: number; on: (v: number) => void; suffix?: string; step?: number; hint?: string }) {
  return (
    <Field
      label={
        <span className="flex items-center justify-between gap-2">
          {label}
          {v !== def && (
            <button type="button" className="text-[0.65rem] font-normal text-muted hover:text-accent" onClick={() => on(def)} title="Varsayılana dön">
              varsayılan {fmtNum(def, 2, 0)}
            </button>
          )}
        </span>
      }
      hint={hint}
      suffix={suffix}
    >
      <NumberInput value={v} onChange={on} step={step} />
    </Field>
  );
}

function Check({ ok, text, optional }: { ok: boolean; text: string; optional?: boolean }) {
  return (
    <div className="flex items-start gap-2">
      {ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-up" /> : <XCircle className={clsx("mt-0.5 h-4 w-4 shrink-0", optional ? "text-muted" : "text-down")} />}
      <span className={clsx("text-sm", ok ? "text-fg" : "text-fg-2")}>{text}</span>
      {optional && !ok && <Badge className="ml-auto">isteğe bağlı</Badge>}
    </div>
  );
}
