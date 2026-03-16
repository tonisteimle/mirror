<?php
/**
 * File handlers for Mirror Studio
 */

/**
 * Validate filename (prevent path traversal) - for flat files only
 */
function validateFilename(string $filename): bool {
    // Disallow path traversal
    if (strpos($filename, '..') !== false) {
        return false;
    }
    if (strpos($filename, '/') !== false) {
        return false;
    }
    if (strpos($filename, '\\') !== false) {
        return false;
    }

    // Only allow .mirror files
    if (!preg_match('/^[a-zA-Z0-9_-]+\.mirror$/', $filename)) {
        return false;
    }

    return true;
}

/**
 * Validate a path (for files in folders)
 * Allows: folder/file.mirror, folder/subfolder/file.mirror
 * Disallows: .., absolute paths, special characters
 */
function validatePath(string $path): bool {
    // No .. allowed (path traversal)
    if (strpos($path, '..') !== false) {
        return false;
    }

    // No backslashes
    if (strpos($path, '\\') !== false) {
        return false;
    }

    // No leading or trailing slashes
    if (preg_match('#^/|/$#', $path)) {
        return false;
    }

    // Only alphanumeric, -, _, / and . (for extension) allowed
    if (!preg_match('#^[a-zA-Z0-9_/.-]+$#', $path)) {
        return false;
    }

    // Each segment must be valid
    $segments = explode('/', $path);
    foreach ($segments as $segment) {
        if (empty($segment)) {
            return false; // No empty segments (// in path)
        }
        // Segment must be alphanumeric with - _ or end with .mirror
        if (!preg_match('/^[a-zA-Z0-9_-]+(\\.mirror)?$/', $segment)) {
            return false;
        }
    }

    return true;
}

/**
 * Validate folder name (single segment, no extension)
 */
function validateFolderName(string $name): bool {
    // No path separators
    if (strpos($name, '/') !== false || strpos($name, '\\') !== false) {
        return false;
    }

    // No dots (no extensions, no hidden files)
    if (strpos($name, '.') !== false) {
        return false;
    }

    // Only alphanumeric, -, _ allowed
    if (!preg_match('/^[a-zA-Z0-9_-]+$/', $name)) {
        return false;
    }

    return true;
}

/**
 * Recursively scan a directory for .mirror files and folders
 */
function scanDirRecursive(string $dir, string $relativePath = ''): array {
    $items = [];

    $entries = scandir($dir);
    foreach ($entries as $entry) {
        if ($entry === '.' || $entry === '..') continue;

        $fullPath = $dir . '/' . $entry;
        $itemPath = $relativePath ? $relativePath . '/' . $entry : $entry;

        if (is_dir($fullPath)) {
            // It's a folder - recurse
            $children = scanDirRecursive($fullPath, $itemPath);
            $items[] = [
                'filename' => $entry,
                'path' => $itemPath,
                'type' => 'folder',
                'children' => $children
            ];
        } elseif (is_file($fullPath) && pathinfo($entry, PATHINFO_EXTENSION) === 'mirror') {
            // It's a .mirror file
            $items[] = [
                'filename' => $entry,
                'path' => $itemPath,
                'type' => 'file',
                'updated_at' => date('c', filemtime($fullPath))
            ];
        }
    }

    // Sort: folders first, then files; index.mirror and tokens.mirror first among files
    usort($items, function($a, $b) {
        // Folders first
        if ($a['type'] === 'folder' && $b['type'] !== 'folder') return -1;
        if ($a['type'] !== 'folder' && $b['type'] === 'folder') return 1;

        // Among files: index.mirror first, tokens.mirror second
        if ($a['type'] === 'file' && $b['type'] === 'file') {
            if ($a['filename'] === 'index.mirror') return -1;
            if ($b['filename'] === 'index.mirror') return 1;
            if ($a['filename'] === 'tokens.mirror') return -1;
            if ($b['filename'] === 'tokens.mirror') return 1;
        }

        return strcmp($a['filename'], $b['filename']);
    });

    return $items;
}

/**
 * List all files in a project (recursive with folder structure)
 *
 * GET /api/projects/{id}/files
 * Returns: [{ filename, path, type, updated_at?, children? }]
 */
function getFiles(string $projectId): array {
    $userId = requireAuth();

    // Validate ownership
    if (!validateProjectOwnership($userId, $projectId)) {
        http_response_code(404);
        return ['error' => 'Project not found'];
    }

    $projectDir = getProjectDir($userId, $projectId);

    return scanDirRecursive($projectDir);
}

/**
 * Get file content
 *
 * GET /api/projects/{id}/files/{path}
 * Returns: { content }
 */
function getFile(string $projectId, string $filePath): array {
    $userId = requireAuth();

    // Validate path (supports both flat filenames and paths)
    if (!validateFilename($filePath) && !validatePath($filePath)) {
        http_response_code(400);
        return ['error' => 'Invalid file path'];
    }

    // Must end with .mirror
    if (!preg_match('/\.mirror$/', $filePath)) {
        http_response_code(400);
        return ['error' => 'Only .mirror files allowed'];
    }

    // Validate ownership
    if (!validateProjectOwnership($userId, $projectId)) {
        http_response_code(404);
        return ['error' => 'Project not found'];
    }

    $fullPath = getProjectDir($userId, $projectId) . '/' . $filePath;

    if (!file_exists($fullPath)) {
        http_response_code(404);
        return ['error' => 'File not found'];
    }

    return [
        'filename' => basename($filePath),
        'path' => $filePath,
        'content' => file_get_contents($fullPath),
        'updated_at' => date('c', filemtime($fullPath))
    ];
}

/**
 * Create or update a file
 *
 * PUT /api/projects/{id}/files/{path}
 * Body: { content }
 * Returns: { success }
 */
function putFile(string $projectId, string $filePath, array $body): array {
    $userId = requireAuth();

    // Validate path (supports both flat filenames and paths)
    if (!validateFilename($filePath) && !validatePath($filePath)) {
        http_response_code(400);
        return ['error' => 'Invalid file path'];
    }

    // Must end with .mirror
    if (!preg_match('/\.mirror$/', $filePath)) {
        http_response_code(400);
        return ['error' => 'Only .mirror files allowed'];
    }

    // Validate ownership
    if (!validateProjectOwnership($userId, $projectId)) {
        http_response_code(404);
        return ['error' => 'Project not found'];
    }

    $content = $body['content'] ?? '';
    $fullPath = getProjectDir($userId, $projectId) . '/' . $filePath;

    // Create parent directories if they don't exist
    $parentDir = dirname($fullPath);
    if (!file_exists($parentDir)) {
        mkdir($parentDir, 0755, true);
    }

    file_put_contents($fullPath, $content);

    // Update project's updated_at
    $meta = loadProjectMeta($userId, $projectId);
    if ($meta) {
        $meta['updated_at'] = date('c');
        saveProjectMeta($userId, $projectId, $meta);
    }

    return [
        'success' => true,
        'path' => $filePath,
        'updated_at' => date('c', filemtime($fullPath))
    ];
}

/**
 * Delete a file
 *
 * DELETE /api/projects/{id}/files/{path}
 * Returns: { success }
 */
function deleteFile(string $projectId, string $filePath): array {
    $userId = requireAuth();

    // Validate path (supports both flat filenames and paths)
    if (!validateFilename($filePath) && !validatePath($filePath)) {
        http_response_code(400);
        return ['error' => 'Invalid file path'];
    }

    // Must end with .mirror
    if (!preg_match('/\.mirror$/', $filePath)) {
        http_response_code(400);
        return ['error' => 'Only .mirror files allowed'];
    }

    // Validate ownership
    if (!validateProjectOwnership($userId, $projectId)) {
        http_response_code(404);
        return ['error' => 'Project not found'];
    }

    $fullPath = getProjectDir($userId, $projectId) . '/' . $filePath;

    if (!file_exists($fullPath)) {
        http_response_code(404);
        return ['error' => 'File not found'];
    }

    unlink($fullPath);

    // Clean up empty parent directories
    $parentDir = dirname($fullPath);
    $projectDir = getProjectDir($userId, $projectId);
    while ($parentDir !== $projectDir && is_dir($parentDir)) {
        $items = array_diff(scandir($parentDir), ['.', '..']);
        if (empty($items)) {
            rmdir($parentDir);
            $parentDir = dirname($parentDir);
        } else {
            break;
        }
    }

    return ['success' => true];
}

/**
 * Create a folder
 *
 * POST /api/projects/{id}/folders
 * Body: { name, parent? }
 * Returns: { success, path }
 */
function createFolder(string $projectId, array $body): array {
    $userId = requireAuth();

    $name = $body['name'] ?? '';
    $parent = $body['parent'] ?? '';

    // Validate folder name
    if (!validateFolderName($name)) {
        http_response_code(400);
        return ['error' => 'Invalid folder name'];
    }

    // Validate parent path if provided
    if ($parent && !validatePath($parent)) {
        http_response_code(400);
        return ['error' => 'Invalid parent path'];
    }

    // Validate ownership
    if (!validateProjectOwnership($userId, $projectId)) {
        http_response_code(404);
        return ['error' => 'Project not found'];
    }

    $projectDir = getProjectDir($userId, $projectId);
    $folderPath = $parent ? $parent . '/' . $name : $name;
    $fullPath = $projectDir . '/' . $folderPath;

    // Check if parent exists
    if ($parent) {
        $parentPath = $projectDir . '/' . $parent;
        if (!is_dir($parentPath)) {
            http_response_code(400);
            return ['error' => 'Parent folder does not exist'];
        }
    }

    // Check if folder already exists
    if (file_exists($fullPath)) {
        http_response_code(400);
        return ['error' => 'Folder already exists'];
    }

    mkdir($fullPath, 0755, true);

    return [
        'success' => true,
        'path' => $folderPath
    ];
}

/**
 * Delete a folder (must be empty or force delete)
 *
 * DELETE /api/projects/{id}/folders/{path}
 * Query: ?force=true to delete non-empty folders
 * Returns: { success }
 */
function deleteFolder(string $projectId, string $folderPath): array {
    $userId = requireAuth();

    // Validate path
    if (!validatePath($folderPath)) {
        http_response_code(400);
        return ['error' => 'Invalid folder path'];
    }

    // Validate ownership
    if (!validateProjectOwnership($userId, $projectId)) {
        http_response_code(404);
        return ['error' => 'Project not found'];
    }

    $projectDir = getProjectDir($userId, $projectId);
    $fullPath = $projectDir . '/' . $folderPath;

    if (!is_dir($fullPath)) {
        http_response_code(404);
        return ['error' => 'Folder not found'];
    }

    // Check if force delete
    $force = isset($_GET['force']) && $_GET['force'] === 'true';

    // Check if folder is empty
    $items = array_diff(scandir($fullPath), ['.', '..']);
    if (!empty($items) && !$force) {
        http_response_code(400);
        return ['error' => 'Folder is not empty. Use ?force=true to delete anyway.'];
    }

    // Recursively delete folder
    deleteFolderRecursive($fullPath);

    return ['success' => true];
}

/**
 * Recursively delete a folder and its contents
 */
function deleteFolderRecursive(string $dir): void {
    if (!is_dir($dir)) return;

    $items = scandir($dir);
    foreach ($items as $item) {
        if ($item === '.' || $item === '..') continue;

        $path = $dir . '/' . $item;
        if (is_dir($path)) {
            deleteFolderRecursive($path);
        } else {
            unlink($path);
        }
    }
    rmdir($dir);
}
