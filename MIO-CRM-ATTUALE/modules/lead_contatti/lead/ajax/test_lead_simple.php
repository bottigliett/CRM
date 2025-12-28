<?php
// File: /modules/lead_contatti/lead/ajax/test_lead_simple.php
// Test semplice per lead

header('Content-Type: application/json; charset=utf-8');

try {
    // Database semplice
    $pdo = new PDO("mysql:host=127.0.0.1;dbname=u706045794_crm_mismo;charset=utf8mb4", 
                   'u706045794_mismo_crm_new', 'BLQ$>:;*9+h');
    
    // Query semplice lead
    $stmt = $pdo->query("SELECT id, nome_cliente, servizio, somma_lavoro, colonna, priorita FROM leads_funnel ORDER BY colonna, posizione");
    $leads = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Converti tipi
    foreach ($leads as &$lead) {
        $lead['id'] = (int)$lead['id'];
        $lead['somma_lavoro'] = (float)$lead['somma_lavoro'];
        if (empty($lead['priorita'])) $lead['priorita'] = 'media';
    }
    
    echo json_encode([
        'success' => true,
        'leads' => $leads,
        'count' => count($leads),
        'test' => 'OK'
    ]);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>