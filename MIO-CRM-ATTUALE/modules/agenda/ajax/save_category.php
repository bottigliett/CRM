<?php
// File: /modules/agenda/ajax/save_category.php
// AJAX handler per salvare e modificare categorie

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
    
    $pdo->beginTransaction();
    
    // Raccogli e valida dati
    $categoryId = !empty($_POST['category_id']) ? (int)$_POST['category_id'] : null;
    $name = trim($_POST['name'] ?? '');
    $color = trim($_POST['color'] ?? '#3b82f6');
    $icon = trim($_POST['icon'] ?? '📅');
    
    // Validazioni
    if (empty($name)) {
        throw new Exception('Il nome della categoria è obbligatorio');
    }
    
    if (strlen($name) > 100) {
        throw new Exception('Il nome della categoria è troppo lungo (max 100 caratteri)');
    }
    
    // Valida colore (hex)
    if (!preg_match('/^#[0-9A-Fa-f]{6}$/', $color)) {
        throw new Exception('Formato colore non valido');
    }
    
    // Valida icona (emoji o testo breve)
    if (strlen($icon) > 10) {
        throw new Exception('L\'icona è troppo lunga (max 10 caratteri)');
    }
    
    if (empty($icon)) {
        $icon = '📅'; // Default
    }
    
    // Verifica unicità del nome (escludendo la categoria corrente se in modifica)
    $stmt = $pdo->prepare("SELECT id FROM agenda_categories WHERE name = ?" . ($categoryId ? " AND id != ?" : ""));
    $params = [$name];
    if ($categoryId) {
        $params[] = $categoryId;
    }
    $stmt->execute($params);
    
    if ($stmt->fetch()) {
        throw new Exception('Esiste già una categoria con questo nome');
    }
    
    // Salva o aggiorna categoria
    if ($categoryId) {
        // Aggiorna categoria esistente
        
        // Verifica che la categoria esista
        $stmt = $pdo->prepare("SELECT * FROM agenda_categories WHERE id = ?");
        $stmt->execute([$categoryId]);
        $existingCategory = $stmt->fetch();
        
        if (!$existingCategory) {
            throw new Exception('Categoria non trovata');
        }
        
        // Verifica permessi (solo admin+ possono modificare categorie)
        if (!in_array($currentUser['role'], ['admin', 'super_admin'])) {
            throw new Exception('Non hai i permessi per modificare le categorie');
        }
        
        $stmt = $pdo->prepare("
            UPDATE agenda_categories SET 
                name = ?, color = ?, icon = ?, updated_at = NOW()
            WHERE id = ?
        ");
        
        $stmt->execute([$name, $color, $icon, $categoryId]);
        
        $action = 'update_category';
        $message = "Categoria \"{$name}\" aggiornata con successo";
        
    } else {
        // Crea nuova categoria
        
        // Verifica permessi (solo admin+ possono creare categorie)
        if (!in_array($currentUser['role'], ['admin', 'super_admin'])) {
            throw new Exception('Non hai i permessi per creare categorie');
        }
        
        $stmt = $pdo->prepare("
            INSERT INTO agenda_categories (
                name, color, icon, created_by, created_at, updated_at
            ) VALUES (?, ?, ?, ?, NOW(), NOW())
        ");
        
        $stmt->execute([$name, $color, $icon, $currentUser['id']]);
        
        $categoryId = $pdo->lastInsertId();
        $action = 'create_category';
        $message = "Categoria \"{$name}\" creata con successo";
    }
    
    // Log dell'azione
    $details = "Categoria: '{$name}' | Colore: {$color} | Icona: {$icon}";
    logUserAction($action, 'success', $details);
    
    // Log specifico per agenda
    if (function_exists('logAgendaActivity')) {
        logAgendaActivity($pdo, $currentUser['id'], $action, null, $details);
    }
    
    $pdo->commit();
    
    // Risposta di successo
    echo json_encode([
        'success' => true,
        'message' => $message,
        'category_id' => $categoryId,
        'category' => [
            'id' => $categoryId,
            'name' => $name,
            'color' => $color,
            'icon' => $icon,
            'created_by' => $currentUser['id'],
            'created_by_name' => $currentUser['first_name'] . ' ' . $currentUser['last_name']
        ]
    ]);
    
} catch (Exception $e) {
    // Rollback transazione
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollback();
    }
    
    // Log dell'errore
    error_log("Errore save_category.php: " . $e->getMessage());
    
    if (isset($currentUser)) {
        logUserAction('save_category', 'failed', "Errore: " . $e->getMessage());
    }
    
    // Risposta errore
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'code' => 'CATEGORY_SAVE_ERROR'
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