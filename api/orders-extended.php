<?php
require_once __DIR__ . '/config.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  exit(0);
}

function loadProductsCatalog() {
  return DataStore::getProducts();
}

function saveProductsCatalog($products) {
  foreach ($products as $product) {
    DataStore::saveProduct($product);
  }
}

function getProductQuantity($product) {
  if (isset($product['quantity'])) {
    return max(0, (int) $product['quantity']);
  }

  if (isset($product['stock'])) {
    return max(0, (int) $product['stock']);
  }

  return 20;
}

function syncProductAvailability(&$product) {
  $quantity = getProductQuantity($product);
  $product['quantity'] = $quantity;

  if ($quantity <= 0) {
    $product['availability'] = 'out-of-stock';
  } elseif ($quantity < 5) {
    $product['availability'] = 'low-stock';
  } else {
    $product['availability'] = 'in-stock';
  }
}

function createNotification($userId, $title, $message, $type = 'info') {
  if (!$userId) {
    return;
  }

  DataStore::saveNotification([
    'id' => uniqid('notif_'),
    'userId' => $userId,
    'title' => $title,
    'message' => $message,
    'type' => $type,
    'read' => false,
    'createdAt' => date('c')
  ]);
}

function findProductIndex($products, $productId) {
  foreach ($products as $index => $product) {
    if ((string) ($product['id'] ?? '') === (string) $productId) {
      return $index;
    }
  }

  return -1;
}

function reserveStockForOrder(&$order, &$products) {
  if (!empty($order['stockReserved'])) {
    return ['ok' => true, 'shortages' => []];
  }

  $shortages = [];

  foreach (($order['items'] ?? []) as $item) {
    $productIndex = findProductIndex($products, $item['id'] ?? null);
    if ($productIndex === -1) {
      $shortages[] = [
        'productId' => $item['id'] ?? null,
        'name' => $item['name'] ?? 'Unknown product',
        'requested' => (int) ($item['quantity'] ?? 0),
        'available' => 0
      ];
      continue;
    }

    $available = getProductQuantity($products[$productIndex]);
    $requested = max(0, (int) ($item['quantity'] ?? 0));
    if ($available < $requested) {
      $shortages[] = [
        'productId' => $item['id'] ?? null,
        'name' => $item['name'] ?? ($products[$productIndex]['name'] ?? 'Unknown product'),
        'requested' => $requested,
        'available' => $available
      ];
    }
  }

  if (!empty($shortages)) {
    return ['ok' => false, 'shortages' => $shortages];
  }

  foreach (($order['items'] ?? []) as $item) {
    $productIndex = findProductIndex($products, $item['id'] ?? null);
    if ($productIndex === -1) {
      continue;
    }

    $products[$productIndex]['quantity'] = getProductQuantity($products[$productIndex]) - max(0, (int) ($item['quantity'] ?? 0));
    syncProductAvailability($products[$productIndex]);
  }

  $order['stockReserved'] = true;
  $order['stockReservedAt'] = date('c');
  return ['ok' => true, 'shortages' => []];
}

function restoreStockForOrder(&$order, &$products) {
  if (empty($order['stockReserved'])) {
    return;
  }

  foreach (($order['items'] ?? []) as $item) {
    $productIndex = findProductIndex($products, $item['id'] ?? null);
    if ($productIndex === -1) {
      continue;
    }

    $products[$productIndex]['quantity'] = getProductQuantity($products[$productIndex]) + max(0, (int) ($item['quantity'] ?? 0));
    syncProductAvailability($products[$productIndex]);
  }

  $order['stockReserved'] = false;
  $order['stockReleasedAt'] = date('c');
}

function applyCancellation(&$order, &$products, $reason = '') {
  if (!in_array($order['status'] ?? '', ['pending', 'processing'], true)) {
    return ['ok' => false, 'message' => 'Cannot cancel shipped order'];
  }

  restoreStockForOrder($order, $products);
  $order['status'] = 'cancelled';
  $order['cancelledAt'] = date('c');
  $order['cancellationReason'] = $reason ?: 'Cancelled by admin';
  $order['customerUpdateMessage'] = $order['cancellationReason'];

  createNotification(
    $order['userId'] ?? null,
    'Order Cancelled',
    'Your order #' . ($order['id'] ?? '') . ' was cancelled. Reason: ' . $order['cancellationReason'],
    'error'
  );

  return ['ok' => true, 'message' => 'Order cancelled'];
}

function validateTransition($currentStatus, $nextStatus) {
  if ($currentStatus === $nextStatus) {
    return true;
  }

  $allowedTransitions = [
    'pending' => ['processing', 'cancelled'],
    'processing' => ['shipped', 'cancelled'],
    'shipped' => ['delivered'],
    'delivered' => [],
    'cancelled' => []
  ];

  return in_array($nextStatus, $allowedTransitions[$currentStatus] ?? [], true);
}

function notifyForStatusChange($order, $status) {
  $orderId = $order['id'] ?? '';
  if ($status === 'processing') {
    createNotification($order['userId'] ?? null, 'Order Confirmed', 'Your order #' . $orderId . ' has been confirmed and is now being prepared.', 'success');
  } elseif ($status === 'shipped') {
    $tracking = trim((string) ($order['tracking'] ?? ''));
    $message = 'Your order #' . $orderId . ' is on the way.';
    if ($tracking !== '') {
      $message .= ' Tracking: ' . $tracking;
    }
    createNotification($order['userId'] ?? null, 'Order Shipped', $message, 'info');
  } elseif ($status === 'delivered') {
    createNotification($order['userId'] ?? null, 'Order Delivered', 'Your order #' . $orderId . ' has been marked as delivered. Enjoy your purchase.', 'success');
  }
}

$method = $_SERVER['REQUEST_METHOD'];
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?: '/';
$parts = array_values(array_filter(explode('/', trim($path, '/'))));
$orderId = $parts[2] ?? null;
$userId = $_GET['userId'] ?? null;

try {
  if ($method === 'GET' && !$orderId) {
    if (!$userId) {
      respond(false, 'User ID required');
    }

    respond(true, 'Orders retrieved', DataStore::getOrders(['userId' => $userId]));
  }

  if ($method === 'GET' && $orderId) {
    $order = DataStore::findOrderById((string) $orderId);
    if (!$order) {
      respond(false, 'Order not found');
    }

    respond(true, 'Order retrieved', $order);
  }

  if ($method === 'PUT' && $orderId) {
    $input = json_decode(file_get_contents('php://input'), true) ?: [];
    $action = $input['action'] ?? null;
    $order = DataStore::findOrderById((string) $orderId);
    $products = loadProductsCatalog();

    if (!$order) {
      respond(false, 'Order not found');
    }

    if ($action === 'cancel') {
      $reason = trim((string) ($input['reason'] ?? ''));
      $cancelResult = applyCancellation($order, $products, $reason);
      if (!$cancelResult['ok']) {
        respond(false, $cancelResult['message']);
      }

      saveProductsCatalog($products);
      $order = DataStore::saveOrder($order);
      respond(true, $cancelResult['message'], $order);
    }

    if ($action === 'update-status') {
      $status = $input['status'] ?? null;
      if (!in_array($status, ['pending', 'processing', 'shipped', 'delivered', 'cancelled'], true)) {
        respond(false, 'Invalid status');
      }

      $currentStatus = $order['status'] ?? 'pending';
      if (!validateTransition($currentStatus, $status)) {
        respond(false, 'Invalid status transition');
      }

      if ($status === 'cancelled') {
        $reason = trim((string) ($input['reason'] ?? ''));
        $cancelResult = applyCancellation($order, $products, $reason ?: 'Cancelled during admin review');
        if (!$cancelResult['ok']) {
          respond(false, $cancelResult['message']);
        }

        saveProductsCatalog($products);
        $order = DataStore::saveOrder($order);
        respond(true, $cancelResult['message'], $order);
      }

      if ($status === 'processing') {
        $reservation = reserveStockForOrder($order, $products);
        if (!$reservation['ok']) {
          respond(false, 'Insufficient stock to confirm this order', [
            'code' => 'OUT_OF_STOCK',
            'shortages' => $reservation['shortages']
          ]);
        }
      }

      $order['status'] = $status;
      $statusField = $status . 'Date';
      $order[$statusField] = date('c');
      $order['updatedAt'] = date('c');
      $order['customerUpdateMessage'] = $input['customerMessage'] ?? null;

      saveProductsCatalog($products);
      $order = DataStore::saveOrder($order);
      notifyForStatusChange($order, $status);
      respond(true, 'Order updated', $order);
    }

    if ($action === 'update-tracking') {
      $order['tracking'] = $input['tracking'] ?? '';
      $order['carrier'] = $input['carrier'] ?? '';
      $order['estimatedDelivery'] = $input['estimatedDelivery'] ?? null;

      $order = DataStore::saveOrder($order);
      createNotification(
        $order['userId'] ?? null,
        'Tracking Updated',
        'Tracking information for order #' . ($order['id'] ?? '') . ' has been updated.',
        'info'
      );
      respond(true, 'Tracking updated', $order);
    }

    respond(false, 'Invalid action');
  }

  respond(false, 'Invalid request');
} catch (Throwable $error) {
  respond(false, $error->getMessage(), null, 500);
}
?>
