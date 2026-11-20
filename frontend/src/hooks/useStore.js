import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { shoesAPI } from "../api";
import { KEYS, load, normalizeFavorites, save, subscribe } from "../lib/storage";
import { products as localProducts } from "../data/catalog";

// ---------- Catalog (API first, local fallback) ----------
export function useCatalog() {
  const [state, setState] = useState({ products: null, loading: true, error: "" });

  const refresh = useCallback(() => {
    const controller = new AbortController();
    shoesAPI
      .getProducts({ signal: controller.signal })
      .then((data) => {
        const list = Array.isArray(data.products) ? data.products : [];
        setState({
          products: list.map((p) => ({ ...localProducts.find((l) => l.id === p.id), ...p, fromApi: true })),
          loading: false,
          error: "",
        });
      })
      .catch((err) => {
        if (err?.name === "AbortError") return;
        setState({ products: null, loading: false, error: err.message || "Could not load products" });
      });
    return () => controller.abort();
  }, []);

  useEffect(() => refresh(), [refresh]);

  return {
    products: state.products ?? (state.loading ? [] : localProducts),
    loading: state.loading,
    error: state.error,
    offline: !state.loading && !state.products,
    refresh,
  };
}

// ---------- Public backend config (feature flags) ----------
export function useConfig() {
  const [config, setConfig] = useState(null);
  useEffect(() => {
    let active = true;
    shoesAPI
      .getConfig()
      .then((c) => active && setConfig(c))
      .catch(() => active && setConfig({ features: { demoCheckout: true } }));
    return () => {
      active = false;
    };
  }, []);
  return config;
}

// ---------- Cart (persisted, cross-tab synced) ----------
export const sameVariant = (a, b) =>
  String(a.id) === String(b.id) && String(a.size ?? "") === String(b.size ?? "") && String(a.color ?? "") === String(b.color ?? "");

function readCart() {
  const v = load(KEYS.cart, null) ?? load(KEYS.legacyCart, []);
  return Array.isArray(v) ? v.filter((i) => i && i.id != null) : [];
}

export function useCart() {
  const [cart, setCart] = useState(readCart);

  useEffect(() => save(KEYS.cart, cart), [cart]);
  useEffect(() => subscribe(KEYS.cart, () => setCart(readCart())), []);

  const add = useCallback((product, { size, color, quantity = 1 } = {}) => {
    const line = {
      id: product.id,
      name: product.name,
      brand: product.brand,
      category: product.category,
      image: product.image,
      price: product.price,
      size: size ?? product.size,
      color: color ?? product.color ?? null,
      quantity: Math.max(1, Math.min(10, Number(quantity) || 1)),
    };
    setCart((current) => {
      const existing = current.find((i) => sameVariant(i, line));
      if (!existing) return [...current, line];
      return current.map((i) =>
        sameVariant(i, line) ? { ...i, quantity: Math.min(10, (Number(i.quantity) || 1) + line.quantity) } : i
      );
    });
  }, []);

  const update = useCallback((target, quantity) => {
    setCart((current) =>
      current
        .map((i) => (sameVariant(i, target) ? { ...i, quantity: Math.max(0, Math.min(10, quantity)) } : i))
        .filter((i) => i.quantity > 0)
    );
  }, []);

  const remove = useCallback((target) => setCart((c) => c.filter((i) => !sameVariant(i, target))), []);
  const clear = useCallback(() => setCart([]), []);
  const count = cart.reduce((s, i) => s + (Number(i.quantity) || 1), 0);

  return { cart, setCart, add, update, remove, clear, count };
}

// ---------- Favorites (shoes-favorites-v2 preserved; optional account sync) ----------
export function useFavorites({ user, getToken, notify }) {
  const [favorites, setFavorites] = useState(() => normalizeFavorites(load(KEYS.favorites, [])));
  const syncedFor = useRef(null);

  useEffect(() => save(KEYS.favorites, favorites), [favorites]);
  useEffect(() => subscribe(KEYS.favorites, () => setFavorites(normalizeFavorites(load(KEYS.favorites, [])))), []);

  // On sign-in: union local + account favorites (never drops either side).
  useEffect(() => {
    const key = user ? `${user.provider}:${user.uid}` : null;
    if (!key || syncedFor.current === key) return;
    syncedFor.current = key;
    let active = true;
    (async () => {
      try {
        const token = await getToken();
        if (!token || !active) return;
        const local = normalizeFavorites(load(KEYS.favorites, [])).filter((id) => typeof id === "number");
        const res = await shoesAPI.mergeFavorites(local, token);
        if (!active) return;
        setFavorites((current) => {
          const merged = [...current];
          for (const id of res.productIds || []) if (!merged.includes(id)) merged.push(id);
          return merged;
        });
      } catch {
        // Account sync is optional; local favorites keep working.
      }
    })();
    return () => {
      active = false;
    };
  }, [user, getToken]);

  const favRef = useRef(favorites);
  useEffect(() => {
    favRef.current = favorites;
  }, [favorites]);

  const toggle = useCallback(
    async (id) => {
      const added = !favRef.current.includes(id);
      favRef.current = added ? [...favRef.current, id] : favRef.current.filter((v) => v !== id);
      setFavorites(favRef.current);
      notify?.(added ? "Added to favorites" : "Removed from favorites");
      if (!user) return;
      try {
        const token = await getToken();
        if (token) await (added ? shoesAPI.addFavorite(id, token) : shoesAPI.removeFavorite(id, token));
      } catch {
        notify?.("Saved on this device. Account sync failed.", { type: "error" });
      }
    },
    [user, getToken, notify]
  );

  return { favorites, toggle, isFavorite: (id) => favorites.includes(id) };
}

// ---------- Recently viewed ----------
export function useRecentlyViewed() {
  const [recent, setRecent] = useState(() => {
    const v = load(KEYS.recent, []);
    return Array.isArray(v) ? v : [];
  });
  useEffect(() => save(KEYS.recent, recent), [recent]);
  useEffect(() => subscribe(KEYS.recent, () => setRecent(load(KEYS.recent, []))), []);
  const track = useCallback((id) => setRecent((r) => [id, ...r.filter((x) => x !== id)].slice(0, 8)), []);
  const clear = useCallback(() => setRecent([]), []);
  return useMemo(() => ({ recent, track, clear }), [recent, track, clear]);
}
