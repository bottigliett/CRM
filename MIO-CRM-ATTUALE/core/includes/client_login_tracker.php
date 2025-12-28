<?php
// File: /core/includes/client_login_tracker.php
// Sistema di tracking accessi clienti e controllo scadenze preventivi

/**
 * Registra il login del cliente
 */
function trackClientLogin($pdo, $clientId, $username) {
    try {
        // Ottieni informazioni device
        $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? 'unknown';
        $deviceInfo = 'desktop';
        
        if (preg_match('/Mobile|Android|iPhone/i', $userAgent)) {
            $deviceInfo = 'mobile';
        } elseif (preg_match('/iPad|Tablet/i', $userAgent)) {
            $deviceInfo = 'tablet';
        }
        
        // Registra login
        $stmt = $pdo->prepare("
            INSERT INTO client_activity_logs (
                client_access_id, username, action, 
                ip_address, user_agent, device_info, details
            ) VALUES (?, ?, 'login', ?, ?, ?, ?)
        ");
        
        $stmt->execute([
            $clientId,
            $username,
            $_SERVER['REMOTE_ADDR'] ?? 'unknown',
            $userAgent,
            $deviceInfo,
            'Login effettuato'
        ]);
        
        // Aggiorna ultimo login
        $stmt = $pdo->prepare("
            UPDATE client_access 
            SET last_login = NOW() 
            WHERE id = ?
        ");
        $stmt->execute([$clientId]);
        
        return true;
        
    } catch (Exception $e) {
        error_log("Errore tracking login: " . $e->getMessage());
        return false;
    }
}

/**
 * Registra il logout del cliente
 */
function trackClientLogout($pdo, $clientId, $username) {
    try {
        $stmt = $pdo->prepare("
            INSERT INTO client_activity_logs (
                client_access_id, username, action, 
                ip_address, user_agent, details
            ) VALUES (?, ?, 'logout', ?, ?, ?)
        ");
        
        $stmt->execute([
            $clientId,
            $username,
            $_SERVER['REMOTE_ADDR'] ?? 'unknown',
            $_SERVER['HTTP_USER_AGENT'] ?? 'unknown',
            'Logout effettuato'
        ]);
        
        return true;
        
    } catch (Exception $e) {
        error_log("Errore tracking logout: " . $e->getMessage());
        return false;
    }
}

/**
 * Verifica se il preventivo è scaduto e blocca automaticamente l'accesso
 */
function checkQuoteExpiration($pdo, $clientId) {
    try {
        // Verifica se c'è un preventivo associato
        $stmt = $pdo->prepare("
            SELECT q.*, ca.is_active, ca.access_type
            FROM client_access ca
            LEFT JOIN quotes q ON q.client_access_id = ca.id
            WHERE ca.id = ?
            AND ca.access_type = 'preventivo'
            LIMIT 1
        ");
        $stmt->execute([$clientId]);
        $data = $stmt->fetch();
        
        if (!$data || !$data['valid_until']) {
            return true; // No preventivo o no scadenza, permetti accesso
        }
        
        // Verifica scadenza
        $now = new DateTime();
        $expiry = new DateTime($data['valid_until']);
        
        if ($now > $expiry && $data['is_active'] == 1) {
            // Preventivo scaduto, blocca accesso
            $stmt = $pdo->prepare("
                UPDATE client_access 
                SET is_active = 0
                WHERE id = ?
            ");
            $stmt->execute([$clientId]);
            
            // Log blocco automatico
            $stmt = $pdo->prepare("
                INSERT INTO client_activity_logs (
                    client_access_id, action, details
                ) VALUES (?, 'access_blocked_expired', ?)
            ");
            $stmt->execute([
                $clientId,
                'Accesso bloccato automaticamente - Preventivo scaduto il ' . $data['valid_until']
            ]);
            
            return false; // Accesso bloccato
        }
        
        return true; // Accesso permesso
        
    } catch (Exception $e) {
        error_log("Errore controllo scadenza: " . $e->getMessage());
        return true; // In caso di errore, permetti accesso
    }
}

/**
 * Verifica se l'accesso del cliente è attivo
 */
function isClientAccessActive($pdo, $clientId) {
    try {
        $stmt = $pdo->prepare("
            SELECT is_active 
            FROM client_access 
            WHERE id = ?
        ");
        $stmt->execute([$clientId]);
        $result = $stmt->fetch();
        
        return $result && $result['is_active'] == 1;
        
    } catch (Exception $e) {
        error_log("Errore verifica accesso: " . $e->getMessage());
        return false;
    }
}

/**
 * Cron job per bloccare automaticamente preventivi scaduti
 * Da eseguire una volta al giorno
 */
function cronCheckExpiredQuotes($pdo) {
    try {
        // Trova tutti i preventivi scaduti con accesso ancora attivo
        $stmt = $pdo->prepare("
            SELECT ca.id, ca.username, q.quote_number, q.valid_until
            FROM client_access ca
            INNER JOIN quotes q ON q.client_access_id = ca.id
            WHERE ca.access_type = 'preventivo'
            AND ca.is_active = 1
            AND q.valid_until < CURDATE()
            AND q.status NOT IN ('accepted', 'rejected')
        ");
        $stmt->execute();
        $expired = $stmt->fetchAll();
        
        foreach ($expired as $access) {
            // Blocca accesso
            $stmt = $pdo->prepare("
                UPDATE client_access 
                SET is_active = 0 
                WHERE id = ?
            ");
            $stmt->execute([$access['id']]);
            
            // Log blocco
            $stmt = $pdo->prepare("
                INSERT INTO client_activity_logs (
                    client_access_id, username, action, details
                ) VALUES (?, ?, 'access_blocked_expired', ?)
            ");
            $stmt->execute([
                $access['id'],
                $access['username'],
                'Preventivo ' . $access['quote_number'] . ' scaduto il ' . $access['valid_until']
            ]);
            
            echo "Bloccato accesso per preventivo scaduto: " . $access['username'] . "\n";
        }
        
        return count($expired);
        
    } catch (Exception $e) {
        error_log("Errore cron preventivi scaduti: " . $e->getMessage());
        return 0;
    }
}

// MODIFICHE DA FARE NEI FILE ESISTENTI:

/* 
1. In /index.php (pagina login), dopo login riuscito aggiungere:

if ($userType === 'client') {
    require_once __DIR__ . '/core/includes/client_login_tracker.php';
    trackClientLogin($pdo, $_SESSION['client_id'], $_SESSION['client_username']);
    
    // Verifica scadenza preventivo
    if (!checkQuoteExpiration($pdo, $_SESSION['client_id'])) {
        session_destroy();
        header('Location: /?error=expired');
        exit;
    }
}

2. In /core/auth/logout.php, prima di session_destroy() aggiungere:

if (isset($_SESSION['user_type']) && $_SESSION['user_type'] === 'client') {
    require_once __DIR__ . '/../includes/client_login_tracker.php';
    try {
        $pdo = new PDO($dsn, $username, $password, $options);
        trackClientLogout($pdo, $_SESSION['client_id'], $_SESSION['client_username']);
    } catch (Exception $e) {
        // Log silenzioso
    }
}

3. In /preventivo.php e /client.php, all'inizio dopo session_start() aggiungere:

require_once __DIR__ . '/core/includes/client_login_tracker.php';
try {
    $pdo = new PDO($dsn, $username, $password, $options);
    
    // Verifica se accesso è ancora attivo
    if (!isClientAccessActive($pdo, $_SESSION['client_id'])) {
        session_destroy();
        header('Location: /?error=blocked');
        exit;
    }
    
    // Verifica scadenza preventivo
    if (!checkQuoteExpiration($pdo, $_SESSION['client_id'])) {
        session_destroy();
        header('Location: /?error=expired');
        exit;
    }
} catch (Exception $e) {
    // Gestione errore
}

4. Creare un cron job /cron/check_expired_quotes.php:

<?php
require_once __DIR__ . '/../core/includes/client_login_tracker.php';

try {
    $dsn = "mysql:host=127.0.0.1;dbname=u706045794_crm_mismo;charset=utf8mb4";
    $pdo = new PDO($dsn, 'u706045794_mismo_crm_new', 'BLQ$>:;*9+h');
    
    $blocked = cronCheckExpiredQuotes($pdo);
    echo "Preventivi scaduti bloccati: " . $blocked . "\n";
    
} catch (Exception $e) {
    echo "Errore: " . $e->getMessage() . "\n";
}

Eseguire con: 0 1 * * * php /path/to/cron/check_expired_quotes.php

*/
?>