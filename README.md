# 🍎 Apple E-Commerce Website

A beautiful, static-frontend phone/electronics e-commerce website featuring Apple products (iPhones, MacBooks, iPads, AirPods, and Apple Watches). Perfect for easy deployment on Hostinger, Inet, or any shared hosting service.

## ✨ Features

- **Product Catalog**: Browse Apple products organized by category
- **Product Filtering**: Filter by category (iPhone, Mac, iPad, AirPods, Apple Watch)
- **Shopping Cart**: Add items to cart with quantity management
- **Checkout System**: Customer information and shipping address collection
- **Order Management**: Orders saved and retrievable through admin interface
- **Responsive Design**: Beautiful mobile-friendly interface
- **Static Frontend**: HTML, CSS, and JavaScript (no build process needed)
- **PHP Backend**: Lightweight PHP for order processing

## 🚀 Quick Start

### 1. **Local Testing**
```bash
# Using PHP built-in server
php -S localhost:8000

# Then visit: http://localhost:8000
```

### 2. **Deploy to Hostinger/Inet**

#### Method A: FTP Upload
1. Download all files from your local folder
2. Use FTP client (FileZilla, Cyberduck, etc.)
3. Connect to your hosting server
4. Upload all files to your `public_html` folder
5. Visit your domain

#### Method B: File Manager (cPanel/Plesk)
1. Log in to your hosting control panel
2. Open File Manager
3. Navigate to `public_html`
4. Upload all files
5. Visit your domain

### 3. **Create Orders Directory**
The orders directory must be writable:
```bash
# Through File Manager or FTP, create folder: orders/
# Set permissions to 755 (through File Manager)
```

## 📁 File Structure

```
apple-ecommerce/
├── index.html              # Main product listing page
├── cart.html               # Shopping cart page
├── checkout.html           # Checkout form page
├── products.json           # Product catalog
├── submit-order.php        # Process and save orders
├── process-order.php       # Admin order retrieval
├── assets/
│   ├── css/
│   │   └── style.css       # All styling
│   └── js/
│       ├── main.js         # Product listing logic
│       ├── cart.js         # Cart management
│       └── checkout.js     # Checkout form handling
└── orders/                 # Order storage directory (auto-created)
```

## 🛠️ How It Works

### Frontend Flow
1. **Products Page** (`index.html`)
   - Loads products from `products.json`
   - Users can filter by category
   - Click "View Details" to open product modal
   - Add items to cart (stored in browser localStorage)

2. **Cart Page** (`cart.html`)
   - Display all cart items
   - Adjust quantities
   - View subtotal, tax, and total
   - Proceed to checkout

3. **Checkout Page** (`checkout.html`)
   - Collect customer information
   - Collect shipping address
   - Display order summary
   - Submit order

### Backend Flow
1. **Order Submission** (`submit-order.php`)
   - Receives order data from checkout form
   - Validates all fields
   - Saves order as JSON file in `orders/` directory
   - Returns success/error response

2. **Order Retrieval** (`process-order.php`)
   - List all orders: `/process-order.php?action=list`
   - Get single order: `/process-order.php?action=get&orderNumber=ORD-XXXXXX`
   - Download order: `/process-order.php?action=download&orderNumber=ORD-XXXXXX`

## 📦 Adding Products

Edit `products.json` to add or modify products:

```json
{
  "id": 11,
  "name": "Product Name",
  "category": "Category",
  "price": 999,
  "image": "https://image-url.jpg",
  "description": "Product description",
  "specs": [
    "Specification 1",
    "Specification 2"
  ]
}
```

## 🔧 Configuration

### Change Admin Password
Edit `process-order.php` line 10:
```php
$adminPassword = 'your-new-password'; // Change this!
```

### Add Email Notifications
Uncomment email sending in `submit-order.php` (requires mail server):
```php
mail($email, $subject, $message, $headers);
```

### Customize Styles
Edit `assets/css/style.css` to change colors, fonts, or layout

## 💳 Payment Processing

Currently, the website collects order information and customers will be contacted to complete payment. For future integration:

- **Stripe**: Integrate Stripe Checkout
- **PayPal**: Add PayPal button
- **Razorpay**: Popular for Indian merchants
- **2Checkout**: Global payment option

## 📱 Responsive Design

The website is fully responsive and works on:
- Desktop (1200px+)
- Tablet (768px - 1199px)
- Mobile (< 768px)

## ⚙️ System Requirements

- **Hosting**: Any PHP-enabled hosting (PHP 7.0+)
- **Database**: None required (JSON file storage)
- **SSL**: Optional (but recommended for production)

## 🔐 Security Notes

1. **Change admin password** in `process-order.php`
2. **Set proper permissions** on `orders/` directory (755)
3. **Enable HTTPS** on production
4. **Validate all inputs** (already done in PHP)
5. **Regular backups** of `orders/` directory

## 📊 Viewing Orders

### Through Browser
Visit: `http://yoursite.com/process-order.php?action=list`

Returns JSON with all orders

### Get Specific Order
Visit: `http://yoursite.com/process-order.php?action=get&orderNumber=ORD-1234567890`

### Download Order as JSON
Visit: `http://yoursite.com/process-order.php?action=download&orderNumber=ORD-1234567890`

## 🐛 Troubleshooting

### Orders not saving
- Check `orders/` directory exists
- Verify folder permissions (755)
- Check PHP error logs

### Products not loading
- Ensure `products.json` is in root folder
- Check JSON syntax (use jsonlint.com)
- Verify file permissions

### Cart not persisting
- Check browser localStorage is enabled
- Clear browser cache and try again

## 📝 Future Enhancements

- [ ] Payment gateway integration (Stripe/PayPal)
- [ ] Email notifications
- [ ] Admin dashboard
- [ ] Product reviews
- [ ] Inventory management
- [ ] Customer accounts
- [ ] Analytics integration

## 📄 License

MIT License - Feel free to use and modify for your projects

## 🤝 Support

For issues or questions, review the deployment guide or consult your hosting provider.

---

**Happy selling! 🚀**
