<?php
/**
 * Apple Store VN — Behavioral Tracking API
 * POST /api/track.php
 * Body: { event, params, sessionId, url, userAgent }
 */

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
if (!in_array($event, $allowedEvents)) {
    http_response_code(400);
    echo json_encode(['error' => 'Unknown event type']);
    exit;
}

$eventsFile = __DIR__ . '/../data/events.json';
$dir = dirname($eventsFile);
if (!is_dir($dir)) mkdir($dir, 0755, true);

// Build safe event record
$record = [
    'event'     => $event,
    'params'    => is_array($body['params']) ? array_slice($body['params'], 0, 20) : [],
    'sessionId' => substr(strip_tags((string)($body['sessionId'] ?? '')), 0, 64),
    'url'       => substr(filter_var($body['url'] ?? '', FILTER_SANITIZE_URL), 0, 300),
    'ip'        => hash('sha256', $_SERVER['REMOTE_ADDR'] ?? ''),  // hashed for privacy
    'ts'        => date('c'),
];

// Append-safe write with file locking
$fp = fopen($eventsFile, 'c+');
if (!$fp) {
    http_response_code(500);
    echo json_encode(['error' => 'Cannot write events']);
    exit;
}

if (flock($fp, LOCK_EX)) {
    $json   = stream_get_contents($fp) ?: '[]';
    $events = json_decode($json, true) ?: [];

    // Keep max 50 000 events — drop oldest 10% when full
    if (count($events) >= 50000) {
        $events = array_slice($events, 5000);
    }

    $events[] = $record;

    ftruncate($fp, 0);
    rewind($fp);
    fwrite($fp, json_encode($events, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
    fflush($fp);
    flock($fp, LOCK_UN);
}
fclose($fp);

echo json_encode(['ok' => true]);
