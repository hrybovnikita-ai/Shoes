import { Suspense, useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { shoesAPI } from "../api";
import { useAuth } from "../auth/AuthContext";
import SneakerPreview from "../customizer/SneakerPreview";
import { useCustomizerStore } from "../customizer/store";
import { LinesSkeleton } from "../components/Skeleton";
import { useToast } from "../components/Toast";
import useDocumentMeta from "../hooks/useDocumentMeta";
import { money } from "../lib/format";
import "../customizer/customizer.css";

const MATERIALS = [
  { id: "mesh", label: "Performance mesh (+$0)" },
  { id: "canvas", label: "Canvas (+$8)" },
  { id: "suede", label: "Suede (+$18)" },
  { id: "leather", label: "Leather (+$28)" },
];

export default function CustomizerPage({ products, onAddToCart }) {
  const { productId: routeProductId } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { notify } = useToast();
  const { user, getToken } = useAuth();

  const pid = Number(routeProductId || params.get("product") || products?.[0]?.id || 1);
  const store = useCustomizerStore();
  const [state, setState] = useState({ loading: true, product: null, error: "" });
  const [size, setSize] = useState(42);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");

  useDocumentMeta({ title: "Sneaker Customizer", description: "Design your own SHOES sneaker with real-time 3D preview." });

  useEffect(() => {
    store.setProduct(pid);
    let active = true;
    shoesAPI
      .customizerProduct(pid)
      .then((r) => {
        if (!active) return;
        setState({ loading: false, product: r.product, error: "" });
        if (r.defaultDesign) {
          store.patch({
            upperColor: r.defaultDesign.upperColor,
            soleColor: r.defaultDesign.soleColor,
            laceColor: r.defaultDesign.laceColor,
            heelColor: r.defaultDesign.heelColor,
            material: r.defaultDesign.material,
          });
        }
      })
      .catch((e) => active && setState({ loading: false, product: null, error: e.message }));
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pid]);

  useEffect(() => {
    if (!state.product) return undefined;
    const timer = setTimeout(async () => {
      try {
        const r = await shoesAPI.customizerQuote({ productId: pid, design: store.payload() });
        store.patch({ quoteCents: r.unitPriceCents });
      } catch {
        /* quote optional offline */
      }
    }, 200);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- quote when visual design changes
  }, [state.product, pid, store.upperColor, store.soleColor, store.laceColor, store.heelColor, store.material]);

  async function saveDesign() {
    if (!user) return navigate("/login", { state: { from: { pathname: `/customizer/${pid}` } } });
    setBusy("save");
    setMessage("");
    try {
      const token = await getToken();
      const body = { productId: pid, name: store.designName, design: store.payload() };
      const r = store.designId
        ? await shoesAPI.updateDesign(store.designId, body, token)
        : await shoesAPI.saveDesign(body, token);
      store.patch({ designId: r.design.id });
      setMessage("Design saved to your account.");
      notify("Custom design saved.");
    } catch (e) {
      notify(e.message, { type: "error" });
    } finally {
      setBusy("");
    }
  }

  async function addCart() {
    if (!state.product) return;
    if (!store.designId) {
      notify("Save your design before adding it to the cart.", { type: "error" });
      return;
    }
    onAddToCart(
      { ...state.product, price: store.quoteCents / 100 },
      { size, color: state.product.color, quantity: 1, designId: store.designId, designName: store.designName }
    );
  }

  if (state.loading) {
    return (
      <main className="container customizer-page" id="main-content">
        <LinesSkeleton lines={6} />
      </main>
    );
  }

  if (state.error || !state.product) {
    return (
      <main className="container customizer-page empty-state" id="main-content">
        <h1>Customizer unavailable</h1>
        <p>{state.error || "This product cannot be customized."}</p>
        <button type="button" className="primary" onClick={() => navigate("/shop")}>
          Back to shop
        </button>
      </main>
    );
  }

  return (
    <main className="container customizer-page" id="main-content">
      <button type="button" className="text-link" onClick={() => navigate(`/product/${pid}`)}>
        ← Back to {state.product.name}
      </button>
      <div className="customizer-layout">
        <Suspense fallback={<div className="skeleton customizer-canvas" aria-label="Loading 3D preview" />}>
          <SneakerPreview />
        </Suspense>
        <section className="customizer-panel" aria-labelledby="customizer-title">
          <h1 id="customizer-title">Customize {state.product.name}</h1>
          <p className="muted">Design your pair with a procedural Three.js preview. Colors and materials update instantly.</p>
          <label>
            Design name
            <input value={store.designName} maxLength={80} onChange={(e) => store.patch({ designName: e.target.value })} />
          </label>
          <div className="customizer-swatches">
            <label>Upper color<input type="color" value={store.upperColor} onChange={(e) => store.patch({ upperColor: e.target.value })} /></label>
            <label>Sole color<input type="color" value={store.soleColor} onChange={(e) => store.patch({ soleColor: e.target.value })} /></label>
            <label>Lace color<input type="color" value={store.laceColor} onChange={(e) => store.patch({ laceColor: e.target.value })} /></label>
            <label>Heel color<input type="color" value={store.heelColor} onChange={(e) => store.patch({ heelColor: e.target.value })} /></label>
            <label>
              Material
              <select value={store.material} onChange={(e) => store.patch({ material: e.target.value })}>
                {MATERIALS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              EU size
              <select value={size} onChange={(e) => setSize(Number(e.target.value))}>
                {Array.from({ length: 11 }, (_, i) => 36 + i).map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="customizer-price" aria-live="polite">
            Estimated price: <strong>{money(store.quoteCents / 100)}</strong>
          </p>
          <div className="customizer-actions">
            <button type="button" onClick={() => store.reset()}>
              Reset design
            </button>
            <button type="button" disabled={busy === "save"} onClick={saveDesign}>
              {busy === "save" ? "Saving…" : "Save design"}
            </button>
            <button type="button" className="primary" onClick={addCart}>
              Add customized pair to cart
            </button>
          </div>
          {message && <p role="status">{message}</p>}
          {!user && (
            <p className="muted">
              <a href="/login">Sign in</a> to save designs to your account.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}