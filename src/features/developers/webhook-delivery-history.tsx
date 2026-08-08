"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { fetchAuthenticated } from "@/hooks/use-api-data";
import type { DeveloperRow } from "./types";

export function WebhookDeliveryHistory({ endpointId, onError }: { endpointId: unknown; onError: (message: string) => void }) {
  const [deliveries, setDeliveries] = useState<DeveloperRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetchAuthenticated("/v1/admin/developers/webhook-deliveries?limit=100")
      .then(async (response) => {
        if (!response.ok) throw new Error(`Webhook deliveries failed (${response.status})`);
        return (await response.json()) as DeveloperRow[];
      })
      .then((items) => active && setDeliveries(items.filter((item) => item.endpoint_id === endpointId)))
      .catch((reason) => active && onError(reason instanceof Error ? reason.message : "Unable to load webhook deliveries"))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [endpointId, onError]);

  async function retry(delivery: DeveloperRow) {
    const response = await fetchAuthenticated(`/v1/admin/developers/webhook-deliveries/${delivery.id}/retry`, { method: "POST" });
    if (!response.ok) {
      onError(`Retry failed (${response.status})`);
      return;
    }
    setDeliveries((items) => items.map((item) => item.id === delivery.id ? { ...item, status: "retrying", last_error: null } : item));
  }

  return (
    <section className="mt-4 border-t border-[var(--border)] pt-4">
      <header className="flex items-center justify-between"><h3 className="text-sm font-semibold">Delivery history</h3><span className="text-xs text-[var(--muted)]">{deliveries.length} attempts</span></header>
      {loading ? <p className="mt-3 text-xs text-[var(--muted)]">Loading delivery attempts…</p> : deliveries.length ? (
        <div className="mt-3 grid max-h-60 gap-2 overflow-auto">
          {deliveries.map((delivery) => {
            const failed = delivery.status === "dead_letter" || delivery.status === "failed";
            return <article className="grid grid-cols-[minmax(150px,1fr)_auto] items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface2)] p-3" key={String(delivery.id)}>
              <div className="min-w-0"><strong className="block truncate text-xs">{String(delivery.event_type || "Event")}</strong><small className="block truncate text-[10px] text-[var(--muted)]">{String(delivery.event_id || "")}</small></div>
              <span className={`dev-status ${delivery.status === "delivered" ? "good" : failed ? "bad" : "neutral"}`}>{String(delivery.status)}</span>
              <small className="text-[10px] text-[var(--muted)]">{Number(delivery.attempt_count || 0)} attempts · HTTP {String(delivery.last_status || "—")}</small>
              {failed && <button className="flex items-center justify-self-end gap-1 text-xs" type="button" onClick={() => retry(delivery)}><RefreshCw className="size-3" />Retry</button>}
              {Boolean(delivery.last_error) && <em className="col-span-2 text-xs not-italic text-red-400">{String(delivery.last_error)}</em>}
            </article>;
          })}
        </div>
      ) : <p className="mt-3 text-xs text-[var(--muted)]">No delivery attempts yet. Matching events will appear after the worker processes them.</p>}
    </section>
  );
}
