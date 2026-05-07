let orders = [];

document.addEventListener('DOMContentLoaded', () => {
    orders = loadOrders();
    renderOrders();
    updateBadge();
});

function loadOrders() {
    try {
        const raw = JSON.parse(localStorage.getItem('orders') || '[]');
        return raw.sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate));
    } catch { return []; }
}

function updateBadge() {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const count = cart.reduce((s, i) => s + i.quantity, 0);
    const b = document.getElementById('cartBadge');
    if (b) { b.textContent = count; b.classList.toggle('hidden', count === 0); }
}

function renderOrders() {
    const list = document.getElementById('ordersList');
    const empty = document.getElementById('ordersEmpty');
    if (!list) return;

    if (orders.length === 0) {
        list.style.display = 'none';
        if (empty) empty.style.display = 'block';
        return;
    }

    if (empty) empty.style.display = 'none';
    list.style.display = 'block';
    list.innerHTML = '';

    orders.forEach((order, i) => {
        const el = document.createElement('div');
        el.className = 'order-card';
        el.innerHTML = `
            <div class="order-card-header">
                <div>
                    <div class="order-num">${order.orderNumber}</div>
                    <div class="order-date">${order.orderDate}</div>
                </div>
                <div class="order-meta">
                    <div class="order-meta-item"><strong>${order.firstName} ${order.lastName}</strong></div>
                    <div class="order-meta-item">${order.items.length} sản phẩm</div>
                    <div class="order-meta-item"><strong>₫${order.total.toLocaleString('en-US', {minimumFractionDigits:2})}</strong></div>
                    <span class="order-status">Đang Xử Lý</span>
                </div>
                <div class="order-actions-bar">
                    <button class="btn-sm" onclick="toggleDetails(${i})">Chi Tiết</button>
                    <button class="btn-sm blue" onclick="downloadOrder(${i})">↓ JSON</button>
                    <button class="btn-sm danger" onclick="deleteOrder(${i})">Xóa</button>
                </div>
            </div>
            <div class="order-details-panel" id="details${i}">
                <div class="details-grid">
                    <div class="details-block">
                        <h4>Khách Hàng</h4>
                        <p>${order.firstName} ${order.lastName}<br>${order.email}<br>${order.phone}</p>
                    </div>
                    <div class="details-block">
                        <h4>Địa Chỉ Giao Hàng</h4>
                        <p>${order.address}<br>${order.city}, ${order.state} ${order.postal}<br>${order.country}</p>
                    </div>
                    <div class="details-block">
                        <h4>Ghi Chú</h4>
                        <p>${order.notes || '—'}</p>
                    </div>
                </div>
                <table class="items-table">
                    <thead>
                        <tr><th>Sản Phẩm</th><th>Giá Đơn Vị</th><th>Số Lượng</th><th>Tổng</th></tr>
                    </thead>
                    <tbody>
                        ${order.items.map(item => `
                            <tr>
                                <td>${item.name}</td>
                                <td>₫${item.price.toLocaleString()}</td>
                                <td>${item.quantity}</td>
                                <td>₫${(item.price * item.quantity).toLocaleString()}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                <div class="totals-mini">
                    <div>Tạm Tính: ₫${order.subtotal.toLocaleString('en-US',{minimumFractionDigits:2})}</div>
                    <div>Thuế (10%): ₫${order.tax.toLocaleString('en-US',{minimumFractionDigits:2})}</div>
                    <div class="total-big">Tổng: ₫${order.total.toLocaleString('en-US',{minimumFractionDigits:2})}</div>
                </div>
            </div>
        `;
        list.appendChild(el);
    });
}

function toggleDetails(i) {
    const panel = document.getElementById(`details${i}`);
    if (panel) panel.classList.toggle('open');
}

function deleteOrder(i) {
    if (!confirm('Xóa đơn hàng này?')) return;
    orders.splice(i, 1);
    localStorage.setItem('orders', JSON.stringify(orders));
    renderOrders();
}

function clearAllOrders() {
    if (!confirm('Xóa TẤT CẢ đơn hàng? Không thể hoàn tác.')) return;
    orders = [];
    localStorage.removeItem('orders');
    renderOrders();
}

function downloadOrder(i) {
    const order = orders[i];
    const blob = new Blob([JSON.stringify(order, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${order.orderNumber}.json`; a.click();
    URL.revokeObjectURL(url);
}

function exportAllOrders() {
    if (!orders.length) { alert('Không có đơn hàng để xuất'); return; }
    const blob = new Blob([JSON.stringify(orders, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `orders-${new Date().toISOString().split('T')[0]}.json`; a.click();
    URL.revokeObjectURL(url);
}
