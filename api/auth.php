<?php
/**
 * Auth handlers for Mirror Studio
 */

/**
 * Load users from JSON file
 */
function loadUsers(): array {
    if (!file_exists(USERS_FILE)) {
        return ['users' => []];
    }
    return json_decode(file_get_contents(USERS_FILE), true) ?? ['users' => []];
}

/**
 * Save users to JSON file
 */
function saveUsers(array $data): void {
    file_put_contents(USERS_FILE, json_encode($data, JSON_PRETTY_PRINT));
}

/**
 * Generate unique ID
 */
function generateId(string $prefix = ''): string {
    return $prefix . bin2hex(random_bytes(16));
}

/**
 * Register a new user
 *
 * POST /api/auth/register
 * Body: { email, password }
 * Returns: { success, user_id } or { error }
 */
function authRegister(array $body): array {
    $email = trim($body['email'] ?? '');
    $password = $body['password'] ?? '';

    // Validate
    if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        http_response_code(400);
        return ['error' => 'Valid email required'];
    }

    if (strlen($password) < 6) {
        http_response_code(400);
        return ['error' => 'Password must be at least 6 characters'];
    }

    // Load users
    $data = loadUsers();

    // Check if email exists
    foreach ($data['users'] as $user) {
        if (strtolower($user['email']) === strtolower($email)) {
            http_response_code(409);
            return ['error' => 'Email already registered'];
        }
    }

    // Create user
    $userId = generateId('u_');
    $user = [
        'id' => $userId,
        'email' => strtolower($email),
        'password_hash' => password_hash($password, PASSWORD_BCRYPT),
        'created_at' => date('c')
    ];

    $data['users'][] = $user;
    saveUsers($data);

    // Create user's project directory
    $userDir = PROJECTS_DIR . '/' . $userId;
    if (!file_exists($userDir)) {
        mkdir($userDir, 0700, true);
    }

    // Auto-login after registration
    $_SESSION['user_id'] = $userId;

    return [
        'success' => true,
        'user_id' => $userId
    ];
}

/**
 * Login user
 *
 * POST /api/auth/login
 * Body: { email, password }
 * Returns: { success, user_id } or { error }
 */
function authLogin(array $body): array {
    $email = trim($body['email'] ?? '');
    $password = $body['password'] ?? '';

    if (empty($email) || empty($password)) {
        http_response_code(400);
        return ['error' => 'Email and password required'];
    }

    // Load users
    $data = loadUsers();

    // Find user
    foreach ($data['users'] as $user) {
        if (strtolower($user['email']) === strtolower($email)) {
            if (password_verify($password, $user['password_hash'])) {
                $_SESSION['user_id'] = $user['id'];
                return [
                    'success' => true,
                    'user_id' => $user['id']
                ];
            }
            break;
        }
    }

    http_response_code(401);
    return ['error' => 'Invalid email or password'];
}

/**
 * Logout user
 *
 * POST /api/auth/logout
 * Returns: { success }
 */
function authLogout(): array {
    session_destroy();
    return ['success' => true];
}

/**
 * Get current user
 *
 * GET /api/auth/me
 * Returns: { user_id, email } or { error }
 */
function authMe(): array {
    if (!isset($_SESSION['user_id'])) {
        http_response_code(401);
        return ['error' => 'Not authenticated'];
    }

    $data = loadUsers();
    foreach ($data['users'] as $user) {
        if ($user['id'] === $_SESSION['user_id']) {
            return [
                'user_id' => $user['id'],
                'email' => $user['email']
            ];
        }
    }

    http_response_code(401);
    return ['error' => 'User not found'];
}

/**
 * Get session/auth status (works for anonymous and logged-in users)
 *
 * GET /api/auth/status
 * Returns: { authenticated, anonymous, user_id?, email? }
 */
function authStatus(): array {
    if (isset($_SESSION['user_id'])) {
        // Logged in user
        $data = loadUsers();
        foreach ($data['users'] as $user) {
            if ($user['id'] === $_SESSION['user_id']) {
                return [
                    'authenticated' => true,
                    'anonymous' => false,
                    'user_id' => $user['id'],
                    'email' => $user['email']
                ];
            }
        }
    }

    // Anonymous session user
    $userId = getOrCreateSessionUser();
    return [
        'authenticated' => true,
        'anonymous' => true,
        'user_id' => $userId
    ];
}

/**
 * Get current user ID or null
 */
function getCurrentUserId(): ?string {
    return $_SESSION['user_id'] ?? null;
}

/**
 * Check if current user is anonymous (session-based)
 */
function isAnonymousUser(): bool {
    return !isset($_SESSION['user_id']) && isset($_SESSION['anon_id']);
}

/**
 * Get or create session-based user ID
 * Returns logged-in user ID or creates anonymous session user
 */
function getOrCreateSessionUser(): string {
    // If logged in, use real user ID
    if (isset($_SESSION['user_id'])) {
        return $_SESSION['user_id'];
    }

    // Create or return anonymous session user
    if (!isset($_SESSION['anon_id'])) {
        $_SESSION['anon_id'] = 'anon_' . bin2hex(random_bytes(16));

        // Create directory for anonymous user
        $userDir = PROJECTS_DIR . '/' . $_SESSION['anon_id'];
        if (!file_exists($userDir)) {
            mkdir($userDir, 0700, true);
        }
    }

    return $_SESSION['anon_id'];
}

/**
 * Require authentication (throws if not logged in)
 */
function requireAuth(): string {
    $userId = getCurrentUserId();
    if (!$userId) {
        http_response_code(401);
        throw new Exception('Authentication required');
    }
    return $userId;
}

/**
 * Get user settings
 *
 * GET /api/auth/settings
 * Returns: { settings } or { error }
 */
function authGetSettings(): array {
    $userId = getOrCreateSessionUser();

    $data = loadUsersRaw();
    foreach ($data['users'] as $user) {
        if ($user['id'] === $userId) {
            return [
                'success' => true,
                'settings' => $user['settings'] ?? []
            ];
        }
    }

    // Anonymous user - return empty settings (they use localStorage only)
    return [
        'success' => true,
        'settings' => []
    ];
}

/**
 * Save user settings
 *
 * PUT /api/auth/settings
 * Body: { settings: { panelVisibility, ... } }
 * Returns: { success } or { error }
 */
function authSaveSettings(array $body): array {
    $userId = getOrCreateSessionUser();
    $settings = $body['settings'] ?? [];

    // Anonymous users can't save to server
    if (strpos($userId, 'anon_') === 0) {
        return [
            'success' => true,
            'message' => 'Settings saved locally only (not logged in)'
        ];
    }

    $data = loadUsersRaw();
    $found = false;

    foreach ($data['users'] as &$user) {
        if ($user['id'] === $userId) {
            // Merge settings (don't overwrite everything)
            $user['settings'] = array_merge($user['settings'] ?? [], $settings);
            $found = true;
            break;
        }
    }

    if (!$found) {
        http_response_code(404);
        return ['error' => 'User not found'];
    }

    saveUsers($data);

    return ['success' => true];
}

