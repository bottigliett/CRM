<?php
// File: /modules/lead_contatti/lead/ajax/delete_lead.php
// API per eliminare un lead
// COMPATIBILE con la struttura del progetto

require_once $_SERVER['DOCUMENT_ROOT'] . '/core/includes/auth_helper.php';

// Header JSON
header('Content-Type: application/json; charset=utf-8');
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

// Pulisci output precedenti
while (ob_get_level()) {
    ob_end_clean();
}

try {
    // Verifica metodo HTTP
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Metodo non permesso');
    }
    
    // Verifica autenticazione
    requireAuth();
    $currentUser = getCurrentUser();
    $userId = $currentUser['id'];
    
    // Verifica CSRF token
    $csrfToken = $_POST['csrf_token'] ?? '';
    if (empty($csrfToken)) {
        throw new Exception('Token CSRF mancante');
    }
    
    session_start();
    if (!isset($_SESSION['csrf_token']) || $_SESSION['csrf_token'] !== $csrfToken) {
        throw new Exception('Token CSRF non valido');
    }
    
    // Parametri
    $leadId = $_POST['lead_id'] ?? null;
    
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
    
    $pdo->beginTransaction();
    
    try {
        // Verifica che il lead esista e ottieni i dati
        $checkStmt = $pdo->prepare("
            SELECT lf.nome_cliente, lf.colonna, lf.servizio, lc.name as contact_name
            FROM leads_funnel lf
            LEFT JOIN leads_contacts lc ON lf.contact_id = lc.id
            WHERE lf.id = ?
        ");
        $checkStmt->execute([$leadId]);
        $lead = $checkStmt->fetch();
        
        if (!$lead) {
            throw new Exception('Lead non trovato');
        }
        
        $leadName = $lead['contact_name'] ?: $lead['nome_cliente'];
        $leadService = $lead['servizio'];
        $leadColumn = $lead['colonna'];
        
        // Elimina il lead
        $deleteStmt = $pdo->prepare("DELETE FROM leads_funnel WHERE id = ?");
        $deleteStmt->execute([$leadId]);
        
        // Verifica che sia stato eliminato
        if ($deleteStmt->rowCount() === 0) {
            throw new Exception('Impossibile eliminare il lead');
        }
        
        // Riordina le posizioni nella colonna
        $reorderStmt = $pdo->prepare("
            SELECT id FROM leads_funnel 
            WHERE colonna = ? 
            ORDER BY posizione ASC, created_at ASC
        ");
        $reorderStmt->execute([$leadColumn]);
        $leadsToReorder = $reorderStmt->fetchAll(PDO::FETCH_COLUMN);
        
        // Riassegna posizioni sequenziali
        $position = 1;
        $updatePositionStmt = $pdo->prepare("UPDATE leads_funnel SET posizione = ? WHERE id = ?");
        foreach ($leadsToReorder as $leadIdToReorder) {
            $updatePositionStmt->execute([$position, $leadIdToReorder]);
            $position++;
        }
        
        // Log dell'eliminazione (i log del lead vengono eliminati automaticamente per CASCADE)
        // Ma creiamo un log generico
        try {
            $logStmt = $pdo->prepare("
                INSERT INTO leads_funnel_logs (lead_id, user_id, azione, dettagli, created_at) 
                VALUES (?, ?, 'deleted_lead', ?, NOW())
            ");
            $logDetails = "Lead eliminato: '$leadName' - $leadService";
            $logStmt->execute([0, $userId, $logDetails]); // lead_id = 0 per lead eliminati
        } catch (Exception $logError) {
            error_log("Failed to log lead deletion: " . $logError->getMessage());
        }
        
        $pdo->commit();
        
        // Log dell'azione utente
        logUserAction('delete_lead', 'success', "Lead eliminato: '$leadName' - $leadService");
        
        // Risposta di successo
        echo json_encode([
            'success' => true,
            'message' => 'Lead eliminato con successo',
            'deleted_lead' => [
                'id' => $leadId,
                'name' => $leadName,
                'service' => $leadService,
                'column' => $leadColumn
            ],
            'timestamp' => date('Y-m-d H:i:s')
        ], JSON_UNESCAPED_UNICODE);
        
    } catch (Exception $e) {
        $pdo->rollback();
        throw $e;
    }
    
} catch (Exception $e) {
    // Log dell'errore
    error_log("Error in delete_lead.php: " . $e->getMessage());
    error_log("Stack trace: " . $e->getTraceAsString());
    
    // Log dell'azione fallita
    if (isset($currentUser)) {
        logUserAction('delete_lead', 'error', $e->getMessage());
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

exit;
?>