<?php
// File: /modules/fatture/ajax/get_fatture.php
// AJAX per ottenere la lista delle fatture con filtri

header('Content-Type: application/json');

// Includi autenticazione
require_once $_SERVER['DOCUMENT_ROOT'] . '/core/includes/auth_helper.php';

// Verifica autenticazione
if (!requireAuth()) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Non autorizzato']);
    exit;
}

try {
    // Connessione database
    $dsn = "mysql:host=127.0.0.1;dbname=u706045794_crm_mismo;charset=utf8mb4";
    $pdo = new PDO($dsn, 'u706045794_mismo_crm_new', 'BLQ$>:;*9+h', [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);

    // Parametri di filtro
    $status = $_GET['status'] ?? 'all';
    $period = $_GET['period'] ?? 'all';
    $search = $_GET['search'] ?? '';
    $unpaidOnly = isset($_GET['unpaid_only']) && $_GET['unpaid_only'] === 'true';
    $currentYear = isset($_GET['current_year']) && $_GET['current_year'] === 'true';
    
    // Costruzione query base
    $query = "
        SELECT 
            f.id,
            f.numero_fattura,
            f.client_id,
            f.client_name,
            f.client_address,
            f.client_piva,
            f.client_cf,
            f.oggetto,
            f.descrizione,
            f.quantita,
            f.prezzo_unitario,
            f.subtotale,
            f.iva_percentuale,
            f.iva_importo,
            f.totale,
            f.data_fattura,
            f.data_scadenza,
            f.giorni_pagamento,
            f.status,
            f.data_pagamento,
            f.metodo_pagamento,
            f.note_pagamento,
            f.note_fiscali,
            f.created_at,
            f.updated_at,
            f.pdf_path,
            f.pdf_generated_at
        FROM fatture f
        WHERE 1=1
    ";
    
    $params = [];
    
    // Filtro per status
    if ($status !== 'all') {
        if ($status === 'scaduta') {
            // Fatture emesse scadute
            $query .= " AND f.status = 'emessa' AND f.data_scadenza < CURDATE()";
        } else {
            $query .= " AND f.status = ?";
            $params[] = $status;
        }
    }
    
    // Filtro per periodo
    if ($period !== 'all') {
        switch ($period) {
            case 'current_month':
                $query .= " AND YEAR(f.data_fattura) = YEAR(CURDATE()) AND MONTH(f.data_fattura) = MONTH(CURDATE())";
                break;
            case 'last_month':
                $query .= " AND YEAR(f.data_fattura) = YEAR(DATE_SUB(CURDATE(), INTERVAL 1 MONTH)) AND MONTH(f.data_fattura) = MONTH(DATE_SUB(CURDATE(), INTERVAL 1 MONTH))";
                break;
            case 'current_year':
                $query .= " AND YEAR(f.data_fattura) = YEAR(CURDATE())";
                break;
        }
    }
    
    // Filtro solo anno corrente (default)
    if ($currentYear && $period === 'all') {
        $query .= " AND YEAR(f.data_fattura) = YEAR(CURDATE())";
    }
    
    // Filtro solo non pagate
    if ($unpaidOnly) {
        $query .= " AND f.status IN ('bozza', 'emessa')";
    }
    
    // Filtro ricerca
    if (!empty($search)) {
        $query .= " AND (
            f.numero_fattura LIKE ? OR
            f.client_name LIKE ? OR
            f.client_piva LIKE ? OR
            f.oggetto LIKE ?
        )";
        $searchParam = '%' . $search . '%';
        $params = array_merge($params, [$searchParam, $searchParam, $searchParam, $searchParam]);
    }
    
    // Ordinamento
    $query .= " ORDER BY f.data_fattura DESC, f.id DESC";
    
    // Limite (opzionale)
    $limit = isset($_GET['limit']) ? intval($_GET['limit']) : 100;
    $query .= " LIMIT " . $limit;
    
    // Esecuzione query
    $stmt = $pdo->prepare($query);
    $stmt->execute($params);
    $fatture = $stmt->fetchAll();
    
    // Elaborazione risultati - aggiungi status scaduta se necessario
    foreach ($fatture as &$fattura) {
        // Controlla se la fattura emessa è scaduta
        if ($fattura['status'] === 'emessa' && 
            new DateTime($fattura['data_scadenza']) < new DateTime()) {
            $fattura['is_overdue'] = true;
        } else {
            $fattura['is_overdue'] = false;
        }
        
        // Formatta i numeri
        $fattura['totale'] = number_format($fattura['totale'], 2, '.', '');
        $fattura['subtotale'] = number_format($fattura['subtotale'], 2, '.', '');
        $fattura['iva_importo'] = number_format($fattura['iva_importo'], 2, '.', '');
        $fattura['prezzo_unitario'] = number_format($fattura['prezzo_unitario'], 2, '.', '');
        $fattura['quantita'] = number_format($fattura['quantita'], 2, '.', '');
        $fattura['iva_percentuale'] = number_format($fattura['iva_percentuale'], 2, '.', '');
    }
    
    // Statistiche aggiuntive se richieste
    $includeStats = isset($_GET['include_stats']) && $_GET['include_stats'] === 'true';
    $stats = null;
    
    if ($includeStats) {
        // Calcola statistiche rapide
        $statsQuery = "
            SELECT 
                COUNT(*) as total_count,
                SUM(CASE WHEN status = 'emessa' THEN totale ELSE 0 END) as total_emesso,
                SUM(CASE WHEN status = 'pagata' THEN totale ELSE 0 END) as total_incassato,
                SUM(CASE WHEN status = 'emessa' AND data_scadenza >= CURDATE() THEN totale ELSE 0 END) as in_attesa
            FROM fatture 
            WHERE YEAR(data_fattura) = YEAR(CURDATE())
        ";
        
        $statsStmt = $pdo->query($statsQuery);
        $stats = $statsStmt->fetch();
        
        // Formatta i numeri delle statistiche
        if ($stats) {
            foreach (['total_emesso', 'total_incassato', 'in_attesa'] as $field) {
                $stats[$field] = number_format($stats[$field], 2, '.', '');
            }
        }
    }
    
    // Log dell'azione
    logUserAction('get_fatture_list', 'success', 
        'Caricata lista fatture - Filtri: status=' . $status . ', period=' . $period . ', results=' . count($fatture)
    );
    
    // Risposta JSON
    $response = [
        'success' => true,
        'data' => $fatture,
        'count' => count($fatture),
        'filters' => [
            'status' => $status,
            'period' => $period,
            'search' => $search,
            'unpaid_only' => $unpaidOnly,
            'current_year' => $currentYear
        ]
    ];
    
    if ($stats) {
        $response['stats'] = $stats;
    }
    
    echo json_encode($response, JSON_UNESCAPED_UNICODE);

} catch (PDOException $e) {
    error_log("Database error in get_fatture.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Errore del database'
    ]);
} catch (Exception $e) {
    error_log("General error in get_fatture.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Errore interno del server'
    ]);
}
?>