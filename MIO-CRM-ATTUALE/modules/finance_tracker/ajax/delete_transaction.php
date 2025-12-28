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
    $id = intval($data['id'] ?? 0);
    
    if ($id <= 0) {
        throw new Exception('ID non valido');
    }
    
    // Verifica se è una transazione da fattura
    $stmt = $pdo->prepare("SELECT invoice_id FROM finance_transactions WHERE id = ?");
    $stmt->execute([$id]);
    $transaction = $stmt->fetch();
    
    if ($transaction && $transaction['invoice_id']) {
        throw new Exception('Non puoi eliminare una transazione collegata a una fattura');
    }
    
    $stmt = $pdo->prepare("DELETE FROM finance_transactions WHERE id = ? AND invoice_id IS NULL");
    $stmt->execute([$id]);
    
    if ($stmt->rowCount() === 0) {
        throw new Exception('Transazione non trovata o non eliminabile');
    }
    
    echo json_encode(['success' => true, 'message' => 'Transazione eliminata']);
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>