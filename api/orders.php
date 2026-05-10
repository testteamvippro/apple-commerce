<?php
/**
 * Apple Store VN — Orders API
 * GET  /api/orders.php              → list orders (admin)
 * POST /api/orders.php              → create order
 * GET  /api/orders.php?id=ORD-xxx  → single order
 * POST /api/orders.php?action=status&id=ORD-xxx  → update status
 */

require_once __DIR__ . '/config.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('X-Content-Type-Options: nosniff');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

$method = $_SERVER['REQUEST_METHOD'];

function sanitizeString(mixed $v, int $maxLen = 200): string {
    return substr(trim(strip_tags((string)($v ?? ''))), 0, $maxLen);
}

try {
    if ($method === 'GET') {
        if (!empty($_GET['id'])) {
            $order = DataStore::findOrderById(sanitizeString($_GET['id']));
            if (!$order) {
                http_response_code(404);
                echo json_encode(['error' => 'Order not found']);
                exit;
            }
            echo json_encode(['data' => $order], JSON_UNESCAPED_UNICODE);
            exit;
        }

        $status = sanitizeString($_GET['status'] ?? '');
        $page = max(1, (int) ($_GET['page'] ?? 1));
        $limit = min(50, max(1, (int) ($_GET['limit'] ?? 20)));
        $list = DataStore::getOrders($status ? ['status' => $status] : []);
        $total = count($list);
        $items = array_slice($list, ($page - 1) * $limit, $limit);

        echo json_encode([
            'data' => $items,
            'pagination' => ['page' => $page, 'limit' => $limit, 'total' => $total]
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    if ($method === 'POST') {
        $payload = json_decode(file_get_contents('php://input'), true);
        if (!$payload) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid JSON body']);
            exit;
        }

        if (isset($_GET['action']) && $_GET['action'] === 'status') {
            $id = sanitizeString($_GET['id'] ?? '');
            $status = sanitizeString($payload['status'] ?? '');
            $allowed = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
            if (!in_array($status, $allowed, true)) {
                http_response_code(400);
                echo json_encode(['error' => 'Invalid status']);
                exit;
            }

            $order = DataStore::findOrderById($id);
            if (!$order) {
                http_response_code(404);
                echo json_encode(['error' => 'Order not found']);
                exit;
            }

            $order['status'] = $status;
            $order['updatedAt'] = date('c');
            $order = DataStore::saveOrder($order);
            echo json_encode(['data' => $order, 'message' => 'Status updated'], JSON_UNESCAPED_UNICODE);
            exit;
        }

        $customer = $payload['customer'] ?? [];
        $items = $payload['items'] ?? [];
        $total = $payload['total'] ?? 0;
        $errors = [];

        if (empty($customer['name'])) $errors[] = 'Customer name is required';
        if (empty($customer['phone'])) $errors[] = 'Customer phone is required';
        if (empty($items)) $errors[] = 'Order items are required';
        if ($total <= 0) $errors[] = 'Invalid total';

        if ($errors) {
            http_response_code(422);
            echo json_encode(['error' => implode('; ', $errors)]);
            exit;
        }

        $safeCustomer = [
            'name' => sanitizeString($customer['name']),
            'email' => filter_var($customer['email'] ?? '', FILTER_SANITIZE_EMAIL),
            'phone' => sanitizeString($customer['phone'], 20),
            'address' => sanitizeString($customer['address'] ?? '', 300),
            'city' => sanitizeString($customer['city'] ?? ''),
            'note' => sanitizeString($customer['note'] ?? '', 500),
        ];

        $safeItems = array_map(fn($item) => [
            'id' => isset($item['id']) ? (string) $item['id'] : '',
            'name' => sanitizeString($item['name'] ?? '', 200),
            'price' => (float) ($item['price'] ?? 0),
            'quantity' => max(1, (int) ($item['quantity'] ?? 1)),
            '_variant' => isset($item['_variant']) && is_array($item['_variant']) ? array_map('strval', $item['_variant']) : null,
        ], (array) $items);

        $products = DataStore::getProducts();
        $shortages = [];
        foreach ($safeItems as $item) {
            $matched = null;
            foreach ($products as $product) {
                if ((string) ($product['id'] ?? '') === (string) $item['id'] || ($product['name'] ?? '') === $item['name']) {
                    $matched = $product;
                    break;
                }
            }

            if ($matched) {
                $available = (int) ($matched['quantity'] ?? $matched['stock'] ?? 0);
                if ($item['quantity'] > $available) {
                    $shortages[] = $item['name'] . ': cần ' . $item['quantity'] . ', còn ' . $available;
                }
            }
        }

        if ($shortages) {
            http_response_code(422);
            echo json_encode(['error' => 'Sản phẩm không đủ hàng: ' . implode('; ', $shortages)], JSON_UNESCAPED_UNICODE);
            exit;
        }

        $orderId = 'ORD-' . time() . '-' . strtoupper(substr(uniqid(), -4));
        DataStore::saveOrder([
            'id' => $orderId,
            'userId' => !empty($payload['userId']) ? sanitizeString($payload['userId'], 80) : null,
            'status' => 'pending',
            'customer' => $safeCustomer,
            'items' => $safeItems,
            'payment' => sanitizeString($payload['payment'] ?? 'cod', 20),
            'subtotal' => (float) ($payload['subtotal'] ?? 0),
            'shipping' => (float) ($payload['shipping'] ?? 0),
            'tax' => (float) ($payload['tax'] ?? 0),
            'total' => (float) $total,
            'createdAt' => date('c')
        ]);

        http_response_code(201);
        echo json_encode([
            'data' => ['orderId' => $orderId, 'status' => 'pending'],
            'message' => 'Đặt hàng thành công!'
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
} catch (Throwable $error) {
    http_response_code(500);
    echo json_encode(['error' => $error->getMessage()], JSON_UNESCAPED_UNICODE);
}
