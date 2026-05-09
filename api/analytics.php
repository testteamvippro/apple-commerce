<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  exit(0);
}

$dataDir = '../data/';

function loadJSON($filename) {
  global $dataDir;
  $filepath = $dataDir . $filename;
  if (!file_exists($filepath)) {
    return [];
  }
  return json_decode(file_get_contents($filepath), true) ?? [];
}

function respond($success, $message, $data = null) {
  echo json_encode(['success' => $success, 'message' => $message, 'data' => $data]);
  exit;
}

function getDateRange($range) {
  $today = new DateTime();
  $start = new DateTime();
  
  switch($range) {
    case 'today':
      $start = new DateTime();
      break;
    case 'week':
      $start->modify('-7 days');
      break;
    case 'month':
      $start->modify('-30 days');
      break;
    case 'year':
      $start->modify('-365 days');
      break;
    default:
      $start->modify('-7 days');
  }
  
  return ['start' => $start, 'end' => $today];
}

// GET /api/analytics
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
  $range = $_GET['range'] ?? 'week';
  $dateRange = getDateRange($range);

  $orders = loadJSON('orders.json');
  $users = loadJSON('users.json') ?? [];

  // Filter orders by date range
  $filteredOrders = array_filter($orders, function($order) use ($dateRange) {
    $orderDate = new DateTime($order['createdAt']);
    return $orderDate >= $dateRange['start'] && $orderDate <= $dateRange['end'];
  });

  // Calculate KPIs
  $totalRevenue = 0;
  $totalOrders = count($filteredOrders);
  $orderStatuses = array_count_values(array_column($filteredOrders, 'status'));

  foreach ($filteredOrders as $order) {
    $totalRevenue += $order['total'];
  }

  $averageOrderValue = $totalOrders > 0 ? $totalRevenue / $totalOrders : 0;
  $conversionRate = 0.025; // Placeholder

  // Revenue over time
  $revenueByDate = [];
  foreach ($filteredOrders as $order) {
    $date = substr($order['createdAt'], 0, 10);
    if (!isset($revenueByDate[$date])) {
      $revenueByDate[$date] = 0;
    }
    $revenueByDate[$date] += $order['total'];
  }
  ksort($revenueByDate);

  // Top products
  $productSales = [];
  foreach ($filteredOrders as $order) {
    foreach ($order['items'] as $item) {
      $productName = $item['name'] ?? 'Unknown';
      if (!isset($productSales[$productName])) {
        $productSales[$productName] = 0;
      }
      $productSales[$productName] += $item['quantity'];
    }
  }
  arsort($productSales);
  $topProducts = array_slice($productSales, 0, 5);

  // Customer insights
  $uniqueCustomers = count(array_unique(array_column($filteredOrders, 'userId')));
  $newCustomers = count(array_filter($users, function($user) use ($dateRange) {
    $userDate = new DateTime($user['createdAt']);
    return $userDate >= $dateRange['start'] && $userDate <= $dateRange['end'];
  }));
  $returningCustomers = $uniqueCustomers - $newCustomers;

  $customerLifetimeValue = $uniqueCustomers > 0 ? $totalRevenue / $uniqueCustomers : 0;
  $averageOrdersPerCustomer = $uniqueCustomers > 0 ? $totalOrders / $uniqueCustomers : 0;

  // Return rate and abandonment rate (placeholders)
  $productReturnRate = 0.02;
  $cartAbandonmentRate = 0.15;

  $analytics = [
    'totalRevenue' => round($totalRevenue),
    'totalOrders' => $totalOrders,
    'averageOrderValue' => round($averageOrderValue),
    'conversionRate' => $conversionRate,
    'revenueChange' => 0.12,
    'ordersChange' => 0.08,
    'aovChange' => 0.05,
    'conversionChange' => 0.03,
    'newCustomers' => $newCustomers,
    'returningCustomers' => $returningCustomers,
    'customerLifetimeValue' => round($customerLifetimeValue),
    'averageOrdersPerCustomer' => round($averageOrdersPerCustomer, 2),
    'productReturnRate' => $productReturnRate,
    'cartAbandonmentRate' => $cartAbandonmentRate,
    'revenueOverTime' => [
      'labels' => array_keys($revenueByDate),
      'values' => array_values($revenueByDate)
    ],
    'ordersDistribution' => [
      'labels' => ['Pending', 'Processing', 'Shipped', 'Delivered'],
      'values' => [
        $orderStatuses['pending'] ?? 0,
        $orderStatuses['processing'] ?? 0,
        $orderStatuses['shipped'] ?? 0,
        $orderStatuses['delivered'] ?? 0
      ]
    ],
    'topProducts' => [
      'labels' => array_keys($topProducts),
      'values' => array_values($topProducts)
    ],
    'categoryData' => [
      'labels' => ['MacBook', 'iPad', 'iPhone', 'Apple Watch', 'AirPods'],
      'values' => [25, 18, 35, 12, 20]
    ]
  ];

  respond(true, 'Analytics data retrieved', $analytics);
}

respond(false, 'Invalid request');
?>
