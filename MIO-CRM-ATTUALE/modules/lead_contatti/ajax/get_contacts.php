<?php
// File: /modules/lead_contatti/ajax/get_contacts.php
// API per ottenere le anagrafiche contatti (NON i lead) - VERSIONE AGGIORNATA

// Disabilita TUTTI gli errori PHP che potrebbero sporcare il JSON
error_reporting(0);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

// Pulisci buffer output
while (ob_get_level()) {
    ob_end_clean();
}

// Header JSON come PRIMA cosa
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-cache, must-revalidate');

try {
    // Test autenticazione semplificato
    session_start();
    if (!isset($_SESSION['user_id'])) {
        throw new Exception('Utente non autenticato');
    }
    
    // Connessione database robusta
    $dsn = "mysql:host=127.0.0.1;dbname=u706045794_crm_mismo;charset=utf8mb4";
    $pdo = new PDO($dsn, 'u706045794_mismo_crm_new', 'BLQ$>:;*9+h', [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false
    ]);
    
    // Parametri con valori default sicuri
    $search = isset($_GET['search']) ? trim($_GET['search']) : '';
    $limit = isset($_GET['limit']) && is_numeric($_GET['limit']) ? (int)$_GET['limit'] : 100;
    $status = isset($_GET['status']) ? trim($_GET['status']) : '';
    $contactType = isset($_GET['contact_type']) ? trim($_GET['contact_type']) : '';
    $onlyActive = isset($_GET['only_active']) ? ($_GET['only_active'] === '1') : true;
    $hasEmail = isset($_GET['has_email']) ? ($_GET['has_email'] === '1') : false;
    
    // Assicura limiti ragionevoli
    if ($limit > 1000) $limit = 1000;
    if ($limit < 1) $limit = 50;
    
    // Costruzione query - SOLO anagrafiche (NON lead) CON NUOVI CAMPI
    $whereConditions = ["status != 'lead'"];
    $params = [];
    
    // Filtro ricerca (AGGIORNATO: include P.IVA e CF)
    if (!empty($search)) {
        $whereConditions[] = "(name LIKE ? OR email LIKE ? OR phone LIKE ? OR partita_iva LIKE ? OR codice_fiscale LIKE ?)";
        $searchTerm = "%$search%";
        $params[] = $searchTerm;
        $params[] = $searchTerm;
        $params[] = $searchTerm;
        $params[] = $searchTerm;
        $params[] = $searchTerm;
    }
    
    // Filtro status (AGGIORNATO: include nuovi status)
    if (!empty($status) && $status !== 'all') {
        $whereConditions[] = "status = ?";
        $params[] = $status;
    }
    
    // Filtro tipo contatto
    if (!empty($contactType) && $contactType !== 'all') {
        $whereConditions[] = "contact_type = ?";
        $params[] = $contactType;
    }
    
    // Solo contatti attivi (AGGIORNATO: include nuovi status attivi)
    if ($onlyActive) {
        $whereConditions[] = "status IN ('prospect', 'client', 'collaborazioni', 'contatto_utile')";
    }
    
    // Solo con email
    if ($hasEmail) {
        $whereConditions[] = "email IS NOT NULL AND email != ''";
    }
    
    $whereClause = implode(' AND ', $whereConditions);
    
    // Query principale CON NUOVI CAMPI
    $query = "
        SELECT 
            id,
            name,
            email,
            phone,
            partita_iva,
            codice_fiscale,
            contact_type,
            status,
            priority,
            address,
            description,
            last_contact_date,
            next_followup_date,
            created_at,
            updated_at,
            tags,
            social_profiles
        FROM leads_contacts
        WHERE $whereClause
        ORDER BY 
            CASE status 
                WHEN 'client' THEN 1 
                WHEN 'prospect' THEN 2 
                WHEN 'collaborazioni' THEN 3
                WHEN 'contatto_utile' THEN 4
                WHEN 'inactive' THEN 5 
                ELSE 6 
            END,
            CASE priority 
                WHEN 'high' THEN 1 
                WHEN 'medium' THEN 2 
                WHEN 'low' THEN 3 
                ELSE 4 
            END,
            name ASC
        LIMIT ?
    ";
    
    $params[] = $limit;
    
    $stmt = $pdo->prepare($query);
    $stmt->execute($params);
    $contacts = $stmt->fetchAll();
    
    // Processa i contatti per assicurare tipi corretti
    foreach ($contacts as &$contact) {
        $contact['id'] = (int)$contact['id'];
        
        // Gestisci priority vuota
        if (empty($contact['priority'])) {
            $contact['priority'] = 'medium';
        }
        
        // Assicura che i nuovi campi siano sempre presenti
        $contact['partita_iva'] = $contact['partita_iva'] ?: '';
        $contact['codice_fiscale'] = $contact['codice_fiscale'] ?: '';
        
        // Processa JSON tags (può essere NULL)
        if (!empty($contact['tags'])) {
            $decodedTags = json_decode($contact['tags'], true);
            $contact['tags'] = is_array($decodedTags) ? $decodedTags : [];
        } else {
            $contact['tags'] = [];
        }
        
        // Processa JSON social_profiles (può essere NULL)  
        if (!empty($contact['social_profiles'])) {
            $decodedSocials = json_decode($contact['social_profiles'], true);
            $contact['socials'] = is_array($decodedSocials) ? $decodedSocials : [];
        } else {
            $contact['socials'] = [];
        }
        
        // Rimuovi il campo raw social_profiles per evitare confusione
        unset($contact['social_profiles']);
        
        // Assicura che i campi text non siano NULL
        $contact['address'] = $contact['address'] ?: '';
        $contact['description'] = $contact['description'] ?: '';
        
        // Formatta le date
        if ($contact['last_contact_date']) {
            $contact['last_contact_date_formatted'] = date('d/m/Y', strtotime($contact['last_contact_date']));
        }
        
        if ($contact['next_followup_date']) {
            $contact['next_followup_date_formatted'] = date('d/m/Y', strtotime($contact['next_followup_date']));
        }
    }
    
    // Conta totale
    $countQuery = "SELECT COUNT(*) FROM leads_contacts WHERE $whereClause";
    $countParams = array_slice($params, 0, -1); // Rimuovi il LIMIT
    $countStmt = $pdo->prepare($countQuery);
    $countStmt->execute($countParams);
    $totalCount = $countStmt->fetchColumn();
    
    // Conta per status (per statistiche)
    $statusStats = [];
    $statusQuery = "
        SELECT status, COUNT(*) as count 
        FROM leads_contacts 
        WHERE status != 'lead'
        GROUP BY status
    ";
    $statusStmt = $pdo->query($statusQuery);
    $statusResults = $statusStmt->fetchAll();
    foreach ($statusResults as $stat) {
        $statusStats[$stat['status']] = (int)$stat['count'];
    }
    
    // Risposta di successo
    $response = [
        'success' => true,
        'contacts' => $contacts,
        'count' => count($contacts),
        'total_count' => (int)$totalCount,
        'status_stats' => $statusStats,
        'filters' => [
            'search' => $search,
            'status' => $status,
            'contact_type' => $contactType,
            'only_active' => $onlyActive,
            'has_email' => $hasEmail,
            'limit' => $limit
        ],
        'debug' => [
            'where_clause' => $whereClause,
            'params_count' => count($params),
            'memory_usage' => memory_get_usage(true),
            'new_fields_included' => ['partita_iva', 'codice_fiscale'],
            'supported_statuses' => ['prospect', 'client', 'collaborazioni', 'contatto_utile', 'inactive']
        ]
    ];
    
    echo json_encode($response, JSON_UNESCAPED_UNICODE);
    
} catch (PDOException $e) {
    error_log("Database error in get_contacts.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Database error: ' . $e->getMessage(),
        'type' => 'database_error',
        'file' => basename(__FILE__)
    ], JSON_UNESCAPED_UNICODE);
    
} catch (Exception $e) {
    error_log("General error in get_contacts.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'type' => 'general_error',
        'file' => basename(__FILE__)
    ], JSON_UNESCAPED_UNICODE);
}

// Pulisci e esci
exit;
?>