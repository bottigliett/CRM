<?php
// File: /core/auth/logout_all.php
// Logout da tutte le sessioni per CRM Studio Mismo

header('Content-Type: application/json');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('X-XSS-Protection: 1; mode=block');

session_start();

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/Auth.php';

// Verifica che sia una richiesta POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Metodo non consentito']);
    exit;
}

// Verifica autenticazione
$auth = new Auth();
if (!$auth->isLoggedIn()) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Non autorizzato']);
    exit;
}

$currentUser = $auth->getCurrentUser();
if (!$currentUser) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Utente non trovato']);
    exit;
}

try {
    $db = getDB();
    
    // Rimuovi tutte le sessioni dell'utente dal database
    $stmt = $db->prepare("DELETE FROM user_sessions WHERE user_id = ?");
    $stmt->execute([$currentUser['id']]);
    
    // Log dell'azione
    logAccess($currentUser['id'], $currentUser['username'], 'logout_all', 'success', 'Logged out from all sessions');
    
    // Distruggi la sessione corrente
    session_destroy();
    setcookie(SESSION_NAME, '', time() - 3600, '/');
    
    echo json_encode([
        'success' => true,
        'message' => 'Disconnesso da tutti i dispositivi'
    ]);
    
} catch (Exception $e) {
    error_log("Logout all sessions error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Errore interno del server'
    ]);
}
?>