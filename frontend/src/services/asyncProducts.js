const API_URL = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");

export async function fetchProducts({ signal } = {}) {
  try {
    const response = await fetch(`${API_URL}/products`, { signal });

    if (!response.ok) {
      throw new Error(`Failed to load products: ${response.status}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || "Unable to load products");
    }

    return data.products || [];
  } catch (error) {
    if (error.name === "AbortError") {
      throw error;
    }

    console.error("Products API error:", error);
    throw error;
  }
}
