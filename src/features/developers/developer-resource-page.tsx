"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Bolt,
  Check,
  Columns3,
  Copy,
  Download,
  Eye,
  FileText,
  Filter,
  Headphones,
  Info,
  KeyRound,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  Trash2,
  Unplug,
  Webhook,
  X,
} from "lucide-react";
import { fetchAuthenticated } from "@/hooks/use-api-data";
import { useRouter } from "next/navigation";
import type { DeveloperRow as Row, ResourceView } from "./types";
import { WebhookDeliveryHistory } from "./webhook-delivery-history";
import { SocketChannelViewer } from "./socket-channel-viewer";

export type { ResourceView } from "./types";
type Modal = "create" | "filter" | "columns" | "detail" | null;
const eventGroups: Record<string, string[]> = {
  Order: ["order.created", "order.ready", "order.updated", "order.deleted", "order.dispatched", "order.dispatch_failed", "order.failed", "order.driver_assigned", "order.completed", "order.canceled", "order.published", "order.accepted", "order.picked_up", "order.delivered", "order.cancelled"],
  Payload: ["payload.created", "payload.updated", "payload.deleted"],
  Entity: ["entity.created", "entity.updated", "entity.deleted", "entity.driver_assigned", "entity.activity", "entity.completed"],
  Waypoint: ["waypoint.activity", "waypoint.completed"],
  Driver: ["driver.created", "driver.updated", "driver.deleted", "driver.assigned", "driver.location_changed", "driver.arrived_pickup", "driver.arrived_dropoff"],
  Fleet: ["fleet.created", "fleet.updated", "fleet.deleted"],
  "Purchase rate": ["purchase_rate.created", "purchase_rate.updated", "purchase_rate.deleted"],
  Contact: ["contact.created", "contact.updated", "contact.deleted"],
  Place: ["place.created", "place.updated", "place.deleted"],
  "Service area": ["service_area.created", "service_area.updated", "service_area.deleted"],
  "Service quote": ["service_quote.created", "service_quote.updated", "service_quote.deleted"],
  "Service rate": ["service_rate.created", "service_rate.updated", "service_rate.deleted"],
  "Tracking number": ["tracking_number.created", "tracking_number.updated", "tracking_number.deleted"],
  "Tracking status": ["tracking_status.created", "tracking_status.updated", "tracking_status.deleted"],
  Vehicle: ["vehicle.created", "vehicle.updated", "vehicle.deleted", "vehicle.location_changed"],
  Vendor: ["vendor.created", "vendor.updated", "vendor.deleted"],
  Zone: ["zone.created", "zone.updated", "zone.deleted"],
};
const availableEvents = Object.values(eventGroups).flat();
const config: Record<ResourceView, { title: string; columns: string[] }> = {
  "api-keys": {
    title: "API Keys",
    columns: [
      "Name",
      "Public Key",
      "Secret Key",
      "Environment",
      "Expiry",
      "Last Used",
      "Created",
    ],
  },
  webhooks: {
    title: "Webhooks",
    columns: ["URL", "Status", "Mode", "Version", "Created"],
  },
  websockets: { title: "WebSockets", columns: ["", "Channel"] },
  logs: {
    title: "Logs",
    columns: [
      "Description",
      "Status",
      "ID",
      "API Credential",
      "HTTP Method",
      "Version",
      "Date",
    ],
  },
  events: { title: "Events", columns: ["Event", "Code", "ID", "Date"] },
};
const aliases: Record<string, string[]> = {
  Name: ["name"],
  "Public Key": ["public_key"],
  "Secret Key": ["secret_key"],
  Environment: ["environment"],
  Expiry: ["expires_at"],
  "Last Used": ["last_used_at"],
  Created: ["created_at"],
  URL: ["url"],
  Status: ["status", "active"],
  Mode: ["mode"],
  Version: ["version"],
  Channel: ["channel"],
  Description: ["description", "path"],
  ID: ["id"],
  "API Credential": ["api_credential_name"],
  "HTTP Method": ["method"],
  Date: ["occurred_at", "created_at"],
  Event: ["description", "event_type"],
  Code: ["event_type"],
};
function display(row: Row, column: string) {
  if (column === "Description" && row.method && row.path)
    return `${row.method} ${row.path}`;
  if (column === "Event" && row.event_type) return eventDescription(row);
  if (column === "Status" && typeof row.active === "boolean")
    return row.active ? "Enabled" : "Disabled";
  for (const key of [column, ...(aliases[column] || [])]) {
    const current = row[key];
    if (current !== undefined && current !== null && current !== "") {
      if (
        ["Created", "Last Used", "Date", "Expiry"].includes(column) &&
        typeof current === "string"
      ) {
        const date = new Date(current);
        if (!Number.isNaN(date.valueOf())) return date.toLocaleString();
      }
      return typeof current === "object"
        ? JSON.stringify(current)
        : String(current);
    }
  }
  return column === "Secret Key"
    ? "••••••••••••••••"
    : column === "Expiry"
      ? "Never"
      : "—";
}
function eventDescription(row: Row) {
  const type = String(row.event_type || "Event emitted"),
    entity = String(row.aggregate_type || "resource"),
    id = String(row.aggregate_id || "");
  return `${type} · ${entity}${id ? ` (${id})` : ""}`;
}
function endpoint(view: ResourceView) {
  return view === "api-keys"
    ? "api-keys"
    : view === "webhooks"
      ? "webhooks"
      : view === "websockets"
        ? "channels"
      : view === "logs"
        ? "logs"
        : "events";
}

export function DeveloperResourcePage({ view }: { view: ResourceView }) {
  const meta = config[view],
    [rows, setRows] = useState<Row[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [revision, setRevision] = useState(0),
    [query, setQuery] = useState(""),
    [testMode, setTestMode] = useState(false),
    [modal, setModal] = useState<Modal>(null),
    [selected, setSelected] = useState<Row | null>(null),
    [visibleColumns, setVisibleColumns] = useState(meta.columns),
    [statusFilter, setStatusFilter] = useState("all"),
    [credentialFilter, setCredentialFilter] = useState(() =>
      typeof window === "undefined"
        ? ""
        : new URLSearchParams(window.location.search).get("credential") || "",
    ),
    [methodFilter, setMethodFilter] = useState(""),
    [versionFilter, setVersionFilter] = useState(""),
    [fromDate, setFromDate] = useState(""),
    [page, setPage] = useState(1),
    [pageSize, setPageSize] = useState(20),
    [channel, setChannel] = useState("");
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const response = await fetchAuthenticated(
          `/v1/admin/developers/${endpoint(view)}?limit=100`,
        );
        if (!response.ok)
          throw new Error(`${meta.title} API failed (${response.status})`);
        const body = (await response.json()) as Row[];
        if (!cancelled) setRows(body);
      } catch (reason) {
        if (!cancelled)
          setError(
            reason instanceof Error
              ? reason.message
              : `Unable to load ${meta.title.toLowerCase()}`,
          );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [view, meta.title, revision, testMode]);
  const filtered = useMemo(
    () =>
      rows.filter((row) => {
        const matchesSearch =
            !query ||
            Object.values(row).some((item) =>
              String(item ?? "")
                .toLowerCase()
                .includes(query.toLowerCase()),
            ),
          status = Number(row.status || 0),
          matchesStatus =
            statusFilter === "all" ||
            (statusFilter === "success"
              ? status > 0 && status < 400
              : status >= 400),
          matchesCredential =
            !credentialFilter ||
            String(row.api_credential_name || "") === credentialFilter,
          matchesMethod =
            !methodFilter || String(row.method || "") === methodFilter,
          matchesVersion =
            !versionFilter || String(row.version || "") === versionFilter,
          occurred = String(row.occurred_at || row.created_at || ""),
          matchesDate =
            !fromDate || occurred >= new Date(fromDate).toISOString();
        return (
          matchesSearch &&
          matchesStatus &&
          matchesCredential &&
          matchesMethod &&
          matchesVersion &&
          matchesDate
        );
      }),
    [
      rows,
      query,
      statusFilter,
      credentialFilter,
      methodFilter,
      versionFilter,
      fromDate,
    ],
  );
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize)),
    safePage = Math.min(page, pages),
    pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize),
    reload = () => setRevision((current) => current + 1);
  function openDetail(row: Row) {
    if (view === "websockets") {
      setChannel(String(row.channel || ""));
      return;
    }
    setSelected(row);
    setModal("detail");
  }
  function exportRows() {
    const header = visibleColumns.join(","),
      lines = filtered.map((row) =>
        visibleColumns
          .map((column) => JSON.stringify(display(row, column)))
          .join(","),
      ),
      link = document.createElement("a");
    link.href = URL.createObjectURL(
      new Blob([[header, ...lines].join("\n")], { type: "text/csv" }),
    );
    link.download = `droo-${view}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }
  if (view === "websockets" && channel)
    return <SocketChannelViewer channel={channel} onBack={() => setChannel("")} />;
  return (
    <div className="dev-resource-page">
      <header className="dev-resource-head">
        <h1>
          {view === "websockets"
            ? "Channels receiving events from your account"
            : meta.title}
        </h1>
        {error && <span className="dev-resource-error">{error}</span>}
        {view !== "websockets" && (
          <div className="dev-resource-search">
            <Search />
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder={`Search ${meta.title}...`}
            />
            {query && (
              <button onClick={() => setQuery("")}>
                <X />
              </button>
            )}
          </div>
        )}
        <nav>
          {view === "api-keys" && (
            <label className="dev-toggle">
              <input
                type="checkbox"
                checked={testMode}
                onChange={(event) => setTestMode(event.target.checked)}
              />
              <i />
              <span>View test data</span>
            </label>
          )}
          <button title="Reload data" onClick={reload}>
            <RefreshCw className={loading ? "spin" : ""} />
          </button>
          {(view === "logs" || view === "events") && (
            <>
              <div className="dev-filter-popover">
                <button
                  type="button"
                  className="dev-filter-trigger"
                  aria-expanded={modal === "filter"}
                  onClick={() =>
                    setModal((current) =>
                      current === "filter" ? null : "filter",
                    )
                  }
                >
                  <Filter />
                  Filter
                </button>
                {modal === "filter" && (
                  <section className="dev-filter-menu">
                    <header>
                      <h2>Filters</h2>
                    </header>
                    <div className="dev-filter-grid">
                      <label>
                        API Credential
                        <select
                          value={credentialFilter}
                          onChange={(event) =>
                            setCredentialFilter(event.target.value)
                          }
                        >
                          <option value="">API Credential</option>
                          {Array.from(
                            new Set(
                              rows
                                .map((row) =>
                                  String(row.api_credential_name || ""),
                                )
                                .filter(Boolean),
                            ),
                          ).map((credential) => (
                            <option key={credential} value={credential}>
                              {credential}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        HTTP Method
                        <select
                          value={methodFilter}
                          onChange={(event) =>
                            setMethodFilter(event.target.value)
                          }
                        >
                          <option value="">HTTP Method</option>
                          {Array.from(
                            new Set(
                              rows
                                .map((row) => String(row.method || ""))
                                .filter(Boolean),
                            ),
                          ).map((method) => (
                            <option key={method} value={method}>
                              {method}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Version
                        <select
                          value={versionFilter}
                          onChange={(event) =>
                            setVersionFilter(event.target.value)
                          }
                        >
                          <option value="">Version</option>
                          {Array.from(
                            new Set(
                              rows
                                .map((row) => String(row.version || ""))
                                .filter(Boolean),
                            ),
                          ).map((version) => (
                            <option key={version} value={version}>
                              {version}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Date
                        <input
                          type="date"
                          value={fromDate}
                          onChange={(event) => setFromDate(event.target.value)}
                        />
                      </label>
                    </div>
                    <footer>
                      <button
                        type="button"
                        onClick={() => {
                          setStatusFilter("all");
                          setCredentialFilter("");
                          setMethodFilter("");
                          setVersionFilter("");
                          setFromDate("");
                        }}
                      >
                        <Trash2 />
                        Clear
                      </button>
                      <button
                        type="button"
                        className="primary"
                        onClick={() => setModal(null)}
                      >
                        <Check />
                        Apply
                      </button>
                    </footer>
                  </section>
                )}
              </div>
              <div className="dev-columns-popover">
                <button
                  type="button"
                  className="dev-columns-trigger"
                  title="Select viewable columns"
                  aria-expanded={modal === "columns"}
                  onClick={() =>
                    setModal((current) =>
                      current === "columns" ? null : "columns",
                    )
                  }
                >
                  <Columns3 />
                  Columns
                </button>
                {modal === "columns" && (
                  <section className="dev-columns-menu">
                    <header>
                      <h2>Customize Columns</h2>
                      <button type="button" onClick={() => setModal(null)}>
                        <Check />
                        Done
                      </button>
                    </header>
                    <div className="dev-columns-grid">
                      {meta.columns.map((column) => (
                        <label key={column}>
                          <input
                            type="checkbox"
                            checked={visibleColumns.includes(column)}
                            onChange={() =>
                              setVisibleColumns((current) =>
                                current.includes(column)
                                  ? current.filter((item) => item !== column)
                                  : [...current, column],
                              )
                            }
                          />
                          {column}
                        </label>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            </>
          )}
          {(view === "api-keys" ||
            view === "webhooks" ||
            view === "websockets") && (
            <button
              className={view === "websockets" ? "magic" : "primary"}
              onClick={() => setModal("create")}
            >
              {view === "websockets" ? <Headphones /> : <Plus />}
              {view === "api-keys"
                ? "New"
                : view === "webhooks"
                  ? "Add new endpoint"
                  : "Listen on custom channel"}
            </button>
          )}
          {view === "api-keys" && (
            <button onClick={exportRows}>
              <Download />
              Export
            </button>
          )}
        </nav>
      </header>
      <section className="dev-table-shell">
        <div className="dev-table-scroll">
          <table>
            <thead>
              <tr>
                {view === "api-keys" && (
                  <th>
                    <input type="checkbox" aria-label="Select all API keys" />
                  </th>
                )}
                {visibleColumns.map((column) => (
                  <th key={column}>{column}</th>
                ))}
                <th />
              </tr>
            </thead>
            <tbody>
              {pageRows.map((row, index) => (
                <tr
                  key={String(row.id || row.channel || index)}
                  onClick={() => openDetail(row)}
                >
                  {view === "api-keys" && (
                    <td onClick={(event) => event.stopPropagation()}>
                      <input
                        type="checkbox"
                        aria-label={`Select ${display(row, "Name")}`}
                      />
                    </td>
                  )}
                  {visibleColumns.map((column) => (
                    <Cell key={column} row={row} column={column} />
                  ))}
                  <td>
                    <button
                      className="dev-row-action"
                      onClick={(event) => {
                        event.stopPropagation();
                        openDetail(row);
                      }}
                    >
                      {view === "websockets" ? <Eye /> : <MoreHorizontal />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && !pageRows.length && <Empty view={view} query={query} />}
        </div>
        <footer>
          <span>
            Showing {pageRows.length ? (safePage - 1) * pageSize + 1 : 0} to{" "}
            {Math.min(safePage * pageSize, filtered.length)} of{" "}
            {filtered.length}
          </span>
          <nav>
            <button
              disabled={safePage === 1}
              onClick={() => setPage((current) => current - 1)}
            >
              ‹
            </button>
            <button className="active">{safePage}</button>
            <button
              disabled={safePage === pages}
              onClick={() => setPage((current) => current + 1)}
            >
              ›
            </button>
          </nav>
          <select
            value={pageSize}
            onChange={(event) => {
              setPageSize(Number(event.target.value));
              setPage(1);
            }}
          >
            <option value="20">20 per page</option>
            <option value="50">50 per page</option>
          </select>
        </footer>
      </section>
      {modal === "create" && (
        <CreateModal
          view={view}
          onClose={() => setModal(null)}
          onCreated={(created) => {
            if (view === "websockets") {
              setChannel(String(created.channel));
              setModal(null);
            } else {
              setSelected(created);
              setModal("detail");
              reload();
            }
          }}
          onError={setError}
        />
      )}{" "}
      {modal === "detail" && selected && (
        <DetailModal
          row={selected}
          view={view}
          onClose={() => setModal(null)}
          onChanged={() => {
            setModal(null);
            reload();
          }}
          onError={setError}
        />
      )}
    </div>
  );
}
function Cell({ row, column }: { row: Row; column: string }) {
  const shown = display(row, column);
  if (column === "Status")
    return (
      <td>
        <span
          className={`dev-status ${Number(row.status) >= 400 ? "bad" : "good"}`}
        >
          {shown}
        </span>
      </td>
    );
  if (column === "Environment" || column === "Mode")
    return (
      <td>
        <span className="dev-status neutral">{shown}</span>
      </td>
    );
  if (column === "Public Key" || column === "ID" || column === "Channel")
    return (
      <td>
        <button
          className="dev-copy"
          onClick={(event) => {
            event.stopPropagation();
            navigator.clipboard?.writeText(shown);
          }}
        >
          {shown}
          <Copy />
        </button>
      </td>
    );
  return <td>{shown}</td>;
}
function Empty({ view, query }: { view: ResourceView; query: string }) {
  const Icon =
    view === "api-keys"
      ? KeyRound
      : view === "webhooks"
        ? Webhook
        : view === "websockets"
          ? Unplug
          : view === "logs"
            ? FileText
            : Bolt;
  return (
    <div className="dev-empty">
      <Icon />
      <b>No {config[view].title.toLowerCase()} found</b>
      <span>
        {query
          ? "Try a different search."
          : "Developer resources will appear here."}
      </span>
    </div>
  );
}
function CreateModal({
  view,
  onClose,
  onCreated,
  onError,
}: {
  view: ResourceView;
  onClose: () => void;
  onCreated: (row: Row) => void;
  onError: (message: string) => void;
}) {
  const [events, setEvents] = useState<string[]>([]),
    [eventPickerOpen, setEventPickerOpen] = useState(false),
    [eventSearch, setEventSearch] = useState(""),
    [credentials, setCredentials] = useState<Row[]>([]),
    [submitting, setSubmitting] = useState(false);
  useEffect(() => {
    if (view !== "webhooks") return;
    fetchAuthenticated("/v1/admin/developers/api-keys")
      .then(async (response) => response.ok ? (await response.json()) as Row[] : [])
      .then(setCredentials)
      .catch(() => setCredentials([]));
  }, [view]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSubmitting(true);
    try {
      if (view === "websockets") {
        const channel = String(form.get("channel") || "").trim();
        if (!channel) throw new Error("Enter an event channel ID.");
        onCreated({ channel });
        return;
      }
      const body =
        view === "api-keys"
          ? {
              name: String(form.get("name") || ""),
              scopes: ["orders:read", "orders:write", "webhooks:write"],
              expires_at: expiry(String(form.get("expiration") || "never")),
            }
          : {
              url: String(form.get("url") || ""),
              description: String(form.get("description") || "") || null,
              api_credential_id: String(form.get("api_credential_id") || "") || null,
              api_version: String(form.get("api_version") || "v1"),
              events,
            };
      if (view === "webhooks" && !events.length)
        throw new Error("Select at least one webhook event.");
      const response = await fetchAuthenticated(
          `/v1/admin/developers/${view}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          },
        ),
        result = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(
          String(
            (result as Row).detail ||
              (result as Row).title ||
              `Create failed (${response.status})`,
          ),
        );
      onCreated(result as Row);
    } catch (reason) {
      onError(
        reason instanceof Error ? reason.message : "Unable to create resource",
      );
    } finally {
      setSubmitting(false);
    }
  }
  const title =
    view === "api-keys"
      ? "New API Key"
      : view === "webhooks"
        ? "Add a webhook endpoint"
        : "Listen on a custom channel";
  return (
    <form onSubmit={submit}>
      <SimpleModal
        title={title}
        accept={
          view === "webhooks"
            ? "Confirm & Create"
            : view === "websockets"
              ? "Listen"
              : "Confirm"
        }
        onClose={onClose}
        submitting={submitting}
        formMode
        variant={
          view === "api-keys"
            ? "api-key"
            : view === "webhooks"
              ? "webhook"
              : "default"
        }
      >
        {view === "api-keys" && (
          <>
            <label>
              Name
              <input
                name="name"
                required
                maxLength={120}
                placeholder="Enter a nickname or environment name for API Key"
              />
            </label>
            <label>
              <span className="api-key-label">
                Expiration <Info aria-label="Expiration information" />
              </span>
              <select name="expiration" defaultValue="" required>
                <option value="" disabled>
                  Select an expiration date...
                </option>
                <option value="never">Never</option>
                <option value="immediately">Immediately</option>
                <option value="1h">In 1 hour</option>
                <option value="24h">In 24 hours</option>
                <option value="3d">In 3 days</option>
                <option value="7d">In 7 days</option>
              </select>
            </label>
            <p className="api-key-help">
              Once this key expires, you can&apos;t perform any actions with it.
            </p>
            <span className="api-key-live-badge">
              <i />
              Live Key
            </span>
            <p className="api-key-production-note">
              You are creating a live environment key, use this for production
              environments.
            </p>
          </>
        )}
        {view === "webhooks" && (
          <>
            <label>
              Endpoint URL*
              <input name="url" type="url" required placeholder="https://" />
            </label>
            <label>
              Description
              <textarea
                name="description"
                maxLength={200}
                placeholder="An optional description of what this endpoint is used for."
              />
            </label>
            <label>
              API Credential
              <select name="api_credential_id">
                <option value="">Receive from all API Credentials...</option>
                {credentials.map((credential) => <option key={String(credential.id)} value={String(credential.id)}>{String(credential.name)} ({String(credential.public_key)})</option>)}
              </select>
            </label>
            <label>
              Version
              <select name="api_version" defaultValue="v1">
                <option value="v1">v1</option>
              </select>
            </label>
            <fieldset className="webhook-events-fieldset">
              <legend>Events to send</legend>
              <div className="webhook-event-actions">
                <button
                  type="button"
                  className="webhook-event-trigger"
                  aria-expanded={eventPickerOpen}
                  onClick={() => setEventPickerOpen((current) => !current)}
                >
                  {events.length ? `${events.length} events selected` : "Select events..."}
                  <span>⌄</span>
                </button>
                <button type="button" className="webhook-events-clear" onClick={() => setEvents([])}>Clear</button>
              </div>
              {eventPickerOpen && (
                <div className="webhook-event-picker">
                  <input
                    aria-label="Search events"
                    value={eventSearch}
                    onChange={(event) => setEventSearch(event.target.value)}
                    placeholder="Search events..."
                  />
                  <div className="webhook-event-groups">
                    {Object.entries(eventGroups).map(([group, names]) => {
                      const matching = names.filter((name) => name.toLowerCase().includes(eventSearch.toLowerCase()));
                      if (!matching.length) return null;
                      return (
                        <section key={group}>
                          <header><strong>{group}</strong><span>{matching.length} events</span></header>
                          {matching.map((name) => (
                            <label key={name}>
                              <input
                                type="checkbox"
                                checked={events.includes(name)}
                                onChange={() => setEvents((current) => current.includes(name) ? current.filter((item) => item !== name) : [...current, name])}
                              />
                              {name}
                            </label>
                          ))}
                        </section>
                      );
                    })}
                  </div>
                </div>
              )}
              <div className="webhook-selected-events">
                {events.length ? events.map((name) => (
                  <button key={name} type="button" onClick={() => setEvents((current) => current.filter((item) => item !== name))}>
                    {name}<X />
                  </button>
                )) : (
                  <p><strong>No events selected</strong><span>Search for events above, or <button type="button" onClick={() => setEvents(availableEvents)}>receive all events.</button></span></p>
                )}
              </div>
            </fieldset>
          </>
        )}
        {view === "websockets" && (
          <label>
            Event channel ID
            <input name="channel" required placeholder="organization.events" />
          </label>
        )}
      </SimpleModal>
    </form>
  );
}
function expiry(option: string) {
  if (option === "never") return null;
  const amounts: Record<string, number> = {
    immediately: 0,
    "1h": 3600000,
    "24h": 86400000,
    "3d": 259200000,
    "7d": 604800000,
  };
  return new Date(Date.now() + (amounts[option] || 0)).toISOString();
}
function DetailModal({
  row,
  view,
  onClose,
  onChanged,
  onError,
}: {
  row: Row;
  view: ResourceView;
  onClose: () => void;
  onChanged: () => void;
  onError: (message: string) => void;
}) {
  const router = useRouter();
  const [current, setCurrent] = useState(row), [editing, setEditing] = useState(false), [saving, setSaving] = useState(false);
  async function act(action: "rotate" | "delete") {
    try {
      const path =
          view === "api-keys"
            ? `/v1/admin/developers/api-keys/${current.id}${action === "rotate" ? "/rotate" : ""}`
            : `/v1/admin/developers/webhooks/${current.id}`,
        response = await fetchAuthenticated(path, {
          method: action === "rotate" ? "POST" : "DELETE",
        });
      if (!response.ok)
        throw new Error(`${action} failed (${response.status})`);
      if (action === "rotate") setCurrent((await response.json()) as Row);
      else onChanged();
    } catch (reason) {
      onError(reason instanceof Error ? reason.message : `Unable to ${action}`);
    }
  }
  async function saveKeyName(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaving(true);
    try {
      const response = await fetchAuthenticated(`/v1/admin/developers/api-keys/${current.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: String(form.get("name") || "") }),
      });
      if (!response.ok) throw new Error(`Update failed (${response.status})`);
      setCurrent((await response.json()) as Row);
      setEditing(false);
    } catch (reason) { onError(reason instanceof Error ? reason.message : "Unable to update API key"); }
    finally { setSaving(false); }
  }
  return (
    <SimpleModal
      title={`${config[view].title} details`}
      accept="Close"
      onClose={onClose}
      onAccept={onClose}
    >
      <div className="dev-detail">
        {view === "api-keys" && editing && <form className="mb-4 grid gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface2)] p-3" onSubmit={saveKeyName}><label className="grid gap-1 text-xs">Name<input className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2" name="name" defaultValue={String(current.name || "")} required maxLength={120}/></label><div className="flex justify-end gap-2"><button type="button" onClick={() => setEditing(false)}>Cancel</button><button className="primary" disabled={saving}>{saving ? "Saving…" : "Save changes"}</button></div></form>}
        {Object.entries(current).map(([key, item]) => (
          <p key={key}>
            <span>{key}</span>
            <b>
              {typeof item === "object"
                ? JSON.stringify(item)
                : String(item ?? "—")}
            </b>
          </p>
        ))}
        {Boolean(current.secret) && (
          <aside className="dev-resource-error">
            Copy this secret now. It will not be displayed again.
          </aside>
        )}
        {view === "webhooks" && <WebhookDeliveryHistory endpointId={current.id} onError={onError} />}
        <div>
          {view === "api-keys" && (
            <>
              <button type="button" onClick={() => setEditing(true)}><Settings2 />Edit name</button>
              <button type="button" onClick={() => router.push(`/developers?view=logs&credential=${encodeURIComponent(String(current.name || ""))}`)}><FileText />View logs</button>
              <button type="button" onClick={() => act("rotate")}><RefreshCw />Rotate secret</button>
            </>
          )}
          {(view === "api-keys" || view === "webhooks") && (
            <button
              type="button"
              className="danger"
              onClick={() => act("delete")}
            >
              <Trash2 />
              {view === "api-keys" ? "Revoke" : "Delete"}
            </button>
          )}
        </div>
      </div>
    </SimpleModal>
  );
}
function SimpleModal({
  title,
  accept,
  onClose,
  onAccept,
  children,
  submitting = false,
  formMode = false,
  variant = "default",
}: {
  title: string;
  accept: string;
  onClose: () => void;
  onAccept?: () => void;
  children: React.ReactNode;
  submitting?: boolean;
  formMode?: boolean;
  variant?: "default" | "api-key" | "webhook";
}) {
  const variantClass =
    variant === "api-key"
      ? "api-key-modal"
      : variant === "webhook"
        ? "webhook-modal"
        : "";
  return (
    <div
      className={`dev-modal-backdrop ${variantClass ? `${variantClass}-backdrop` : ""}`}
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section
        className={`dev-modal ${variantClass}`}
        role="dialog"
        aria-modal="true"
      >
        <header>
          <h2>{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close">
            <X />
          </button>
        </header>
        <div className="dev-modal-body">{children}</div>
        <footer>
          <button type="button" onClick={onClose}>
            {variant === "api-key" && <X />}Cancel
          </button>
          <button
            type={formMode ? "submit" : "button"}
            className="primary"
            disabled={submitting}
            onClick={formMode ? undefined : onAccept}
          >
            {(variant === "api-key" || variant === "webhook") && <Check />}
            {submitting ? "Saving..." : accept}
          </button>
        </footer>
      </section>
    </div>
  );
}
