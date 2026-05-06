let orders = [];

document.addEventListener('DOMContentLoaded', () => {
    loadOrders();
    displayOrders();
});

// Load orders from localStorage
function loadOrders() {
    const savedOrders = localStorage.getItem('orders');
    if (savedOrders) {
        orders = JSON.parse(savedOrders);
        // Sort by newest first
        orders.sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate));
    }
}

// Display orders
function displayOrders() {
    const ordersList = document.getElementById('ordersList');
    const noOrders = document.getElementById('noOrders');

    if (orders.length === 0) {
        ordersList.style.display = 'none';
        noOrders.style.display = 'block';
        return;
    }

    ordersList.style.display = 'block';
    noOrders.style.display = 'none';

    ordersList.innerHTML = '';

    orders.forEach((order, index) => {
        const orderDiv = document.createElement('div');
        orderDiv.className = 'order-card';
        orderDiv.innerHTML = `
            <div class="order-header">
                <div>
                    <h3>Order #${order.orderNumber}</h3>
                    <p class="order-date">${order.orderDate}</p>
                </div>
                <div class="order-actions">
                    <button class="btn-details" onclick="toggleOrderDetails(${index})">View Details</button>
                    <button class="btn-download" onclick="downloadOrder(${index})">Download</button>
                    <button class="btn-delete" onclick="deleteOrder(${index})">Delete</button>
                </div>
            </div>
            
            <div class="order-summary-row">
                <span><strong>Customer:</strong> ${order.firstName} ${order.lastName}</span>
                <span><strong>Email:</strong> ${order.email}</span>
                <span><strong>Phone:</strong> ${order.phone}</span>
            </div>

            <div class="order-summary-row">
                <span><strong>Items:</strong> ${order.items.length}</span>
                <span><strong>Subtotal:</strong> $${order.subtotal.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                <span><strong>Total:</strong> $${order.total.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
            </div>

            <div class="order-details" id="orderDetails${index}" style="display: none;">
                <div class="details-content">
                    <h4>Shipping Address</h4>
                    <p>
                        ${order.address}<br>
                        ${order.city}, ${order.state} ${order.postal}<br>
                        ${order.country}
                    </p>

                    <h4>Items Ordered</h4>
                    <table class="items-table">
                        <thead>
                            <tr>
                                <th>Product</th>
                                <th>Price</th>
                                <th>Qty</th>
                                <th>Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${order.items.map(item => `
                                <tr>
                                    <td>${item.name}</td>
                                    <td>$${item.price.toLocaleString()}</td>
                                    <td>${item.quantity}</td>
                                    <td>$${(item.price * item.quantity).toLocaleString()}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>

                    <div class="order-totals">
                        <div><strong>Subtotal:</strong> $${order.subtotal.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
                        <div><strong>Tax (10%):</strong> $${order.tax.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
                        <div class="total"><strong>Total:</strong> $${order.total.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
                    </div>

                    ${order.notes ? `
                        <h4>Notes</h4>
                        <p>${order.notes}</p>
                    ` : ''}
                </div>
            </div>
        `;
        ordersList.appendChild(orderDiv);
    });
}

// Toggle order details
function toggleOrderDetails(index) {
    const details = document.getElementById(`orderDetails${index}`);
    if (details.style.display === 'none') {
        details.style.display = 'block';
    } else {
        details.style.display = 'none';
    }
}

// Delete single order
function deleteOrder(index) {
    if (confirm('Are you sure you want to delete this order?')) {
        orders.splice(index, 1);
        localStorage.setItem('orders', JSON.stringify(orders));
        displayOrders();
    }
}

// Clear all orders
function clearAllOrders() {
    if (confirm('Are you sure you want to delete ALL orders? This cannot be undone.')) {
        orders = [];
        localStorage.removeItem('orders');
        displayOrders();
    }
}

// Download single order as JSON
function downloadOrder(index) {
    const order = orders[index];
    const dataStr = JSON.stringify(order, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${order.orderNumber}.json`;
    link.click();
    URL.revokeObjectURL(url);
}

// Export all orders as JSON
function exportOrders() {
    if (orders.length === 0) {
        alert('No orders to export');
        return;
    }

    const dataStr = JSON.stringify(orders, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `orders-export-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
}
