<?php
// File: /modules/finance_tracker/ajax/save_transaction.php
// Salva o aggiorna transazione

header('Content-Type: application/json');
require_once $_SERVER['DOCUMENT_ROOT'] . '/core/includes/auth_helper.php';

// Verifica autenticazione
if (!requireAuth()) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Non autorizzato']);
    exit;
}

try {
    $dsn = "mysql:host=127.0.0.1;dbname=u706045794_crm_mismo;charset=utf8mb4";
    $pdo = new PDO($dsn, 'u706045794_mismo_crm_new', 'BLQ$>:;*9+h', [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
    
    // Ottieni dati JSON
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    
    // Debug: log dei dati ricevuti
    error_log("Finance Tracker - Dati ricevuti: " . print_r($data, true));
    
    // Validazione
    if (empty($data['type']) || empty($data['category_id']) || empty($data['amount']) || 
        empty($data['date']) || empty($data['description'])) {
        throw new Exception('Campi obbligatori mancanti. Richiesti: type, category_id, amount, date, description');
    }
    
    // Validazione tipo
    if (!in_array($data['type'], ['income', 'expense'])) {
        throw new Exception('Tipo transazione non valido. Usa: income o expense');
    }
    
    // Validazione amount
    if (!is_numeric($data['amount']) || $data['amount'] <= 0) {
        throw new Exception('Importo non valido');
    }
    
    // Validazione data
    $dateCheck = DateTime::createFromFormat('Y-m-d', $data['date']);
    if (!$dateCheck || $dateCheck->format('Y-m-d') !== $data['date']) {
        throw new Exception('Formato data non valido. Usa: YYYY-MM-DD');
    }
    
    $currentUser = getCurrentUser();
    
    if (!empty($data['id'])) {
        // Update esistente
        
        // Verifica che non sia una transazione da fattura
        $checkStmt = $pdo->prepare("SELECT invoice_id FROM finance_transactions WHERE id = ?");
        $checkStmt->execute([$data['id']]);
        $existing = $checkStmt->fetch();
        
        if ($existing && $existing['invoice_id']) {
            throw new Exception('Non puoi modificare una transazione collegata a una fattura');
        }
        
        $sql = "UPDATE finance_transactions SET 
                type = :type,
                category_id = :category_id,
                amount = :amount,
                date = :date,
                description = :description,
                source = :source,
                payment_method_id = :payment_method_id,
                is_recurring = :is_recurring,
                recurring_interval = :recurring_interval,
                notes = :notes,
                updated_at = NOW()
                WHERE id = :id AND invoice_id IS NULL";
        
        $stmt = $pdo->prepare($sql);
        $result = $stmt->execute([
            'id' => $data['id'],
            'type' => $data['type'],
            'category_id' => intval($data['category_id']),
            'amount' => floatval($data['amount']),
            'date' => $data['date'],
            'description' => trim($data['description']),
            'source' => !empty($data['source']) ? trim($data['source']) : null,
            'payment_method_id' => !empty($data['payment_method_id']) ? intval($data['payment_method_id']) : null,
            'is_recurring' => isset($data['is_recurring']) && $data['is_recurring'] ? 1 : 0,
            'recurring_interval' => !empty($data['recurring_interval']) ? $data['recurring_interval'] : null,
            'notes' => !empty($data['notes']) ? trim($data['notes']) : null
        ]);
        
        if ($stmt->rowCount() === 0) {
            throw new Exception('Transazione non trovata o non modificabile');
        }
        
        $message = 'Transazione aggiornata con successo';
        
    } else {
        // Insert nuovo
        
        // Verifica che la categoria esista
        $catCheck = $pdo->prepare("SELECT id, type FROM finance_categories WHERE id = ? AND is_active = 1");
        $catCheck->execute([$data['category_id']]);
        $category = $catCheck->fetch();
        
        if (!$category) {
            throw new Exception('Categoria non valida o non attiva');
        }
        
        // Verifica che il tipo corrisponda alla categoria
        if ($category['type'] !== $data['type']) {
            throw new Exception("Categoria non compatibile con il tipo di transazione ({$data['type']})");
        }
        
        $sql = "INSERT INTO finance_transactions 
                (type, category_id, amount, date, description, source, payment_method_id, 
                 is_recurring, recurring_interval, notes, created_by, created_at)
                VALUES 
                (:type, :category_id, :amount, :date, :description, :source, :payment_method_id,
                 :is_recurring, :recurring_interval, :notes, :created_by, NOW())";
        
        $stmt = $pdo->prepare($sql);
        $result = $stmt->execute([
            'type' => $data['type'],
            'category_id' => intval($data['category_id']),
            'amount' => floatval($data['amount']),
            'date' => $data['date'],
            'description' => trim($data['description']),
            'source' => !empty($data['source']) ? trim($data['source']) : null,
            'payment_method_id' => !empty($data['payment_method_id']) ? intval($data['payment_method_id']) : null,
            'is_recurring' => isset($data['is_recurring']) && $data['is_recurring'] ? 1 : 0,
            'recurring_interval' => !empty($data['recurring_interval']) ? $data['recurring_interval'] : null,
            'notes' => !empty($data['notes']) ? trim($data['notes']) : null,
            'created_by' => $currentUser['id']
        ]);
        
        $newId = $pdo->lastInsertId();
        $message = 'Transazione salvata con successo';
        
        // Log per debug
        error_log("Finance Tracker - Transazione creata ID: $newId");
    }
    
    // Risposta di successo
    echo json_encode([
        'success' => true, 
        'message' => $message,
        'id' => isset($newId) ? $newId : $data['id']
    ]);
    
} catch (PDOException $e) {
    error_log("Finance Tracker - Errore database: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false, 
        'message' => 'Errore database: ' . $e->getMessage()
    ]);
} catch (Exception $e) {
    error_log("Finance Tracker - Errore: " . $e->getMessage());
    http_response_code(400);
    echo json_encode([
        'success' => false, 
        'message' => $e->getMessage()
    ]);
}
?>