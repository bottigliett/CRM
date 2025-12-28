<?php
// File: /ajax/check_chat_messages.php
// Controlla se ci sono nuovi messaggi per la chat del cliente

session_start();

header('Content-Type: application/json');

if (!isset($_SESSION['logged_in']) || !$_SESSION['logged_in'] || $_SESSION['user_type'] !== 'client') {
    die(json_encode(['error' => 'Unauthorized']));
}

try {
    $dsn = "mysql:host=127.0.0.1;dbname=u706045794_crm_mismo;charset=utf8mb4";
    $pdo = new PDO($dsn, 'u706045794_mismo_crm_new', 'BLQ$>:;*9+h', [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
} catch (Exception $e) {
    die(json_encode(['error' => 'Database connection failed']));
}

$ticketId = (int)($_GET['ticket_id'] ?? 0);
$lastCheck = (int)($_GET['last_check'] ?? 0);
$clientId = $_SESSION['client_id'];

if (!$ticketId || !$lastCheck) {
    die(json_encode(['error' => 'Missing parameters']));
}

try {
    // Verifica che il ticket appartenga al cliente
    $stmt = $pdo->prepare("
        SELECT COUNT(*) FROM tickets 
        WHERE id = ? AND client_id = ?
    ");
    $stmt->execute([$ticketId, $clientId]);

    if (!$stmt->fetchColumn()) {
        die(json_encode(['error' => 'Ticket not found']));
    }

    // Controlla se ci sono nuovi messaggi dall'admin dopo l'ultimo controllo
    $stmt = $pdo->prepare("
        SELECT COUNT(*) as new_count
        FROM ticket_messages 
        WHERE ticket_id = ? 
        AND user_id IS NOT NULL 
        AND created_at > FROM_UNIXTIME(?)
        AND is_internal = 0
    ");
    $stmt->execute([$ticketId, $lastCheck / 1000]);

    $result = $stmt->fetch();
    
    echo json_encode([
        'success' => true,
        'hasNewMessages' => $result['new_count'] > 0,
        'newCount' => $result['new_count']
    ]);
    
} catch (Exception $e) {
    echo json_encode([
        'error' => 'Database error: ' . $e->getMessage()
    ]);
}
?>