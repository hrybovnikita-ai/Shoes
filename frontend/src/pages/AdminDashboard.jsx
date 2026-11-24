import { useEffect, useMemo, useState } from "react";
import { shoesAPI } from "../api";
import { useAuth } from "../auth/AuthContext";
import "./AdminDashBoard.css";

import AdminCommerce from "../commerce/AdminCommerce";
import AdminTrackingPanel from "../admin/AdminTrackingPanel";
const sections = ["Overview", "Products", "Inventory", "Orders", "Tracking", "Users"];

const money = (value) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(value) || 0);

const dateText = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("en-US");
};

function EmptyRow({ columns, children }) {
  return (
    <tr>
      <td colSpan={columns}>{children}</td>
    </tr>
  );
}

export default function AdminDashboard() {
  const { getToken } = useAuth();

  const [section, setSection] = useState("Overview");
  const [search, setSearch] = useState("");

  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [users, setUsers] = useState([]);
  const [storeStats, setStoreStats] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      setLoading(true);
      setError("");

      try {
        const token = await getToken();

        if (!token) {
          throw new Error("Authentication is required.");
        }

        const [productsResponse, statsResponse, ordersResponse, usersResponse] =
          await Promise.all([
            shoesAPI.getProducts(),
            shoesAPI.getAdminStats(token),
            shoesAPI.getAdminOrders(token),
            shoesAPI.getAdminUsers(token),
          ]);

        if (cancelled) return;

        setProducts(
          Array.isArray(productsResponse.products)
            ? productsResponse.products
            : [],
        );

        setStoreStats(statsResponse.stats ?? null);

        setOrders(
          Array.isArray(ordersResponse.orders) ? ordersResponse.orders : [],
        );

        setUsers(Array.isArray(usersResponse.users) ? usersResponse.users : []);
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || "Failed to load dashboard data.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [getToken]);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();

    return products.filter((product) =>
      String(product.name || "")
        .toLowerCase()
        .includes(query),
    );
  }, [products, search]);

  const stats = [
    {
      label: "Products",
      value: loading ? "…" : products.length,
    },
    {
      label: "Orders",
      value: storeStats?.orders ?? "—",
    },
    {
      label: "Users",
      value: storeStats?.users ?? "—",
    },
    {
      label: "Revenue",
      value: storeStats?.revenue != null ? money(storeStats.revenue) : "—",
    },
  ];

  return (
    <div className="shoes-admin">
      <aside className="admin-sidebar">
        <h2>
          SHOES<span>.</span>
        </h2>

        <p>ADMIN PANEL</p>

        <nav aria-label="Admin navigation">
          {sections.map((item) => (
            <button
              key={item}
              type="button"
              className={section === item ? "active" : ""}
              onClick={() => setSection(item)}
            >
              {item}
            </button>
          ))}
        </nav>
      </aside>

      <main className="admin-main" id="main-content">
        <header className="admin-header">
          <div>
            <p>STORE MANAGEMENT</p>
            <h1>{section}</h1>
          </div>

          <span className="admin-tag">ADMIN</span>
        </header>

        {error && (
          <div
            className="admin-panel"
            role="alert"
            style={{ marginBottom: 16 }}
          >
            <h2>Could not load dashboard</h2>
            <p>{error}</p>
          </div>
        )}

        {loading && <p role="status">Loading store data…</p>}

        {section === "Overview" && (
          <>
            <div className="admin-stats">
              {stats.map((stat) => (
                <div className="admin-stat" key={stat.label}>
                  <p>{stat.label}</p>
                  <h2>{stat.value}</h2>
                </div>
              ))}
            </div>

            <div className="admin-panel">
              <h2>Welcome to SHOES Admin</h2>

              <p>Manage your store with real data from PostgreSQL.</p>

              {storeStats && (
                <p>
                  Paid orders: {storeStats.paid_orders ?? 0}
                  {" · "}
                  Unpaid orders: {storeStats.unpaid_orders ?? 0}
                </p>
              )}
            </div>
          </>
        )}

        {section === "Inventory" && <AdminCommerce/>}
        {section === "Products" && (
          <div className="admin-panel">
            <div className="admin-panel-header">
              <h2>Products ({products.length})</h2>

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search products..."
                aria-label="Search products"
              />
            </div>

            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Brand</th>
                    <th>Price</th>
                    <th>Stock</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredProducts.map((product) => (
                    <tr key={product.id}>
                      <td>{product.name}</td>
                      <td>{product.brand || "—"}</td>
                      <td>{money(product.price)}</td>
                      <td>{product.stock ?? "—"}</td>
                    </tr>
                  ))}

                  {!loading && filteredProducts.length === 0 && (
                    <EmptyRow columns={4}>No products found.</EmptyRow>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {section === "Orders" && (
          <div className="admin-panel">
            <div className="admin-panel-header">
              <h2>Orders</h2>
            </div>

            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Customer</th>
                    <th>Payment</th>
                    <th>Provider</th>
                    <th>Date</th>
                  </tr>
                </thead>

                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id}>
                      <td>#{order.id}</td>

                      <td>
                        {order.customer_name || order.customer_email || "Guest"}
                      </td>

                      <td>{order.payment_status || "—"}</td>

                      <td>{order.payment_provider || "—"}</td>

                      <td>{dateText(order.created_at)}</td>
                    </tr>
                  ))}

                  {!loading && orders.length === 0 && (
                    <EmptyRow columns={5}>No orders found.</EmptyRow>
                  )}
                </tbody>
              </table>
            </div>

            <p>Showing up to 20 recent orders.</p>
          </div>
        )}

        {section === "Tracking" && (
          <AdminTrackingPanel
            orders={orders}
            onUpdated={async () => {
              try {
                const token = await getToken();
                const ordersResponse = await shoesAPI.getAdminOrders(token);
                setOrders(Array.isArray(ordersResponse.orders) ? ordersResponse.orders : []);
              } catch {
                /* ignore */
              }
            }}
          />
        )}

        {section === "Users" && (
          <div className="admin-panel">
            <div className="admin-panel-header">
              <h2>Users</h2>
            </div>

            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Provider</th>
                    <th>Joined</th>
                  </tr>
                </thead>

                <tbody>
                  {users.map((account) => (
                    <tr key={account.id}>
                      <td>#{account.id}</td>

                      <td>{account.display_name || "—"}</td>

                      <td>{account.email || "—"}</td>

                      <td>{account.role || "customer"}</td>

                      <td>
                        {[
                          account.firebase && "Firebase",
                          account.clerk && "Clerk",
                        ]
                          .filter(Boolean)
                          .join(", ") || "—"}
                      </td>

                      <td>{dateText(account.created_at)}</td>
                    </tr>
                  ))}

                  {!loading && users.length === 0 && (
                    <EmptyRow columns={6}>No users found.</EmptyRow>
                  )}
                </tbody>
              </table>
            </div>

            <p>Showing up to 20 recent users.</p>
          </div>
        )}
      </main>
    </div>
  );
}
