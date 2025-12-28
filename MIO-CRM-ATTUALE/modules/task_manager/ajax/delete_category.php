<?php
// File: /modules/task_manager/ajax/delete_category.php
// AJAX per eliminare categorie task

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
        throw new Exception('Solo i super admin possono eliminare le categorie');
    }
    
    // Connessione database
    $dsn = "mysql:host=127.0.0.1;dbname=u706045794_crm_mismo;charset=utf8mb4";
    $pdo = new PDO($dsn, 'u706045794_mismo_crm_new', 'BLQ$>:;*9+h', [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
    
    // Validazione azione
    $action = $_POST['action'] ?? '';
    if ($action !== 'delete') {
        throw new Exception('Azione non valida: ' . $action);
    }
    
    // ID categoria
    $categoryId = (int)($_POST['category_id'] ?? 0);
    if ($categoryId <= 0) {
        throw new Exception('ID categoria non valido');
    }
    
    // Verifica che la categoria esista
    $stmt = $pdo->prepare("SELECT * FROM task_categories WHERE id = ?");
    $stmt->execute([$categoryId]);
    $category = $stmt->fetch();
    
    if (!$category) {
        throw new Exception('Categoria non trovata');
    }
    
    // Verifica che non ci siano task associati
    $stmt = $pdo->prepare("SELECT COUNT(*) as count FROM tasks WHERE category_id = ?");
    $stmt->execute([$categoryId]);
    $taskCount = $stmt->fetch()['count'];
    
    if ($taskCount > 0) {
        throw new Exception("Impossibile eliminare la categoria '{$category['name']}': contiene {$taskCount} task. Sposta prima i task in un'altra categoria.");
    }
    
    // Inizia transazione
    $pdo->beginTransaction();
    
    try {
        // Elimina categoria
        $stmt = $pdo->prepare("DELETE FROM task_categories WHERE id = ?");
        $stmt->execute([$categoryId]);
        
        if ($stmt->rowCount() === 0) {
            throw new Exception('Nessuna categoria eliminata');
        }
        
        // Commit transazione
        $pdo->commit();
        
        // Pulisci output buffer
        ob_clean();
        
        echo json_encode([
            'success' => true,
            'message' => "Categoria '{$category['name']}' eliminata con successo",
            'category_id' => $categoryId,
            'category_name' => $category['name'],
            'timestamp' => date('Y-m-d H:i:s')
        ], JSON_UNESCAPED_UNICODE);
        
    } catch (Exception $e) {
        $pdo->rollback();
        throw $e;
    }
    
} catch (PDOException $e) {
    error_log("Database error in delete_category: " . $e->getMessage());
    ob_clean();
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Errore del database: ' . $e->getMessage(),
        'type' => 'database_error'
    ], JSON_UNESCAPED_UNICODE);
    
} catch (Exception $e) {
    error_log("Application error in delete_category: " . $e->getMessage());
    ob_clean();
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'type' => 'validation_error'
    ], JSON_UNESCAPED_UNICODE);
}
?>