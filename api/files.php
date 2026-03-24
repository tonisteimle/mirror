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
 * Allowed file extensions for Mirror files
 */
define('ALLOWED_EXTENSIONS', ['mir', 'mirror', 'tok', 'tokens', 'com', 'components']);

/**
 * Check if a filename has an allowed extension
 */
function hasAllowedExtension(string $filename): bool {
    $ext = pathinfo($filename, PATHINFO_EXTENSION);
    return in_array(strtolower($ext), ALLOWED_EXTENSIONS);
}

/**
 * Validate a path (for files in folders)
 * Allows: folder/file.mir, folder/subfolder/file.tok
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
    foreach ($segments as $i => $segment) {
        if (empty($segment)) {
            return false; // No empty segments (// in path)
        }
        // Last segment (filename) can have extension
        $isLast = ($i === count($segments) - 1);
        if ($isLast) {
            // Filename must be alphanumeric with - _ and valid extension
            if (!preg_match('/^[a-zA-Z0-9_-]+\.[a-z]+$/', $segment)) {
                return false;
            }
        } else {
            // Folder must be alphanumeric with - _
            if (!preg_match('/^[a-zA-Z0-9_-]+$/', $segment)) {
                return false;
            }
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
 * Recursively scan a directory for Mirror files and folders
 */
function scanDirRecursive(string $dir, string $relativePath = ''): array {
    $items = [];

    if (!is_dir($dir)) {
        return $items;
    }

    $entries = scandir($dir);
    foreach ($entries as $entry) {
        if ($entry === '.' || $entry === '..') continue;

        $fullPath = $dir . '/' . $entry;
        $itemPath = $relativePath ? $relativePath . '/' . $entry : $entry;

        if (is_dir($fullPath)) {
            // It's a folder - recurse
            $children = scanDirRecursive($fullPath, $itemPath);
            $items[] = [
                'name' => $entry,
                'path' => $itemPath,
                'type' => 'folder',
                'children' => $children
            ];
        } elseif (is_file($fullPath) && hasAllowedExtension($entry)) {
            // It's a Mirror file (.mir, .tok, .com, etc.)
            $items[] = [
                'name' => $entry,
                'path' => $itemPath,
                'type' => 'file',
                'updatedAt' => date('c', filemtime($fullPath))
            ];
        }
    }

    // Sort: folders first, then files by extension priority (.mir, .com, .tok)
    usort($items, function($a, $b) {
        // Folders first
        if ($a['type'] === 'folder' && $b['type'] !== 'folder') return -1;
        if ($a['type'] !== 'folder' && $b['type'] === 'folder') return 1;

        // Among files: sort by extension priority
        if ($a['type'] === 'file' && $b['type'] === 'file') {
            $extA = pathinfo($a['name'], PATHINFO_EXTENSION);
            $extB = pathinfo($b['name'], PATHINFO_EXTENSION);

            $priority = ['mir' => 0, 'mirror' => 0, 'com' => 1, 'components' => 1, 'tok' => 2, 'tokens' => 2];
            $prioA = $priority[$extA] ?? 3;
            $prioB = $priority[$extB] ?? 3;

            if ($prioA !== $prioB) return $prioA - $prioB;
        }

        return strcmp($a['name'], $b['name']);
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
    $userId = getOrCreateSessionUser();

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
    $userId = getOrCreateSessionUser();

    // Validate path (supports both flat filenames and paths)
    if (!validateFilename($filePath) && !validatePath($filePath)) {
        http_response_code(400);
        return ['error' => 'Invalid file path'];
    }

    // Must have allowed extension
    if (!hasAllowedExtension($filePath)) {
        http_response_code(400);
        return ['error' => 'Only Mirror files allowed (.mir, .tok, .com, etc.)'];
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
    $userId = getOrCreateSessionUser();

    // Validate path (supports both flat filenames and paths)
    if (!validateFilename($filePath) && !validatePath($filePath)) {
        http_response_code(400);
        return ['error' => 'Invalid file path'];
    }

    // Must have allowed extension
    if (!hasAllowedExtension($filePath)) {
        http_response_code(400);
        return ['error' => 'Only Mirror files allowed (.mir, .tok, .com, etc.)'];
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
    $userId = getOrCreateSessionUser();

    // Validate path (supports both flat filenames and paths)
    if (!validateFilename($filePath) && !validatePath($filePath)) {
        http_response_code(400);
        return ['error' => 'Invalid file path'];
    }

    // Must have allowed extension
    if (!hasAllowedExtension($filePath)) {
        http_response_code(400);
        return ['error' => 'Only Mirror files allowed (.mir, .tok, .com, etc.)'];
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
    $userId = getOrCreateSessionUser();

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
    $userId = getOrCreateSessionUser();

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

/**
 * Rename a file
 *
 * POST /api/projects/{id}/files/{path}/rename
 * Body: { newPath }
 * Returns: { success, path }
 */
function renameFile(string $projectId, string $oldPath, array $body): array {
    $userId = getOrCreateSessionUser();

    $newPath = $body['newPath'] ?? '';

    // Validate old path
    if (!validateFilename($oldPath) && !validatePath($oldPath)) {
        http_response_code(400);
        return ['error' => 'Invalid source path'];
    }

    // Validate new path
    if (!validateFilename($newPath) && !validatePath($newPath)) {
        http_response_code(400);
        return ['error' => 'Invalid target path'];
    }

    // Both must have allowed extension
    if (!hasAllowedExtension($oldPath) || !hasAllowedExtension($newPath)) {
        http_response_code(400);
        return ['error' => 'Only Mirror files allowed (.mir, .tok, .com, etc.)'];
    }

    // Validate ownership
    if (!validateProjectOwnership($userId, $projectId)) {
        http_response_code(404);
        return ['error' => 'Project not found'];
    }

    $projectDir = getProjectDir($userId, $projectId);
    $oldFullPath = $projectDir . '/' . $oldPath;
    $newFullPath = $projectDir . '/' . $newPath;

    if (!file_exists($oldFullPath)) {
        http_response_code(404);
        return ['error' => 'File not found'];
    }

    if (file_exists($newFullPath)) {
        http_response_code(400);
        return ['error' => 'Target file already exists'];
    }

    // Create parent directories if they don't exist
    $parentDir = dirname($newFullPath);
    if (!file_exists($parentDir)) {
        mkdir($parentDir, 0755, true);
    }

    rename($oldFullPath, $newFullPath);

    // Clean up empty parent directories of old path
    $oldParentDir = dirname($oldFullPath);
    while ($oldParentDir !== $projectDir && is_dir($oldParentDir)) {
        $items = array_diff(scandir($oldParentDir), ['.', '..']);
        if (empty($items)) {
            rmdir($oldParentDir);
            $oldParentDir = dirname($oldParentDir);
        } else {
            break;
        }
    }

    return [
        'success' => true,
        'path' => $newPath
    ];
}

/**
 * Copy a file
 *
 * POST /api/projects/{id}/files/{path}/copy
 * Body: { targetPath }
 * Returns: { success, path }
 */
function copyFile(string $projectId, string $sourcePath, array $body): array {
    $userId = getOrCreateSessionUser();

    $targetPath = $body['targetPath'] ?? '';

    // Validate source path
    if (!validateFilename($sourcePath) && !validatePath($sourcePath)) {
        http_response_code(400);
        return ['error' => 'Invalid source path'];
    }

    // Validate target path
    if (!validateFilename($targetPath) && !validatePath($targetPath)) {
        http_response_code(400);
        return ['error' => 'Invalid target path'];
    }

    // Both must have allowed extension
    if (!hasAllowedExtension($sourcePath) || !hasAllowedExtension($targetPath)) {
        http_response_code(400);
        return ['error' => 'Only Mirror files allowed (.mir, .tok, .com, etc.)'];
    }

    // Validate ownership
    if (!validateProjectOwnership($userId, $projectId)) {
        http_response_code(404);
        return ['error' => 'Project not found'];
    }

    $projectDir = getProjectDir($userId, $projectId);
    $sourceFullPath = $projectDir . '/' . $sourcePath;
    $targetFullPath = $projectDir . '/' . $targetPath;

    if (!file_exists($sourceFullPath)) {
        http_response_code(404);
        return ['error' => 'Source file not found'];
    }

    if (file_exists($targetFullPath)) {
        http_response_code(400);
        return ['error' => 'Target file already exists'];
    }

    // Create parent directories if they don't exist
    $parentDir = dirname($targetFullPath);
    if (!file_exists($parentDir)) {
        mkdir($parentDir, 0755, true);
    }

    copy($sourceFullPath, $targetFullPath);

    return [
        'success' => true,
        'path' => $targetPath
    ];
}

/**
 * Move a file or folder to a different location
 *
 * POST /api/projects/{id}/move
 * Body: { sourcePath, targetFolder }
 * Returns: { success, path }
 */
function moveItem(string $projectId, array $body): array {
    $userId = getOrCreateSessionUser();

    $sourcePath = $body['sourcePath'] ?? '';
    $targetFolder = $body['targetFolder'] ?? '';

    // Validate source path
    if (!validateFilename($sourcePath) && !validatePath($sourcePath)) {
        http_response_code(400);
        return ['error' => 'Invalid source path'];
    }

    // Validate target folder (can be empty for root)
    if ($targetFolder && !validatePath($targetFolder)) {
        http_response_code(400);
        return ['error' => 'Invalid target folder'];
    }

    // Validate ownership
    if (!validateProjectOwnership($userId, $projectId)) {
        http_response_code(404);
        return ['error' => 'Project not found'];
    }

    $projectDir = getProjectDir($userId, $projectId);
    $sourceFullPath = $projectDir . '/' . $sourcePath;

    if (!file_exists($sourceFullPath)) {
        http_response_code(404);
        return ['error' => 'Source not found'];
    }

    // Compute new path
    $itemName = basename($sourcePath);
    $newPath = $targetFolder ? $targetFolder . '/' . $itemName : $itemName;
    $newFullPath = $projectDir . '/' . $newPath;

    // Prevent moving into itself
    if (is_dir($sourceFullPath)) {
        $targetFolderFull = $projectDir . '/' . $targetFolder;
        if (strpos($targetFolderFull, $sourceFullPath) === 0) {
            http_response_code(400);
            return ['error' => 'Cannot move folder into itself'];
        }
    }

    if (file_exists($newFullPath)) {
        http_response_code(400);
        return ['error' => 'Target already exists'];
    }

    // Create target folder if it doesn't exist
    if ($targetFolder) {
        $targetFolderFull = $projectDir . '/' . $targetFolder;
        if (!file_exists($targetFolderFull)) {
            mkdir($targetFolderFull, 0755, true);
        }
    }

    rename($sourceFullPath, $newFullPath);

    // Clean up empty parent directories of old path
    $oldParentDir = dirname($sourceFullPath);
    while ($oldParentDir !== $projectDir && is_dir($oldParentDir)) {
        $items = array_diff(scandir($oldParentDir), ['.', '..']);
        if (empty($items)) {
            rmdir($oldParentDir);
            $oldParentDir = dirname($oldParentDir);
        } else {
            break;
        }
    }

    return [
        'success' => true,
        'path' => $newPath
    ];
}

/**
 * Rename a folder
 *
 * POST /api/projects/{id}/folders/{path}/rename
 * Body: { newName }
 * Returns: { success, path }
 */
function renameFolder(string $projectId, string $folderPath, array $body): array {
    $userId = getOrCreateSessionUser();

    $newName = $body['newName'] ?? '';

    // Validate folder path
    if (!validatePath($folderPath)) {
        http_response_code(400);
        return ['error' => 'Invalid folder path'];
    }

    // Validate new name
    if (!validateFolderName($newName)) {
        http_response_code(400);
        return ['error' => 'Invalid new folder name'];
    }

    // Validate ownership
    if (!validateProjectOwnership($userId, $projectId)) {
        http_response_code(404);
        return ['error' => 'Project not found'];
    }

    $projectDir = getProjectDir($userId, $projectId);
    $oldFullPath = $projectDir . '/' . $folderPath;

    if (!is_dir($oldFullPath)) {
        http_response_code(404);
        return ['error' => 'Folder not found'];
    }

    // Compute new path (same parent, new name)
    $parentPath = dirname($folderPath);
    $newPath = $parentPath === '.' ? $newName : $parentPath . '/' . $newName;
    $newFullPath = $projectDir . '/' . $newPath;

    if (file_exists($newFullPath)) {
        http_response_code(400);
        return ['error' => 'A folder with this name already exists'];
    }

    rename($oldFullPath, $newFullPath);

    return [
        'success' => true,
        'path' => $newPath
    ];
}
