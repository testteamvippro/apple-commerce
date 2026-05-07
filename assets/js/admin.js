// Admin Dashboard Logic
let allOrders = [];
let filteredOrders = [];
let currentFilter = 'all';
let currentSearch = '';

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadAllOrders();
    calculateStats();
    renderOrders();
    setupEventListeners();
    checkForNewOrders();
    // Auto-refresh every 5 seconds to check for new orders
    setInterval(checkForNewOrders, 5000);
});

// Load all orders from localStorage
function loadAllOrders() {
    try {
        allOrders = JSON.parse(localStorage.getItem('orders') || '[]');
        // Sort by date, newest first
        allOrders = allOrders.sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate));
    } catch {
        allOrders = [];
    }
}

// Setup event listeners
function setupEventListeners() {
    document.getElementById('searchInput').addEventListener('input', (e) => {
        currentSearch = e.target.value.toLowerCase();
        applyFilters();
    });
}

// Filter orders
function filterOrders(type) {
    currentFilter = type;
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    applyFilters();
}

// Apply filters and search
function applyFilters() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());

    filteredOrders = allOrders.filter(order => {
        const orderDate = new Date(order.orderDate);
        const dateMatch = currentFilter === 'all' ||
            (currentFilter === 'today' && orderDate >= today) ||
            (currentFilter === 'week' && orderDate >= weekAgo) ||
            (currentFilter === 'month' && orderDate >= monthAgo);

        const searchMatch = currentSearch === '' ||
            order.orderNumber.toLowerCase().includes(currentSearch) ||
            order.firstName.toLowerCase().includes(currentSearch) ||
            order.lastName.toLowerCase().includes(currentSearch) ||
            order.email.toLowerCase().includes(currentSearch) ||
            order.phone.includes(currentSearch);

        return dateMatch && searchMatch;
    });

    renderOrders();
}

// Render orders table
function renderOrders() {
    const container = document.getElementById('ordersContainer');

    if (filteredOrders.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📭</div>
                <h3>Không có đơn hàng</h3>
                <p>Chưa có dữ liệu đơn hàng để hiển thị.</p>
            </div>
        `;
        return;
    }

    const html = `
        <table class="orders-table">
            <thead>
                <tr>
                    <th>Mã Đơn Hàng</th>
                    <th>Khách Hàng</th>
                    <th>Email</th>
                    <th>Số Lượng</th>
                    <th>Tổng Tiền</th>
                    <th>Ngày</th>
                    <th>Trạng Thái</th>
                    <th>Hành Động</th>
                </tr>
            </thead>
            <tbody>
                ${filteredOrders.map((order, i) => `
                    <tr>
                        <td><span class="order-id">${order.orderNumber}</span></td>
                        <td>${order.firstName} ${order.lastName}</td>
                        <td>${order.email}</td>
                        <td>${order.items.length}</td>
                        <td><span class="order-amount">₫${order.total.toLocaleString('en-US', { minimumFractionDigits: 0 })}</span></td>
                        <td>${new Date(order.orderDate).toLocaleDateString('vi-VN')}</td>
                        <td><span class="status-badge status-pending">Đang Xử Lý</span></td>
                        <td>
                            <div class="order-actions">
                                <button class="btn-view" onclick="viewOrderDetail('${order.orderNumber}')">Xem</button>
                                <button class="btn-delete" onclick="deleteOrderAdmin('${order.orderNumber}')">Xóa</button>
                            </div>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    container.innerHTML = html;
}

// Calculate statistics
function calculateStats() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const totalOrders = allOrders.length;
    const ordersToday = allOrders.filter(o => new Date(o.orderDate) >= today).length;

    const totalRevenue = allOrders.reduce((sum, order) => sum + (order.total || 0), 0);
    const revenueToday = allOrders
        .filter(o => new Date(o.orderDate) >= today)
        .reduce((sum, order) => sum + (order.total || 0), 0);

    const pendingOrders = allOrders.length; // All are pending

    // Unique customers
    const uniqueEmails = new Set(allOrders.map(o => o.email));
    const uniqueCustomers = uniqueEmails.size;

    // Update UI
    document.getElementById('totalOrders').textContent = totalOrders;
    document.getElementById('newOrdersToday').textContent = `${ordersToday} mới hôm nay`;

    document.getElementById('totalRevenue').textContent = `₫${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 0 })}`;
    document.getElementById('revenueToday').textContent = `+₫${revenueToday.toLocaleString('en-US', { minimumFractionDigits: 0 })} hôm nay`;

    document.getElementById('pendingOrders').textContent = pendingOrders;
    document.getElementById('uniqueCustomers').textContent = uniqueCustomers;
}

// View order detail
function viewOrderDetail(orderNumber) {
    const order = allOrders.find(o => o.orderNumber === orderNumber);
    if (!order) return;

    const itemsHtml = order.items.map(item => `
        <div class="order-item">
            <div>
                <div style="font-weight: 600;">${item.name}</div>
                <div style="font-size: 12px; color: var(--admin-text-muted);">
                    Giá: ₫${item.price.toLocaleString()} × ${item.quantity}
                </div>
            </div>
            <div style="font-weight: 600; color: #4ade80;">
                ₫${(item.price * item.quantity).toLocaleString()}
            </div>
        </div>
    `).join('');

    const modalBody = document.getElementById('orderModalBody');
    modalBody.innerHTML = `
        <div class="order-detail-section">
            <h4>Thông Tin Cơ Bản</h4>
            <div class="order-detail-content">
                <div style="margin-bottom: 8px;"><strong>Mã đơn hàng:</strong> ${order.orderNumber}</div>
                <div style="margin-bottom: 8px;"><strong>Ngày đặt:</strong> ${new Date(order.orderDate).toLocaleString('vi-VN')}</div>
                <div style="margin-bottom: 8px;"><strong>Trạng thái:</strong> <span class="status-badge status-pending">Đang Xử Lý</span></div>
            </div>
        </div>

        <div class="order-detail-section">
            <h4>Thông Tin Khách Hàng</h4>
            <div class="order-detail-content">
                <div style="margin-bottom: 8px;"><strong>Họ tên:</strong> ${order.firstName} ${order.lastName}</div>
                <div style="margin-bottom: 8px;"><strong>Email:</strong> <a href="mailto:${order.email}" style="color: var(--primary); text-decoration: none;">${order.email}</a></div>
                <div style="margin-bottom: 8px;"><strong>Điện thoại:</strong> <a href="tel:${order.phone}" style="color: var(--primary); text-decoration: none;">${order.phone}</a></div>
            </div>
        </div>

        <div class="order-detail-section">
            <h4>Địa Chỉ Giao Hàng</h4>
            <div class="order-detail-content">
                <div style="margin-bottom: 8px;">${order.address}</div>
                <div style="margin-bottom: 8px;">${order.city}, ${order.state} ${order.postal}</div>
                <div style="margin-bottom: 8px;">${order.country}</div>
            </div>
        </div>

        ${order.notes ? `
        <div class="order-detail-section">
            <h4>Ghi Chú Khách Hàng</h4>
            <div class="order-detail-content">
                ${order.notes}
            </div>
        </div>
        ` : ''}

        <div class="order-detail-section">
            <h4>Chi Tiết Sản Phẩm</h4>
            <div class="order-items">
                ${itemsHtml}
            </div>
        </div>

        <div class="order-detail-section">
            <h4>Tóm Tắt Thanh Toán</h4>
            <div class="order-detail-content">
                <div style="margin-bottom: 8px; display: flex; justify-content: space-between;">
                    <span>Tạm tính:</span>
                    <span>₫${order.subtotal.toLocaleString('en-US', { minimumFractionDigits: 0 })}</span>
                </div>
                <div style="margin-bottom: 8px; display: flex; justify-content: space-between;">
                    <span>Thuế (10%):</span>
                    <span>₫${order.tax.toLocaleString('en-US', { minimumFractionDigits: 0 })}</span>
                </div>
                <div style="display: flex; justify-content: space-between; font-weight: 600; font-size: 16px; color: #4ade80; padding-top: 8px; border-top: 1px solid var(--admin-border);">
                    <span>Tổng cộng:</span>
                    <span>₫${order.total.toLocaleString('en-US', { minimumFractionDigits: 0 })}</span>
                </div>
            </div>
        </div>

        <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid var(--admin-border); display: flex; gap: 10px;">
            <button class="btn-admin-primary" onclick="downloadOrderJSON('${order.orderNumber}')" style="flex: 1;">📥 Tải JSON</button>
            <button class="btn-admin-primary" onclick="copyOrderToClipboard('${order.orderNumber}')" style="flex: 1;">📋 Copy Thông Tin</button>
            <button class="btn-admin-danger" onclick="deleteOrderAdmin('${order.orderNumber}')" style="flex: 1;">🗑️ Xóa Đơn</button>
        </div>
    `;

    document.getElementById('orderModal').classList.add('open');
}

// Close modal
function closeOrderModal() {
    document.getElementById('orderModal').classList.remove('open');
}

// Download order as JSON
function downloadOrderJSON(orderNumber) {
    const order = allOrders.find(o => o.orderNumber === orderNumber);
    if (!order) return;

    const blob = new Blob([JSON.stringify(order, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${orderNumber}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

// Copy order info to clipboard
function copyOrderToClipboard(orderNumber) {
    const order = allOrders.find(o => o.orderNumber === orderNumber);
    if (!order) return;

    const text = `Mã ĐH: ${order.orderNumber}
Khách: ${order.firstName} ${order.lastName}
Email: ${order.email}
Phone: ${order.phone}
Địa chỉ: ${order.address}, ${order.city}, ${order.state}, ${order.country}
Tổng tiền: ₫${order.total.toLocaleString()}
Ngày: ${new Date(order.orderDate).toLocaleString('vi-VN')}`;

    navigator.clipboard.writeText(text).then(() => {
        showAdminNotification('✓ Đã copy thông tin đơn hàng');
    });
}

// Delete order
function deleteOrderAdmin(orderNumber) {
    if (!confirm('Bạn chắc chắn muốn xóa đơn hàng này?')) return;

    const index = allOrders.findIndex(o => o.orderNumber === orderNumber);
    if (index !== -1) {
        allOrders.splice(index, 1);
        localStorage.setItem('orders', JSON.stringify(allOrders));
        calculateStats();
        applyFilters();
        closeOrderModal();
        showAdminNotification('✓ Đơn hàng đã được xóa');
    }
}

// Clear all orders
function clearAllOrdersAdmin() {
    if (!confirm('Bạn chắc chắn muốn xóa TẤT CẢ đơn hàng? Hành động này không thể hoàn tác.')) return;

    allOrders = [];
    localStorage.removeItem('orders');
    calculateStats();
    renderOrders();
    showAdminNotification('✓ Tất cả đơn hàng đã được xóa');
}

// Export all orders
function exportAllOrdersAdmin() {
    if (allOrders.length === 0) {
        alert('Không có đơn hàng để xuất');
        return;
    }

    const blob = new Blob([JSON.stringify(allOrders, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `all-orders-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);

    showAdminNotification('✓ Đã xuất dữ liệu thành công');
}

// Show admin notification
function showAdminNotification(message) {
    const box = document.getElementById('adminNotification');
    const text = document.getElementById('notificationText');
    text.textContent = message;
    box.classList.add('show');
    setTimeout(() => box.classList.remove('show'), 3000);
}

// Check for new orders
let lastCheckTime = Date.now();
function checkForNewOrders() {
    const current = JSON.parse(localStorage.getItem('orders') || '[]');
    if (current.length > allOrders.length) {
        const newOrder = current[current.length - 1];
        showAdminNotification(`🎉 Đơn hàng mới từ ${newOrder.firstName}! Tổng: ₫${newOrder.total.toLocaleString()}`);
        loadAllOrders();
        calculateStats();
        applyFilters();
        // Browser notification if permitted
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Đơn Hàng Mới', {
                body: `${newOrder.firstName} ${newOrder.lastName} đã đặt hàng - ₫${newOrder.total.toLocaleString()}`,
                icon: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=100&q=50'
            });
        }
    }
}

// Go back to store
function goBackToStore() {
    window.location.href = 'index.html';
}

// Request notification permission
if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
}
