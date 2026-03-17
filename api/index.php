<?php
/**
 * Mirror Studio API Router
 *
 * Routes:
 *   POST /api/auth/register
 *   POST /api/auth/login
 *   POST /api/auth/logout
 *   GET  /api/auth/me
 *
 *   GET    /api/projects
 *   POST   /api/projects
 *   PUT    /api/projects/{id}
 *   DELETE /api/projects/{id}
 *
 *   GET    /api/projects/{id}/files          - List all files (recursive with folders)
 *   GET    /api/projects/{id}/files/{path}   - Get file content (supports paths)
 *   PUT    /api/projects/{id}/files/{path}   - Create/update file (supports paths)
 *   DELETE /api/projects/{id}/files/{path}   - Delete file (supports paths)
 *
 *   POST   /api/projects/{id}/folders        - Create folder { name, parent? }
 *   DELETE /api/projects/{id}/folders/{path} - Delete folder (?force=true for non-empty)
 */

// Error reporting for development
error_reporting(E_ALL);
ini_set('display_errors', 0);

// CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json');

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Start session
session_start();

// Data directory (outside web root ideally)
define('DATA_DIR', __DIR__ . '/../data');
define('USERS_FILE', DATA_DIR . '/users.json');
define('PROJECTS_DIR', DATA_DIR . '/projects');

// Ensure data directories exist
if (!file_exists(DATA_DIR)) {
    mkdir(DATA_DIR, 0755, true);
}
if (!file_exists(PROJECTS_DIR)) {
    mkdir(PROJECTS_DIR, 0755, true);
}
if (!file_exists(USERS_FILE)) {
    file_put_contents(USERS_FILE, json_encode(['users' => []]));
}

// Include handlers
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/projects.php';
require_once __DIR__ . '/files.php';

// Get request info
$method = $_SERVER['REQUEST_METHOD'];
$uri = $_SERVER['REQUEST_URI'];

// Remove query string and extract path after /api
$uri = parse_url($uri, PHP_URL_PATH);
// Handle any prefix before /api (e.g., /mirror/studio/api/...)
$uri = preg_replace('#^.*/api#', '', $uri);
$uri = rtrim($uri, '/');
if (empty($uri)) $uri = '/';

// Parse JSON body
$body = json_decode(file_get_contents('php://input'), true) ?? [];

// Route the request
try {
    // Auth routes
    if (preg_match('#^/auth/register$#', $uri) && $method === 'POST') {
        echo json_encode(authRegister($body));
        exit;
    }

    if (preg_match('#^/auth/login$#', $uri) && $method === 'POST') {
        echo json_encode(authLogin($body));
        exit;
    }

    if (preg_match('#^/auth/logout$#', $uri) && $method === 'POST') {
        echo json_encode(authLogout());
        exit;
    }

    if (preg_match('#^/auth/me$#', $uri) && $method === 'GET') {
        echo json_encode(authMe());
        exit;
    }

    // Session status (works for anonymous users too)
    if (preg_match('#^/auth/status$#', $uri) && $method === 'GET') {
        echo json_encode(authStatus());
        exit;
    }

    // Reset test user (development only)
    if (preg_match('#^/auth/reset-test$#', $uri) && $method === 'POST') {
        echo json_encode(resetTestUser());
        exit;
    }

    // User settings
    if (preg_match('#^/auth/settings$#', $uri) && $method === 'GET') {
        echo json_encode(authGetSettings());
        exit;
    }

    if (preg_match('#^/auth/settings$#', $uri) && $method === 'PUT') {
        echo json_encode(authSaveSettings($body));
        exit;
    }

    // Project routes
    if (preg_match('#^/projects$#', $uri) && $method === 'GET') {
        echo json_encode(getProjects());
        exit;
    }

    if (preg_match('#^/projects$#', $uri) && $method === 'POST') {
        echo json_encode(createProject($body));
        exit;
    }

    if (preg_match('#^/projects/([^/]+)$#', $uri, $matches) && $method === 'PUT') {
        echo json_encode(updateProject($matches[1], $body));
        exit;
    }

    if (preg_match('#^/projects/([^/]+)$#', $uri, $matches) && $method === 'DELETE') {
        echo json_encode(deleteProject($matches[1]));
        exit;
    }

    // File routes
    if (preg_match('#^/projects/([^/]+)/files$#', $uri, $matches) && $method === 'GET') {
        echo json_encode(getFiles($matches[1]));
        exit;
    }

    if (preg_match('#^/projects/([^/]+)/files/(.+)$#', $uri, $matches) && $method === 'GET') {
        echo json_encode(getFile($matches[1], urldecode($matches[2])));
        exit;
    }

    if (preg_match('#^/projects/([^/]+)/files/(.+)$#', $uri, $matches) && $method === 'PUT') {
        echo json_encode(putFile($matches[1], urldecode($matches[2]), $body));
        exit;
    }

    if (preg_match('#^/projects/([^/]+)/files/(.+)$#', $uri, $matches) && $method === 'DELETE') {
        echo json_encode(deleteFile($matches[1], urldecode($matches[2])));
        exit;
    }

    // Folder routes
    if (preg_match('#^/projects/([^/]+)/folders$#', $uri, $matches) && $method === 'POST') {
        echo json_encode(createFolder($matches[1], $body));
        exit;
    }

    if (preg_match('#^/projects/([^/]+)/folders/(.+)$#', $uri, $matches) && $method === 'DELETE') {
        echo json_encode(deleteFolder($matches[1], urldecode($matches[2])));
        exit;
    }

    // 404
    http_response_code(404);
    echo json_encode(['error' => 'Not found', 'uri' => $uri, 'method' => $method]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
