<?php
/**
 * User Settings API
 *
 * Persists user settings (recent icons, agent memory) for any session.
 * During development: single default user, no login required.
 */

define('USER_SETTINGS_DIR', DATA_DIR . '/user-settings');

// Ensure directory exists
if (!file_exists(USER_SETTINGS_DIR)) {
    mkdir(USER_SETTINGS_DIR, 0755, true);
}

/**
 * Get settings file path for current user/session
 */
function getUserSettingsFile(): string {
    $userId = getOrCreateSessionUser();
    return USER_SETTINGS_DIR . '/' . $userId . '.json';
}

/**
 * Get user settings
 *
 * GET /api/user/settings
 * Returns: { recentIcons: [], agentMemory: null }
 */
function getUserSettings(): array {
    $file = getUserSettingsFile();

    if (!file_exists($file)) {
        // Return defaults
        return [
            'recentIcons' => [],
            'agentMemory' => null
        ];
    }

    $data = json_decode(file_get_contents($file), true);
    return $data ?? [
        'recentIcons' => [],
        'agentMemory' => null
    ];
}

/**
 * Save user settings
 *
 * PUT /api/user/settings
 * Body: { recentIcons?: [], agentMemory?: {} }
 * Returns: { success: true }
 */
function saveUserSettings(array $body): array {
    $file = getUserSettingsFile();

    // Load existing settings
    $existing = [];
    if (file_exists($file)) {
        $existing = json_decode(file_get_contents($file), true) ?? [];
    }

    // Merge new settings (don't overwrite missing fields)
    if (isset($body['recentIcons'])) {
        $existing['recentIcons'] = $body['recentIcons'];
    }
    if (array_key_exists('agentMemory', $body)) {
        $existing['agentMemory'] = $body['agentMemory'];
    }

    // Save
    file_put_contents($file, json_encode($existing, JSON_PRETTY_PRINT));

    return ['success' => true];
}
