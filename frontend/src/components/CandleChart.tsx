import {
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  HistogramSeries,
  LineSeries,
  LineStyle,
  createChart,
  createSeriesMarkers,
  type IChartApi,
  type ISeriesApi,
  type SeriesMarker,
  type Time,
  type UTCTimestamp,
} from "lightweight-charts";
import { useEffect, useRef, useState } from "react";
import { fmtDateTime, fmtPrice, fmtSignedPct } from "../lib/format";
import { cssVar, useTheme } from "../lib/theme";
import type { CandleData } from "../lib/types";

export interface Layers {
  ema: boolean;
  bb: boolean;
  vwap: boolean;
  st: boolean;
  signals: boolean;
  trades: boolean;
  rsi: boolean;
  macd: boolean;
}

const TF_SEC: Record<string, number> = { "15m": 900, "30m": 1800, "1h": 3600, "4h": 14400, "1d": 86400 };
const ts = (t: number) => t as UTCTimestamp;

function alpha(color: string, a: number) {
  if (color.startsWith("#") && color.length === 7) {
    const n = parseInt(color.slice(1), 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
  }
  return color;
}

function snap(t: number, candles: CandleData["candles"], tf: number): number | null {
  if (!candles.length) return null;
  const first = candles[0].time;
  const last = candles[candles.length - 1].time;
  if (t < first) return null;
  const aligned = Math.min(last, first + Math.floor((t - first) / tf) * tf);
  return aligned;
}

/** Fills its parent's height unless `height` is given. */
export function CandleChart({ data, layers, height }: { data: CandleData; layers: Layers; height?: number }) {
  const box = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const { theme } = useTheme();
  const [legend, setLegend] = useState<{ o: number; h: number; l: number; c: number; v: number; t: number } | null>(null);
  const digits = data.candles.length ? (data.candles[data.candles.length - 1].close >= 1000 ? 2 : data.candles[data.candles.length - 1].close >= 1 ? 4 : 6) : 2;

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const fg2 = cssVar("--fg-2");
    const grid = cssVar("--grid");
    const line = cssVar("--line-strong");
    const up = cssVar("--up");
    const down = cssVar("--down");
    const accent = cssVar("--accent");
    const c1 = cssVar("--c1");
    const c2 = cssVar("--c2");
    const c3 = cssVar("--c3");
    const c4 = cssVar("--c4");
    const c5 = cssVar("--c5");
    const tf = TF_SEC[data.timeframe] ?? 3600;

    const chart = createChart(el, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: fg2,
        fontFamily: "Inter Variable, system-ui, sans-serif",
        fontSize: 11,
        attributionLogo: false,
        panes: { separatorColor: line, separatorHoverColor: alpha(accent, 0.3) },
      },
      grid: { vertLines: { color: grid }, horzLines: { color: grid } },
      crosshair: { mode: CrosshairMode.Normal, vertLine: { color: line, labelBackgroundColor: cssVar("--surface-3") }, horzLine: { color: line, labelBackgroundColor: cssVar("--surface-3") } },
      rightPriceScale: { borderColor: line },
      timeScale: {
        borderColor: line,
        timeVisible: tf < 86400,
        secondsVisible: false,
        rightOffset: 6,
        tickMarkFormatter: (time: Time) => {
          const d = new Date((time as number) * 1000);
          return tf >= 86400 || (d.getHours() === 0 && d.getMinutes() === 0)
            ? d.toLocaleDateString("tr-TR", { day: "2-digit", month: "short" })
            : d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
        },
      },
      localization: {
        locale: "tr-TR",
        timeFormatter: (time: Time) => fmtDateTime(time as number),
        priceFormatter: (p: number) => fmtPrice(p, digits),
      },
    });
    chartRef.current = chart;

    const candles = chart.addSeries(CandlestickSeries, {
      upColor: up,
      downColor: down,
      borderUpColor: up,
      borderDownColor: down,
      wickUpColor: alpha(up, 0.8),
      wickDownColor: alpha(down, 0.8),
      priceFormat: { type: "price", precision: digits, minMove: 1 / 10 ** digits },
    });
    candles.setData(data.candles.map((c) => ({ time: ts(c.time), open: c.open, high: c.high, low: c.low, close: c.close })));

    const vol = chart.addSeries(HistogramSeries, { priceScaleId: "vol", priceFormat: { type: "volume" }, lastValueVisible: false, priceLineVisible: false });
    vol.priceScale().applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
    vol.setData(data.candles.map((c) => ({ time: ts(c.time), value: c.volume, color: alpha(c.close >= c.open ? up : down, 0.28) })));

    const addLine = (points: { time: number; value: number }[], color: string, width: 1 | 2 = 1, style: LineStyle = LineStyle.Solid, pane = 0) => {
      const s = chart.addSeries(LineSeries, { color, lineWidth: width, lineStyle: style, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false }, pane);
      s.setData(points.map((p) => ({ time: ts(p.time), value: p.value })));
      return s;
    };

    if (layers.ema) {
      addLine(data.overlays.ema20, c4);
      addLine(data.overlays.ema50, c1, 2);
      addLine(data.overlays.ema200, c5, 2);
    }
    if (layers.bb) {
      addLine(data.overlays.bb_upper, alpha(c3, 0.7));
      addLine(data.overlays.bb_mid, alpha(c3, 0.35), 1, LineStyle.Dotted);
      addLine(data.overlays.bb_lower, alpha(c3, 0.7));
    }
    if (layers.vwap) addLine(data.overlays.vwap, c2, 1, LineStyle.Dashed);
    if (layers.st) {
      const dir = new Map(data.st_dir.map((p) => [p.time, p.value]));
      const s = chart.addSeries(LineSeries, { lineWidth: 2, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false }, 0);
      s.setData(data.overlays.st_line.map((p) => ({ time: ts(p.time), value: p.value, color: alpha((dir.get(p.time) ?? 1) > 0 ? up : down, 0.75) })));
    }

    // markers: AI signals + trade entries/exits
    const markers: SeriesMarker<Time>[] = [];
    if (layers.signals) {
      // Mark only the first bar of each run of consecutive signals to keep the chart readable.
      let prev = -Infinity;
      for (const s of data.signals) {
        if (s.time - prev > tf) {
          markers.push({ time: ts(s.time), position: "belowBar", shape: "circle", color: accent, size: 0.8, text: s.prob != null ? `AI %${Math.round(s.prob * 100)}` : "AI" });
        }
        prev = s.time;
      }
    }
    if (layers.trades) {
      for (const t of data.trades) {
        const et = snap(t.entry_time, data.candles, tf);
        const xt = snap(t.exit_time, data.candles, tf);
        if (et !== null) markers.push({ time: ts(et), position: "belowBar", shape: "arrowUp", color: up, text: "AL" });
        if (xt !== null)
          markers.push({ time: ts(xt), position: "aboveBar", shape: "arrowDown", color: t.pnl >= 0 ? up : down, text: `SAT ${t.r_multiple >= 0 ? "+" : ""}${t.r_multiple.toFixed(1)}R` });
      }
      if (data.position) {
        const et = snap(data.position.entry_time, data.candles, tf);
        if (et !== null) markers.push({ time: ts(et), position: "belowBar", shape: "arrowUp", color: up, text: "AL (açık)" });
      }
    }
    markers.sort((a, b) => (a.time as number) - (b.time as number));
    createSeriesMarkers(candles, markers);

    if (data.position) {
      const p = data.position;
      const pl = (price: number, color: string, title: string, style = LineStyle.Dashed) =>
        candles.createPriceLine({ price, color, lineWidth: 1, lineStyle: style, axisLabelVisible: true, title });
      pl(p.entry_price, c1, "Giriş", LineStyle.Solid);
      pl(p.stop, down, p.tp1_hit ? "Stop (takip)" : "Stop");
      if (!p.tp1_hit) pl(p.tp1, up, "TP1");
      pl(p.tp2, up, "TP2");
    }

    let paneIdx = 1;
    if (layers.rsi && data.rsi.length) {
      const r = addLine(data.rsi, c5, 2, LineStyle.Solid, paneIdx);
      r.createPriceLine({ price: 70, color: alpha(down, 0.6), lineWidth: 1, lineStyle: LineStyle.Dotted, axisLabelVisible: false, title: "" });
      r.createPriceLine({ price: 30, color: alpha(up, 0.6), lineWidth: 1, lineStyle: LineStyle.Dotted, axisLabelVisible: false, title: "" });
      r.applyOptions({ priceFormat: { type: "price", precision: 1, minMove: 0.1 }, lastValueVisible: true, title: "RSI" });
      paneIdx++;
    }
    if (layers.macd && data.macd.hist.length) {
      const h = chart.addSeries(HistogramSeries, { priceLineVisible: false, lastValueVisible: false, priceFormat: { type: "price", precision: digits, minMove: 1 / 10 ** digits } }, paneIdx);
      h.setData(data.macd.hist.map((p, i, arr) => ({
        time: ts(p.time),
        value: p.value,
        color: alpha(p.value >= 0 ? up : down, i > 0 && Math.abs(p.value) < Math.abs(arr[i - 1].value) ? 0.4 : 0.8),
      })));
      addLine(data.macd.macd, c1, 1, LineStyle.Solid, paneIdx);
      addLine(data.macd.signal, c2, 1, LineStyle.Solid, paneIdx);
      paneIdx++;
    }
    const panes = chart.panes();
    if (panes.length > 1) {
      panes[0].setStretchFactor(panes.length === 2 ? 3 : 4);
      for (let i = 1; i < panes.length; i++) panes[i].setStretchFactor(1);
    }

    chart.timeScale().fitContent();
    if (data.candles.length > 160) chart.timeScale().setVisibleLogicalRange({ from: data.candles.length - 160, to: data.candles.length + 5 });

    const byTime = new Map(data.candles.map((c) => [c.time, c]));
    const last = data.candles[data.candles.length - 1];
    if (last) setLegend({ o: last.open, h: last.high, l: last.low, c: last.close, v: last.volume, t: last.time });
    chart.subscribeCrosshairMove((param) => {
      const c = param.time ? byTime.get(param.time as number) : last;
      if (c) setLegend({ o: c.open, h: c.high, l: c.low, c: c.close, v: c.volume, t: c.time });
    });

    return () => {
      chart.remove();
      chartRef.current = null;
    };
  }, [data, layers, theme, digits]);

  const chg = legend ? (legend.c / legend.o - 1) * 100 : 0;
  return (
    <div className={height ? "relative" : "absolute inset-2"} style={height ? { height } : undefined}>
      {legend && (
        <div className="num pointer-events-none absolute top-2 left-3 z-10 flex flex-wrap gap-x-3 gap-y-0.5 text-[0.7rem] text-fg-2">
          <span className="text-muted">{fmtDateTime(legend.t)}</span>
          <span>
            A <b className="font-medium text-fg">{fmtPrice(legend.o, digits)}</b>
          </span>
          <span>
            Y <b className="font-medium text-fg">{fmtPrice(legend.h, digits)}</b>
          </span>
          <span>
            D <b className="font-medium text-fg">{fmtPrice(legend.l, digits)}</b>
          </span>
          <span>
            K <b className="font-medium text-fg">{fmtPrice(legend.c, digits)}</b>
          </span>
          <span className={chg >= 0 ? "text-up" : "text-down"}>{fmtSignedPct(chg)}</span>
        </div>
      )}
      <div ref={box} className="h-full w-full" />
    </div>
  );
}

export type { ISeriesApi };
