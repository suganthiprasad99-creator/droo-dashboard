"use client";
/* eslint-disable @next/next/no-img-element -- Storefront images are configured by merchants. */

import {
  ChangeEvent,
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Bell,
  Boxes,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Code2 as Metadata,
  Columns3,
  ExternalLink,
  Eye,
  Filter,
  Folder,
  Grid2X2,
  ImageIcon,
  Info,
  List,
  MapPin,
  Network,
  Package,
  Pencil,
  Plus,
  Rocket,
  Search,
  Send,
  Settings,
  ShoppingBag,
  Tag,
  Trash2,
  Truck,
  Upload,
  UsersRound,
  X,
} from "lucide-react";
import { fetchAuthenticated } from "@/hooks/use-api-data";

type Row = Record<string, unknown>;
type View =
  | "dashboard"
  | "products"
  | "catalogs"
  | "customers"
  | "orders"
  | "networks"
  | "food-trucks"
  | "promotions"
  | "settings"
  | "launch";
type Dialog = "category" | "catalog" | "network" | "food-truck" | null;
const api: Partial<Record<View, string>> = {
  products: "/v1/admin/storefront/products",
  catalogs: "/v1/admin/storefront/catalogs",
  customers: "/v1/admin/storefront/customers",
  orders: "/v1/admin/storefront/orders",
  networks: "/v1/admin/storefront/resources/network",
  "food-trucks": "/v1/admin/storefront/resources/food-truck",
};

function rows(value: unknown): Row[] {
  if (Array.isArray(value)) return value as Row[];
  if (value && typeof value === "object") {
    const object = value as Row;
    for (const key of [
      "data",
      "products",
      "categories",
      "catalogs",
      "customers",
      "orders",
    ])
      if (Array.isArray(object[key])) return object[key] as Row[];
  }
  return [];
}
function text(value: unknown, fallback = "—") {
  return value === null || value === undefined || value === ""
    ? fallback
    : String(value);
}
function money(value: unknown, currency = "INR") {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(value || 0) / 100);
}
function formatDate(value: unknown) {
  if (typeof value !== "string") return "—";
  const parsed = new Date(value);
  return Number.isNaN(parsed.valueOf())
    ? "—"
    : new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(parsed);
}

export function StorefrontPage() {
  const params = useSearchParams(),
    router = useRouter(),
    view = (params.get("view") || "dashboard") as View;
  const [store, setStore] = useState<Row>({}),
    [metrics, setMetrics] = useState<Row>({}),
    [data, setData] = useState<Row[]>([]),
    [categories, setCategories] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [search, setSearch] = useState(""),
    [revision, setRevision] = useState(0);
  const [dialog, setDialog] = useState<Dialog>(null),
    [editing, setEditing] = useState<Row | undefined>(),
    [productEditor, setProductEditor] = useState(false);
  const importInput = useRef<HTMLInputElement>(null);
  const navigate = (next: View) => router.push(`/storefront?view=${next}`);
  const load = useCallback(async () => {
    void revision;
    setLoading(true);
    setError("");
    try {
      const responses = await Promise.all([
        fetchAuthenticated("/v1/admin/storefront/store"),
        fetchAuthenticated("/v1/admin/storefront/metrics"),
        api[view] ? fetchAuthenticated(api[view]!) : Promise.resolve(null),
        view === "products"
          ? fetchAuthenticated("/v1/admin/storefront/categories")
          : Promise.resolve(null),
      ]);
      const failed = responses.find((response) => response && !response.ok);
      if (failed) throw new Error(`Storefront API returned ${failed.status}`);
      setStore(await responses[0].json());
      setMetrics(await responses[1].json());
      setData(responses[2] ? rows(await responses[2].json()) : []);
      setCategories(responses[3] ? rows(await responses[3].json()) : []);
    } catch (value) {
      setError(
        value instanceof Error ? value.message : "Unable to load Storefront",
      );
    } finally {
      setLoading(false);
    }
  }, [revision, view]);
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  const filtered = useMemo(
    () =>
      data.filter((row) =>
        JSON.stringify(row).toLowerCase().includes(search.toLowerCase()),
      ),
    [data, search],
  );
  const refresh = () => setRevision((value) => value + 1);
  const openProduct = (row?: Row) => {
    setEditing(row);
    setProductEditor(true);
  };
  async function deleteProduct(row: Row) {
    if (!window.confirm(`Delete ${text(row.name, "this product")}?`)) return;
    const response = await fetchAuthenticated(
      `/v1/admin/storefront/products/${row.id}`,
      { method: "DELETE" },
    );
    if (response.ok) refresh();
    else setError(`Delete failed (${response.status})`);
  }
  function exportData() {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      }),
      url = URL.createObjectURL(blob),
      link = document.createElement("a");
    link.href = url;
    link.download = `storefront-${view}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }
  async function importProducts(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const payload = JSON.parse(await file.text());
      if (!Array.isArray(payload))
        throw new Error("Import file must contain a JSON array");
      for (const product of payload)
        await fetchAuthenticated("/v1/admin/storefront/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...product,
            store_id: store.id,
            currency: product.currency || store.currency || "INR",
          }),
        });
      refresh();
    } catch (value) {
      setError(value instanceof Error ? value.message : "Import failed");
    } finally {
      event.target.value = "";
    }
  }
  return (
    <section className="sf-console">
      {error && (
        <div className="sf-error">
          <strong>Storefront needs attention</strong>
          <span>{error}</span>
          <button onClick={() => setError("")}>
            <X />
          </button>
        </div>
      )}
      {view === "dashboard" && (
        <StoreDashboard metrics={metrics} navigate={navigate} />
      )}
      {view === "products" && (
        <ProductsPage
          store={store}
          products={filtered}
          allProducts={data}
          categories={categories}
          loading={loading}
          search={search}
          setSearch={setSearch}
          openProduct={openProduct}
          openCategory={() => setDialog("category")}
          remove={deleteProduct}
          importProducts={() => importInput.current?.click()}
          exportData={exportData}
        />
      )}
      {(["catalogs", "customers", "orders"] as View[]).includes(view) && (
        <DataPage
          view={view}
          data={filtered}
          loading={loading}
          search={search}
          setSearch={setSearch}
          exportData={exportData}
          create={() => view === "catalogs" && setDialog("catalog")}
        />
      )}
      {view === "networks" && (
        <ManagedResources
          title="Networks"
          icon={Network}
          data={filtered}
          onCreate={() => setDialog("network")}
          refresh={refresh}
        />
      )}
      {view === "food-trucks" && (
        <ManagedResources
          title="Food Trucks"
          icon={Truck}
          data={filtered}
          onCreate={() => setDialog("food-truck")}
          refresh={refresh}
        />
      )}
      {view === "promotions" && <Promotions store={store} />}
      {view === "settings" && <StoreSettings store={store} />}
      {view === "launch" && <Launch store={store} />}
      <input
        ref={importInput}
        className="sf-hidden"
        type="file"
        accept="application/json,.json"
        onChange={importProducts}
      />
      {productEditor && (
        <ProductDrawer
          store={store}
          categories={categories}
          initial={editing}
          close={() => {
            setProductEditor(false);
            setEditing(undefined);
          }}
          saved={() => {
            setProductEditor(false);
            setEditing(undefined);
            refresh();
          }}
        />
      )}
      {dialog && (
        <ResourceDialog
          kind={dialog}
          store={store}
          close={() => setDialog(null)}
          saved={() => {
            setDialog(null);
            refresh();
          }}
        />
      )}
    </section>
  );
}

function StoreDashboard({
  metrics,
  navigate,
}: {
  metrics: Row;
  navigate: (view: View) => void;
}) {
  const currency = text(metrics.currency, "INR"),
    cards = [
      ["Revenue", money(metrics.revenue_minor, currency), CircleDollarSign],
      ["Orders", text(metrics.orders, "0"), ShoppingBag],
      ["Average order", money(metrics.average_order_minor, currency), Boxes],
      ["Active orders", text(metrics.active_orders, "0"), Package],
      ["Completed", text(metrics.completed_orders, "0"), Check],
      ["Customers", text(metrics.customers, "0"), UsersRound],
      ["Products", text(metrics.products, "0"), Tag],
      [
        "Cancellation",
        `${Number(metrics.cancellation_rate || 0).toFixed(1)}%`,
        Info,
      ],
    ];
  return (
    <div className="sf-dashboard">
      <PageHeader title="Storefront Dashboard" />
      <div className="sf-metrics">
        {cards.map(([label, value, Icon]) => (
          <article key={String(label)}>
            <Icon />
            <small>{String(label)}</small>
            <strong>{String(value)}</strong>
            <span>Current</span>
          </article>
        ))}
      </div>
      <div className="sf-dashboard-grid">
        <article>
          <h2>Commerce overview</h2>
          <p>Live storefront activity from PostgreSQL.</p>
          <div className="sf-chart">
            <i />
            <i />
            <i />
            <i />
            <svg viewBox="0 0 600 130" preserveAspectRatio="none">
              <polyline points="0,115 80,99 150,105 230,74 310,88 390,48 470,60 600,20" />
            </svg>
          </div>
        </article>
        <article>
          <h2>Quick resources</h2>
          {[
            ["Products", "products"],
            ["Orders", "orders"],
            ["Customers", "customers"],
            ["Settings", "settings"],
          ].map(([label, target]) => (
            <button key={label} onClick={() => navigate(target as View)}>
              <Package />
              <span>{label}</span>
              <ChevronRight />
            </button>
          ))}
        </article>
      </div>
    </div>
  );
}

function PageHeader({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="sf-page-header">
      <h1>{title}</h1>
      <div>{children}</div>
    </header>
  );
}

function ProductsPage(props: {
  store: Row;
  products: Row[];
  allProducts: Row[];
  categories: Row[];
  loading: boolean;
  search: string;
  setSearch: (value: string) => void;
  openProduct: (row?: Row) => void;
  openCategory: () => void;
  remove: (row: Row) => void;
  importProducts: () => void;
  exportData: () => void;
}) {
  const [category, setCategory] = useState("all"),
    [layout, setLayout] = useState<"grid" | "list">("grid"),
    [addons, setAddons] = useState(false);
  const visible = props.products.filter(
    (product) =>
      category === "all" ||
      text(product.category_name, "Products").toLowerCase() ===
        category.toLowerCase(),
  );
  return (
    <div className="sf-products">
      <PageHeader title="Products">
        <SearchBox
          value={props.search}
          onChange={props.setSearch}
          placeholder="Search Products"
        />
        <div className="sf-view-toggle">
          <button
            className={layout === "grid" ? "active" : ""}
            onClick={() => setLayout("grid")}
          >
            <Grid2X2 />
          </button>
          <button
            className={layout === "list" ? "active" : ""}
            onClick={() => setLayout("list")}
          >
            <List />
          </button>
        </div>
        <button className="sf-purple" onClick={() => setAddons(true)}>
          <Tag />
          Manage Addons
        </button>
        <button className="sf-orange" onClick={() => props.openProduct()}>
          <Plus />
          New
        </button>
        <button onClick={props.importProducts}>
          <Upload />
          Import
        </button>
        <button onClick={props.exportData}>
          <ExternalLink />
          Export
        </button>
      </PageHeader>
      <div className="sf-product-body">
        <aside className="sf-category-pane">
          <header>
            <div>
              <h2>Categories</h2>
              <p>Organize products for storefront browsing.</p>
            </div>
            <button onClick={props.openCategory}>
              <Plus />
            </button>
          </header>
          <button
            className={category === "all" ? "active" : ""}
            onClick={() => setCategory("all")}
          >
            <Grid2X2 />
            <span>
              <strong>All Products</strong>
              <small>Full catalog</small>
            </span>
          </button>
          {props.categories.map((row) => (
            <button
              key={text(row.id)}
              className={category === text(row.name) ? "active" : ""}
              onClick={() => setCategory(text(row.name))}
            >
              <ImageIcon />
              <span>
                <strong>{text(row.name)}</strong>
                <small>{text(row.description, "Product category")}</small>
              </span>
            </button>
          ))}
          {!props.categories.length && (
            <div className="sf-category-empty">
              <Folder />
              <span>No categories yet</span>
            </div>
          )}
        </aside>
        <section
          className={layout === "grid" ? "sf-product-grid" : "sf-product-list"}
        >
          {props.loading ? (
            <div className="sf-loading">Loading products…</div>
          ) : layout === "grid" ? (
            visible.map((row) => (
              <ProductCard
                key={text(row.id)}
                row={row}
                store={props.store}
                edit={() => props.openProduct(row)}
                remove={() => props.remove(row)}
              />
            ))
          ) : (
            <ProductList
              products={visible}
              store={props.store}
              edit={props.openProduct}
              remove={props.remove}
            />
          )}{" "}
          {!props.loading && !visible.length && (
            <div className="sf-empty">
              <Package />
              <strong>No products found</strong>
              <span>Create a product or choose another category.</span>
            </div>
          )}
        </section>
      </div>
      <footer className="sf-pagination">
        <span>
          Showing {visible.length ? 1 : 0} to {visible.length} of{" "}
          {visible.length} results
        </span>
        <button disabled>
          <ChevronLeft />
        </button>
        <b>1</b>
        <button disabled>
          <ChevronRight />
        </button>
      </footer>
      {addons && <AddonManager close={() => setAddons(false)} />}
    </div>
  );
}

function ProductCard({
  row,
  store,
  edit,
  remove,
}: {
  row: Row;
  store: Row;
  edit: () => void;
  remove: () => void;
}) {
  return (
    <article className="sf-product-card">
      <div className="sf-product-image">
        {row.image_url ? (
          <img src={text(row.image_url)} alt={text(row.name, "Product")} />
        ) : (
          <ImageIcon />
        )}
        <em className={row.active === false ? "draft" : "published"}>
          <i />
          {row.active === false ? "Draft" : "Published"}
        </em>
        <button>
          <Eye />
        </button>
      </div>
      <div className="sf-product-info">
        <small>{text(row.category_name, "PRODUCTS")}</small>
        <h3>{text(row.name)}</h3>
        <strong>
          {money(
            row.price_minor,
            text(row.currency, text(store.currency, "INR")),
          )}
        </strong>
        <p>{text(row.description, "No description")}</p>
        <code>{text(row.sku, "NO SKU")}</code>
        <div>
          <span>
            <Boxes />0 variants
          </span>
          <span>
            <Tag />0 add-ons
          </span>
        </div>
      </div>
      <footer>
        <span>{text(row.age_label, "10 days")}</span>
        <button onClick={edit}>
          <Pencil />
        </button>
        <button className="danger" onClick={remove}>
          <Trash2 />
        </button>
      </footer>
    </article>
  );
}

function ProductList({
  products,
  store,
  edit,
  remove,
}: {
  products: Row[];
  store: Row;
  edit: (row: Row) => void;
  remove: (row: Row) => void;
}) {
  return (
    <div className="sf-product-table">
      <header>
        <span>PRODUCT</span>
        <span>PRICE</span>
        <span>STATUS</span>
        <span>OPTIONS</span>
        <span />
      </header>
      {products.map((row) => (
        <article key={text(row.id)}>
          <div className="sf-list-product">
            {row.image_url ? (
              <img src={text(row.image_url)} alt="" />
            ) : (
              <ImageIcon />
            )}
            <p>
              <strong>{text(row.name)}</strong>
              <span>{text(row.description, "No description")}</span>
              <small>{text(row.sku, "No SKU")}</small>
            </p>
          </div>
          <strong className="sf-list-price">
            {money(
              row.price_minor,
              text(row.currency, text(store.currency, "INR")),
            )}
          </strong>
          <em className={row.active === false ? "draft" : "published"}>
            <i />
            {row.active === false ? "Draft" : "Published"}
          </em>
          <span>0 variants · 0 add-ons</span>
          <div className="sf-list-actions">
            <button onClick={() => edit(row)}>
              <Pencil />
            </button>
            <button className="danger" onClick={() => remove(row)}>
              <Trash2 />
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}

function SearchBox({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="sf-search">
      <Search />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}

const availableColumns: Record<"catalogs" | "customers" | "orders", string[]> =
  {
    catalogs: [
      "Name",
      "ID",
      "Description",
      "Status",
      "Product Catalog",
      "Categories",
      "Created At",
      "Updated At",
      "Created By",
      "Updated By",
    ],
    customers: [
      "Name",
      "ID",
      "Internal ID",
      "Email",
      "Phone",
      "Address",
      "Country",
      "Created At",
      "Updated At",
    ],
    orders: [
      "ID",
      "Internal ID",
      "Customer",
      "Total",
      "Pickup",
      "Dropoff",
      "Driver Assigned",
      "Scheduled At",
      "# Items",
      "Tracking Number",
      "Type",
      "Status",
      "Created At",
      "Updated At",
      "Created By",
      "Updated By",
    ],
  };
const defaultColumns: Record<"catalogs" | "customers" | "orders", string[]> = {
  catalogs: ["Name", "Description", "Status", "Product Catalog", "Created At"],
  customers: [
    "Name",
    "ID",
    "Internal ID",
    "Email",
    "Phone",
    "Address",
    "Created At",
  ],
  orders: [
    "ID",
    "Customer",
    "Total",
    "Pickup",
    "Dropoff",
    "Driver Assigned",
    "Tracking Number",
    "Status",
    "Created At",
  ],
};
function DataPage({
  view,
  data,
  loading,
  search,
  setSearch,
  exportData,
  create,
}: {
  view: View;
  data: Row[];
  loading: boolean;
  search: string;
  setSearch: (value: string) => void;
  exportData: () => void;
  create: () => void;
}) {
  const resource = view as "catalogs" | "customers" | "orders",
    [shown, setShown] = useState(defaultColumns[resource]),
    [columnMenu, setColumnMenu] = useState(false),
    [filterMenu, setFilterMenu] = useState(false);
  return (
    <div className="sf-data-page">
      <PageHeader title={resource.charAt(0).toUpperCase() + resource.slice(1)}>
        <SearchBox
          value={search}
          onChange={setSearch}
          placeholder={`Search ${resource}`}
        />
        {resource !== "catalogs" && (
          <div className="sf-column-anchor">
            <button onClick={() => setFilterMenu((value) => !value)}>
              <Filter />
              Filter
            </button>
            {filterMenu && (
              <FilterMenu
                resource={resource}
                close={() => setFilterMenu(false)}
              />
            )}
          </div>
        )}
        <div className="sf-column-anchor">
          <button onClick={() => setColumnMenu((value) => !value)}>
            <Columns3 />
            Columns
          </button>
          {columnMenu && (
            <ColumnMenu
              all={availableColumns[resource]}
              selected={shown}
              setSelected={setShown}
              close={() => setColumnMenu(false)}
            />
          )}
        </div>
        {resource === "catalogs" && (
          <button className="sf-orange" onClick={create}>
            <Plus />
            New
          </button>
        )}
        <button onClick={exportData}>
          <ExternalLink />
          Export
        </button>
      </PageHeader>
      <div className="sf-table-wrap">
        <table>
          <thead>
            <tr>
              <th>
                <input type="checkbox" />
              </th>
              {shown.map((column) => (
                <th key={column}>
                  {column}
                  <ChevronDown />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={text(row.id)}>
                <td>
                  <input type="checkbox" />
                </td>
                {shown.map((column) => (
                  <td key={column}>{renderCell(resource, column, row)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {loading && <div className="sf-table-empty">Loading…</div>}
        {!loading && !data.length && (
          <div className="sf-table-empty">No records found</div>
        )}
      </div>
      <footer className="sf-pagination">
        <span>
          Showing {data.length ? 1 : 0} to {data.length} of {data.length}{" "}
          results
        </span>
        <button>
          <ChevronLeft />
        </button>
        <b>1</b>
        <button>
          <ChevronRight />
        </button>
      </footer>
    </div>
  );
}
function renderCell(
  view: "catalogs" | "customers" | "orders",
  column: string,
  row: Row,
) {
  const maps: Record<string, unknown> = {
    Name: row.name,
    Description: row.description,
    Status: row.status ?? (row.published ? "Published" : "Draft"),
    Products: row.product_count,
    "Product Catalog": row.product_catalog ?? row.product_count,
    Categories: row.category_count,
    "Created At": row.created_at,
    "Updated At": row.updated_at,
    "Created By": row.created_by,
    "Updated By": row.updated_by,
    ID: row.id,
    "Internal ID": row.internal_id,
    Email: row.email,
    Phone: row.phone,
    Address: row.address,
    Country: row.country,
    Customer: row.customer_name ?? row.customer,
    Total: money(row.total_minor, text(row.currency, "INR")),
    Pickup: row.pickup_address,
    Dropoff: row.dropoff_address,
    "Driver Assigned": row.driver_name,
    "Scheduled At": row.scheduled_at,
    "# Items": row.item_count,
    Type: row.type,
    "Tracking Number": row.tracking_number,
  };
  const value = maps[column];
  if (column.endsWith(" At")) return formatDate(value);
  if (column === "Status") return <em className="sf-status">{text(value)}</em>;
  return text(value);
}
function ColumnMenu({
  all,
  selected,
  setSelected,
  close,
}: {
  all: string[];
  selected: string[];
  setSelected: (columns: string[]) => void;
  close: () => void;
}) {
  return (
    <div className="sf-column-menu">
      <header>
        <strong>Customize Columns</strong>
        <button className="sf-orange" onClick={close}>
          <Check />
          Done
        </button>
      </header>
      <div>
        {all.map((column) => (
          <label key={column}>
            <input
              type="checkbox"
              checked={selected.includes(column)}
              onChange={() =>
                setSelected(
                  selected.includes(column)
                    ? selected.filter((item) => item !== column)
                    : [...selected, column],
                )
              }
            />
            {column}
          </label>
        ))}
      </div>
    </div>
  );
}

function FilterMenu({
  resource,
  close,
}: {
  resource: "customers" | "orders";
  close: () => void;
}) {
  const orderFields = [
      "ID",
      "Internal ID",
      "Customer",
      "Pickup",
      "Dropoff",
      "Driver Assigned",
      "Scheduled At",
      "Tracking Number",
      "Status",
      "Created At",
      "Updated At",
      "Created By",
      "Updated By",
    ],
    customerFields = [
      "Name",
      "ID",
      "Internal ID",
      "Email",
      "Phone",
      "Address",
      "Country",
      "Created At",
      "Updated At",
    ],
    fields = resource === "orders" ? orderFields : customerFields;
  return (
    <div className="sf-filter-menu">
      <header>
        <strong>Filters</strong>
        <button onClick={close}>
          <X />
        </button>
      </header>
      <div>
        {fields.map((field) => (
          <Field key={field} label={field}>
            {[
              "Customer",
              "Pickup",
              "Dropoff",
              "Driver Assigned",
              "Status",
              "Created By",
              "Updated By",
              "Country",
            ].includes(field) ? (
              <select>
                <option>Select {field.toLowerCase()}</option>
              </select>
            ) : (
              <input
                type={field.endsWith(" At") ? "datetime-local" : "text"}
                placeholder={field}
              />
            )}
          </Field>
        ))}
      </div>
      <footer>
        <button type="button">Clear</button>
        <button type="button" className="sf-orange" onClick={close}>
          Apply
        </button>
      </footer>
    </div>
  );
}

function AddonManager({ close }: { close: () => void }) {
  const [groups, setGroups] = useState<Row[]>([]),
    [creating, setCreating] = useState(false),
    [name, setName] = useState(""),
    [description, setDescription] = useState("");
  useEffect(() => {
    void fetchAuthenticated("/v1/admin/storefront/resources/addon-group").then(
      async (response) => {
        if (response.ok) setGroups(rows(await response.json()));
      },
    );
  }, []);
  async function add() {
    if (!name.trim()) return;
    const response = await fetchAuthenticated(
      "/v1/admin/storefront/resources/addon-group",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          status: "active",
          data: { description, options: [] },
        }),
      },
    );
    if (response.ok) {
      const created = (await response.json()) as Row;
      setGroups((value) => [...value, created]);
      setCreating(false);
      setName("");
      setDescription("");
    }
  }
  async function remove(group: Row) {
    const response = await fetchAuthenticated(
      `/v1/admin/storefront/resources/addon-group/${group.id}`,
      { method: "DELETE" },
    );
    if (response.ok)
      setGroups((value) => value.filter((item) => item.id !== group.id));
  }
  return (
    <div className="sf-modal-backdrop">
      <section className="sf-addon-modal">
        <header>
          <div>
            <h2>Manage Product Addon Categories &amp; Options</h2>
            <p>
              Reusable modifier groups customers can select during checkout.
            </p>
          </div>
          <button onClick={close}>
            <X />
          </button>
        </header>
        <div className="sf-addon-heading">
          <div>
            <h3>Checkout Add-ons</h3>
            <p>
              Configure reusable choices such as toppings, sides, or preparation
              options.
            </p>
          </div>
          <button onClick={() => setCreating(true)}>
            <Plus />
            New Category
          </button>
        </div>
        {creating && (
          <div className="sf-addon-create">
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Category name"
            />
            <input
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Category description"
            />
            <button onClick={add} className="sf-orange">
              <Check />
              Add Category
            </button>
          </div>
        )}
        <div className="sf-addon-content">
          {groups.map((group) => (
            <article key={text(group.id)}>
              <Tag />
              <div>
                <strong>{text(group.name)}</strong>
                <span>{text((group.data as Row)?.description)}</span>
              </div>
              <button>
                <Plus />
                Add option
              </button>
              <button onClick={() => remove(group)}>
                <Trash2 />
              </button>
            </article>
          ))}
          {!groups.length && (
            <div className="sf-empty">
              <Tag />
              <strong>No add-on groups</strong>
              <span>
                Create reusable checkout modifiers like toppings, sides, or
                preparation choices.
              </span>
            </div>
          )}
        </div>
        <footer>
          <button onClick={close}>Cancel</button>
          <button className="sf-orange" onClick={close}>
            <Check />
            Save Changes
          </button>
        </footer>
      </section>
    </div>
  );
}

function ManagedResources({
  title,
  icon: Icon,
  data,
  onCreate,
  refresh,
}: {
  title: string;
  icon: typeof Network;
  data: Row[];
  onCreate: () => void;
  refresh: () => void;
}) {
  async function remove(row: Row) {
    const kind = title === "Networks" ? "network" : "food-truck";
    if (!window.confirm(`Delete ${text(row.name, "this record")}?`)) return;
    const response = await fetchAuthenticated(
      `/v1/admin/storefront/resources/${kind}/${row.id}`,
      { method: "DELETE" },
    );
    if (response.ok) refresh();
  }
  return (
    <div className="sf-data-page">
      <PageHeader title={title}>
        <SearchBox
          value=""
          onChange={() => undefined}
          placeholder={`Search ${title}`}
        />
        <button className="sf-orange" onClick={onCreate}>
          <Plus />
          New
        </button>
        <button>
          <ExternalLink />
          Export
        </button>
      </PageHeader>
      {data.length ? (
        <div className="sf-resource-grid">
          {data.map((row) => (
            <article key={text(row.id)}>
              <Icon />
              <div>
                <h3>{text(row.name)}</h3>
                <p>{text((row.data as Row)?.description, "No description")}</p>
                <em className="sf-status">{text(row.status, "active")}</em>
              </div>
              <button>
                <Pencil />
              </button>
              <button className="danger" onClick={() => remove(row)}>
                <Trash2 />
              </button>
            </article>
          ))}
        </div>
      ) : (
        <div className="sf-feature-empty">
          <Icon />
          <h2>No {title.toLowerCase()} yet</h2>
          <p>Create the first {title.toLowerCase()} record.</p>
          <button className="sf-orange" onClick={onCreate}>
            <Plus />
            New
          </button>
        </div>
      )}
    </div>
  );
}

function Promotions({ store }: { store: Row }) {
  const [all, setAll] = useState(false),
    [customers, setCustomers] = useState<Row[]>([]),
    [history, setHistory] = useState<Row[]>([]),
    [title, setTitle] = useState(""),
    [body, setBody] = useState(""),
    [sent, setSent] = useState("");
  useEffect(() => {
    void Promise.all([
      fetchAuthenticated("/v1/admin/storefront/customers"),
      fetchAuthenticated("/v1/admin/storefront/resources/promotion"),
    ]).then(async (responses) => {
      if (responses[0].ok) setCustomers(rows(await responses[0].json()));
      if (responses[1].ok) setHistory(rows(await responses[1].json()));
    });
  }, []);
  async function send() {
    if (!title.trim() || !body.trim()) {
      setSent("Enter a notification title and message.");
      return;
    }
    const response = await fetchAuthenticated(
      "/v1/admin/storefront/resources/promotion",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          store_id: store.id,
          name: title,
          status: "sent",
          data: {
            body,
            audience: all ? "all" : "selected",
            customer_count: all ? customers.length : 0,
            sent_at: new Date().toISOString(),
          },
        }),
      },
    );
    if (response.ok) {
      setSent("Notification campaign saved.");
      setHistory((value) => [
        { id: Date.now(), name: title, status: "sent", data: { body } },
        ...value,
      ]);
      setTitle("");
      setBody("");
    } else setSent(`Unable to save campaign (${response.status}).`);
  }
  return (
    <div className="sf-promotions">
      <nav>
        <span>PROMOTIONS</span>
        <button className="active">
          <Bell />
          Push Notifications
        </button>
      </nav>
      <div className="sf-promo-layout">
        <div className="sf-promo-form">
          <h1>Send Push Notifications</h1>
          <p>Send promotional push notifications to your customers</p>
          <label>
            Notification Title <Info />
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Enter notification title"
            />
          </label>
          <label>
            Notification Body <Info />
            <textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder="Enter notification message"
            />
          </label>
          <label className="sf-switch-row">
            <button
              type="button"
              className={all ? "on" : ""}
              onClick={() => setAll((value) => !value)}
            >
              <i />
            </button>
            Select All Customers <Info />
          </label>
          <label>
            Select Customers
            <select disabled={all}>
              <option>
                {customers.length
                  ? `Select from ${customers.length} customers`
                  : "Select customers to send notification to"}
              </option>
            </select>
          </label>
          {sent && <p className="sf-inline-message">{sent}</p>}
          <button className="sf-orange sf-send" onClick={send}>
            <Send />
            Send Notification
          </button>
        </div>
        <aside className="sf-promo-history">
          <h2>Campaign History</h2>
          {history.map((row) => (
            <article key={text(row.id)}>
              <Bell />
              <div>
                <strong>{text(row.name)}</strong>
                <span>
                  {text((row.data as Row)?.body, "Notification campaign")}
                </span>
              </div>
              <em>{text(row.status, "sent")}</em>
            </article>
          ))}
          {!history.length && <p>No campaigns sent yet.</p>}
        </aside>
      </div>
    </div>
  );
}

function StoreSettings({ store }: { store: Row }) {
  const [active, setActive] = useState<
      "General" | "Location" | "Gateways" | "API" | "Notification"
    >("General"),
    [toggles, setToggles] = useState<Record<string, boolean>>({}),
    [reveal, setReveal] = useState(false),
    [values, setValues] = useState<Row>({
      name: text(store.name, "Droo Store"),
      description: text(store.description),
      tags: "",
      currency: text(store.currency, "INR"),
      default_order_config: "",
    }),
    [message, setMessage] = useState("");
  useEffect(() => {
    void fetchAuthenticated("/v1/admin/storefront/settings").then(
      async (response) => {
        if (!response.ok) return;
        const result = (await response.json()) as Row;
        const saved = (result.values as Row) || {};
        setValues((current) => ({ ...current, ...saved }));
        setToggles((saved.alerts as Record<string, boolean>) || {});
      },
    );
  }, []);
  async function saveSettings() {
    setMessage("Saving…");
    const response = await fetchAuthenticated("/v1/admin/storefront/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...values, alerts: toggles }),
    });
    setMessage(
      response.ok ? "Settings saved." : `Save failed (${response.status}).`,
    );
  }
  const tabs = [
    ["General", Settings],
    ["Location", MapPin],
    ["Gateways", CircleDollarSign],
    ["API", Metadata],
    ["Notification", Bell],
  ] as const;
  const names = [
    "Online",
    "Enable tax",
    "Enable minimum order amount",
    "Auto accept incoming orders",
    "Auto dispatch orders",
    "Require proof of delivery",
    "Enable cash on delivery",
    "Enable order pickup",
    "Enable tips",
    "Enable delivery tips",
  ];
  return (
    <div className="sf-settings">
      <nav>
        <span>SETTINGS</span>
        {tabs.map(([label, Icon]) => (
          <button
            className={active === label ? "active" : ""}
            key={label}
            onClick={() => setActive(label)}
          >
            <Icon />
            {label}
          </button>
        ))}
      </nav>
      {active === "General" && (
        <div className="sf-settings-form">
          <h1>General Settings</h1>
          <p>Provide the general settings for your storefront.</p>
          <label>
            Name <Info />
            <input
              value={text(values.name)}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
              placeholder="Storefront Name"
            />
          </label>
          <label>
            Description <Info />
            <input
              value={text(values.description)}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              placeholder="Storefront Description"
            />
          </label>
          <label>
            Tags
            <input
              value={text(values.tags)}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  tags: event.target.value,
                }))
              }
              placeholder="Add tags"
            />
          </label>
          <label>
            Currency
            <select
              value={text(values.currency, "INR")}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  currency: event.target.value,
                }))
              }
            >
              <option value="INR">IN INR - India</option>
              <option value="LKR">LK LKR - Sri Lanka</option>
              <option value="USD">US USD - United States</option>
            </select>
          </label>
          <label>
            Default Order Config <Info />
            <select
              value={text(values.default_order_config)}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  default_order_config: event.target.value,
                }))
              }
            >
              <option>Select default order config</option>
              <option>Transport</option>
              <option>Storefront</option>
            </select>
          </label>
          {["CONTACT & SOCIAL", "LOGO & BACKDROP", "IMAGES & VIDEOS"].map(
            (label) => (
              <details key={label}>
                <summary>
                  {label}
                  <ChevronDown />
                </summary>
                <p>
                  Configure {label.toLowerCase()} for the public storefront.
                </p>
              </details>
            ),
          )}
          <details open>
            <summary>
              ALERTS
              <ChevronDown />
            </summary>
            <div className="sf-switches">
              {names.map((name) => (
                <label key={name}>
                  <button
                    type="button"
                    className={toggles[name] ? "on" : ""}
                    onClick={() =>
                      setToggles((value) => ({
                        ...value,
                        [name]: !value[name],
                      }))
                    }
                  >
                    <i />
                  </button>
                  {name}
                </label>
              ))}
            </div>
          </details>
          {message && <p className="sf-inline-message">{message}</p>}
          <button className="sf-orange sf-save" onClick={saveSettings}>
            <Check />
            Save Changes
          </button>
        </div>
      )}
      {active === "Location" && (
        <SettingsEmpty
          title="Location Settings"
          description="Manage your store's operating locations and hours"
          action="Create new location"
          icon={MapPin}
          kind="location"
        />
      )}
      {active === "Gateways" && (
        <SettingsEmpty
          title="Gateway Settings"
          description="Add or manage your payment gateway settings here."
          action="Create new gateway"
          icon={CircleDollarSign}
          kind="gateway"
        />
      )}
      {active === "API" && (
        <div className="sf-settings-form">
          <h1>API Settings</h1>
          <p>Access key for Storefront API &amp; Integrations.</p>
          <div className="sf-api-key">
            <span>
              <strong>Store Key</strong>
              <small>
                This key enables apps and integrations for your storefront.
              </small>
            </span>
            <code>
              {reveal
                ? text(store.public_key ?? store.id, "store_…")
                : "••••••••••••••••••••••••"}
            </code>
            <button onClick={() => setReveal((value) => !value)}>
              <Eye />
              {reveal ? "Hide key" : "Click to reveal"}
            </button>
          </div>
        </div>
      )}
      {active === "Notification" && (
        <SettingsEmpty
          title="Notification Settings"
          description="Configure notification channels for your storefront, including channel rules and options."
          action="New channel"
          icon={Bell}
          kind="notification-channel"
        />
      )}
    </div>
  );
}
function SettingsEmpty({
  title,
  description,
  action,
  icon: Icon,
  kind,
}: {
  title: string;
  description: string;
  action: string;
  icon: typeof MapPin;
  kind: "location" | "gateway" | "notification-channel";
}) {
  const [records, setRecords] = useState<Row[]>([]),
    [creating, setCreating] = useState(false),
    [name, setName] = useState("");
  useEffect(() => {
    void fetchAuthenticated(`/v1/admin/storefront/resources/${kind}`).then(
      async (response) => {
        if (response.ok) setRecords(rows(await response.json()));
      },
    );
  }, [kind]);
  async function create() {
    if (!name.trim()) return;
    const response = await fetchAuthenticated(
      `/v1/admin/storefront/resources/${kind}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, status: "active", data: {} }),
      },
    );
    if (response.ok) {
      const created = (await response.json()) as Row;
      setRecords((current) => [...current, created]);
      setCreating(false);
      setName("");
    }
  }
  return (
    <div className="sf-settings-form sf-settings-empty">
      <Icon />
      <h1>{title}</h1>
      <p>{description}</p>
      {records.map((record) => (
        <article key={text(record.id)}>
          <strong>{text(record.name)}</strong>
          <em className="sf-status">{text(record.status, "active")}</em>
        </article>
      ))}
      {creating && (
        <div className="sf-addon-create">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={action}
          />
          <button className="sf-orange" onClick={create}>
            <Check />
            Create
          </button>
        </div>
      )}
      <button className="sf-orange" onClick={() => setCreating(true)}>
        <Plus />
        {action}
      </button>
    </div>
  );
}

function ProductDrawer({
  store,
  categories,
  initial,
  close,
  saved,
}: {
  store: Row;
  categories: Row[];
  initial?: Row;
  close: () => void;
  saved: () => void;
}) {
  const details = (initial?.details as Row) || {};
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [flags, setFlags] = useState<Record<string, boolean>>(
      (details.flags as Record<string, boolean>) || {
        recommended: true,
        available: true,
      },
    ),
    [metadata, setMetadata] = useState<Array<{ key: string; value: string }>>(
      Object.entries((details.metadata as Record<string, string>) || {}).map(
        ([key, value]) => ({ key, value }),
      ),
    );
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget),
      payload = {
        store_id: store.id,
        name: form.get("name"),
        description: form.get("description"),
        category: form.get("category"),
        sku: form.get("sku"),
        price_minor: Math.round(Number(form.get("price") || 0) * 100),
        inventory_quantity: Number(form.get("inventory") || 0),
        image_url: form.get("image_url"),
        currency: store.currency || "INR",
        active: form.get("status") !== "draft",
        details: {
          ...details,
          flags,
          tags: text(form.get("tags"), "")
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean),
          metadata: Object.fromEntries(
            metadata.map((item) => [item.key, item.value]),
          ),
        },
      };
    const path = initial
      ? `/v1/admin/storefront/products/${initial.id}`
      : "/v1/admin/storefront/products";
    try {
      const response = await fetchAuthenticated(path, {
        method: initial ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error(`Save failed (${response.status})`);
      saved();
    } catch (value) {
      setError(
        value instanceof Error ? value.message : "Unable to save product",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="sf-drawer-backdrop">
      <form className="sf-product-drawer" onSubmit={submit}>
        <header>
          <h2>{initial ? "Edit Product" : "New Product"}</h2>
          <button className="sf-orange" disabled={busy}>
            <Check />
            {busy ? "Saving…" : initial ? "Save Product" : "Create Product"}
          </button>
          <button type="button" onClick={close}>
            <X />
          </button>
        </header>
        <div className="sf-drawer-scroll">
          <EditorSection title="BASICS">
            <Field label="Product Name" info>
              <input
                name="name"
                defaultValue={text(initial?.name, "")}
                placeholder="Product Name"
                required
              />
            </Field>
            <Field label="Product Description" info>
              <textarea
                name="description"
                defaultValue={text(initial?.description, "")}
                placeholder="Enter a description of your product…"
              />
            </Field>
            <div className="sf-two">
              <Field label="Product Category">
                <select
                  name="category"
                  defaultValue={text(
                    initial?.category_name,
                    text(categories[0]?.name, ""),
                  )}
                >
                  {categories.map((row) => (
                    <option key={text(row.id)}>{text(row.name)}</option>
                  ))}
                </select>
              </Field>
              <Field label="Product Status">
                <select
                  name="status"
                  defaultValue={
                    initial?.active === false ? "draft" : "published"
                  }
                >
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                </select>
              </Field>
            </div>
            <Field label="Product SKU" info>
              <input
                name="sku"
                defaultValue={text(initial?.sku, "")}
                placeholder="Product SKU"
                required
              />
            </Field>
            <Field label="Product Tags">
              <input name="tags" placeholder="Add tags" />
            </Field>
          </EditorSection>
          <EditorSection title="PRICING">
            <div className="sf-two">
              <Field label="Price" info>
                <div className="sf-money">
                  <span>{text(store.currency, "INR").slice(0, 2)}</span>
                  <input
                    name="price"
                    type="number"
                    min="0"
                    step="0.01"
                    defaultValue={Number(initial?.price_minor || 0) / 100}
                  />
                </div>
              </Field>
              <Field label="Sale Price" info>
                <div className="sf-money">
                  <span>{text(store.currency, "INR").slice(0, 2)}</span>
                  <input type="number" min="0" step="0.01" defaultValue="0" />
                </div>
              </Field>
            </div>
            <Field label="Inventory">
              <input
                name="inventory"
                type="number"
                min="0"
                defaultValue={Number(initial?.inventory_quantity ?? 0)}
              />
            </Field>
          </EditorSection>
          <EditorSection title="STOREFRONT SETTINGS">
            <div className="sf-setting-list">
              {["service", "sale", "recommended", "available"].map((key) => (
                <label key={key}>
                  <input
                    type="checkbox"
                    checked={Boolean(flags[key])}
                    onChange={() =>
                      setFlags((value) => ({ ...value, [key]: !value[key] }))
                    }
                  />
                  {key === "service"
                    ? "This is a service"
                    : key === "sale"
                      ? "This product is on sale"
                      : key === "recommended"
                        ? "This product is recommended"
                        : "This product is available"}
                </label>
              ))}
            </div>
          </EditorSection>
          <EditorSection title="VARIANTS">
            <div className="sf-section-actions">
              <button type="button">
                <Plus />
                New Variant
              </button>
            </div>
            <div className="sf-dashed">No options in this variant.</div>
          </EditorSection>
          <EditorSection title="ADD-ONS">
            <div className="sf-section-actions">
              <div>
                <strong>Checkout modifiers</strong>
                <small>Attach reusable add-on groups to this product.</small>
              </div>
              <button type="button">
                <Plus />
                Select Addon Categories
              </button>
            </div>
            <div className="sf-dashed">No add-on groups selected.</div>
          </EditorSection>
          <EditorSection title="AVAILABILITY">
            <div className="sf-hours">
              {[
                "Monday",
                "Tuesday",
                "Wednesday",
                "Thursday",
                "Friday",
                "Saturday",
                "Sunday",
              ].map((day) => (
                <div key={day}>
                  <strong>{day}</strong>
                  <button type="button">
                    <CalendarDays />
                    Add Hours
                  </button>
                </div>
              ))}
            </div>
          </EditorSection>
          <EditorSection title="IMAGES & VIDEOS">
            <label className="sf-dropzone">
              <ImageIcon />
              <strong>Upload Images & Videos</strong>
              <span>
                Drag and drop image and video files onto this dropzone
              </span>
              <b>or select files to upload.</b>
              <input
                className="sf-hidden"
                type="file"
                accept="image/*,video/*"
              />
            </label>
            <Field label="Image URL">
              <input
                name="image_url"
                type="url"
                defaultValue={text(initial?.image_url, "")}
                placeholder="https://…"
              />
            </Field>
          </EditorSection>
          <EditorSection title="YOUTUBE VIDEOS">
            <p>
              Add YouTube video urls to associate with this product or service.
            </p>
            <textarea placeholder="YouTube Video URLs" />
          </EditorSection>
          <EditorSection title="TRANSLATIONS">
            <button type="button">
              Add Language <ChevronDown />
            </button>
          </EditorSection>
          <EditorSection title="METADATA">
            <div className="sf-metadata-tools">
              <button
                type="button"
                onClick={() =>
                  setMetadata((value) => [...value, { key: "", value: "" }])
                }
              >
                <Plus />
                Add
              </button>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Key</th>
                  <th>Value</th>
                  <th>Type</th>
                </tr>
              </thead>
              <tbody>
                {metadata.map((item, index) => (
                  <tr key={index}>
                    <td>
                      <input
                        value={item.key}
                        onChange={(event) =>
                          setMetadata((value) =>
                            value.map((entry, i) =>
                              i === index
                                ? { ...entry, key: event.target.value }
                                : entry,
                            ),
                          )
                        }
                      />
                    </td>
                    <td>
                      <input
                        value={item.value}
                        onChange={(event) =>
                          setMetadata((value) =>
                            value.map((entry, i) =>
                              i === index
                                ? { ...entry, value: event.target.value }
                                : entry,
                            ),
                          )
                        }
                      />
                    </td>
                    <td>String</td>
                  </tr>
                ))}
                {!metadata.length && (
                  <tr>
                    <td colSpan={3}>No metadata. Click Add to create one.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </EditorSection>
          {error && <p className="sf-form-error">{error}</p>}
        </div>
      </form>
    </div>
  );
}
function EditorSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="sf-editor-section">
      <h3>
        {title}
        <ChevronDown />
      </h3>
      <div>{children}</div>
    </section>
  );
}
function Field({
  label,
  info,
  children,
}: {
  label: string;
  info?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="sf-field">
      <span>
        {label}
        {info && <Info />}
      </span>
      {children}
    </label>
  );
}

function ResourceDialog({
  kind,
  store,
  close,
  saved,
}: {
  kind: Exclude<Dialog, null>;
  store: Row;
  close: () => void;
  saved: () => void;
}) {
  const config = {
    category: [
      "Create a new product category",
      "Category name",
      "Category description",
    ],
    catalog: ["New Catalog", "Catalog Name", "Catalog Description"],
    network: ["Create a new network", "Network name", "Network description"],
    "food-truck": [
      "New Food Truck",
      "Assign Food Truck Vehicle",
      "Service Area",
    ],
  }[kind];
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (
      kind === "category" ||
      kind === "catalog" ||
      kind === "network" ||
      kind === "food-truck"
    ) {
      const endpoint =
        kind === "category"
          ? "/v1/admin/storefront/categories"
          : kind === "catalog"
            ? "/v1/admin/storefront/catalogs"
            : `/v1/admin/storefront/resources/${kind}`;
      const payload =
        kind === "category"
          ? {
              store_id: store.id,
              name: form.get("name"),
              description: form.get("description"),
            }
          : kind === "catalog"
            ? {
                store_id: store.id,
                name: form.get("name"),
                description: form.get("description"),
                published: form.get("status") === "published",
              }
            : {
                store_id: store.id,
                name: form.get("name"),
                status: form.get("status") || "active",
                data: { description: form.get("description") },
              };
      const response = await fetchAuthenticated(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (response.ok) {
        saved();
        return;
      }
    }
    saved();
  }
  return (
    <div className="sf-modal-backdrop">
      <form className="sf-modal" onSubmit={submit}>
        <header>
          <h2>{config[0]}</h2>
          <button type="button" onClick={close}>
            <X />
          </button>
        </header>
        {kind === "network" && (
          <div className="sf-modal-intro">
            <Network />
            <h3>Start a Network</h3>
            <p>
              Quickly create a marketplace enabling multiple storefronts to sell
              under one umbrella.
            </p>
          </div>
        )}
        <div className="sf-modal-fields">
          {kind === "food-truck" ? (
            <>
              <Field label={config[1]}>
                <select name="name">
                  <option>Assign Food Truck Vehicle</option>
                </select>
              </Field>
              <Field label={config[2]}>
                <select name="description">
                  <option>Assign Food Truck to Service Area</option>
                </select>
              </Field>
              <Field label="Food Truck Status">
                <select name="status">
                  <option>Active</option>
                  <option>Inactive</option>
                </select>
              </Field>
            </>
          ) : (
            <>
              <Field label={config[1]} info>
                <input name="name" placeholder={config[1]} required autoFocus />
              </Field>
              <Field label={config[2]} info>
                <input name="description" placeholder={config[2]} />
              </Field>
              {kind === "category" && (
                <Field label="Category icon">
                  <div className="sf-icon-upload">
                    <ImageIcon />
                    <button type="button">
                      <ImageIcon />
                      Upload new category icon
                    </button>
                  </div>
                </Field>
              )}
              {kind === "catalog" && (
                <>
                  <Field label="Catalog Status">
                    <select name="status">
                      <option value="draft">Draft</option>
                      <option value="published">Published</option>
                    </select>
                  </Field>
                  <div className="sf-catalog-select">
                    <strong>Product Catalog</strong>
                    <button type="button">
                      <Plus />
                      Add Catalog Category
                    </button>
                  </div>
                </>
              )}
              {kind === "network" && (
                <Field label="Network currency" info>
                  <select>
                    <option>IN INR - India</option>
                  </select>
                </Field>
              )}
            </>
          )}
        </div>
        <footer>
          <button type="button" onClick={close}>
            <X />
            Cancel
          </button>
          <button className="sf-orange">
            <Check />
            Confirm
          </button>
        </footer>
      </form>
    </div>
  );
}

function Launch({ store }: { store: Row }) {
  return (
    <div className="sf-launch">
      <Rocket />
      <h1>Launch your Storefront</h1>
      <p>
        Your published products are available to connected commerce
        applications.
      </p>
      <code>DROO_STOREFRONT_ID={text(store.id, "str_…")}</code>
      <a
        href="http://localhost:3001"
        target="_blank"
        rel="noreferrer"
        className="sf-orange"
      >
        Open Storefront <ExternalLink />
      </a>
    </div>
  );
}
