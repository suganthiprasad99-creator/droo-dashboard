"use client";

import { useEffect, useState } from "react";
import { Copy, Unplug } from "lucide-react";
import { fetchAuthenticated } from "@/hooks/use-api-data";
import type { DeveloperRow } from "./types";

export function SocketChannelViewer({ channel, onBack }: { channel: string; onBack: () => void }) {
  const [events, setEvents] = useState<DeveloperRow[]>([]);
  const [connected, setConnected] = useState(true);
  useEffect(() => {
    let active = true;
    async function poll() {
      try {
        const response = await fetchAuthenticated("/v1/admin/developers/events?limit=100");
        if (!response.ok) throw new Error("Event feed unavailable");
        const rows = (await response.json()) as DeveloperRow[];
        if (active) setEvents(rows.filter((row) => channel.startsWith("company.") || channel.startsWith("api.") || `${row.aggregate_type}.${row.aggregate_id}` === channel));
        if (active) setConnected(true);
      } catch { if (active) setConnected(false); }
    }
    poll();
    const timer = window.setInterval(poll, 3000);
  return () => { active = false; window.clearInterval(timer); };
  }, [channel]);
  return <div className="dev-resource-page">
    <header className="dev-resource-head"><h1>{channel}</h1><nav><button onClick={onBack}>Back</button><button onClick={() => navigator.clipboard?.writeText(channel)}><Copy />Copy channel</button></nav></header>
    <section className="m-4 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
      <header className="border-b border-[var(--border)] p-4"><h2 className="font-semibold">Output</h2><p className="text-xs text-[var(--muted)]">{connected ? "Connected to live event feed" : "Connection interrupted"}</p></header>
      <div className="max-h-[calc(100vh-230px)] overflow-auto p-4">
        {events.length ? events.map((row) => <article className="flex gap-3 border-b border-[var(--border)] py-3" key={String(row.id)}><i className="rounded bg-[var(--surface2)] px-2 py-1 text-xs not-italic">{String(row.event_type)}</i><p className="m-0 flex flex-col"><b className="text-xs">{String(row.event_type)} · {String(row.aggregate_type)} ({String(row.aggregate_id)})</b><span className="text-[10px] text-[var(--muted)]">{new Date(String(row.occurred_at)).toLocaleString()}</span></p></article>) : <div className="grid min-h-52 place-content-center text-center text-[var(--muted)]"><Unplug className="mx-auto mb-2"/><b>Awaiting events…</b><span className="text-xs">Events received on this channel will appear here.</span></div>}
      </div>
    </section>
  </div>;
}
