let cart = [];

document.addEventListener('DOMContentLoaded', () => {
    cart = loadCart();
    if (cart.length === 0) { window.location.href = 'cart.html'; return; }
    renderSummary();
    updateBadge();
    setupForm();
});

function loadCart() {
    try { return JSON.parse(localStorage.getItem('cart') || '[]'); } catch { return []; }
}

function loadLoggedInUserId() {
    try {
        const user = JSON.parse(localStorage.getItem('auth-user') || 'null');
        return user?.id || null;
    } catch {
        return null;
    }
}

function updateBadge() {
    const count = cart.reduce((s, i) => s + i.quantity, 0);
    const b = document.getElementById('cartBadge');
    if (b) { b.textContent = count; b.classList.toggle('hidden', count === 0); }
}

function getOrdersPageHref() {
    return loadLoggedInUserId() ? 'pages/my-orders.html' : 'orders.html';
}

function appendOrderHistory(orderId, payload) {
    try {
        const existingOrders = JSON.parse(localStorage.getItem('orders') || '[]');
        const [firstName = '', ...restName] = (payload.customer.name || '').split(' ');
        const lastName = restName.join(' ');
        const tax = Math.round(payload.subtotal * 0.1);

        existingOrders.push({
            orderNumber: orderId,
            orderDate: new Date().toISOString(),
            firstName,
            lastName,
            email: payload.customer.email,
            phone: payload.customer.phone,
            address: payload.customer.address,
            city: payload.customer.city,
            state: payload.customer.state || '',
            postal: payload.customer.postal || '',
            country: payload.customer.country || '',
            notes: payload.customer.note || '',
            items: payload.items,
            subtotal: payload.subtotal,
            tax,
            total: payload.total,
        });

        localStorage.setItem('orders', JSON.stringify(existingOrders));
    } catch (error) {
        console.error('Failed to persist local order history:', error);
    }
}

function renderSummary() {
    const itemsEl = document.getElementById('asideItems');
    if (!itemsEl) return;
    itemsEl.innerHTML = '';
    cart.forEach(item => {
        const el = document.createElement('div');
        el.className = 'aside-item';
        el.innerHTML = `
            <img src="${item.image}" alt="${item.name}"
                 onerror="this.src='https://placehold.co/60x44/f2f2f7/999?text=P'">
            <div>
                <div class="aside-item-name">${item.name}</div>
                <div class="aside-item-qty">Qty: ${item.quantity}</div>
            </div>
            <div class="aside-item-price">₫${(item.price * item.quantity).toLocaleString()}</div>
        `;
        itemsEl.appendChild(el);
    });

    const sub = cart.reduce((s, i) => s + i.price * i.quantity, 0);
    const tax = sub * 0.1;
    const total = sub + tax;
    const fmt = n => `₫${n.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

    document.getElementById('checkoutSubtotal').textContent = fmt(sub);
    document.getElementById('checkoutTax').textContent = fmt(tax);
    document.getElementById('checkoutTotal').textContent = fmt(total);
}

function setupForm() {
    document.getElementById('checkoutForm').addEventListener('submit', submitOrder);
}

async function submitOrder(e) {
    e.preventDefault();
    const data    = new FormData(e.target);
    const sub     = cart.reduce((s, i) => s + i.price * i.quantity, 0);
    const shipping = sub >= 500000 ? 0 : 30000;
    const total    = sub + shipping;

    const payload = {
        userId: loadLoggedInUserId(),
        customer: {
            name:    `${data.get('firstName')} ${data.get('lastName')}`.trim(),
            email:   data.get('email'),
            phone:   data.get('phone'),
            address: data.get('address'),
            city:    data.get('city'),
            state:   data.get('state'),
            postal:  data.get('postal'),
            country: data.get('country'),
            note:    data.get('notes') || ''
        },
        items:    cart,
        payment:  data.get('payment') || 'cod',
        subtotal: sub,
        shipping,
        total
    };

    const btn = e.target.querySelector('[type="submit"]');
    if (btn) { btn.disabled = true; btn.textContent = 'Đang xử lý...'; }

    try {
        const result = await window.AppleStoreAPI.createOrder(payload);

        // Track purchase event
        if (window.gtag) {
            gtag('event', 'purchase', { currency: 'VND', value: total, transaction_id: result.data.orderId, items: cart.map(i => ({ item_id: String(i.id), item_name: i.name, quantity: i.quantity, price: i.price })) });
        }
        if (window.fbq) {
            fbq('track', 'Purchase', { value: total, currency: 'VND', num_items: cart.length });
        }

        appendOrderHistory(result.data.orderId, payload);
        localStorage.removeItem('cart');
        showSuccess(result.data.orderId);
    } catch (err) {
        if (btn) { btn.disabled = false; btn.textContent = 'Đặt Hàng Ngay'; }
        alert('Có lỗi xảy ra: ' + err.message);
    }
}

function showSuccess(num) {
    document.querySelector('.checkout-layout').innerHTML = `
        <div class="success-wrap" style="grid-column:1/-1">
            <div class="success-card">
                <div class="success-icon">✅</div>
                <h2>Đơn Hàng Đã Được Đặt!</h2>
                <p>Cảm ơn bạn đã đặt hàng. Chúng tôi sẽ liên hệ bạn sớm để xác nhận thanh toán.</p>
                <div class="success-order">${num}</div>
                <p>Lưu lại mã đơn hàng của bạn để theo dõi.</p>
                <div style="display:flex;gap:12px;justify-content:center;margin-top:28px;flex-wrap:wrap">
                    <a href="${getOrdersPageHref()}" class="btn-primary">Xem Đơn Hàng</a>
                    <a href="index.html" class="btn-ghost">Tiếp Tục Mua Sắm</a>
                </div>
            </div>
        </div>
    `;
}
