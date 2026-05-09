/**
 * Apple Store VN — Frontend API Client
 * ──────────────────────────────────────────────────────────────────────────
 * Abstraction layer between the UI and the PHP backend.
 *
 * Priority:
 *   1. PHP API files in ./api/  (shared hosting, same domain)
 *   2. Static products.json + localStorage  (GitHub Pages / offline)
 *
 * The client probes ./api/products.php on first call with a 1.5s timeout.
 * If the PHP backend responds the site uses it for all operations.
 * Otherwise everything falls back to the static JSON file.
 */

// Base path to PHP API files (relative to the HTML pages)
const PHP_BASE = 'api';

// Session ID for behavioral tracking (once per page load)
const SESSION_ID = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

// Cached mode after first probe
let _mode = null;   // 'php' | 'static'

// ── Mode detection ─────────────────────────────────────────────────────────────
async function resolveMode() {
    if (_mode) return _mode;

    try {
        const ctrl = new AbortController();
        const tid  = setTimeout(() => ctrl.abort(), 1500);
        const r    = await fetch(`${PHP_BASE}/products.php?limit=1`, { signal: ctrl.signal });
        clearTimeout(tid);
        _mode = r.ok ? 'php' : 'static';
    } catch {
        _mode = 'static';
    }

    return _mode;
}

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
    const mode = await resolveMode();

    if (mode === 'php') {
        const qs = new URLSearchParams(
            Object.fromEntries(Object.entries(opts).filter(([, v]) => v !== undefined && v !== null && v !== ''))
        ).toString();
        const res = await fetch(`${PHP_BASE}/products.php${qs ? '?' + qs : ''}`);
        if (!res.ok) throw new Error(`Products fetch failed: ${res.status}`);
        return res.json();
    }

    // Static fallback
    const all = await fetchStaticProducts();
    return filterStatic(all, opts);
}

/**
 * Fetch a single product by ID.
 * @param {number} id
 */
async function apiGetProduct(id) {
    const mode = await resolveMode();

    if (mode === 'php') {
        const res = await fetch(`${PHP_BASE}/products.php?id=${id}`);
        if (!res.ok) throw new Error(`Product ${id} not found`);
        const json = await res.json();
        return json.data ?? json;
    }

    const all = await fetchStaticProducts();
    const p   = all.find(x => x.id === id);
    if (!p) throw new Error(`Product ${id} not found`);
    return { ...p, priceRange: getStaticPriceRange(p) };
}

/**
 * Typeahead search.
 * @param {string} q
 */
async function apiSearchProducts(q) {
    if (!q || q.trim().length < 2) return { data: [] };
    const mode = await resolveMode();

    if (mode === 'php') {
        const res = await fetch(`${PHP_BASE}/products.php?search=${encodeURIComponent(q)}&limit=10`);
        return res.json();
    }

    const all  = await fetchStaticProducts();
    const term = q.toLowerCase();
    const hits = all
        .filter(p =>
            p.name.toLowerCase().includes(term) ||
            p.category.toLowerCase().includes(term)
        )
        .slice(0, 10)
        .map(p => ({ id: p.id, name: p.name, category: p.category, image: p.image, priceRange: getStaticPriceRange(p) }));

    return { data: hits, query: q };
}

// ════════════════════════════════════════════════════════════════════════════
//  ORDERS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Create an order.
 * @param {Object} payload  — { customer, items, payment, subtotal, shipping, total }
 */
async function apiCreateOrder(payload) {
    const mode = await resolveMode();

    if (mode === 'php') {
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

    return saveOrderToLocalStorage(payload);
}

/** List orders — admin use */
async function apiGetOrders(opts = {}) {
    const mode = await resolveMode();

    if (mode === 'php') {
        const qs = new URLSearchParams(
            Object.fromEntries(Object.entries(opts).filter(([, v]) => v))
        ).toString();
        const res = await fetch(`${PHP_BASE}/orders.php${qs ? '?' + qs : ''}`);
        return res.json();
    }

    const orders = JSON.parse(localStorage.getItem('orders') || '[]');
    return { data: orders, pagination: { total: orders.length } };
}

/** Update order status */
async function apiUpdateOrderStatus(orderId, status) {
    const mode = await resolveMode();

    if (mode === 'php') {
        const res = await fetch(`${PHP_BASE}/orders.php?action=status&id=${encodeURIComponent(orderId)}`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ status })
        });
        return res.json();
    }

    const orders = JSON.parse(localStorage.getItem('orders') || '[]');
    const idx    = orders.findIndex(o => o.id === orderId);
    if (idx !== -1) { orders[idx].status = status; localStorage.setItem('orders', JSON.stringify(orders)); }
    return { data: orders[idx] };
}

// ════════════════════════════════════════════════════════════════════════════
//  BEHAVIORAL TRACKING
// ════════════════════════════════════════════════════════════════════════════

/**
 * Send a behavioral event to track.php (fire-and-forget).
 * No-op in static mode so GitHub Pages deployment stays clean.
 */
async function apiTrack(event, params = {}) {
    const mode = await resolveMode();
    if (mode !== 'php') return;

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

// ════════════════════════════════════════════════════════════════════════════
//  STATIC JSON HELPERS  (GitHub Pages / offline fallback)
// ════════════════════════════════════════════════════════════════════════════

let _staticCache = null;

async function fetchStaticProducts() {
    if (_staticCache) return _staticCache;
    const res   = await fetch('products.json');
    _staticCache = await res.json();
    return _staticCache;
}

function getStaticPriceRange(p) {
    if (!p.variants || p.variants.length === 0) return { min: p.price, max: p.price };
    const prices = p.variants.map(v => v.price);
    return { min: Math.min(...prices), max: Math.max(...prices) };
}

function filterStatic(all, opts) {
    let list = [...all];
    const { cat, condition, minPrice, maxPrice, region, storage, search, sort, page = 1, limit = 20 } = opts;

    if (cat)       list = list.filter(p => p.category  === cat);
    if (condition) list = list.filter(p => p.condition === condition);
    if (minPrice)  list = list.filter(p => getStaticPriceRange(p).max >= parseFloat(minPrice));
    if (maxPrice)  list = list.filter(p => getStaticPriceRange(p).min <= parseFloat(maxPrice));
    if (region)    list = list.filter(p => !p.variants || p.variants.some(v => v.region === region));
    if (storage)   list = list.filter(p => !p.variants || p.variants.some(v => v.storage === storage));
    if (search) {
        const q = search.toLowerCase();
        list = list.filter(p =>
            p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)
        );
    }

    const sorters = {
        price_asc:  (a, b) => getStaticPriceRange(a).min - getStaticPriceRange(b).min,
        price_desc: (a, b) => getStaticPriceRange(b).max - getStaticPriceRange(a).max,
        name_asc:   (a, b) => a.name.localeCompare(b.name),
        newest:     (a, b) => (b.badge === 'New' ? 1 : 0) - (a.badge === 'New' ? 1 : 0)
    };
    if (sorters[sort]) list.sort(sorters[sort]);

    const total = list.length;
    const lim   = Math.min(100, Math.max(1, parseInt(limit)));
    const off   = (Math.max(1, parseInt(page)) - 1) * lim;
    const items = list.slice(off, off + lim).map(p => ({ ...p, priceRange: getStaticPriceRange(p) }));

    return { data: items, pagination: { page: parseInt(page), limit: lim, total, pages: Math.ceil(total / lim) }, filters: { cat, condition, search } };
}

function saveOrderToLocalStorage(payload) {
    const orderId = `ORD-${Date.now()}`;
    const order   = { id: orderId, status: 'pending', ...payload, createdAt: new Date().toISOString() };
    const orders  = JSON.parse(localStorage.getItem('orders') || '[]');
    orders.push(order);
    localStorage.setItem('orders', JSON.stringify(orders));
    return { data: { orderId, status: 'pending' }, message: 'Đặt hàng thành công!' };
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
    getMode:           () => _mode
};
