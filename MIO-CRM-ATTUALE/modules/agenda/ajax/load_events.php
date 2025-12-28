<?php
// File: /modules/agenda/ajax/load_events.php
// AJAX handler per caricare eventi del calendario

header('Content-Type: application/json');
require_once __DIR__ . '/../../../core/includes/auth_helper.php';

try {
    // Verifica autenticazione
    $currentUser = getCurrentUser();
    
    // Connessione database
    $dsn = "mysql:host=127.0.0.1;dbname=u706045794_crm_mismo;charset=utf8mb4";
    $pdo = new PDO($dsn, 'u706045794_mismo_crm_new', 'BLQ$>:;*9+h', [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
    
    // Parametri
    $view = $_GET['view'] ?? 'month';
    $date = $_GET['date'] ?? date('Y-m-d');
    
    // Validazione data
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
        throw new Exception('Formato data non valido');
    }
    
    $dateObj = new DateTime($date);
    
    // Calcola range date in base alla vista
    switch ($view) {
        case 'day':
            $startDate = $date . ' 00:00:00';
            $endDate = $date . ' 23:59:59';
            break;
            
        case 'week':
            // Trova il lunedì della settimana
            $monday = clone $dateObj;
            $monday->modify('monday this week');
            $sunday = clone $dateObj;
            $sunday->modify('sunday this week');
            $startDate = $monday->format('Y-m-d 00:00:00');
            $endDate = $sunday->format('Y-m-d 23:59:59');
            break;
            
        case 'month':
        default:
            // Primo e ultimo giorno del mese
            $startDate = $dateObj->format('Y-m-01 00:00:00');
            $endDate = $dateObj->format('Y-m-t 23:59:59');
            
            // Espandi per includere i giorni delle settimane adiacenti mostrate nel calendario
            $firstDayOfMonth = new DateTime($dateObj->format('Y-m-01'));
            $lastDayOfMonth = new DateTime($dateObj->format('Y-m-t'));
            
            // Trova il lunedì della prima settimana mostrata
            $calendarStart = clone $firstDayOfMonth;
            if ($calendarStart->format('w') != 1) { // Se non è lunedì
                $calendarStart->modify('monday this week');
            }
            
            // Trova la domenica dell'ultima settimana mostrata
            $calendarEnd = clone $lastDayOfMonth;
            if ($calendarEnd->format('w') != 0) { // Se non è domenica
                $calendarEnd->modify('sunday this week');
            }
            
            $startDate = $calendarStart->format('Y-m-d 00:00:00');
            $endDate = $calendarEnd->format('Y-m-d 23:59:59');
            break;
    }
    
    // Query per ottenere gli eventi
    $stmt = $pdo->prepare("
        SELECT * FROM agenda_events_detailed 
        WHERE (
            (start_datetime <= ? AND end_datetime >= ?) OR
            (start_datetime BETWEEN ? AND ?)
        )
        ORDER BY start_datetime ASC
    ");
    $stmt->execute([$endDate, $startDate, $startDate, $endDate]);
    $events = $stmt->fetchAll();
    
    // Formatta gli eventi per il frontend
    $formattedEvents = array_map(function($event) {
        return [
            'id' => $event['id'],
            'title' => $event['title'],
            'description' => $event['description'],
            'start_datetime' => $event['start_datetime'],
            'end_datetime' => $event['end_datetime'],
            'start_date' => date('Y-m-d', strtotime($event['start_datetime'])),
            'start_time' => date('H:i', strtotime($event['start_datetime'])),
            'end_date' => date('Y-m-d', strtotime($event['end_datetime'])),
            'end_time' => date('H:i', strtotime($event['end_datetime'])),
            'is_all_day' => (bool)$event['is_all_day'],
            'location' => $event['location'],
            'priority' => $event['priority'],
            'status' => $event['status'],
            'category_id' => $event['category_id'],
            'category_name' => $event['category_name'],
            'category_color' => $event['category_color'],
            'category_icon' => $event['category_icon'],
            'client_id' => $event['client_id'],
            'client_name' => $event['client_name'],
            'client_contact' => $event['client_contact'],
            'created_by' => $event['created_by'],
            'created_by_name' => $event['created_by_name'] . ' ' . $event['created_by_lastname'],
            'assigned_to' => $event['assigned_to'],
            'assigned_to_name' => $event['assigned_to_name'] . ' ' . $event['assigned_to_lastname'],
            'responsables_names' => $event['responsables_names'],
            'responsables_ids' => $event['responsables_ids'] ? explode(',', $event['responsables_ids']) : [],
            'is_recurring' => (bool)$event['is_recurring'],
            'reminder_minutes' => $event['reminder_minutes']
        ];
    }, $events);
    
    // Log dell'accesso
    logUserAction('agenda_load_events', 'success', "View: {$view}, Date: {$date}, Events: " . count($formattedEvents));
    
    echo json_encode([
        'success' => true,
        'events' => $formattedEvents,
        'period' => [
            'start' => $startDate,
            'end' => $endDate,
            'view' => $view,
            'date' => $date
        ],
        'total' => count($formattedEvents)
    ]);
    
} catch (Exception $e) {
    error_log("Agenda load events error: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>