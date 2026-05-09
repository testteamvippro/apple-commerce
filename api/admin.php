<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  exit(0);
}

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? null;

$productsFile = '../data/products.json';
$ordersFile = '../data/orders.json';
$usersFile = '../data/users.json';

function loadJSON($file) {
  if (file_exists($file)) {
    return json_decode(file_get_contents($file), true);
  }
  return [];
}

function saveJSON($file, $data) {
  file_put_contents($file, json_encode($data, JSON_PRETTY_PRINT));
}

function respond($success, $message, $data = null) {
  echo json_encode(['success' => $success, 'message' => $message, 'data' => $data]);
  exit;
}

// Get dashboard stats
if ($method === 'GET' && $action === 'stats') {
  $products = loadJSON('../data/products.json');
  $orders = loadJSON('../data/orders.json');
  $users = loadJSON('../data/users.json');

  // Calculate stats
  $stats = [
    'totalProducts' => count($products),
    'totalOrders' => count($orders),
    'totalRevenue' => array_sum(array_column($orders, 'total')),
    'totalUsers' => count($users),
    'recentOrders' => array_slice($orders, -5),
    'topProducts' => array_slice($products, 0, 6)
  ];

  respond(true, 'Stats loaded', $stats);
}

// Get products
if ($method === 'GET' && $action === 'products') {
  $products = loadJSON('../data/products.json');
  respond(true, 'Products loaded', $products);
}

// Get orders
if ($method === 'GET' && $action === 'orders') {
  $orders = loadJSON('../data/orders.json');
  respond(true, 'Orders loaded', $orders);
}

// Add product
if ($method === 'POST') {
  $input = json_decode(file_get_contents('php://input'), true);
  
  if ($input['action'] === 'add-product') {
    $products = loadJSON('../data/products.json');

    $newProduct = [
      'id' => uniqid(),
      'name' => $input['name'],
      'category' => $input['category'],
      'description' => $input['description'] ?? '',
      'price' => $input['price'],
      'stock' => $input['stock'],
      'createdAt' => date('c')
    ];

    $products[] = $newProduct;
    saveJSON('../data/products.json', $products);

    respond(true, 'Product added', $newProduct);
  }
}

// Update product
if ($method === 'PUT') {
  $input = json_decode(file_get_contents('php://input'), true);

  if ($input['action'] === 'update-product') {
    $products = loadJSON('../data/products.json');

    foreach ($products as &$product) {
      if ($product['id'] === $input['id']) {
        $product['name'] = $input['name'];
        $product['category'] = $input['category'];
        $product['description'] = $input['description'];
        $product['price'] = $input['price'];
        $product['stock'] = $input['stock'];
        $product['updatedAt'] = date('c');
        break;
      }
    }

    saveJSON('../data/products.json', $products);
    respond(true, 'Product updated');
  }
}

// Delete product
if ($method === 'DELETE') {
  $input = json_decode(file_get_contents('php://input'), true);
  $productId = $input['id'];

  $products = loadJSON('../data/products.json');
  $products = array_filter($products, function($p) use ($productId) {
    return $p['id'] !== $productId;
  });

  saveJSON('../data/products.json', array_values($products));
  respond(true, 'Product deleted');
}

respond(false, 'Invalid request');
?>
