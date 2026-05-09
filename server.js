/**
 * Apple Store VN — Backend Server
 * Mirrors WooCommerce + custom plugin architecture
 *
 * Architecture:
 *  ┌─────────────────────────────────────────────────────────┐
 *  │  Express REST API  (this file)                          │
 *  │  ├── /api/products          ← Product catalogue         │
 *  │  ├── /api/products/:id      ← Single product + variants │
 *  │  ├── /api/products/search   ← Full-text AJAX search     │
 *  │  ├── /api/orders            ← Order CRUD                │
 *  │  ├── /api/track             ← Behavioral analytics      │
 *  │  └── /api/admin/stats       ← Dashboard aggregates      │
 *  │                                                         │
 *  │  Data layer: products.json  (swap for MySQL/MariaDB)    │
 *  └─────────────────────────────────────────────────────────┘
 *
 * To add real MySQL/MariaDB:
 *   npm install mysql2
 *   Replace readDb() / writeDb() with mysql2 pool queries.
 */

'use strict';

const express    = require('express');
const cors       = require('cors');
const path       = require('path');
const fs         = require('fs');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Paths ────────────────────────────────────────────────────────────────────
const PRODUCTS_FILE = path.join(__dirname, 'products.json');
const ORDERS_FILE   = path.join(__dirname, 'data', 'orders.json');
const EVENTS_FILE   = path.join(__dirname, 'data', 'events.json');

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({ origin: '*' }));           // tighten in production
app.use(express.json({ limit: '512kb' }));
app.use(express.static(__dirname));       // serve front-end files

// Ensure data/ folder exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);

// ── DB helpers (file-based; replace with mysql2 pool for production) ─────────

function readDb(file, fallback = []) {
    try {
        if (!fs.existsSync(file)) return fallback;
        return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch {
        return fallback;
    }
}

function writeDb(file, data) {
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

// ── Variant helpers (mirrors custom WooCommerce plugin logic) ────────────────

/**
 * Resolve the best-match variant for given storage/color/region combination.
 * Priority: exact → storage+color → storage-only → first variant → null
 */
function resolveVariant(variants, storage, color, region) {
    if (!variants || variants.length === 0) return null;
    return (
        variants.find(v => v.storage === storage && v.color === color && v.region === region) ||
        variants.find(v => v.storage === storage && v.color === color)                        ||
        variants.find(v => v.storage === storage)                                             ||
        variants[0]
    );
}

/** Compute min/max price across all variants */
function getPriceRange(product) {
    if (!product.variants || product.variants.length === 0) {
        return { min: product.price, max: product.price };
    }
    const prices = product.variants.map(v => v.price);
    return { min: Math.min(...prices), max: Math.max(...prices) };
}

// ── Request validation helpers ────────────────────────────────────────────────

function validatePagination(query) {
    const page  = Math.max(1, parseInt(query.page)  || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 20));
    return { page, limit, offset: (page - 1) * limit };
}

// ════════════════════════════════════════════════════════════════════════════
//  PRODUCTS API
// ════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/products
 * Query params:
 *   cat        — category filter  (iPhone | Mac | iPad | AirPods | Watch | Accessories)
 *   condition  — New | Used
 *   minPrice   — minimum price
 *   maxPrice   — maximum price
 *   region     — VN | LL/A | ZA/A
 *   storage    — 128GB | 256GB | 512GB | 1TB
 *   search     — full-text search term
 *   sort       — price_asc | price_desc | name_asc | newest
 *   page       — page number (default 1)
 *   limit      — results per page (default 20, max 100)
 */
app.get('/api/products', (req, res) => {
    const all = readDb(PRODUCTS_FILE);
    const { cat, condition, minPrice, maxPrice, region, storage, search, sort } = req.query;
    const { page, limit, offset } = validatePagination(req.query);

    let list = [...all];

    // ── Filters ──
    if (cat)       list = list.filter(p => p.category  === cat);
    if (condition) list = list.filter(p => p.condition === condition);

    if (minPrice || maxPrice) {
        list = list.filter(p => {
            const { min, max } = getPriceRange(p);
            const lo = parseFloat(minPrice) || 0;
            const hi = parseFloat(maxPrice) || Infinity;
            return max >= lo && min <= hi;
        });
    }

    // Filter by region/storage across variants
    if (region) {
        list = list.filter(p => !p.variants || p.variants.some(v => v.region === region));
    }
    if (storage) {
        list = list.filter(p => !p.variants || p.variants.some(v => v.storage === storage));
    }

    // Full-text search across name, description, category
    if (search) {
        const q = search.toLowerCase();
        list = list.filter(p =>
            p.name.toLowerCase().includes(q)        ||
            p.description.toLowerCase().includes(q) ||
            p.category.toLowerCase().includes(q)
        );
    }

    // ── Sorting ──
    const sorters = {
        price_asc:  (a, b) => getPriceRange(a).min - getPriceRange(b).min,
        price_desc: (a, b) => getPriceRange(b).max - getPriceRange(a).max,
        name_asc:   (a, b) => a.name.localeCompare(b.name),
        newest:     (a, b) => (b.badge === 'New' ? 1 : 0) - (a.badge === 'New' ? 1 : 0)
    };
    if (sorters[sort]) list.sort(sorters[sort]);

    // ── Pagination ──
    const total     = list.length;
    const paginated = list.slice(offset, offset + limit);

    // Attach price ranges to each product
    const items = paginated.map(p => ({
        ...p,
        priceRange: getPriceRange(p)
    }));

    res.json({
        data:       items,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
        filters:    { cat: cat || null, condition: condition || null, search: search || null }
    });
});

/**
 * GET /api/products/search
 * Lightweight search endpoint for typeahead / AJAX search
 * Returns top 10 matches with minimal payload
 */
app.get('/api/products/search', (req, res) => {
    const { q } = req.query;
    if (!q || q.trim().length < 2) return res.json({ data: [] });

    const all  = readDb(PRODUCTS_FILE);
    const term = q.toLowerCase().trim();

    const results = all
        .filter(p =>
            p.name.toLowerCase().includes(term) ||
            p.category.toLowerCase().includes(term) ||
            p.description.toLowerCase().includes(term)
        )
        .slice(0, 10)
        .map(p => ({
            id:       p.id,
            name:     p.name,
            category: p.category,
            image:    p.image,
            priceRange: getPriceRange(p)
        }));

    res.json({ data: results, query: q });
});

/**
 * GET /api/products/:id
 * Returns full product with variants and resolved price range
 */
app.get('/api/products/:id', (req, res) => {
    const all     = readDb(PRODUCTS_FILE);
    const product = all.find(p => p.id === parseInt(req.params.id));

    if (!product) return res.status(404).json({ error: 'Product not found' });

    // Optionally resolve a specific variant from query params
    const { storage, color, region } = req.query;
    const resolvedVariant = (storage || color || region)
        ? resolveVariant(product.variants, storage, color, region)
        : null;

    res.json({
        data: {
            ...product,
            priceRange:      getPriceRange(product),
            resolvedVariant: resolvedVariant || null
        }
    });
});

/**
 * GET /api/products/:id/variants
 * Returns aggregated variant options for a product
 * (mirrors WooCommerce variation attributes endpoint)
 */
app.get('/api/products/:id/variants', (req, res) => {
    const all     = readDb(PRODUCTS_FILE);
    const product = all.find(p => p.id === parseInt(req.params.id));

    if (!product) return res.status(404).json({ error: 'Product not found' });

    const variants = product.variants || [];
    const options  = {
        storage: [...new Set(variants.map(v => v.storage).filter(Boolean))],
        color:   [...new Set(variants.map(v => v.color).filter(Boolean))],
        region:  [...new Set(variants.map(v => v.region).filter(Boolean))]
    };

    // Availability matrix: which combinations exist
    const matrix = variants.map(v => ({
        storage:  v.storage,
        color:    v.color,
        region:   v.region,
        price:    v.price,
        inStock:  true   // extend with real stock tracking
    }));

    res.json({ data: { options, matrix, count: variants.length } });
});

// ════════════════════════════════════════════════════════════════════════════
//  ORDERS API  (mirrors WooCommerce Orders REST API)
// ════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/orders
 * Create a new order. Body mirrors WooCommerce order schema.
 * {
 *   customer: { name, email, phone, address, city, note },
 *   items:    [{ id, name, price, quantity, _variant }],
 *   payment:  'cod' | 'bank_transfer',
 *   subtotal, shipping, total
 * }
 */
app.post('/api/orders', (req, res) => {
    const { customer, items, payment, subtotal, shipping, total } = req.body;

    // Input validation
    if (!customer?.name || !customer?.phone) {
        return res.status(400).json({ error: 'Thiếu thông tin khách hàng' });
    }
    if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Giỏ hàng trống' });
    }
    if (typeof total !== 'number' || total <= 0) {
        return res.status(400).json({ error: 'Tổng tiền không hợp lệ' });
    }

    const orders = readDb(ORDERS_FILE, []);
    const orderId = `ORD-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

    const order = {
        id:        orderId,
        status:    'pending',
        customer,
        items,
        payment:   payment || 'cod',
        subtotal:  subtotal || total,
        shipping:  shipping || 0,
        total,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    orders.push(order);
    writeDb(ORDERS_FILE, orders);

    // In production: trigger email notification, Slack webhook, etc.

    res.status(201).json({ data: { orderId, status: 'pending' }, message: 'Đặt hàng thành công!' });
});

/**
 * GET /api/orders
 * List all orders (admin endpoint — add auth middleware in production)
 */
app.get('/api/orders', (req, res) => {
    const orders = readDb(ORDERS_FILE, []);
    const { page, limit, offset } = validatePagination(req.query);
    const { status } = req.query;

    let list = [...orders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    if (status) list = list.filter(o => o.status === status);

    const total = list.length;
    res.json({
        data:       list.slice(offset, offset + limit),
        pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
});

/**
 * GET /api/orders/:id
 */
app.get('/api/orders/:id', (req, res) => {
    const orders = readDb(ORDERS_FILE, []);
    const order  = orders.find(o => o.id === req.params.id);
    if (!order) return res.status(404).json({ error: 'Không tìm thấy đơn hàng' });
    res.json({ data: order });
});

/**
 * PATCH /api/orders/:id/status
 * Update order status: pending → processing → shipped → delivered | cancelled
 */
app.patch('/api/orders/:id/status', (req, res) => {
    const { status } = req.body;
    const VALID = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!VALID.includes(status)) {
        return res.status(400).json({ error: `Status must be one of: ${VALID.join(', ')}` });
    }

    const orders = readDb(ORDERS_FILE, []);
    const idx    = orders.findIndex(o => o.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Không tìm thấy đơn hàng' });

    orders[idx].status    = status;
    orders[idx].updatedAt = new Date().toISOString();
    writeDb(ORDERS_FILE, orders);

    res.json({ data: orders[idx] });
});

// ════════════════════════════════════════════════════════════════════════════
//  BEHAVIORAL TRACKING API  (custom AJAX endpoints)
// ════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/track
 * Receive front-end behavioral events and persist them server-side.
 * This supplements GA4/GTM with raw event storage for custom analysis.
 *
 * Accepted event types:
 *   page_view | view_item | add_to_cart | filter_products |
 *   scroll_depth | time_on_page | click_call | search
 */
app.post('/api/track', (req, res) => {
    const { event, params, sessionId, url, userAgent } = req.body;

    if (!event || typeof event !== 'string') {
        return res.status(400).json({ error: 'event name required' });
    }

    const ALLOWED_EVENTS = new Set([
        'page_view', 'view_item', 'add_to_cart', 'filter_products',
        'scroll_depth', 'time_on_page', 'click_call', 'search',
        'begin_checkout', 'purchase'
    ]);

    if (!ALLOWED_EVENTS.has(event)) {
        return res.status(400).json({ error: 'Unknown event type' });
    }

    const events = readDb(EVENTS_FILE, []);
    events.push({
        event,
        params:    params    || {},
        sessionId: sessionId || null,
        url:       url       || null,
        userAgent: userAgent || null,
        ip:        req.ip,
        timestamp: new Date().toISOString()
    });

    // Keep last 50,000 events (rotate in production via a real DB)
    const trimmed = events.length > 50000 ? events.slice(-50000) : events;
    writeDb(EVENTS_FILE, trimmed);

    res.json({ ok: true });
});

// ════════════════════════════════════════════════════════════════════════════
//  ADMIN STATS API
// ════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/admin/stats
 * Revenue, order count, top products, event summary
 */
app.get('/api/admin/stats', (req, res) => {
    const orders   = readDb(ORDERS_FILE, []);
    const events   = readDb(EVENTS_FILE, []);
    const products = readDb(PRODUCTS_FILE, []);

    const activeOrders = orders.filter(o => o.status !== 'cancelled');
    const revenue      = activeOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    const customers    = new Set(activeOrders.map(o => o.customer?.email).filter(Boolean)).size;

    // Top 5 products by order frequency
    const productFreq = {};
    activeOrders.forEach(o => {
        (o.items || []).forEach(item => {
            productFreq[item.id] = (productFreq[item.id] || 0) + item.quantity;
        });
    });
    const topProducts = Object.entries(productFreq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([id, qty]) => {
            const p = products.find(x => String(x.id) === String(id));
            return { id, name: p?.name || 'Unknown', qty };
        });

    // Event counts (last 7 days)
    const since7d   = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
    const recent    = events.filter(e => e.timestamp >= since7d);
    const eventSums = recent.reduce((acc, e) => { acc[e.event] = (acc[e.event] || 0) + 1; return acc; }, {});

    res.json({
        data: {
            orders:      { total: orders.length, active: activeOrders.length, revenue },
            customers,
            topProducts,
            events7d:    eventSums,
            catalogSize: products.length
        }
    });
});

// ════════════════════════════════════════════════════════════════════════════
//  SPA FALLBACK  (serve index.html for all unmatched routes)
// ════════════════════════════════════════════════════════════════════════════

app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(__dirname, 'index.html'));
    } else {
        res.status(404).json({ error: 'API endpoint not found' });
    }
});

// ── Start ─────────────────────────────────────────────────────────────────────
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`\n  Apple Store VN Backend`);
        console.log(`  ├─ Server:    http://localhost:${PORT}`);
        console.log(`  ├─ Products:  http://localhost:${PORT}/api/products`);
        console.log(`  ├─ Orders:    http://localhost:${PORT}/api/orders`);
        console.log(`  ├─ Track:     http://localhost:${PORT}/api/track`);
        console.log(`  └─ Stats:     http://localhost:${PORT}/api/admin/stats\n`);
    });
}

module.exports = app; // for testing
