<?php
// File: /ajax/check_ticket_status.php
// Controlla se un ticket è ancora attivo

session_start();

header('Content-Type: application/json');

if (!isset($_SESSION['logged_in']) || $_SESSION['user_type'] !== 'client') {
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
$clientId = $_SESSION['client_id'] ?? null;

if (!$ticketId || !$clientId) {
    die(json_encode(['error' => 'Missing parameters']));
}

try {
    $stmt = $pdo->prepare("
        SELECT status, ticket_number 
        FROM tickets 
        WHERE id = ? AND client_id = ?
    ");
    $stmt->execute([$ticketId, $clientId]);
    $ticket = $stmt->fetch();
    
    if (!$ticket) {
        die(json_encode(['error' => 'Ticket not found']));
    }
    
    echo json_encode([
        'success' => true,
        'status' => $ticket['status'],
        'ticket_number' => $ticket['ticket_number']
    ]);
    
} catch (Exception $e) {
    echo json_encode(['error' => 'Database error']);
}
?>