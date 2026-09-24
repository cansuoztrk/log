import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { api, wsUrl } from "./api";
import type { BotEvent, Snapshot } from "./types";

interface LiveCtx {
  state: Snapshot | null;
  events: BotEvent[];
  connected: boolean;
  refresh: () => Promise<void>;
  setState: (s: Snapshot) => void;
  onEvent: (fn: (e: BotEvent) => void) => () => void;
}

const Ctx = createContext<LiveCtx | null>(null);

export function LiveProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Snapshot | null>(null);
  const [events, setEvents] = useState<BotEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const listeners = useRef(new Set<(e: BotEvent) => void>());

  const refresh = useCallback(async () => {
    try {
      setState(await api<Snapshot>("/api/state"));
    } catch {
      /* surfaced by the connection indicator */
    }
  }, []);

  useEffect(() => {
    api<{ events: BotEvent[] }>("/api/events?limit=150")
      .then((r) => setEvents(r.events))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    let ws: WebSocket | null = null;
    let closed = false;
    let retry = 1000;
    let poll: number | undefined;
    let timer: number | undefined;

    const startPolling = () => {
      if (poll) return;
      refresh();
      poll = window.setInterval(refresh, 5000);
    };
    const stopPolling = () => {
      if (poll) window.clearInterval(poll);
      poll = undefined;
    };

    const connect = () => {
      if (closed) return;
      try {
        ws = new WebSocket(wsUrl());
      } catch {
        startPolling();
        timer = window.setTimeout(connect, retry);
        return;
      }
      ws.onopen = () => {
        retry = 1000;
        setConnected(true);
        stopPolling();
      };
      ws.onmessage = (msg) => {
        try {
          const data = JSON.parse(msg.data);
          if (data.type === "state") setState(data.data as Snapshot);
          else if (data.type === "event") {
            const ev = data.data as BotEvent;
            setEvents((prev) => (prev.some((p) => p.id === ev.id) ? prev : [ev, ...prev].slice(0, 300)));
            listeners.current.forEach((fn) => fn(ev));
          }
        } catch {
          /* ignore malformed frames */
        }
      };
      ws.onclose = () => {
        setConnected(false);
        startPolling();
        if (!closed) {
          timer = window.setTimeout(connect, retry);
          retry = Math.min(retry * 2, 15000);
        }
      };
      ws.onerror = () => ws?.close();
    };
    connect();
    return () => {
      closed = true;
      stopPolling();
      if (timer) window.clearTimeout(timer);
      ws?.close();
    };
  }, [refresh]);

  const onEvent = useCallback((fn: (e: BotEvent) => void) => {
    listeners.current.add(fn);
    return () => {
      listeners.current.delete(fn);
    };
  }, []);

  return <Ctx.Provider value={{ state, events, connected, refresh, setState, onEvent }}>{children}</Ctx.Provider>;
}

export function useLive(): LiveCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useLive outside LiveProvider");
  return v;
}

/** Fetch helper with loading/error state and optional polling. */
export function useFetch<T>(path: string | null, intervalMs = 0, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const load = useCallback(async () => {
    if (!path) return;
    setLoading(true);
    try {
      setData(await api<T>(path));
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [path]);
  useEffect(() => {
    load();
    if (!intervalMs || !path) return;
    const id = window.setInterval(load, intervalMs);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load, intervalMs, ...deps]);
  return { data, error, loading, reload: load, setData };
}

/** Re-render every `ms` (for countdowns / "x ago" labels). */
export function useNow(ms = 1000) {
  const [now, setNow] = useState(() => Date.now() / 1000);
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now() / 1000), ms);
    return () => window.clearInterval(id);
  }, [ms]);
  return now;
}
