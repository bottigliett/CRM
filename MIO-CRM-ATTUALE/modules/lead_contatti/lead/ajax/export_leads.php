<?php
// File: /modules/lead_contatti/lead/ajax/export_leads.php
// API per esportare report lead in CSV

require_once __DIR__ . '/../../../../core/includes/auth_helper.php';

try {
    $currentUser = getCurrentUser();
    if (!$currentUser) {
        throw new Exception('Utente non autenticato');
    }
    
    $dsn = "mysql:host=127.0.0.1;dbname=u706045794_crm_mismo;charset=utf8mb4";
    $pdo = new PDO($dsn, 'u706045794_mismo_crm_new', 'BLQ$>:;*9+h', [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
    
    // Query per ottenere tutti i lead
    $stmt = $pdo->prepare("
        SELECT 
            lf.id,
            lf.nome_cliente,
            lf.servizio,
            lf.somma_lavoro,
            lf.colonna,
            lf.priorita,
            lf.email,
            lf.telefono,
            lf.fonte,
            lf.data_contatto,
            lf.data_chiusura,
            lf.descrizione,
            lf.note,
            lf.motivo_perdita,
            lf.created_at,
            lf.updated_at,
            u.first_name,
            u.last_name
        FROM leads_funnel lf
        LEFT JOIN users u ON lf.created_by = u.id
        ORDER BY lf.colonna, lf.posizione, lf.created_at DESC
    ");
    
    $stmt->execute();
    $leads = $stmt->fetchAll();
    
    // Imposta header per download CSV
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="lead_report_' . date('Y-m-d_H-i-s') . '.csv"');
    header('Pragma: no-cache');
    header('Expires: 0');
    
    // Output CSV
    $output = fopen('php://output', 'w');
    
    // Aggiungi BOM per supporto UTF-8 in Excel
    fputs($output, "\xEF\xBB\xBF");
    
    // Header CSV
    fputcsv($output, [
        'ID',
        'Nome Cliente',
        'Servizio',
        'Valore (€)',
        'Colonna',
        'Priorità',
        'Email',
        'Telefono',
        'Fonte',
        'Data Contatto',
        'Data Chiusura',
        'Descrizione',
        'Note',
        'Motivo Perdita',
        'Creato Da',
        'Data Creazione',
        'Ultimo Aggiornamento'
    ], ';');
    
    // Dati
    foreach ($leads as $lead) {
        $createdBy = trim(($lead['first_name'] ?? '') . ' ' . ($lead['last_name'] ?? ''));
        
        fputcsv($output, [
            $lead['id'],
            $lead['nome_cliente'],
            $lead['servizio'],
            number_format($lead['somma_lavoro'], 2, ',', '.'),
            ucfirst(str_replace('_', ' ', $lead['colonna'])),
            ucfirst($lead['priorita']),
            $lead['email'] ?? '',
            $lead['telefono'] ?? '',
            ucfirst($lead['fonte'] ?? ''),
            $lead['data_contatto'] ? date('d/m/Y', strtotime($lead['data_contatto'])) : '',
            $lead['data_chiusura'] ? date('d/m/Y', strtotime($lead['data_chiusura'])) : '',
            $lead['descrizione'] ?? '',
            $lead['note'] ?? '',
            $lead['motivo_perdita'] ?? '',
            $createdBy,
            date('d/m/Y H:i', strtotime($lead['created_at'])),
            date('d/m/Y H:i', strtotime($lead['updated_at']))
        ], ';');
    }
    
    fclose($output);
    
    // Log attività
    try {
        logUserAction('export_leads', 'success', 'Export report lead CSV');
    } catch (Exception $e) {
        // Non bloccare per errori di log
    }
    
} catch (Exception $e) {
    error_log("Error in export_leads.php: " . $e->getMessage());
    http_response_code(500);
    echo "Errore nell'export: " . $e->getMessage();
}
?>

===== FILE SEPARATORE =====

<?php
// File: /modules/lead_contatti/ajax/delete_contact.php
// API per eliminare un contatto (per entrambe le sezioni)

require_once __DIR__ . '/../../../core/includes/auth_helper.php';
header('Content-Type: application/json; charset=utf-8');

try {
    $currentUser = getCurrentUser();
    if (!$currentUser) {
        throw new Exception('Utente non autenticato');
    }
    
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Metodo non permesso');
    }
    
    if (!validateCSRFToken($_POST['csrf_token'] ?? '')) {
        throw new Exception('Token di sicurezza non valido');
    }
    
    $contactId = $_POST['contact_id'] ?? null;
    if (!$contactId || !is_numeric($contactId)) {
        throw new Exception('ID contatto non valido');
    }
    
    $contactId = (int)$contactId;
    
    $dsn = "mysql:host=127.0.0.1;dbname=u706045794_crm_mismo;charset=utf8mb4";
    $pdo = new PDO($dsn, 'u706045794_mismo_crm_new', 'BLQ$>:;*9+h', [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
    
    // Ottieni info contatto prima di eliminarlo
    $stmt = $pdo->prepare("SELECT name FROM leads_contacts WHERE id = ?");
    $stmt->execute([$contactId]);
    $contact = $stmt->fetch();
    
    if (!$contact) {
        throw new Exception('Contatto non trovato');
    }
    
    // Inizio transazione
    $pdo->beginTransaction();
    
    // Elimina contatto (tags, socials e activity logs verranno eliminati automaticamente per CASCADE)
    $stmt = $pdo->prepare("DELETE FROM leads_contacts WHERE id = ?");
    $stmt->execute([$contactId]);
    
    if ($stmt->rowCount() === 0) {
        throw new Exception('Contatto non trovato o già eliminato');
    }
    
    // Log attività
    try {
        logUserAction('delete_contact', 'success', "Contatto '{$contact['name']}' eliminato");
    } catch (Exception $e) {
        // Non bloccare per errori di log
    }
    
    // Commit
    $pdo->commit();
    
    echo json_encode([
        'success' => true,
        'message' => 'Contatto eliminato con successo'
    ]);
    
} catch (Exception $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollback();
    }
    
    error_log("Error in delete_contact.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>

===== FILE SEPARATORE =====

<?php
// File: /modules/lead_contatti/ajax/export_contacts.php
// API per esportare contatti in CSV

require_once __DIR__ . '/../../../core/includes/auth_helper.php';

try {
    $currentUser = getCurrentUser();
    if (!$currentUser) {
        throw new Exception('Utente non autenticato');
    }
    
    $dsn = "mysql:host=127.0.0.1;dbname=u706045794_crm_mismo;charset=utf8mb4";
    $pdo = new PDO($dsn, 'u706045794_mismo_crm_new', 'BLQ$>:;*9+h', [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
    
    // Query per ottenere tutti i contatti (esclusi i lead)
    $stmt = $pdo->prepare("
        SELECT 
            lc.id,
            lc.name,
            lc.email,
            lc.phone,
            lc.address,
            lc.contact_type,
            lc.status,
            lc.priority,
            lc.description,
            lc.last_contact_date,
            lc.next_followup_date,
            lc.created_at,
            lc.updated_at,
            creator.first_name as created_by_name,
            creator.last_name as created_by_lastname,
            assignee.first_name as assigned_to_name,
            assignee.last_name as assigned_to_lastname,
            GROUP_CONCAT(DISTINCT lct.tag_name ORDER BY lct.tag_name ASC SEPARATOR ', ') as tags,
            GROUP_CONCAT(DISTINCT CONCAT(lcs.platform, ': ', lcs.profile_url) ORDER BY lcs.platform ASC SEPARATOR ' | ') as social_profiles
        FROM leads_contacts lc
        LEFT JOIN users creator ON lc.created_by = creator.id
        LEFT JOIN users assignee ON lc.assigned_to = assignee.id
        LEFT JOIN leads_contacts_tags lct ON lc.id = lct.contact_id
        LEFT JOIN leads_contacts_socials lcs ON lc.id = lcs.contact_id
        WHERE lc.status != 'lead'
        GROUP BY lc.id
        ORDER BY lc.updated_at DESC, lc.created_at DESC
    ");
    
    $stmt->execute();
    $contacts = $stmt->fetchAll();
    
    // Imposta header per download CSV
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="anagrafiche_contatti_' . date('Y-m-d_H-i-s') . '.csv"');
    header('Pragma: no-cache');
    header('Expires: 0');
    
    // Output CSV
    $output = fopen('php://output', 'w');
    
    // Aggiungi BOM per supporto UTF-8 in Excel
    fputs($output, "\xEF\xBB\xBF");
    
    // Header CSV
    fputcsv($output, [
        'ID',
        'Nome',
        'Email',
        'Telefono',
        'Indirizzo',
        'Tipo',
        'Status',
        'Priorità',
        'Descrizione',
        'Ultimo Contatto',
        'Prossimo Follow-up',
        'Tags',
        'Profili Social',
        'Creato Da',
        'Assegnato A',
        'Data Creazione',
        'Ultimo Aggiornamento'
    ], ';');
    
    // Dati
    foreach ($contacts as $contact) {
        $createdBy = trim(($contact['created_by_name'] ?? '') . ' ' . ($contact['created_by_lastname'] ?? ''));
        $assignedTo = trim(($contact['assigned_to_name'] ?? '') . ' ' . ($contact['assigned_to_lastname'] ?? ''));
        
        fputcsv($output, [
            $contact['id'],
            $contact['name'],
            $contact['email'] ?? '',
            $contact['phone'] ?? '',
            $contact['address'] ?? '',
            $contact['contact_type'] === 'company' ? 'Azienda' : 'Persona',
            ucfirst($contact['status']),
            ucfirst($contact['priority']),
            $contact['description'] ?? '',
            $contact['last_contact_date'] ? date('d/m/Y', strtotime($contact['last_contact_date'])) : '',
            $contact['next_followup_date'] ? date('d/m/Y', strtotime($contact['next_followup_date'])) : '',
            $contact['tags'] ?? '',
            $contact['social_profiles'] ?? '',
            $createdBy,
            $assignedTo,
            date('d/m/Y H:i', strtotime($contact['created_at'])),
            date('d/m/Y H:i', strtotime($contact['updated_at']))
        ], ';');
    }
    
    fclose($output);
    
    // Log attività
    try {
        logUserAction('export_contacts', 'success', 'Export anagrafiche contatti CSV');
    } catch (Exception $e) {
        // Non bloccare per errori di log
    }
    
} catch (Exception $e) {
    error_log("Error in export_contacts.php: " . $e->getMessage());
    http_response_code(500);
    echo "Errore nell'export: " . $e->getMessage();
}
?>