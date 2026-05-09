<?php
/**
 * Apple Store VN — Admin Stats API
 * GET /api/stats.php
 */

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

$ordersFile  = __DIR__ . '/../data/orders.json';
$eventsFile  = __DIR__ . '/../data/events.json';

$orders = file_exists($ordersFile) ? (json_decode(file_get_contents($ordersFile), true) ?: []) : [];
$events = file_exists($eventsFile) ? (json_decode(file_get_contents($eventsFile), true) ?: []) : [];

// ── Order stats ───────────────────────────────────────────────────────────────
$revenue      = 0;
$statusCounts = [];
$productSales = [];

foreach ($orders as $o) {
    if (($o['status'] ?? '') === 'cancelled') continue;

    $revenue += (float)($o['total'] ?? 0);
    $status   = $o['status'] ?? 'unknown';
    $statusCounts[$status] = ($statusCounts[$status] ?? 0) + 1;

    foreach (($o['items'] ?? []) as $item) {
        $key = (int)($item['id'] ?? 0);
        if (!$key) continue;
        if (!isset($productSales[$key])) {
            $productSales[$key] = ['id' => $key, 'name' => $item['name'] ?? '', 'qty' => 0, 'revenue' => 0];
        }
        $productSales[$key]['qty']     += (int)($item['quantity'] ?? 1);
        $productSales[$key]['revenue'] += (float)($item['price'] ?? 0) * (int)($item['quantity'] ?? 1);
    }
}

// Top 5 products by revenue
usort($productSales, fn($a, $b) => $b['revenue'] <=> $a['revenue']);
$topProducts = array_slice(array_values($productSales), 0, 5);

// ── Event stats (last 7 days) ─────────────────────────────────────────────────
$cutoff      = date('c', strtotime('-7 days'));
$eventCounts = [];

foreach ($events as $e) {
    if (($e['ts'] ?? '') < $cutoff) continue;
    $name = $e['event'] ?? 'unknown';
    $eventCounts[$name] = ($eventCounts[$name] ?? 0) + 1;
}

arsort($eventCounts);

echo json_encode([
    'data' => [
        'orders'      => [
            'total'    => count($orders),
            'revenue'  => round($revenue),
            'byStatus' => $statusCounts,
        ],
        'topProducts'  => $topProducts,
        'events7d'     => $eventCounts,
        'totalEvents'  => count($events),
    ]
], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
