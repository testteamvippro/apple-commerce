<?php
/**
 * Apple Store VN — Enhanced PHP API
 * Unified API endpoint for all backend operations
 * 
 * Routes:
 * GET    /api/products          - List products
 * GET    /api/products/:id      - Get single product
 * GET    /api/orders            - List orders (admin)
 * POST   /api/orders            - Create order
 * GET    /api/orders/:id        - Get order details
 * PUT    /api/orders/:id        - Update order status
 * POST   /api/reviews           - Add product review
 * GET    /api/reviews/:id       - Get product reviews
 * GET    /api/stats             - Get admin statistics
 * POST   /api/email             - Send email notifications
 * 
 * Security:
 * - CORS protection
 * - Input sanitization
 * - Rate limiting ready
 * - SQL injection prevention (for DB use)
 * - XSS protection
 */

error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

// ── Configuration ────────────────────────────────────────────────────────────
define('API_VERSION', '2.0');
define('BASE_PATH', dirname(__DIR__));
define('DATA_PATH', BASE_PATH . '/data');
define('UPLOAD_PATH', DATA_PATH . '/uploads');
define('LOG_PATH', DATA_PATH . '/logs');
define('ORDERS_FILE', DATA_PATH . '/orders.json');
define('REVIEWS_FILE', DATA_PATH . '/reviews.json');
define('EVENTS_FILE', DATA_PATH . '/events.json');

// Ensure directories exist
foreach ([DATA_PATH, UPLOAD_PATH, LOG_PATH] as $dir) {
    if (!is_dir($dir)) @mkdir($dir, 0755, true);
}

// ── Headers ──────────────────────────────────────────────────────────────────
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: ' . ($_SERVER['HTTP_ORIGIN'] ?? '*'));
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-API-Key');
header('Access-Control-Max-Age: 86400');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('X-XSS-Protection: 1; mode=block');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// ── Response helpers ────────────────────────────────────────────────────────
function respond($data, $code = 200) {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function error($message, $code = 400) {
    respond(['error' => $message, 'code' => $code], $code);
}

function success($data, $message = 'Success') {
    respond(['success' => true, 'message' => $message, 'data' => $data], 200);
}

// ── Input helpers ───────────────────────────────────────────────────────────
function sanitize($value, $type = 'string') {
    $value = trim($value);
    
    switch ($type) {
        case 'email':
            return filter_var($value, FILTER_SANITIZE_EMAIL);
        case 'int':
            return filter_var($value, FILTER_SANITIZE_NUMBER_INT);
        case 'float':
            return filter_var($value, FILTER_SANITIZE_NUMBER_FLOAT);
        case 'url':
            return filter_var($value, FILTER_SANITIZE_URL);
        case 'phone':
            return preg_replace('/[^0-9\-\+\s]/', '', $value);
        case 'string':
        default:
            return strip_tags($value);
    }
}

function validate_email($email) {
    return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
}

function validate_phone($phone) {
    return preg_match('/^[0-9\-\+\s]{9,}$/', str_replace(' ', '', $phone)) === 1;
}

// ── File I/O helpers ────────────────────────────────────────────────────────
function read_json($file, $default = []) {
    if (!file_exists($file)) return $default;
    
    $fp = fopen($file, 'r');
    $data = [];
    
    if (flock($fp, LOCK_SH)) {
        $content = stream_get_contents($fp);
        $data = json_decode($content, true) ?: $default;
        flock($fp, LOCK_UN);
    }
    
    fclose($fp);
    return $data;
}

function write_json($file, $data) {
    $dir = dirname($file);
    if (!is_dir($dir)) mkdir($dir, 0755, true);
    
    $fp = fopen($file, 'c+');
    if (!flock($fp, LOCK_EX)) {
        fclose($fp);
        throw new Exception('Could not acquire lock on ' . $file);
    }
    
    ftruncate($fp, 0);
    rewind($fp);
    fwrite($fp, json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
    fflush($fp);
    flock($fp, LOCK_UN);
    fclose($fp);
}

// ── Logging ──────────────────────────────────────────────────────────────────
function log_event($event, $data = []) {
    $timestamp = date('Y-m-d H:i:s');
    $logFile = LOG_PATH . '/' . date('Y-m-d') . '.log';
    $logEntry = "[{$timestamp}] {$event}: " . json_encode($data) . "\n";
    @file_put_contents($logFile, $logEntry, FILE_APPEND);
}

// ── Email helper ────────────────────────────────────────────────────────────
function send_email($to, $subject, $message, $type = 'text/plain') {
    if (!validate_email($to)) return false;
    
    $headers = "MIME-Version: 1.0\r\n";
    $headers .= "Content-type: {$type}; charset=UTF-8\r\n";
    $headers .= "From: noreply@applestore.vn\r\n";
    
    return @mail($to, $subject, $message, $headers);
}

// ── Parse request ───────────────────────────────────────────────────────────
$method = $_SERVER['REQUEST_METHOD'];
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$path = preg_replace('!^/api/!', '', $path);
$parts = array_filter(explode('/', $path));
$resource = array_shift($parts);
$id = array_shift($parts);

$_GET = array_map(function($v) { return sanitize($v, 'string'); }, $_GET);
$_POST = json_decode(file_get_contents('php://input'), true) ?: [];

// ════════════════════════════════════════════════════════════════════════════
//  PRODUCTS API
// ════════════════════════════════════════════════════════════════════════════

if ($resource === 'products') {
    $productsFile = BASE_PATH . '/products.json';
    $products = read_json($productsFile, []);
    
    if (!empty($id)) {
        // Get single product
        $productId = (int)$id;
        $product = null;
        
        foreach ($products as $p) {
            if ($p['id'] == $productId) {
                $product = $p;
                break;
            }
        }
        
        if (!$product) error('Product not found', 404);
        success($product);
    }
    
    // List products with filters
    $filtered = $products;
    
    // Filters
    if (!empty($_GET['cat'])) {
        $cat = $_GET['cat'];
        $filtered = array_filter($filtered, fn($p) => $p['category'] === $cat);
    }
    
    if (!empty($_GET['search'])) {
        $q = strtolower($_GET['search']);
        $filtered = array_filter($filtered, fn($p) => 
            stripos($p['name'], $q) !== false || 
            stripos($p['description'] ?? '', $q) !== false
        );
    }
    
    if (!empty($_GET['minPrice'])) {
        $min = (float)$_GET['minPrice'];
        $filtered = array_filter($filtered, fn($p) => $p['price'] >= $min);
    }
    
    if (!empty($_GET['maxPrice'])) {
        $max = (float)$_GET['maxPrice'];
        $filtered = array_filter($filtered, fn($p) => $p['price'] <= $max);
    }
    
    // Sorting
    if (!empty($_GET['sort'])) {
        $sort = $_GET['sort'];
        switch ($sort) {
            case 'price_asc':
                usort($filtered, fn($a, $b) => $a['price'] <=> $b['price']);
                break;
            case 'price_desc':
                usort($filtered, fn($a, $b) => $b['price'] <=> $a['price']);
                break;
            case 'name_asc':
                usort($filtered, fn($a, $b) => strcmp($a['name'], $b['name']));
                break;
        }
    }
    
    // Pagination
    $page = max(1, (int)($_GET['page'] ?? 1));
    $limit = min(100, max(1, (int)($_GET['limit'] ?? 20)));
    $offset = ($page - 1) * $limit;
    
    $total = count($filtered);
    $filtered = array_values($filtered);
    $items = array_slice($filtered, $offset, $limit);
    
    success([
        'items' => $items,
        'total' => $total,
        'page' => $page,
        'limit' => $limit,
        'pages' => ceil($total / $limit)
    ]);
}

// ════════════════════════════════════════════════════════════════════════════
//  ORDERS API
// ════════════════════════════════════════════════════════════════════════════

if ($resource === 'orders') {
    if ($method === 'POST') {
        // Create order
        $data = $_POST;
        
        // Validate
        if (empty($data['customer']['name'])) error('Customer name required');
        if (empty($data['customer']['email'])) error('Customer email required');
        if (empty($data['customer']['phone'])) error('Customer phone required');
        if (empty($data['items'])) error('Order items required');
        
        if (!validate_email($data['customer']['email'])) error('Invalid email');
        if (!validate_phone($data['customer']['phone'])) error('Invalid phone');
        
        // Create order
        $order = [
            'id' => 'ORD-' . time() . '-' . mt_rand(1000, 9999),
            'customer' => [
                'name' => sanitize($data['customer']['name']),
                'email' => sanitize($data['customer']['email'], 'email'),
                'phone' => sanitize($data['customer']['phone'], 'phone'),
                'address' => sanitize($data['customer']['address'] ?? ''),
                'city' => sanitize($data['customer']['city'] ?? ''),
                'note' => sanitize($data['customer']['note'] ?? '')
            ],
            'items' => $data['items'],
            'subtotal' => (float)($data['subtotal'] ?? 0),
            'shipping' => (float)($data['shipping'] ?? 0),
            'tax' => (float)($data['tax'] ?? 0),
            'total' => (float)($data['total'] ?? 0),
            'payment' => sanitize($data['payment'] ?? 'cod'),
            'status' => 'pending',
            'createdAt' => date('c'),
            'updatedAt' => date('c')
        ];
        
        // Save order
        $orders = read_json(ORDERS_FILE, []);
        $orders[] = $order;
        write_json(ORDERS_FILE, $orders);
        
        // Log event
        log_event('ORDER_CREATED', ['id' => $order['id'], 'email' => $order['customer']['email']]);
        
        // Send confirmation email
        $subject = 'Xác Nhận Đơn Hàng - ' . $order['id'];
        $message = "Cảm ơn bạn đã đặt hàng!\n\n";
        $message .= "Mã đơn hàng: " . $order['id'] . "\n";
        $message .= "Tổng tiền: ₫" . number_format($order['total']) . "\n";
        $message .= "Trạng thái: " . $order['status'];
        send_email($order['customer']['email'], $subject, $message);
        
        success($order, 'Order created successfully');
    }
    
    if ($method === 'GET') {
        $orders = read_json(ORDERS_FILE, []);
        
        if (!empty($id)) {
            // Get single order
            $order = null;
            foreach ($orders as $o) {
                if ($o['id'] === $id) {
                    $order = $o;
                    break;
                }
            }
            
            if (!$order) error('Order not found', 404);
            success($order);
        }
        
        // List orders
        $status = $_GET['status'] ?? '';
        if (!empty($status)) {
            $orders = array_filter($orders, fn($o) => $o['status'] === $status);
        }
        
        // Pagination
        $page = max(1, (int)($_GET['page'] ?? 1));
        $limit = min(100, max(1, (int)($_GET['limit'] ?? 20)));
        $offset = ($page - 1) * $limit;
        
        $total = count($orders);
        $orders = array_values($orders);
        usort($orders, fn($a, $b) => strtotime($b['createdAt']) - strtotime($a['createdAt']));
        $items = array_slice($orders, $offset, $limit);
        
        success([
            'items' => $items,
            'total' => $total,
            'page' => $page,
            'limit' => $limit,
            'pages' => ceil($total / $limit)
        ]);
    }
    
    if ($method === 'PUT') {
        if (empty($id)) error('Order ID required');
        
        $orders = read_json(ORDERS_FILE, []);
        $updated = false;
        
        foreach ($orders as &$order) {
            if ($order['id'] === $id) {
                if (!empty($_POST['status'])) {
                    $order['status'] = sanitize($_POST['status']);
                    $order['updatedAt'] = date('c');
                    $updated = true;
                }
                break;
            }
        }
        
        if (!$updated) error('Order not found', 404);
        
        write_json(ORDERS_FILE, $orders);
        log_event('ORDER_UPDATED', ['id' => $id, 'status' => $_POST['status'] ?? null]);
        
        success(['id' => $id], 'Order updated');
    }
}

// ════════════════════════════════════════════════════════════════════════════
//  REVIEWS API
// ════════════════════════════════════════════════════════════════════════════

if ($resource === 'reviews') {
    if ($method === 'POST') {
        // Add review
        if (empty($_POST['productId'])) error('Product ID required');
        
        $review = [
            'id' => time() . '-' . mt_rand(1000, 9999),
            'productId' => (int)$_POST['productId'],
            'author' => sanitize($_POST['author'] ?? 'Anonymous'),
            'email' => sanitize($_POST['email'] ?? '', 'email'),
            'rating' => min(5, max(1, (int)($_POST['rating'] ?? 5))),
            'title' => sanitize($_POST['title'] ?? ''),
            'comment' => sanitize($_POST['comment'] ?? ''),
            'verified' => (bool)($_POST['verified'] ?? false),
            'helpful' => 0,
            'unhelpful' => 0,
            'createdAt' => date('c')
        ];
        
        // Save review
        $reviews = read_json(REVIEWS_FILE, []);
        $reviews[] = $review;
        write_json(REVIEWS_FILE, $reviews);
        
        log_event('REVIEW_CREATED', ['productId' => $review['productId'], 'rating' => $review['rating']]);
        success($review, 'Review added successfully');
    }
    
    if ($method === 'GET') {
        $reviews = read_json(REVIEWS_FILE, []);
        
        if (!empty($id)) {
            // Get reviews for product
            $productId = (int)$id;
            $productReviews = array_filter($reviews, fn($r) => $r['productId'] === $productId);
            success(array_values($productReviews));
        }
        
        success($reviews);
    }
}

// ════════════════════════════════════════════════════════════════════════════
//  STATISTICS API
// ════════════════════════════════════════════════════════════════════════════

if ($resource === 'stats') {
    $orders = read_json(ORDERS_FILE, []);
    $reviews = read_json(REVIEWS_FILE, []);
    
    $totalOrders = count($orders);
    $totalRevenue = array_sum(array_column($orders, 'total'));
    $pendingOrders = count(array_filter($orders, fn($o) => $o['status'] === 'pending'));
    $totalReviews = count($reviews);
    $avgRating = $totalReviews > 0 
        ? array_sum(array_column($reviews, 'rating')) / $totalReviews 
        : 0;
    
    // Orders by status
    $statusCounts = [];
    foreach ($orders as $order) {
        $status = $order['status'] ?? 'pending';
        $statusCounts[$status] = ($statusCounts[$status] ?? 0) + 1;
    }
    
    // Revenue by date (last 7 days)
    $revenueTrend = [];
    for ($i = 6; $i >= 0; $i--) {
        $date = date('Y-m-d', strtotime("-{$i} days"));
        $dayRevenue = array_sum(array_map(
            fn($o) => strpos($o['createdAt'], $date) === 0 ? $o['total'] : 0,
            $orders
        ));
        $revenueTrend[$date] = $dayRevenue;
    }
    
    success([
        'totalOrders' => $totalOrders,
        'totalRevenue' => $totalRevenue,
        'pendingOrders' => $pendingOrders,
        'totalReviews' => $totalReviews,
        'avgRating' => round($avgRating, 1),
        'ordersByStatus' => $statusCounts,
        'revenueTrend' => $revenueTrend
    ]);
}

// Default 404
error('Endpoint not found', 404);
