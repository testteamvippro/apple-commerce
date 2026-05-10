<?php
require_once __DIR__ . '/config.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  exit(0);
}

function generateId() {
  return 'notif_' . bin2hex(random_bytes(8));
}

$method = $_SERVER['REQUEST_METHOD'];
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?: '/';
$parts = array_values(array_filter(explode('/', trim($path, '/'))));
$notifId = $parts[2] ?? null;
$userId = $_GET['userId'] ?? null;
$input = json_decode(file_get_contents('php://input'), true) ?: [];

try {
  if ($method === 'GET' && !$notifId) {
    if (!$userId) {
      respond(false, 'User ID required');
    }
    respond(true, 'Notifications retrieved', DataStore::getNotifications((string) $userId));
  }

  if ($method === 'GET' && $notifId) {
    $notification = DataStore::findNotificationById((string) $notifId);
    if (!$notification) {
      respond(false, 'Notification not found');
    }
    respond(true, 'Notification retrieved', $notification);
  }

  if ($method === 'POST') {
    if (empty($input['userId'])) {
      respond(false, 'User ID required');
    }

    $notification = DataStore::saveNotification([
      'id' => generateId(),
      'userId' => $input['userId'],
      'title' => $input['title'] ?? 'Notification',
      'message' => $input['message'] ?? '',
      'type' => $input['type'] ?? 'info',
      'read' => false,
      'createdAt' => date('c')
    ]);

    respond(true, 'Notification created', $notification);
  }

  if ($method === 'PUT' && $notifId) {
    if (($input['action'] ?? null) !== 'mark-read') {
      respond(false, 'Invalid action');
    }

    $notification = DataStore::markNotificationRead((string) $notifId);
    if (!$notification) {
      respond(false, 'Notification not found');
    }
    respond(true, 'Notification marked as read', $notification);
  }

  if ($method === 'DELETE' && $notifId) {
    DataStore::deleteNotification((string) $notifId);
    respond(true, 'Notification deleted');
  }

  if ($method === 'DELETE' && !$notifId) {
    if (!$userId) {
      respond(false, 'User ID required');
    }

    DataStore::deleteNotificationsByUser((string) $userId);
    respond(true, 'All notifications deleted');
  }

  respond(false, 'Invalid request');
} catch (Throwable $error) {
  respond(false, $error->getMessage(), null, 500);
}
?>
