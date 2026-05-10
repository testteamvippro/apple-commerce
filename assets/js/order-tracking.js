class OrderTracker {
  constructor() {
    this.orders = [];
    this.currentOrder = null;
    this.init();
  }

  async init() {
    if (!auth.isLoggedIn()) {
      window.location.href = '/login.html';
      return;
    }

    const userId = auth.getUser().id;
    await this.loadOrders(userId);
    this.setupEventListeners();
  }

  async loadOrders(userId) {
    try {
      const response = await fetch(`/api/orders?userId=${userId}`);
      const result = await response.json();

      if (result.success) {
        this.orders = result.data || [];
        this.renderOrdersList();
      }
    } catch (error) {
      console.error('Error loading orders:', error);
      showToast('Failed to load orders', 'error');
    }
  }

  renderOrdersList() {
    const container = document.getElementById('orders-list');
    if (!container) return;

    if (this.orders.length === 0) {
      container.innerHTML = '<p class="empty-state">No orders yet</p>';
      return;
    }

    container.innerHTML = this.orders.map(order => `
      <div class="order-card" onclick="orderTracker.viewOrder('${order.id}')">
        <div class="order-header">
          <h3>Order #${order.id}</h3>
          <span class="status-badge status-${order.status}">${order.status}</span>
        </div>

        <div class="order-info">
          <p><strong>Date:</strong> ${new Date(order.createdAt).toLocaleDateString()}</p>
          <p><strong>Total:</strong> ₫${order.total.toLocaleString()}</p>
          <p><strong>Items:</strong> ${(order.items || []).length} product(s)</p>
        </div>

        <div class="order-status-bar">
          <div class="status-steps">
            <div class="step ${this.isStepActive(order, 'pending') ? 'active' : ''} ${this.isStepComplete(order, 'pending') ? 'complete' : ''}">
              <span>Pending</span>
            </div>
            <div class="step ${this.isStepActive(order, 'processing') ? 'active' : ''} ${this.isStepComplete(order, 'processing') ? 'complete' : ''}">
              <span>Processing</span>
            </div>
            <div class="step ${this.isStepActive(order, 'shipped') ? 'active' : ''} ${this.isStepComplete(order, 'shipped') ? 'complete' : ''}">
              <span>Shipped</span>
            </div>
            <div class="step ${this.isStepActive(order, 'delivered') ? 'active' : ''} ${this.isStepComplete(order, 'delivered') ? 'complete' : ''}">
              <span>Delivered</span>
            </div>
          </div>
        </div>

        <button class="btn-secondary btn-sm">View Details</button>
      </div>
    `).join('');
  }

  isStepActive(order, status) {
    return order.status === status;
  }

  isStepComplete(order, status) {
    const statuses = ['pending', 'processing', 'shipped', 'delivered'];
    const currentIndex = statuses.indexOf(order.status);
    const checkIndex = statuses.indexOf(status);
    return currentIndex > checkIndex;
  }

  async viewOrder(orderId) {
    try {
      const response = await fetch(`/api/orders/${orderId}`);
      const result = await response.json();

      if (result.success) {
        this.currentOrder = result.data;
        this.renderOrderDetails();
      }
    } catch (error) {
      console.error('Error loading order details:', error);
      showToast('Failed to load order', 'error');
    }
  }

  renderOrderDetails() {
    const container = document.getElementById('order-details-container');
    if (!container) return;

    const order = this.currentOrder;
    const shippingAddress = order.shipping?.address || order.customer?.address || 'Not available';
    const shippingCity = order.shipping?.city || order.customer?.city || '';
    const shippingZip = order.shipping?.zip || order.customer?.postal || '';
    const shippingCost = typeof order.shipping === 'number' ? order.shipping : (order.shipping?.cost || 0);
    const customerUpdate = order.cancellationReason || order.customerUpdateMessage || '';

    container.innerHTML = `
      <div class="order-details">
        <div class="details-header">
          <h1>Order #${order.id}</h1>
          <p>Placed on ${new Date(order.createdAt).toLocaleDateString()}</p>
        </div>

        <!-- Timeline -->
        <div class="order-timeline">
          ${this.renderTimeline(order)}
        </div>

        ${customerUpdate ? `
          <div class="shipping-info">
            <h2>Latest Update</h2>
            <div class="info-grid">
              <div>
                <strong>Status Update:</strong>
                <p>${customerUpdate}</p>
              </div>
            </div>
          </div>
        ` : ''}

        <!-- Shipping Info -->
        <div class="shipping-info">
          <h2>Shipping Information</h2>
          <div class="info-grid">
            <div>
              <strong>Shipped to:</strong>
              <p>${shippingAddress}</p>
              <p>${shippingCity}${shippingCity && shippingZip ? ', ' : ''}${shippingZip}</p>
            </div>
            <div>
              <strong>Tracking Number:</strong>
              <p>${order.tracking || 'Not yet available'}</p>
            </div>
            <div>
              <strong>Carrier:</strong>
              <p>${order.carrier || 'Standard Shipping'}</p>
            </div>
            <div>
              <strong>Estimated Delivery:</strong>
              <p>${order.estimatedDelivery ? new Date(order.estimatedDelivery).toLocaleDateString() : 'TBD'}</p>
            </div>
          </div>
        </div>

        <!-- Items -->
        <div class="order-items-detail">
          <h2>Items in Order</h2>
          <table class="items-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Qty</th>
                <th>Price</th>
                <th>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${(order.items || []).map(item => `
                <tr>
                  <td>${item.name || 'Product'}</td>
                  <td>${item.quantity || 0}</td>
                  <td>₫${(item.price || 0).toLocaleString()}</td>
                  <td>₫${((item.price || 0) * (item.quantity || 0)).toLocaleString()}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <!-- Summary -->
        <div class="order-summary">
          <div class="summary-row">
            <span>Subtotal:</span>
            <span>₫${(order.subtotal || 0).toLocaleString()}</span>
          </div>
          <div class="summary-row">
            <span>Shipping:</span>
            <span>₫${shippingCost.toLocaleString()}</span>
          </div>
          <div class="summary-row">
            <span>Tax:</span>
            <span>₫${(order.tax || 0).toLocaleString()}</span>
          </div>
          <div class="summary-row total">
            <span>Total:</span>
            <span>₫${order.total.toLocaleString()}</span>
          </div>
        </div>

        <!-- Actions -->
        <div class="order-actions">
          ${order.status === 'pending' ? `
            <button onclick="orderTracker.cancelOrder('${order.id}')" class="btn-danger">
              Cancel Order
            </button>
          ` : ''}
          ${order.status === 'delivered' ? `
            <button onclick="orderTracker.initiateReturn('${order.id}')" class="btn-secondary">
              Return Order
            </button>
          ` : ''}
          <button onclick="window.print()" class="btn-secondary">
            Print Order
          </button>
        </div>
      </div>
    `;
  }

  renderTimeline(order) {
    const timeline = [
      { status: 'pending', label: 'Order Placed', icon: '📦', date: order.createdAt },
      { status: 'processing', label: 'Processing', icon: '⚙️', date: order.processingDate },
      { status: 'shipped', label: 'Shipped', icon: '🚚', date: order.shippedDate },
      { status: 'delivered', label: 'Delivered', icon: '✅', date: order.deliveredDate }
    ];

    if (order.status === 'cancelled') {
      timeline.push({ status: 'cancelled', label: 'Cancelled', icon: '❌', date: order.cancelledAt });
    }

    const statuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
    const currentIndex = statuses.indexOf(order.status);

    return timeline.map((item, index) => {
      const isActive = index <= currentIndex;
      const isComplete = index < currentIndex;

      return `
        <div class="timeline-item ${isActive ? 'active' : ''} ${isComplete ? 'complete' : ''}">
          <div class="timeline-marker">${item.icon}</div>
          <div class="timeline-content">
            <h4>${item.label}</h4>
            <p>${item.date ? new Date(item.date).toLocaleString() : 'Pending'}</p>
          </div>
        </div>
      `;
    }).join('');
  }

  async cancelOrder(orderId) {
    if (!confirm('Are you sure you want to cancel this order?')) return;

    try {
      setLoading(true, 'Cancelling order...');
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel' })
      });

      const result = await response.json();
      if (result.success) {
        showToast('Order cancelled successfully', 'success');
        await this.loadOrders(auth.getUser().id);
      }
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  setupEventListeners() {
    // Add any additional event listeners
  }
}

// Global instance
const orderTracker = new OrderTracker();
