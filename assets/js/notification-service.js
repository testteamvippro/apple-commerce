class NotificationService {
  constructor() {
    this.notifications = [];
    this.unreadCount = 0;
    this.init();
  }

  async init() {
    if (auth.isLoggedIn()) {
      await this.loadNotifications();
      this.setupRefresh();
    }
  }

  async loadNotifications() {
    try {
      const userId = auth.getUser().id;
      const response = await fetch(`/api/notifications?userId=${userId}`);
      const result = await response.json();

      if (result.success) {
        this.notifications = result.data || [];
        this.updateUnreadCount();
        this.updateNotificationBadge();
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  }

  updateUnreadCount() {
    this.unreadCount = this.notifications.filter(n => !n.read).length;
  }

  updateNotificationBadge() {
    const badge = document.querySelector('[data-notification-badge]');
    if (badge) {
      if (this.unreadCount > 0) {
        badge.textContent = this.unreadCount > 99 ? '99+' : this.unreadCount;
        badge.style.display = 'block';
      } else {
        badge.style.display = 'none';
      }
    }
  }

  async showNotification(title, message, type = 'info', duration = 3000) {
    const notification = document.createElement('div');
    notification.className = `toast toast-${type}`;
    notification.innerHTML = `
      <strong>${title}</strong>
      <p>${message}</p>
      <button onclick="this.parentElement.remove()" style="background: none; border: none; color: inherit; cursor: pointer; font-size: 1.2rem;">&times;</button>
    `;

    const container = document.querySelector('.toast-container') || this.createToastContainer();
    container.appendChild(notification);

    if (duration > 0) {
      setTimeout(() => {
        notification.remove();
      }, duration);
    }

    // Save to backend
    if (auth.isLoggedIn()) {
      await this.createNotification(
        auth.getUser().id,
        title,
        message,
        type
      );
    }
  }

  createToastContainer() {
    const container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
    return container;
  }

  async createNotification(userId, title, message, type = 'info') {
    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          title,
          message,
          type,
          createdAt: new Date().toISOString()
        })
      });

      const result = await response.json();
      if (result.success) {
        const newNotif = result.data;
        this.notifications.unshift(newNotif);
        this.updateUnreadCount();
        this.updateNotificationBadge();
      }
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  }

  async markAsRead(notificationId) {
    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark-read' })
      });

      const result = await response.json();
      if (result.success) {
        const notif = this.notifications.find(n => n.id === notificationId);
        if (notif) {
          notif.read = true;
          this.updateUnreadCount();
          this.updateNotificationBadge();
        }
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }

  async deleteNotification(notificationId) {
    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'DELETE'
      });

      const result = await response.json();
      if (result.success) {
        this.notifications = this.notifications.filter(n => n.id !== notificationId);
        this.updateUnreadCount();
        this.updateNotificationBadge();
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  }

  async deleteAllNotifications() {
    try {
      const userId = auth.getUser().id;
      const response = await fetch(`/api/notifications?userId=${userId}`, {
        method: 'DELETE'
      });

      const result = await response.json();
      if (result.success) {
        this.notifications = [];
        this.updateUnreadCount();
        this.updateNotificationBadge();
      }
    } catch (error) {
      console.error('Error deleting all notifications:', error);
    }
  }

  setupRefresh() {
    // Refresh notifications every 30 seconds
    setInterval(() => {
      this.loadNotifications();
    }, 30000);
  }

  // Helper methods for specific notification types
  notifyOrderPlaced(orderId) {
    this.showNotification(
      '✅ Order Placed',
      `Your order #${orderId} has been placed successfully!`,
      'success'
    );
  }

  notifyOrderShipped(orderId, trackingNumber) {
    this.showNotification(
      '🚚 Order Shipped',
      `Your order #${orderId} has been shipped. Tracking: ${trackingNumber}`,
      'info'
    );
  }

  notifyPaymentSuccessful(amount) {
    this.showNotification(
      '💳 Payment Successful',
      `Payment of ₫${amount.toLocaleString()} has been processed.`,
      'success'
    );
  }

  notifyPaymentFailed(reason) {
    this.showNotification(
      '❌ Payment Failed',
      reason || 'Your payment could not be processed. Please try again.',
      'error'
    );
  }

  notifyPromotion(title, message) {
    this.showNotification(
      '🎉 ' + title,
      message,
      'warning'
    );
  }

  notifyError(title, message) {
    this.showNotification(
      '⚠️ ' + title,
      message,
      'error',
      5000
    );
  }

  notifySuccess(title, message) {
    this.showNotification(
      '✅ ' + title,
      message,
      'success'
    );
  }
}

// Global instance
const notificationService = new NotificationService();
