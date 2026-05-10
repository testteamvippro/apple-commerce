<?php
/**
 * Database connection — MySQL / phpMyAdmin
 *
 * To configure for your local phpMyAdmin setup, set the values below
 * OR export environment variables before starting PHP:
 *
 *   export DB_HOST=localhost    # or 127.0.0.1
 *   export DB_USER=root         # phpMyAdmin user
 *   export DB_PASS=secret       # phpMyAdmin password
 *   export DB_NAME=apple_store_prod
 *   export DB_PORT=3306
 *
 * Then import schema.sql via phpMyAdmin: Databases → Import → schema.sql
 */

error_reporting(E_ALL);
ini_set('display_errors', '0');

define('DB_HOST', getenv('DB_HOST') ?: 'localhost');
define('DB_USER', getenv('DB_USER') ?: 'root');
define('DB_PASS', getenv('DB_PASS') ?: '');
define('DB_NAME', getenv('DB_NAME') ?: 'apple_store_prod');
define('DB_PORT', (int) (getenv('DB_PORT') ?: 3306));

final class DataStore {
  private static ?mysqli $connection = null;

  public static function db(): mysqli {
    if (self::$connection instanceof mysqli) {
      return self::$connection;
    }

    mysqli_report(MYSQLI_REPORT_OFF);
    self::$connection = @new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME, DB_PORT);
    if (self::$connection->connect_error) {
      throw new RuntimeException('MySQL connection failed: ' . self::$connection->connect_error);
    }

    self::$connection->set_charset('utf8mb4');
    return self::$connection;
  }

  private static function bindParams(mysqli_stmt $stmt, string $types, array $params): void {
    if ($types === '' || $params === []) {
      return;
    }

    $refs = [];
    foreach ($params as $i => $_) {
      $refs[$i] = &$params[$i];
    }
    $stmt->bind_param($types, ...$refs);
  }

  private static function execute(string $sql, string $types = '', array $params = []): mysqli_stmt {
    $stmt = self::db()->prepare($sql);
    if (!$stmt) {
      throw new RuntimeException('Prepare failed: ' . self::db()->error);
    }

    self::bindParams($stmt, $types, $params);

    if (!$stmt->execute()) {
      $error = $stmt->error ?: self::db()->error;
      $stmt->close();
      throw new RuntimeException('Query failed: ' . $error);
    }

    return $stmt;
  }

  private static function fetchAll(string $sql, string $types = '', array $params = []): array {
    $stmt = self::execute($sql, $types, $params);
    $result = $stmt->get_result();
    $rows = $result ? $result->fetch_all(MYSQLI_ASSOC) : [];
    $stmt->close();
    return $rows;
  }

  private static function fetchOne(string $sql, string $types = '', array $params = []): ?array {
    $rows = self::fetchAll($sql, $types, $params);
    return $rows[0] ?? null;
  }

  private static function scalar(string $sql, string $types = '', array $params = [], mixed $default = null): mixed {
    $row = self::fetchOne($sql, $types, $params);
    if (!$row) {
      return $default;
    }

    $values = array_values($row);
    return $values[0] ?? $default;
  }

  public static function jsonEncode(mixed $value): string {
    return json_encode($value ?? [], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  }

  public static function jsonDecode(?string $value, mixed $fallback = []): mixed {
    if ($value === null || $value === '') {
      return $fallback;
    }

    $decoded = json_decode($value, true);
    return $decoded ?? $fallback;
  }

  private static function toDatabaseDateTime(?string $value, ?string $fallback = null): ?string {
    $source = $value ?: $fallback;
    if ($source === null || $source === '') {
      return null;
    }

    $timestamp = strtotime($source);
    if ($timestamp === false) {
      return null;
    }

    return date('Y-m-d H:i:s', $timestamp);
  }

  private static function fromDatabaseDateTime(?string $value): ?string {
    if ($value === null || $value === '') {
      return null;
    }

    $timestamp = strtotime($value);
    return $timestamp === false ? $value : date('c', $timestamp);
  }

  private static function mapProduct(array $row): array {
    return [
      'id' => $row['id'],
      'name' => $row['name'] ?? '',
      'description' => $row['description'] ?? '',
      'category' => $row['category'] ?? '',
      'brand' => $row['brand'] ?? 'Apple',
      'sku' => $row['sku'] ?? null,
      'price' => (float) ($row['price'] ?? 0),
      'discount' => (int) ($row['discount'] ?? 0),
      'quantity' => (int) ($row['quantity'] ?? 0),
      'stock' => (int) ($row['quantity'] ?? 0),
      'availability' => $row['availability'] ?? 'in-stock',
      'colors' => self::jsonDecode($row['colors'] ?? null, []),
      'storage' => self::jsonDecode($row['storage'] ?? null, []),
      'specs' => self::jsonDecode($row['specs'] ?? null, []),
      'image' => $row['image'] ?? '',
      'gallery' => self::jsonDecode($row['gallery'] ?? null, []),
      'variants' => self::jsonDecode($row['variants'] ?? null, []),
      'condition' => $row['condition'] ?? 'New',
      'badge' => $row['badge'] ?? '',
      'rating' => (float) ($row['rating'] ?? 0),
      'reviews' => (int) ($row['reviews'] ?? 0),
      'warranty' => (int) ($row['warranty'] ?? 12),
      'createdAt' => self::fromDatabaseDateTime($row['created_at'] ?? null),
      'updatedAt' => self::fromDatabaseDateTime($row['updated_at'] ?? null),
    ];
  }

  private static function mapUser(array $row, bool $includePassword = false): array {
    $user = [
      'id' => $row['id'],
      'name' => $row['name'] ?? '',
      'email' => $row['email'] ?? '',
      'phone' => $row['phone'] ?? '',
      'role' => $row['role'] ?? 'customer',
      'addresses' => self::jsonDecode($row['addresses'] ?? null, []),
      'preferences' => self::jsonDecode($row['preferences'] ?? null, []),
      'birthDate' => $row['birth_date'] ?? null,
      'createdAt' => self::fromDatabaseDateTime($row['created_at'] ?? null),
      'updatedAt' => self::fromDatabaseDateTime($row['updated_at'] ?? null),
    ];

    if ($includePassword) {
      $user['password'] = $row['password'] ?? '';
    }

    return $user;
  }

  private static function mapOrder(array $row): array {
    return [
      'id' => $row['id'],
      'userId' => $row['user_id'] ?? null,
      'customer' => self::jsonDecode($row['customer'] ?? null, []),
      'items' => self::jsonDecode($row['items'] ?? null, []),
      'subtotal' => (float) ($row['subtotal'] ?? 0),
      'shipping' => (float) ($row['shipping'] ?? 0),
      'tax' => (float) ($row['tax'] ?? 0),
      'total' => (float) ($row['total'] ?? 0),
      'payment' => $row['payment_method'] ?? 'cod',
      'status' => $row['status'] ?? 'pending',
      'tracking' => $row['tracking'] ?? '',
      'carrier' => $row['carrier'] ?? '',
      'estimatedDelivery' => self::fromDatabaseDateTime($row['estimated_delivery'] ?? null),
      'stockReserved' => (bool) ($row['stock_reserved'] ?? false),
      'cancellationReason' => $row['cancellation_reason'] ?? null,
      'customerUpdateMessage' => $row['customer_update_message'] ?? null,
      'processingDate' => self::fromDatabaseDateTime($row['processing_date'] ?? null),
      'shippedDate' => self::fromDatabaseDateTime($row['shipped_date'] ?? null),
      'deliveredDate' => self::fromDatabaseDateTime($row['delivered_date'] ?? null),
      'cancelledAt' => self::fromDatabaseDateTime($row['cancelled_at'] ?? null),
      'stockReservedAt' => self::fromDatabaseDateTime($row['stock_reserved_at'] ?? null),
      'stockReleasedAt' => self::fromDatabaseDateTime($row['stock_released_at'] ?? null),
      'createdAt' => self::fromDatabaseDateTime($row['created_at'] ?? null),
      'updatedAt' => self::fromDatabaseDateTime($row['updated_at'] ?? null),
    ];
  }

  private static function mapNotification(array $row): array {
    return [
      'id' => $row['id'],
      'userId' => $row['user_id'] ?? null,
      'title' => $row['title'] ?? 'Notification',
      'message' => $row['message'] ?? '',
      'type' => $row['type'] ?? 'info',
      'read' => (bool) ($row['is_read'] ?? false),
      'createdAt' => self::fromDatabaseDateTime($row['created_at'] ?? null),
      'updatedAt' => self::fromDatabaseDateTime($row['updated_at'] ?? null),
    ];
  }

  public static function getProducts(): array {
    return array_map([self::class, 'mapProduct'], self::fetchAll('SELECT * FROM products ORDER BY name ASC'));
  }

  public static function findProductById(string $id): ?array {
    $row = self::fetchOne('SELECT * FROM products WHERE id = ?', 's', [$id]);
    return $row ? self::mapProduct($row) : null;
  }

  public static function saveProduct(array $product): array {
    $id = (string) ($product['id'] ?? uniqid());
    $quantity = max(0, (int) ($product['quantity'] ?? $product['stock'] ?? 0));
    $availability = $product['availability'] ?? ($quantity <= 0 ? 'out-of-stock' : ($quantity < 5 ? 'low-stock' : 'in-stock'));

    self::execute(
      'INSERT INTO products (
        id, name, description, category, brand, sku, price, discount, quantity,
        availability, colors, storage, specs, image, rating, reviews, warranty,
        `condition`, badge, gallery, variants
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        name = VALUES(name), description = VALUES(description), category = VALUES(category),
        brand = VALUES(brand), sku = VALUES(sku), price = VALUES(price), discount = VALUES(discount),
        quantity = VALUES(quantity), availability = VALUES(availability), colors = VALUES(colors),
        storage = VALUES(storage), specs = VALUES(specs), image = VALUES(image), rating = VALUES(rating),
        reviews = VALUES(reviews), warranty = VALUES(warranty), `condition` = VALUES(`condition`),
        badge = VALUES(badge), gallery = VALUES(gallery), variants = VALUES(variants), updated_at = CURRENT_TIMESTAMP',
      'ssssssdiisssssdiissss',
      [
        $id,
        (string) ($product['name'] ?? ''),
        (string) ($product['description'] ?? ''),
        (string) ($product['category'] ?? ''),
        (string) ($product['brand'] ?? 'Apple'),
        ($product['sku'] ?? '') !== '' ? (string) $product['sku'] : null,
        (float) ($product['price'] ?? 0),
        (int) ($product['discount'] ?? 0),
        $quantity,
        $availability,
        self::jsonEncode($product['colors'] ?? []),
        self::jsonEncode($product['storage'] ?? []),
        self::jsonEncode($product['specs'] ?? []),
        (string) ($product['image'] ?? ''),
        (float) ($product['rating'] ?? 0),
        (int) ($product['reviews'] ?? 0),
        (int) ($product['warranty'] ?? 12),
        (string) ($product['condition'] ?? 'New'),
        (string) ($product['badge'] ?? ''),
        self::jsonEncode($product['gallery'] ?? []),
        self::jsonEncode($product['variants'] ?? [])
      ]
    )->close();

    return self::findProductById($id) ?? [];
  }

  public static function deleteProduct(string $id): void {
    self::execute('DELETE FROM products WHERE id = ?', 's', [$id])->close();
  }

  public static function getUsers(bool $includePasswords = false): array {
    $rows = self::fetchAll('SELECT * FROM users ORDER BY created_at DESC');
    return array_map(fn(array $row): array => self::mapUser($row, $includePasswords), $rows);
  }

  public static function findUserById(string $id, bool $includePassword = false): ?array {
    $row = self::fetchOne('SELECT * FROM users WHERE id = ?', 's', [$id]);
    return $row ? self::mapUser($row, $includePassword) : null;
  }

  public static function findUserByEmail(string $email, bool $includePassword = false): ?array {
    $row = self::fetchOne('SELECT * FROM users WHERE email = ?', 's', [$email]);
    return $row ? self::mapUser($row, $includePassword) : null;
  }

  public static function userExists(string $id): bool {
    return (int) self::scalar('SELECT COUNT(*) FROM users WHERE id = ?', 's', [$id], 0) > 0;
  }

  public static function saveUser(array $user): array {
    $id = (string) ($user['id'] ?? uniqid());

    self::execute(
      'INSERT INTO users (id, email, password, name, phone, role, addresses, preferences, birth_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         email = VALUES(email), password = VALUES(password), name = VALUES(name), phone = VALUES(phone),
         role = VALUES(role), addresses = VALUES(addresses), preferences = VALUES(preferences), birth_date = VALUES(birth_date),
         updated_at = CURRENT_TIMESTAMP',
      'sssssssss',
      [
        $id,
        (string) ($user['email'] ?? ''),
        (string) ($user['password'] ?? ''),
        (string) ($user['name'] ?? ''),
        (string) ($user['phone'] ?? ''),
        (string) ($user['role'] ?? 'customer'),
        self::jsonEncode($user['addresses'] ?? []),
        self::jsonEncode($user['preferences'] ?? []),
        ($user['birthDate'] ?? null) ?: null
      ]
    )->close();

    return self::findUserById($id, true) ?? [];
  }

  public static function deleteUser(string $id): void {
    self::execute('DELETE FROM users WHERE id = ?', 's', [$id])->close();
  }

  public static function getOrders(array $filters = []): array {
    $sql = 'SELECT * FROM orders';
    $where = [];
    $types = '';
    $params = [];

    if (!empty($filters['id'])) {
      $where[] = 'id = ?';
      $types .= 's';
      $params[] = (string) $filters['id'];
    }

    if (!empty($filters['userId'])) {
      $where[] = 'user_id = ?';
      $types .= 's';
      $params[] = (string) $filters['userId'];
    }

    if (!empty($filters['status'])) {
      $where[] = 'status = ?';
      $types .= 's';
      $params[] = (string) $filters['status'];
    }

    if ($where !== []) {
      $sql .= ' WHERE ' . implode(' AND ', $where);
    }

    $sql .= ' ORDER BY created_at DESC';

    return array_map([self::class, 'mapOrder'], self::fetchAll($sql, $types, $params));
  }

  public static function findOrderById(string $id): ?array {
    $orders = self::getOrders(['id' => $id]);
    return $orders[0] ?? null;
  }

  public static function saveOrder(array $order): array {
    $id = (string) ($order['id'] ?? uniqid('ORD-'));
    $userId = !empty($order['userId']) && self::userExists((string) $order['userId']) ? (string) $order['userId'] : null;

    self::execute(
      'INSERT INTO orders (
        id, user_id, customer, items, subtotal, shipping, tax, total, payment_method, status,
        tracking, carrier, estimated_delivery, stock_reserved, cancellation_reason,
        customer_update_message, processing_date, shipped_date, delivered_date, cancelled_at,
        stock_reserved_at, stock_released_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        user_id = VALUES(user_id), customer = VALUES(customer), items = VALUES(items), subtotal = VALUES(subtotal),
        shipping = VALUES(shipping), tax = VALUES(tax), total = VALUES(total), payment_method = VALUES(payment_method),
        status = VALUES(status), tracking = VALUES(tracking), carrier = VALUES(carrier),
        estimated_delivery = VALUES(estimated_delivery), stock_reserved = VALUES(stock_reserved),
        cancellation_reason = VALUES(cancellation_reason), customer_update_message = VALUES(customer_update_message),
        processing_date = VALUES(processing_date), shipped_date = VALUES(shipped_date), delivered_date = VALUES(delivered_date),
        cancelled_at = VALUES(cancelled_at), stock_reserved_at = VALUES(stock_reserved_at), stock_released_at = VALUES(stock_released_at),
        updated_at = CURRENT_TIMESTAMP',
      'ssssddddsssssisssssssss',
      [
        $id,
        $userId,
        self::jsonEncode($order['customer'] ?? []),
        self::jsonEncode($order['items'] ?? []),
        (float) ($order['subtotal'] ?? 0),
        (float) ($order['shipping'] ?? 0),
        (float) ($order['tax'] ?? 0),
        (float) ($order['total'] ?? 0),
        (string) ($order['payment'] ?? 'cod'),
        (string) ($order['status'] ?? 'pending'),
        (string) ($order['tracking'] ?? ''),
        (string) ($order['carrier'] ?? ''),
        self::toDatabaseDateTime($order['estimatedDelivery'] ?? null),
        !empty($order['stockReserved']) ? 1 : 0,
        ($order['cancellationReason'] ?? null) ?: null,
        ($order['customerUpdateMessage'] ?? null) ?: null,
        self::toDatabaseDateTime($order['processingDate'] ?? null),
        self::toDatabaseDateTime($order['shippedDate'] ?? null),
        self::toDatabaseDateTime($order['deliveredDate'] ?? null),
        self::toDatabaseDateTime($order['cancelledAt'] ?? null),
        self::toDatabaseDateTime($order['stockReservedAt'] ?? null),
        self::toDatabaseDateTime($order['stockReleasedAt'] ?? null),
        self::toDatabaseDateTime($order['createdAt'] ?? null, date('c'))
      ]
    )->close();

    return self::findOrderById($id) ?? [];
  }

  public static function getNotifications(?string $userId = null): array {
    $sql = 'SELECT * FROM notifications';
    $types = '';
    $params = [];

    if ($userId !== null) {
      $sql .= ' WHERE user_id = ?';
      $types = 's';
      $params[] = $userId;
    }

    $sql .= ' ORDER BY created_at DESC';

    return array_map([self::class, 'mapNotification'], self::fetchAll($sql, $types, $params));
  }

  public static function findNotificationById(string $id): ?array {
    $row = self::fetchOne('SELECT * FROM notifications WHERE id = ?', 's', [$id]);
    return $row ? self::mapNotification($row) : null;
  }

  public static function saveNotification(array $notification): array {
    $id = (string) ($notification['id'] ?? ('notif_' . bin2hex(random_bytes(8))));
    $userId = !empty($notification['userId']) && self::userExists((string) $notification['userId']) ? (string) $notification['userId'] : null;

    self::execute(
      'INSERT INTO notifications (id, user_id, title, message, type, is_read, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         user_id = VALUES(user_id), title = VALUES(title), message = VALUES(message),
         type = VALUES(type), is_read = VALUES(is_read), updated_at = CURRENT_TIMESTAMP',
      'sssssis',
      [
        $id,
        $userId,
        (string) ($notification['title'] ?? 'Notification'),
        (string) ($notification['message'] ?? ''),
        (string) ($notification['type'] ?? 'info'),
        !empty($notification['read']) ? 1 : 0,
        self::toDatabaseDateTime($notification['createdAt'] ?? null, date('c'))
      ]
    )->close();

    return self::findNotificationById($id) ?? [];
  }

  public static function markNotificationRead(string $id): ?array {
    self::execute('UPDATE notifications SET is_read = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?', 's', [$id])->close();
    return self::findNotificationById($id);
  }

  public static function deleteNotification(string $id): void {
    self::execute('DELETE FROM notifications WHERE id = ?', 's', [$id])->close();
  }

  public static function deleteNotificationsByUser(string $userId): void {
    self::execute('DELETE FROM notifications WHERE user_id = ?', 's', [$userId])->close();
  }

  public static function recordEvent(array $event): void {
    $userId = !empty($event['userId']) && self::userExists((string) $event['userId']) ? (string) $event['userId'] : null;

    self::execute(
      'INSERT INTO analytics (id, event_type, event_data, user_id, session_id, url, ip_address, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      'ssssssss',
      [
        (string) ($event['id'] ?? uniqid('evt_')),
        (string) ($event['event'] ?? 'unknown'),
        self::jsonEncode($event['params'] ?? []),
        $userId,
        (string) ($event['sessionId'] ?? ''),
        (string) ($event['url'] ?? ''),
        (string) ($event['ip'] ?? ''),
        self::toDatabaseDateTime($event['ts'] ?? null, date('c'))
      ]
    )->close();
  }

  public static function getEvents(?string $since = null): array {
    $sql = 'SELECT * FROM analytics';
    $types = '';
    $params = [];

    if ($since !== null) {
      $sql .= ' WHERE created_at >= ?';
      $types = 's';
      $params[] = $since;
    }

    $sql .= ' ORDER BY created_at DESC';

    return array_map(function(array $row): array {
      return [
        'id' => $row['id'],
        'event' => $row['event_type'] ?? 'unknown',
        'params' => self::jsonDecode($row['event_data'] ?? null, []),
        'userId' => $row['user_id'] ?? null,
        'sessionId' => $row['session_id'] ?? '',
        'url' => $row['url'] ?? '',
        'ip' => $row['ip_address'] ?? '',
        'ts' => self::fromDatabaseDateTime($row['created_at'] ?? null),
      ];
    }, self::fetchAll($sql, $types, $params));
  }

  public static function getStats(): array {
    $totalProducts = (int) self::scalar('SELECT COUNT(*) FROM products', '', [], 0);
    $totalOrders = (int) self::scalar('SELECT COUNT(*) FROM orders', '', [], 0);
    $totalUsers = (int) self::scalar('SELECT COUNT(*) FROM users', '', [], 0);
    $totalRevenue = (float) self::scalar("SELECT COALESCE(SUM(total), 0) FROM orders WHERE status <> 'cancelled'", '', [], 0);
    $avgOrderValue = (float) self::scalar('SELECT COALESCE(AVG(total), 0) FROM orders', '', [], 0);
    $lowStockProducts = (int) self::scalar('SELECT COUNT(*) FROM products WHERE quantity < 10', '', [], 0);
    $dataSize = (float) self::scalar('SELECT COALESCE(SUM(data_length + index_length), 0) FROM information_schema.TABLES WHERE table_schema = DATABASE()', '', [], 0);

    return [
      'totalProducts' => $totalProducts,
      'totalOrders' => $totalOrders,
      'totalUsers' => $totalUsers,
      'totalRevenue' => $totalRevenue,
      'avgOrderValue' => $avgOrderValue,
      'lowStockProducts' => $lowStockProducts,
      'dataSize' => round($dataSize / 1024, 2) . ' KB',
    ];
  }
}

function respond(bool $success, string $message, mixed $data = null, int $status = 200): never {
  http_response_code($status);
  header('Content-Type: application/json; charset=utf-8');
  header('Access-Control-Allow-Origin: *');
  header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
  header('Access-Control-Allow-Headers: Content-Type, Authorization');

  echo json_encode([
    'success' => $success,
    'message' => $message,
    'data' => $data,
  ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}
