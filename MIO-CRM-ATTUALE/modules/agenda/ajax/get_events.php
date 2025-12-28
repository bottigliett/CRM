<?php
// File: /modules/agenda/ajax/get_events.php
// AJAX handler per caricare eventi per vista corrente

header('Content-Type: application/json');
header('Cache-Control: no-cache, must-revalidate');

session_start();

// Verifica autenticazione
if (!isset($_SESSION['user_id']) || !isset($_SESSION['username'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Non autorizzato']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Metodo non consentito']);
    exit;
}

try {
    // Connessione database
    $dsn = "mysql:host=127.0.0.1;dbname=u706045794_crm_mismo;charset=utf8mb4";
    $pdo = new PDO($dsn, 'u706045794_mismo_crm_new', 'BLQ$>:;*9+h', [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);

    // Ottieni input JSON
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !isset($input['view']) || !isset($input['date'])) {
        throw new Exception('Parametri mancanti: view e date richiesti');
    }

    $view = $input['view'];
    $date = new DateTime($input['date']);
    
    // Calcola range date basato sulla vista
    switch ($view) {
        case 'day':
            $start = $date->format('Y-m-d 00:00:00');
            $end = $date->format('Y-m-d 23:59:59');
            break;
        case 'week':
            $monday = clone $date;
            $monday->modify('monday this week');
            $start = $monday->format('Y-m-d 00:00:00');
            $sunday = clone $date;
            $sunday->modify('sunday this week');
            $end = $sunday->format('Y-m-d 23:59:59');
            break;
        case 'month':
        default:
            $start = $date->format('Y-m-01 00:00:00');
            $end = $date->format('Y-m-t 23:59:59');
            
            // Per la vista mese, include anche gli eventi dei giorni precedenti/successivi mostrati
            $firstDay = new DateTime($date->format('Y-m-01'));
            $firstDayOfWeek = ($firstDay->format('w') + 6) % 7; // Lun=0, Dom=6
            $startMonth = clone $firstDay;
            $startMonth->sub(new DateInterval("P{$firstDayOfWeek}D"));
            $start = $startMonth->format('Y-m-d 00:00:00');
            
            $lastDay = new DateTime($date->format('Y-m-t'));
            $lastDayOfWeek = ($lastDay->format('w') + 6) % 7;
            $endMonth = clone $lastDay;
            $endMonth->add(new DateInterval('P' . (6 - $lastDayOfWeek) . 'D'));
            $end = $endMonth->format('Y-m-d 23:59:59');
            break;
    }

    // Query eventi con gestione multi-giorno migliorata
    $sql = "
        SELECT * FROM agenda_events_detailed 
        WHERE (
            (start_datetime <= ? AND end_datetime >= ?) OR
            (start_datetime BETWEEN ? AND ?) OR
            (end_datetime BETWEEN ? AND ?)
        )
        ORDER BY start_datetime ASC, is_all_day DESC, title ASC
    ";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$end, $start, $start, $end, $start, $end]);
    $events = $stmt->fetchAll();

    // Processa eventi per migliore visualizzazione
    $processedEvents = [];
    foreach ($events as $event) {
        // Converti datetime in oggetti più maneggevoli
        $event['start_date_obj'] = new DateTime($event['start_datetime']);
        $event['end_date_obj'] = new DateTime($event['end_datetime']);
        
        // Determina se è multi-giorno
        $event['is_multi_day'] = $event['start_date_obj']->format('Y-m-d') !== $event['end_date_obj']->format('Y-m-d');
        
        // Durata in giorni
        if ($event['is_multi_day']) {
            $interval = $event['start_date_obj']->diff($event['end_date_obj']);
            $event['duration_days'] = $interval->days + 1;
        } else {
            $event['duration_days'] = 1;
        }
        
        // Formattazione date per JS
        $event['start_formatted'] = $event['start_date_obj']->format('Y-m-d H:i:s');
        $event['end_formatted'] = $event['end_date_obj']->format('Y-m-d H:i:s');
        
        // Rimuovi oggetti DateTime (non serializzabili in JSON)
        unset($event['start_date_obj'], $event['end_date_obj']);
        
        $processedEvents[] = $event;
    }

    // Log accesso
    logAccess($_SESSION['user_id'], $_SESSION['username'], 'agenda_load_events', 'success', 
             "View: $view, Date: {$input['date']}, Events: " . count($processedEvents));

    echo json_encode([
        'success' => true,
        'events' => $processedEvents,
        'period' => [
            'start' => $start,
            'end' => $end,
            'view' => $view
        ],
        'count' => count($processedEvents)
    ]);

} catch (Exception $e) {
    error_log("Agenda get events error: " . $e->getMessage());
    
    if (isset($_SESSION['user_id'])) {
        logAccess($_SESSION['user_id'], $_SESSION['username'], 
                 'agenda_load_events', 'error', $e->getMessage());
    }
    
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Errore nel caricamento eventi: ' . $e->getMessage()
    ]);
}

function logAccess($userId, $username, $action, $status, $details = null) {
    try {
        $dsn = "mysql:host=127.0.0.1;dbname=u706045794_crm_mismo;charset=utf8mb4";
        $pdo = new PDO($dsn, 'u706045794_mismo_crm_new', 'BLQ$>:;*9+h', [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
        ]);
        
        $stmt = $pdo->prepare("
            INSERT INTO access_logs (user_id, username, ip_address, user_agent, action, status, details) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $userId,
            $username,
            $_SERVER['REMOTE_ADDR'] ?? 'unknown',
            $_SERVER['HTTP_USER_AGENT'] ?? 'unknown',
            $action,
            $status,
            $details
        ]);
    } catch (Exception $e) {
        error_log("Failed to log access: " . $e->getMessage());
    }
}
?>