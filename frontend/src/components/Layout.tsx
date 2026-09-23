import clsx from "clsx";
import {
  Activity,
  BarChart3,
  Bot,
  BrainCircuit,
  CandlestickChart,
  FlaskConical,
  LayoutDashboard,
  Moon,
  Play,
  ScrollText,
  Settings,
  ShieldAlert,
  Square,
  Sun,
  Wifi,
  WifiOff,
  Zap,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { post } from "../lib/api";
import { fmtAgo, fmtUsd } from "../lib/format";
import { useLive, useNow } from "../lib/live";
import { useTheme } from "../lib/theme";
import type { Snapshot } from "../lib/types";
import { toast } from "./Toasts";
import { Badge, Button, Modal } from "./ui";

export const NAV = [
  { path: "", label: "Genel Bakış", short: "Özet", icon: LayoutDashboard },
  { path: "piyasa", label: "Piyasa & Grafik", short: "Grafik", icon: CandlestickChart },
  { path: "sinyaller", label: "AI Sinyaller", short: "Sinyal", icon: Zap },
  { path: "islemler", label: "İşlemler & Performans", short: "İşlem", icon: BarChart3 },
  { path: "backtest", label: "Backtest", short: "Test", icon: FlaskConical },
  { path: "model", label: "AI Model", short: "Model", icon: BrainCircuit },
  { path: "gunluk", label: "Olay Günlüğü", short: "Günlük", icon: ScrollText },
  { path: "ayarlar", label: "Ayarlar", short: "Ayarlar", icon: Settings },
];
const MOBILE_NAV = ["", "piyasa", "sinyaller", "islemler", "ayarlar"];

export function Layout({ route, children }: { route: string; children: ReactNode }) {
  const current = NAV.find((n) => n.path === route) ?? NAV[0];
  return (
    <div className="min-h-dvh lg:pl-64">
      <Sidebar route={route} />
      <div className="mx-auto flex min-h-dvh max-w-[1600px] flex-col">
        <Topbar title={current.label} />
        <Banners />
        <main className="flex-1 px-4 pt-4 pb-28 sm:px-6 lg:px-8 lg:pb-10">{children}</main>
      </div>
      <BottomNav route={route} />
    </div>
  );
}

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="ai-gradient grid h-9 w-9 place-items-center rounded-xl shadow-[0_8px_24px_-8px_var(--accent)]">
        <Bot className="h-5 w-5 text-white" />
      </div>
      <div className="leading-tight">
        <div className="text-[0.95rem] font-bold tracking-tight">AI Kripto Bot</div>
        <div className="text-[0.68rem] font-medium text-muted">Otonom al-sat asistanı</div>
      </div>
    </div>
  );
}

function Sidebar({ route }: { route: string }) {
  const { state } = useLive();
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-line bg-surface/70 backdrop-blur-xl lg:flex">
      <div className="px-5 pt-5 pb-6">
        <Logo />
      </div>
      <nav className="flex-1 space-y-0.5 px-3">
        {NAV.map((n) => {
          const active = n.path === route;
          const Icon = n.icon;
          return (
            <a
              key={n.path}
              href={`#/${n.path}`}
              className={clsx(
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                active ? "bg-surface-3 text-fg ring-1 ring-line-strong" : "text-fg-2 hover:bg-surface-2 hover:text-fg",
              )}
            >
              <Icon className={clsx("h-[18px] w-[18px]", active ? "text-accent" : "text-muted group-hover:text-fg-2")} />
              {n.label}
              {n.path === "sinyaller" && state && state.signals.some((s) => s.action === "BUY") && (
                <span className="ml-auto rounded-full bg-up-soft px-1.5 text-[0.65rem] font-bold text-up">{state.signals.filter((s) => s.action === "BUY").length}</span>
              )}
              {n.path === "" && state && state.positions.length > 0 && (
                <span className="ml-auto rounded-full bg-accent-soft px-1.5 text-[0.65rem] font-bold text-accent">{state.positions.length}</span>
              )}
            </a>
          );
        })}
      </nav>
      {state && <SidebarAccount state={state} />}
    </aside>
  );
}

function SidebarAccount({ state }: { state: Snapshot }) {
  const a = state.account;
  return (
    <div className="m-3 rounded-2xl bg-surface-2 p-4 ring-1 ring-line">
      <div className="flex items-center justify-between text-xs text-muted">
        <span>{state.status.mode === "live" ? "Canlı hesap" : "Paper hesap"}</span>
        <span className={clsx("num font-semibold", a.total_pnl_pct >= 0 ? "text-up" : "text-down")}>
          {a.total_pnl_pct >= 0 ? "+" : "−"}%{Math.abs(a.total_pnl_pct).toFixed(2).replace(".", ",")}
        </span>
      </div>
      <div className="num mt-1 text-lg font-semibold">{fmtUsd(a.equity)}</div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-3">
        <div className="ai-gradient h-full rounded-full" style={{ width: `${Math.min(100, a.exposure_pct)}%` }} />
      </div>
      <div className="mt-1.5 text-[0.68rem] text-muted">Piyasadaki pay: %{a.exposure_pct.toFixed(1).replace(".", ",")}</div>
    </div>
  );
}

function BottomNav({ route }: { route: string }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
      <div className="grid grid-cols-5">
        {NAV.filter((n) => MOBILE_NAV.includes(n.path)).map((n) => {
          const Icon = n.icon;
          const active = n.path === route;
          return (
            <a key={n.path} href={`#/${n.path}`} className={clsx("flex flex-col items-center gap-1 py-2.5 text-[0.65rem] font-medium", active ? "text-fg" : "text-muted")}>
              <Icon className={clsx("h-5 w-5", active && "text-accent")} />
              {n.short}
            </a>
          );
        })}
      </div>
    </nav>
  );
}

function Topbar({ title }: { title: string }) {
  const { state, connected, setState } = useLive();
  const { theme, toggle } = useTheme();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  useNow(5000);
  const st = state?.status;

  const setRunning = async (on: boolean) => {
    setBusy(true);
    try {
      setState(await post<Snapshot>(on ? "/api/bot/start" : "/api/bot/stop"));
      toast(on ? "success" : "info", on ? "Otomatik işlem başlatıldı" : "Otomatik işlem durduruldu");
    } catch (e) {
      toast("error", "İşlem başarısız", (e as Error).message);
    } finally {
      setBusy(false);
      setConfirm(false);
    }
  };

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg/75 backdrop-blur-xl">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
        <div className="lg:hidden">
          <div className="ai-gradient grid h-8 w-8 place-items-center rounded-lg">
            <Bot className="h-4 w-4 text-white" />
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-semibold tracking-tight sm:text-lg">{title}</h1>
          {st && (
            <p className="hidden truncate text-xs text-muted sm:block">
              {st.exchange.toUpperCase()} · {st.timeframe} · {st.strategy_mode === "ai" ? "AI + kural uzmanları" : "Kural tabanlı"} · son güncelleme{" "}
              {st.last_tick ? fmtAgo(st.last_tick) : "—"}
            </p>
          )}
        </div>
        {st && (
          <div className="hidden items-center gap-2 md:flex">
            {st.data_source === "demo" ? (
              <Badge tone="warn" dot>
                SİMÜLASYON VERİSİ
              </Badge>
            ) : (
              <Badge tone="info" dot>
                CANLI VERİ
              </Badge>
            )}
            {st.mode === "live" ? (
              <Badge tone="down" dot>
                GERÇEK PARA
              </Badge>
            ) : (
              <Badge tone="accent">PAPER TRADING</Badge>
            )}
          </div>
        )}
        <span title={connected ? "Canlı bağlantı" : "Bağlantı yok — yeniden deneniyor"} className={clsx("hidden sm:inline-flex", connected ? "text-up" : "text-down")}>
          {connected ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
        </span>
        <button onClick={toggle} className="rounded-lg p-2 text-muted hover:bg-surface-2 hover:text-fg" aria-label="Temayı değiştir">
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
        {st && (
          <>
            {st.running ? (
              <Button variant="secondary" loading={busy} onClick={() => setRunning(false)} icon={<Square className="h-3.5 w-3.5 fill-current" />}>
                <span className="relative mr-0.5 flex h-2 w-2">
                  <span className="live-dot h-2 w-2 rounded-full bg-up" />
                </span>
                <span className="hidden sm:inline">Çalışıyor · </span>Durdur
              </Button>
            ) : (
              <Button variant="ai" loading={busy} onClick={() => (st.mode === "live" ? setConfirm(true) : setRunning(true))} icon={<Play className="h-3.5 w-3.5 fill-current" />}>
                Botu Başlat
              </Button>
            )}
          </>
        )}
      </div>
      <Modal
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Gerçek parayla işlem"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirm(false)}>
              Vazgeç
            </Button>
            <Button variant="danger" loading={busy} onClick={() => setRunning(true)}>
              Anladım, başlat
            </Button>
          </>
        }
      >
        <div className="flex gap-3">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-down" />
          <div className="space-y-2 text-sm text-fg-2">
            <p>
              Bot <b className="text-fg">{st?.exchange.toUpperCase()}</b> hesabınızda <b className="text-fg">gerçek emirler</b> verecek. Kripto piyasaları çok oynaktır; kayıplar
              yaşanabilir ve geçmiş performans geleceği garanti etmez.
            </p>
            <p>Stoplar bot tarafından yönetilir: bot kapalıyken stoplar çalışmaz. Bilgisayarınızın ve internetinizin açık kalmasını sağlayın.</p>
          </div>
        </div>
      </Modal>
    </header>
  );
}

function Banners() {
  const { state, setState } = useLive();
  const [busy, setBusy] = useState(false);
  if (!state) return null;
  const st = state.status;
  const items: ReactNode[] = [];
  if (st.halted) {
    items.push(
      <div key="halt" className="flex flex-wrap items-center gap-3 rounded-xl bg-down-soft px-4 py-3 text-sm text-down ring-1 ring-down/25">
        <ShieldAlert className="h-4 w-4 shrink-0" />
        <span className="flex-1">
          <b>Acil durdurma aktif:</b> {st.halt_reason}
        </span>
        <Button
          size="sm"
          variant="secondary"
          loading={busy}
          onClick={async () => {
            setBusy(true);
            try {
              setState(await post<Snapshot>("/api/bot/reset-halt"));
            } catch (e) {
              toast("error", "Sıfırlanamadı", (e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          Acil durumu sıfırla
        </Button>
      </div>,
    );
  }
  if (st.data_source === "demo") {
    items.push(
      <div key="demo" className="flex items-start gap-3 rounded-xl bg-warn-soft px-4 py-3 text-xs leading-relaxed text-warn ring-1 ring-warn/25">
        <Activity className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          <b>Simülasyon verisi kullanılıyor.</b> Borsaya ({st.exchange}) bağlanılamadı{st.data_error ? ` (${st.data_error.slice(0, 90)})` : ""}. Grafikler, sinyaller ve backtest sonuçları
          gerçek piyasayı yansıtmaz. İnternet bağlantısı olan bir bilgisayarda gerçek veriler otomatik kullanılır.
        </span>
      </div>,
    );
  }
  if (st.broker_error) {
    items.push(
      <div key="broker" className="rounded-xl bg-down-soft px-4 py-3 text-xs text-down ring-1 ring-down/25">
        <b>Emir sistemi hazır değil:</b> {st.broker_error}
      </div>,
    );
  }
  if (!items.length) return null;
  return <div className="space-y-2 px-4 pt-4 sm:px-6 lg:px-8">{items}</div>;
}
