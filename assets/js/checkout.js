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

function updateBadge() {
    const count = cart.reduce((s, i) => s + i.quantity, 0);
    const b = document.getElementById('cartBadge');
    if (b) { b.textContent = count; b.classList.toggle('hidden', count === 0); }
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

function submitOrder(e) {
    e.preventDefault();
    const data = new FormData(e.target);
    const sub = cart.reduce((s, i) => s + i.price * i.quantity, 0);
    const order = {
        orderNumber: 'ORD-' + Date.now(),
        orderDate: new Date().toLocaleString(),
        firstName: data.get('firstName'),
        lastName: data.get('lastName'),
        email: data.get('email'),
        phone: data.get('phone'),
        address: data.get('address'),
        city: data.get('city'),
        state: data.get('state'),
        postal: data.get('postal'),
        country: data.get('country'),
        notes: data.get('notes'),
        items: cart,
        subtotal: sub,
        tax: sub * 0.1,
        total: sub * 1.1
    };

    const orders = JSON.parse(localStorage.getItem('orders') || '[]');
    orders.push(order);
    localStorage.setItem('orders', JSON.stringify(orders));
    localStorage.removeItem('cart');

    showSuccess(order.orderNumber);
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
                    <a href="orders.html" class="btn-primary">Xem Đơn Hàng</a>
                    <a href="index.html" class="btn-ghost">Tiếp Tục Mua Sắm</a>
                </div>
            </div>
        </div>
    `;
}
