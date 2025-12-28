<?php
// File: /modules/ticket/ajax/get_ticket.php
// Recupera dettagli completi di un ticket per il modal admin

require_once __DIR__ . '/../../../core/includes/auth_helper.php';

header('Content-Type: application/json');

$currentUser = getCurrentUser();

try {
    $dsn = "mysql:host=127.0.0.1;dbname=u706045794_crm_mismo;charset=utf8mb4";
    $pdo = new PDO($dsn, 'u706045794_mismo_crm_new', 'BLQ$>:;*9+h', [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
} catch (Exception $e) {
    die(json_encode(['success' => false, 'error' => 'Database connection failed']));
}

$ticketId = (int)($_GET['id'] ?? 0);

if (!$ticketId) {
    die(json_encode(['success' => false, 'error' => 'ID ticket mancante']));
}

try {
    // Carica ticket con informazioni complete
    $stmt = $pdo->prepare("
        SELECT t.*, 
               ca.username as client_username,
               ca.id as client_access_id,
               lc.name as client_name,
               lc.email as client_email,
               u.first_name as assigned_name,
               u.last_name as assigned_lastname
        FROM tickets t
        LEFT JOIN client_access ca ON t.client_id = ca.id
        LEFT JOIN leads_contacts lc ON t.contact_id = lc.id
        LEFT JOIN users u ON t.assigned_to = u.id
        WHERE t.id = ?
    ");
    $stmt->execute([$ticketId]);
    $ticket = $stmt->fetch();
    
    if (!$ticket) {
        throw new Exception('Ticket non trovato');
    }
    
    // Carica messaggi con informazioni autori
    $stmt = $pdo->prepare("
        SELECT tm.*,
               u.first_name as author_name,
               u.last_name as author_lastname,
               lc.name as client_name
        FROM ticket_messages tm
        LEFT JOIN users u ON tm.user_id = u.id
        LEFT JOIN client_access ca ON tm.client_id = ca.id
        LEFT JOIN leads_contacts lc ON ca.contact_id = lc.id
        WHERE tm.ticket_id = ?
        AND tm.is_internal = 0
        ORDER BY tm.created_at ASC
    ");
    $stmt->execute([$ticketId]);
    $ticket['messages'] = $stmt->fetchAll();
    
    // Carica log attività con informazioni utenti
    $stmt = $pdo->prepare("
        SELECT tal.*,
               u.first_name as user_name,
               u.last_name as user_lastname
        FROM ticket_activity_logs tal
        LEFT JOIN users u ON tal.user_id = u.id
        WHERE tal.ticket_id = ?
        ORDER BY tal.created_at DESC
        LIMIT 20
    ");
    $stmt->execute([$ticketId]);
    $ticket['activity_logs'] = $stmt->fetchAll();
    
    // Carica informazioni ore supporto cliente
    if ($ticket['client_access_id']) {
        $stmt = $pdo->prepare("
            SELECT support_hours_included, support_hours_used
            FROM client_access 
            WHERE id = ?
        ");
        $stmt->execute([$ticket['client_access_id']]);
        $clientHours = $stmt->fetch();
        $ticket['client_support_hours'] = $clientHours;
    }
    
    // Carica lista utenti admin per assegnazione
    $stmt = $pdo->prepare("
        SELECT id, first_name, last_name 
        FROM users 
        WHERE role IN ('admin', 'super_admin') AND is_active = 1
        ORDER BY first_name, last_name
    ");
    $stmt->execute();
    $ticket['available_assignees'] = $stmt->fetchAll();
    
    echo json_encode([
        'success' => true, 
        'ticket' => $ticket
    ]);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false, 
        'error' => $e->getMessage()
    ]);
}
?>