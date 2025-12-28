<?php
// File: /modules/agenda/ajax/categories.php
// AJAX handler per gestire categorie agenda

header('Content-Type: application/json');
header('Cache-Control: no-cache, must-revalidate');

// Start session for auth
session_start();

// Verifica autenticazione
if (!isset($_SESSION['user_id']) || !isset($_SESSION['username'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Non autorizzato']);
    exit;
}

try {
    // Connessione database
    $dsn = "mysql:host=127.0.0.1;dbname=u706045794_crm_mismo;charset=utf8mb4";
    $pdo = new PDO($dsn, 'u706045794_mismo_crm_new', 'BLQ$>:;*9+h', [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);

    $method = $_SERVER['REQUEST_METHOD'];
    $userId = $_SESSION['user_id'];

    switch ($method) {
        case 'GET':
            handleGetCategories($pdo, $userId);
            break;
        case 'POST':
            handleCreateCategory($pdo, $userId);
            break;
        case 'PUT':
            handleUpdateCategory($pdo, $userId);
            break;
        case 'DELETE':
            handleDeleteCategory($pdo, $userId);
            break;
        default:
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Metodo non supportato']);
            break;
    }

} catch (Exception $e) {
    error_log("Agenda categories error: " . $e->getMessage());
    
    if (isset($_SESSION['user_id'])) {
        logAccess($_SESSION['user_id'], $_SESSION['username'], 
                 'agenda_categories', 'error', $e->getMessage());
    }
    
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Errore interno del server'
    ]);
}

function handleGetCategories($pdo, $userId) {
    $sql = "SELECT * FROM agenda_categories ORDER BY name";
    $stmt = $pdo->query($sql);
    $categories = $stmt->fetchAll();

    echo json_encode([
        'success' => true,
        'categories' => $categories
    ]);
}

function handleCreateCategory($pdo, $userId) {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        throw new Exception('Dati non validi');
    }

    // Validazione
    $errors = validateCategoryInput($input);
    if (!empty($errors)) {
        echo json_encode(['success' => false, 'message' => 'Errori: ' . implode(', ', $errors)]);
        return;
    }

    // Verifica nome unico
    $checkSql = "SELECT id FROM agenda_categories WHERE name = ?";
    $checkStmt = $pdo->prepare($checkSql);
    $checkStmt->execute([trim($input['name'])]);
    
    if ($checkStmt->fetch()) {
        echo json_encode(['success' => false, 'message' => 'Nome categoria già esistente']);
        return;
    }

    // Inserimento
    $sql = "INSERT INTO agenda_categories (name, color, icon, created_by) VALUES (?, ?, ?, ?)";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        trim($input['name']),
        $input['color'] ?? '#3b82f6',
        $input['icon'] ?? '📅',
        $userId
    ]);

    $categoryId = $pdo->lastInsertId();

    logAccess($userId, $_SESSION['username'], 'agenda_create_category', 'success', 
             "Category: {$input['name']} (ID: $categoryId)");

    echo json_encode([
        'success' => true,
        'message' => 'Categoria creata con successo',
        'category_id' => $categoryId
    ]);
}

function handleUpdateCategory($pdo, $userId) {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || empty($input['id'])) {
        throw new Exception('ID categoria non fornito');
    }

    $categoryId = (int)$input['id'];

    // Verifica esistenza e permessi
    $checkSql = "SELECT name FROM agenda_categories WHERE id = ?";
    $checkStmt = $pdo->prepare($checkSql);
    $checkStmt->execute([$categoryId]);
    $existing = $checkStmt->fetch();

    if (!$existing) {
        throw new Exception('Categoria non trovata');
    }

    // Validazione
    $errors = validateCategoryInput($input);
    if (!empty($errors)) {
        echo json_encode(['success' => false, 'message' => 'Errori: ' . implode(', ', $errors)]);
        return;
    }

    // Verifica nome unico (escludendo se stesso)
    $checkSql = "SELECT id FROM agenda_categories WHERE name = ? AND id != ?";
    $checkStmt = $pdo->prepare($checkSql);
    $checkStmt->execute([trim($input['name']), $categoryId]);
    
    if ($checkStmt->fetch()) {
        echo json_encode(['success' => false, 'message' => 'Nome categoria già esistente']);
        return;
    }

    // Aggiornamento
    $sql = "UPDATE agenda_categories SET name = ?, color = ?, icon = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        trim($input['name']),
        $input['color'] ?? '#3b82f6',
        $input['icon'] ?? '📅',
        $categoryId
    ]);

    logAccess($userId, $_SESSION['username'], 'agenda_update_category', 'success', 
             "Category: {$input['name']} (ID: $categoryId)");

    echo json_encode([
        'success' => true,
        'message' => 'Categoria aggiornata con successo'
    ]);
}

function handleDeleteCategory($pdo, $userId) {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || empty($input['id'])) {
        throw new Exception('ID categoria non fornito');
    }

    $categoryId = (int)$input['id'];

    // Verifica esistenza
    $checkSql = "SELECT name FROM agenda_categories WHERE id = ?";
    $checkStmt = $pdo->prepare($checkSql);
    $checkStmt->execute([$categoryId]);
    $category = $checkStmt->fetch();

    if (!$category) {
        throw new Exception('Categoria non trovata');
    }

    // Verifica se ci sono eventi che usano questa categoria
    $eventsSql = "SELECT COUNT(*) as count FROM agenda_events WHERE category_id = ?";
    $eventsStmt = $pdo->prepare($eventsSql);
    $eventsStmt->execute([$categoryId]);
    $eventsCount = $eventsStmt->fetch()['count'];

    if ($eventsCount > 0) {
        echo json_encode([
            'success' => false, 
            'message' => "Impossibile eliminare: ci sono $eventsCount eventi che usano questa categoria"
        ]);
        return;
    }

    // Eliminazione
    $sql = "DELETE FROM agenda_categories WHERE id = ?";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$categoryId]);

    logAccess($userId, $_SESSION['username'], 'agenda_delete_category', 'success', 
             "Category: {$category['name']} (ID: $categoryId)");

    echo json_encode([
        'success' => true,
        'message' => 'Categoria eliminata con successo'
    ]);
}

function validateCategoryInput($input) {
    $errors = [];
    
    // Nome obbligatorio
    if (empty(trim($input['name'] ?? ''))) {
        $errors[] = 'Il nome è obbligatorio';
    } elseif (strlen(trim($input['name'])) > 100) {
        $errors[] = 'Il nome è troppo lungo (max 100 caratteri)';
    }
    
    // Colore valido
    if (!empty($input['color']) && !preg_match('/^#[0-9A-Fa-f]{6}$/', $input['color'])) {
        $errors[] = 'Colore non valido (formato: #RRGGBB)';
    }
    
    // Icona valida
    if (!empty($input['icon']) && strlen($input['icon']) > 20) {
        $errors[] = 'Icona troppo lunga (max 20 caratteri)';
    }
    
    return $errors;
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