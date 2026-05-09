<?php
/**
 * Database Configuration & Connection
 * Supports both JSON (file-based) and MySQL
 */

error_reporting(E_ALL);
ini_set('display_errors', 0);

// ============================================
// DATABASE TYPE SELECTION
// ============================================

// Set to 'mysql' for production, 'json' for development
define('DB_TYPE', getenv('DB_TYPE') ?: 'json');

// ============================================
// MYSQL CONFIGURATION
// ============================================

if (DB_TYPE === 'mysql') {
  define('DB_HOST', getenv('DB_HOST') ?: 'localhost');
  define('DB_USER', getenv('DB_USER') ?: 'apple_user');
  define('DB_PASS', getenv('DB_PASS') ?: '');
  define('DB_NAME', getenv('DB_NAME') ?: 'apple_store_prod');
  define('DB_PORT', getenv('DB_PORT') ?: 3306);

  // Create global connection
  global $mysqli;
  $mysqli = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME, DB_PORT);

  if ($mysqli->connect_error) {
    die(json_encode([
      'success' => false,
      'message' => 'Database connection failed: ' . $mysqli->connect_error,
      'dbType' => 'mysql'
    ]));
  }

  $mysqli->set_charset("utf8mb4");
}

// ============================================
// DATA ACCESS LAYER
// ============================================

class DataStore {
  public static function getType() {
    return DB_TYPE;
  }

  public static function isMySQL() {
    return DB_TYPE === 'mysql';
  }

  public static function isJSON() {
    return DB_TYPE === 'json';
  }

  // -------- JSON Methods --------

  public static function loadJSON($filename) {
    $filepath = __DIR__ . '/../data/' . $filename;
    if (!file_exists($filepath)) {
      return [];
    }
    $data = file_get_contents($filepath);
    return json_decode($data, true) ?: [];
  }

  public static function saveJSON($filename, $data) {
    $filepath = __DIR__ . '/../data/' . $filename;
    $dir = dirname($filepath);
    
    if (!is_dir($dir)) {
      mkdir($dir, 0755, true);
    }
    
    // Lock file for concurrent writes
    $handle = fopen($filepath . '.lock', 'w');
    if (flock($handle, LOCK_EX)) {
      file_put_contents($filepath, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
      flock($handle, LOCK_UN);
    }
    fclose($handle);
    
    return true;
  }

  // -------- MySQL Methods --------

  public static function query($sql) {
    global $mysqli;
    return $mysqli->query($sql);
  }

  public static function prepare($sql) {
    global $mysqli;
    return $mysqli->prepare($sql);
  }

  public static function escape($string) {
    global $mysqli;
    return $mysqli->real_escape_string($string);
  }

  public static function lastInsertId() {
    global $mysqli;
    return $mysqli->insert_id;
  }

  public static function affectedRows() {
    global $mysqli;
    return $mysqli->affected_rows;
  }

  public static function error() {
    global $mysqli;
    return $mysqli->error;
  }

  // -------- Generic Methods --------

  public static function getProducts() {
    if (self::isJSON()) {
      return self::loadJSON('products.json');
    } else {
      $result = self::query("SELECT * FROM products");
      $products = [];
      while ($row = $result->fetch_assoc()) {
        $row['colors'] = json_decode($row['colors'], true) ?? [];
        $row['storage'] = json_decode($row['storage'], true) ?? [];
        $row['specs'] = json_decode($row['specs'], true) ?? [];
        $products[] = $row;
      }
      return $products;
    }
  }

  public static function getOrders() {
    if (self::isJSON()) {
      return self::loadJSON('orders.json');
    } else {
      $result = self::query("SELECT * FROM orders");
      $orders = [];
      while ($row = $result->fetch_assoc()) {
        $row['items'] = json_decode($row['items'], true) ?? [];
        $orders[] = $row;
      }
      return $orders;
    }
  }

  public static function getUsers() {
    if (self::isJSON()) {
      return self::loadJSON('users.json');
    } else {
      $result = self::query("SELECT id, email, name, role, phone, created_at FROM users");
      $users = [];
      while ($row = $result->fetch_assoc()) {
        $users[] = $row;
      }
      return $users;
    }
  }

  public static function getStats() {
    if (self::isJSON()) {
      $products = self::loadJSON('products.json');
      $orders = self::loadJSON('orders.json');
      $users = self::loadJSON('users.json');

      return [
        'totalProducts' => count($products),
        'totalOrders' => count($orders),
        'totalUsers' => count($users),
        'totalRevenue' => array_sum(array_column($orders, 'total')),
        'avgOrderValue' => count($orders) > 0 ? array_sum(array_column($orders, 'total')) / count($orders) : 0,
        'lowStockProducts' => count(array_filter($products, fn($p) => $p['quantity'] < 10)),
        'dataSize' => round((filesize(__DIR__ . '/../data/products.json') +
                             filesize(__DIR__ . '/../data/orders.json') +
                             filesize(__DIR__ . '/../data/users.json')) / 1024, 2) . ' KB'
      ];
    } else {
      $stats = [];

      $result = self::query("SELECT COUNT(*) as count FROM products");
      $stats['totalProducts'] = $result->fetch_assoc()['count'] ?? 0;

      $result = self::query("SELECT COUNT(*) as count FROM orders");
      $stats['totalOrders'] = $result->fetch_assoc()['count'] ?? 0;

      $result = self::query("SELECT COUNT(*) as count FROM users");
      $stats['totalUsers'] = $result->fetch_assoc()['count'] ?? 0;

      $result = self::query("SELECT SUM(total) as total FROM orders");
      $stats['totalRevenue'] = $result->fetch_assoc()['total'] ?? 0;

      $result = self::query("SELECT AVG(total) as avg FROM orders");
      $stats['avgOrderValue'] = $result->fetch_assoc()['avg'] ?? 0;

      $result = self::query("SELECT COUNT(*) as count FROM products WHERE quantity < 10");
      $stats['lowStockProducts'] = $result->fetch_assoc()['count'] ?? 0;

      $result = self::query("SELECT SUM(data_length + index_length) as size FROM information_schema.TABLES WHERE table_schema = ?");
      $stmt = self::prepare($result->query("SELECT SUM(data_length + index_length) as size FROM information_schema.TABLES WHERE table_schema = DATABASE()"));
      $result = self::query("SELECT SUM(data_length + index_length) as size FROM information_schema.TABLES WHERE table_schema = DATABASE()");
      $stats['dataSize'] = round(($result->fetch_assoc()['size'] ?? 0) / 1024, 2) . ' KB';

      return $stats;
    }
  }
}

// ============================================
// RESPONSE HELPER
// ============================================

function respond($success, $message, $data = null) {
  header('Content-Type: application/json; charset=utf-8');
  header('Access-Control-Allow-Origin: *');
  header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
  header('Access-Control-Allow-Headers: Content-Type, Authorization');

  echo json_encode([
    'success' => $success,
    'message' => $message,
    'data' => $data,
    'dbType' => DB_TYPE,
    'timestamp' => date('c')
  ]);

  exit;
}

?>
