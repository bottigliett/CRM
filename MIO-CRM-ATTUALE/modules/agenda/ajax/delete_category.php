<?php
// File: /modules/agenda/ajax/delete_category.php
// AJAX handler per eliminare categorie

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
    
    // Verifica permessi (solo admin+ possono eliminare categorie)
    if (!in_array($currentUser['role'], ['admin', 'super_admin'])) {
        throw new Exception('Non hai i permessi per eliminare categorie');
    }
    
    // Connessione database
    $dsn = "mysql:host=127.0.0.1;dbname=u706045794_crm_mismo;charset=utf8mb4";
    $pdo = new PDO($dsn, 'u706045794_mismo_crm_new', 'BLQ$>:;*9+h', [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
    
    // Parametri
    $categoryId = !empty($_POST['category_id']) ? (int)$_POST['category_id'] : null;
    
    if (!$categoryId) {
        throw new Exception('ID categoria mancante');
    }
    
    $pdo->beginTransaction();
    
    // Ottieni dati categoria per log
    $stmt = $pdo->prepare("SELECT * FROM agenda_categories WHERE id = ?");
    $stmt->execute([$categoryId]);
    $category = $stmt->fetch();
    
    if (!$category) {
        throw new Exception('Categoria non trovata');
    }
    
    // Verifica se ci sono eventi associati
    $stmt = $pdo->prepare("SELECT COUNT(*) as event_count FROM agenda_events WHERE category_id = ?");
    $stmt->execute([$categoryId]);
    $result = $stmt->fetch();
    $eventCount = $result['event_count'];
    
    if ($eventCount > 0) {
        // Opzione 1: Impedire eliminazione se ci sono eventi
        throw new Exception("Non è possibile eliminare la categoria '{$category['name']}' perché è utilizzata da {$eventCount} eventi. Rimuovi prima gli eventi o cambia la loro categoria.");
        
        // Opzione 2: Spostare eventi a categoria di default (decommenta se preferisci questo comportamento)
        /*
        // Crea o trova categoria "Generale"
        $stmt = $pdo->prepare("SELECT id FROM agenda_categories WHERE name = 'Generale' LIMIT 1");
        $stmt->execute();
        $defaultCategory = $stmt->fetch();
        
        if (!$defaultCategory) {
            // Crea categoria generale
            $stmt = $pdo->prepare("
                INSERT INTO agenda_categories (name, color, icon, created_by, created_at, updated_at) 
                VALUES ('Generale', '#6b7280', '📁', ?, NOW(), NOW())
            ");
            $stmt->execute([$currentUser['id']]);
            $defaultCategoryId = $pdo->lastInsertId();
        } else {
            $defaultCategoryId = $defaultCategory['id'];
        }
        
        // Sposta tutti gli eventi alla categoria generale
        $stmt = $pdo->prepare("UPDATE agenda_events SET category_id = ? WHERE category_id = ?");
        $stmt->execute([$defaultCategoryId, $categoryId]);
        
        $movedMessage = " {$eventCount} eventi sono stati spostati nella categoria 'Generale'.";
        */
    }
    
    // Elimina la categoria
    $stmt = $pdo->prepare("DELETE FROM agenda_categories WHERE id = ?");
    $stmt->execute([$categoryId]);
    
    if ($stmt->rowCount() === 0) {
        throw new Exception('Categoria non trovata o già eliminata');
    }
    
    // Log dell'azione
    $details = "Categoria eliminata: '{$category['name']}' | Colore: {$category['color']} | Icona: {$category['icon']}";
    if ($eventCount > 0) {
        $details .= " | Eventi interessati: {$eventCount}";
    }
    
    logUserAction('delete_category', 'success', $details);
    
    // Log specifico per agenda
    if (function_exists('logAgendaActivity')) {
        logAgendaActivity($pdo, $currentUser['id'], 'delete_category', null, $details);
    }
    
    $pdo->commit();
    
    // Risposta di successo
    $message = "Categoria \"{$category['name']}\" eliminata con successo";
    if (isset($movedMessage)) {
        $message .= $movedMessage;
    }
    
    echo json_encode([
        'success' => true,
        'message' => $message,
        'deleted_category' => [
            'id' => $categoryId,
            'name' => $category['name'],
            'color' => $category['color'],
            'icon' => $category['icon'],
            'events_affected' => $eventCount
        ]
    ]);
    
} catch (Exception $e) {
    // Rollback transazione
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollback();
    }
    
    // Log dell'errore
    error_log("Errore delete_category.php: " . $e->getMessage());
    
    if (isset($currentUser) && isset($categoryId)) {
        logUserAction('delete_category', 'failed', "ID: {$categoryId} - Errore: " . $e->getMessage());
    }
    
    // Risposta errore
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'code' => 'CATEGORY_DELETE_ERROR'
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