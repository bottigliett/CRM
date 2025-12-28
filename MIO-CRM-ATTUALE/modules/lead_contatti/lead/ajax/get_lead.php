<?php
// File: /modules/lead_contatti/lead/ajax/get_lead.php
// API per recuperare i dettagli di un singolo lead
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
    $userId = $currentUser['id'];
    
    // Parametri
    $leadId = $_GET['id'] ?? null;
    
    if (!$leadId || !is_numeric($leadId)) {
        throw new Exception('ID lead non valido');
    }
    
    $leadId = (int)$leadId;
    
    // Connessione database
    $dsn = "mysql:host=127.0.0.1;dbname=u706045794_crm_mismo;charset=utf8mb4";
    $pdo = new PDO($dsn, 'u706045794_mismo_crm_new', 'BLQ$>:;*9+h', [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
    
    // Query per recuperare lead completo con dati anagrafica
    $sql = "
        SELECT 
            lf.*,
            lc.name as contact_name,
            lc.email as contact_email,
            lc.phone as contact_phone,
            lc.contact_type,
            lc.address as contact_address,
            lc.status as contact_status,
            lc.priority as contact_priority,
            lc.description as contact_description,
            lc.last_contact_date,
            lc.next_followup_date,
            -- Utente che ha creato
            u_created.first_name as created_by_name,
            u_created.last_name as created_by_lastname,
            -- Utente assegnato
            u_assigned.first_name as assigned_to_name,
            u_assigned.last_name as assigned_to_lastname,
            -- Campi per il display
            COALESCE(lc.name, lf.nome_cliente) as display_name,
            COALESCE(lf.email, lc.email) as display_email,
            COALESCE(lf.telefono, lc.phone) as display_phone
        FROM leads_funnel lf
        LEFT JOIN leads_contacts lc ON lf.contact_id = lc.id
        LEFT JOIN users u_created ON lf.created_by = u_created.id
        LEFT JOIN users u_assigned ON lf.assigned_to = u_assigned.id
        WHERE lf.id = ?
    ";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$leadId]);
    $lead = $stmt->fetch();
    
    if (!$lead) {
        throw new Exception('Lead non trovato');
    }
    
    // Formatta i dati
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
    if ($lead['last_contact_date']) {
        $lead['last_contact_date_formatted'] = date('d/m/Y', strtotime($lead['last_contact_date']));
    }
    if ($lead['next_followup_date']) {
        $lead['next_followup_date_formatted'] = date('d/m/Y', strtotime($lead['next_followup_date']));
    }
    
    $lead['created_at_formatted'] = date('d/m/Y H:i', strtotime($lead['created_at']));
    $lead['updated_at_formatted'] = date('d/m/Y H:i', strtotime($lead['updated_at']));
    
    // Informazioni aggiuntive
    $lead['created_by_full_name'] = trim(($lead['created_by_name'] ?? '') . ' ' . ($lead['created_by_lastname'] ?? ''));
    $lead['assigned_to_full_name'] = trim(($lead['assigned_to_name'] ?? '') . ' ' . ($lead['assigned_to_lastname'] ?? ''));
    
    // Log della visualizzazione
    try {
        $logStmt = $pdo->prepare("
            INSERT INTO leads_funnel_logs (lead_id, user_id, azione, dettagli, created_at) 
            VALUES (?, ?, 'viewed_details', 'Visualizzazione dettagli lead', NOW())
        ");
        $logStmt->execute([$leadId, $userId]);
    } catch (Exception $logError) {
        error_log("Failed to log lead view: " . $logError->getMessage());
    }
    
    // Log dell'azione utente
    logUserAction('view_lead_details', 'success', "Visualizzazione dettagli lead: " . $lead['display_name']);
    
    // Risposta di successo
    echo json_encode([
        'success' => true,
        'lead' => $lead,
        'timestamp' => date('Y-m-d H:i:s')
    ], JSON_UNESCAPED_UNICODE);
    
} catch (Exception $e) {
    // Log dell'errore
    error_log("Error in get_lead.php: " . $e->getMessage());
    error_log("Stack trace: " . $e->getTraceAsString());
    
    // Log dell'azione fallita
    if (isset($currentUser)) {
        logUserAction('view_lead_details', 'error', $e->getMessage());
    }
    
    // Risposta di errore
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'debug_info' => [
            'file' => basename(__FILE__),
            'line' => $e->getLine(),
            'lead_id' => $leadId ?? 'N/A'
        ]
    ], JSON_UNESCAPED_UNICODE);
}
?>