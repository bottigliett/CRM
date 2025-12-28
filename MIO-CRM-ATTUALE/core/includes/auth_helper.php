<?php
// File: /core/includes/auth_helper.php
// Helper per autenticazione con sistema permessi funzionante

function requireAuth() {
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    
    if (!isset($_SESSION['user_id']) || !isset($_SESSION['username'])) {
        header('Location: /index.php');
        exit;
    }
    
    $sessionTimeout = 604800;
    if (isset($_SESSION['last_activity']) && 
        (time() - $_SESSION['last_activity']) > $sessionTimeout) {
        session_destroy();
        header('Location: /index.php?timeout=1');
        exit;
    }
    
    $_SESSION['last_activity'] = time();
    return true;
}

function requireModulePermission($module, $action = 'read') {
    requireAuth();
    
    if (!hasPermission($module, $action)) {
        if (isAjaxRequest()) {
            errorResponse('Non hai i permessi per accedere a questa sezione', 403);
        } else {
            $_SESSION['error_message'] = 'Non hai i permessi per accedere a questa sezione';
            header('Location: /dashboard.php');
            exit;
        }
    }
    return true;
}

function getCurrentUser() {
    if (!requireAuth()) {
        return null;
    }
    
    try {
        $dsn = "mysql:host=127.0.0.1;dbname=u706045794_crm_mismo;charset=utf8mb4";
        $pdo = new PDO($dsn, 'u706045794_mismo_crm_new', 'BLQ$>:;*9+h', [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
        ]);
        
        $stmt = $pdo->prepare("SELECT id, username, email, first_name, last_name, role, profile_image FROM users WHERE id = ?");
        $stmt->execute([$_SESSION['user_id']]);
        $user = $stmt->fetch();
        
        if (!$user) {
            session_destroy();
            header('Location: /index.php');
            exit;
        }
        
        return $user;
        
    } catch (Exception $e) {
        error_log("Auth helper error: " . $e->getMessage());
        return null;
    }
}

function hasPermission($module, $action = 'read') {
    $currentUser = getCurrentUser();
    
    if (!$currentUser) {
        return false;
    }
    
    // Super admin ha sempre tutti i permessi
    if ($currentUser['role'] === 'super_admin') {
        return true;
    }
    
    // Per gli admin normali, controlla i permessi nel database
    try {
        $dsn = "mysql:host=127.0.0.1;dbname=u706045794_crm_mismo;charset=utf8mb4";
        $pdo = new PDO($dsn, 'u706045794_mismo_crm_new', 'BLQ$>:;*9+h', [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
        ]);
        
        $actionColumn = 'can_' . $action;
        $stmt = $pdo->prepare("
            SELECT $actionColumn 
            FROM user_permissions 
            WHERE user_id = ? AND module_name = ?
        ");
        $stmt->execute([$currentUser['id'], $module]);
        $permission = $stmt->fetch();
        
        return $permission && $permission[$actionColumn] == 1;
        
    } catch (Exception $e) {
        error_log("Error checking permissions: " . $e->getMessage());
        return false;
    }
}

function getUserPermissions($userId = null) {
    if (!$userId) {
        $currentUser = getCurrentUser();
        $userId = $currentUser['id'];
    }
    
    try {
        $dsn = "mysql:host=127.0.0.1;dbname=u706045794_crm_mismo;charset=utf8mb4";
        $pdo = new PDO($dsn, 'u706045794_mismo_crm_new', 'BLQ$>:;*9+h', [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
        ]);
        
        $stmt = $pdo->prepare("
            SELECT module_name, can_read, can_write, can_delete 
            FROM user_permissions 
            WHERE user_id = ?
        ");
        $stmt->execute([$userId]);
        
        $permissions = [];
        while ($row = $stmt->fetch()) {
            $permissions[$row['module_name']] = [
                'read' => $row['can_read'] == 1,
                'write' => $row['can_write'] == 1,
                'delete' => $row['can_delete'] == 1
            ];
        }
        
        return $permissions;
        
    } catch (Exception $e) {
        error_log("Error getting user permissions: " . $e->getMessage());
        return [];
    }
}

function getAllModules() {
    return [
        'dashboard' => 'Dashboard',
        'agenda' => 'Agenda',
        'task_manager' => 'Task Manager',
        'finance_tracker' => 'Gestione Finanze',
        'fatture' => 'Fatture',
        'lead_contatti' => 'Lead & Contatti',
        'post_it' => 'Post-it',
        'blog' => 'Blog',
        'media' => 'Media',
        'admin_utenti' => 'Gestione Utenti',
        'progetti' => 'Progetti',
        'proposte_contratti' => 'Proposte e Contratti',
        'calcolatore_preventivi' => 'Calcolatore Preventivi',
        'ticket' => 'Ticket'
    ];
}

function renderPage($pageTitle, $pageContent, $additionalCSS = [], $additionalJS = []) {
    $currentUser = getCurrentUser();
    include __DIR__ . '/layout_base.php';
}

function logUserAction($action, $status, $details = null) {
    if (!isset($_SESSION['user_id'])) {
        return;
    }
    
    try {
        $dsn = "mysql:host=127.0.0.1;dbname=u706045794_crm_mismo;charset=utf8mb4";
        $pdo = new PDO($dsn, 'u706045794_mismo_crm_new', 'BLQ$>:;*9+h', [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
        ]);
        
        $stmt = $pdo->prepare("
            INSERT INTO access_logs (user_id, username, ip_address, user_agent, action, status, details) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $_SESSION['user_id'],
            $_SESSION['username'],
            $_SERVER['REMOTE_ADDR'] ?? 'unknown',
            $_SERVER['HTTP_USER_AGENT'] ?? 'unknown',
            $action,
            $status,
            $details
        ]);
    } catch (Exception $e) {
        error_log("Failed to log user action: " . $e->getMessage());
    }
}

function generateCSRFToken() {
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    
    if (!isset($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    
    return $_SESSION['csrf_token'];
}

function validateCSRFToken($token) {
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    
    return isset($_SESSION['csrf_token']) && hash_equals($_SESSION['csrf_token'], $token);
}

function sanitizeInput($input) {
    if (is_array($input)) {
        return array_map('sanitizeInput', $input);
    }
    return htmlspecialchars(trim($input), ENT_QUOTES, 'UTF-8');
}

function validateEmail($email) {
    return filter_var($email, FILTER_VALIDATE_EMAIL);
}

function redirectToLogin($message = null) {
    $url = '/index.php';
    if ($message) {
        $url .= '?message=' . urlencode($message);
    }
    header("Location: $url");
    exit;
}

function isAjaxRequest() {
    return !empty($_SERVER['HTTP_X_REQUESTED_WITH']) && 
           strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) === 'xmlhttprequest';
}

function jsonResponse($data, $httpCode = 200) {
    http_response_code($httpCode);
    header('Content-Type: application/json');
    echo json_encode($data);
    exit;
}

function errorResponse($message, $httpCode = 500) {
    jsonResponse(['success' => false, 'message' => $message], $httpCode);
}

function successResponse($data = [], $message = 'Operazione completata') {
    $response = ['success' => true, 'message' => $message];
    if (!empty($data)) {
        $response['data'] = $data;
    }
    jsonResponse($response);
}
?>