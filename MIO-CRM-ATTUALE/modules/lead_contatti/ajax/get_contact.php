<?php
// File: /modules/lead_contatti/ajax/get_contact.php
// API per ottenere dettagli singolo contatto - VERSIONE AGGIORNATA

require_once __DIR__ . '/../../../core/includes/auth_helper.php';
header('Content-Type: application/json; charset=utf-8');

try {
    // Verifica autenticazione
    $currentUser = getCurrentUser();
    if (!$currentUser) {
        throw new Exception('Utente non autenticato');
    }
    
    // Validazione parametri
    $contactId = $_GET['id'] ?? null;
    if (!$contactId || !is_numeric($contactId)) {
        throw new Exception('ID contatto non valido');
    }
    
    $contactId = (int)$contactId;
    
    // Connessione database
    $dsn = "mysql:host=127.0.0.1;dbname=u706045794_crm_mismo;charset=utf8mb4";
    $pdo = new PDO($dsn, 'u706045794_mismo_crm_new', 'BLQ$>:;*9+h', [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
    
    // Query contatto principale CON NUOVI CAMPI
    $stmt = $pdo->prepare("
        SELECT 
            lc.*,
            creator.first_name as created_by_name,
            creator.last_name as created_by_lastname,
            assignee.first_name as assigned_to_name,
            assignee.last_name as assigned_to_lastname
        FROM leads_contacts lc
        LEFT JOIN users creator ON lc.created_by = creator.id
        LEFT JOIN users assignee ON lc.assigned_to = assignee.id
        WHERE lc.id = ?
    ");
    
    $stmt->execute([$contactId]);
    $contact = $stmt->fetch();
    
    if (!$contact) {
        throw new Exception('Contatto non trovato');
    }
    
    // Assicura che i nuovi campi siano sempre presenti
    $contact['partita_iva'] = $contact['partita_iva'] ?? '';
    $contact['codice_fiscale'] = $contact['codice_fiscale'] ?? '';
    
    // Carica tags dalla tabella separata (priorità) o dal campo JSON
    $stmt = $pdo->prepare("
        SELECT tag_name, tag_color
        FROM leads_contacts_tags
        WHERE contact_id = ?
        ORDER BY tag_name
    ");
    $stmt->execute([$contactId]);
    $tagsFromTable = $stmt->fetchAll();
    
    if (!empty($tagsFromTable)) {
        // Usa tags dalla tabella separata
        $contact['tags'] = $tagsFromTable;
    } else {
        // Fallback al campo JSON
        if (!empty($contact['tags'])) {
            $decodedTags = json_decode($contact['tags'], true);
            $contact['tags'] = is_array($decodedTags) ? $decodedTags : [];
        } else {
            $contact['tags'] = [];
        }
    }
    
    // Carica profili social dalla tabella separata (priorità) o dal campo JSON
    $stmt = $pdo->prepare("
        SELECT platform, profile_url, username
        FROM leads_contacts_socials
        WHERE contact_id = ?
        ORDER BY platform
    ");
    $stmt->execute([$contactId]);
    $socialsFromTable = $stmt->fetchAll();
    
    if (!empty($socialsFromTable)) {
        // Usa socials dalla tabella separata
        $contact['socials'] = $socialsFromTable;
    } else {
        // Fallback al campo JSON
        if (!empty($contact['social_profiles'])) {
            $decodedSocials = json_decode($contact['social_profiles'], true);
            $contact['socials'] = is_array($decodedSocials) ? $decodedSocials : [];
        } else {
            $contact['socials'] = [];
        }
    }
    
    // Carica ultime attività
    $stmt = $pdo->prepare("
        SELECT 
            al.action,
            al.details,
            al.created_at,
            u.first_name,
            u.last_name
        FROM leads_activity_logs al
        LEFT JOIN users u ON al.user_id = u.id
        WHERE al.contact_id = ?
        ORDER BY al.created_at DESC
        LIMIT 5
    ");
    $stmt->execute([$contactId]);
    $contact['recent_activities'] = $stmt->fetchAll();
    
    // Formatta date
    $contact['created_at_formatted'] = date('d/m/Y H:i', strtotime($contact['created_at']));
    $contact['updated_at_formatted'] = date('d/m/Y H:i', strtotime($contact['updated_at']));
    
    if ($contact['last_contact_date']) {
        $contact['last_contact_date_formatted'] = date('d/m/Y', strtotime($contact['last_contact_date']));
    }
    
    if ($contact['next_followup_date']) {
        $contact['next_followup_date_formatted'] = date('d/m/Y', strtotime($contact['next_followup_date']));
    }
    
    // Informazioni aggiuntive
    $contact['created_by_full'] = trim(($contact['created_by_name'] ?? '') . ' ' . ($contact['created_by_lastname'] ?? ''));
    $contact['assigned_to_full'] = trim(($contact['assigned_to_name'] ?? '') . ' ' . ($contact['assigned_to_lastname'] ?? ''));
    $contact['type_icon'] = $contact['contact_type'] === 'company' ? '🏢' : '👤';
    
    // Informazioni sui nuovi status
    $statusInfo = [
        'prospect' => ['label' => 'Prospect', 'icon' => '📈', 'color' => '#f59e0b'],
        'client' => ['label' => 'Cliente', 'icon' => '✅', 'color' => '#22c55e'],
        'collaborazioni' => ['label' => 'Collaborazioni', 'icon' => '🤝', 'color' => '#8b5cf6'],
        'contatto_utile' => ['label' => 'Contatto Utile', 'icon' => '📞', 'color' => '#06b6d4'],
        'inactive' => ['label' => 'Inattivo', 'icon' => '⏸️', 'color' => '#6b7280']
    ];
    
    $contact['status_info'] = $statusInfo[$contact['status']] ?? $statusInfo['client'];
    
    // Log visualizzazione
    try {
        $stmt = $pdo->prepare("
            INSERT INTO leads_activity_logs (contact_id, user_id, action, details, created_at)
            VALUES (?, ?, 'viewed_details', 'Visualizzazione dettagli contatto', NOW())
        ");
        $stmt->execute([$contactId, $currentUser['id']]);
    } catch (Exception $e) {
        // Non bloccare per errori di log
        error_log("Log error in get_contact.php: " . $e->getMessage());
    }
    
    echo json_encode([
        'success' => true,
        'contact' => $contact,
        'debug' => [
            'has_partita_iva' => !empty($contact['partita_iva']),
            'has_codice_fiscale' => !empty($contact['codice_fiscale']),
            'status' => $contact['status'],
            'tags_count' => count($contact['tags']),
            'socials_count' => count($contact['socials'])
        ]
    ]);
    
} catch (Exception $e) {
    error_log("Error in get_contact.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'debug' => [
            'contact_id' => $contactId ?? 'not set',
            'file' => basename(__FILE__)
        ]
    ]);
}
?>