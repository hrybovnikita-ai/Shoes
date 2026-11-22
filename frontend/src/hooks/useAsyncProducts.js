import { useEffect, useState } from "react";
import { fetchProducts } from "../services/asyncProducts";

export function useAsyncProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadProducts() {
      try {
        setLoading(true);
        setError(null);

        const data = await fetchProducts({
          signal: controller.signal,
        });

        if (!controller.signal.aborted) {
          setProducts(data);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(err.message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadProducts();

    return () => controller.abort();
  }, []);

  return { products, loading, error };
}
