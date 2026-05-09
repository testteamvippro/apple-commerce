<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  exit(0);
}

$method = $_SERVER['REQUEST_METHOD'];
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$parts = explode('/', $path);
$userId = isset($parts[4]) ? $parts[4] : null;

$userFile = '../data/users.json';

function loadUsers() {
  global $userFile;
  if (file_exists($userFile)) {
    return json_decode(file_get_contents($userFile), true);
  }
  return [];
}

function saveUsers($data) {
  global $userFile;
  file_put_contents($userFile, json_encode($data, JSON_PRETTY_PRINT));
}

function hashPassword($password) {
  return password_hash($password, PASSWORD_BCRYPT);
}

function verifyPassword($password, $hash) {
  return password_verify($password, $hash);
}

function generateToken() {
  return bin2hex(random_bytes(32));
}

function respond($success, $message, $data = null) {
  echo json_encode(['success' => $success, 'message' => $message, 'data' => $data]);
  exit;
}

// Register
if ($method === 'POST') {
  $input = json_decode(file_get_contents('php://input'), true);
  $action = $input['action'] ?? null;

  if ($action === 'register') {
    $users = loadUsers();

    // Check if email exists
    $emailExists = array_filter($users, function($u) use ($input) {
      return $u['email'] === $input['email'];
    });

    if (!empty($emailExists)) {
      respond(false, 'Email already registered');
    }

    $newUser = [
      'id' => uniqid(),
      'name' => $input['name'],
      'email' => $input['email'],
      'phone' => $input['phone'],
      'password' => $input['password'], // Already hashed from client
      'role' => 'customer',
      'addresses' => [],
      'preferences' => [
        'emailOrders' => true,
        'emailShipments' => true,
        'emailPromo' => true,
        'pushNotifications' => true
      ],
      'createdAt' => date('c'),
      'updatedAt' => date('c')
    ];

    $users[] = $newUser;
    saveUsers($users);

    $token = generateToken();
    $newUser['token'] = $token;
    unset($newUser['password']);

    respond(true, 'User registered successfully', [
      'user' => $newUser,
      'token' => $token
    ]);
  }

  if ($action === 'login') {
    $users = loadUsers();

    // Find user by email
    $user = null;
    foreach ($users as $u) {
      if ($u['email'] === $input['email']) {
        $user = $u;
        break;
      }
    }

    if (!$user) {
      respond(false, 'Email not found');
    }

    // Verify password (comparison with simple hash for demo)
    if ($user['password'] !== $input['password']) {
      respond(false, 'Invalid password');
    }

    $token = generateToken();
    $user['token'] = $token;
    unset($user['password']);

    respond(true, 'Login successful', [
      'user' => $user,
      'token' => $token
    ]);
  }
}

// Get user profile
if ($method === 'GET' && $userId) {
  $users = loadUsers();
  $user = array_filter($users, function($u) use ($userId) {
    return $u['id'] === $userId;
  });

  if (empty($user)) {
    respond(false, 'User not found');
  }

  $user = array_values($user)[0];
  unset($user['password']);

  respond(true, 'User loaded', $user);
}

// Update user profile
if ($method === 'PUT' && $userId) {
  $input = json_decode(file_get_contents('php://input'), true);
  $action = $input['action'] ?? null;
  $users = loadUsers();

  $userIndex = -1;
  $user = null;
  foreach ($users as $idx => $u) {
    if ($u['id'] === $userId) {
      $userIndex = $idx;
      $user = $u;
      break;
    }
  }

  if ($userIndex === -1) {
    respond(false, 'User not found');
  }

  if ($action === 'update-profile') {
    $users[$userIndex]['name'] = $input['name'];
    $users[$userIndex]['email'] = $input['email'];
    $users[$userIndex]['phone'] = $input['phone'];
    if (isset($input['birthDate'])) {
      $users[$userIndex]['birthDate'] = $input['birthDate'];
    }
    $users[$userIndex]['updatedAt'] = date('c');

    saveUsers($users);

    $user = $users[$userIndex];
    unset($user['password']);

    respond(true, 'Profile updated', $user);
  }

  if ($action === 'change-password') {
    if ($users[$userIndex]['password'] !== $input['currentPassword']) {
      respond(false, 'Current password is incorrect');
    }

    $users[$userIndex]['password'] = $input['newPassword'];
    $users[$userIndex]['updatedAt'] = date('c');

    saveUsers($users);
    respond(true, 'Password changed successfully');
  }
}

// Delete user
if ($method === 'DELETE' && $userId) {
  $input = json_decode(file_get_contents('php://input'), true);
  $users = loadUsers();

  $userIndex = -1;
  foreach ($users as $idx => $u) {
    if ($u['id'] === $userId) {
      $userIndex = $idx;
      break;
    }
  }

  if ($userIndex === -1) {
    respond(false, 'User not found');
  }

  // Verify password
  if ($users[$userIndex]['password'] !== $input['password']) {
    respond(false, 'Invalid password');
  }

  array_splice($users, $userIndex, 1);
  saveUsers($users);

  respond(true, 'Account deleted successfully');
}

// Address management
if (strpos($path, '/addresses') !== false) {
  $users = loadUsers();

  $userIndex = -1;
  foreach ($users as $idx => $u) {
    if ($u['id'] === $userId) {
      $userIndex = $idx;
      break;
    }
  }

  if ($userIndex === -1) {
    respond(false, 'User not found');
  }

  // Add address
  if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);

    $address = [
      'id' => uniqid(),
      'address' => $input['address'],
      'city' => $input['city'],
      'zip' => $input['zip'],
      'country' => $input['country'],
      'isDefault' => $input['isDefault'] ?? false
    ];

    if ($address['isDefault']) {
      // Unset other defaults
      foreach ($users[$userIndex]['addresses'] as &$addr) {
        $addr['isDefault'] = false;
      }
    }

    $users[$userIndex]['addresses'][] = $address;
    saveUsers($users);

    respond(true, 'Address added', $users[$userIndex]['addresses']);
  }

  // Delete address
  if ($method === 'DELETE') {
    $addressId = end($parts);
    $users[$userIndex]['addresses'] = array_filter($users[$userIndex]['addresses'], function($a) use ($addressId) {
      return $a['id'] !== $addressId;
    });

    saveUsers($users);
    respond(true, 'Address deleted', array_values($users[$userIndex]['addresses']));
  }
}

respond(false, 'Invalid request');
?>
