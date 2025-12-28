<?php
// File: /modules/task_manager/ajax/get_categories.php
// Versione SEMPLIFICATA

require_once __DIR__ . '/../../../core/includes/auth_helper.php';

header('Content-Type: application/json; charset=utf-8');

try {
    $currentUser = getCurrentUser();
    if (!$currentUser) {
        throw new Exception('Utente non autenticato');
    }
    
    $dsn = "mysql:host=127.0.0.1;dbname=u706045794_crm_mismo;charset=utf8mb4";
    $pdo = new PDO($dsn, 'u706045794_mismo_crm_new', 'BLQ$>:;*9+h', [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
    ]);
    
    // Query semplice
    $sql = "SELECT * FROM task_categories WHERE is_active = 1 ORDER BY name";
    $stmt = $pdo->prepare($sql);
    $stmt->execute();
    $categories = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Converti ID a integer
    foreach ($categories as &$category) {
        $category['id'] = (int)$category['id'];
        $category['is_active'] = (int)$category['is_active'];
        $category['created_by'] = $category['created_by'] ? (int)$category['created_by'] : null;
        
        // Valida colore
        if (!preg_match('/^#[0-9a-fA-F]{6}$/', $category['color'])) {
            $category['color'] = '#3b82f6';
        }
        
        // Valida icona
        if (empty($category['icon'])) {
            $category['icon'] = '📋';
        }
    }
    
    echo json_encode([
        'success' => true,
        'categories' => $categories,
        'total' => count($categories)
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>