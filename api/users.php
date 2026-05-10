<?php
require_once __DIR__ . '/config.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  exit(0);
}

$method = $_SERVER['REQUEST_METHOD'];
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?: '/';
$parts = array_values(array_filter(explode('/', trim($path, '/'))));
$userId = $parts[2] ?? null;
$subResource = $parts[3] ?? null;
$subResourceId = $parts[4] ?? null;

function generateToken() {
  return bin2hex(random_bytes(32));
}

try {
  if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true) ?: [];
    $action = $input['action'] ?? null;

    if ($action === 'register') {
      if (DataStore::findUserByEmail((string) ($input['email'] ?? ''), true)) {
        respond(false, 'Email already registered');
      }

      $rawPassword = (string) ($input['password'] ?? '');
      if (strlen($rawPassword) < 6) {
        respond(false, 'Password must be at least 6 characters');
      }

      $newUser = DataStore::saveUser([
        'id' => uniqid(),
        'name' => $input['name'] ?? '',
        'email' => $input['email'] ?? '',
        'phone' => $input['phone'] ?? '',
        'password' => password_hash($rawPassword, PASSWORD_BCRYPT),
        'role' => 'customer',
        'addresses' => [],
        'preferences' => [
          'emailOrders' => true,
          'emailShipments' => true,
          'emailPromo' => true,
          'pushNotifications' => true
        ],
        'createdAt' => date('c')
      ]);

      $token = generateToken();
      unset($newUser['password']);
      $newUser['token'] = $token;

      respond(true, 'User registered successfully', [
        'user' => $newUser,
        'token' => $token
      ]);
    }

    if ($action === 'login') {
      $user = DataStore::findUserByEmail((string) ($input['email'] ?? ''), true);
      if (!$user) {
        respond(false, 'Email not found');
      }

      if (!password_verify((string) ($input['password'] ?? ''), (string) ($user['password'] ?? ''))) {
        respond(false, 'Invalid password');
      }

      $token = generateToken();
      unset($user['password']);
      $user['token'] = $token;

      respond(true, 'Login successful', [
        'user' => $user,
        'token' => $token
      ]);
    }
  }

  if ($subResource === 'addresses') {
    $user = DataStore::findUserById((string) $userId, true);
    if (!$user) {
      respond(false, 'User not found');
    }

    $user['addresses'] = is_array($user['addresses'] ?? null) ? $user['addresses'] : [];

    if ($method === 'POST') {
      $input = json_decode(file_get_contents('php://input'), true) ?: [];
      $address = [
        'id' => uniqid(),
        'address' => $input['address'] ?? '',
        'city' => $input['city'] ?? '',
        'zip' => $input['zip'] ?? '',
        'country' => $input['country'] ?? '',
        'isDefault' => $input['isDefault'] ?? false
      ];

      if ($address['isDefault']) {
        foreach ($user['addresses'] as &$savedAddress) {
          $savedAddress['isDefault'] = false;
        }
        unset($savedAddress);
      }

      $user['addresses'][] = $address;
      $user['updatedAt'] = date('c');
      DataStore::saveUser($user);

      respond(true, 'Address added', array_values($user['addresses']));
    }

    if ($method === 'DELETE' && $subResourceId) {
      $user['addresses'] = array_values(array_filter($user['addresses'], function($address) use ($subResourceId) {
        return ($address['id'] ?? '') !== $subResourceId;
      }));
      $user['updatedAt'] = date('c');
      DataStore::saveUser($user);

      respond(true, 'Address deleted', $user['addresses']);
    }

    respond(false, 'Invalid address request');
  }

  if ($method === 'GET' && $userId && !$subResource) {
    $user = DataStore::findUserById((string) $userId);
    if (!$user) {
      respond(false, 'User not found');
    }

    respond(true, 'User loaded', $user);
  }

  if ($method === 'PUT' && $userId && !$subResource) {
    $input = json_decode(file_get_contents('php://input'), true) ?: [];
    $action = $input['action'] ?? null;
    $user = DataStore::findUserById((string) $userId, true);

    if (!$user) {
      respond(false, 'User not found');
    }

    if ($action === 'update-profile') {
      $user['name'] = $input['name'] ?? $user['name'];
      $user['email'] = $input['email'] ?? $user['email'];
      $user['phone'] = $input['phone'] ?? $user['phone'];
      if (isset($input['birthDate'])) {
        $user['birthDate'] = $input['birthDate'];
      }
      $user['updatedAt'] = date('c');

      $savedUser = DataStore::saveUser($user);
      unset($savedUser['password']);
      respond(true, 'Profile updated', $savedUser);
    }

    if ($action === 'change-password') {
      if (!password_verify((string) ($input['currentPassword'] ?? ''), (string) ($user['password'] ?? ''))) {
        respond(false, 'Current password is incorrect');
      }

      $newRaw = (string) ($input['newPassword'] ?? '');
      if (strlen($newRaw) < 6) {
        respond(false, 'New password must be at least 6 characters');
      }

      $user['password'] = password_hash($newRaw, PASSWORD_BCRYPT);
      $user['updatedAt'] = date('c');
      DataStore::saveUser($user);
      respond(true, 'Password changed successfully');
    }
  }

  if ($method === 'DELETE' && $userId && !$subResource) {
    $input = json_decode(file_get_contents('php://input'), true) ?: [];
    $user = DataStore::findUserById((string) $userId, true);

    if (!$user) {
      respond(false, 'User not found');
    }

    if (!password_verify((string) ($input['password'] ?? ''), (string) ($user['password'] ?? ''))) {
      respond(false, 'Invalid password');
    }

    DataStore::deleteUser((string) $userId);
    respond(true, 'Account deleted successfully');
  }

  respond(false, 'Invalid request');
} catch (Throwable $error) {
  respond(false, $error->getMessage(), null, 500);
}
?>
