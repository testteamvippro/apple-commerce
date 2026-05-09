<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
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

function saveJSON($filename, $data) {
  global $dataDir;
  if (!is_dir($dataDir)) {
    mkdir($dataDir, 0755, true);
  }
  $filepath = $dataDir . $filename;
  file_put_contents($filepath, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
  return true;
}

function respond($success, $message, $data = null) {
  echo json_encode(['success' => $success, 'message' => $message, 'data' => $data]);
  exit;
}

$method = $_SERVER['REQUEST_METHOD'];
$path = explode('/', trim($_SERVER['REQUEST_URI'], '/'));
$orderId = $path[count($path) - 1] ?? null;
$userId = $_GET['userId'] ?? null;

// GET /api/orders?userId=xxx
if ($method === 'GET' && !$orderId) {
  if (!$userId) {
    respond(false, 'User ID required');
  }

  $orders = loadJSON('orders.json');
  $userOrders = array_filter($orders, function($order) use ($userId) {
    return $order['userId'] === $userId;
  });

  usort($userOrders, function($a, $b) {
    return strtotime($b['createdAt']) - strtotime($a['createdAt']);
  });

  respond(true, 'Orders retrieved', array_values($userOrders));
}

// GET /api/orders/{orderId}
if ($method === 'GET' && $orderId) {
  $orders = loadJSON('orders.json');
  $order = array_values(array_filter($orders, function($o) use ($orderId) {
    return $o['id'] === $orderId;
  }));

  if (empty($order)) {
    respond(false, 'Order not found');
  }

  respond(true, 'Order retrieved', $order[0]);
}

// PUT /api/orders/{orderId}
if ($method === 'PUT' && $orderId) {
  $input = json_decode(file_get_contents('php://input'), true);
  $action = $input['action'] ?? null;

  $orders = loadJSON('orders.json');
  $orderIndex = -1;

  foreach ($orders as $index => $order) {
    if ($order['id'] === $orderId) {
      $orderIndex = $index;
      break;
    }
  }

  if ($orderIndex === -1) {
    respond(false, 'Order not found');
  }

  // Cancel order
  if ($action === 'cancel') {
    if (in_array($orders[$orderIndex]['status'], ['pending', 'processing'])) {
      $orders[$orderIndex]['status'] = 'cancelled';
      $orders[$orderIndex]['cancelledAt'] = date('c');
      saveJSON('orders.json', $orders);
      respond(true, 'Order cancelled', $orders[$orderIndex]);
    } else {
      respond(false, 'Cannot cancel shipped order');
    }
  }

  // Update status
  if ($action === 'update-status') {
    $status = $input['status'] ?? null;
    if (!in_array($status, ['pending', 'processing', 'shipped', 'delivered', 'cancelled'])) {
      respond(false, 'Invalid status');
    }
    $orders[$orderIndex]['status'] = $status;
    
    $statusField = $status . 'Date';
    $orders[$orderIndex][$statusField] = date('c');
    
    saveJSON('orders.json', $orders);
    respond(true, 'Order updated', $orders[$orderIndex]);
  }

  // Update tracking
  if ($action === 'update-tracking') {
    $orders[$orderIndex]['tracking'] = $input['tracking'] ?? '';
    $orders[$orderIndex]['carrier'] = $input['carrier'] ?? '';
    $orders[$orderIndex]['estimatedDelivery'] = $input['estimatedDelivery'] ?? null;
    
    saveJSON('orders.json', $orders);
    respond(true, 'Tracking updated', $orders[$orderIndex]);
  }

  respond(false, 'Invalid action');
}

respond(false, 'Invalid request');
?>
