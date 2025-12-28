<?php
// File: /modules/agenda/ajax/save_event.php
// VERSIONE ULTRA-DEBUG per risolvere HTTP 400

// Disabilita completamente gli errori PHP per avere JSON pulito
ini_set('display_errors', 0);
ini_set('log_errors', 1);
error_reporting(0);

// Headers JSON obbligatori
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-cache, must-revalidate');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

// Cattura TUTTO l'output
ob_start();

// Log di debug dettagliato
$debugLog = [];
$debugLog[] = "=== SAVE EVENT ULTRA DEBUG " . date('Y-m-d H:i:s') . " ===";

try {
    $debugLog[] = "1. Inizio script";
    
    // Verifica metodo
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Metodo non POST: ' . $_SERVER['REQUEST_METHOD']);
    }
    $debugLog[] = "2. Metodo POST OK";
    
    // Log dati ricevuti
    $debugLog[] = "3. POST data: " . json_encode($_POST);
    $debugLog[] = "4. FILES data: " . json_encode($_FILES);
    
    // Includi auth_helper - PERCORSO ASSOLUTO
    $authPath = $_SERVER['DOCUMENT_ROOT'] . '/core/includes/auth_helper.php';
    if (!file_exists($authPath)) {
        throw new Exception("auth_helper.php non trovato in: " . $authPath);
    }
    require_once $authPath;
    $debugLog[] = "5. auth_helper.php incluso";
    
    // Verifica autenticazione
    $currentUser = getCurrentUser();
    if (!$currentUser) {
        throw new Exception('Utente non autenticato');
    }
    $debugLog[] = "6. Utente autenticato: " . $currentUser['id'];
    
    // Connessione database
    $dsn = "mysql:host=127.0.0.1;dbname=u706045794_crm_mismo;charset=utf8mb4";
    $pdo = new PDO($dsn, 'u706045794_mismo_crm_new', 'BLQ$>:;*9+h', [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
    $debugLog[] = "7. Database connesso";
    
    // VALIDAZIONE MINIMA
    $title = trim($_POST['title'] ?? '');
    $startDate = trim($_POST['start_date'] ?? '');
    $categoryId = (int)($_POST['category_id'] ?? 0);
    
    $debugLog[] = "8. Dati estratti - Title: '$title', Date: '$startDate', Category: $categoryId";
    
    if (empty($title)) {
        throw new Exception('Titolo mancante');
    }
    if (empty($startDate)) {
        throw new Exception('Data mancante');
    }
    if (!$categoryId) {
        throw new Exception('Categoria mancante');
    }
    
    $debugLog[] = "9. Validazione base OK";
    
    // Verifica categoria esiste
    $stmt = $pdo->prepare("SELECT id, name FROM agenda_categories WHERE id = ?");
    $stmt->execute([$categoryId]);
    $category = $stmt->fetch();
    
    if (!$category) {
        throw new Exception("Categoria ID $categoryId non trovata");
    }
    $debugLog[] = "10. Categoria verificata: " . $category['name'];
    
    // INSERIMENTO EVENTO SEMPLIFICATO
    $pdo->beginTransaction();
    
    $stmt = $pdo->prepare("
        INSERT INTO agenda_events (
            title, 
            start_datetime, 
            end_datetime,
            category_id, 
            created_by, 
            created_at, 
            updated_at
        ) VALUES (?, ?, ?, ?, ?, NOW(), NOW())
    ");
    
    $startDateTime = $startDate . ' 09:00:00';
    $endDateTime = $startDate . ' 10:00:00';
    
    $stmt->execute([
        $title,
        $startDateTime,
        $endDateTime,
        $categoryId,
        $currentUser['id']
    ]);
    
    $eventId = $pdo->lastInsertId();
    $debugLog[] = "11. Evento creato con ID: $eventId";
    
    // Aggiungi responsabile (solo utente corrente per semplicità)
    $stmt = $pdo->prepare("
        INSERT INTO agenda_event_responsables (event_id, user_id, role, created_at)
        VALUES (?, ?, 'participant', NOW())
    ");
    $stmt->execute([$eventId, $currentUser['id']]);
    
    $debugLog[] = "12. Responsabile aggiunto";
    
    $pdo->commit();
    $debugLog[] = "13. Transazione committata";
    
    // Log di successo
    foreach ($debugLog as $log) {
        error_log($log);
    }
    
    // Pulisci output buffer
    ob_clean();
    
    // Risposta di successo
    echo json_encode([
        'success' => true,
        'message' => 'Evento creato con successo (versione debug)',
        'event_id' => $eventId,
        'debug' => [
            'title' => $title,
            'date' => $startDate,
            'category' => $category['name'],
            'user_id' => $currentUser['id'],
            'timestamp' => date('Y-m-d H:i:s')
        ]
    ]);
    
} catch (Exception $e) {
    // Rollback se necessario
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollback();
    }
    
    $debugLog[] = "ERROR: " . $e->getMessage();
    $debugLog[] = "File: " . $e->getFile() . " Line: " . $e->getLine();
    
    // Log completo errore
    foreach ($debugLog as $log) {
        error_log($log);
    }
    
    // Pulisci output buffer
    ob_clean();
    
    // Risposta errore
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'debug' => [
            'post_data' => $_POST,
            'server_info' => [
                'REQUEST_METHOD' => $_SERVER['REQUEST_METHOD'] ?? 'UNKNOWN',
                'CONTENT_TYPE' => $_SERVER['CONTENT_TYPE'] ?? 'UNKNOWN',
                'HTTP_HOST' => $_SERVER['HTTP_HOST'] ?? 'UNKNOWN',
                'REQUEST_URI' => $_SERVER['REQUEST_URI'] ?? 'UNKNOWN'
            ],
            'file' => basename($e->getFile()),
            'line' => $e->getLine(),
            'timestamp' => date('Y-m-d H:i:s')
        ]
    ]);
}

error_log("=== SAVE EVENT ULTRA DEBUG END ===");
?>