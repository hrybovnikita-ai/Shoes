const API_URL = import.meta.env.VITE_API_URL || "/api";

// Universal API request
async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message || `Request failed: ${response.status}`
    );
  }

  return data;
}

// SHOES Backend API
export const shoesAPI = {
  // Get all sneakers
  getProducts: () => request("/products"),

  // Get sneaker by ID
  getProduct: (id) =>
    request(`/products/${encodeURIComponent(id)}`),

  // Create demo order
  createOrder: (customer, items) =>
    request("/orders", {
      method: "POST",
      body: JSON.stringify({
        customer,
        items,
      }),
    }),

  // Get order receipt information
  getReceipt: (id, token) =>
    request(`/orders/${encodeURIComponent(id)}`, {
      headers: {
        "x-receipt-token": token,
      },
    }),

  // Download PDF receipt
  downloadReceipt: async (id, token) => {
    if (!id || !token) {
      throw new Error("Order ID and receipt token are required");
    }

    const response = await fetch(
      `${API_URL}/orders/${encodeURIComponent(id)}/receipt`,
      {
        method: "GET",
        headers: {
          "x-receipt-token": token,
        },
      }
    );

    if (!response.ok) {
      let message = "Failed to download PDF receipt";

      try {
        const data = await response.json();
        message = data.message || message;
      } catch {
        // The server may return a non-JSON error
      }

      throw new Error(message);
    }

    return response.blob();
  },

  // Cancel demo order
  cancelOrder: (id, token) =>
    request(`/orders/${encodeURIComponent(id)}/cancel`, {
      method: "PATCH",
      headers: {
        "x-receipt-token": token,
      },
    }),

  // Check backend health
  getHealth: () => request("/health"),

  // Get store statistics
  getStats: () => request("/stats"),
};
