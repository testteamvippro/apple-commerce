class AnalyticsDashboard {
  constructor() {
    this.dateRange = 'week';
    this.data = null;
    this.charts = {};
  }

  async init() {
    await this.loadAnalytics();
    this.renderDashboard();
  }

  async loadAnalytics() {
    try {
      const response = await fetch(`/api/analytics?range=${this.dateRange}`);
      const result = await response.json();

      if (result.success) {
        this.data = result.data;
      } else {
        console.error('Failed to load analytics');
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
      showToast('Failed to load analytics', 'error');
    }
  }

  renderDashboard() {
    if (!this.data) return;

    // Update KPI cards
    document.getElementById('total-revenue').textContent = 
      '₫' + (this.data.totalRevenue || 0).toLocaleString();
    document.getElementById('total-orders').textContent = 
      this.data.totalOrders || 0;
    document.getElementById('avg-order').textContent = 
      '₫' + (this.data.averageOrderValue || 0).toLocaleString();
    document.getElementById('conversion-rate').textContent = 
      ((this.data.conversionRate || 0) * 100).toFixed(1) + '%';

    // Update change indicators
    this.updateChangeIndicator('revenue-change', this.data.revenueChange);
    this.updateChangeIndicator('orders-change', this.data.ordersChange);
    this.updateChangeIndicator('aov-change', this.data.aovChange);
    this.updateChangeIndicator('conversion-change', this.data.conversionChange);

    // Update customer insights
    document.getElementById('new-customers').textContent = 
      this.data.newCustomers || 0;
    document.getElementById('returning-customers').textContent = 
      this.data.returningCustomers || 0;
    document.getElementById('customer-lifetime').textContent = 
      '₫' + (this.data.customerLifetimeValue || 0).toLocaleString();
    document.getElementById('avg-orders-customer').textContent = 
      (this.data.averageOrdersPerCustomer || 0).toFixed(2);
    document.getElementById('return-rate').textContent = 
      ((this.data.productReturnRate || 0) * 100).toFixed(1) + '%';
    document.getElementById('abandonment-rate').textContent = 
      ((this.data.cartAbandonmentRate || 0) * 100).toFixed(1) + '%';

    // Initialize charts
    this.initCharts();
  }

  updateChangeIndicator(elementId, change) {
    const element = document.getElementById(elementId);
    if (!element) return;

    const percentage = ((change || 0) * 100).toFixed(1);
    const isPositive = change > 0;

    element.textContent = (isPositive ? '+' : '') + percentage + '%';
    element.className = 'kpi-change ' + (isPositive ? 'positive' : 'negative');
  }

  initCharts() {
    // Revenue over time chart
    this.initRevenueChart();

    // Orders distribution chart
    this.initOrdersChart();

    // Top products chart
    this.initTopProductsChart();

    // Category chart
    this.initCategoryChart();
  }

  initRevenueChart() {
    const ctx = document.getElementById('revenue-chart');
    if (!ctx) return;

    if (this.charts.revenue) {
      this.charts.revenue.destroy();
    }

    this.charts.revenue = new Chart(ctx, {
      type: 'line',
      data: {
        labels: this.data.revenueOverTime?.labels || [],
        datasets: [{
          label: 'Revenue',
          data: this.data.revenueOverTime?.values || [],
          borderColor: '#667eea',
          backgroundColor: 'rgba(102, 126, 234, 0.1)',
          borderWidth: 2,
          tension: 0.4,
          fill: true
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: true, position: 'top' }
        },
        scales: {
          y: { beginAtZero: true }
        }
      }
    });
  }

  initOrdersChart() {
    const ctx = document.getElementById('orders-chart');
    if (!ctx) return;

    if (this.charts.orders) {
      this.charts.orders.destroy();
    }

    this.charts.orders = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: this.data.ordersDistribution?.labels || [],
        datasets: [{
          label: 'Orders',
          data: this.data.ordersDistribution?.values || [],
          backgroundColor: '#10b981'
        }]
      },
      options: {
        responsive: true,
        scales: {
          y: { beginAtZero: true }
        }
      }
    });
  }

  initTopProductsChart() {
    const ctx = document.getElementById('top-products-chart');
    if (!ctx) return;

    if (this.charts.topProducts) {
      this.charts.topProducts.destroy();
    }

    this.charts.topProducts = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: this.data.topProducts?.labels || [],
        datasets: [{
          data: this.data.topProducts?.values || [],
          backgroundColor: ['#667eea', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'bottom' }
        }
      }
    });
  }

  initCategoryChart() {
    const ctx = document.getElementById('category-chart');
    if (!ctx) return;

    if (this.charts.category) {
      this.charts.category.destroy();
    }

    this.charts.category = new Chart(ctx, {
      type: 'radar',
      data: {
        labels: this.data.categoryData?.labels || [],
        datasets: [{
          label: 'Sales',
          data: this.data.categoryData?.values || [],
          borderColor: '#667eea',
          backgroundColor: 'rgba(102, 126, 234, 0.2)',
          pointBackgroundColor: '#667eea'
        }]
      },
      options: {
        responsive: true,
        scales: {
          r: { beginAtZero: true }
        }
      }
    });
  }

  async updateDateRange(range) {
    this.dateRange = range;
    await this.loadAnalytics();
    this.renderDashboard();
  }
}

const analyticsDashboard = new AnalyticsDashboard();
