class AnalyticsExport {
  static exportToCSV(data, filename = 'analytics.csv') {
    let csv = 'Analytics Report\n';
    csv += 'Generated: ' + new Date().toLocaleString() + '\n\n';

    // KPI Section
    csv += 'Key Performance Indicators\n';
    csv += 'Total Revenue,Total Orders,Average Order Value,Conversion Rate\n';
    csv += `${data.totalRevenue},${data.totalOrders},${data.averageOrderValue},${(data.conversionRate * 100).toFixed(2)}%\n\n`;

    // Customer Insights Section
    csv += 'Customer Insights\n';
    csv += 'New Customers,Returning Customers,Customer Lifetime Value,Avg Orders/Customer,Return Rate,Abandonment Rate\n';
    csv += `${data.newCustomers},${data.returningCustomers},${data.customerLifetimeValue},${data.averageOrdersPerCustomer},${(data.productReturnRate * 100).toFixed(2)}%,${(data.cartAbandonmentRate * 100).toFixed(2)}%\n\n`;

    // Revenue Over Time
    if (data.revenueOverTime) {
      csv += 'Revenue Over Time\n';
      csv += 'Date,Revenue\n';
      data.revenueOverTime.labels.forEach((label, i) => {
        csv += `${label},${data.revenueOverTime.values[i]}\n`;
      });
      csv += '\n';
    }

    // Top Products
    if (data.topProducts) {
      csv += 'Top Products\n';
      csv += 'Product,Sales\n';
      data.topProducts.labels.forEach((label, i) => {
        csv += `${label},${data.topProducts.values[i]}\n`;
      });
      csv += '\n';
    }

    // Download CSV
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  }

  static exportToPDF(data, filename = 'analytics.pdf') {
    // Basic PDF generation using jsPDF if available
    // For now, using print functionality as fallback
    window.print();
  }

  static generatePrintableReport(data) {
    const reportHTML = `
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1 { color: #333; border-bottom: 2px solid #667eea; padding-bottom: 10px; }
        h2 { color: #667eea; margin-top: 20px; }
        table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #667eea; color: white; }
        .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 20px 0; }
        .kpi-card { border: 1px solid #ddd; padding: 15px; text-align: center; }
        .kpi-value { font-size: 24px; font-weight: bold; color: #667eea; }
        .page-break { page-break-after: always; }
      </style>

      <h1>Analytics Report</h1>
      <p>Generated: ${new Date().toLocaleString()}</p>

      <h2>Key Performance Indicators</h2>
      <div class="kpi-grid">
        <div class="kpi-card">
          <h3>Total Revenue</h3>
          <p class="kpi-value">₫${(data.totalRevenue || 0).toLocaleString()}</p>
        </div>
        <div class="kpi-card">
          <h3>Total Orders</h3>
          <p class="kpi-value">${data.totalOrders || 0}</p>
        </div>
        <div class="kpi-card">
          <h3>Average Order Value</h3>
          <p class="kpi-value">₫${(data.averageOrderValue || 0).toLocaleString()}</p>
        </div>
        <div class="kpi-card">
          <h3>Conversion Rate</h3>
          <p class="kpi-value">${((data.conversionRate || 0) * 100).toFixed(1)}%</p>
        </div>
      </div>

      <h2>Customer Insights</h2>
      <table>
        <tr>
          <th>Metric</th>
          <th>Value</th>
        </tr>
        <tr>
          <td>New Customers</td>
          <td>${data.newCustomers || 0}</td>
        </tr>
        <tr>
          <td>Returning Customers</td>
          <td>${data.returningCustomers || 0}</td>
        </tr>
        <tr>
          <td>Customer Lifetime Value</td>
          <td>₫${(data.customerLifetimeValue || 0).toLocaleString()}</td>
        </tr>
        <tr>
          <td>Average Orders per Customer</td>
          <td>${(data.averageOrdersPerCustomer || 0).toFixed(2)}</td>
        </tr>
        <tr>
          <td>Product Return Rate</td>
          <td>${((data.productReturnRate || 0) * 100).toFixed(1)}%</td>
        </tr>
        <tr>
          <td>Cart Abandonment Rate</td>
          <td>${((data.cartAbandonmentRate || 0) * 100).toFixed(1)}%</td>
        </tr>
      </table>

      ${data.revenueOverTime ? `
        <div class="page-break"></div>
        <h2>Revenue Over Time</h2>
        <table>
          <tr><th>Date</th><th>Revenue</th></tr>
          ${data.revenueOverTime.labels.map((label, i) => `
            <tr><td>${label}</td><td>₫${(data.revenueOverTime.values[i] || 0).toLocaleString()}</td></tr>
          `).join('')}
        </table>
      ` : ''}

      ${data.topProducts ? `
        <h2>Top Products</h2>
        <table>
          <tr><th>Product</th><th>Sales</th></tr>
          ${data.topProducts.labels.map((label, i) => `
            <tr><td>${label}</td><td>${data.topProducts.values[i]}</td></tr>
          `).join('')}
        </table>
      ` : ''}
    `;

    return reportHTML;
  }
}

function exportCSV() {
  if (!analyticsDashboard.data) {
    showToast('No data to export', 'error');
    return;
  }
  AnalyticsExport.exportToCSV(analyticsDashboard.data, 
    `analytics_${new Date().toISOString().split('T')[0]}.csv`);
}

function exportPDF() {
  if (!analyticsDashboard.data) {
    showToast('No data to export', 'error');
    return;
  }
  const html = AnalyticsExport.generatePrintableReport(analyticsDashboard.data);
  const printWindow = window.open('', '', 'width=800,height=600');
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}

function printReport() {
  if (!analyticsDashboard.data) {
    showToast('No data to print', 'error');
    return;
  }
  const html = AnalyticsExport.generatePrintableReport(analyticsDashboard.data);
  const printWindow = window.open('', '', 'width=800,height=600');
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}
