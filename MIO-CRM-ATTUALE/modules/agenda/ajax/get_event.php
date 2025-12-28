<?php
// File: /modules/agenda/ajax/get_event.php
// API per ottenere i dati di un evento specifico per la modifica
// VERSIONE CORRETTA CON LEADS_CONTACTS

require_once __DIR__ . '/../../../core/includes/auth_helper.php';

header('Content-Type: application/json; charset=utf-8');

try {
    // Verifica autenticazione
    $currentUser = getCurrentUser();
    if (!$currentUser) {
        throw new Exception('Utente non autenticato');
    }

    // DEBUG: Log utente corrente
    error_log("🔍 DEBUG get_event.php - User: ID={$currentUser['id']}, Role={$currentUser['role']}");
    
    // Connessione database
    $dsn = "mysql:host=127.0.0.1;dbname=u706045794_crm_mismo;charset=utf8mb4";
    $pdo = new PDO($dsn, 'u706045794_mismo_crm_new', 'BLQ$>:;*9+h', [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
    
    // Verifica parametri
    $eventId = (int)($_GET['event_id'] ?? 0);
    if (!$eventId) {
        throw new Exception('ID evento mancante');
    }
    
    // 🎯 FIX: Ottieni dati evento con JOIN su leads_contacts invece di clients
    $stmt = $pdo->prepare("
        SELECT 
            e.*,
            c.name as category_name,
            c.color as category_color,
            c.icon as category_icon,
            lc.name as client_name,
            lc.email as client_email,
            lc.phone as client_phone,
            lc.contact_type as client_type,
            lc.status as client_status,
            DATE(e.start_datetime) as start_date,
            TIME(e.start_datetime) as start_time,
            DATE(e.end_datetime) as end_date,
            TIME(e.end_datetime) as end_time,
            CASE 
                WHEN TIME(e.start_datetime) = '00:00:00' AND TIME(e.end_datetime) = '23:59:59' THEN 1
                WHEN e.is_all_day = 1 THEN 1
                ELSE 0
            END as all_day
        FROM agenda_events e
        LEFT JOIN agenda_categories c ON e.category_id = c.id
        LEFT JOIN leads_contacts lc ON e.client_id = lc.id
        WHERE e.id = ?
    ");
    
    $stmt->execute([$eventId]);
    $event = $stmt->fetch();
    
    if (!$event) {
        throw new Exception('Evento non trovato');
    }
    
    // Ottieni responsabili dell'evento
    $stmt = $pdo->prepare("
        SELECT
            r.user_id,
            u.first_name,
            u.last_name,
            u.email
        FROM agenda_event_responsables r
        JOIN users u ON r.user_id = u.id
        WHERE r.event_id = ?
        ORDER BY u.first_name, u.last_name
    ");

    $stmt->execute([$eventId]);
    $responsables = $stmt->fetchAll();

    // Estrai solo gli ID per il form
    $responsablesIds = array_map(function($r) {
        return (int)$r['user_id'];
    }, $responsables);

    // Ottieni nomi completi per visualizzazione
    $responsablesNames = array_map(function($r) {
        return $r['first_name'] . ' ' . $r['last_name'];
    }, $responsables);

    // DEBUG: Log responsabili
    error_log("🔍 DEBUG - Event ID: {$eventId}, Responsables IDs: " . json_encode($responsablesIds));

    // Verifica permessi: solo i responsabili o admin possono modificare
    $canEdit = false;
    if ($currentUser['role'] === 'super_admin') {
        $canEdit = true;
        error_log("🔍 DEBUG - Access granted: SUPER_ADMIN");
    } elseif ($currentUser['role'] === 'admin') {
        // 🎯 FIX: Gli admin possono modificare TUTTI gli eventi
        $canEdit = true;
        error_log("🔍 DEBUG - Access granted: ADMIN");
    } else {
        // Gli utenti normali possono modificare solo se sono responsabili
        $canEdit = in_array($currentUser['id'], $responsablesIds);
        error_log("🔍 DEBUG - User is responsable: " . ($canEdit ? 'YES' : 'NO'));
    }

    if (!$canEdit) {
        error_log("❌ DEBUG - Access DENIED for User ID: {$currentUser['id']}, Role: {$currentUser['role']}");
        throw new Exception('Non hai i permessi per modificare questo evento');
    }
    
    // Prepara dati per il frontend con tutti i dati del cliente
    $eventData = [
        'id' => $event['id'],
        'title' => $event['title'],
        'description' => $event['description'],
        'start_date' => $event['start_date'],
        'start_time' => $event['all_day'] ? '' : $event['start_time'],
        'end_date' => $event['end_date'],
        'end_time' => $event['all_day'] ? '' : $event['end_time'],
        'all_day' => (bool)$event['all_day'],
        'category_id' => $event['category_id'],
        'category_name' => $event['category_name'],
        'category_color' => $event['category_color'],
        'category_icon' => $event['category_icon'],
        'client_id' => $event['client_id'],
        'client_name' => $event['client_name'],
        'client_email' => $event['client_email'],
        'client_phone' => $event['client_phone'],
        'client_type' => $event['client_type'],
        'client_status' => $event['client_status'],
        'location' => $event['location'],
        'priority' => $event['priority'],
        'status' => $event['status'],
        'reminder_minutes' => $event['reminder_minutes'],
        'created_at' => $event['created_at'],
        'updated_at' => $event['updated_at']
    ];
    
    // Log dell'accesso per audit
    error_log("📋 Get Event ID {$eventId}: client_id={$event['client_id']}, client_name={$event['client_name']}");
    
    // Risposta JSON
    echo json_encode([
        'success' => true,
        'event' => $eventData,
        'responsables' => $responsables,
        'responsables_ids' => $responsablesIds,
        'responsables_names' => implode(', ', $responsablesNames),
        'can_edit' => $canEdit,
        'permissions' => [
            'can_edit' => $canEdit,
            'can_delete' => $canEdit,
            'is_admin' => in_array($currentUser['role'], ['admin', 'super_admin']),
            'is_responsable' => in_array($currentUser['id'], $responsablesIds)
        ]
    ]);
    
} catch (Exception $e) {
    // Log dell'errore
    error_log("Errore get_event.php: " . $e->getMessage());
    
    // Risposta errore
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'code' => 'EVENT_LOAD_ERROR'
    ]);
}
?>