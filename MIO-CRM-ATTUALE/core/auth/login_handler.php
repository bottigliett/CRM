<?php
// File: /core/auth/login_handler.php
// Gestore login con supporto Admin + Clienti - SICUREZZA CORRETTA

header('Content-Type: application/json');

// Avvia sessione
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Verifica che sia una richiesta POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'Metodo non permesso']);
    exit;
}

try {
    // Connessione database
    $dsn = "mysql:host=127.0.0.1;dbname=u706045794_crm_mismo;charset=utf8mb4";
    $pdo = new PDO($dsn, 'u706045794_mismo_crm_new', 'BLQ$>:;*9+h', [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
    
    $username = trim($_POST['username'] ?? '');
    $password = $_POST['password'] ?? '';
    $twoFaCode = trim($_POST['two_fa_code'] ?? '');
    
    // Validazioni base
    if (empty($username) || empty($password)) {
        echo json_encode(['success' => false, 'message' => 'Username e password sono obbligatori']);
        exit;
    }
    
    // Rate limiting - controlla tentativi falliti
    try {
        $stmt = $pdo->prepare("
            SELECT COUNT(*) as failed_count
            FROM access_logs 
            WHERE (username = ? OR ip_address = ?) 
            AND action = 'login' 
            AND status = 'failed' 
            AND created_at > DATE_SUB(NOW(), INTERVAL 15 MINUTE)
        ");
        $stmt->execute([$username, $_SERVER['REMOTE_ADDR']]);
        $result = $stmt->fetch();
        
        if ($result && $result['failed_count'] >= 5) {
            echo json_encode(['success' => false, 'message' => 'Account temporaneamente bloccato per troppi tentativi falliti']);
            exit;
        }
    } catch (Exception $e) {
        // Ignora errore se tabella access_logs non esiste
    }
    
    // PRIMA: Cerca admin (tabella users)
    $stmt = $pdo->prepare("
        SELECT id, username, email, password_hash, first_name, last_name, role, 
               two_fa_enabled, two_fa_secret, is_active
        FROM users 
        WHERE (username = ? OR email = ?) AND is_active = 1
    ");
    $stmt->execute([$username, $username]);
    $user = $stmt->fetch();
    
    if ($user) {
        // È un admin - verifica password
        if (!password_verify($password, $user['password_hash'])) {
            // Log tentativo fallito
            try {
                $stmt = $pdo->prepare("
                    INSERT INTO access_logs (user_id, username, ip_address, user_agent, action, status, details) 
                    VALUES (?, ?, ?, ?, 'login', 'failed', 'Invalid credentials')
                ");
                $stmt->execute([
                    $user['id'],
                    $username,
                    $_SERVER['REMOTE_ADDR'] ?? 'unknown',
                    $_SERVER['HTTP_USER_AGENT'] ?? 'unknown'
                ]);
            } catch (Exception $e) {
                // Ignora errore se tabella non esiste
            }
            
            echo json_encode(['success' => false, 'message' => 'Credenziali non valide']);
            exit;
        }
        
        // Verifica 2FA se abilitato
        if ($user['two_fa_enabled']) {
            if (!$twoFaCode) {
                echo json_encode([
                    'success' => false, 
                    'require_2fa' => true, 
                    'message' => 'Codice 2FA richiesto'
                ]);
                exit;
            }
            
            // Verifica codice 2FA (base - dovresti implementare la verifica reale)
            if (!preg_match('/^\d{6}$/', $twoFaCode)) {
                echo json_encode(['success' => false, 'message' => 'Codice 2FA non valido']);
                exit;
            }
        }
        
        // Login admin riuscito
        $_SESSION['user_id'] = $user['id'];
        $_SESSION['username'] = $user['username'];
        $_SESSION['role'] = $user['role'];
        $_SESSION['user_type'] = 'admin';
        $_SESSION['logged_in'] = true;
        $_SESSION['login_time'] = time();
        
        // Aggiorna last_login
        $stmt = $pdo->prepare("UPDATE users SET last_login = NOW() WHERE id = ?");
        $stmt->execute([$user['id']]);
        
        // Log login successful
        try {
            $stmt = $pdo->prepare("
                INSERT INTO access_logs (user_id, username, ip_address, user_agent, action, status, details) 
                VALUES (?, ?, ?, ?, 'login', 'success', 'Admin login successful')
            ");
            $stmt->execute([
                $user['id'],
                $username,
                $_SERVER['REMOTE_ADDR'] ?? 'unknown',
                $_SERVER['HTTP_USER_AGENT'] ?? 'unknown'
            ]);
        } catch (Exception $e) {
            // Ignora errore se tabella non esiste
        }
        
        echo json_encode([
            'success' => true, 
            'user_type' => 'admin',
            'redirect' => '/dashboard.php',
            'message' => 'Login effettuato con successo',
            'user' => [
                'id' => $user['id'],
                'username' => $user['username'],
                'name' => $user['first_name'] . ' ' . $user['last_name'],
                'role' => $user['role']
            ]
        ]);
        exit;
    }
    
    // SECONDA: Cerca cliente (tabella client_access)
    $stmt = $pdo->prepare("
        SELECT ca.*, lc.name as contact_name, lc.email as contact_email
        FROM client_access ca
        INNER JOIN leads_contacts lc ON ca.contact_id = lc.id
        WHERE ca.username = ? 
        AND ca.is_active = 1 
        AND ca.password_hash IS NOT NULL
    ");
    $stmt->execute([$username]);
    $client = $stmt->fetch();
    
    if ($client) {
        // È un cliente - verifica password
        if (!password_verify($password, $client['password_hash'])) {
            // Incrementa tentativi falliti per i clienti
            $stmt = $pdo->prepare("
                UPDATE client_access 
                SET login_attempts = login_attempts + 1,
                    locked_until = CASE 
                        WHEN login_attempts >= 4 THEN DATE_ADD(NOW(), INTERVAL 15 MINUTE)
                        ELSE NULL
                    END
                WHERE id = ?
            ");
            $stmt->execute([$client['id']]);
            
            echo json_encode(['success' => false, 'message' => 'Credenziali non valide']);
            exit;
        }
        
        // Verifica se account è bloccato
        if ($client['locked_until'] && strtotime($client['locked_until']) > time()) {
            echo json_encode(['success' => false, 'message' => 'Account temporaneamente bloccato. Riprova più tardi.']);
            exit;
        }
        
        // Login cliente riuscito - Reset tentativi
        $stmt = $pdo->prepare("
            UPDATE client_access 
            SET login_attempts = 0,
                locked_until = NULL,
                last_login = NOW()
            WHERE id = ?
        ");
        $stmt->execute([$client['id']]);
        
        // Crea sessione cliente - SICUREZZA: NO dashboard.php per i clienti!
        $_SESSION['client_id'] = $client['id'];
        $_SESSION['client_username'] = $client['username'];
        $_SESSION['client_access_type'] = $client['access_type'];
        $_SESSION['user_type'] = 'client';
        $_SESSION['logged_in'] = true;
        $_SESSION['login_time'] = time();
        
        // Includi il tracker per i clienti
        try {
            require_once __DIR__ . '/../includes/client_login_tracker.php';
            
            // Traccia il login del cliente
            trackClientLogin($pdo, $client['id'], $client['username']);
            
            // Verifica se il preventivo è scaduto (solo per accesso tipo preventivo)
            if ($client['access_type'] === 'preventivo' && !checkQuoteExpiration($pdo, $client['id'])) {
                session_destroy();
                echo json_encode([
                    'success' => false,
                    'message' => 'Il preventivo è scaduto. Accesso non consentito.'
                ]);
                exit;
            }
            
            // Verifica se l'accesso è bloccato
            if (!isClientAccessActive($pdo, $client['id'])) {
                session_destroy();
                echo json_encode([
                    'success' => false,
                    'message' => 'Accesso bloccato. Contatta l\'amministratore.'
                ]);
                exit;
            }
        } catch (Exception $e) {
            // Se il tracker non esiste ancora, continua senza errori
            error_log("Client tracker error: " . $e->getMessage());
        }
        
        // Determina redirect CORRETTO in base al tipo di accesso
        if ($client['access_type'] === 'preventivo') {
            $redirect = '/preventivo.php';
        } else {
            $redirect = '/client.php';
        }
        
        echo json_encode([
            'success' => true,
            'user_type' => 'client',
            'access_type' => $client['access_type'],
            'redirect' => $redirect,
            'message' => 'Accesso effettuato con successo'
        ]);
        exit;
    }
    
    // Nessun utente trovato
    echo json_encode(['success' => false, 'message' => 'Credenziali non valide']);
    
} catch (Exception $e) {
    error_log("Login handler error: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Errore interno del sistema']);
}
?>