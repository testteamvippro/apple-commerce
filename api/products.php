<?php
/**
 * Apple Store VN — Products API
 * GET /api/products.php
 * Query params: cat, condition, minPrice, maxPrice, region, storage, search, sort, page, limit
 */

require_once __DIR__ . '/config.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');
header('X-Content-Type-Options: nosniff');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

// ── Read & sanitize query params ──────────────────────────────────────────────
$cat       = trim(strip_tags($_GET['cat']       ?? ''));
$condition = trim(strip_tags($_GET['condition'] ?? ''));
$search    = trim(strip_tags($_GET['search']    ?? ''));
$sort      = in_array($_GET['sort'] ?? '', ['price_asc','price_desc','name_asc','newest']) ? $_GET['sort'] : '';
$region    = trim(strip_tags($_GET['region']    ?? ''));
$storage   = trim(strip_tags($_GET['storage']   ?? ''));
$minPrice  = isset($_GET['minPrice']) ? (float)$_GET['minPrice'] : null;
$maxPrice  = isset($_GET['maxPrice']) ? (float)$_GET['maxPrice'] : null;
$page      = max(1, (int)($_GET['page']  ?? 1));
$limit     = min(100, max(1, (int)($_GET['limit'] ?? 20)));

// ── Helpers ───────────────────────────────────────────────────────────────────
function getPriceRange(array $p): array {
    if (empty($p['variants'])) return ['min' => $p['price'], 'max' => $p['price']];
    $prices = array_column($p['variants'], 'price');
    return ['min' => min($prices), 'max' => max($prices)];
}

try {
    $list = DataStore::getProducts();

    if ($cat) {
        $list = array_values(array_filter($list, fn($p) => ($p['category'] ?? '') === $cat));
    }
    if ($condition) {
        $list = array_values(array_filter($list, fn($p) => ($p['condition'] ?? '') === $condition));
    }
    if ($search) {
        $q = strtolower($search);
        $list = array_values(array_filter($list, fn($p) =>
            str_contains(strtolower($p['name'] ?? ''), $q) ||
            str_contains(strtolower($p['category'] ?? ''), $q)
        ));
    }
    if ($region) {
        $list = array_values(array_filter($list, function($p) use ($region) {
            if (empty($p['variants'])) return true;
            foreach ($p['variants'] as $v) {
                if (($v['region'] ?? '') === $region) return true;
            }
            return false;
        }));
    }
    if ($storage) {
        $list = array_values(array_filter($list, function($p) use ($storage) {
            if (empty($p['variants'])) return true;
            foreach ($p['variants'] as $v) {
                if (($v['storage'] ?? '') === $storage) return true;
            }
            return false;
        }));
    }
    if ($minPrice !== null) {
        $list = array_values(array_filter($list, fn($p) => getPriceRange($p)['max'] >= $minPrice));
    }
    if ($maxPrice !== null) {
        $list = array_values(array_filter($list, fn($p) => getPriceRange($p)['min'] <= $maxPrice));
    }

    if ($sort === 'price_asc') {
        usort($list, fn($a, $b) => getPriceRange($a)['min'] <=> getPriceRange($b)['min']);
    } elseif ($sort === 'price_desc') {
        usort($list, fn($a, $b) => getPriceRange($b)['max'] <=> getPriceRange($a)['max']);
    } elseif ($sort === 'name_asc') {
        usort($list, fn($a, $b) => strcmp($a['name'] ?? '', $b['name'] ?? ''));
    } elseif ($sort === 'newest') {
        usort($list, fn($a, $b) => (($b['badge'] ?? '') === 'New' ? 1 : 0) <=> (($a['badge'] ?? '') === 'New' ? 1 : 0));
    }

    $total = count($list);
    $pages = (int) ceil($total / $limit);
    $offset = ($page - 1) * $limit;
    $items = array_slice($list, $offset, $limit);
    $items = array_map(function($p) {
        $p['priceRange'] = getPriceRange($p);
        return $p;
    }, $items);

    echo json_encode([
        'data' => $items,
        'pagination' => ['page' => $page, 'limit' => $limit, 'total' => $total, 'pages' => $pages],
        'filters' => ['cat' => $cat, 'condition' => $condition, 'search' => $search]
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
} catch (Throwable $error) {
    http_response_code(500);
    echo json_encode(['error' => $error->getMessage()], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}
