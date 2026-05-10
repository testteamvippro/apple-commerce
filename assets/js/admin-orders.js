class AdminOrders {
  constructor() {
    this.orders = [];
    this.filteredOrders = [];
    this.products = [];
    this.currentFilter = 'all';
    this.selectedOrderId = new URLSearchParams(window.location.search).get('id');
    this.init();
  }

  async init() {
    if (!auth.isAdmin()) {
      window.location.href = '/login.html';
      return;
    }

    this.setupEventListeners();
    await this.loadProducts();
    await this.loadOrders();
  }

  async loadProducts() {
    try {
      const response = await fetch('/api/admin?action=products');
      const result = await response.json();

      if (result.success) {
        this.products = result.data || [];
      }
    } catch (error) {
      console.error('Error loading products for stock panel:', error);
    }
  }

  setupEventListeners() {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        auth.logout();
        window.location.href = '/';
      });
    }

    const refreshBtn = document.getElementById('refresh-orders-btn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.loadOrders());
    }

    document.querySelectorAll('#status-filters .filter-pill').forEach(button => {
      button.addEventListener('click', () => {
        this.currentFilter = button.dataset.status || 'all';
        document.querySelectorAll('#status-filters .filter-pill').forEach(pill => {
          pill.classList.toggle('active', pill === button);
        });
        this.applyFilter();
      });
    });
  }

  async loadOrders() {
    try {
      const response = await fetch('/api/admin?action=orders');
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Failed to load orders');
      }

      this.orders = (result.data || []).sort((left, right) => {
        return new Date(right.createdAt || 0) - new Date(left.createdAt || 0);
      });

      if (!this.selectedOrderId && this.orders.length > 0) {
        this.selectedOrderId = this.orders[0].id;
      }

      this.applyFilter();
    } catch (error) {
      console.error('Error loading admin orders:', error);
      showToast(error.message || 'Failed to load orders', 'error');
    }
  }

  applyFilter() {
    this.filteredOrders = this.currentFilter === 'all'
      ? [...this.orders]
      : this.orders.filter(order => order.status === this.currentFilter);

    if (!this.filteredOrders.some(order => order.id === this.selectedOrderId)) {
      this.selectedOrderId = this.filteredOrders[0]?.id || null;
    }

    this.renderOrders();
    this.renderSelectedOrder();
  }

  renderOrders() {
    const tableBody = document.getElementById('orders-table-body');
    if (!tableBody) {
      return;
    }

    if (this.filteredOrders.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:2rem;">No matching orders.</td></tr>';
      return;
    }

    tableBody.innerHTML = this.filteredOrders.map(order => {
      const isSelected = order.id === this.selectedOrderId;
      return `
        <tr ${isSelected ? 'style="background:#f5f8ff;"' : ''}>
          <td><strong>#${order.id}</strong></td>
          <td>
            <div class="customer-cell">
              <strong>${this.escapeHtml(order.customer?.name || 'Unknown')}</strong>
              <span>${this.escapeHtml(order.customer?.email || 'No email')}</span>
              <span>${this.escapeHtml(order.customer?.phone || 'No phone')}</span>
            </div>
          </td>
          <td>₫${(order.total || 0).toLocaleString()}</td>
          <td><span class="status-badge status-${order.status || 'pending'}">${this.formatStatus(order.status)}</span></td>
          <td>${this.formatDate(order.createdAt)}</td>
          <td><button class="action-btn" data-order-id="${order.id}">View</button></td>
        </tr>
      `;
    }).join('');

    tableBody.querySelectorAll('[data-order-id]').forEach(button => {
      button.addEventListener('click', () => {
        this.selectedOrderId = button.dataset.orderId;
        this.renderOrders();
        this.renderSelectedOrder();
      });
    });
  }

  renderSelectedOrder() {
    const container = document.getElementById('order-details-body');
    if (!container) {
      return;
    }

    const order = this.orders.find(item => item.id === this.selectedOrderId);
    if (!order) {
      container.innerHTML = '<p class="muted-note">Select an order to view customer information and update its status.</p>';
      return;
    }

    const customer = order.customer || {};
    const shippingCost = typeof order.shipping === 'number' ? order.shipping : (order.shipping?.cost || 0);
    const workflow = this.getWorkflowConfig(order.status);
    const inventory = this.getInventoryForOrder(order);
    const hasShortage = inventory.some(item => item.available < item.requested);
    const latestCustomerUpdate = order.customerUpdateMessage || '';

    container.innerHTML = `
      <div>
        <strong style="font-size:1.05rem;color:#111827;">#${order.id}</strong>
        <p class="muted-note">Placed ${this.formatDateTime(order.createdAt)}</p>
      </div>

      <div class="detail-grid">
        <div class="detail-card">
          <h4>Customer</h4>
          <p>${this.escapeHtml(customer.name || 'Unknown')}</p>
          <p>${this.escapeHtml(customer.email || 'No email')}</p>
          <p>${this.escapeHtml(customer.phone || 'No phone')}</p>
        </div>
        <div class="detail-card">
          <h4>Shipping Address</h4>
          <p>${this.escapeHtml(customer.address || 'No address')}</p>
          <p>${this.escapeHtml(customer.city || '')}${customer.city && customer.postal ? ', ' : ''}${this.escapeHtml(customer.postal || '')}</p>
          <p>${this.escapeHtml(customer.country || '')}</p>
        </div>
      </div>

      <div class="detail-card">
        <h4>Order Status</h4>
        <div class="detail-actions">
          <select class="status-select" id="status-select">
            ${['pending', 'processing', 'shipped', 'delivered', 'cancelled'].map(status => `
              <option value="${status}" ${order.status === status ? 'selected' : ''}>${this.formatStatus(status)}</option>
            `).join('')}
          </select>
          <button class="action-btn" id="save-status-btn">Save Status</button>
          ${workflow.next ? `<button class="action-btn" id="advance-status-btn">Move to ${this.formatStatus(workflow.next)}</button>` : ''}
          ${workflow.canCancel ? '<button class="action-btn danger" id="cancel-out-of-stock-btn">Cancel: Out of Stock</button>' : ''}
        </div>
        ${workflow.hint ? `<p class="muted-note">${workflow.hint}</p>` : ''}
      </div>

      <div class="detail-card">
        <h4>Inventory Check</h4>
        <div class="items-list">
          ${inventory.map(item => `
            <div class="item-row">
              <div>
                <strong>${this.escapeHtml(item.name)}</strong>
                <p style="margin:0.2rem 0 0;color:${item.available < item.requested ? '#b42318' : '#667085'};">
                  Requested ${item.requested} • Available ${item.available}
                </p>
              </div>
              <strong style="color:${item.available < item.requested ? '#b42318' : '#067647'};">
                ${item.available < item.requested ? 'Shortage' : 'Ready'}
              </strong>
            </div>
          `).join('')}
        </div>
        ${hasShortage ? '<p class="muted-note" style="color:#b42318;">One or more items are out of stock. Use the cancel action to notify the customer immediately.</p>' : '<p class="muted-note">Inventory is sufficient for the current order.</p>'}
      </div>

      <div class="detail-card">
        <h4>Tracking</h4>
        <div class="detail-actions">
          <input class="tracking-input" id="tracking-number" value="${this.escapeHtml(order.tracking || '')}" placeholder="Tracking number">
          <input class="tracking-input" id="tracking-carrier" value="${this.escapeHtml(order.carrier || '')}" placeholder="Carrier">
          <input class="tracking-input" id="tracking-date" type="date" value="${this.formatDateInput(order.estimatedDelivery)}">
          <button class="action-btn" id="save-tracking-btn">Save Tracking</button>
        </div>
      </div>

      <div class="detail-card">
        <h4>Items</h4>
        <div class="items-list">
          ${(order.items || []).map(item => `
            <div class="item-row">
              <div>
                <strong>${this.escapeHtml(item.name || 'Product')}</strong>
                <p style="margin:0.2rem 0 0;color:#667085;">Qty ${item.quantity || 0}</p>
              </div>
              <strong>₫${(((item.price || 0) * (item.quantity || 0))).toLocaleString()}</strong>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="detail-card">
        <h4>Payment Summary</h4>
        <div class="summary-lines">
          <div class="summary-line"><span>Subtotal</span><span>₫${(order.subtotal || 0).toLocaleString()}</span></div>
          <div class="summary-line"><span>Shipping</span><span>₫${shippingCost.toLocaleString()}</span></div>
          <div class="summary-line"><span>Total</span><span>₫${(order.total || 0).toLocaleString()}</span></div>
          <div class="summary-line total"><span>Current Status</span><span>${this.formatStatus(order.status)}</span></div>
        </div>
      </div>

      ${customer.note ? `
        <div class="detail-card">
          <h4>Customer Note</h4>
          <p>${this.escapeHtml(customer.note)}</p>
        </div>
      ` : ''}

      ${order.cancellationReason || latestCustomerUpdate ? `
        <div class="detail-card">
          <h4>Customer Update</h4>
          <p>${this.escapeHtml(order.cancellationReason || latestCustomerUpdate)}</p>
        </div>
      ` : ''}
    `;

    document.getElementById('save-status-btn')?.addEventListener('click', () => {
      const status = document.getElementById('status-select')?.value;
      this.updateStatus(order.id, status);
    });

    document.getElementById('advance-status-btn')?.addEventListener('click', () => {
      this.updateStatus(order.id, workflow.next);
    });

    document.getElementById('cancel-out-of-stock-btn')?.addEventListener('click', () => {
      const reason = window.prompt('Cancellation reason shown to the customer:', 'We are sorry, this item is currently out of stock and your order has been cancelled.');
      if (reason === null) {
        return;
      }
      this.cancelOrder(order.id, reason.trim());
    });

    document.getElementById('save-tracking-btn')?.addEventListener('click', () => {
      this.updateTracking(order.id);
    });
  }

  async updateStatus(orderId, status) {
    try {
      setLoading(true, 'Updating order status...');
      const customerMessage = this.buildCustomerMessage(orderId, status);
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update-status', status, customerMessage })
      });
      const result = await response.json();

      if (!result.success) {
        if (result.data?.code === 'OUT_OF_STOCK') {
          const summary = (result.data.shortages || []).map(item => `${item.name}: need ${item.requested}, available ${item.available}`).join('; ');
          throw new Error(`${result.message}. ${summary}`);
        }
        throw new Error(result.message || 'Failed to update status');
      }

      showToast('Order status updated', 'success');
      await this.loadProducts();
      await this.loadOrders();
    } catch (error) {
      console.error('Error updating status:', error);
      showToast(error.message || 'Failed to update status', 'error');
    } finally {
      setLoading(false);
    }
  }

  async updateTracking(orderId) {
    try {
      setLoading(true, 'Saving tracking details...');
      const payload = {
        action: 'update-tracking',
        tracking: document.getElementById('tracking-number')?.value.trim() || '',
        carrier: document.getElementById('tracking-carrier')?.value.trim() || '',
        estimatedDelivery: document.getElementById('tracking-date')?.value || null
      };

      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Failed to update tracking');
      }

      showToast('Tracking information updated', 'success');
      await this.loadOrders();
    } catch (error) {
      console.error('Error updating tracking:', error);
      showToast(error.message || 'Failed to update tracking', 'error');
    } finally {
      setLoading(false);
    }
  }

  async cancelOrder(orderId, reason) {
    try {
      setLoading(true, 'Cancelling order...');
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel', reason })
      });
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Failed to cancel order');
      }

      showToast('Order cancelled and customer notified', 'success');
      await this.loadProducts();
      await this.loadOrders();
    } catch (error) {
      console.error('Error cancelling order:', error);
      showToast(error.message || 'Failed to cancel order', 'error');
    } finally {
      setLoading(false);
    }
  }

  getWorkflowConfig(status) {
    if (status === 'pending') {
      return { next: 'processing', canCancel: true, hint: 'Confirming the order reserves stock and notifies the customer.' };
    }

    if (status === 'processing') {
      return { next: 'shipped', canCancel: true, hint: 'Ship the order after packing is complete. Tracking can be added before or after this step.' };
    }

    if (status === 'shipped') {
      return { next: 'delivered', canCancel: false, hint: 'Delivered marks the order complete for the customer.' };
    }

    return { next: null, canCancel: false, hint: '' };
  }

  getInventoryForOrder(order) {
    return (order.items || []).map(item => {
      const product = this.products.find(productEntry => String(productEntry.id) === String(item.id));
      return {
        id: item.id,
        name: item.name || product?.name || 'Product',
        requested: Number(item.quantity || 0),
        available: this.getProductQuantity(product)
      };
    });
  }

  getProductQuantity(product) {
    if (!product) {
      return 0;
    }

    if (Number.isFinite(Number(product.quantity))) {
      return Number(product.quantity);
    }

    if (Number.isFinite(Number(product.stock))) {
      return Number(product.stock);
    }

    return 20;
  }

  buildCustomerMessage(orderId, status) {
    if (status === 'processing') {
      return `Order #${orderId} has been confirmed and is now being prepared.`;
    }

    if (status === 'shipped') {
      return `Order #${orderId} has been shipped.`;
    }

    if (status === 'delivered') {
      return `Order #${orderId} has been delivered.`;
    }

    return '';
  }

  formatStatus(status) {
    if (!status) {
      return 'Pending';
    }

    return status.charAt(0).toUpperCase() + status.slice(1);
  }

  formatDate(value) {
    if (!value) {
      return 'N/A';
    }

    return new Date(value).toLocaleDateString();
  }

  formatDateTime(value) {
    if (!value) {
      return 'N/A';
    }

    return new Date(value).toLocaleString();
  }

  formatDateInput(value) {
    if (!value) {
      return '';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '';
    }

    return date.toISOString().slice(0, 10);
  }

  escapeHtml(value) {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }
}

const adminOrders = new AdminOrders();