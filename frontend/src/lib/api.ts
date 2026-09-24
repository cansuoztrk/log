const TOKEN_KEY = "akb_token";

export function getToken(): string {
  try {
    return localStorage.getItem(TOKEN_KEY) ?? "";
  } catch {
    return "";
  }
}

export function setToken(token: string) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage unavailable: token lives only for this page load */
  }
  memoryToken = token;
}

let memoryToken = getToken();

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

type Listener = () => void;
const unauthorizedListeners = new Set<Listener>();
export function onUnauthorized(fn: Listener) {
  unauthorizedListeners.add(fn);
  return () => {
    unauthorizedListeners.delete(fn);
  };
}

export async function api<T>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (memoryToken) headers.set("Authorization", `Bearer ${memoryToken}`);
  let body = init.body;
  if (init.json !== undefined) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(init.json);
  }
  let res: Response;
  try {
    res = await fetch(path, { ...init, headers, body });
  } catch {
    throw new ApiError(0, "Sunucuya ulaşılamıyor. Bot arka ucu çalışıyor mu?");
  }
  if (res.status === 401) {
    unauthorizedListeners.forEach((fn) => fn());
  }
  if (!res.ok) {
    let msg = `${res.status} ${res.statusText}`;
    try {
      const data = await res.json();
      if (data?.detail) msg = typeof data.detail === "string" ? data.detail : JSON.stringify(data.detail);
    } catch {
      /* not json */
    }
    throw new ApiError(res.status, msg);
  }
  return res.json() as Promise<T>;
}

export const post = <T>(path: string, json: unknown = {}) => api<T>(path, { method: "POST", json });
export const put = <T>(path: string, json: unknown) => api<T>(path, { method: "PUT", json });

export function wsUrl(): string {
  const proto = location.protocol === "https:" ? "wss" : "ws";
  const q = memoryToken ? `?token=${encodeURIComponent(memoryToken)}` : "";
  return `${proto}://${location.host}/ws${q}`;
}

export const enc = encodeURIComponent;
