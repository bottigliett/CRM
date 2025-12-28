<?php
// File: /modules/lead_contatti/lead/ajax/move_lead.php
// API per spostare lead tra colonne del kanban
// VERSIONE COMPATIBILE con la struttura del progetto

require_once $_SERVER['DOCUMENT_ROOT'] . '/core/includes/auth_helper.php';

// Header JSON e controllo errori
header('Content-Type: application/json; charset=utf-8');
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

// Pulisci eventuali output precedenti
while (ob_get_level()) {
    ob_end_clean();
}

try {
    // Verifica metodo HTTP
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Metodo non permesso');
    }
    
    // Verifica autenticazione usando la tua struttura
    requireAuth();
    $currentUser = getCurrentUser();
    $userId = $currentUser['id'];
    
    // Verifica CSRF token
    $csrfToken = $_POST['csrf_token'] ?? '';
    if (empty($csrfToken)) {
        throw new Exception('Token CSRF mancante');
    }
    
    // Validazione CSRF - controllo semplificato
    session_start();
    if (!isset($_SESSION['csrf_token']) || $_SESSION['csrf_token'] !== $csrfToken) {
        throw new Exception('Token CSRF non valido');
    }
    
    // Parametri
    $leadId = $_POST['lead_id'] ?? null;
    $newColumn = $_POST['new_column'] ?? null;
    
    // Validazione parametri
    if (!$leadId || !is_numeric($leadId)) {
        throw new Exception('ID lead non valido');
    }
    
    $validColumns = ['da_contattare', 'contattati', 'chiusi', 'persi'];
    if (!in_array($newColumn, $validColumns)) {
        throw new Exception('Colonna di destinazione non valida');
    }
    
    $leadId = (int)$leadId;
    
    // Connessione database usando la stessa configurazione dell'index.php
    $dsn = "mysql:host=127.0.0.1;dbname=u706045794_crm_mismo;charset=utf8mb4";
    $pdo = new PDO($dsn, 'u706045794_mismo_crm_new', 'BLQ$>:;*9+h', [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
    
    // Inizia transazione
    $pdo->beginTransaction();
    
    try {
        // Ottieni dati lead corrente
        $stmt = $pdo->prepare("
            SELECT nome_cliente, colonna, contact_id 
            FROM leads_funnel 
            WHERE id = ?
        ");
        $stmt->execute([$leadId]);
        $lead = $stmt->fetch();
        
        if (!$lead) {
            throw new Exception('Lead non trovato');
        }
        
        $oldColumn = $lead['colonna'];
        $leadName = $lead['nome_cliente'];
        
        // Se è già nella colonna corretta
        if ($oldColumn === $newColumn) {
            $pdo->rollback();
            echo json_encode([
                'success' => true,
                'message' => 'Lead già nella colonna corretta',
                'old_column' => $oldColumn,
                'new_column' => $newColumn,
                'lead_name' => $leadName,
                'no_change' => true
            ], JSON_UNESCAPED_UNICODE);
            exit;
        }
        
        // Calcola prossima posizione nella nuova colonna
        $posStmt = $pdo->prepare("
            SELECT COALESCE(MAX(posizione), 0) + 1 as next_position
            FROM leads_funnel 
            WHERE colonna = ?
        ");
        $posStmt->execute([$newColumn]);
        $nextPosition = (int)$posStmt->fetchColumn();
        
        // Prepara i dati per l'update
        $updateFields = [
            'colonna = ?',
            'posizione = ?',
            'updated_at = NOW()'
        ];
        $updateValues = [$newColumn, $nextPosition];
        
        // Se spostiamo in "chiusi", imposta data_chiusura
        if ($newColumn === 'chiusi') {
            $updateFields[] = 'data_chiusura = COALESCE(data_chiusura, NOW())';
        }
        
        // Se spostiamo in "contattati", imposta data_contatto se non presente
        if ($newColumn === 'contattati') {
            $updateFields[] = 'data_contatto = COALESCE(data_contatto, NOW())';
        }
        
        // Aggiorna il lead
        $updateSql = "UPDATE leads_funnel SET " . implode(', ', $updateFields) . " WHERE id = ?";
        $updateValues[] = $leadId; // Aggiungi leadId per la WHERE
        
        $updateStmt = $pdo->prepare($updateSql);
        $updateStmt->execute($updateValues);
        
        // Riordina la vecchia colonna (metodo semplificato)
        $leadsInOldColumn = $pdo->prepare("
            SELECT id FROM leads_funnel 
            WHERE colonna = ? 
            ORDER BY posizione ASC, created_at ASC
        ");
        $leadsInOldColumn->execute([$oldColumn]);
        $leadsToReorder = $leadsInOldColumn->fetchAll(PDO::FETCH_COLUMN);
        
        // Riassegna posizioni sequenziali
        $position = 1;
        $updatePositionStmt = $pdo->prepare("UPDATE leads_funnel SET posizione = ? WHERE id = ?");
        foreach ($leadsToReorder as $leadIdToReorder) {
            $updatePositionStmt->execute([$position, $leadIdToReorder]);
            $position++;
        }
        
        // Log dell'attività
        try {
            $logStmt = $pdo->prepare("
                INSERT INTO leads_funnel_logs (lead_id, user_id, azione, colonna_da, colonna_a, dettagli, created_at) 
                VALUES (?, ?, 'moved_column', ?, ?, ?, NOW())
            ");
            $logDetails = "Lead '$leadName' spostato da '$oldColumn' a '$newColumn'";
            $logStmt->execute([$leadId, $userId, $oldColumn, $newColumn, $logDetails]);
        } catch (Exception $logError) {
            // Non interrompere l'operazione se il log fallisce
            error_log("Failed to log lead movement: " . $logError->getMessage());
        }
        
        // Commit della transazione
        $pdo->commit();
        
        // Log dell'azione utente
        logUserAction('move_lead', 'success', "Lead '$leadName' spostato da '$oldColumn' a '$newColumn'");
        
        // Risposta di successo
        echo json_encode([
            'success' => true,
            'message' => 'Lead spostato con successo',
            'old_column' => $oldColumn,
            'new_column' => $newColumn,
            'lead_name' => $leadName,
            'lead_id' => $leadId,
            'new_position' => $nextPosition,
            'timestamp' => date('Y-m-d H:i:s')
        ], JSON_UNESCAPED_UNICODE);
        
    } catch (Exception $e) {
        $pdo->rollback();
        throw $e;
    }
    
} catch (Exception $e) {
    // Log dell'errore
    error_log("Error in move_lead.php: " . $e->getMessage());
    error_log("Stack trace: " . $e->getTraceAsString());
    
    // Log dell'azione fallita
    if (isset($currentUser)) {
        logUserAction('move_lead', 'error', $e->getMessage());
    }
    
    // Risposta di errore JSON
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'debug_info' => [
            'file' => basename(__FILE__),
            'line' => $e->getLine(),
            'lead_id' => $leadId ?? 'N/A',
            'new_column' => $newColumn ?? 'N/A',
            'user_id' => $userId ?? 'N/A'
        ]
    ], JSON_UNESCAPED_UNICODE);
}

// Termina script
exit;
?>