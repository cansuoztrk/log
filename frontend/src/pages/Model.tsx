import clsx from "clsx";
import { BookOpen, BrainCircuit, Layers, ListOrdered, RefreshCw, SlidersHorizontal, Sparkles, Target } from "lucide-react";
import { useEffect } from "react";
import { BarList, ThresholdCharts } from "../components/charts";
import { toast } from "../components/Toasts";
import { Badge, Button, Card, CardHeader, Empty, Progress, Skeleton, Stat } from "../components/ui";
import { post } from "../lib/api";
import { base, fmtDate, fmtDateTime, fmtNum, fmtPct, fmtR } from "../lib/format";
import { useFetch, useLive } from "../lib/live";
import type { ModelInfo, ModelMeta } from "../lib/types";
import { QUALITY } from "./Dashboard";

export default function Model() {
  const { state } = useLive();
  const model = useFetch<ModelInfo & { meta: ModelMeta | Record<string, never> }>("/api/model", 0);
  const training = state?.model.training.state === "running";
  const trainedAt = state?.model.trained_at;
  useEffect(() => {
    model.reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trainedAt]);

  const train = async () => {
    try {
      await post("/api/model/train");
      toast("info", "Eğitim başladı", "Geçmiş veriler indirilip walk-forward doğrulama yapılacak.");
    } catch (e) {
      toast("error", "Başlatılamadı", (e as Error).message);
    }
  };

  if (!model.data || !state) return <Skeleton className="h-96" />;
  const info = state.model;
  const meta = model.data.meta as ModelMeta;
  const hasMeta = !!meta && "summary" in meta;
  const q = info.quality ? QUALITY[info.quality] : null;
  const sm = hasMeta ? meta.summary : null;
  const lift = sm && sm.pooled_win_rate != null && sm.avg_base_rate != null ? sm.pooled_win_rate - sm.avg_base_rate : null;

  return (
    <div className="space-y-5">
      <Card className="relative overflow-hidden">
        <div className="ai-gradient pointer-events-none absolute -top-32 -right-24 h-72 w-72 rounded-full opacity-20 blur-3xl" />
        <div className="flex flex-wrap items-start justify-between gap-4 p-5">
          <div className="flex items-start gap-4">
            <div className="ai-gradient grid h-12 w-12 shrink-0 place-items-center rounded-2xl shadow-[0_10px_30px_-10px_var(--accent)]">
              <BrainCircuit className="h-6 w-6 text-white" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight">Gradient Boosting sinyal modeli</h2>
                {q && <Badge tone={q.tone}>{q.label}</Badge>}
                {!info.ready && <Badge tone="warn">Eğitilmedi</Badge>}
              </div>
              <p className="mt-1 max-w-2xl text-sm text-fg-2">
                {hasMeta ? (
                  <>
                    {meta.symbols.map(base).join(", ")} · {meta.timeframe} · {fmtNum(meta.samples, 0)} örnek ({fmtDate(meta.data_from)} – {fmtDate(meta.data_to)}) · tahmin edilen olay:{" "}
                    <b className="text-fg">{meta.label}</b> ({meta.horizon_bars} mum içinde)
                  </>
                ) : (
                  "Model, geçmiş mumlardan yaklaşık 70 özellik çıkarır ve fiyatın stoptan önce ilk hedefe ulaşma olasılığını tahmin eder."
                )}
              </p>
              {trainedAt && <p className="mt-1 text-xs text-muted">Son eğitim: {fmtDateTime(trainedAt)}</p>}
            </div>
          </div>
          <Button variant="ai" onClick={train} loading={training} icon={<RefreshCw className="h-4 w-4" />}>
            {info.ready ? "Yeniden eğit" : "Modeli eğit"}
          </Button>
        </div>
        {training && (
          <div className="border-t border-line px-5 py-4">
            <div className="mb-2 flex justify-between text-xs">
              <span className="text-fg-2">{info.training.message}</span>
              <span className="num text-muted">{Math.round(info.training.progress * 100)}%</span>
            </div>
            <Progress value={info.training.progress} />
          </div>
        )}
        {info.training.state === "error" && <div className="border-t border-line px-5 py-3 text-sm text-down">{info.training.message}</div>}
        {info.stale.length > 0 && (
          <div className="border-t border-line bg-warn-soft px-5 py-3 text-xs text-warn">
            {info.stale.join(" · ")} — güncel ayarlarla yeniden eğitin.
          </div>
        )}
      </Card>

      {!hasMeta ? (
        <Card>
          <Empty icon={<Sparkles className="h-5 w-5" />} title="Model istatistikleri eğitimden sonra görünür" text="İlk eğitim uygulama açılınca otomatik başlar ve birkaç dakika sürebilir." />
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <Stat
              label="OOS başarı oranı"
              value={sm?.pooled_win_rate != null ? fmtPct(sm.pooled_win_rate, 1) : "—"}
              hint="Walk-forward test katlarında, modelin eşiği geçen sinyallerinden kaçının stoptan önce TP1'e ulaştığı. Model bu verileri eğitimde hiç görmedi."
              sub={`${sm?.total_signals ?? 0} sinyal`}
              tone="up"
            />
            <Stat
              label="Filtresiz oran"
              value={sm?.avg_base_rate != null ? fmtPct(sm.avg_base_rate, 1) : "—"}
              hint="Aynı dönemde, AI filtresi olmadan tüm aday girişlerin TP1'e ulaşma oranı. AI'ın katkısını görmek için karşılaştırın."
              sub={lift != null ? `AI katkısı ${lift >= 0 ? "+" : "−"}${fmtNum(Math.abs(lift) * 100, 1)} puan` : undefined}
            />
            <Stat label="Beklenti / sinyal" value={sm?.pooled_expectancy_r != null ? fmtR(sm.pooled_expectancy_r) : "—"} hint="Komisyon ve kayma düşüldükten sonra sinyal başına ortalama sonuç (R cinsinden)." sub={`Filtresiz ${fmtR(sm?.avg_base_expectancy_r ?? 0)}`} />
            <Stat label="Ortalama AUC" value={sm?.avg_auc != null ? fmtNum(sm.avg_auc, 3) : "—"} hint="Modelin kazanan/kaybeden ayırt etme gücü. 0,5 = yazı tura; finansal verilerde 0,55+ anlamlıdır." />
            <Stat label="Aktif eşik" value={info.threshold != null && info.threshold <= 1 ? fmtNum(info.threshold, 2) : "kapalı"} hint="Kalibre olasılık bu değeri geçerse AL sinyali oluşur. Doğrulama verisinde beklentiyi en üst düzeye çıkaracak şekilde otomatik seçilir." sub={`Kalibrasyon ${fmtNum(meta.calibrated_threshold, 2)}`} />
            <Stat label="Aday oranı" value={fmtPct(meta.candidate_rate, 1)} hint="Mumların ne kadarının trend/volatilite filtrelerinden geçip AI'a sorulduğu." sub={`${meta.iterations} ağaç`} />
          </div>

          <Card>
            <CardHeader title="Walk-forward doğrulama" subtitle="Her kat yalnızca geçmişle eğitilir, sonraki dönemde test edilir (arada sızıntıyı önleyen boşluk bırakılır)" icon={<Layers className="h-4 w-4" />} />
            <div className="overflow-x-auto">
              <table className="table-base">
                <thead>
                  <tr>
                    <th>Kat</th>
                    <th>Test dönemi</th>
                    <th className="text-right">Eğitim örneği</th>
                    <th className="text-right">Aday</th>
                    <th className="text-right">AUC</th>
                    <th className="text-right">Eşik</th>
                    <th className="text-right">Sinyal</th>
                    <th className="text-right">Filtresiz</th>
                    <th className="text-right">AI başarı</th>
                    <th className="text-right">Beklenti</th>
                  </tr>
                </thead>
                <tbody>
                  {meta.folds.map((f) => (
                    <tr key={f.fold}>
                      <td className="font-semibold">#{f.fold}</td>
                      <td className="text-fg-2">
                        {fmtDate(f.from)} – {fmtDate(f.to)}
                      </td>
                      <td className="num text-right">{fmtNum(f.train_samples, 0)}</td>
                      <td className="num text-right">{fmtNum(f.candidates, 0)}</td>
                      <td className="num text-right">{f.auc != null ? fmtNum(f.auc, 3) : "—"}</td>
                      <td className="num text-right">{f.threshold > 1 ? "kapalı" : fmtNum(f.threshold, 2)}</td>
                      <td className="num text-right">{f.signals}</td>
                      <td className="num text-right text-fg-2">{fmtPct(f.base_rate, 1)}</td>
                      <td className={clsx("num text-right font-semibold", f.win_rate != null && f.win_rate > f.base_rate ? "text-up" : "text-down")}>{f.win_rate != null ? fmtPct(f.win_rate, 1) : "—"}</td>
                      <td className={clsx("num text-right", (f.expectancy_r ?? 0) >= 0 ? "text-up" : "text-down")}>{f.expectancy_r != null ? fmtR(f.expectancy_r) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card>
            <CardHeader title="Eşik analizi" subtitle="Kalibrasyon verisinde: eşik yükseldikçe başarı artar, sinyal sayısı azalır" icon={<SlidersHorizontal className="h-4 w-4" />} />
            <div className="px-5 pb-5">
              <ThresholdCharts curve={meta.threshold_curve} threshold={info.threshold} />
            </div>
          </Card>

          <div className="grid gap-5 xl:grid-cols-2">
            <Card>
              <CardHeader title="En etkili özellikler" subtitle="Permütasyon önemi (AUC düşüşü)" icon={<ListOrdered className="h-4 w-4" />} />
              <div className="px-5 pb-5">
                <BarList format={(v) => fmtNum(v * 1000, 1)} items={meta.importance.slice(0, 15).map((f) => ({ key: f.feature, label: f.label, value: Math.max(0, f.importance) }))} />
                <p className="mt-3 text-[0.7rem] text-muted">Değer: özellik karıştırıldığında AUC'deki düşüş ×1000.</p>
              </div>
            </Card>
            <HowItWorks />
          </div>
        </>
      )}
    </div>
  );
}

function HowItWorks() {
  const steps = [
    { t: "Veri & özellikler", d: "Her mum için trend, momentum, volatilite, hacim, mum yapısı ve BTC piyasa bağlamından yaklaşık 70 ölçekten bağımsız özellik hesaplanır." },
    { t: "Etiketleme (üçlü bariyer)", d: "Her mumdan sonraki mumun açılışında alım yapılsaydı, fiyat stoptan (ATR tabanlı) önce ilk hedefe ulaştı mı? Botun gerçek çıkış kuralıyla birebir aynı." },
    { t: "Uzman filtreleri", d: "6 kural uzmanı ve trend/BTC/volatilite filtreleri aday girişleri belirler. Model, yalnızca bu adaylar arasında karar verecek şekilde kalibre edilir (meta-etiketleme)." },
    { t: "Walk-forward doğrulama", d: "Model 4 ayrı dönemde, sadece geçmişle eğitilip geleceğinde test edilir. Rapor edilen başarı oranları bu örneklem dışı testlerden gelir." },
    { t: "Kalibrasyon & eşik", d: "Olasılıklar Platt (lojistik) ölçekleme ile kalibre edilir; komisyon sonrası beklentiyi en yükselten eşik seçilir. Avantaj yoksa bot işlem açmaz." },
    { t: "Risk yönetimi", d: "İşlem başına sabit risk, TP1'de kısmi kâr + başabaş stop, takip eden stop, günlük zarar limiti ve maksimum düşüşte acil durdurma." },
  ];
  return (
    <Card>
      <CardHeader title="Model nasıl çalışır?" icon={<BookOpen className="h-4 w-4" />} />
      <ol className="space-y-3 px-5 pb-5">
        {steps.map((s, i) => (
          <li key={s.t} className="flex gap-3">
            <span className="ai-gradient grid h-6 w-6 shrink-0 place-items-center rounded-full text-[0.7rem] font-bold text-white">{i + 1}</span>
            <div>
              <p className="text-sm font-semibold">{s.t}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-fg-2">{s.d}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className="mx-5 mb-5 flex gap-2 rounded-xl bg-surface-2 px-3.5 py-3 text-xs leading-relaxed text-fg-2 ring-1 ring-line">
        <Target className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
        Hiçbir model geleceği garanti edemez. Rapor edilen oranlar geçmiş verideki örneklem dışı testlere dayanır; piyasa koşulları değiştikçe performans değişir. Model periyodik olarak otomatik yeniden eğitilir.
      </div>
    </Card>
  );
}
