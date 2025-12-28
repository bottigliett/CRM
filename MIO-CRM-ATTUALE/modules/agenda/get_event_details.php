<?php
// File: /modules/agenda/get_event_details.php
// API per recuperare dettagli evento via AJAX

header('Content-Type: application/json');
header('Cache-Control: no-cache, no-store, must-revalidate');

require_once __DIR__ . '/../../core/includes/auth_helper.php';

// Verifica autenticazione
$currentUser = getCurrentUser();
if (!$currentUser) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Non autorizzato']);
    exit;
}

// Verifica parametro ID
$eventId = $_GET['id'] ?? null;
if (!$eventId || !is_numeric($eventId)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'ID evento non valido']);
    exit;
}

try {
    // Connessione database
    $dsn = "mysql:host=127.0.0.1;dbname=u706045794_crm_mismo;charset=utf8mb4";
    $pdo = new PDO($dsn, 'u706045794_mismo_crm_new', 'BLQ$>:;*9+h', [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
    
    // Query principale per ottenere i dettagli dell'evento
    $stmt = $pdo->prepare("
        SELECT 
            e.*,
            c.name as category_name,
            c.color as category_color,
            c.icon as category_icon,
            cl.company_name as client_name,
            cl.contact_name as client_contact,
            cr.first_name as creator_first_name,
            cr.last_name as creator_last_name
        FROM agenda_events e
        LEFT JOIN agenda_categories c ON e.category_id = c.id
        LEFT JOIN clients cl ON e.client_id = cl.id
        LEFT JOIN users cr ON e.created_by = cr.id
        WHERE e.id = ?
    ");
    
    $stmt->execute([$eventId]);
    $event = $stmt->fetch();
    
    if (!$event) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Evento non trovato']);
        exit;
    }
    
    // Verifica che l'utente abbia accesso all'evento
    $stmt = $pdo->prepare("
        SELECT COUNT(*) as count 
        FROM agenda_event_responsables 
        WHERE event_id = ? AND user_id = ?
    ");
    $stmt->execute([$eventId, $currentUser['id']]);
    $hasAccess = $stmt->fetch()['count'] > 0;
    
    // Se non è responsabile, controlla se è admin o creatore
    if (!$hasAccess) {
        $isAdmin = in_array($currentUser['role'], ['admin', 'super_admin']);
        $isCreator = $event['created_by'] == $currentUser['id'];
        
        if (!$isAdmin && !$isCreator) {
            http_response_code(403);
            echo json_encode(['success' => false, 'error' => 'Accesso negato a questo evento']);
            exit;
        }
    }
    
    // Ottieni responsabili/partecipanti
    $stmt = $pdo->prepare("
        SELECT 
            u.id,
            u.first_name,
            u.last_name,
            u.email,
            r.role as event_role
        FROM agenda_event_responsables r
        JOIN users u ON r.user_id = u.id
        WHERE r.event_id = ?
        ORDER BY u.first_name, u.last_name
    ");
    $stmt->execute([$eventId]);
    $responsables = $stmt->fetchAll();
    
    // Formatta responsabili per output
    $formattedResponsables = array_map(function($resp) {
        return [
            'id' => $resp['id'],
            'name' => trim($resp['first_name'] . ' ' . $resp['last_name']),
            'email' => $resp['email'],
            'role' => $resp['event_role'] ?? 'participant'
        ];
    }, $responsables);
    
    // Ottieni informazioni sui promemoria
    $reminderMinutes = 0;
    if ($event['reminder_minutes']) {
        $reminderMinutes = $event['reminder_minutes'];
    } else {
        // Fallback: controlla nella tabella promemoria
        $stmt = $pdo->prepare("
            SELECT 
                TIMESTAMPDIFF(MINUTE, reminder_datetime, event_start_datetime) as minutes_before
            FROM agenda_email_reminders 
            WHERE event_id = ? AND user_id = ? 
            ORDER BY id DESC 
            LIMIT 1
        ");
        $stmt->execute([$eventId, $currentUser['id']]);
        $reminderData = $stmt->fetch();
        if ($reminderData) {
            $reminderMinutes = $reminderData['minutes_before'];
        }
    }
    
    // Prepara la risposta
    $response = [
        'success' => true,
        'event' => [
            'id' => $event['id'],
            'title' => $event['title'],
            'description' => $event['description'],
            'start_datetime' => $event['start_datetime'],
            'end_datetime' => $event['end_datetime'],
            'is_all_day' => $event['is_all_day'] ?? 0,
            'location' => $event['location'],
            'priority' => $event['priority'],
            'status' => $event['status'],
            'category_name' => $event['category_name'],
            'category_color' => $event['category_color'],
            'category_icon' => $event['category_icon'],
            'client_name' => $event['client_name'],
            'client_contact' => $event['client_contact'],
            'creator_name' => trim(($event['creator_first_name'] ?? '') . ' ' . ($event['creator_last_name'] ?? '')),
            'responsables' => $formattedResponsables,
            'reminder_minutes' => $reminderMinutes,
            'created_at' => $event['created_at'],
            'updated_at' => $event['updated_at'] ?? null
        ]
    ];
    
    // Log per debug (opzionale)
    error_log("Event details loaded for user {$currentUser['id']}, event {$eventId}");
    
    echo json_encode($response, JSON_UNESCAPED_UNICODE);
    
} catch (PDOException $e) {
    error_log("Database error in get_event_details.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Errore database']);
    
} catch (Exception $e) {
    error_log("General error in get_event_details.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Errore interno']);
}
?>