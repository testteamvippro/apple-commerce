# MySQL Database Setup

Complete guide to migrate from JSON to MySQL for production.

---

## 📊 MySQL Schema

### Products Table
```sql
CREATE TABLE products (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description LONGTEXT,
  category VARCHAR(100),
  price DECIMAL(10,2) NOT NULL,
  quantity INT DEFAULT 0,
  sku VARCHAR(100) UNIQUE,
  brand VARCHAR(100),
  rating DECIMAL(3,2),
  reviews INT DEFAULT 0,
  discount INT DEFAULT 0,
  image VARCHAR(500),
  warranty INT,
  availability VARCHAR(50) DEFAULT 'in-stock',
  colors JSON,
  storage JSON,
  specs JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_category (category),
  INDEX idx_brand (brand),
  FULLTEXT INDEX ft_search (name, description)
);
```

### Orders Table
```sql
CREATE TABLE orders (
  id VARCHAR(50) PRIMARY KEY,
  user_id VARCHAR(50),
  items JSON NOT NULL,
  subtotal DECIMAL(10,2),
  shipping DECIMAL(10,2),
  tax DECIMAL(10,2),
  total DECIMAL(10,2) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  payment_method VARCHAR(50),
  tracking VARCHAR(100),
  carrier VARCHAR(100),
  estimated_delivery DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user (user_id),
  INDEX idx_status (status),
  INDEX idx_created (created_at)
);
```

### Users Table
```sql
CREATE TABLE users (
  id VARCHAR(50) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  phone VARCHAR(20),
  role VARCHAR(50) DEFAULT 'customer',
  addresses JSON,
  preferences JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_role (role)
);
```

### Notifications Table
```sql
CREATE TABLE notifications (
  id VARCHAR(50) PRIMARY KEY,
  user_id VARCHAR(50),
  title VARCHAR(255),
  message LONGTEXT,
  type VARCHAR(50),
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user (user_id),
  INDEX idx_read (read)
);
```

### Reviews Table
```sql
CREATE TABLE reviews (
  id VARCHAR(50) PRIMARY KEY,
  product_id VARCHAR(50),
  user_id VARCHAR(50),
  rating INT,
  title VARCHAR(255),
  comment LONGTEXT,
  helpful INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_product (product_id),
  INDEX idx_user (user_id)
);
```

### Wishlist Table
```sql
CREATE TABLE wishlist (
  id VARCHAR(50) PRIMARY KEY,
  user_id VARCHAR(50),
  product_id VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_wishlist (user_id, product_id),
  INDEX idx_user (user_id)
);
```

---

## 🔧 Setup Steps on Hostinger

### 1. Create Database in cPanel

```
1. Log in: https://yourdomain.com:2083
2. Search: "MySQL Databases"
3. Create New Database:
   - Database Name: apple_store_prod
   - Click "Create Database"
4. Create New User:
   - Username: apple_user
   - Password: [strong password]
   - Click "Create User"
5. Add User to Database:
   - Select user: apple_user
   - Select database: apple_store_prod
   - Privileges: ALL PRIVILEGES
   - Click "Add"
```

### 2. Get Connection Details

From cPanel "MySQL Databases":
```
Host: localhost (or your_host_name if remote)
Username: apple_user
Password: [your password]
Database: apple_store_prod
Port: 3306
```

### 3. Import Schema

Use phpMyAdmin in cPanel:

```
1. cPanel → phpMyAdmin
2. Select database: apple_store_prod
3. Import → Choose File (schema.sql)
4. Execute
```

Or use command line:
```bash
mysql -h localhost -u apple_user -p apple_store_prod < schema.sql
```

---

## 📤 Migrate Data from JSON to MySQL

### Migration Script (`migrate-to-mysql.php`)

```php
<?php
// migrate-to-mysql.php
// Run once: php migrate-to-mysql.php

$mysqli = new mysqli(
  'localhost',
  'apple_user',
  'your_password',
  'apple_store_prod'
);

if ($mysqli->connect_error) {
  die('Connection failed: ' . $mysqli->connect_error);
}

function migrateProducts($mysqli) {
  $products = json_decode(file_get_contents('data/products.json'), true);
  
  foreach ($products as $product) {
    $stmt = $mysqli->prepare(
      "INSERT INTO products (id, name, description, category, price, quantity, 
       sku, brand, rating, reviews, discount, image, warranty, availability, 
       colors, storage, specs) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    );
    
    $id = 'prod_' . uniqid();
    $colors = json_encode($product['colors'] ?? []);
    $storage = json_encode($product['storage'] ?? []);
    $specs = json_encode($product['specs'] ?? []);
    
    $stmt->bind_param(
      'ssssidssiddsssss',
      $id,
      $product['name'],
      $product['description'] ?? '',
      $product['category'],
      $product['price'],
      $product['quantity'],
      $product['sku'] ?? '',
      $product['brand'] ?? 'Apple',
      $product['rating'] ?? 0,
      $product['reviews'] ?? 0,
      $product['discount'] ?? 0,
      $product['image'] ?? '',
      $product['warranty'] ?? 12,
      $product['availability'] ?? 'in-stock',
      $colors,
      $storage,
      $specs
    );
    
    $stmt->execute();
  }
  echo "✓ Products migrated\n";
}

function migrateOrders($mysqli) {
  $orders = json_decode(file_get_contents('data/orders.json'), true);
  
  foreach ($orders as $order) {
    $stmt = $mysqli->prepare(
      "INSERT INTO orders (id, user_id, items, subtotal, shipping, tax, total, 
       status, payment_method, tracking, carrier, estimated_delivery) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    );
    
    $items = json_encode($order['items']);
    $stmt->bind_param(
      'sssdddsssss',
      $order['id'],
      $order['userId'],
      $items,
      $order['subtotal'],
      $order['shipping'],
      $order['tax'],
      $order['total'],
      $order['status'],
      $order['payment'],
      $order['tracking'] ?? '',
      $order['carrier'] ?? '',
      $order['estimatedDelivery'] ?? null
    );
    
    $stmt->execute();
  }
  echo "✓ Orders migrated\n";
}

function migrateUsers($mysqli) {
  $users = json_decode(file_get_contents('data/users.json'), true);
  
  foreach ($users as $user) {
    $stmt = $mysqli->prepare(
      "INSERT INTO users (id, email, password, name, phone, role, addresses, preferences) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    );
    
    $addresses = json_encode($user['addresses'] ?? []);
    $preferences = json_encode($user['preferences'] ?? []);
    
    $stmt->bind_param(
      'sssssss',
      $user['id'],
      $user['email'],
      $user['password'],
      $user['name'],
      $user['phone'],
      $user['role'] ?? 'customer',
      $addresses,
      $preferences
    );
    
    $stmt->execute();
  }
  echo "✓ Users migrated\n";
}

// Run migrations
migrateProducts($mysqli);
migrateOrders($mysqli);
migrateUsers($mysqli);

echo "\n✅ Migration complete!\n";
$mysqli->close();
?>
```

---

## 🔄 Update APIs to Use MySQL

Update `api/config.php`:

```php
<?php
// api/config.php

// MySQL Connection
$db_host = 'localhost';
$db_user = 'apple_user';
$db_pass = 'your_password';
$db_name = 'apple_store_prod';

$mysqli = new mysqli($db_host, $db_user, $db_pass, $db_name);

if ($mysqli->connect_error) {
  die(json_encode(['success' => false, 'message' => 'Database connection failed']));
}

$mysqli->set_charset("utf8mb4");

function respond($success, $message, $data = null) {
  header('Content-Type: application/json');
  echo json_encode(['success' => $success, 'message' => $message, 'data' => $data]);
  exit;
}
?>
```

---

## 💾 Backup Automation

### Backup Script (`backup.php`)

```php
<?php
// backup.php - Run daily via cron

$db_host = 'localhost';
$db_user = 'apple_user';
$db_pass = 'your_password';
$db_name = 'apple_store_prod';

$backup_dir = 'backups/';
if (!is_dir($backup_dir)) {
  mkdir($backup_dir, 0755, true);
}

$backup_file = $backup_dir . 'backup_' . date('Y-m-d_H-i-s') . '.sql';

$command = "mysqldump -h $db_host -u $db_user -p$db_pass $db_name > $backup_file";
exec($command, $output, $return);

if ($return === 0) {
  // Compress
  exec("gzip $backup_file");
  
  // Keep only last 30 days
  $files = glob($backup_dir . '*.sql.gz');
  $now = time();
  foreach ($files as $file) {
    if ($now - filemtime($file) > 30 * 86400) {
      unlink($file);
    }
  }
  
  echo "✅ Backup created: " . $backup_file . ".gz";
} else {
  echo "❌ Backup failed";
}
?>
```

### Setup Cron Job in cPanel

```
1. cPanel → Cron Jobs
2. Add New Cron Job:
   - Common Settings: Daily
   - Command: /usr/bin/php /home/user/public_html/backup.php
   - Click Add Cron Job
```

---

## ✅ Verification

After setup:

```bash
# Test connection
mysql -h localhost -u apple_user -p apple_store_prod -e "SHOW TABLES;"

# Should show:
# +-------------------------+
# | Tables_in_apple_store_prod |
# +-------------------------+
# | orders                  |
# | products                |
# | users                   |
# | notifications           |
# | reviews                 |
# | wishlist                |
# +-------------------------+
```

---

## 🚀 Performance Tips

```sql
-- Add indexes for common queries
CREATE INDEX idx_price ON products(price);
CREATE INDEX idx_stock ON products(quantity);
CREATE FULLTEXT INDEX ft_name ON products(name);

-- Optimize tables
OPTIMIZE TABLE products, orders, users;

-- Check table sizes
SELECT table_name, ROUND(((data_length + index_length) / 1024 / 1024), 2) AS size_mb
FROM information_schema.TABLES 
WHERE table_schema = 'apple_store_prod';
```

---

**Ready to migrate? Let me know!** 🚀
