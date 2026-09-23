export type Action = "BUY" | "WAIT" | "EXIT";
export type Regime = "trend_up" | "trend_down" | "range" | "volatile" | "neutral";

export interface Status {
  running: boolean;
  halted: boolean;
  halt_reason: string;
  mode: "paper" | "live";
  timeframe: string;
  strategy_mode: "ai" | "rules";
  data_source: "exchange" | "demo" | "pending" | "unavailable";
  data_error: string;
  exchange: string;
  live_enabled: boolean;
  has_keys: boolean;
  has_ai_analyst: boolean;
  last_tick: number;
  last_error: string;
  poll_interval: number;
  broker_ready: boolean;
  broker_error: string;
}

export interface Account {
  equity: number;
  cash: number;
  invested: number;
  unrealized: number;
  start_equity: number;
  total_pnl: number;
  total_pnl_pct: number;
  day_pnl: number;
  day_pnl_pct: number;
  peak: number;
  drawdown_pct: number;
  exposure_pct: number;
}

export interface Position {
  id: string;
  symbol: string;
  entry_time: number;
  entry_price: number;
  qty: number;
  initial_qty: number;
  stop: number;
  initial_stop: number;
  tp1: number;
  tp2: number;
  tp1_hit: boolean;
  risk_per_unit: number;
  confidence: number;
  prob: number | null;
  regime: Regime;
  bars_held: number;
  price: number;
  pnl: number;
  pnl_pct: number;
  r_multiple: number;
  value: number;
  price_digits: number;
}

export interface SignalSummary {
  symbol: string;
  price: number;
  price_digits: number;
  action: Action;
  prob: number | null;
  threshold: number;
  confidence: number;
  rule_score: number;
  regime: Regime;
  regime_label: string;
  time: number;
  next_close: number;
  change_24: number;
  rsi: number;
  in_position: boolean;
}

export interface TradeStats {
  trades: number;
  wins?: number;
  losses?: number;
  win_rate?: number;
  tp1_rate?: number;
  net_pnl?: number;
  gross_profit?: number;
  gross_loss?: number;
  profit_factor?: number | null;
  avg_win?: number;
  avg_loss?: number;
  payoff?: number | null;
  expectancy?: number;
  expectancy_r?: number;
  avg_r_win?: number;
  avg_r_loss?: number;
  best?: number;
  worst?: number;
  max_win_streak?: number;
  max_loss_streak?: number;
  avg_bars_held?: number;
  avg_hold_hours?: number;
  fees?: number;
}

export interface ModelSummary {
  avg_auc: number | null;
  avg_win_rate: number | null;
  pooled_win_rate: number | null;
  pooled_expectancy_r: number | null;
  avg_expectancy_r: number | null;
  avg_base_rate: number | null;
  avg_base_expectancy_r: number | null;
  total_signals: number;
}

export interface ModelInfo {
  ready: boolean;
  usable: boolean;
  threshold: number | null;
  quality: "strong" | "weak" | "none" | null;
  has_edge: boolean | null;
  trained_at: number | null;
  summary: ModelSummary | null;
  stale: string[];
  training: { state: "idle" | "running" | "done" | "error"; progress: number; message: string; started_at: number | null; finished_at: number | null };
}

export interface Snapshot {
  server_time: number;
  status: Status;
  account: Account;
  positions: Position[];
  signals: SignalSummary[];
  model: ModelInfo;
  stats: TradeStats;
}

export interface BotEvent {
  id: number;
  ts: number;
  level: "info" | "success" | "warning" | "error" | "critical" | "signal";
  kind: string;
  message: string;
  data?: Record<string, unknown> | null;
}

export interface Expert {
  key: string;
  label: string;
  score: number;
  weight: number;
}

export interface SignalDetail {
  symbol: string;
  time: number;
  price: number;
  price_digits: number;
  action: Action;
  prob: number | null;
  threshold: number;
  rule_score: number;
  confidence: number;
  regime: Regime;
  regime_label: string;
  experts: Expert[];
  reasons: { text: string; impact: "positive" | "negative" | "neutral" }[];
  levels: { entry: number; stop_loss: number; tp1: number; tp2: number; risk_pct: number; rr: number };
  indicators: Record<string, number>;
  model_ready: boolean;
  model_edge: boolean;
  strategy_mode: "ai" | "rules";
  bar_close?: number;
  next_close?: number;
  position: Position | null;
  analysis: Analysis | null;
}

export interface Analysis {
  symbol: string;
  bar_time: number;
  created: number;
  model: string;
  analysis: {
    ozet: string;
    gorunum: "olumlu" | "notr" | "olumsuz";
    teknik: string;
    firsatlar: string[];
    riskler: string[];
    yukselis_senaryosu: string;
    dusus_senaryosu: string;
    bot_karari: string;
    izlenecek_seviyeler: { seviye: number; aciklama: string }[];
  };
}

export interface Point {
  time: number;
  value: number;
}

export interface CandleData {
  symbol: string;
  timeframe: string;
  candles: { time: number; open: number; high: number; low: number; close: number; volume: number }[];
  overlays: Record<"ema20" | "ema50" | "ema200" | "bb_upper" | "bb_mid" | "bb_lower" | "vwap" | "st_line", Point[]>;
  st_dir: Point[];
  rsi: Point[];
  macd: { macd: Point[]; signal: Point[]; hist: Point[] };
  signals: { time: number; prob: number | null }[];
  trades: { id: string; entry_time: number; exit_time: number; entry_price: number; exit_price: number; pnl: number; exit_label: string; r_multiple: number }[];
  position: Position | null;
  forming: number | null;
}

export interface Trade {
  id: string;
  symbol: string;
  entry_time: number;
  exit_time: number;
  entry_price: number;
  exit_price: number;
  qty: number;
  pnl: number;
  pnl_pct: number;
  r_multiple: number;
  fees: number;
  exit_reason: string;
  exit_label: string;
  tp1_hit: boolean;
  bars_held: number;
  confidence: number;
  prob: number | null;
  regime: Regime;
}

export interface Breakdowns {
  by_symbol: { key: string; trades: number; win_rate: number; net_pnl: number; avg_r: number }[];
  by_regime: { key: string; trades: number; win_rate: number; net_pnl: number; avg_r: number }[];
  exit_reasons: { label: string; count: number }[];
  monthly_pnl: { month: string; pnl: number }[];
  r_histogram: { from: number; to: number; count: number }[];
}

export interface Performance {
  stats: TradeStats;
  breakdowns: Breakdowns | null;
  equity: { time: number; equity: number; cash: number }[];
  monthly: { month: string; return: number }[];
}

export interface BotConfig {
  mode: "paper" | "live";
  symbols: string[];
  timeframe: string;
  paper_starting_balance: number;
  risk_per_trade_pct: number;
  max_open_positions: number;
  max_position_pct: number;
  daily_loss_limit_pct: number;
  max_drawdown_pct: number;
  cooldown_bars: number;
  confidence_sizing: boolean;
  sl_atr_mult: number;
  tp1_r: number;
  tp1_close_pct: number;
  tp2_r: number;
  trailing_atr_mult: number;
  breakeven_after_tp1: boolean;
  time_stop_bars: number;
  strategy_mode: "ai" | "rules";
  ai_threshold: number;
  min_rule_score: number;
  trend_filter: boolean;
  btc_filter: boolean;
  exit_on_signal_reversal: boolean;
  fee_pct: number;
  slippage_pct: number;
  poll_interval_sec: number;
  train_days: number;
  auto_retrain_hours: number;
}

export interface ConfigResponse {
  config: BotConfig;
  timeframes: string[];
  defaults: BotConfig;
  live_enabled: boolean;
  has_keys: boolean;
}

export interface Fold {
  fold: number;
  samples: number;
  candidates: number;
  base_rate: number;
  auc: number | null;
  threshold: number;
  signals: number;
  win_rate: number | null;
  expectancy_r: number | null;
  base_expectancy_r: number;
  from: number;
  to: number;
  train_samples: number;
}

export interface ModelMeta {
  trained_at: number;
  symbols: string[];
  timeframe: string;
  samples: number;
  train_samples: number;
  calibration_samples: number;
  data_from: number;
  data_to: number;
  horizon_bars: number;
  label: string;
  threshold: number;
  calibrated_threshold: number;
  has_edge: boolean;
  quality: "strong" | "weak" | "none";
  candidate_rate: number;
  iterations: number;
  base_rate: number;
  folds: Fold[];
  summary: ModelSummary;
  threshold_curve: { threshold: number; trades: number; win_rate: number | null; expectancy_r: number | null }[];
  importance: { feature: string; label: string; importance: number }[];
}

export interface BacktestStats extends TradeStats {
  start_equity?: number;
  end_equity?: number;
  total_return?: number;
  cagr?: number | null;
  max_drawdown?: number;
  sharpe?: number | null;
  sortino?: number | null;
  calmar?: number | null;
  volatility?: number;
  longest_dd_days?: number;
  benchmark_return?: number | null;
  benchmark_max_drawdown?: number | null;
  exposure?: number;
  signals?: number;
  kill_switch_events?: number;
}

export interface BacktestResult {
  stats: BacktestStats;
  skipped: Record<string, number>;
  equity: { time: number; equity: number; benchmark: number; drawdown: number }[];
  monthly: { month: string; return: number }[];
  breakdowns: Breakdowns;
  trades: Trade[];
  start: number;
  end: number;
  warning: string | null;
  model: { quality: string; has_edge: boolean; threshold: number; summary: ModelSummary; data_from: number; data_to: number } | null;
  data_source: string;
}

export interface BacktestJob {
  id: string;
  state: "running" | "done" | "error";
  progress: number;
  message: string;
  created?: number;
  params?: { days: number; ai_mode: string; symbols: string[]; timeframe: string; initial_balance: number };
  result?: BacktestResult;
}

export interface BacktestListItem {
  id: string;
  created: number;
  params: { days: number; ai_mode: string; symbols: string[]; timeframe: string; initial_balance: number };
  stats: BacktestStats;
}
