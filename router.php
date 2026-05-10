<?php

$requestPath = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$fullPath = __DIR__ . $requestPath;

if ($requestPath !== '/' && is_file($fullPath)) {
    return false;
}

if (str_starts_with($requestPath, '/api/') && !str_ends_with($requestPath, '.php')) {
    $segments = array_values(array_filter(explode('/', trim($requestPath, '/'))));
    $resource = $segments[1] ?? '';

    $routes = [
        'admin' => __DIR__ . '/api/admin.php',
        'analytics' => __DIR__ . '/api/analytics.php',
        'notifications' => __DIR__ . '/api/notifications.php',
        'orders' => __DIR__ . '/api/orders-extended.php',
        'products' => __DIR__ . '/api/products.php',
        'track' => __DIR__ . '/api/track.php',
        'users' => __DIR__ . '/api/users.php',
    ];

    $target = $routes[$resource] ?? null;
    if ($target === null) {
        http_response_code(404);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['success' => false, 'message' => 'API endpoint not found']);
        return true;
    }

    require $target;
    return true;
}

return false;