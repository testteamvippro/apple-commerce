/**
 * Apple Store VN — Frontend API Client
 * Deployment is PHP/MySQL-first, so the client talks directly to the live API.
 */

// Base path to PHP API files (relative to the HTML pages)
const PHP_BASE = 'api';

// Session ID for behavioral tracking (once per page load)
const SESSION_ID = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

const API_MODE = 'php';

// ════════════════════════════════════════════════════════════════════════════
//  PRODUCTS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Fetch product list.
 * @param {Object} opts  — cat, condition, minPrice, maxPrice, region, storage,
 *                         search, sort, page, limit
 * @returns {{ data, pagination, filters }}
 */
async function apiGetProducts(opts = {}) {
    const qs = new URLSearchParams(
        Object.fromEntries(Object.entries(opts).filter(([, v]) => v !== undefined && v !== null && v !== ''))
    ).toString();
    const res = await fetch(`${PHP_BASE}/products.php${qs ? '?' + qs : ''}`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Products fetch failed: ${res.status}`);
    return res.json();
}

/**
 * Fetch a single product by ID.
 * @param {number} id
 */
async function apiGetProduct(id) {
    const res = await fetch(`${PHP_BASE}/products.php?id=${id}`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Product ${id} not found`);
    const json = await res.json();
    return json.data ?? json;
}

/**
 * Typeahead search.
 * @param {string} q
 */
async function apiSearchProducts(q) {
    if (!q || q.trim().length < 2) return { data: [] };
    const res = await fetch(`${PHP_BASE}/products.php?search=${encodeURIComponent(q)}&limit=10`, { cache: 'no-store' });
    return res.json();
}

// ════════════════════════════════════════════════════════════════════════════
//  ORDERS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Create an order.
 * @param {Object} payload  — { customer, items, payment, subtotal, shipping, total }
 */
async function apiCreateOrder(payload) {
    const res = await fetch(`${PHP_BASE}/orders.php`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload)
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Order creation failed');
    }
    return res.json();
}

/** List orders — admin use */
async function apiGetOrders(opts = {}) {
    const qs = new URLSearchParams(
        Object.fromEntries(Object.entries(opts).filter(([, v]) => v))
    ).toString();
    const res = await fetch(`${PHP_BASE}/orders.php${qs ? '?' + qs : ''}`, { cache: 'no-store' });
    return res.json();
}

/** Update order status */
async function apiUpdateOrderStatus(orderId, status) {
    const res = await fetch(`${PHP_BASE}/orders.php?action=status&id=${encodeURIComponent(orderId)}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ status })
    });
    return res.json();
}

// ════════════════════════════════════════════════════════════════════════════
//  BEHAVIORAL TRACKING
// ════════════════════════════════════════════════════════════════════════════

/**
 * Send a behavioral event to track.php (fire-and-forget).
 * No-op in static mode so GitHub Pages deployment stays clean.
 */
async function apiTrack(event, params = {}) {
    const body = JSON.stringify({ event, params, sessionId: SESSION_ID, url: window.location.href });

    if (navigator.sendBeacon) {
        navigator.sendBeacon(`${PHP_BASE}/track.php`, new Blob([body], { type: 'application/json' }));
    } else {
        fetch(`${PHP_BASE}/track.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body,
            keepalive: true
        }).catch(() => {});
    }
}

// ── Public API ─────────────────────────────────────────────────────────────────
window.AppleStoreAPI = {
    getProducts:       apiGetProducts,
    getProduct:        apiGetProduct,
    searchProducts:    apiSearchProducts,
    createOrder:       apiCreateOrder,
    getOrders:         apiGetOrders,
    updateOrderStatus: apiUpdateOrderStatus,
    track:             apiTrack,
    getMode:           () => API_MODE
};
