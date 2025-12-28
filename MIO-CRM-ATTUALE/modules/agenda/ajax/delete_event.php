<?php
// File: /modules/agenda/ajax/delete_event.php
// AJAX handler per eliminare eventi

header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../../../core/includes/auth_helper.php';

try {
    // Verifica autenticazione
    $currentUser = getCurrentUser();
    if (!$currentUser) {
        throw new Exception('Utente non autenticato');
    }
    
    // Verifica metodo POST
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Metodo non supportato');
    }
    
    // Verifica CSRF token
    if (!isset($_POST['csrf_token']) || !validateCSRFToken($_POST['csrf_token'])) {
        throw new Exception('Token CSRF non valido');
    }
    
    // Connessione database
    $dsn = "mysql:host=127.0.0.1;dbname=u706045794_crm_mismo;charset=utf8mb4";
    $pdo = new PDO($dsn, 'u706045794_mismo_crm_new', 'BLQ$>:;*9+h', [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
    
    // Parametri
    $eventId = !empty($_POST['event_id']) ? (int)$_POST['event_id'] : null;
    
    if (!$eventId) {
        throw new Exception('ID evento mancante');
    }
    
    $pdo->beginTransaction();
    
    // Ottieni dati evento per verifica permessi e log
    $stmt = $pdo->prepare("
        SELECT 
            e.*,
            c.name as category_name,
            GROUP_CONCAT(CONCAT(u.first_name, ' ', u.last_name)) as responsables_names
        FROM agenda_events e
        LEFT JOIN agenda_categories c ON e.category_id = c.id
        LEFT JOIN agenda_event_responsables r ON e.id = r.event_id
        LEFT JOIN users u ON r.user_id = u.id
        WHERE e.id = ?
        GROUP BY e.id
    ");
    $stmt->execute([$eventId]);
    $event = $stmt->fetch();
    
    if (!$event) {
        throw new Exception('Evento non trovato');
    }
    
    // Verifica permessi
    $canDelete = false;
    
    if ($currentUser['role'] === 'super_admin') {
        $canDelete = true;
    } elseif ($currentUser['role'] === 'admin') {
        // Verifica se l'utente è responsabile dell'evento o l'ha creato
        $stmt = $pdo->prepare("
            SELECT COUNT(*) as can_delete
            FROM agenda_events e
            LEFT JOIN agenda_event_responsables r ON e.id = r.event_id
            WHERE e.id = ? AND (e.created_by = ? OR r.user_id = ?)
        ");
        $stmt->execute([$eventId, $currentUser['id'], $currentUser['id']]);
        $result = $stmt->fetch();
        $canDelete = $result['can_delete'] > 0;
    }
    
    if (!$canDelete) {
        throw new Exception('Non hai i permessi per eliminare questo evento');
    }
    
    // Elimina prima i responsabili (foreign key)
    $stmt = $pdo->prepare("DELETE FROM agenda_event_responsables WHERE event_id = ?");
    $stmt->execute([$eventId]);
    
    // Elimina notifiche correlate (se esistono)
    try {
        $stmt = $pdo->prepare("DELETE FROM agenda_notifications WHERE event_id = ?");
        $stmt->execute([$eventId]);
    } catch (Exception $e) {
        // Tabella notifiche potrebbe non esistere, continua
    }
    
    try {
        $stmt = $pdo->prepare("DELETE FROM notifications WHERE related_id = ? AND related_type = 'agenda_event'");
        $stmt->execute([$eventId]);
    } catch (Exception $e) {
        // Tabella notifications potrebbe non esistere, continua
    }
    
    // Elimina l'evento
    $stmt = $pdo->prepare("DELETE FROM agenda_events WHERE id = ?");
    $stmt->execute([$eventId]);
    
    if ($stmt->rowCount() === 0) {
        throw new Exception('Evento non trovato o già eliminato');
    }
    
    // Log dell'azione
    $details = "Evento eliminato: '{$event['title']}' | Categoria: {$event['category_name']} | Responsabili: {$event['responsables_names']}";
    logUserAction('delete_event', 'success', $details);
    
    // Log specifico per agenda
    if (function_exists('logAgendaActivity')) {
        logAgendaActivity($pdo, $currentUser['id'], 'delete_event', $eventId, $details);
    }
    
    $pdo->commit();
    
    // Risposta di successo
    echo json_encode([
        'success' => true,
        'message' => "Evento \"{$event['title']}\" eliminato con successo",
        'deleted_event' => [
            'id' => $eventId,
            'title' => $event['title'],
            'category' => $event['category_name'],
            'responsables' => $event['responsables_names']
        ]
    ]);
    
} catch (Exception $e) {
    // Rollback transazione
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollback();
    }
    
    // Log dell'errore
    error_log("Errore delete_event.php: " . $e->getMessage());
    
    if (isset($currentUser) && isset($eventId)) {
        logUserAction('delete_event', 'failed', "ID: {$eventId} - Errore: " . $e->getMessage());
    }
    
    // Risposta errore
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'code' => 'EVENT_DELETE_ERROR'
    ]);
}

// Funzione helper per log agenda (se non esiste)
function logAgendaActivity($pdo, $userId, $action, $eventId, $details) {
    try {
        // Verifica se esiste la tabella agenda_activity_logs
        $stmt = $pdo->query("SHOW TABLES LIKE 'agenda_activity_logs'");
        if ($stmt->rowCount() === 0) {
            return; // Tabella non esiste, salta il log
        }
        
        $stmt = $pdo->prepare("
            INSERT INTO agenda_activity_logs (user_id, action, event_id, details, created_at) 
            VALUES (?, ?, ?, ?, NOW())
        ");
        $stmt->execute([$userId, $action, $eventId, $details]);
        
    } catch (Exception $e) {
        error_log("Errore log agenda activity: " . $e->getMessage());
    }
}
?>