<?php
// File: /modules/lead_contatti/ajax/get_contacts.php
// Endpoint per Contact Selector - restituisce contatti per il selettore

header('Content-Type: application/json');

// Includi autenticazione
require_once $_SERVER['DOCUMENT_ROOT'] . '/core/includes/auth_helper.php';

// Verifica autenticazione
if (!requireAuth()) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Non autorizzato']);
    exit;
}

try {
    // Connessione database
    $dsn = "mysql:host=127.0.0.1;dbname=u706045794_crm_mismo;charset=utf8mb4";
    $pdo = new PDO($dsn, 'u706045794_mismo_crm_new', 'BLQ$>:;*9+h', [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);

    // Parametri
    $excludeLeads = isset($_GET['exclude_leads']) && $_GET['exclude_leads'] == '1';
    $limit = isset($_GET['limit']) ? intval($_GET['limit']) : 1000;
    
    // Costruzione query
    $query = "
        SELECT 
            id,
            name,
            email,
            phone,
            contact_type,
            status,
            partita_iva,
            codice_fiscale,
            address
        FROM leads_contacts 
        WHERE 1=1
    ";
    
    $params = [];
    
    // Escludi i lead se richiesto (per il contact selector)
    if ($excludeLeads) {
        $query .= " AND status != 'lead'";
    }
    
    // Ordinamento per importanza
    $query .= " 
        ORDER BY 
            CASE status 
                WHEN 'client' THEN 1 
                WHEN 'prospect' THEN 2 
                WHEN 'collaborazioni' THEN 3
                WHEN 'contatto_utile' THEN 4
                WHEN 'inactive' THEN 5
                ELSE 6 
            END,
            name ASC
    ";
    
    // Limite
    if ($limit > 0) {
        $query .= " LIMIT " . $limit;
    }
    
    // Esecuzione query
    $stmt = $pdo->prepare($query);
    $stmt->execute($params);
    $contacts = $stmt->fetchAll();
    
    // Risposta JSON
    echo json_encode([
        'success' => true,
        'contacts' => $contacts,
        'count' => count($contacts)
    ], JSON_UNESCAPED_UNICODE);

} catch (PDOException $e) {
    error_log("Database error in get_contacts.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Errore del database'
    ]);
} catch (Exception $e) {
    error_log("General error in get_contacts.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Errore interno del server'
    ]);
}
?>