<?php
// File: /modules/lead_contatti/lead/ajax/save_lead.php
// API per salvare (creare/modificare) lead
// COMPATIBILE con la struttura del progetto

require_once $_SERVER['DOCUMENT_ROOT'] . '/core/includes/auth_helper.php';

// Header JSON e controllo errori
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
    
    // Connessione database
    $dsn = "mysql:host=127.0.0.1;dbname=u706045794_crm_mismo;charset=utf8mb4";
    $pdo = new PDO($dsn, 'u706045794_mismo_crm_new', 'BLQ$>:;*9+h', [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
    
    // Parametri del form
    $leadId = !empty($_POST['lead_id']) ? (int)$_POST['lead_id'] : null;
    $contactMode = $_POST['contact_mode'] ?? 'existing';
    $isEdit = !empty($leadId);
    
    // Validazione dati base
    $servizio = trim($_POST['servizio'] ?? '');
    $sommaLavoro = trim($_POST['somma_lavoro'] ?? '');
    $colonna = $_POST['colonna'] ?? 'da_contattare';
    $priorita = $_POST['priorita'] ?? 'media';
    
    if (empty($servizio)) {
        throw new Exception('Il servizio è obbligatorio');
    }
    
    if (empty($sommaLavoro) || !is_numeric($sommaLavoro) || $sommaLavoro < 0) {
        throw new Exception('Inserisci un valore progetto valido');
    }
    
    if (!in_array($colonna, ['da_contattare', 'contattati', 'chiusi', 'persi'])) {
        throw new Exception('Colonna non valida');
    }
    
    if (!in_array($priorita, ['alta', 'media', 'bassa'])) {
        throw new Exception('Priorità non valida');
    }
    
    $pdo->beginTransaction();
    
    try {
        $contactId = null;
        $nomeCliente = '';
        
        // === GESTIONE ANAGRAFICA ===
        if ($contactMode === 'existing') {
            // Usa anagrafica esistente
            $contactId = !empty($_POST['contact_id']) ? (int)$_POST['contact_id'] : null;
            
            if (!$contactId) {
                throw new Exception('Seleziona un cliente esistente');
            }
            
            // Verifica che l'anagrafica esista
            $contactStmt = $pdo->prepare("SELECT name FROM leads_contacts WHERE id = ?");
            $contactStmt->execute([$contactId]);
            $contact = $contactStmt->fetch();
            
            if (!$contact) {
                throw new Exception('Cliente selezionato non trovato');
            }
            
            $nomeCliente = $contact['name'];
            
        } else {
            // Crea nuova anagrafica
            $newContactName = trim($_POST['new_contact_name'] ?? '');
            $newContactType = $_POST['new_contact_type'] ?? 'person';
            $newContactEmail = trim($_POST['new_contact_email'] ?? '');
            $newContactPhone = trim($_POST['new_contact_phone'] ?? '');
            
            if (empty($newContactName)) {
                throw new Exception('Il nome del nuovo cliente è obbligatorio');
            }
            
            if (!in_array($newContactType, ['person', 'company'])) {
                throw new Exception('Tipo di contatto non valido');
            }
            
            // Validazione email se fornita
            if (!empty($newContactEmail) && !filter_var($newContactEmail, FILTER_VALIDATE_EMAIL)) {
                throw new Exception('Email del nuovo cliente non valida');
            }
            
            // Crea la nuova anagrafica
            $insertContactStmt = $pdo->prepare("
                INSERT INTO leads_contacts (name, email, phone, contact_type, status, priority, created_by, created_at, updated_at) 
                VALUES (?, ?, ?, ?, 'lead', 'medium', ?, NOW(), NOW())
            ");
            $insertContactStmt->execute([
                $newContactName,
                $newContactEmail ?: null,
                $newContactPhone ?: null,
                $newContactType,
                $userId
            ]);
            
            $contactId = $pdo->lastInsertId();
            $nomeCliente = $newContactName;
        }
        
        // === DATI LEAD ===
        $leadData = [
            'nome_cliente' => $nomeCliente,
            'contact_id' => $contactId,
            'servizio' => $servizio,
            'somma_lavoro' => (float)$sommaLavoro,
            'colonna' => $colonna,
            'priorita' => $priorita,
            'fonte' => $_POST['fonte'] ?: null,
            'descrizione' => trim($_POST['descrizione'] ?? '') ?: null,
            'note' => trim($_POST['note'] ?? '') ?: null,
            'telefono' => trim($_POST['telefono'] ?? '') ?: null,
            'email' => trim($_POST['email'] ?? '') ?: null,
            'data_contatto' => !empty($_POST['data_contatto']) ? $_POST['data_contatto'] : null,
            'data_chiusura' => !empty($_POST['data_chiusura']) ? $_POST['data_chiusura'] : null,
            'motivo_perdita' => trim($_POST['motivo_perdita'] ?? '') ?: null,
            'updated_at' => date('Y-m-d H:i:s')
        ];
        
        if ($isEdit) {
            // === MODIFICA LEAD ESISTENTE ===
            $updateFields = [];
            $updateValues = [];
            
            foreach ($leadData as $field => $value) {
                if ($field !== 'updated_at') {
                    $updateFields[] = "$field = ?";
                    $updateValues[] = $value;
                }
            }
            $updateFields[] = "updated_at = NOW()";
            $updateValues[] = $leadId;
            
            $updateSql = "UPDATE leads_funnel SET " . implode(', ', $updateFields) . " WHERE id = ?";
            $updateStmt = $pdo->prepare($updateSql);
            $updateStmt->execute($updateValues);
            
            $message = 'Lead aggiornato con successo';
            $action = 'updated_lead';
            
        } else {
            // === CREA NUOVO LEAD ===
            
            // Calcola posizione nella colonna
            $posStmt = $pdo->prepare("SELECT COALESCE(MAX(posizione), 0) + 1 FROM leads_funnel WHERE colonna = ?");
            $posStmt->execute([$colonna]);
            $posizione = (int)$posStmt->fetchColumn();
            
            $leadData['posizione'] = $posizione;
            $leadData['created_by'] = $userId;
            $leadData['created_at'] = date('Y-m-d H:i:s');
            
            // Inserisci lead
            $fields = array_keys($leadData);
            $placeholders = array_fill(0, count($fields), '?');
            
            $insertSql = "INSERT INTO leads_funnel (" . implode(', ', $fields) . ") VALUES (" . implode(', ', $placeholders) . ")";
            $insertStmt = $pdo->prepare($insertSql);
            $insertStmt->execute(array_values($leadData));
            
            $leadId = $pdo->lastInsertId();
            $message = 'Lead creato con successo';
            $action = 'created_lead';
        }
        
        // Log dell'attività
        try {
            $logStmt = $pdo->prepare("
                INSERT INTO leads_funnel_logs (lead_id, user_id, azione, dettagli, created_at) 
                VALUES (?, ?, ?, ?, NOW())
            ");
            $logDetails = "$action: '$nomeCliente' - $servizio";
            $logStmt->execute([$leadId, $userId, $action, $logDetails]);
        } catch (Exception $logError) {
            error_log("Failed to log lead action: " . $logError->getMessage());
        }
        
        $pdo->commit();
        
        // Log dell'azione utente
        logUserAction($action, 'success', "$message: '$nomeCliente' - $servizio");
        
        // Risposta di successo
        echo json_encode([
            'success' => true,
            'message' => $message,
            'lead_id' => $leadId,
            'lead_name' => $nomeCliente,
            'contact_id' => $contactId,
            'is_edit' => $isEdit,
            'column' => $colonna,
            'timestamp' => date('Y-m-d H:i:s')
        ], JSON_UNESCAPED_UNICODE);
        
    } catch (Exception $e) {
        $pdo->rollback();
        throw $e;
    }
    
} catch (Exception $e) {
    // Log dell'errore
    error_log("Error in save_lead.php: " . $e->getMessage());
    error_log("Stack trace: " . $e->getTraceAsString());
    
    // Log dell'azione fallita
    if (isset($currentUser)) {
        logUserAction('save_lead', 'error', $e->getMessage());
    }
    
    // Risposta di errore
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'debug_info' => [
            'file' => basename(__FILE__),
            'line' => $e->getLine(),
            'lead_id' => $leadId ?? 'N/A',
            'contact_mode' => $contactMode ?? 'N/A',
            'is_edit' => $isEdit ?? false
        ]
    ], JSON_UNESCAPED_UNICODE);
}

exit;
?>