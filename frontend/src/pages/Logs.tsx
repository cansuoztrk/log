import { ScrollText } from "lucide-react";
import { useState } from "react";
import { EventFeed } from "../components/domain";
import { Card, CardHeader, Segmented } from "../components/ui";
import { useLive } from "../lib/live";
import type { BotEvent } from "../lib/types";

const FILTERS: Record<string, { label: string; fn?: (e: BotEvent) => boolean }> = {
  all: { label: "Tümü" },
  trade: { label: "İşlemler", fn: (e) => e.kind === "trade" || e.kind === "order" },
  signal: { label: "Sinyaller", fn: (e) => e.kind === "signal" },
  risk: { label: "Risk", fn: (e) => e.kind === "risk" },
  model: { label: "Model", fn: (e) => e.kind === "model" },
  error: { label: "Hatalar", fn: (e) => e.level === "error" || e.level === "critical" || e.level === "warning" },
};

export default function Logs() {
  const { events } = useLive();
  const [f, setF] = useState("all");
  return (
    <Card>
      <CardHeader
        title="Olay günlüğü"
        subtitle="Botun aldığı her karar, emir ve uyarı"
        icon={<ScrollText className="h-4 w-4" />}
        right={<Segmented size="sm" value={f} onChange={setF} options={Object.entries(FILTERS).map(([value, v]) => ({ value, label: v.label }))} />}
      />
      <div className="px-3 pb-3">
        <EventFeed events={events} limit={300} filter={FILTERS[f].fn} />
      </div>
    </Card>
  );
}
