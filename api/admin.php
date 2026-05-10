<?php
require_once __DIR__ . '/config.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(204);
  exit;
}

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? null;

try {
  if ($method === 'GET' && $action === 'stats') {
    $dbStats   = DataStore::getStats();
    $orders    = DataStore::getOrders();
    $products  = DataStore::getProducts();

    $stats = [
      'totalProducts' => $dbStats['totalProducts'],
      'totalOrders'   => $dbStats['totalOrders'],
      'totalRevenue'  => $dbStats['totalRevenue'],
      'totalUsers'    => $dbStats['totalUsers'],
      'recentOrders'  => array_slice($orders, 0, 5),
      'topProducts'   => array_slice($products, 0, 6),
    ];

    respond(true, 'Stats loaded', $stats);
  }

  if ($method === 'GET' && $action === 'products') {
    respond(true, 'Products loaded', DataStore::getProducts());
  }

  if ($method === 'GET' && $action === 'orders') {
    respond(true, 'Orders loaded', DataStore::getOrders());
  }

  if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true) ?: [];
    if (($input['action'] ?? null) === 'add-product') {
      $quantity = isset($input['quantity']) ? (int) $input['quantity'] : (int) ($input['stock'] ?? 0);
      $newProduct = [
        'id' => $input['id'] ?? uniqid(),
        'name' => $input['name'] ?? 'New Product',
        'category' => $input['category'] ?? '',
        'description' => $input['description'] ?? '',
        'price' => (float) ($input['price'] ?? 0),
        'quantity' => max(0, $quantity),
        'availability' => $input['availability'] ?? null,
        'createdAt' => date('c')
      ];

      foreach (['image', 'brand', 'sku', 'colors', 'storage', 'specs', 'rating', 'reviews', 'discount', 'warranty', 'condition', 'badge', 'gallery', 'variants'] as $field) {
        if (array_key_exists($field, $input)) {
          $newProduct[$field] = $input[$field];
        }
      }

      respond(true, 'Product added', DataStore::saveProduct($newProduct));
    }
  }

  if ($method === 'PUT') {
    $input = json_decode(file_get_contents('php://input'), true) ?: [];
    if (($input['action'] ?? null) === 'update-product') {
      $product = DataStore::findProductById((string) ($input['id'] ?? ''));
      if (!$product) {
        respond(false, 'Product not found', null, 404);
      }

      foreach (['name', 'category', 'description', 'price', 'availability', 'image', 'brand', 'sku', 'colors', 'storage', 'specs', 'rating', 'reviews', 'discount', 'warranty', 'condition', 'badge', 'gallery', 'variants'] as $field) {
        if (array_key_exists($field, $input)) {
          $product[$field] = $input[$field];
        }
      }

      if (isset($input['quantity']) || isset($input['stock'])) {
        $product['quantity'] = isset($input['quantity']) ? (int) $input['quantity'] : (int) $input['stock'];
      }

      $product['updatedAt'] = date('c');
      DataStore::saveProduct($product);
      respond(true, 'Product updated', DataStore::findProductById((string) $product['id']) ?? $product);
    }
  }

  if ($method === 'DELETE') {
    $input = json_decode(file_get_contents('php://input'), true) ?: [];
    DataStore::deleteProduct((string) ($input['id'] ?? ''));
    respond(true, 'Product deleted');
  }

  respond(false, 'Invalid request', null, 400);
} catch (Throwable $error) {
  respond(false, $error->getMessage(), null, 500);
}
?>
