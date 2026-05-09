class ChartsHandler {
  static defaultColors = ['#667eea', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

  static createLineChart(canvasId, label, data, options = {}) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return null;

    return new Chart(ctx, {
      type: 'line',
      data: {
        labels: options.labels || [],
        datasets: [{
          label: label,
          data: data,
          borderColor: options.borderColor || '#667eea',
          backgroundColor: options.backgroundColor || 'rgba(102, 126, 234, 0.1)',
          borderWidth: 2,
          tension: options.tension || 0.4,
          fill: options.fill !== false,
          pointRadius: 4,
          pointBackgroundColor: options.borderColor || '#667eea',
          pointBorderColor: '#fff',
          pointBorderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: options.maintainAspectRatio !== false,
        plugins: {
          legend: { display: true, position: 'top' },
          tooltip: { mode: 'index', intersect: false }
        },
        scales: {
          y: { 
            beginAtZero: true,
            max: options.maxY || undefined
          }
        }
      }
    });
  }

  static createBarChart(canvasId, label, data, options = {}) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return null;

    return new Chart(ctx, {
      type: 'bar',
      data: {
        labels: options.labels || [],
        datasets: [{
          label: label,
          data: data,
          backgroundColor: options.backgroundColor || '#667eea',
          borderRadius: 4
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

  static createDoughnutChart(canvasId, labels, data, options = {}) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return null;

    return new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: options.colors || this.defaultColors
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

  static createPieChart(canvasId, labels, data, options = {}) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return null;

    return new Chart(ctx, {
      type: 'pie',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: options.colors || this.defaultColors
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

  static createRadarChart(canvasId, label, data, options = {}) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return null;

    return new Chart(ctx, {
      type: 'radar',
      data: {
        labels: options.labels || [],
        datasets: [{
          label: label,
          data: data,
          borderColor: options.borderColor || '#667eea',
          backgroundColor: options.backgroundColor || 'rgba(102, 126, 234, 0.2)',
          pointBackgroundColor: options.borderColor || '#667eea'
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

  static createAreaChart(canvasId, label, data, options = {}) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return null;

    return new Chart(ctx, {
      type: 'line',
      data: {
        labels: options.labels || [],
        datasets: [{
          label: label,
          data: data,
          borderColor: options.borderColor || '#667eea',
          backgroundColor: options.backgroundColor || 'rgba(102, 126, 234, 0.3)',
          borderWidth: 2,
          fill: true,
          tension: 0.4
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

  static createComboChart(canvasId, datasets, options = {}) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return null;

    return new Chart(ctx, {
      type: 'bar',
      data: {
        labels: options.labels || [],
        datasets: datasets
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'top' }
        }
      }
    });
  }
}
