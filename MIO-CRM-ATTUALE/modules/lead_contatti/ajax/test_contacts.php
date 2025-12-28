<?php
// File: /modules/lead_contatti/ajax/test_contacts.php
// Test semplificato per verificare funzionamento base

// Header JSON immediato
header('Content-Type: application/json; charset=utf-8');

try {
    // Test connessione database
    $dsn = "mysql:host=127.0.0.1;dbname=u706045794_crm_mismo;charset=utf8mb4";
    $pdo = new PDO($dsn, 'u706045794_mismo_crm_new', 'BLQ$>:;*9+h', [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
    
    // Test query semplice - solo contatti NON lead
    $stmt = $pdo->query("
        SELECT id, name, email, phone, contact_type, status, priority
        FROM leads_contacts 
        WHERE status != 'lead' 
        LIMIT 5
    ");
    $contacts = $stmt->fetchAll();
    
    // Conta totali
    $countStmt = $pdo->query("SELECT COUNT(*) FROM leads_contacts WHERE status != 'lead'");
    $totalCount = $countStmt->fetchColumn();
    
    echo json_encode([
        'success' => true,
        'message' => 'Test API funzionante!',
        'contacts' => $contacts,
        'total_count' => (int)$totalCount,
        'timestamp' => date('Y-m-d H:i:s')
    ], JSON_UNESCAPED_UNICODE);
    
} catch (Exception $e) {
    error_log("Test contacts error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'file' => basename(__FILE__),
        'line' => $e->getLine()
    ], JSON_UNESCAPED_UNICODE);
}

// Assicurati che non ci sia output aggiuntivo
exit;
?>