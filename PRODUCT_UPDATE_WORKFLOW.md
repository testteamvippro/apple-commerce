# 📝 Product Update Workflow Guide

Complete guide to updating products in the Apple E-Commerce system.

---

## 🎯 Overview: How Product Updates Work

When a product is updated, it goes through this flow:

```
Admin Updates Product
        ↓
Admin Panel (products.html)
        ↓
JavaScript Handler (product-manager.js)
        ↓
API Endpoint (/api/admin.php)
        ↓
Database (MySQL or JSON)
        ↓
Customers See Updates Instantly
        ↓
Real-time Dashboard Updates
```

---

## 👨‍💼 ADMIN WORKFLOW: How Admins Update Products

### Step 1: Log In to Admin Panel

```
URL: https://yourdomain.com/admin/products.html
Requires: Admin account (role='admin')
```

### Step 2: Find Product to Update

**Method A: Search**
```
Search Box → Type product name/SKU/brand
Example: "iPhone 15" or "IPHONE15PROMAX"
Results filter instantly
```

**Method B: Scroll Table**
```
Products displayed in table format:
- Product name (with SKU)
- Category
- Price (with discount if applicable)
- Stock quantity
- Stock status badge
- Edit/Delete buttons
```

### Step 3: Click Edit Button

```html
<!-- In products table row -->
<button onclick="productManager.openEditModal('prod_iphone15_1')">
  ✏️ Edit
</button>
```

**What happens:**
1. Modal popup opens
2. Form pre-filled with current product data
3. All fields become editable
4. Title changes to "Edit Product"

### Step 4: Update Product Fields

**Basic Fields (Always Visible):**
```
Product Name        → iPhone 15 Pro Max
Category            → Select from dropdown (iPhone, iPad, etc.)
Description         → Detailed product description
Price (₫)          → 29,900,000
Stock Quantity      → 50 units
```

**Advanced Fields (Collapsible Section):**
```
Color Options       → Space Black, Titanium Blue, Titanium Gold
Storage Options     → 256GB, 512GB, 1TB
Specifications      → {
                        "processor": "A17 Pro",
                        "camera": "48MP",
                        "battery": "4000mAh"
                      }
SKU                 → IPHONE15PROMAX (unique identifier)
Brand               → Apple
Rating              → 4.8 (0-5 scale)
# of Reviews        → 2147
Discount %          → 5 (means 5% off)
Image URL           → https://example.com/iphone15.jpg
Warranty (months)   → 12
Availability        → in-stock | low-stock | out-of-stock | pre-order
```

### Step 5: Save Changes

```
Click "Save Product" Button
        ↓
JavaScript validates all required fields
        ↓
Sends PUT request to /api/admin with all data
        ↓
Success: "Product updated" toast notification
        ↓
Modal closes automatically
        ↓
Product table refreshes with new data
```

---

## 💻 TECHNICAL FLOW: How System Processes Updates

### 1. Admin Clicks Edit Button

**JavaScript (product-manager.js):**
```javascript
async openEditModal(productId) {
  const product = this.products.find(p => p.id === productId);
  
  // Pre-fill form with current data
  document.getElementById('product-name').value = product.name;
  document.getElementById('product-category').value = product.category;
  document.getElementById('product-price').value = product.price;
  
  // Parse arrays/JSON for display
  document.getElementById('product-color').value = 
    product.colors?.join(', ') || '';
  document.getElementById('product-specs').value = 
    JSON.stringify(product.specs, null, 2);
  
  // Show modal
  modal.style.display = 'flex';
}
```

### 2. Admin Submits Form

**JavaScript (product-manager.js):**
```javascript
async saveProduct() {
  const productId = document.getElementById('product-id').value;
  
  // Collect form data
  const product = {
    name: document.getElementById('product-name').value,
    category: document.getElementById('product-category').value,
    price: parseFloat(document.getElementById('product-price').value),
    colors: parseColors(), // Parse CSV to array
    storage: parseStorage(),
    specs: parseSpecs(), // Parse JSON string
    // ... all other fields
  };
  
  // Determine if adding or updating
  const method = productId ? 'PUT' : 'POST';
  const body = productId 
    ? { ...product, id: productId, action: 'update-product' }
    : { ...product, action: 'add-product' };
  
  // Send to backend
  const response = await fetch('/api/admin', {
    method: method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  
  const result = await response.json();
  
  if (result.success) {
    showToast('Product updated', 'success');
    this.closeModal();
    await this.loadProducts(); // Refresh table
  }
}
```

### 3. Backend Processes Update

**PHP API (/api/admin.php):**
```php
<?php
$input = json_decode(file_get_contents('php://input'), true);
$action = $input['action'];

if ($action === 'update-product') {
  $product = [
    'id' => $input['id'],
    'name' => $input['name'],
    'category' => $input['category'],
    'price' => $input['price'],
    'colors' => $input['colors'], // Array
    'storage' => $input['storage'], // Array
    'specs' => $input['specs'], // JSON object
    'rating' => $input['rating'],
    'reviews' => $input['reviews'],
    'discount' => $input['discount'],
    'quantity' => $input['quantity'],
    'updatedAt' => date('c')
  ];
  
  // Update database
  if (DataStore::isMySQL()) {
    // MySQL UPDATE
    $stmt = $mysqli->prepare(
      "UPDATE products SET name=?, category=?, price=?, 
       colors=?, storage=?, specs=?, rating=?, reviews=?,
       discount=?, quantity=?, updated_at=NOW()
       WHERE id=?"
    );
    $stmt->bind_param('ssddsssiiis', 
      $product['name'], 
      $product['category'],
      $product['price'],
      json_encode($product['colors']),
      json_encode($product['storage']),
      json_encode($product['specs']),
      $product['rating'],
      $product['reviews'],
      $product['discount'],
      $product['quantity'],
      $product['id']
    );
    $stmt->execute();
  } else {
    // JSON file update
    $products = DataStore::loadJSON('products.json');
    $index = array_search($input['id'], 
      array_column($products, 'id'));
    $products[$index] = $product;
    DataStore::saveJSON('products.json', $products);
  }
  
  respond(true, 'Product updated', $product);
}
?>
```

### 4. Database Stores Updated Data

**MySQL:**
```sql
UPDATE products 
SET name='iPhone 15 Pro Max',
    category='iphone',
    price=29900000,
    colors='["Space Black", "Titanium Blue"]',
    rating=4.8,
    reviews=2147,
    discount=5,
    quantity=50,
    updated_at=NOW()
WHERE id='prod_iphone15_1';
```

**JSON File:**
```json
{
  "id": "prod_iphone15_1",
  "name": "iPhone 15 Pro Max",
  "category": "iphone",
  "price": 29900000,
  "colors": ["Space Black", "Titanium Blue"],
  "storage": ["256GB", "512GB", "1TB"],
  "rating": 4.8,
  "reviews": 2147,
  "discount": 5,
  "quantity": 50,
  "updatedAt": "2026-05-09T14:30:00Z"
}
```

### 5. Admin Panel Refreshes

**JavaScript automatically:**
```javascript
// After successful update
await this.loadProducts(); // Reload from API
this.renderProductsTable(); // Re-render table

// User sees updated data immediately
```

---

## 👥 CUSTOMER VIEW: How Customers See Updates

### 1. Product Listing Page (`/index.html`)

**On Page Load:**
```javascript
async function fetchProducts() {
  const res = await fetch('products.json'); // or API
  const products = await res.json();
  
  // Display products with latest data
  displayProducts(products);
}
```

**What Customer Sees:**
- Product name updated
- Price changed (if discount updated)
- Stock status updated (in-stock/low-stock/out-of-stock)
- New colors/storage options available
- Updated rating/reviews
- New specifications shown

### 2. Product Detail Page (`/product-details.html`)

When customer clicks on a product:
```javascript
// Load product details
const product = products.find(p => p.id === productId);

// Display
document.querySelector('.product-name').textContent = product.name;
document.querySelector('.product-price').textContent = 
  `₫${product.price.toLocaleString()}`;
document.querySelector('.discount').textContent = 
  `${product.discount}% OFF`;

// Show new fields
displayColorOptions(product.colors); // ["Space Black", "Titanium Blue"]
displayStorageOptions(product.storage); // ["256GB", "512GB"]
displaySpecs(product.specs); // {processor: "A17 Pro", ...}
```

### 3. Real-time Updates

**Customers DON'T need to refresh:**
- Updates visible when they add item to cart
- Stock status checked when they checkout
- Latest price applied automatically

---

## 📊 SYSTEM STATUS: Monitor All Updates

### Admin Can Check Updates in Dashboard

**System Status Page: `/admin/system-status.html`**

Shows:
```
Recent Products Table:
  Name              | Category | Price      | Stock | Rating
  iPhone 15 Pro Max | iPhone   | ₫29,900k   | 50    | 4.8★
  
Total Products:     1,234
Last Updated:       2:45 PM Today
Database Type:      MySQL | JSON
```

### Real-time Monitoring

```
Products Dashboard → Shows:
  - Recently updated products
  - Stock changes
  - Price changes
  - Rating/review updates
  - Discount updates
```

---

## 🔄 UPDATE TYPES & EXAMPLES

### Type 1: Simple Price Update

**Before:**
```json
{"id": "1", "name": "iPhone 15", "price": 29900000}
```

**Admin Changes:**
- Price field: 29,900,000 → 28,900,000 (seasonal discount)
- Discount: 0% → 3%

**After:**
```json
{"id": "1", "name": "iPhone 15", "price": 28900000, "discount": 3}
```

**Customer Impact:** Sees lower price immediately

### Type 2: Stock Update

**Before:**
```json
{"id": "1", "quantity": 100, "availability": "in-stock"}
```

**Admin Changes:**
- Stock: 100 → 5 units
- Availability: "in-stock" → "low-stock"

**After:**
```json
{"id": "1", "quantity": 5, "availability": "low-stock"}
```

**Customer Impact:** 
- "Low Stock" badge appears
- Urgent call-to-action shown

### Type 3: Add New Variant

**Before:**
```json
{
  "id": "1",
  "colors": ["Space Black"],
  "storage": ["256GB", "512GB"]
}
```

**Admin Adds:**
- Colors: Add "Titanium Blue", "Titanium Gold"
- Storage: Add "1TB"

**After:**
```json
{
  "id": "1",
  "colors": ["Space Black", "Titanium Blue", "Titanium Gold"],
  "storage": ["256GB", "512GB", "1TB"]
}
```

**Customer Impact:**
- More color/storage options to choose from
- Can select new variant not available before

### Type 4: Update Specifications

**Before:**
```json
{
  "specs": {
    "processor": "A16 Bionic",
    "camera": "48MP",
    "battery": "3582mAh"
  }
}
```

**Admin Updates:**
```json
{
  "specs": {
    "processor": "A17 Pro",
    "camera": "48MP Main + 12MP Ultra Wide",
    "battery": "4000mAh",
    "display": "6.7\" Super Retina XDR"
  }
}
```

**Customer Impact:**
- Sees complete updated specifications
- Can compare with other models
- Makes better purchase decision

---

## ⚡ UPDATE FREQUENCY & BEST PRACTICES

### Recommended Update Schedule

```
Real-time (Urgent):
  - Stock running low/out
  - Price errors
  - Availability changes
  
Daily:
  - Rating/reviews updates
  - Discount changes
  - Seasonal updates
  
Weekly:
  - Product description improvements
  - Image/spec refinements
  - Category reorganization
  
Monthly:
  - New variant additions
  - Bulk spec updates
  - Warranty/warranty updates
```

### Best Practices

✅ **DO:**
- Update stock immediately when inventory changes
- Correct prices/discounts before they go live
- Add specs/ratings regularly
- Test changes before publishing
- Backup before major updates
- Monitor customer feedback on products

❌ **DON'T:**
- Leave low stock/out of stock products without updating
- Publish incomplete product information
- Mix up product IDs during bulk updates
- Make typos in product names
- Forget to save/submit changes
- Delete products without backup

---

## 🔐 Update Security & Permissions

### Who Can Update?

```
Role         | Permissions
=============|============
Admin        | ✅ Create, Read, Update, Delete
Manager      | ✅ Update (with approval)
Customer     | ✗ Read only
Guest        | ✗ Read only (limited)
```

### Admin Verification

```javascript
// Every admin action is verified
if (!auth.isAdmin()) {
  window.location.href = '/login.html';
  return;
}

// Action logged for audit trail
audit_log.add({
  admin_id: user.id,
  action: 'update_product',
  entity_id: product.id,
  old_value: old_product,
  new_value: new_product,
  timestamp: new Date()
});
```

---

## 📱 Mobile Admin: Update on Phone

Yes! Admin can update products from phone:

1. Log in to: `https://yourdomain.com/admin/products.html`
2. On mobile, table becomes card-based view
3. Click Edit on any product
4. Fill form (responsive design)
5. Click Save
6. Changes sync immediately

---

## 🚀 Bulk Update (Future Feature)

Currently: One product at a time

Future: Bulk update multiple products
```
Select Products → Edit All → Changes apply to all
Example: Update all iPhone prices at once
```

---

## 📞 Troubleshooting Updates

### Issue: Update button not working

**Solution:**
1. Check login (admin required)
2. Verify internet connection
3. Check browser console for errors
4. Clear browser cache
5. Try different browser

### Issue: Changes not saved

**Solution:**
1. Check for validation errors (highlighted in form)
2. Ensure all required fields filled
3. Wait for "success" notification
4. Refresh page to verify

### Issue: Customers don't see updates

**Solution:**
1. Check if update was saved (check admin table)
2. Customer browser may have cached old data
   - Clear browser cache (Cmd+Shift+Delete)
   - Hard refresh page (Cmd+Shift+R)
3. Check if product ID matches
4. Verify database connection type

---

## 📋 Update Checklist

When updating a product:

- [ ] Open admin panel (logged in as admin)
- [ ] Search/find product to update
- [ ] Click Edit button
- [ ] Update required fields
- [ ] Update optional fields (advanced section)
- [ ] Review changes
- [ ] Click Save Product
- [ ] See success notification
- [ ] Verify changes in table
- [ ] Test on customer view

---

**Next Steps:**

1. **Try updating a product** - Use admin panel
2. **Monitor dashboard** - Check System Status page
3. **Verify customer view** - See updates on homepage
4. **Practice bulk** - Update multiple products
5. **Setup alerts** - Notify when stock runs low

Ready to update? Log in to your admin panel! 🚀
