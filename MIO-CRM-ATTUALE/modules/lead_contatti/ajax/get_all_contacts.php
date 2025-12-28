<?php
// File: /modules/lead_contatti/ajax/get_all_contacts.php
// API per recuperare tutti i contatti per la lista completa
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
    
    // Parametri opzionali
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 500; // Default 500 per lista completa
    $offset = isset($_GET['offset']) ? (int)$_GET['offset'] : 0;
    $orderBy = $_GET['order_by'] ?? 'name'; // name, created_at, status
    $orderDir = $_GET['order_dir'] ?? 'ASC'; // ASC, DESC
    
    // Validazione parametri
    if ($limit < 1) $limit = 50;
    if ($limit > 1000) $limit = 1000; // Limite massimo per sicurezza
    if ($offset < 0) $offset = 0;
    
    $validOrderBy = ['name', 'created_at', 'status', 'contact_type', 'priority'];
    if (!in_array($orderBy, $validOrderBy)) {
        $orderBy = 'name';
    }
    
    $validOrderDir = ['ASC', 'DESC'];
    if (!in_array($orderDir, $validOrderDir)) {
        $orderDir = 'ASC';
    }
    
    // Connessione database usando la stessa configurazione dell'index.php
    $dsn = "mysql:host=127.0.0.1;dbname=u706045794_crm_mismo;charset=utf8mb4";
    $pdo = new PDO($dsn, 'u706045794_mismo_crm_new', 'BLQ$>:;*9+h', [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
    
    // Query per contare il totale
    $countSql = "SELECT COUNT(*) as total FROM leads_contacts";
    $countStmt = $pdo->prepare($countSql);
    $countStmt->execute();
    $totalContacts = (int)$countStmt->fetchColumn();
    
    // Query principale per recuperare i contatti
    $sql = "
        SELECT 
            id,
            name,
            email,
            phone,
            contact_type,
            status,
            priority,
            address,
            description,
            created_at,
            updated_at,
            last_contact_date,
            next_followup_date
        FROM leads_contacts 
        ORDER BY {$orderBy} {$orderDir}
        LIMIT " . (int)$limit . " OFFSET " . (int)$offset;
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute();
    $contacts = $stmt->fetchAll();
    
    // Formatta risultati
    $formattedContacts = [];
    foreach ($contacts as $contact) {
        $formattedContacts[] = [
            'id' => (int)$contact['id'],
            'name' => $contact['name'],
            'email' => $contact['email'],
            'phone' => $contact['phone'],
            'contact_type' => $contact['contact_type'],
            'status' => $contact['status'],
            'priority' => $contact['priority'],
            'address' => $contact['address'],
            'description' => $contact['description'],
            'created_at' => $contact['created_at'],
            'updated_at' => $contact['updated_at'],
            'last_contact_date' => $contact['last_contact_date'],
            'next_followup_date' => $contact['next_followup_date'],
            // Campi formattati per il frontend
            'created_at_formatted' => date('d/m/Y', strtotime($contact['created_at'])),
            'updated_at_formatted' => date('d/m/Y H:i', strtotime($contact['updated_at'])),
            'type_icon' => $contact['contact_type'] === 'company' ? '🏢' : '👤',
            'type_label' => $contact['contact_type'] === 'company' ? 'Azienda' : 'Persona',
            'status_label' => ucfirst($contact['status']),
            'priority_label' => ucfirst($contact['priority']),
            // Date formattate se presenti
            'last_contact_date_formatted' => $contact['last_contact_date'] ? 
                date('d/m/Y', strtotime($contact['last_contact_date'])) : null,
            'next_followup_date_formatted' => $contact['next_followup_date'] ? 
                date('d/m/Y', strtotime($contact['next_followup_date'])) : null
        ];
    }
    
    // Statistiche aggiuntive
    $statusStats = [];
    $typeStats = [];
    
    if (!empty($formattedContacts)) {
        // Conta per status
        $statusCounts = array_count_values(array_column($formattedContacts, 'status'));
        foreach ($statusCounts as $status => $count) {
            $statusStats[] = [
                'status' => $status,
                'count' => $count,
                'percentage' => round(($count / count($formattedContacts)) * 100, 1)
            ];
        }
        
        // Conta per tipo
        $typeCounts = array_count_values(array_column($formattedContacts, 'contact_type'));
        foreach ($typeCounts as $type => $count) {
            $typeStats[] = [
                'type' => $type,
                'count' => $count,
                'percentage' => round(($count / count($formattedContacts)) * 100, 1)
            ];
        }
    }
    
    // Log dell'azione
    logUserAction('get_all_contacts', 'success', "Caricati " . count($formattedContacts) . " contatti (totale: $totalContacts)");
    
    // Risposta di successo
    echo json_encode([
        'success' => true,
        'contacts' => $formattedContacts,
        'pagination' => [
            'total' => $totalContacts,
            'limit' => $limit,
            'offset' => $offset,
            'current_count' => count($formattedContacts),
            'has_more' => ($offset + count($formattedContacts)) < $totalContacts
        ],
        'stats' => [
            'by_status' => $statusStats,
            'by_type' => $typeStats
        ],
        'order' => [
            'by' => $orderBy,
            'direction' => $orderDir
        ],
        'timestamp' => date('Y-m-d H:i:s')
    ], JSON_UNESCAPED_UNICODE);
    
} catch (Exception $e) {
    // Log dell'errore
    error_log("Error in get_all_contacts.php: " . $e->getMessage());
    error_log("Stack trace: " . $e->getTraceAsString());
    
    // Log dell'azione fallita
    if (isset($currentUser)) {
        logUserAction('get_all_contacts', 'error', $e->getMessage());
    }
    
    // Risposta di errore
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'debug_info' => [
            'file' => basename(__FILE__),
            'line' => $e->getLine(),
            'limit' => $limit ?? 'N/A',
            'offset' => $offset ?? 'N/A'
        ]
    ], JSON_UNESCAPED_UNICODE);
}
?>