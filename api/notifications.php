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

function generateId() {
  return 'notif_' . bin2hex(random_bytes(8));
}

$method = $_SERVER['REQUEST_METHOD'];
$path = explode('/', trim($_SERVER['REQUEST_URI'], '/'));
$notifId = $path[count($path) - 1] ?? null;
$userId = $_GET['userId'] ?? null;
$input = json_decode(file_get_contents('php://input'), true);

// GET /api/notifications?userId=xxx
if ($method === 'GET' && !$notifId) {
  if (!$userId) {
    respond(false, 'User ID required');
  }

  $notifications = loadJSON('notifications.json');
  $userNotifications = array_filter($notifications, function($n) use ($userId) {
    return $n['userId'] === $userId;
  });

  usort($userNotifications, function($a, $b) {
    return strtotime($b['createdAt']) - strtotime($a['createdAt']);
  });

  respond(true, 'Notifications retrieved', array_values($userNotifications));
}

// GET /api/notifications/{notifId}
if ($method === 'GET' && $notifId) {
  $notifications = loadJSON('notifications.json');
  $notification = array_values(array_filter($notifications, function($n) use ($notifId) {
    return $n['id'] === $notifId;
  }));

  if (empty($notification)) {
    respond(false, 'Notification not found');
  }

  respond(true, 'Notification retrieved', $notification[0]);
}

// POST /api/notifications
if ($method === 'POST') {
  $userId = $input['userId'] ?? null;
  $title = $input['title'] ?? 'Notification';
  $message = $input['message'] ?? '';
  $type = $input['type'] ?? 'info';

  if (!$userId) {
    respond(false, 'User ID required');
  }

  $notification = [
    'id' => generateId(),
    'userId' => $userId,
    'title' => $title,
    'message' => $message,
    'type' => $type,
    'read' => false,
    'createdAt' => date('c'),
    'updatedAt' => date('c')
  ];

  $notifications = loadJSON('notifications.json');
  $notifications[] = $notification;
  saveJSON('notifications.json', $notifications);

  respond(true, 'Notification created', $notification);
}

// PUT /api/notifications/{notifId}
if ($method === 'PUT' && $notifId) {
  $action = $input['action'] ?? null;

  $notifications = loadJSON('notifications.json');
  $notifIndex = -1;

  foreach ($notifications as $index => $n) {
    if ($n['id'] === $notifId) {
      $notifIndex = $index;
      break;
    }
  }

  if ($notifIndex === -1) {
    respond(false, 'Notification not found');
  }

  if ($action === 'mark-read') {
    $notifications[$notifIndex]['read'] = true;
    $notifications[$notifIndex]['updatedAt'] = date('c');
    saveJSON('notifications.json', $notifications);
    respond(true, 'Notification marked as read', $notifications[$notifIndex]);
  }

  respond(false, 'Invalid action');
}

// DELETE /api/notifications/{notifId}
if ($method === 'DELETE' && $notifId) {
  $notifications = loadJSON('notifications.json');
  $filteredNotifications = array_filter($notifications, function($n) use ($notifId) {
    return $n['id'] !== $notifId;
  });

  saveJSON('notifications.json', array_values($filteredNotifications));
  respond(true, 'Notification deleted');
}

// DELETE /api/notifications?userId=xxx (delete all)
if ($method === 'DELETE' && !$notifId) {
  if (!$userId) {
    respond(false, 'User ID required');
  }

  $notifications = loadJSON('notifications.json');
  $filteredNotifications = array_filter($notifications, function($n) use ($userId) {
    return $n['userId'] !== $userId;
  });

  saveJSON('notifications.json', array_values($filteredNotifications));
  respond(true, 'All notifications deleted');
}

respond(false, 'Invalid request');
?>
