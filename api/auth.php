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
 * Get session/auth status
 *
 * DEV MODE: Always returns authenticated dev user.
 *
 * GET /api/auth/status
 * Returns: { authenticated, anonymous, user_id, email? }
 */
function authStatus(): array {
    return [
        'authenticated' => true,
        'anonymous' => false,
        'user_id' => 'dev',
        'email' => 'dev@mirror.studio'
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
 *
 * DEV MODE: Always returns fixed 'dev' user for easy development.
 * All data is stored on the server, no login required.
 */
function getOrCreateSessionUser(): string {
    // DEV MODE: Fixed user for development
    $userId = 'dev';

    // Ensure dev user directory exists
    $userDir = PROJECTS_DIR . '/' . $userId;
    if (!file_exists($userDir)) {
        mkdir($userDir, 0700, true);
    }

    return $userId;
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
 * DEV MODE: Returns settings from dev user settings file.
 *
 * GET /api/auth/settings
 * Returns: { success, settings }
 */
function authGetSettings(): array {
    return [
        'success' => true,
        'settings' => getUserSettings()
    ];
}

/**
 * Save user settings
 *
 * DEV MODE: Settings saved to dev user settings file.
 *
 * PUT /api/auth/settings
 * Body: { settings: { panelVisibility, ... } }
 * Returns: { success }
 */
function authSaveSettings(array $body): array {
    $settings = $body['settings'] ?? [];

    // Use the user-settings system for dev user
    return saveUserSettings($settings);
}

