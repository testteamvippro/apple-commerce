<?php
/**
 * Apple Store VN — Behavioral Tracking API
 * POST /api/track.php
 * Body: { event, params, sessionId, url, userAgent }
 */

require_once __DIR__ . '/config.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('X-Content-Type-Options: nosniff');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$allowedEvents = [
    'view_item', 'add_to_cart', 'filter_products', 'search',
    'scroll_depth', 'time_on_page', 'click_call',
    'begin_checkout', 'purchase', 'page_view'
];

$raw  = file_get_contents('php://input');
$body = json_decode($raw, true);

if (!$body) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid JSON']);
    exit;
}

$event = trim(strip_tags((string)($body['event'] ?? '')));
if (!in_array($event, $allowedEvents, true)) {
    http_response_code(400);
    echo json_encode(['error' => 'Unknown event type']);
    exit;
}

$record = [
    'event' => $event,
    'params' => is_array($body['params']) ? array_slice($body['params'], 0, 20) : [],
    'userId' => substr(strip_tags((string)($body['userId'] ?? '')), 0, 64),
    'sessionId' => substr(strip_tags((string)($body['sessionId'] ?? '')), 0, 64),
    'url' => substr(filter_var($body['url'] ?? '', FILTER_SANITIZE_URL), 0, 300),
    'ip' => hash('sha256', $_SERVER['REMOTE_ADDR'] ?? ''),
    'ts' => date('c'),
];

try {
    DataStore::recordEvent($record);
    echo json_encode(['ok' => true]);
} catch (Throwable $error) {
    http_response_code(500);
    echo json_encode(['error' => $error->getMessage()]);
}
