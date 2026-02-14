<?php
/**
 * Load documentation from server
 * Public endpoint - no authentication required
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$docsFile = __DIR__ . '/../data/mirror-docs.json';

if (file_exists($docsFile)) {
    readfile($docsFile);
} else {
    // Fall back to .mirror file if JSON doesn't exist
    $mirrorFile = __DIR__ . '/../mirror-docs.mirror';
    if (file_exists($mirrorFile)) {
        // Return the raw .mirror content wrapped in JSON
        echo json_encode([
            'type' => 'mirror',
            'content' => file_get_contents($mirrorFile)
        ]);
    } else {
        http_response_code(404);
        echo json_encode(['error' => 'Documentation not found']);
    }
}
