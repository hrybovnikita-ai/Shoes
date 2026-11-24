const API_URL = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

// ========================================
// AUTHENTICATION
// ========================================

function authHeaders(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ========================================
// UNIVERSAL API REQUEST
// ========================================

// Supports Firebase and Clerk tokens.
async function request(path, { token, headers, signal, ...options } = {}) {
  let response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      signal,
      headers: {
        Accept: "application/json",
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...authHeaders(token),
        ...headers,
      },
    });
  } catch (err) {
    if (err?.name === "AbortError") {
      throw err;
    }

    throw new ApiError(
      "Cannot reach the SHOES server. Check your connection and try again.",
      0,
    );
  }

  let data;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const fallback =
      response.status === 401
        ? "Please sign in again."
        : response.status === 403
          ? "You do not have permission to access this resource."
          : response.status === 429
            ? "Too many requests. Please wait a moment."
            : `Request failed (${response.status})`;

    throw new ApiError(
      data?.message || data?.error || fallback,
      response.status,
      data,
    );
  }

  return data ?? {};
}

// ========================================
// PDF DOWNLOAD
// ========================================

async function download(path, { token, receiptToken } = {}) {
  let response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      headers: {
        ...authHeaders(token),
        ...(receiptToken ? { "x-receipt-token": receiptToken } : {}),
      },
    });
  } catch {
    throw new ApiError("Cannot reach the SHOES server.", 0);
  }

  if (!response.ok) {
    let message = "Failed to download the PDF receipt";

    try {
      const data = await response.json();

      message = data?.message || data?.error || message;
    } catch {
      // Non-JSON response.
    }

    throw new ApiError(message, response.status);
  }

  return response.blob();
}

// ========================================
// UTILITIES
// ========================================

const json = (body) => JSON.stringify(body);
const enc = encodeURIComponent;

// ========================================
// SHOES API
// ========================================

export const shoesAPI = {
  search: (params, opts) => request(`/search?${new URLSearchParams(params)}`, opts),
  inventory: (id, opts) => request(`/products/${enc(id)}/inventory`, opts),
  sizeGuide: (brand) => request(`/size-guide?${new URLSearchParams({brand})}`),
  getSizes: (token) => request('/me/sizes', {token}),
  saveSize: (body, token) => request('/me/sizes', {method:'PUT', body:json(body), token}),
  prices: (id, opts) => request(`/products/${enc(id)}/prices`, opts),
  priceAlerts: (token) => request('/me/price-alerts', {token}),
  watchPrice: (id,targetPrice,token) => request(`/me/price-alerts/${enc(id)}`, {method:'PUT',body:json({targetPrice}),token}),
  unwatchPrice: (id,token) => request(`/me/price-alerts/${enc(id)}`, {method:'DELETE',token}),
  reserve: (key,items,token) => request('/reservations', {method:'POST',body:json({key,items}),token}),
  releaseReservation: (key,token) => request(`/reservations/${enc(key)}`, {method:'DELETE',token}),
  adminInventory: (token) => request('/admin/inventory',{token}),
  saveInventory: (id,body,token) => request(`/admin/inventory/${enc(id)}`,{method:'PUT',body:json(body),token}),
  setPrice: (id,body,token) => request(`/admin/products/${enc(id)}/price`,{method:'PUT',body:json(body),token}),
  saveChart: (brand,body,token) => request(`/admin/size-charts/${enc(brand)}`,{method:'PUT',body:json(body),token}),
  customizerProduct: (id, opts) => request(`/products/${enc(id)}/customizer`, opts),
  customizerQuote: (body, opts) => request('/customizer/quote', { method: 'POST', body: json(body), ...opts }),
  getDesigns: (token) => request('/me/designs', { token }),
  saveDesign: (body, token) => request('/me/designs', { method: 'POST', body: json(body), token }),
  updateDesign: (id, body, token) => request(`/me/designs/${enc(id)}`, { method: 'PUT', body: json(body), token }),
  deleteDesign: (id, token) => request(`/me/designs/${enc(id)}`, { method: 'DELETE', token }),
  getOrderTracking: (id, { token, receiptToken } = {}) =>
    request(`/orders/${enc(id)}/tracking`, {
      token,
      headers: receiptToken ? { 'x-receipt-token': receiptToken } : {},
    }),
  updateFulfillment: (id, body, token) =>
    request(`/admin/orders/${enc(id)}/fulfillment`, { method: 'PATCH', body: json(body), token }),
  // ========================================
  // GENERAL
  // ========================================

  getConfig: (opts) => request("/config", opts),

  getHealth: () => request("/health"),

  getStats: () => request("/stats"),

  // ========================================
  // ADMIN DASHBOARD
  // ========================================

  // Verify current administrator.
  getAdminMe: (token) =>
    request("/admin/me", {
      token,
    }),

  // Real PostgreSQL statistics.
  getAdminStats: (token) =>
    request("/admin/stats", {
      token,
    }),

  // Get orders.
  getAdminOrders: (token, opts = {}) =>
    request("/admin/orders", {
      ...opts,
      token,
    }),

  // Get users.
  getAdminUsers: (token, opts = {}) =>
    request("/admin/users", {
      ...opts,
      token,
    }),

  // Check Admin API health.
  getAdminHealth: (token) =>
    request("/admin/health", {
      token,
    }),

  // ========================================
  // PRODUCTS
  // ========================================

  getProducts: (opts) => request("/products", opts),

  getProduct: (id, opts) => request(`/products/${enc(id)}`, opts),

  getRelated: (id, opts) => request(`/products/${enc(id)}/related`, opts),

  getReviews: (id, opts) => request(`/products/${enc(id)}/reviews`, opts),

  createReview: (id, review, token) =>
    request(`/products/${enc(id)}/reviews`, {
      method: "POST",
      body: json(review),
      token,
    }),

  // ========================================
  // SHOPPING CART
  // ========================================

  quote: (items, promoCode, opts) =>
    request("/cart/quote", {
      method: "POST",
      body: json({
        items,
        promoCode,
      }),
      ...opts,
    }),

  // ========================================
  // ORDERS
  // ========================================

  createOrder: (payload, token) =>
    request("/orders", {
      method: "POST",
      body: json(payload),
      token,
    }),

  getReceipt: (id, receiptToken, token) =>
    request(`/orders/${enc(id)}`, {
      token,
      headers: receiptToken ? { "x-receipt-token": receiptToken } : {},
    }),

  downloadReceipt: (id, { receiptToken, token } = {}) => {
    if (!id || (!receiptToken && !token)) {
      throw new ApiError("Order ID and receipt access are required", 400);
    }

    return download(`/orders/${enc(id)}/receipt`, {
      receiptToken,
      token,
    });
  },

  cancelOrder: (id, { receiptToken, token } = {}) =>
    request(`/orders/${enc(id)}/cancel`, {
      method: "PATCH",
      token,
      headers: receiptToken ? { "x-receipt-token": receiptToken } : {},
    }),

  // ========================================
  // USER ACCOUNT
  // ========================================

  getMe: (token) =>
    request("/me", {
      token,
    }),

  getMyOrders: (token, opts) =>
    request("/me/orders", {
      token,
      ...opts,
    }),

  // ========================================
  // FAVORITES
  // ========================================

  getFavorites: (token) =>
    request("/me/favorites", {
      token,
    }),

  mergeFavorites: (productIds, token) =>
    request("/me/favorites", {
      method: "PUT",
      body: json({
        productIds,
      }),
      token,
    }),

  addFavorite: (id, token) =>
    request(`/me/favorites/${enc(id)}`, {
      method: "POST",
      token,
    }),

  removeFavorite: (id, token) =>
    request(`/me/favorites/${enc(id)}`, {
      method: "DELETE",
      token,
    }),

  // ========================================
  // IDENTITY LINKING
  // ========================================

  linkIdentity: (otherToken, token) =>
    request("/me/link-identity", {
      method: "POST",
      body: json({
        token: otherToken,
      }),
      token,
    }),

  // ========================================
  // ORDER CLAIMS
  // ========================================

  requestOrderClaim: (orderId, token) =>
    request("/me/orders/claim/request", {
      method: "POST",
      body: json({
        orderId,
      }),
      token,
    }),

  confirmOrderClaim: (orderId, code, token) =>
    request("/me/orders/claim/confirm", {
      method: "POST",
      body: json({
        orderId,
        code,
      }),
      token,
    }),

  // ========================================
  // NEWSLETTER
  // ========================================

  subscribeNewsletter: (email) =>
    request("/newsletter", {
      method: "POST",
      body: json({
        email,
      }),
    }),
};

// ========================================
// FILE DOWNLOAD UTILITY
// ========================================

export function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");

  a.href = url;
  a.download = filename;

  document.body.appendChild(a);
  a.click();
  a.remove();

  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}
