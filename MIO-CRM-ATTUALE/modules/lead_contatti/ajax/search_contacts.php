<?php
// File: /modules/lead_contatti/ajax/search_contacts.php
// API per cercare anagrafiche per l'autocomplete nel Lead Board
// VERSIONE COMPATIBILE con la struttura del progetto

require_once $_SERVER['DOCUMENT_ROOT'] . '/core/includes/auth_helper.php';

// Header JSON e disabilita errori
header('Content-Type: application/json; charset=utf-8');
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

try {
    // Verifica autenticazione usando la tua struttura esistente
    requireAuth();
    $currentUser = getCurrentUser();
    
    // Parametri ricerca
    $query = isset($_GET['q']) ? trim($_GET['q']) : '';
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 20;
    
    // Validazione query
    if (empty($query) || strlen($query) < 2) {
        echo json_encode([
            'success' => true,
            'contacts' => [],
            'message' => 'Query troppo corta (minimo 2 caratteri)'
        ]);
        exit;
    }
    
    // Validazione limit
    if ($limit < 1) $limit = 10;
    if ($limit > 100) $limit = 100;
    
    // Connessione database usando la stessa configurazione dell'index.php
    $dsn = "mysql:host=127.0.0.1;dbname=u706045794_crm_mismo;charset=utf8mb4";
    $pdo = new PDO($dsn, 'u706045794_mismo_crm_new', 'BLQ$>:;*9+h', [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
    
    // Query di ricerca - LIMIT hardcoded per evitare errori SQL
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
            created_at
        FROM leads_contacts 
        WHERE (
            name LIKE :search_term OR 
            email LIKE :search_term OR 
            phone LIKE :search_term OR
            address LIKE :search_term
        )
        ORDER BY 
            CASE 
                WHEN name LIKE :exact_match THEN 1
                WHEN name LIKE :starts_with THEN 2
                WHEN email LIKE :starts_with THEN 3
                ELSE 4
            END,
            name ASC
        LIMIT " . (int)$limit;
    
    $searchTerm = '%' . $query . '%';
    $exactMatch = $query;
    $startsWith = $query . '%';
    
    $stmt = $pdo->prepare($sql);
    $stmt->bindValue(':search_term', $searchTerm, PDO::PARAM_STR);
    $stmt->bindValue(':exact_match', $exactMatch, PDO::PARAM_STR);
    $stmt->bindValue(':starts_with', $startsWith, PDO::PARAM_STR);
    
    $stmt->execute();
    $contacts = $stmt->fetchAll();
    
    // Formatta risultati per il frontend
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
            'created_at_formatted' => date('d/m/Y', strtotime($contact['created_at'])),
            'type_icon' => $contact['contact_type'] === 'company' ? '🏢' : '👤',
            'type_label' => $contact['contact_type'] === 'company' ? 'Azienda' : 'Persona',
            'status_label' => ucfirst($contact['status'])
        ];
    }
    
    // Log dell'azione
    logUserAction('search_contacts', 'success', "Ricerca contatti: '$query' - " . count($formattedContacts) . " risultati");
    
    // Risposta di successo
    echo json_encode([
        'success' => true,
        'contacts' => $formattedContacts,
        'total' => count($formattedContacts),
        'query' => $query,
        'limit' => $limit,
        'timestamp' => date('Y-m-d H:i:s')
    ], JSON_UNESCAPED_UNICODE);
    
} catch (Exception $e) {
    // Log dell'errore
    error_log("Error in search_contacts.php: " . $e->getMessage());
    error_log("Stack trace: " . $e->getTraceAsString());
    
    // Log dell'azione fallita
    if (isset($currentUser)) {
        logUserAction('search_contacts', 'error', $e->getMessage());
    }
    
    // Risposta di errore in formato JSON
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'debug_info' => [
            'file' => basename(__FILE__),
            'line' => $e->getLine(),
            'query' => $query ?? 'N/A',
            'limit' => $limit ?? 'N/A'
        ]
    ], JSON_UNESCAPED_UNICODE);
}
?>