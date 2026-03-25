<?php
/**
 * Project handlers for Mirror Studio
 */

/**
 * Get project directory path for a user
 */
function getUserProjectsDir(string $userId): string {
    return PROJECTS_DIR . '/' . $userId;
}

/**
 * Get specific project directory
 */
function getProjectDir(string $userId, string $projectId): string {
    return getUserProjectsDir($userId) . '/' . $projectId;
}

/**
 * Load project metadata
 */
function loadProjectMeta(string $userId, string $projectId): ?array {
    $metaFile = getProjectDir($userId, $projectId) . '/meta.json';
    if (!file_exists($metaFile)) {
        return null;
    }
    return json_decode(file_get_contents($metaFile), true);
}

/**
 * Save project metadata
 */
function saveProjectMeta(string $userId, string $projectId, array $meta): void {
    $metaFile = getProjectDir($userId, $projectId) . '/meta.json';
    file_put_contents($metaFile, json_encode($meta, JSON_PRETTY_PRINT));
}

/**
 * Validate project ownership
 */
function validateProjectOwnership(string $userId, string $projectId): bool {
    $projectDir = getProjectDir($userId, $projectId);
    return is_dir($projectDir);
}

/**
 * List all projects for current user (or anonymous session user)
 *
 * GET /api/projects
 * Returns: [{ id, name, created_at }]
 */
function getProjects(): array {
    $userId = getOrCreateSessionUser();
    $userDir = getUserProjectsDir($userId);

    if (!is_dir($userDir)) {
        mkdir($userDir, 0700, true);
        return [];
    }

    $projects = [];
    $dirs = scandir($userDir);

    foreach ($dirs as $dir) {
        if ($dir === '.' || $dir === '..') continue;

        $projectPath = $userDir . '/' . $dir;
        if (!is_dir($projectPath)) continue;

        $meta = loadProjectMeta($userId, $dir);
        if ($meta) {
            $projects[] = [
                'id' => $dir,
                'name' => $meta['name'] ?? $dir,
                'created_at' => $meta['created_at'] ?? null,
                'updated_at' => $meta['updated_at'] ?? null
            ];
        }
    }

    // Sort by updated_at descending
    usort($projects, function($a, $b) {
        return strcmp($b['updated_at'] ?? '', $a['updated_at'] ?? '');
    });

    return $projects;
}

/**
 * Create a new project (works for logged-in and anonymous users)
 *
 * POST /api/projects
 * Body: { name }
 * Returns: { id, name, created_at }
 */
function createProject(array $body): array {
    $userId = getOrCreateSessionUser();
    $name = trim($body['name'] ?? 'Untitled Project');

    if (empty($name)) {
        $name = 'Untitled Project';
    }

    // Generate project ID
    $projectId = 'p_' . bin2hex(random_bytes(16));
    $projectDir = getProjectDir($userId, $projectId);

    // Create directory
    mkdir($projectDir, 0700, true);

    // Save metadata
    $now = date('c');
    $meta = [
        'name' => $name,
        'created_at' => $now,
        'updated_at' => $now
    ];
    saveProjectMeta($userId, $projectId, $meta);

    // Create default files with correct extensions (.mir, .tok, .com)
    $defaultIndex = <<<'MIRROR'
App bg #18181b, pad 24, gap 16
  Text "Mirror Studio", fs 24, weight bold, col white
  Text "Edit this code to get started", col #888

  Card bg #27272a, pad 16, rad 8, gap 8
    Text "Your first component", col #a1a1aa
    Button "Click Me"
      pad 12 24, bg #3b82f6, rad 6, col white
      hover bg #2563eb

  // Zag Select Component
  Select
    SelectTrigger
      SelectValue "Choose an option"
    SelectContent
      SelectItem "Option 1"
      SelectItem "Option 2"
      SelectItem "Option 3"
MIRROR;

    $defaultTokens = <<<'MIRROR'
// Design Tokens
$primary.bg: #3b82f6
$primary.hover: #2563eb

$surface.bg: #18181b
$surface.card: #27272a

$text.primary: #ffffff
$text.secondary: #a1a1aa
$text.muted: #888888
MIRROR;

    $defaultComponents = <<<'MIRROR'
// Component Definitions
Button:
  pad 12 24, bg #3b82f6, rad 6, col white, cursor pointer
  hover bg #2563eb

Card:
  bg #27272a, pad 16, rad 8

Input:
  pad 12, bg #1f1f1f, rad 6, bor 1 #333
  col white
  focus bor 1 #3b82f6
MIRROR;

    file_put_contents($projectDir . '/index.mir', $defaultIndex);
    file_put_contents($projectDir . '/tokens.tok', $defaultTokens);
    file_put_contents($projectDir . '/components.com', $defaultComponents);

    return [
        'id' => $projectId,
        'name' => $name,
        'created_at' => $now
    ];
}

/**
 * Update project metadata (works for logged-in and anonymous users)
 *
 * PUT /api/projects/{id}
 * Body: { name }
 * Returns: { success }
 */
function updateProject(string $projectId, array $body): array {
    $userId = getOrCreateSessionUser();

    // Validate ownership
    if (!validateProjectOwnership($userId, $projectId)) {
        http_response_code(404);
        return ['error' => 'Project not found'];
    }

    $meta = loadProjectMeta($userId, $projectId);
    if (!$meta) {
        http_response_code(404);
        return ['error' => 'Project not found'];
    }

    // Update fields
    if (isset($body['name'])) {
        $meta['name'] = trim($body['name']);
    }
    $meta['updated_at'] = date('c');

    saveProjectMeta($userId, $projectId, $meta);

    return ['success' => true];
}

/**
 * Delete a project (works for logged-in and anonymous users)
 *
 * DELETE /api/projects/{id}
 * Returns: { success }
 */
function deleteProject(string $projectId): array {
    $userId = getOrCreateSessionUser();

    // Validate ownership
    if (!validateProjectOwnership($userId, $projectId)) {
        http_response_code(404);
        return ['error' => 'Project not found'];
    }

    $projectDir = getProjectDir($userId, $projectId);

    // Recursively delete directory
    deleteDirectory($projectDir);

    return ['success' => true];
}

/**
 * Recursively delete a directory
 */
function deleteDirectory(string $dir): void {
    if (!is_dir($dir)) return;

    $files = scandir($dir);
    foreach ($files as $file) {
        if ($file === '.' || $file === '..') continue;

        $path = $dir . '/' . $file;
        if (is_dir($path)) {
            deleteDirectory($path);
        } else {
            unlink($path);
        }
    }

    rmdir($dir);
}
