# 🛡️ Admin Dashboard & Notification System

## Overview

Your Apple Store e-commerce platform now includes a complete **Admin Dashboard** with real-time order tracking and notification system.

---

## 📊 Accessing the Admin Dashboard

### URL
```
https://testteamvippro.github.io/apple-commerce/admin.html
```

Or navigate from the store homepage (you can add a secret admin link in your navbar).

---

## 🎯 Admin Dashboard Features

### 1. **Real-Time Statistics**
- **Tổng Đơn Hàng** - Total number of orders received
- **Tổng Doanh Thu** - Total revenue from all orders
- **Đơn Hàng Pending** - Orders waiting for confirmation
- **Khách Hàng Độc Nhất** - Number of unique customers

Stats automatically update when new orders arrive.

### 2. **Order Management**
- View all customer orders in a detailed table
- **Search functionality** - Find orders by:
  - Order ID (Mã Đơn Hàng)
  - Customer name (Họ tên)
  - Email
  - Phone number

### 3. **Filtering Options**
- **Tất Cả** - Show all orders
- **Hôm Nay** - Orders from today
- **Tuần Này** - Orders from this week
- **Tháng Này** - Orders from this month

### 4. **Order Actions**
For each order, you can:
- **Xem (View)** - Open full order details including:
  - Customer contact information
  - Shipping address
  - All purchased items with quantities
  - Full payment breakdown
  - Customer notes
  
- **Xóa (Delete)** - Remove an order from the system

- **📥 Tải JSON** - Download order details as JSON file
- **📋 Copy Thông Tin** - Copy order info to clipboard (for sharing via email/chat)

### 5. **Bulk Operations**
- **📥 Xuất Dữ Liệu** - Export ALL orders as a JSON file
- **🗑️ Xóa Tất Cả** - Delete all orders (with confirmation)

---

## 🔔 Notification System

### How it Works

When a customer completes a purchase:

1. **Order is saved** to browser localStorage
2. **Admin dashboard monitors** localStorage for changes (checks every 5 seconds)
3. **Notification triggers** in the admin dashboard with:
   - Customer name
   - Order total amount
   - Visual confirmation message

### Types of Notifications

#### 1. **In-Dashboard Notification**
- Green notification box appears at top of dashboard
- Shows: "🎉 Đơn hàng mới từ {Khách}! Tổng: {Giá}"
- Auto-dismisses after 3 seconds
- Stays if new orders continue coming

#### 2. **Browser Push Notification** (if enabled)
- Native browser notification popup
- Works even if the dashboard tab is in the background
- Requires user permission (granted automatically on first load)
- Shows customer name and order amount

#### 3. **Email Notification** (Optional Enhancement)
You can add email notifications by integrating with services like:
- **SendGrid**
- **Mailgun**
- **Firebase Cloud Messaging**

---

## 💾 Data Storage

### Where Orders are Stored
Orders are saved in **browser localStorage** with key: `orders`

```javascript
// Format of stored order
{
  "orderNumber": "ORD-1704067200000",
  "orderDate": "1/1/2024, 10:00:00 AM",
  "firstName": "Nguyễn",
  "lastName": "Tài",
  "email": "customer@email.com",
  "phone": "0912345678",
  "address": "123 Đường Lâm",
  "city": "Hà Nội",
  "state": "Ba Đình",
  "postal": "100000",
  "country": "Việt Nam",
  "notes": "Giao buổi sáng",
  "items": [...],
  "subtotal": 2598,
  "tax": 259.8,
  "total": 2857.8
}
```

### Accessing Order Data Programmatically

```javascript
// Get all orders
const orders = JSON.parse(localStorage.getItem('orders') || '[]');

// Get specific order
const orderNumber = 'ORD-1704067200000';
const order = orders.find(o => o.orderNumber === orderNumber);

// Calculate total revenue
const revenue = orders.reduce((sum, order) => sum + order.total, 0);
```

---

## 🔧 Integration Options for Enhanced Notifications

### Option 1: Webhook Notification (Recommended)

Send order notifications to Slack, Discord, or Teams:

```javascript
// In checkout.js - after order is saved:
async function sendWebhookNotification(order) {
    const webhookUrl = 'YOUR_WEBHOOK_URL';
    await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            text: `🎉 Đơn Hàng Mới: ${order.orderNumber}`,
            customer: `${order.firstName} ${order.lastName}`,
            email: order.email,
            phone: order.phone,
            total: `₫${order.total.toLocaleString()}`,
            items: order.items.length
        })
    });
}
```

**Setup Instructions:**
1. Create Slack/Discord webhook
2. Paste URL into code above
3. Orders will now post to your channel in real-time

### Option 2: Email Notification

Add email integration via services like:
- **Formspree**: Simple form submissions
- **EmailJS**: Client-side email sending
- **Firebase**: Serverless email notifications

---

## 📱 Using the Admin Dashboard

### Step-by-Step Guide

1. **Open Dashboard**
   - Go to: `admin.html`
   - See real-time stats

2. **Monitor Orders**
   - Check the orders table
   - View statistics updates
   - Receive notifications for new orders

3. **View Order Details**
   - Click "Xem" button on any order
   - See full customer and shipping info
   - Review all items and prices

4. **Take Action**
   - Copy order info for manual follow-up
   - Download JSON for record-keeping
   - Delete test/invalid orders

5. **Export Data**
   - Click "📥 Xuất Dữ Liệu"
   - Get all orders as JSON file
   - Import into spreadsheet or system

---

## 🔐 Security Notes

⚠️ **Important**: The current system stores data in browser localStorage only.

### For Production Use:
1. **Add Backend Server** to store orders securely in database
2. **Require Admin Login** - Protect admin.html with authentication
3. **Add HTTPS** - Ensure all data is encrypted in transit
4. **Implement Rate Limiting** - Prevent abuse
5. **Add Audit Logging** - Track admin actions

### Example: Add Basic Password Protection

```html
<!-- At top of admin.html -->
<script>
    const adminPassword = 'YOUR_SECRET_PASSWORD';
    const stored = sessionStorage.getItem('adminAuth');
    
    if (!stored) {
        const pass = prompt('Enter Admin Password:');
        if (pass !== adminPassword) {
            alert('Invalid password!');
            window.location.href = 'index.html';
        } else {
            sessionStorage.setItem('adminAuth', 'true');
        }
    }
</script>
```

---

## 📊 Statistics Explained

| Metric | Description | Use Case |
|--------|-------------|----------|
| Tổng Đơn Hàng | Total orders received | Track business volume |
| Tổng Doanh Thu | Sum of all order totals | Track revenue |
| Đơn Hàng Pending | Orders awaiting confirmation | Follow-up with customers |
| Khách Hàng Độc Nhất | Unique email addresses | Identify repeat customers |

---

## 🎨 Customization

### Change Admin Dashboard Theme

Edit the `:root` section in admin.html `<style>`:

```css
:root {
    --admin-bg: #0f172a;           /* Background color */
    --admin-card: #1e293b;         /* Card background */
    --admin-text: #f1f5f9;         /* Text color */
    --primary: #3b82f6;            /* Primary color */
}
```

### Add Custom Columns

Edit the table in `renderOrders()` function to add:
- Product categories
- Customer location
- Order status
- etc.

---

## 🚀 Next Steps

1. **Add Backend Database** (Firebase, Supabase, PostgreSQL)
2. **Implement Admin Authentication**
3. **Add Email Notifications**
4. **Create Mobile Admin App**
5. **Add Inventory Management**
6. **Implement Order Status Tracking**

---

## 📞 Support

For issues or questions:
1. Check browser console (F12 → Console)
2. Verify localStorage has order data
3. Clear cache and reload
4. Check webhook URLs if using integrations

---

## 📝 Version History

- **v1.0** - Initial admin dashboard with real-time notifications
- **v2.0** (Coming) - Backend integration with email notifications
- **v3.0** (Coming) - Mobile admin app

---

**Last Updated**: May 7, 2026
