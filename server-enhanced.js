/**
 * Apple Store VN — Enhanced Express Backend (v2.0)
 * 
 * Features:
 * - RESTful API endpoints
 * - Order management
 * - Product catalog
 * - Review system
 * - Email notifications
 * - Admin statistics
 * - Request validation
 * - Error handling
 * 
 * Setup:
 * npm install express cors dotenv nodemailer uuid
 * Create .env file with configuration
 * npm run dev
 */

'use strict';

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const nodemailer = require('nodemailer');

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Directories
const dataDir = path.join(__dirname, 'data');
const logsDir = path.join(__dirname, 'logs');
const uploadsDir = path.join(__dirname, 'data', 'uploads');

[dataDir, logsDir, uploadsDir].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// File paths
const FILES = {
    products: path.join(__dirname, 'products.json'),
    orders: path.join(dataDir, 'orders.json'),
    reviews: path.join(dataDir, 'reviews.json'),
    events: path.join(dataDir, 'events.json')
};

// Email transporter
const emailTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'localhost',
    port: process.env.SMTP_PORT || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || ''
    }
});

// ═══════════════════════════════════════════════════════════════════════════
// MIDDLEWARE
// ═══════════════════════════════════════════════════════════════════════════

app.use(cors({
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
}));

app.use(express.json({ limit: '512kb' }));
app.use(express.urlencoded({ limit: '512kb', extended: true }));
app.use(express.static(__dirname));

// Request logging
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        logEvent('HTTP_REQUEST', {
            method: req.method,
            path: req.path,
            status: res.statusCode,
            duration: `${duration}ms`
        });
    });
    next();
});

// ═══════════════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Response helpers
 */
const respond = {
    success: (res, data, message = 'Success', code = 200) => {
        res.status(code).json({
            success: true,
            message,
            data
        });
    },

    error: (res, message, code = 400) => {
        res.status(code).json({
            success: false,
            error: message,
            code
        });
    }
};

/**
 * Input validation
 */
const validate = {
    email: (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
    phone: (phone) => /^[0-9\-\+\s]{9,}$/.test(phone.replace(/\s/g, '')),
    name: (name) => /^[a-zA-ZÀ-ỿ\s]{2,}$/.test(name.trim()),
    url: (url) => /^https?:\/\/.+/.test(url),
    required: (value) => value && String(value).trim().length > 0
};

/**
 * Sanitization
 */
const sanitize = {
    string: (value, maxLen = 200) => {
        return typeof value === 'string' 
            ? value.trim().substring(0, maxLen) 
            : '';
    },
    
    email: (value) => {
        return sanitize.string(value, 100).toLowerCase();
    },
    
    phone: (value) => {
        return String(value).replace(/[^0-9\-\+\s]/g, '');
    },
    
    json: (obj) => {
        if (typeof obj !== 'object') return null;
        return JSON.parse(JSON.stringify(obj));
    }
};

/**
 * File I/O helpers
 */
const fileIO = {
    read: (file, defaults = null) => {
        try {
            if (!fs.existsSync(file)) return defaults;
            const content = fs.readFileSync(file, 'utf8');
            return JSON.parse(content) || defaults;
        } catch (e) {
            console.error(`Error reading ${file}:`, e.message);
            return defaults;
        }
    },

    write: (file, data) => {
        try {
            const dir = path.dirname(file);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
            return true;
        } catch (e) {
            console.error(`Error writing to ${file}:`, e.message);
            return false;
        }
    }
};

/**
 * Logging
 */
const logEvent = (event, data = {}) => {
    const timestamp = new Date().toISOString();
    const logFile = path.join(logsDir, `${new Date().toISOString().split('T')[0]}.log`);
    const logEntry = `[${timestamp}] ${event}: ${JSON.stringify(data)}\n`;
    
    try {
        fs.appendFileSync(logFile, logEntry);
    } catch (e) {
        console.error('Logging error:', e.message);
    }
};

/**
 * Email sending
 */
const sendEmail = async (to, subject, html, text = null) => {
    try {
        if (!emailTransporter.verify()) {
            console.warn('Email transporter not configured');
            logEvent('EMAIL_NOT_CONFIGURED', { to, subject });
            return false;
        }

        await emailTransporter.sendMail({
            from: process.env.SMTP_FROM || 'noreply@applestore.vn',
            to,
            subject,
            text: text || subject,
            html
        });

        logEvent('EMAIL_SENT', { to, subject });
        return true;
    } catch (e) {
        console.error('Email error:', e.message);
        logEvent('EMAIL_ERROR', { to, subject, error: e.message });
        return false;
    }
};

/**
 * Email templates
 */
const emailTemplates = {
    orderConfirmation: (order) => {
        return `
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <title>Xác Nhận Đơn Hàng</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #3b82f6; color: white; padding: 20px; border-radius: 4px; }
        .content { margin: 20px 0; }
        .order-items { margin: 20px 0; border: 1px solid #eee; padding: 20px; }
        .item { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
        .total { font-size: 18px; font-weight: bold; color: #3b82f6; margin-top: 20px; }
        .footer { text-align: center; color: #999; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Xác Nhận Đơn Hàng</h1>
            <p>Mã đơn: ${order.id}</p>
        </div>

        <div class="content">
            <h2>Xin chào ${order.customer.name},</h2>
            <p>Cảm ơn bạn đã đặt hàng! Chúng tôi đã nhận được đơn hàng của bạn.</p>

            <div class="order-items">
                <h3>Chi tiết đơn hàng:</h3>
                ${order.items.map(item => `
                    <div class="item">
                        <span>${item.name} (x${item.quantity})</span>
                        <span>₫${(item.price * item.quantity).toLocaleString()}</span>
                    </div>
                `).join('')}
            </div>

            <div>
                <p><strong>Địa chỉ giao hàng:</strong></p>
                <p>${order.customer.address}<br>${order.customer.city}</p>
            </div>

            <div>
                <p><strong>Phương thức thanh toán:</strong> ${order.payment === 'cod' ? 'Thanh toán khi nhận hàng' : order.payment}</p>
                <p><strong>Phương thức giao hàng:</strong> ${order.shipping || 'Standard'}</p>
            </div>

            <div class="total">
                Tổng tiền: ₫${order.total.toLocaleString()}
            </div>
        </div>

        <div class="footer">
            <p>© 2024 Apple Store VN. Bản quyền đã được bảo vệ.</p>
            <p>Liên hệ: support@applestore.vn</p>
        </div>
    </div>
</body>
</html>
        `;
    },

    orderStatus: (order, status) => {
        const statusText = {
            'pending': 'Đang xử lý',
            'confirmed': 'Đã xác nhận',
            'shipped': 'Đang giao',
            'delivered': 'Đã giao',
            'cancelled': 'Đã hủy'
        };

        return `
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <title>Cập Nhật Trạng Thái Đơn Hàng</title>
</head>
<body>
    <h2>Cập Nhật Trạng Thái Đơn Hàng</h2>
    <p>Mã đơn: ${order.id}</p>
    <p>Trạng thái mới: <strong>${statusText[status] || status}</strong></p>
    <p>Cảm ơn bạn đã mua sắm tại Apple Store VN!</p>
</body>
</html>
        `;
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// PRODUCTS ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/products
 * List all products with filters
 */
app.get('/api/products', (req, res) => {
    try {
        let products = fileIO.read(FILES.products, []);

        // Apply filters
        if (req.query.category) {
            products = products.filter(p => p.category === req.query.category);
        }

        if (req.query.search) {
            const q = req.query.search.toLowerCase();
            products = products.filter(p =>
                p.name.toLowerCase().includes(q) ||
                (p.description || '').toLowerCase().includes(q)
            );
        }

        if (req.query.minPrice) {
            const min = parseFloat(req.query.minPrice);
            products = products.filter(p => p.price >= min);
        }

        if (req.query.maxPrice) {
            const max = parseFloat(req.query.maxPrice);
            products = products.filter(p => p.price <= max);
        }

        // Apply sorting
        if (req.query.sort) {
            const sort = req.query.sort;
            if (sort === 'price_asc') products.sort((a, b) => a.price - b.price);
            if (sort === 'price_desc') products.sort((a, b) => b.price - a.price);
            if (sort === 'name_asc') products.sort((a, b) => a.name.localeCompare(b.name));
        }

        // Pagination
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
        const offset = (page - 1) * limit;
        const total = products.length;
        const items = products.slice(offset, limit + offset);

        respond.success(res, {
            items,
            total,
            page,
            limit,
            pages: Math.ceil(total / limit)
        });
    } catch (e) {
        respond.error(res, e.message, 500);
    }
});

/**
 * GET /api/products/:id
 * Get single product
 */
app.get('/api/products/:id', (req, res) => {
    try {
        const products = fileIO.read(FILES.products, []);
        const product = products.find(p => p.id == req.params.id);

        if (!product) return respond.error(res, 'Product not found', 404);
        respond.success(res, product);
    } catch (e) {
        respond.error(res, e.message, 500);
    }
});

// ═══════════════════════════════════════════════════════════════════════════
// ORDERS ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * POST /api/orders
 * Create new order
 */
app.post('/api/orders', async (req, res) => {
    try {
        const { customer, items, subtotal, shipping, tax, total, payment } = req.body;

        // Validate
        if (!customer || !customer.name || !customer.email || !customer.phone) {
            return respond.error(res, 'Missing customer information');
        }

        if (!validate.email(customer.email)) {
            return respond.error(res, 'Invalid email address');
        }

        if (!validate.phone(customer.phone)) {
            return respond.error(res, 'Invalid phone number');
        }

        if (!Array.isArray(items) || items.length === 0) {
            return respond.error(res, 'Order must contain items');
        }

        // Create order
        const order = {
            id: `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            customer: {
                name: sanitize.string(customer.name),
                email: sanitize.email(customer.email),
                phone: sanitize.phone(customer.phone),
                address: sanitize.string(customer.address || ''),
                city: sanitize.string(customer.city || ''),
                note: sanitize.string(customer.note || '')
            },
            items,
            subtotal: parseFloat(subtotal) || 0,
            shipping: parseFloat(shipping) || 0,
            tax: parseFloat(tax) || 0,
            total: parseFloat(total) || 0,
            payment: sanitize.string(payment || 'cod'),
            status: 'pending',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        // Save order
        const orders = fileIO.read(FILES.orders, []);
        orders.push(order);
        fileIO.write(FILES.orders, orders);

        // Send confirmation email
        const html = emailTemplates.orderConfirmation(order);
        await sendEmail(order.customer.email, 'Xác Nhận Đơn Hàng - ' + order.id, html);

        // Log event
        logEvent('ORDER_CREATED', {
            id: order.id,
            customer: order.customer.email,
            total: order.total
        });

        respond.success(res, order, 'Order created successfully', 201);
    } catch (e) {
        respond.error(res, e.message, 500);
    }
});

/**
 * GET /api/orders
 * List orders (with optional status filter)
 */
app.get('/api/orders', (req, res) => {
    try {
        let orders = fileIO.read(FILES.orders, []);

        // Filter by status
        if (req.query.status) {
            orders = orders.filter(o => o.status === req.query.status);
        }

        // Sort by date (newest first)
        orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        // Pagination
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
        const offset = (page - 1) * limit;
        const total = orders.length;
        const items = orders.slice(offset, limit + offset);

        respond.success(res, {
            items,
            total,
            page,
            limit,
            pages: Math.ceil(total / limit)
        });
    } catch (e) {
        respond.error(res, e.message, 500);
    }
});

/**
 * GET /api/orders/:id
 * Get single order
 */
app.get('/api/orders/:id', (req, res) => {
    try {
        const orders = fileIO.read(FILES.orders, []);
        const order = orders.find(o => o.id === req.params.id);

        if (!order) return respond.error(res, 'Order not found', 404);
        respond.success(res, order);
    } catch (e) {
        respond.error(res, e.message, 500);
    }
});

/**
 * PUT /api/orders/:id
 * Update order status
 */
app.put('/api/orders/:id', async (req, res) => {
    try {
        const { status } = req.body;

        if (!status) {
            return respond.error(res, 'Status is required');
        }

        const orders = fileIO.read(FILES.orders, []);
        const order = orders.find(o => o.id === req.params.id);

        if (!order) return respond.error(res, 'Order not found', 404);

        // Update status
        order.status = sanitize.string(status);
        order.updatedAt = new Date().toISOString();

        fileIO.write(FILES.orders, orders);

        // Send status update email
        const html = emailTemplates.orderStatus(order, status);
        await sendEmail(order.customer.email, `Cập Nhật Đơn Hàng ${req.params.id}`, html);

        logEvent('ORDER_UPDATED', { id: req.params.id, status });
        respond.success(res, order, 'Order updated successfully');
    } catch (e) {
        respond.error(res, e.message, 500);
    }
});

// ═══════════════════════════════════════════════════════════════════════════
// REVIEWS ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * POST /api/reviews
 * Add product review
 */
app.post('/api/reviews', (req, res) => {
    try {
        const { productId, author, email, rating, title, comment, verified } = req.body;

        if (!productId) return respond.error(res, 'Product ID required');
        if (!rating || rating < 1 || rating > 5) return respond.error(res, 'Invalid rating');

        const review = {
            id: uuidv4(),
            productId: parseInt(productId),
            author: sanitize.string(author || 'Anonymous'),
            email: sanitize.email(email || ''),
            rating: Math.round(Math.min(5, Math.max(1, rating))),
            title: sanitize.string(title || ''),
            comment: sanitize.string(comment || ''),
            verified: !!verified,
            helpful: 0,
            unhelpful: 0,
            createdAt: new Date().toISOString()
        };

        const reviews = fileIO.read(FILES.reviews, []);
        reviews.push(review);
        fileIO.write(FILES.reviews, reviews);

        logEvent('REVIEW_CREATED', { productId, rating: review.rating });
        respond.success(res, review, 'Review added successfully', 201);
    } catch (e) {
        respond.error(res, e.message, 500);
    }
});

/**
 * GET /api/reviews/:productId
 * Get product reviews
 */
app.get('/api/reviews/:productId', (req, res) => {
    try {
        const productId = parseInt(req.params.productId);
        let reviews = fileIO.read(FILES.reviews, []);
        reviews = reviews.filter(r => r.productId === productId);

        // Sort by date (newest first)
        reviews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        respond.success(res, reviews);
    } catch (e) {
        respond.error(res, e.message, 500);
    }
});

// ═══════════════════════════════════════════════════════════════════════════
// ADMIN STATISTICS ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/admin/stats
 * Get dashboard statistics
 */
app.get('/api/admin/stats', (req, res) => {
    try {
        const orders = fileIO.read(FILES.orders, []);
        const reviews = fileIO.read(FILES.reviews, []);
        const products = fileIO.read(FILES.products, []);

        // Calculate stats
        const totalOrders = orders.length;
        const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
        const pendingOrders = orders.filter(o => o.status === 'pending').length;
        const totalReviews = reviews.length;
        const avgRating = totalReviews > 0 
            ? (reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews).toFixed(1)
            : 0;

        // Orders by status
        const ordersByStatus = {};
        orders.forEach(o => {
            ordersByStatus[o.status] = (ordersByStatus[o.status] || 0) + 1;
        });

        // Revenue trend (last 7 days)
        const revenueTrend = {};
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            revenueTrend[dateStr] = orders
                .filter(o => o.createdAt.startsWith(dateStr))
                .reduce((sum, o) => sum + o.total, 0);
        }

        respond.success(res, {
            totalOrders,
            totalRevenue,
            pendingOrders,
            totalReviews,
            avgRating,
            totalProducts: products.length,
            ordersByStatus,
            revenueTrend
        });
    } catch (e) {
        respond.error(res, e.message, 500);
    }
});

// ═══════════════════════════════════════════════════════════════════════════
// HEALTH CHECK
// ═══════════════════════════════════════════════════════════════════════════

app.get('/api/health', (req, res) => {
    respond.success(res, {
        status: 'OK',
        version: '2.0',
        env: NODE_ENV,
        uptime: process.uptime()
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// ERROR HANDLING
// ═══════════════════════════════════════════════════════════════════════════

// 404 handler
app.use((req, res) => {
    respond.error(res, 'Endpoint not found', 404);
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);
    respond.error(res, 'Internal server error', 500);
});

// ═══════════════════════════════════════════════════════════════════════════
// START SERVER
// ═══════════════════════════════════════════════════════════════════════════

app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════════════════════╗
║   Apple Store VN Backend — Enhanced v2.0                   ║
║   Server running on http://localhost:${PORT}                   ║
║   Environment: ${NODE_ENV}                                  ║
╚════════════════════════════════════════════════════════════╝
    `);

    logEvent('SERVER_STARTED', {
        port: PORT,
        env: NODE_ENV,
        timestamp: new Date().toISOString()
    });
});

module.exports = app;
