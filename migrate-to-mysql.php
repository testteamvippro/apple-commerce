<?php
/**
 * Migrate from JSON to MySQL Database
 * Usage: php migrate-to-mysql.php
 * 
 * IMPORTANT: Update database credentials before running!
 */

// ============================================
// CONFIGURE DATABASE CREDENTIALS
// ============================================
$db_host = 'localhost';
$db_user = 'apple_user';
$db_pass = 'your_password';  // CHANGE THIS
$db_name = 'apple_store_prod';

// ============================================
// CONNECTION
// ============================================
$mysqli = new mysqli($db_host, $db_user, $db_pass, $db_name);

if ($mysqli->connect_error) {
  die("❌ Connection failed: " . $mysqli->connect_error . "\n");
}

$mysqli->set_charset("utf8mb4");
echo "✓ Connected to MySQL\n\n";

// ============================================
// HELPER FUNCTIONS
// ============================================

function loadJSON($filename) {
  if (!file_exists($filename)) {
    return [];
  }
  return json_decode(file_get_contents($filename), true) ?? [];
}

function generateId($prefix = 'id') {
  return $prefix . '_' . bin2hex(random_bytes(8));
}

// ============================================
// MIGRATION: PRODUCTS
// ============================================

function migrateProducts($mysqli) {
  echo "Migrating products...\n";
  
  $products = loadJSON('data/products.json');
  if (empty($products)) {
    echo "  ℹ️  No products to migrate\n";
    return;
  }
  
  $count = 0;
  foreach ($products as $product) {
    $stmt = $mysqli->prepare(
      "INSERT INTO products (
        id, name, description, category, price, quantity, sku, brand, 
        rating, reviews, discount, image, warranty, availability, 
        colors, storage, specs, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    );
    
    if (!$stmt) {
      echo "  ❌ Prepare failed: " . $mysqli->error . "\n";
      continue;
    }
    
    $id = $product['id'] ?? generateId('prod');
    $colors = json_encode($product['colors'] ?? []);
    $storage = json_encode($product['storage'] ?? []);
    $specs = json_encode($product['specs'] ?? []);
    $createdAt = $product['createdAt'] ?? date('c');
    
    $stmt->bind_param(
      'ssssidssiddsssssss',
      $id,
      $product['name'] ?? 'Unknown',
      $product['description'] ?? '',
      $product['category'] ?? '',
      $product['price'] ?? 0,
      $product['quantity'] ?? 0,
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
      $specs,
      $createdAt
    );
    
    if ($stmt->execute()) {
      $count++;
    } else {
      echo "  ⚠️  Failed to insert: " . $product['name'] . "\n";
    }
    $stmt->close();
  }
  
  echo "  ✓ Migrated $count products\n\n";
}

// ============================================
// MIGRATION: ORDERS
// ============================================

function migrateOrders($mysqli) {
  echo "Migrating orders...\n";
  
  $orders = loadJSON('data/orders.json');
  if (empty($orders)) {
    echo "  ℹ️  No orders to migrate\n";
    return;
  }
  
  $count = 0;
  foreach ($orders as $order) {
    $stmt = $mysqli->prepare(
      "INSERT INTO orders (
        id, user_id, items, subtotal, shipping, tax, total, status, 
        payment_method, tracking, carrier, estimated_delivery, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    );
    
    if (!$stmt) {
      echo "  ❌ Prepare failed: " . $mysqli->error . "\n";
      continue;
    }
    
    $items = json_encode($order['items'] ?? []);
    $tracking = $order['tracking'] ?? '';
    $carrier = $order['carrier'] ?? '';
    $estimatedDelivery = $order['estimatedDelivery'] ?? null;
    $createdAt = $order['createdAt'] ?? date('c');
    
    $stmt->bind_param(
      'sssdddssssss',
      $order['id'],
      $order['userId'] ?? '',
      $items,
      $order['subtotal'] ?? 0,
      $order['shipping'] ?? 0,
      $order['tax'] ?? 0,
      $order['total'] ?? 0,
      $order['status'] ?? 'pending',
      $order['payment'] ?? 'cod',
      $tracking,
      $carrier,
      $estimatedDelivery,
      $createdAt
    );
    
    if ($stmt->execute()) {
      $count++;
    } else {
      echo "  ⚠️  Failed to insert order: " . $order['id'] . "\n";
    }
    $stmt->close();
  }
  
  echo "  ✓ Migrated $count orders\n\n";
}

// ============================================
// MIGRATION: USERS
// ============================================

function migrateUsers($mysqli) {
  echo "Migrating users...\n";
  
  $users = loadJSON('data/users.json');
  if (empty($users)) {
    echo "  ℹ️  No users to migrate\n";
    return;
  }
  
  $count = 0;
  foreach ($users as $user) {
    $stmt = $mysqli->prepare(
      "INSERT INTO users (
        id, email, password, name, phone, role, addresses, preferences, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    );
    
    if (!$stmt) {
      echo "  ❌ Prepare failed: " . $mysqli->error . "\n";
      continue;
    }
    
    $addresses = json_encode($user['addresses'] ?? []);
    $preferences = json_encode($user['preferences'] ?? []);
    $createdAt = $user['createdAt'] ?? date('c');
    
    $stmt->bind_param(
      'sssssssss',
      $user['id'],
      $user['email'] ?? '',
      $user['password'] ?? '',
      $user['name'] ?? '',
      $user['phone'] ?? '',
      $user['role'] ?? 'customer',
      $addresses,
      $preferences,
      $createdAt
    );
    
    if ($stmt->execute()) {
      $count++;
    } else {
      echo "  ⚠️  Failed to insert user: " . $user['email'] . "\n";
    }
    $stmt->close();
  }
  
  echo "  ✓ Migrated $count users\n\n";
}

// ============================================
// MIGRATION: NOTIFICATIONS
// ============================================

function migrateNotifications($mysqli) {
  echo "Migrating notifications...\n";
  
  $notifications = loadJSON('data/notifications.json');
  if (empty($notifications)) {
    echo "  ℹ️  No notifications to migrate\n";
    return;
  }
  
  $count = 0;
  foreach ($notifications as $notif) {
    $stmt = $mysqli->prepare(
      "INSERT INTO notifications (
        id, user_id, title, message, type, read, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)"
    );
    
    if (!$stmt) {
      echo "  ❌ Prepare failed: " . $mysqli->error . "\n";
      continue;
    }
    
    $read = $notif['read'] ? 1 : 0;
    $createdAt = $notif['createdAt'] ?? date('c');
    
    $stmt->bind_param(
      'sssssss',
      $notif['id'],
      $notif['userId'] ?? '',
      $notif['title'] ?? '',
      $notif['message'] ?? '',
      $notif['type'] ?? 'info',
      $read,
      $createdAt
    );
    
    if ($stmt->execute()) {
      $count++;
    } else {
      echo "  ⚠️  Failed to insert notification\n";
    }
    $stmt->close();
  }
  
  echo "  ✓ Migrated $count notifications\n\n";
}

// ============================================
// RUN ALL MIGRATIONS
// ============================================

echo "╔════════════════════════════════════════╗\n";
echo "║    JSON to MySQL Migration Tool        ║\n";
echo "║    Apple E-Commerce Platform           ║\n";
echo "╚════════════════════════════════════════╝\n\n";

migrateProducts($mysqli);
migrateOrders($mysqli);
migrateUsers($mysqli);
migrateNotifications($mysqli);

// ============================================
// VERIFICATION
// ============================================

echo "Verifying migration...\n";

$tables = ['products', 'orders', 'users', 'notifications'];
foreach ($tables as $table) {
  $result = $mysqli->query("SELECT COUNT(*) as count FROM $table");
  $row = $result->fetch_assoc();
  echo "  $table: {$row['count']} records\n";
}

echo "\n✅ Migration complete!\n";
echo "📝 Next steps:\n";
echo "  1. Update api/config.php with database credentials\n";
echo "  2. Update all api/*.php files to use MySQL\n";
echo "  3. Test all functionality on staging\n";
echo "  4. Deploy to production\n";

$mysqli->close();
?>
