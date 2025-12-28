<?php
// File: /modules/lead_contatti/lead/ajax/get_leads.php
// API per recuperare tutti i lead del kanban board
// COMPATIBILE con la struttura del progetto

require_once $_SERVER['DOCUMENT_ROOT'] . '/core/includes/auth_helper.php';

// Header JSON
header('Content-Type: application/json; charset=utf-8');
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

try {
    // Verifica autenticazione
    requireAuth();
    $currentUser = getCurrentUser();
    
    // Connessione database
    $dsn = "mysql:host=127.0.0.1;dbname=u706045794_crm_mismo;charset=utf8mb4";
    $pdo = new PDO($dsn, 'u706045794_mismo_crm_new', 'BLQ$>:;*9+h', [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
    
    // Query per recuperare lead con dati anagrafica
    $sql = "
        SELECT 
            lf.*,
            lc.name as contact_name,
            lc.email as contact_email,
            lc.phone as contact_phone,
            lc.contact_type,
            lc.address,
            lc.status as contact_status,
            lc.priority as contact_priority,
            -- Campi per il display (priorità ai dati specifici del lead)
            COALESCE(lc.name, lf.nome_cliente) as display_name,
            COALESCE(lf.email, lc.email) as display_email,
            COALESCE(lf.telefono, lc.phone) as display_phone
        FROM leads_funnel lf
        LEFT JOIN leads_contacts lc ON lf.contact_id = lc.id
        ORDER BY 
            FIELD(lf.colonna, 'da_contattare', 'contattati', 'chiusi', 'persi'),
            lf.posizione ASC,
            lf.created_at DESC
    ";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute();
    $leads = $stmt->fetchAll();
    
    // Statistiche per colonna
    $stats = [
        'da_contattare' => ['count' => 0, 'value' => 0],
        'contattati' => ['count' => 0, 'value' => 0],
        'chiusi' => ['count' => 0, 'value' => 0],
        'persi' => ['count' => 0, 'value' => 0],
        'total_value' => 0,
        'total_count' => 0
    ];
    
    // Formatta i lead e calcola statistiche
    $formattedLeads = [];
    foreach ($leads as $lead) {
        // Converti valori numerici
        $lead['id'] = (int)$lead['id'];
        $lead['contact_id'] = $lead['contact_id'] ? (int)$lead['contact_id'] : null;
        $lead['somma_lavoro'] = (float)$lead['somma_lavoro'];
        $lead['posizione'] = (int)$lead['posizione'];
        $lead['created_by'] = (int)$lead['created_by'];
        $lead['assigned_to'] = $lead['assigned_to'] ? (int)$lead['assigned_to'] : null;
        
        // Formatta date
        if ($lead['data_contatto']) {
            $lead['data_contatto_formatted'] = date('d/m/Y', strtotime($lead['data_contatto']));
        }
        if ($lead['data_chiusura']) {
            $lead['data_chiusura_formatted'] = date('d/m/Y', strtotime($lead['data_chiusura']));
        }
        $lead['created_at_formatted'] = date('d/m/Y H:i', strtotime($lead['created_at']));
        $lead['updated_at_formatted'] = date('d/m/Y H:i', strtotime($lead['updated_at']));
        
        // Aggiorna statistiche
        $colonna = $lead['colonna'];
        if (isset($stats[$colonna])) {
            $stats[$colonna]['count']++;
            $stats[$colonna]['value'] += $lead['somma_lavoro'];
        }
        $stats['total_count']++;
        $stats['total_value'] += $lead['somma_lavoro'];
        
        $formattedLeads[] = $lead;
    }
    
    // Calcola tasso di conversione
    $stats['conversion_rate'] = $stats['total_count'] > 0 ? 
        round(($stats['chiusi']['count'] / $stats['total_count']) * 100, 1) : 0;
    
    // Log dell'azione
    logUserAction('get_leads', 'success', "Caricati " . count($formattedLeads) . " lead");
    
    // Risposta di successo
    echo json_encode([
        'success' => true,
        'leads' => $formattedLeads,
        'stats' => $stats,
        'total' => count($formattedLeads),
        'timestamp' => date('Y-m-d H:i:s')
    ], JSON_UNESCAPED_UNICODE);
    
} catch (Exception $e) {
    // Log dell'errore
    error_log("Error in get_leads.php: " . $e->getMessage());
    error_log("Stack trace: " . $e->getTraceAsString());
    
    // Log dell'azione fallita
    if (isset($currentUser)) {
        logUserAction('get_leads', 'error', $e->getMessage());
    }
    
    // Risposta di errore
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'debug_info' => [
            'file' => basename(__FILE__),
            'line' => $e->getLine()
        ]
    ], JSON_UNESCAPED_UNICODE);
}
?>