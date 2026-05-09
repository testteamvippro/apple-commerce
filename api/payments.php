<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  exit(0);
}

$input = json_decode(file_get_contents('php://input'), true);
$action = $input['action'] ?? null;

// Stripe configuration
define('STRIPE_SECRET_KEY', 'sk_test_YOUR_KEY_HERE');
define('STRIPE_API_VERSION', '2020-08-27');

// VNPay configuration
define('VNPAY_MERCHANT_CODE', 'YOUR_MERCHANT_CODE');
define('VNPAY_HASH_SECRET', 'YOUR_HASH_SECRET');
define('VNPAY_PAYMENT_URL', 'https://sandbox.vnpayment.vn/paygate');

function respond($success, $message, $data = null) {
  echo json_encode(['success' => $success, 'message' => $message, 'data' => $data]);
  exit;
}

// Create Stripe payment intent
if ($action === 'create-payment-intent') {
  // For demo purposes, simulate payment intent creation
  $amount = $input['amount'];
  $orderId = $input['orderId'];

  $clientSecret = 'pi_' . bin2hex(random_bytes(16)) . '_secret_' . bin2hex(random_bytes(16));

  respond(true, 'Payment intent created', [
    'clientSecret' => $clientSecret,
    'amount' => $amount,
    'orderId' => $orderId
  ]);
}

// Create VNPay payment URL
if ($action === 'vnpay-create-payment') {
  $amount = $input['amount'];
  $orderId = $input['orderId'];

  $vnp_TxnRef = $orderId;
  $vnp_Amount = $amount * 100;
  $vnp_OrderInfo = "Order " . $orderId;
  $vnp_OrderType = "billpayment";
  $vnp_Locale = "vn";
  $vnp_ExpireDate = date('YmdHis', strtotime('+15 minutes'));
  $vnp_CreateDate = date('YmdHis');
  $vnp_IpAddr = $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';

  $inputData = array(
    "vnp_Version" => "2.1.0",
    "vnp_TmnCode" => VNPAY_MERCHANT_CODE,
    "vnp_Amount" => $vnp_Amount,
    "vnp_Command" => "pay",
    "vnp_CreateDate" => $vnp_CreateDate,
    "vnp_CurrCode" => "VND",
    "vnp_ExpireDate" => $vnp_ExpireDate,
    "vnp_IpAddr" => $vnp_IpAddr,
    "vnp_Locale" => $vnp_Locale,
    "vnp_OrderInfo" => $vnp_OrderInfo,
    "vnp_OrderType" => $vnp_OrderType,
    "vnp_ReturnUrl" => ($input['returnUrl'] ?? "http://localhost/order-confirmation.html"),
    "vnp_TxnRef" => $vnp_TxnRef
  );

  ksort($inputData);
  $query = "";
  $i = 0;
  $hashdata = "";
  foreach ($inputData as $key => $value) {
    if ($i == 1) {
      $hashdata .= "&" . urlencode($key) . "=" . urlencode($value);
    } else {
      $hashdata .= urlencode($key) . "=" . urlencode($value);
      $i = 1;
    }
    $query .= urlencode($key) . "=" . urlencode($value) . '&';
  }

  $vnp_SecureHash = hash_hmac('sha512', $hashdata, VNPAY_HASH_SECRET);
  $vnp_PayUrl = VNPAY_PAYMENT_URL . "?" . $query . 'vnp_SecureHash=' . $vnp_SecureHash;

  respond(true, 'Payment URL created', [
    'paymentUrl' => $vnp_PayUrl
  ]);
}

// Verify VNPay callback
if ($action === 'vnpay-verify') {
  $params = $input['params'];
  $vnp_SecureHash = $params['vnp_SecureHash'];
  
  unset($params['vnp_SecureHash']);
  unset($params['vnp_SecureHashType']);

  ksort($params);
  $hashdata = "";
  foreach ($params as $key => $value) {
    if ($hashdata == "") {
      $hashdata .= urlencode($key) . "=" . urlencode($value);
    } else {
      $hashdata .= "&" . urlencode($key) . "=" . urlencode($value);
    }
  }

  $secureHash = hash_hmac('sha512', $hashdata, VNPAY_HASH_SECRET);
  
  if ($secureHash == $vnp_SecureHash) {
    if ($params['vnp_ResponseCode'] == '00') {
      respond(true, 'Payment successful', [
        'transactionId' => $params['vnp_TransactionNo'],
        'orderId' => $params['vnp_TxnRef']
      ]);
    } else {
      respond(false, 'Payment failed', ['code' => $params['vnp_ResponseCode']]);
    }
  } else {
    respond(false, 'Invalid signature');
  }
}

respond(false, 'Invalid action');
?>
