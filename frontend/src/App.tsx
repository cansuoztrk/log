import { useEffect, useState } from "react";
import { Layout } from "./components/Layout";
import { Toaster } from "./components/Toasts";
import { Spinner } from "./components/ui";
import { api, onUnauthorized } from "./lib/api";
import { LiveProvider } from "./lib/live";
import Backtest from "./pages/Backtest";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Logs from "./pages/Logs";
import Market from "./pages/Market";
import Model from "./pages/Model";
import Settings from "./pages/Settings";
import Signals from "./pages/Signals";
import Trades from "./pages/Trades";

function parseHash(): { route: string; param?: string } {
  const [route = "", param] = location.hash.replace(/^#\/?/, "").split("/");
  return { route, param };
}

function useHashRoute() {
  const [r, setR] = useState(parseHash);
  useEffect(() => {
    const on = () => {
      setR(parseHash());
      window.scrollTo({ top: 0 });
    };
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return r;
}

export default function App() {
  const [auth, setAuth] = useState<"checking" | "ok" | "login">("checking");
  const { route, param } = useHashRoute();

  useEffect(() => {
    api<{ required: boolean; ok: boolean }>("/api/auth")
      .then((r) => setAuth(r.ok ? "ok" : "login"))
      .catch(() => setAuth("ok")); // backend down: show the app with its connection warning
    return onUnauthorized(() => setAuth("login"));
  }, []);

  if (auth === "checking")
    return (
      <div className="grid min-h-dvh place-items-center">
        <Spinner />
      </div>
    );
  if (auth === "login") return <Login onDone={() => setAuth("ok")} />;

  const page = (() => {
    switch (route) {
      case "piyasa":
        return <Market param={param} />;
      case "sinyaller":
        return <Signals />;
      case "islemler":
        return <Trades />;
      case "backtest":
        return <Backtest />;
      case "model":
        return <Model />;
      case "gunluk":
        return <Logs />;
      case "ayarlar":
        return <Settings />;
      default:
        return <Dashboard />;
    }
  })();

  return (
    <LiveProvider>
      <Layout route={route}>
        <div key={route + (param ?? "")} className="fade-up">
          {page}
        </div>
      </Layout>
      <Toaster />
    </LiveProvider>
  );
}
