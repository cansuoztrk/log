import { Bot, KeyRound } from "lucide-react";
import { useState } from "react";
import { Button, Field } from "../components/ui";
import { api, setToken } from "../lib/api";

export default function Login({ onDone }: { onDone: () => void }) {
  const [token, setTok] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setToken(token.trim());
    try {
      const r = await api<{ ok: boolean }>("/api/auth");
      if (r.ok) onDone();
      else setError("Erişim anahtarı hatalı");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="grid min-h-dvh place-items-center px-4">
      <form onSubmit={submit} className="card fade-up w-full max-w-sm p-6">
        <div className="ai-gradient mb-4 grid h-12 w-12 place-items-center rounded-2xl">
          <Bot className="h-6 w-6 text-white" />
        </div>
        <h1 className="text-lg font-bold">AI Kripto Bot</h1>
        <p className="mt-1 text-sm text-fg-2">Paneli açmak için .env dosyasındaki DASHBOARD_TOKEN değerini girin.</p>
        <div className="mt-5">
          <Field label="Erişim anahtarı">
            <input className="input" type="password" autoFocus value={token} onChange={(e) => setTok(e.target.value)} />
          </Field>
        </div>
        {error && <p className="mt-3 text-sm text-down">{error}</p>}
        <Button type="submit" variant="ai" className="mt-5 w-full" loading={busy} icon={<KeyRound className="h-4 w-4" />}>
          Giriş yap
        </Button>
      </form>
    </div>
  );
}
