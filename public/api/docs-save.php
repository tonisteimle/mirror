<?php
/**
 * Save documentation to server
 * Protected endpoint - requires password
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Admin-Key');

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Only allow POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

// Check admin key
$adminKey = $_SERVER['HTTP_X_ADMIN_KEY'] ?? '';
$validKey = getenv('MIRROR_ADMIN_KEY') ?: 'mirror-docs-2024'; // Default for development

if ($adminKey !== $validKey) {
    http_response_code(401);
    echo json_encode(['error' => 'Invalid admin key']);
    exit;
}

// Get request body
$input = file_get_contents('php://input');
$data = json_decode($input, true);

if (!$data) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid JSON']);
    exit;
}

// Ensure data directory exists
$dataDir = __DIR__ . '/../data';
if (!is_dir($dataDir)) {
    mkdir($dataDir, 0755, true);
}

// Save documentation
$docsFile = $dataDir . '/mirror-docs.json';

// Create backup before overwriting
if (file_exists($docsFile)) {
    $backupFile = $dataDir . '/mirror-docs.backup.' . date('Y-m-d-His') . '.json';
    copy($docsFile, $backupFile);

    // Keep only last 10 backups
    $backups = glob($dataDir . '/mirror-docs.backup.*.json');
    if (count($backups) > 10) {
        usort($backups, function($a, $b) {
            return filemtime($a) - filemtime($b);
        });
        $toDelete = array_slice($backups, 0, count($backups) - 10);
        foreach ($toDelete as $file) {
            unlink($file);
        }
    }
}

// Write new file
$success = file_put_contents($docsFile, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

if ($success === false) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to save documentation']);
    exit;
}

echo json_encode([
    'success' => true,
    'timestamp' => date('c'),
    'size' => strlen($input)
]);
