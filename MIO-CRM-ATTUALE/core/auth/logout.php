<?php
// File: /core/auth/logout.php
// Gestore logout per CRM Studio Mismo

session_start();

// Verifica che l'utente sia effettivamente loggato
if (isset($_SESSION['user_id'])) {
    try {
        // Connessione database per rimuovere sessione
        $dsn = "mysql:host=127.0.0.1;dbname=u706045794_crm_mismo;charset=utf8mb4";
        $pdo = new PDO($dsn, 'u706045794_mismo_crm_new', 'BLQ$>:;*9+h', [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
        ]);
        
        // Rimuovi sessione dal database se esiste token
        if (isset($_SESSION['session_token'])) {
            $stmt = $pdo->prepare("DELETE FROM user_sessions WHERE session_token = ?");
            $stmt->execute([$_SESSION['session_token']]);
        }
        
        // Log logout
        $stmt = $pdo->prepare("
            INSERT INTO access_logs (user_id, username, ip_address, user_agent, action, status, details) 
            VALUES (?, ?, ?, ?, 'logout', 'success', 'User logged out')
        ");
        $stmt->execute([
            $_SESSION['user_id'],
            $_SESSION['username'] ?? 'unknown',
            $_SERVER['REMOTE_ADDR'] ?? 'unknown',
            $_SERVER['HTTP_USER_AGENT'] ?? 'unknown'
        ]);
        
    } catch (Exception $e) {
        error_log("Logout error: " . $e->getMessage());
    }
}

// Distruggi sessione completamente
session_destroy();

// Rimuovi cookie di sessione
if (isset($_COOKIE[session_name()])) {
    setcookie(session_name(), '', time() - 3600, '/');
}

// Reindirizza alla pagina di login
header('Location: /index.php?message=logged_out');
exit;
?>