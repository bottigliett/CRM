<?php
header('Content-Type: application/json');
require_once $_SERVER['DOCUMENT_ROOT'] . '/core/includes/auth_helper.php';

if (!requireAuth()) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Non autorizzato']);
    exit;
}

try {
    $dsn = "mysql:host=127.0.0.1;dbname=u706045794_crm_mismo;charset=utf8mb4";
    $pdo = new PDO($dsn, 'u706045794_mismo_crm_new', 'BLQ$>:;*9+h', [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
    ]);
    
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (empty($data['name']) || empty($data['type'])) {
        throw new Exception('Nome e tipo sono obbligatori');
    }
    
    if (!in_array($data['type'], ['income', 'expense'])) {
        throw new Exception('Tipo non valido. Usa: income o expense');
    }
    
    $stmt = $pdo->prepare("
        INSERT INTO finance_categories (name, type, color, icon, description)
        VALUES (:name, :type, :color, :icon, :description)
    ");
    
    $stmt->execute([
        'name' => trim($data['name']),
        'type' => $data['type'],
        'color' => !empty($data['color']) ? $data['color'] : '#37352f',
        'icon' => !empty($data['icon']) ? $data['icon'] : '📁',
        'description' => !empty($data['description']) ? trim($data['description']) : null
    ]);
    
    echo json_encode(['success' => true, 'message' => 'Categoria creata']);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>