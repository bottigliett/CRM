<?php
// File: /modules/task_manager/ajax/save_category.php
// AJAX per salvare categorie task

require_once __DIR__ . '/../../../core/includes/auth_helper.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-cache, must-revalidate');

// Disabilita output di errori per JSON pulito
ini_set('display_errors', 0);
error_reporting(0);

// Cattura output indesiderato
ob_start();

try {
    // Verifica metodo POST
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Metodo non permesso');
    }
    
    // Verifica autenticazione
    $currentUser = getCurrentUser();
    if (!$currentUser || !isset($currentUser['id'])) {
        throw new Exception('Utente non autenticato');
    }
    
    // Verifica che sia admin
    if (!in_array($currentUser['role'], ['admin', 'super_admin'])) {
        throw new Exception('Solo gli admin possono gestire le categorie');
    }
    
    // Connessione database
    $dsn = "mysql:host=127.0.0.1;dbname=u706045794_crm_mismo;charset=utf8mb4";
    $pdo = new PDO($dsn, 'u706045794_mismo_crm_new', 'BLQ$>:;*9+h', [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
    
    // Validazione azione
    $action = $_POST['action'] ?? '';
    if ($action !== 'save') {
        throw new Exception('Azione non valida: ' . $action);
    }
    
    // Raccogli dati POST
    $categoryId = !empty($_POST['category_id']) ? (int)$_POST['category_id'] : null;
    $name = trim($_POST['name'] ?? '');
    $description = trim($_POST['description'] ?? '');
    $color = trim($_POST['color'] ?? '#3b82f6');
    $icon = trim($_POST['icon'] ?? '📋');
    $isActive = isset($_POST['is_active']) ? (int)$_POST['is_active'] : 1;
    
    // Validazione campi obbligatori
    if (empty($name)) {
        throw new Exception('Il nome della categoria è obbligatorio');
    }
    
    if (strlen($name) > 100) {
        throw new Exception('Il nome della categoria non può superare 100 caratteri');
    }
    
    // Validazione colore
    if (!preg_match('/^#[0-9a-fA-F]{6}$/', $color)) {
        $color = '#3b82f6';
    }
    
    // Validazione icona
    if (empty($icon)) {
        $icon = '📋';
    }
    
    // Limita lunghezza icona
    if (mb_strlen($icon, 'UTF-8') > 10) {
        $icon = mb_substr($icon, 0, 10, 'UTF-8');
    }
    
    // Verifica nome duplicato
    $sql = "SELECT id FROM task_categories WHERE name = ? AND is_active = 1";
    $params = [$name];
    
    if ($categoryId) {
        $sql .= " AND id != ?";
        $params[] = $categoryId;
    }
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    
    if ($stmt->fetch()) {
        throw new Exception('Esiste già una categoria attiva con questo nome');
    }
    
    $isEdit = ($categoryId !== null);
    
    if ($isEdit) {
        // Modifica categoria esistente
        $stmt = $pdo->prepare("SELECT * FROM task_categories WHERE id = ?");
        $stmt->execute([$categoryId]);
        $existingCategory = $stmt->fetch();
        
        if (!$existingCategory) {
            throw new Exception('Categoria non trovata per la modifica');
        }
        
        $stmt = $pdo->prepare("
            UPDATE task_categories 
            SET name = ?, 
                description = ?, 
                color = ?, 
                icon = ?, 
                is_active = ?,
                updated_at = NOW()
            WHERE id = ?
        ");
        
        $stmt->execute([
            $name,
            $description,
            $color,
            $icon,
            $isActive,
            $categoryId
        ]);
        
        $message = 'Categoria aggiornata con successo';
        
    } else {
        // Crea nuova categoria
        $stmt = $pdo->prepare("
            INSERT INTO task_categories (name, description, color, icon, is_active, created_by, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
        ");
        
        $stmt->execute([
            $name,
            $description,
            $color,
            $icon,
            $isActive,
            $currentUser['id']
        ]);
        
        $categoryId = $pdo->lastInsertId();
        $message = 'Categoria creata con successo';
    }
    
    // Ottieni categoria aggiornata per la risposta
    $stmt = $pdo->prepare("
        SELECT 
            tc.*,
            u.first_name as creator_first_name,
            u.last_name as creator_last_name
        FROM task_categories tc
        LEFT JOIN users u ON tc.created_by = u.id
        WHERE tc.id = ?
    ");
    $stmt->execute([$categoryId]);
    $category = $stmt->fetch();
    
    if ($category) {
        // Post-processing
        $category['id'] = (int)$category['id'];
        $category['is_active'] = (int)$category['is_active'];
        $category['created_by'] = $category['created_by'] ? (int)$category['created_by'] : null;
        
        if ($category['creator_first_name']) {
            $category['creator_name'] = $category['creator_first_name'] . ' ' . $category['creator_last_name'];
        } else {
            $category['creator_name'] = 'Sistema';
        }
    }
    
    // Pulisci output buffer
    ob_clean();
    
    echo json_encode([
        'success' => true,
        'message' => $message,
        'category_id' => $categoryId,
        'action' => $isEdit ? 'updated' : 'created',
        'category' => $category,
        'timestamp' => date('Y-m-d H:i:s')
    ], JSON_UNESCAPED_UNICODE);
    
} catch (PDOException $e) {
    error_log("Database error in save_category: " . $e->getMessage());
    ob_clean();
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Errore del database: ' . $e->getMessage(),
        'type' => 'database_error'
    ], JSON_UNESCAPED_UNICODE);
    
} catch (Exception $e) {
    error_log("Application error in save_category: " . $e->getMessage());
    ob_clean();
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'type' => 'validation_error'
    ], JSON_UNESCAPED_UNICODE);
}
?>