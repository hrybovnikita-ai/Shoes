import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { shoesAPI } from "../api";
import { fetchProducts } from "../services/asyncProducts";

import {
  KEYS,
  load,
  normalizeFavorites,
  save,
  subscribe,
} from "../lib/storage";

import { products as localProducts } from "../data/catalog";

// ========================================
// ASYNC PRODUCT CATALOG
// ========================================

export function useCatalog() {
  const [state, setState] = useState({
    products: null,
    loading: true,
    error: "",
  });

  const controllerRef = useRef(null);
  const mountedRef = useRef(false);

  const refresh = useCallback(async () => {
    // Cancel any previous request.
    controllerRef.current?.abort();

    const controller = new AbortController();
    controllerRef.current = controller;

    if (mountedRef.current) {
      setState((previous) => ({
        ...previous,
        loading: true,
        error: "",
      }));
    }

    try {
      const apiProducts = await fetchProducts({
        signal: controller.signal,
      });

      if (controller.signal.aborted) return;

      const products = apiProducts.map((product) => {
        const local = localProducts.find(
          (item) => String(item.id) === String(product.id),
        );

        return {
          ...(local || {}),
          ...product,
          fromApi: true,
        };
      });

      if (mountedRef.current) {
        setState({
          products,
          loading: false,
          error: "",
        });
      }
    } catch (error) {
      if (controller.signal.aborted) return;

      if (mountedRef.current) {
        setState((previous) => ({
          products: previous.products,
          loading: false,
          error: error?.message || "Could not load products",
        }));
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    refresh();

    return () => {
      mountedRef.current = false;
      controllerRef.current?.abort();
    };
  }, [refresh]);

  return {
    products: state.products ?? (state.loading ? [] : localProducts),

    loading: state.loading,
    error: state.error,

    offline: !state.loading && state.products === null,

    refresh,
  };
}

// ========================================
// PUBLIC BACKEND CONFIGURATION
// ========================================

export function useConfig() {
  const [config, setConfig] = useState(null);

  useEffect(() => {
    let active = true;

    async function loadConfig() {
      try {
        const result = await shoesAPI.getConfig();

        if (active) {
          setConfig(result);
        }
      } catch {
        if (active) {
          setConfig({
            features: {
              demoCheckout: true,
            },
          });
        }
      }
    }

    loadConfig();

    return () => {
      active = false;
    };
  }, []);

  return config;
}

// ========================================
// SHOPPING CART
// ========================================

export const sameVariant = (a, b) =>
  String(a.id) === String(b.id) &&
  String(a.size ?? "") === String(b.size ?? "") &&
  String(a.color ?? "") === String(b.color ?? "");

function readCart() {
  const value = load(KEYS.cart, null) ?? load(KEYS.legacyCart, []);

  return Array.isArray(value)
    ? value.filter((item) => item && item.id != null)
    : [];
}

export function useCart() {
  const [cart, setCart] = useState(readCart);

  useEffect(() => {
    save(KEYS.cart, cart);
  }, [cart]);

  useEffect(
    () =>
      subscribe(KEYS.cart, () => {
        setCart(readCart());
      }),
    [],
  );

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
      const existing = current.find((item) => sameVariant(item, line));

      if (!existing) {
        return [...current, line];
      }

      return current.map((item) =>
        sameVariant(item, line)
          ? {
              ...item,
              quantity: Math.min(
                10,
                (Number(item.quantity) || 1) + line.quantity,
              ),
            }
          : item,
      );
    });
  }, []);

  const update = useCallback((target, quantity) => {
    setCart((current) =>
      current
        .map((item) =>
          sameVariant(item, target)
            ? {
                ...item,
                quantity: Math.max(0, Math.min(10, quantity)),
              }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );
  }, []);

  const remove = useCallback((target) => {
    setCart((current) => current.filter((item) => !sameVariant(item, target)));
  }, []);

  const clear = useCallback(() => {
    setCart([]);
  }, []);

  const count = cart.reduce(
    (sum, item) => sum + (Number(item.quantity) || 1),
    0,
  );

  return {
    cart,
    setCart,
    add,
    update,
    remove,
    clear,
    count,
  };
}

// ========================================
// FAVORITES
// ========================================

export function useFavorites({ user, getToken, notify }) {
  const [favorites, setFavorites] = useState(() =>
    normalizeFavorites(load(KEYS.favorites, [])),
  );

  const syncedFor = useRef(null);

  useEffect(() => {
    save(KEYS.favorites, favorites);
  }, [favorites]);

  useEffect(
    () =>
      subscribe(KEYS.favorites, () => {
        setFavorites(normalizeFavorites(load(KEYS.favorites, [])));
      }),
    [],
  );

  // Merge local favorites with account favorites.
  useEffect(() => {
    const key = user ? `${user.provider}:${user.uid}` : null;

    if (!key || syncedFor.current === key) {
      return;
    }

    syncedFor.current = key;

    let active = true;

    async function syncFavorites() {
      try {
        const token = await getToken();

        if (!token || !active) return;

        const local = normalizeFavorites(load(KEYS.favorites, [])).filter(
          (id) => typeof id === "number",
        );

        const response = await shoesAPI.mergeFavorites(local, token);

        if (!active) return;

        setFavorites((current) => {
          const merged = [...current];

          for (const id of response.productIds || []) {
            if (!merged.includes(id)) {
              merged.push(id);
            }
          }

          return merged;
        });
      } catch {
        // Local favorites remain available.
      }
    }

    syncFavorites();

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

      favRef.current = added
        ? [...favRef.current, id]
        : favRef.current.filter((value) => value !== id);

      setFavorites(favRef.current);

      notify?.(added ? "Added to favorites" : "Removed from favorites");

      if (!user) return;

      try {
        const token = await getToken();

        if (token) {
          if (added) {
            await shoesAPI.addFavorite(id, token);
          } else {
            await shoesAPI.removeFavorite(id, token);
          }
        }
      } catch {
        notify?.("Saved on this device. Account sync failed.", {
          type: "error",
        });
      }
    },
    [user, getToken, notify],
  );

  const isFavorite = useCallback((id) => favorites.includes(id), [favorites]);

  return {
    favorites,
    toggle,
    isFavorite,
  };
}

// ========================================
// RECENTLY VIEWED PRODUCTS
// ========================================

export function useRecentlyViewed() {
  const [recent, setRecent] = useState(() => {
    const value = load(KEYS.recent, []);

    return Array.isArray(value) ? value : [];
  });

  useEffect(() => {
    save(KEYS.recent, recent);
  }, [recent]);

  useEffect(
    () =>
      subscribe(KEYS.recent, () => {
        const value = load(KEYS.recent, []);

        setRecent(Array.isArray(value) ? value : []);
      }),
    [],
  );

  const track = useCallback((id) => {
    setRecent((current) =>
      [id, ...current.filter((value) => value !== id)].slice(0, 8),
    );
  }, []);

  const clear = useCallback(() => {
    setRecent([]);
  }, []);

  return useMemo(
    () => ({
      recent,
      track,
      clear,
    }),
    [recent, track, clear],
  );
}
