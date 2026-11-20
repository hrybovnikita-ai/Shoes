const API_URL = (import.meta.env.VITE_API_URL || "/api").replace(/\/+$/, "");

export class ApiError extends Error {
  constructor(message, status, code) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

// Universal API request. Always resolves to parsed JSON or throws ApiError
// with a readable message — also for non-JSON (e.g. platform 500 pages) and
// network/CORS failures.
async function request(path, options = {}) {
  const { token, ...rest } = options;
  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...rest,
      headers: {
        ...(rest.body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...rest.headers,
      },
    });
  } catch {
    // fetch() rejects on network errors and on CORS blocks.
    throw new ApiError("Can't reach the SHOES server right now. Please try again in a moment.", 0, "NETWORK");
  }

  let data;
  const type = response.headers.get("content-type") || "";
  if (type.includes("application/json")) {
    try {
      data = await response.json();
    } catch {
      data = undefined;
    }
  }

  if (!response.ok) {
    const fallback =
      response.status >= 500
        ? "The store is temporarily unavailable. Please try again shortly."
        : `Request failed (${response.status})`;
    throw new ApiError(data?.message || fallback, response.status, data?.code);
  }

  if (data === undefined) {
    throw new ApiError("The server sent an unexpected response.", response.status, "BAD_RESPONSE");
  }

  return data;
}

// SHOES Backend API
export const shoesAPI = {
  // Get all sneakers
  getProducts: () => request("/products"),

  // Get sneaker by ID
  getProduct: (id) => request(`/products/${encodeURIComponent(id)}`),

  // Create demo order. The Firebase ID token links the order to the
  // signed-in account (previously the token argument was ignored, so every
  // order was stored as a guest order and "My Orders" stayed empty).
  createOrder: (customer, items, firebaseToken) =>
    request("/orders", {
      method: "POST",
      token: firebaseToken || undefined,
      body: JSON.stringify({
        customer,
        items,
      }),
    }),

  // Signed-in user's identity as verified by the backend
  getMe: (firebaseToken) => request("/me", { token: firebaseToken }),

  // Signed-in user's orders
  getMyOrders: (firebaseToken) => request("/me/orders", { token: firebaseToken }),

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

    let response;
    try {
      response = await fetch(`${API_URL}/orders/${encodeURIComponent(id)}/receipt`, {
        method: "GET",
        headers: {
          "x-receipt-token": token,
        },
      });
    } catch {
      throw new ApiError("Can't reach the SHOES server right now.", 0, "NETWORK");
    }

    if (!response.ok) {
      let message = "Failed to download PDF receipt";

      try {
        const data = await response.json();
        message = data.message || message;
      } catch {
        // The server may return a non-JSON error
      }

      throw new ApiError(message, response.status);
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
