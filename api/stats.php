<?php
/**
 * Apple Store VN — Admin Stats API
 * GET /api/stats.php
 */

require_once __DIR__ . '/config.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('X-Content-Type-Options: nosniff');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

try {
    $cutoff = date('Y-m-d H:i:s', strtotime('-7 days'));
    $orders = DataStore::getOrders();
    $events = DataStore::getEvents($cutoff);

    $revenue = 0;
    $statusCounts = [];
    $productSales = [];

    foreach ($orders as $o) {
        if (($o['status'] ?? '') === 'cancelled') continue;

        $revenue += (float)($o['total'] ?? 0);
        $status = $o['status'] ?? 'unknown';
        $statusCounts[$status] = ($statusCounts[$status] ?? 0) + 1;

        foreach (($o['items'] ?? []) as $item) {
            $key = (string)($item['id'] ?? '');
            if ($key === '') continue;
            if (!isset($productSales[$key])) {
                $productSales[$key] = ['id' => $key, 'name' => $item['name'] ?? '', 'qty' => 0, 'revenue' => 0];
            }
            $productSales[$key]['qty'] += (int)($item['quantity'] ?? 1);
            $productSales[$key]['revenue'] += (float)($item['price'] ?? 0) * (int)($item['quantity'] ?? 1);
        }
    }

    usort($productSales, fn($a, $b) => $b['revenue'] <=> $a['revenue']);
    $topProducts = array_slice(array_values($productSales), 0, 5);

    $eventCounts = [];
    foreach ($events as $e) {
        $name = $e['event'] ?? 'unknown';
        $eventCounts[$name] = ($eventCounts[$name] ?? 0) + 1;
    }

    arsort($eventCounts);

    echo json_encode([
        'data' => [
            'orders' => [
                'total' => count($orders),
                'revenue' => round($revenue),
                'byStatus' => $statusCounts,
            ],
            'topProducts' => $topProducts,
            'events7d' => $eventCounts,
            'totalEvents' => count($events),
        ]
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
} catch (Throwable $error) {
    http_response_code(500);
    echo json_encode(['error' => $error->getMessage()], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
}
