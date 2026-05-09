<?php
/**
 * Apple Store VN — Orders API
 * GET  /api/orders.php              → list orders (admin)
 * POST /api/orders.php              → create order
 * GET  /api/orders.php?id=ORD-xxx  → single order
 * POST /api/orders.php?action=status&id=ORD-xxx  → update status
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('X-Content-Type-Options: nosniff');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

$method     = $_SERVER['REQUEST_METHOD'];
$ordersFile = __DIR__ . '/../data/orders.json';

// ── Helpers ───────────────────────────────────────────────────────────────────
function readOrders(string $file): array {
    if (!file_exists($file)) return [];
    $fp      = fopen($file, 'r');
    $orders  = [];
    if (flock($fp, LOCK_SH)) {
        $json   = stream_get_contents($fp);
        $orders = json_decode($json, true) ?: [];
        flock($fp, LOCK_UN);
    }
    fclose($fp);
    return $orders;
}

function writeOrders(string $file, array $orders): void {
    $dir = dirname($file);
    if (!is_dir($dir)) mkdir($dir, 0755, true);
    $fp = fopen($file, 'c+');
    if (flock($fp, LOCK_EX)) {
        ftruncate($fp, 0);
        rewind($fp);
        fwrite($fp, json_encode($orders, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT));
        fflush($fp);
        flock($fp, LOCK_UN);
    }
    fclose($fp);
}

function sanitizeString(mixed $v, int $maxLen = 200): string {
    return substr(trim(strip_tags((string)($v ?? ''))), 0, $maxLen);
}

// ── GET ───────────────────────────────────────────────────────────────────────
if ($method === 'GET') {
    $orders = readOrders($ordersFile);

    // Single order
    if (!empty($_GET['id'])) {
        $id    = sanitizeString($_GET['id']);
        $found = array_values(array_filter($orders, fn($o) => $o['id'] === $id));
        if (empty($found)) {
            http_response_code(404);
            echo json_encode(['error' => 'Order not found']);
            exit;
        }
        echo json_encode(['data' => $found[0]], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // List with optional status filter + pagination
    $status = sanitizeString($_GET['status'] ?? '');
    $page   = max(1, (int)($_GET['page']  ?? 1));
    $limit  = min(50,  max(1, (int)($_GET['limit'] ?? 20)));

    $list = $status
        ? array_values(array_filter($orders, fn($o) => ($o['status'] ?? '') === $status))
        : array_values($orders);

    // Newest first
    usort($list, fn($a, $b) => strcmp($b['createdAt'] ?? '', $a['createdAt'] ?? ''));

    $total  = count($list);
    $offset = ($page - 1) * $limit;
    $items  = array_slice($list, $offset, $limit);

    echo json_encode([
        'data'       => $items,
        'pagination' => ['page' => $page, 'limit' => $limit, 'total' => $total]
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// ── POST ──────────────────────────────────────────────────────────────────────
if ($method === 'POST') {
    $raw     = file_get_contents('php://input');
    $payload = json_decode($raw, true);

    if (!$payload) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid JSON body']);
        exit;
    }

    // Update status action
    if (isset($_GET['action']) && $_GET['action'] === 'status') {
        $id      = sanitizeString($_GET['id'] ?? '');
        $status  = sanitizeString($payload['status'] ?? '');
        $allowed = ['pending','processing','shipped','delivered','cancelled'];

        if (!in_array($status, $allowed)) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid status']);
            exit;
        }

        $orders = readOrders($ordersFile);
        $idx    = -1;
        foreach ($orders as $i => $o) { if ($o['id'] === $id) { $idx = $i; break; } }

        if ($idx === -1) {
            http_response_code(404);
            echo json_encode(['error' => 'Order not found']);
            exit;
        }

        $orders[$idx]['status']    = $status;
        $orders[$idx]['updatedAt'] = date('c');
        writeOrders($ordersFile, $orders);

        echo json_encode(['data' => $orders[$idx], 'message' => 'Status updated'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // Create order — validate required fields
    $customer = $payload['customer'] ?? [];
    $items    = $payload['items']    ?? [];
    $total    = $payload['total']    ?? 0;

    $errors = [];
    if (empty($customer['name']))  $errors[] = 'Customer name is required';
    if (empty($customer['phone'])) $errors[] = 'Customer phone is required';
    if (empty($items))             $errors[] = 'Order items are required';
    if ($total <= 0)               $errors[] = 'Invalid total';

    if (!empty($errors)) {
        http_response_code(422);
        echo json_encode(['error' => implode('; ', $errors)]);
        exit;
    }

    // Sanitize customer fields
    $safeCustomer = [
        'name'    => sanitizeString($customer['name']),
        'email'   => filter_var($customer['email'] ?? '', FILTER_SANITIZE_EMAIL),
        'phone'   => sanitizeString($customer['phone'], 20),
        'address' => sanitizeString($customer['address'] ?? '', 300),
        'city'    => sanitizeString($customer['city']    ?? ''),
        'note'    => sanitizeString($customer['note']    ?? '', 500),
    ];

    // Sanitize items — keep only safe fields
    $safeItems = array_map(fn($item) => [
        'id'       => (int)($item['id'] ?? 0),
        'name'     => sanitizeString($item['name'] ?? '', 200),
        'price'    => (float)($item['price'] ?? 0),
        'quantity' => max(1, (int)($item['quantity'] ?? 1)),
        '_variant' => isset($item['_variant']) && is_array($item['_variant']) ? array_map('strval', $item['_variant']) : null,
    ], (array)$items);

    $orderId = 'ORD-' . time() . '-' . strtoupper(substr(uniqid(), -4));
    $order   = [
        'id'        => $orderId,
        'status'    => 'pending',
        'customer'  => $safeCustomer,
        'items'     => $safeItems,
        'payment'   => sanitizeString($payload['payment'] ?? 'cod', 20),
        'subtotal'  => (float)($payload['subtotal'] ?? 0),
        'shipping'  => (float)($payload['shipping'] ?? 0),
        'total'     => (float)$total,
        'createdAt' => date('c'),
    ];

    $orders = readOrders($ordersFile);
    // Keep max 5000 orders
    if (count($orders) >= 5000) array_shift($orders);
    $orders[] = $order;
    writeOrders($ordersFile, $orders);

    http_response_code(201);
    echo json_encode([
        'data'    => ['orderId' => $orderId, 'status' => 'pending'],
        'message' => 'Đặt hàng thành công!'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Method not allowed']);
