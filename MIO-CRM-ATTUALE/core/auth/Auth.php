<?php
// File: /core/auth/Auth.php
// Classe di autenticazione unificata - CRM Studio Mismo

class Auth {
    
    /**
     * Verifica se l'utente è loggato (admin o cliente)
     */
    public static function isLoggedIn() {
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
        
        return isset($_SESSION['logged_in']) && $_SESSION['logged_in'] === true;
    }
    
    /**
     * Verifica se l'utente loggato è un admin
     */
    public static function isAdmin() {
        if (!self::isLoggedIn()) return false;
        
        return isset($_SESSION['user_type']) && $_SESSION['user_type'] === 'admin';
    }
    
    /**
     * Verifica se l'utente loggato è un cliente
     */
    public static function isClient() {
        if (!self::isLoggedIn()) return false;
        
        return isset($_SESSION['user_type']) && $_SESSION['user_type'] === 'client';
    }
    
    /**
     * Verifica se l'utente ha un ruolo specifico (solo per admin)
     */
    public static function hasRole($roles) {
        if (!self::isAdmin()) return false;
        
        if (!is_array($roles)) {
            $roles = [$roles];
        }
        
        return isset($_SESSION['role']) && in_array($_SESSION['role'], $roles);
    }
    
    /**
     * Verifica il tipo di accesso cliente
     */
    public static function getClientAccessType() {
        if (!self::isClient()) return null;
        
        return $_SESSION['client_access_type'] ?? null;
    }
    
    /**
     * Verifica se il cliente può accedere alla dashboard completa
     */
    public static function canAccessFullDashboard() {
        if (!self::isClient()) return false;
        
        return self::getClientAccessType() === 'cliente';
    }
    
    /**
     * Ottiene i dati dell'utente corrente
     */
    public static function getCurrentUser() {
        if (!self::isLoggedIn()) return null;
        
        require_once __DIR__ . '/../config/database.php';
        $db = getDB();
        
        if (self::isAdmin()) {
            // Carica dati admin
            $stmt = $db->prepare("
                SELECT id, username, email, first_name, last_name, role, 
                       profile_image, is_active, two_fa_enabled
                FROM users 
                WHERE id = ?
            ");
            $stmt->execute([$_SESSION['user_id']]);
            return $stmt->fetch(PDO::FETCH_ASSOC);
            
        } elseif (self::isClient()) {
            // Carica dati cliente
            $stmt = $db->prepare("
                SELECT ca.*, lc.name as company_name, lc.email, lc.phone,
                       lc.address, lc.partita_iva, lc.codice_fiscale
                FROM client_access ca
                INNER JOIN leads_contacts lc ON ca.contact_id = lc.id
                WHERE ca.id = ?
            ");
            $stmt->execute([$_SESSION['client_id']]);
            return $stmt->fetch(PDO::FETCH_ASSOC);
        }
        
        return null;
    }
    
    /**
     * Ottiene l'ID dell'utente corrente
     */
    public static function getUserId() {
        if (!self::isLoggedIn()) return null;
        
        if (self::isAdmin()) {
            return $_SESSION['user_id'] ?? null;
        } elseif (self::isClient()) {
            return $_SESSION['client_id'] ?? null;
        }
        
        return null;
    }
    
    /**
     * Ottiene il tipo di utente
     */
    public static function getUserType() {
        if (!self::isLoggedIn()) return null;
        
        return $_SESSION['user_type'] ?? null;
    }
    
    /**
     * Verifica il token di sessione
     */
    public static function verifySessionToken() {
        if (!self::isLoggedIn()) return false;
        
        require_once __DIR__ . '/../config/database.php';
        $db = getDB();
        
        if (self::isAdmin()) {
            $token = $_SESSION['session_token'] ?? '';
            if (empty($token)) return false;
            
            $stmt = $db->prepare("
                SELECT * FROM user_sessions 
                WHERE user_id = ? 
                AND session_token = ? 
                AND expires_at > NOW()
            ");
            $stmt->execute([$_SESSION['user_id'], $token]);
            
            return $stmt->fetch() !== false;
            
        } elseif (self::isClient()) {
            $token = $_SESSION['client_session_token'] ?? '';
            if (empty($token)) return false;
            
            $stmt = $db->prepare("
                SELECT * FROM client_sessions 
                WHERE client_access_id = ? 
                AND session_token = ? 
                AND expires_at > NOW()
            ");
            $stmt->execute([$_SESSION['client_id'], $token]);
            
            return $stmt->fetch() !== false;
        }
        
        return false;
    }
    
    /**
     * Logout
     */
    public static function logout() {
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
        
        // Elimina token di sessione dal database
        if (self::isLoggedIn()) {
            require_once __DIR__ . '/../config/database.php';
            $db = getDB();
            
            if (self::isAdmin() && isset($_SESSION['session_token'])) {
                $stmt = $db->prepare("
                    DELETE FROM user_sessions 
                    WHERE session_token = ?
                ");
                $stmt->execute([$_SESSION['session_token']]);
                
                // Log logout
                logAccess(
                    $_SESSION['user_id'], 
                    $_SESSION['username'], 
                    'logout', 
                    'success', 
                    'Logout admin'
                );
                
            } elseif (self::isClient() && isset($_SESSION['client_session_token'])) {
                $stmt = $db->prepare("
                    DELETE FROM client_sessions 
                    WHERE session_token = ?
                ");
                $stmt->execute([$_SESSION['client_session_token']]);
                
                // Log logout cliente
                $stmt = $db->prepare("
                    INSERT INTO client_access_logs 
                    (client_access_id, username, action, ip_address, user_agent, details)
                    VALUES (?, ?, 'logout', ?, ?, 'Logout effettuato')
                ");
                $stmt->execute([
                    $_SESSION['client_id'],
                    $_SESSION['client_username'],
                    $_SERVER['REMOTE_ADDR'] ?? 'unknown',
                    $_SERVER['HTTP_USER_AGENT'] ?? 'unknown'
                ]);
            }
        }
        
        // Distruggi sessione
        $_SESSION = [];
        
        if (ini_get("session.use_cookies")) {
            $params = session_get_cookie_params();
            setcookie(session_name(), '', time() - 42000,
                $params["path"], $params["domain"],
                $params["secure"], $params["httponly"]
            );
        }
        
        session_destroy();
    }
    
    /**
     * Controlla permessi per modulo (admin)
     */
    public static function checkModulePermission($module, $action = 'read') {
        if (!self::isAdmin()) return false;
        
        // Super admin ha sempre tutti i permessi
        if (self::hasRole('super_admin')) {
            return true;
        }
        
        require_once __DIR__ . '/../config/database.php';
        $db = getDB();
        
        $actionColumn = 'can_' . $action;
        $stmt = $db->prepare("
            SELECT $actionColumn 
            FROM user_permissions 
            WHERE user_id = ? AND module_name = ?
        ");
        $stmt->execute([$_SESSION['user_id'], $module]);
        $permission = $stmt->fetch();
        
        return $permission && $permission[$actionColumn] == 1;
    }
    
    /**
     * Verifica se il cliente può vedere un elemento specifico
     */
    public static function clientCanView($itemType, $itemId) {
        if (!self::isClient()) return false;
        
        require_once __DIR__ . '/../config/database.php';
        $db = getDB();
        
        $clientContactId = $_SESSION['contact_id'] ?? null;
        if (!$clientContactId) {
            // Recupera contact_id dalla sessione
            $stmt = $db->prepare("
                SELECT contact_id FROM client_access WHERE id = ?
            ");
            $stmt->execute([$_SESSION['client_id']]);
            $result = $stmt->fetch();
            $clientContactId = $result['contact_id'] ?? null;
            $_SESSION['contact_id'] = $clientContactId;
        }
        
        switch ($itemType) {
            case 'task':
                $stmt = $db->prepare("
                    SELECT id FROM tasks 
                    WHERE id = ? 
                    AND client_id = ? 
                    AND visible_to_client = 1
                ");
                $stmt->execute([$itemId, $clientContactId]);
                break;
                
            case 'event':
                $stmt = $db->prepare("
                    SELECT id FROM agenda_events 
                    WHERE id = ? 
                    AND client_id = ? 
                    AND visible_to_client = 1
                ");
                $stmt->execute([$itemId, $clientContactId]);
                break;
                
            case 'invoice':
                $stmt = $db->prepare("
                    SELECT id FROM fatture 
                    WHERE id = ? 
                    AND client_id = ? 
                    AND visible_to_client = 1
                ");
                $stmt->execute([$itemId, $clientContactId]);
                break;
                
            case 'quote':
                $stmt = $db->prepare("
                    SELECT id FROM quotes 
                    WHERE id = ? 
                    AND client_access_id = ?
                ");
                $stmt->execute([$itemId, $_SESSION['client_id']]);
                break;
                
            default:
                return false;
        }
        
        return $stmt->fetch() !== false;
    }
    
    /**
     * Genera token CSRF
     */
    public static function generateCSRFToken() {
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
        
        if (!isset($_SESSION['csrf_token'])) {
            $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
        }
        
        return $_SESSION['csrf_token'];
    }
    
    /**
     * Verifica token CSRF
     */
    public static function verifyCSRFToken($token) {
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
        
        return isset($_SESSION['csrf_token']) && 
               hash_equals($_SESSION['csrf_token'], $token);
    }
    
    /**
     * Controlla timeout sessione
     */
    public static function checkSessionTimeout($maxIdleTime = 604800) {
        if (!self::isLoggedIn()) return false;
        
        $lastActivity = $_SESSION['last_activity'] ?? $_SESSION['login_time'] ?? 0;
        
        if (time() - $lastActivity > $maxIdleTime) {
            self::logout();
            return false;
        }
        
        $_SESSION['last_activity'] = time();
        return true;
    }
}