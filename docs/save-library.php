<?php
/**
 * Mirror Project Save/Load Service
 *
 * Supports multiple projects via project ID:
 * - GET ?id=xyz     - Load project xyz
 * - POST ?id=xyz    - Save project xyz (with backup)
 * - GET ?list=1     - List all projects
 * - GET ?history=xyz - List backups for project xyz
 *
 * Default project ID: "default"
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$projectsDir = __DIR__ . '/projects';
$backupDir = __DIR__ . '/project-backups';

// Create directories
if (!is_dir($projectsDir)) {
    mkdir($projectsDir, 0755, true);
}
if (!is_dir($backupDir)) {
    mkdir($backupDir, 0755, true);
}

// Get project ID (sanitize to alphanumeric + dash)
$projectId = isset($_GET['id']) ? preg_replace('/[^a-zA-Z0-9\-]/', '', $_GET['id']) : 'default';
$projectFile = $projectsDir . '/' . $projectId . '.json';

// === LIST ALL PROJECTS ===
if (isset($_GET['list'])) {
    $projects = [];
    $files = glob($projectsDir . '/*.json');
    foreach ($files as $file) {
        $id = basename($file, '.json');
        $data = json_decode(file_get_contents($file), true);
        $projects[] = [
            'id' => $id,
            'savedAt' => $data['savedAt'] ?? null,
            'size' => filesize($file),
        ];
    }
    // Sort by savedAt descending
    usort($projects, function($a, $b) {
        return strcmp($b['savedAt'] ?? '', $a['savedAt'] ?? '');
    });
    echo json_encode(['projects' => $projects]);
    exit;
}

// === LIST PROJECT HISTORY ===
if (isset($_GET['history'])) {
    $historyId = preg_replace('/[^a-zA-Z0-9\-]/', '', $_GET['history']);
    $backups = glob($backupDir . '/' . $historyId . '-*.json');
    $history = [];
    foreach ($backups as $backup) {
        $filename = basename($backup);
        // Extract timestamp from filename: projectId-YYYY-MM-DD_HH-mm-ss.json
        if (preg_match('/-(\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2})\.json$/', $filename, $matches)) {
            $history[] = [
                'filename' => $filename,
                'timestamp' => str_replace('_', ' ', str_replace('-', ':', substr($matches[1], 0, 10) . ' ' . substr($matches[1], 11))),
                'size' => filesize($backup),
            ];
        }
    }
    // Sort by timestamp descending
    usort($history, function($a, $b) {
        return strcmp($b['timestamp'], $a['timestamp']);
    });
    echo json_encode(['history' => $history, 'projectId' => $historyId]);
    exit;
}

// === RESTORE FROM BACKUP ===
if (isset($_GET['restore'])) {
    $filename = preg_replace('/[^a-zA-Z0-9\-_\.]/', '', $_GET['restore']);
    $backupFile = $backupDir . '/' . $filename;
    if (file_exists($backupFile)) {
        header('Content-Type: text/plain; charset=utf-8');
        echo file_get_contents($backupFile);
    } else {
        http_response_code(404);
        echo json_encode(['error' => 'Backup nicht gefunden']);
    }
    exit;
}

// === DELETE PROJECT ===
if (isset($_GET['delete']) && $_SERVER['REQUEST_METHOD'] === 'DELETE') {
    $deleteId = preg_replace('/[^a-zA-Z0-9\-]/', '', $_GET['delete']);
    $deleteFile = $projectsDir . '/' . $deleteId . '.json';

    if (file_exists($deleteFile)) {
        // Move to backup instead of hard delete
        $backupName = $backupDir . '/' . $deleteId . '-deleted-' . date('Y-m-d_H-i-s') . '.json';
        rename($deleteFile, $backupName);
        echo json_encode(['status' => 'deleted', 'projectId' => $deleteId]);
    } else {
        http_response_code(404);
        echo json_encode(['error' => 'Projekt nicht gefunden']);
    }
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // === SAVE PROJECT ===
    $data = file_get_contents('php://input');

    if (empty($data)) {
        http_response_code(400);
        echo json_encode(['error' => 'Keine Daten empfangen']);
        exit;
    }

    // Create backup if file exists (max 100 per project)
    if (file_exists($projectFile)) {
        $backupName = $backupDir . '/' . $projectId . '-' . date('Y-m-d_H-i-s') . '.json';
        copy($projectFile, $backupName);

        // Clean up old backups (keep last 100 per project)
        $backups = glob($backupDir . '/' . $projectId . '-*.json');
        if (count($backups) > 100) {
            usort($backups, function($a, $b) {
                return filemtime($a) - filemtime($b);
            });
            $toDelete = array_slice($backups, 0, count($backups) - 100);
            foreach ($toDelete as $old) {
                unlink($old);
            }
        }
    }

    // Save
    $result = file_put_contents($projectFile, $data);

    if ($result === false) {
        http_response_code(500);
        echo json_encode(['error' => 'Speichern fehlgeschlagen']);
        exit;
    }

    echo json_encode([
        'status' => 'saved',
        'projectId' => $projectId,
        'size' => strlen($data),
        'timestamp' => date('c')
    ]);

} else {
    // === LOAD PROJECT ===
    if (file_exists($projectFile)) {
        header('Content-Type: text/plain; charset=utf-8');
        echo file_get_contents($projectFile);
    } else {
        // Return empty - project doesn't exist yet
        header('Content-Type: text/plain; charset=utf-8');
        echo '';
    }
}
