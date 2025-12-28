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
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
    
    $currentUser = getCurrentUser();
    
    // Trova fatture pagate non ancora sincronizzate
    $sql = "
        SELECT f.* 
        FROM fatture f
        LEFT JOIN finance_transactions ft ON f.id = ft.invoice_id
        WHERE f.status = 'pagata' 
        AND ft.id IS NULL
    ";
    
    $stmt = $pdo->query($sql);
    $invoices = $stmt->fetchAll();
    
    $synced = 0;
    $errors = [];
    
    // Ottieni ID categoria fatture
    $catStmt = $pdo->prepare("SELECT id FROM finance_categories WHERE name = 'Fatture Clienti' LIMIT 1");
    $catStmt->execute();
    $categoryId = $catStmt->fetchColumn();
    
    if (!$categoryId) {
        // Crea categoria se non esiste
        $createCat = $pdo->prepare("
            INSERT INTO finance_categories (name, type, color, icon, description) 
            VALUES ('Fatture Clienti', 'income', '#22c55e', '📄', 'Entrate da fatture emesse')
        ");
        $createCat->execute();
        $categoryId = $pdo->lastInsertId();
    }
    
    // Ottieni ID metodo pagamento
    $methodStmt = $pdo->prepare("SELECT id FROM finance_payment_methods WHERE name = ? LIMIT 1");
    
    foreach ($invoices as $invoice) {
        try {
            // Determina metodo pagamento
            $paymentMethod = $invoice['metodo_pagamento'] ?? 'Bonifico Bancario';
            $methodStmt->execute([$paymentMethod]);
            $methodId = $methodStmt->fetchColumn();
            
            if (!$methodId) {
                // Usa bonifico come default
                $methodStmt->execute(['Bonifico Bancario']);
                $methodId = $methodStmt->fetchColumn();
            }
            
            // Inserisci transazione
            $insertStmt = $pdo->prepare("
                INSERT INTO finance_transactions 
                (type, category_id, amount, date, description, source, payment_method_id, 
                 invoice_id, notes, created_by, created_at)
                VALUES 
                ('income', :category_id, :amount, :date, :description, :source, 
                 :payment_method_id, :invoice_id, :notes, :created_by, NOW())
            ");
            
            $insertStmt->execute([
                'category_id' => $categoryId,
                'amount' => $invoice['totale'],
                'date' => $invoice['data_pagamento'] ?? $invoice['data_fattura'],
                'description' => "Fattura {$invoice['numero_fattura']} - {$invoice['oggetto']}",
                'source' => $invoice['client_name'],
                'payment_method_id' => $methodId,
                'invoice_id' => $invoice['id'],
                'notes' => $invoice['note_pagamento'],
                'created_by' => $invoice['created_by'] ?? $currentUser['id']
            ]);
            
            $synced++;
            
        } catch (Exception $e) {
            $errors[] = "Fattura {$invoice['numero_fattura']}: " . $e->getMessage();
        }
    }
    
    $message = "Sincronizzate $synced fatture su " . count($invoices);
    if (!empty($errors)) {
        $message .= ". Errori: " . implode(', ', $errors);
    }
    
    echo json_encode([
        'success' => true,
        'message' => $message,
        'synced' => $synced,
        'total' => count($invoices),
        'errors' => $errors
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>