"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Activity,
  Bolt,
  CheckCircle2,
  Code2,
  Gauge,
  GripVertical,
  KeyRound,
  Link2,
  MoreHorizontal,
  RefreshCw,
  RotateCcw,
  Save,
  Settings2,
  TriangleAlert,
  Unplug,
  Webhook,
} from "lucide-react";
import { fetchAuthenticated } from "@/hooks/use-api-data";
import {
  DeveloperResourcePage,
  type ResourceView,
} from "./developer-resource-page";

type ResourceRow = Record<string, unknown>;
const metricDefinitions = [
  ["API Requests", "api_requests", Code2, "blue"],
  ["API Error Rate", "api_error_rate", TriangleAlert, "rose"],
  ["Avg API Latency", "avg_api_latency_ms", Gauge, "amber"],
  ["Webhook Success", "webhook_success_rate", Webhook, "green"],
  ["Active API Keys", "active_api_keys", KeyRound, "indigo"],
  ["Active Webhooks", "active_webhooks", CheckCircle2, "cyan"],
  ["Webhook Failures", "webhook_failures", Webhook, "rose"],
  ["Events Emitted", "events_emitted", Bolt, "indigo"],
] as const;
const resources = [
  { icon: KeyRound, label: "API Keys", view: "api-keys" },
  { icon: Webhook, label: "Webhooks", view: "webhooks" },
  { icon: Code2, label: "Logs", view: "logs" },
  { icon: Bolt, label: "Events", view: "events" },
  { icon: Unplug, label: "Sockets", view: "websockets" },
];
const defaultMetricOrder = metricDefinitions.map((definition) => definition[1]);
const defaultWidgetOrder = [
  "api-traffic",
  "webhook-health",
  "endpoint-health",
  "event-stream",
  "developer-activity",
  "quick-resources",
];
const dashboardLabels: Record<string, string> = {
  ...Object.fromEntries(
    metricDefinitions.map(([label, key]) => [key, label]),
  ),
  "api-traffic": "API Traffic",
  "webhook-health": "Webhook Delivery Health",
  "endpoint-health": "Endpoint Health",
  "event-stream": "Event Stream",
  "developer-activity": "Developer Activity",
  "quick-resources": "Quick Resources",
};
const preferencesKey = "droo-developers-dashboard-layout-v1";

export function DevelopersPage() {
  const searchParams = useSearchParams(),
    view = searchParams.get("view"),
    [period, setPeriod] = useState("30d"),
    [customizing, setCustomizing] = useState(false),
    [metricOrder, setMetricOrder] = useState<string[]>(defaultMetricOrder),
    [widgetOrder, setWidgetOrder] = useState<string[]>(defaultWidgetOrder),
    [hiddenItems, setHiddenItems] = useState<string[]>([]),
    [draggedItem, setDraggedItem] = useState(""),
    [revision, setRevision] = useState(0);
  const [live, setLive] = useState<{
      metrics: Record<string, number>;
      traffic: ResourceRow[];
      health: ResourceRow[];
      activity: ResourceRow[];
      events: ResourceRow[];
    }>({ metrics: {}, traffic: [], health: [], activity: [], events: [] }),
    [loadError, setLoadError] = useState("");
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const saved = JSON.parse(localStorage.getItem(preferencesKey) || "null");
        if (saved?.metricOrder) setMetricOrder(saved.metricOrder);
        if (saved?.widgetOrder) setWidgetOrder(saved.widgetOrder);
        if (saved?.hiddenItems) setHiddenItems(saved.hiddenItems);
      } catch {
        // Ignore invalid local preferences and use the default dashboard.
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => {
    let cancelled = false;
    Promise.all(
      ["metrics", "api-traffic", "endpoint-health", "activity", "events"].map(
        async (endpoint) => {
          const response = await fetchAuthenticated(
            `/v1/admin/developers/${endpoint}?period=${period}`,
          );
          if (!response.ok)
            throw new Error(`Developers API failed (${response.status})`);
          return response.json();
        },
      ),
    )
      .then(([metrics, traffic, health, activity, events]) => {
        if (!cancelled) {
          setLive({ metrics, traffic, health, activity, events });
          setLoadError("");
        }
      })
      .catch(
        (error) =>
          !cancelled &&
          setLoadError(
            error instanceof Error
              ? error.message
              : "Unable to load developer metrics",
          ),
      );
    return () => {
      cancelled = true;
    };
  }, [period, revision]);
  if (
    view &&
    ["api-keys", "webhooks", "websockets", "logs", "events"].includes(view)
  )
    return <DeveloperResourcePage view={view as ResourceView} />;
  const metrics = metricDefinitions.map(([label, key, Icon, tone]) => {
    const number = live.metrics[key],
      value =
        number === undefined
          ? "—"
          : key.includes("rate")
            ? `${number.toFixed(1)}%`
            : key === "avg_api_latency_ms"
              ? `${number.toFixed(0)}ms`
              : String(number);
    return [label, value, Icon, tone] as const;
  });
  const metricsByKey = new Map<string, (typeof metrics)[number]>(
    metrics.map((metric, index) => [metricDefinitions[index][1], metric]),
  );
  function saveLayout() {
    localStorage.setItem(
      preferencesKey,
      JSON.stringify({ metricOrder, widgetOrder, hiddenItems }),
    );
    setCustomizing(false);
  }
  function resetLayout() {
    setMetricOrder(defaultMetricOrder);
    setWidgetOrder(defaultWidgetOrder);
    setHiddenItems([]);
    localStorage.removeItem(preferencesKey);
  }
  function toggleItem(id: string) {
    setHiddenItems((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }
  function dropItem(target: string, group: "metrics" | "widgets") {
    if (!draggedItem || draggedItem === target) return;
    const update = group === "metrics" ? setMetricOrder : setWidgetOrder;
    update((current) => {
      if (!current.includes(draggedItem)) return current;
      const next = current.filter((item) => item !== draggedItem);
      next.splice(next.indexOf(target), 0, draggedItem);
      return next;
    });
    setDraggedItem("");
  }
  function dragProps(id: string, group: "metrics" | "widgets") {
    return customizing
      ? {
          draggable: true,
          onDragStart: () => setDraggedItem(id),
          onDragEnd: () => setDraggedItem(""),
          onDragOver: (event: React.DragEvent) => event.preventDefault(),
          onDrop: () => dropItem(id, group),
        }
      : {};
  }
  function renderWidget(id: string) {
    if (hiddenItems.includes(id)) return null;
    const shared = {
      customizing,
      dragProps: dragProps(id, "widgets"),
    };
    switch (id) {
      case "api-traffic":
        return (
          <Chart
            key={id}
            {...shared}
            title="API Traffic"
            subtitle="Request volume, successes, and errors"
            points={live.traffic}
          />
        );
      case "webhook-health":
        return (
          <Chart
            key={id}
            {...shared}
            title="Webhook Delivery Health"
            subtitle="Delivery volume, retries, and failures"
            empty={!live.health.length}
          />
        );
      case "endpoint-health":
        return (
          <Panel
            key={id}
            {...shared}
            title="Endpoint Health"
            subtitle="Recent webhook endpoint reliability"
            icon={<Activity />}
          >
            {live.health.length ? (
              <div className="dev-ranked">
                {live.health.map((row) => (
                  <p key={String(row.endpoint_id)}>
                    <span>{String(row.url)}</span>
                    <b>{Number(row.success_rate || 0).toFixed(1)}%</b>
                  </p>
                ))}
              </div>
            ) : (
              <Empty icon={<Webhook />} title="No endpoint activity" text="Webhook delivery health will appear here." />
            )}
          </Panel>
        );
      case "event-stream":
        return (
          <Panel key={id} {...shared} title="Event Stream" subtitle="Top event types and sources" icon={<Bolt />}>
            {live.events.length ? (
              <div className="dev-ranked">
                <small>RECENT EVENTS</small>
                {live.events.slice(0, 8).map((row) => (
                  <p key={String(row.id)}><span>{String(row.event_type)}</span><b>{String(row.aggregate_type)}</b></p>
                ))}
              </div>
            ) : (
              <Empty icon={<Bolt />} title="No events emitted" text="Business events will appear here." />
            )}
          </Panel>
        );
      case "developer-activity":
        return (
          <Panel key={id} {...shared} title="Developer Activity" subtitle="Recent logs, webhooks, and events" icon={<RefreshCw />}>
            <div className="dev-activity">
              {live.activity.map((row) => (
                <div key={String(row.id)}><i>{String(row.kind).toUpperCase()}</i><p><b>{String(row.description)}</b><span>{String(row.status)} Â· {new Date(String(row.occurred_at)).toLocaleString()}</span></p></div>
              ))}
            </div>
          </Panel>
        );
      case "quick-resources":
        return (
          <Panel key={id} {...shared} title="Quick Resources" subtitle="Jump into developer tools" icon={<Link2 />}>
            <nav className="dev-links">
              {resources.map(({ icon: Icon, label, view: resourceView }) => (
                <Link key={label} href={`/developers?view=${resourceView}`}><Icon /><span>{label}</span><b>â†’</b></Link>
              ))}
            </nav>
          </Panel>
        );
      default:
        return null;
    }
  }
  return (
    <div className={`dev-console ${customizing ? "customizing" : ""}`}>
      <header className="dev-head">
        <div>
          <h1>Developers Dashboard</h1>
          <p>{loadError || "Developer dashboard and API health overview."}</p>
        </div>
        <nav>
          <label>
            Period{" "}
            <select
              value={period}
              onChange={(event) => setPeriod(event.target.value)}
            >
              <option>24h</option>
              <option>7d</option>
              <option>30d</option>
              <option>90d</option>
            </select>
          </label>
          <button onClick={() => setRevision((value) => value + 1)}>
            <RefreshCw />
            Refresh
          </button>
          <button
            className={customizing ? "primary" : ""}
            onClick={() => (customizing ? saveLayout() : setCustomizing(true))}
          >
            {customizing ? <Save /> : <Settings2 />}
            {customizing ? "Save layout" : "Customize"}
          </button>
        </nav>
      </header>
      <main className="dev-body">
        {customizing && (
          <section className="dev-customizer" aria-label="Customize dashboard">
            <div>
              <GripVertical />
              <p>
                <strong>Customize dashboard</strong>
                <span>Drag visible cards to reorder them. Changes are saved on this device.</span>
              </p>
            </div>
            <div className="dev-customizer-items">
              {[...defaultMetricOrder, ...defaultWidgetOrder].map((id) => (
                <label key={id}>
                  <input type="checkbox" checked={!hiddenItems.includes(id)} onChange={() => toggleItem(id)} />
                  {dashboardLabels[id]}
                </label>
              ))}
            </div>
            <button type="button" onClick={resetLayout}><RotateCcw />Reset default</button>
          </section>
        )}
        <section className="dev-kpis">
          {metricOrder.map((id) => {
            const metric = metricsByKey.get(id);
            if (!metric || hiddenItems.includes(id)) return null;
            const [label, value, Icon, tone] = metric;
            return (
            <article className={`dev-kpi ${tone} ${draggedItem === id ? "dragging" : ""}`} key={id} {...dragProps(id, "metrics")}>
              {customizing && <GripVertical className="dev-drag-handle" />}
              <header>
                <span>{label}</span>
                <Icon />
              </header>
              <strong>{value}</strong>
              <footer>
                <span>{period} · Current</span>
                <small>Updated now</small>
              </footer>
            </article>
            );
          })}
        </section>
        {false && <section className="dev-grid">
          <Panel
            title="Endpoint Health"
            subtitle="Recent webhook endpoint reliability"
            icon={<Activity />}
          >
            {live.health.length ? (
              <div className="dev-ranked">
                {live.health.map((row) => (
                  <p key={String(row.endpoint_id)}>
                    <span>{String(row.url)}</span>
                    <b>{Number(row.success_rate || 0).toFixed(1)}%</b>
                  </p>
                ))}
              </div>
            ) : (
              <Empty
                icon={<Webhook />}
                title="No endpoint activity"
                text="Webhook delivery health will appear here."
              />
            )}
          </Panel>
          <Panel
            title="Event Stream"
            subtitle="Top event types and sources"
            icon={<Bolt />}
          >
            {live.events.length ? (
              <div className="dev-ranked">
                <small>RECENT EVENTS</small>
                {live.events.slice(0, 8).map((row) => (
                  <p key={String(row.id)}>
                    <span>{String(row.event_type)}</span>
                    <b>{String(row.aggregate_type)}</b>
                  </p>
                ))}
              </div>
            ) : (
              <Empty
                icon={<Bolt />}
                title="No events emitted"
                text="Business events will appear here."
              />
            )}
          </Panel>
          <Panel
            title="Developer Activity"
            subtitle="Recent logs, webhooks, and events"
            icon={<RefreshCw />}
          >
            <div className="dev-activity">
              {live.activity.map((row) => (
                <div key={String(row.id)}>
                  <i>{String(row.kind).toUpperCase()}</i>
                  <p>
                    <b>{String(row.description)}</b>
                    <span>
                      {String(row.status)} ·{" "}
                      {new Date(String(row.occurred_at)).toLocaleString()}
                    </span>
                  </p>
                </div>
              ))}
            </div>
          </Panel>
          <Panel
            title="Quick Resources"
            subtitle="Jump into developer tools"
            icon={<Link2 />}
          >
            <nav className="dev-links">
              {resources.map(({ icon: Icon, label, view }) => (
                <Link key={label} href={`/developers?view=${view}`}>
                  <Icon />
                  <span>{label}</span>
                  <b>→</b>
                </Link>
              ))}
            </nav>
          </Panel>
        </section>}
        <section className="dev-grid">{widgetOrder.map(renderWidget)}</section>
      </main>
    </div>
  );
}
function Chart({
  title,
  subtitle,
  empty = false,
  points = [],
  customizing = false,
  dragProps = {},
}: {
  title: string;
  subtitle: string;
  empty?: boolean;
  points?: ResourceRow[];
  customizing?: boolean;
  dragProps?: React.HTMLAttributes<HTMLElement>;
}) {
  const plotted = points.length
    ? points
        .map(
          (point, index) =>
            `${points.length === 1 ? 180 : (index * 360) / (points.length - 1)},${130 - Math.min(110, Number(point.requests || 0) * 5)}`,
        )
        .join(" ")
    : "";
  return (
    <article className="dev-widget dev-chart" {...dragProps}>
      {customizing && <GripVertical className="dev-drag-handle" />}
      <WidgetHeader
        title={title}
        subtitle={subtitle}
        icon={<MoreHorizontal />}
      />
      <div className="dev-chart-body">
        {empty || !points.length ? (
          <Empty
            icon={<Activity />}
            title="No activity data"
            text="Recorded activity will appear here."
          />
        ) : (
          <>
            <div className="dev-legend">
              <span>
                <i />
                Requests
              </span>
              <span>
                <i />
                Success
              </span>
              <span>
                <i />
                Errors
              </span>
            </div>
            <svg viewBox="0 0 360 140" preserveAspectRatio="none">
              {[25, 60, 95, 130].map((y) => (
                <line key={y} x1="0" x2="360" y1={y} y2={y} />
              ))}
              <polyline points={plotted} />
            </svg>
            <footer>
              <span>
                {new Date(String(points[0]?.bucket)).toLocaleDateString()}
              </span>
              <span>
                {new Date(String(points.at(-1)?.bucket)).toLocaleDateString()}
              </span>
            </footer>
          </>
        )}
      </div>
    </article>
  );
}
function WidgetHeader({
  title,
  subtitle,
  icon,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
}) {
  return (
    <header className="dev-widget-head">
      <div>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
      <button aria-label={`${title} options`}>{icon}</button>
    </header>
  );
}
function Panel({
  title,
  subtitle,
  icon,
  children,
  customizing = false,
  dragProps = {},
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  customizing?: boolean;
  dragProps?: React.HTMLAttributes<HTMLElement>;
}) {
  return (
    <article className="dev-widget dev-panel" {...dragProps}>
      {customizing && <GripVertical className="dev-drag-handle" />}
      <WidgetHeader title={title} subtitle={subtitle} icon={icon} />
      <div className="dev-panel-body">{children}</div>
    </article>
  );
}
function Empty({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="dev-empty">
      {icon}
      <b>{title}</b>
      <span>{text}</span>
    </div>
  );
}
