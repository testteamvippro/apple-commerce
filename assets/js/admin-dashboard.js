class AdminDashboard {
  constructor() {
    this.stats = null;
    this.recentOrders = [];
    this.topProducts = [];
    this.init();
  }

  async init() {
    if (!auth.isAdmin()) {
      window.location.href = '/login.html';
      return;
    }

    await this.loadStats();
    this.setupEventListeners();
  }

  async loadStats() {
    try {
      const response = await fetch('/api/admin?action=stats');
      const result = await response.json();

      if (result.success) {
        this.stats = result.data;
        this.recentOrders = result.data.recentOrders || [];
        this.topProducts = result.data.topProducts || [];
        this.renderDashboard();
      }
    } catch (error) {
      console.error('Error loading stats:', error);
      showToast('Failed to load dashboard data', 'error');
    }
  }

  renderDashboard() {
    this.renderStats();
    this.renderRecentOrders();
    this.renderTopProducts();
  }

  renderStats() {
    if (!this.stats) return;

    const stats = this.stats;

    // Update stat cards
    const statElements = {
      'total-products': stats.totalProducts || 0,
      'total-orders': stats.totalOrders || 0,
      'total-revenue': '₫' + (stats.totalRevenue || 0).toLocaleString(),
      'total-users': stats.totalUsers || 0
    };

    for (const [id, value] of Object.entries(statElements)) {
      const element = document.getElementById(id);
      if (element) {
        element.textContent = value;
      }
    }
  }

  renderRecentOrders() {
    const container = document.getElementById('recent-orders-table');
    if (!container) return;

    if (this.recentOrders.length === 0) {
      container.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 2rem;">No orders yet</td></tr>';
      return;
    }

    container.innerHTML = this.recentOrders.map(order => `
      <tr>
        <td>#${order.id}</td>
        <td>${order.customer?.name || 'Unknown'}</td>
        <td>₫${order.total.toLocaleString()}</td>
        <td>
          <span class="status-badge status-${order.status}">
            ${order.status}
          </span>
        </td>
        <td>${new Date(order.createdAt).toLocaleDateString()}</td>
        <td>
          <a href="/admin/orders.html?id=${order.id}" class="action-link">View</a>
        </td>
      </tr>
    `).join('');
  }

  renderTopProducts() {
    const container = document.getElementById('top-products-grid');
    if (!container) return;

    if (this.topProducts.length === 0) {
      container.innerHTML = '<p style="text-align: center; grid-column: 1/-1;">No products yet</p>';
      return;
    }

    container.innerHTML = this.topProducts.slice(0, 6).map(product => `
      <div class="product-card">
        <div class="product-image">📱</div>
        <h4>${product.name}</h4>
        <p class="product-price">₫${product.price.toLocaleString()}</p>
        <p class="product-sales">
          <strong>${product.sales || 0}</strong> sold
        </p>
        <a href="/admin/products.html?id=${product.id}" class="action-link">Edit</a>
      </div>
    `).join('');
  }

  setupEventListeners() {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        auth.logout();
        window.location.href = '/';
      });
    }
  }

  async refreshStats() {
    await this.loadStats();
  }
}

// Global instance
const adminDashboard = new AdminDashboard();

// Auto-refresh every 30 seconds
setInterval(() => {
  adminDashboard.refreshStats();
}, 30000);
