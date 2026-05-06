# 🚀 Deploy to GitHub Pages (Frontend Debugging)

This guide shows how to deploy the Apple E-Commerce site to GitHub Pages for testing and debugging.

## ⚠️ Important Notes

**GitHub Pages Limitations:**
- ✅ Frontend works perfectly (HTML, CSS, JS)
- ❌ PHP backend won't run (orders saved to browser localStorage instead)
- ✅ Orders stored locally in your browser
- ✅ Can export/download orders as JSON

**This is ideal for:**
- Testing the UI/UX
- Debugging frontend issues
- Sharing with team members
- Live preview before production

## 📋 Prerequisites

- GitHub account (free)
- Git installed on your computer
- The apple-ecommerce folder ready

## 🔧 Step-by-Step Setup

### 1. Create a GitHub Repository

**On GitHub.com:**
1. Go to https://github.com/new
2. Repository name: `apple-ecommerce` (or any name)
3. Description: "Apple E-Commerce Store - Frontend Debugging"
4. Choose "Public" (required for free GitHub Pages)
5. Click "Create repository"
6. **Copy the repository URL** (you'll need it)

### 2. Initialize Git Locally

```bash
# Navigate to your project
cd /Users/quangkhong/Coding/web_development/apple-ecommerce

# Initialize git
git init

# Add all files
git add .

# Create first commit
git commit -m "Initial commit: Apple E-Commerce Store"

# Add remote repository (replace YOUR_USERNAME and REPO_NAME)
git remote add origin https://github.com/YOUR_USERNAME/REPO_NAME.git

# Push to GitHub
git branch -M main
git push -u origin main
```

### 3. Enable GitHub Pages

**On GitHub.com:**
1. Go to your repository
2. Click "Settings" (top right)
3. Scroll to "Pages" (left sidebar)
4. Under "Build and deployment"
5. Set "Source" to "Deploy from a branch"
6. Set "Branch" to `main` and `/root`
7. Click "Save"

**Your site will be available at:**
```
https://YOUR_USERNAME.github.io/REPO_NAME
```

Example: `https://quangkhong.github.io/apple-ecommerce`

### 4. Test Your Site

- Wait 1-2 minutes for GitHub to build
- Visit your GitHub Pages URL
- Try adding products to cart
- Test checkout
- View orders at `/orders.html`

## 🎯 Using Your Site

### **Browse Products**
- Homepage lists all Apple products
- Filter by category
- Click "View Details" to see product modal
- Click "Add to Cart"

### **Shopping Cart**
- Go to Cart page
- Adjust quantities
- See real-time total calculations
- Proceed to checkout

### **Checkout**
- Fill customer information
- Enter shipping address
- Submit order
- Order saved to browser localStorage

### **View Orders**
- Go to "Orders" page
- See all placed orders
- Download individual orders as JSON
- Export all orders
- Delete orders

## 💾 Managing Orders

Orders are stored in your browser's localStorage. They are:
- ✅ Persisted locally
- ✅ Survive page refreshes
- ✅ Safe (not sent anywhere)
- ❌ Only visible on your device

### Export Orders
1. Go to Orders page
2. Click "Export as JSON"
3. All orders download as JSON file
4. Use for record-keeping

## 🔄 Updating Your Site

To make changes:

```bash
# Make your changes in the files
# Then:

git add .
git commit -m "Description of changes"
git push
```

GitHub will automatically rebuild (1-2 minutes).

## 🐛 Troubleshooting

### Site not loading?
- Wait 2-3 minutes after first push
- Check "Settings > Pages" to see build status
- Try hard refresh (Cmd+Shift+R on Mac)

### Orders not saving?
- Check browser console for errors (F12)
- Make sure localStorage is enabled
- Orders are browser-specific (not synced across devices)

### Changes not appearing?
- Wait 1-2 minutes for rebuild
- Hard refresh browser (Cmd+Shift+R)
- Check GitHub Actions tab for build errors

## 📊 Checking GitHub Build Status

1. Go to your repository
2. Click "Actions" tab
3. See deployment status and logs

## 🚀 Next Steps: Move to Production

When ready for real hosting:

1. **Copy files to Hostinger/Inet:**
   - Use FTP to upload all files to `public_html`
   - Include `submit-order.php` and `process-order.php`
   - Create `orders/` directory (permissions 755)

2. **Enable email notifications:**
   - Uncomment mail code in `submit-order.php`
   - Test email delivery

3. **Add payment processing:**
   - Integrate Stripe, PayPal, or similar
   - Update checkout flow

## 📝 GitHub Pages URL Examples

```
Repository Name: apple-ecommerce
GitHub Username: quangkhong
Pages URL: https://quangkhong.github.io/apple-ecommerce

Repository Name: store
GitHub Username: quangkhong
Pages URL: https://quangkhong.github.io/store
```

## 🔒 Security Notes

- All data stored locally in browser
- No server communication for orders (GitHub Pages limitation)
- Safe for testing/debugging
- Not suitable for real transactions

## 📞 Need Help?

- Check GitHub Actions for build errors
- Verify repository is public
- Confirm `.git` folder exists
- Ensure all files were pushed

---

**Happy testing! 🎉**
