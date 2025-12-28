<?php
// File: /modules/fatture/ajax/export_fatture.php
// AJAX per esportare la lista delle fatture in formato CSV

// Includi autenticazione
require_once $_SERVER['DOCUMENT_ROOT'] . '/core/includes/auth_helper.php';

// Verifica autenticazione
if (!requireAuth()) {
    http_response_code(401);
    echo 'Non autorizzato';
    exit;
}

try {
    // Connessione database
    $dsn = "mysql:host=127.0.0.1;dbname=u706045794_crm_mismo;charset=utf8mb4";
    $pdo = new PDO($dsn, 'u706045794_mismo_crm_new', 'BLQ$>:;*9+h', [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);

    // Parametri di filtro (opzionali)
    $status = $_GET['status'] ?? 'all';
    $period = $_GET['period'] ?? 'current_year';
    $search = $_GET['search'] ?? '';
    
    // Costruzione query
    $query = "
        SELECT 
            f.numero_fattura as 'Numero Fattura',
            f.client_name as 'Cliente',
            f.client_piva as 'P.IVA Cliente',
            f.oggetto as 'Oggetto',
            f.descrizione as 'Descrizione',
            f.quantita as 'Quantità',
            f.prezzo_unitario as 'Prezzo Unitario',
            f.subtotale as 'Subtotale',
            f.iva_percentuale as 'IVA %',
            f.iva_importo as 'Importo IVA',
            f.totale as 'Totale',
            DATE_FORMAT(f.data_fattura, '%d/%m/%Y') as 'Data Fattura',
            DATE_FORMAT(f.data_scadenza, '%d/%m/%Y') as 'Data Scadenza',
            f.giorni_pagamento as 'Giorni Pagamento',
            CASE f.status
                WHEN 'bozza' THEN 'Bozza'
                WHEN 'emessa' THEN 'Emessa'
                WHEN 'pagata' THEN 'Pagata'
                WHEN 'stornata' THEN 'Stornata'
                ELSE f.status
            END as 'Status',
            DATE_FORMAT(f.data_pagamento, '%d/%m/%Y') as 'Data Pagamento',
            f.metodo_pagamento as 'Metodo Pagamento',
            f.client_address as 'Indirizzo Cliente',
            f.client_cf as 'Codice Fiscale Cliente',
            DATE_FORMAT(f.created_at, '%d/%m/%Y %H:%i') as 'Creata il',
            DATE_FORMAT(f.updated_at, '%d/%m/%Y %H:%i') as 'Aggiornata il'
        FROM fatture f
        WHERE 1=1
    ";
    
    $params = [];
    
    // Filtro per status
    if ($status !== 'all') {
        if ($status === 'scaduta') {
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
    
    // Esecuzione query
    $stmt = $pdo->prepare($query);
    $stmt->execute($params);
    $fatture = $stmt->fetchAll();
    
    // Log dell'azione
    logUserAction('export_fatture', 'success', 
        'Esportate ' . count($fatture) . ' fatture - Filtri: status=' . $status . ', period=' . $period
    );

    // Generazione del filename
    $timestamp = date('Y-m-d_H-i-s');
    $filename = 'Fatture_' . $timestamp . '.csv';
    
    // Headers per il download del CSV
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="' . $filename . '"');
    header('Cache-Control: no-cache, no-store, must-revalidate');
    header('Pragma: no-cache');
    header('Expires: 0');

    // Output UTF-8 BOM per compatibilità con Excel
    echo "\xEF\xBB\xBF";

    // Crea il file CSV
    $output = fopen('php://output', 'w');
    
    if ($output && count($fatture) > 0) {
        // Scrivi header del CSV (nomi delle colonne)
        $headers = array_keys($fatture[0]);
        fputcsv($output, $headers, ';'); // Usa ; come separatore per compatibilità italiana
        
        // Scrivi i dati
        foreach ($fatture as $fattura) {
            // Formatta i numeri per l'export
            if (isset($fattura['Quantità'])) {
                $fattura['Quantità'] = number_format($fattura['Quantità'], 2, ',', '');
            }
            if (isset($fattura['Prezzo Unitario'])) {
                $fattura['Prezzo Unitario'] = number_format($fattura['Prezzo Unitario'], 2, ',', '') . ' €';
            }
            if (isset($fattura['Subtotale'])) {
                $fattura['Subtotale'] = number_format($fattura['Subtotale'], 2, ',', '') . ' €';
            }
            if (isset($fattura['IVA %'])) {
                $fattura['IVA %'] = number_format($fattura['IVA %'], 2, ',', '') . '%';
            }
            if (isset($fattura['Importo IVA'])) {
                $fattura['Importo IVA'] = number_format($fattura['Importo IVA'], 2, ',', '') . ' €';
            }
            if (isset($fattura['Totale'])) {
                $fattura['Totale'] = number_format($fattura['Totale'], 2, ',', '') . ' €';
            }
            
            // Gestisci campi null
            $fattura = array_map(function($value) {
                return $value === null ? '' : $value;
            }, $fattura);
            
            fputcsv($output, $fattura, ';');
        }
        
        fclose($output);
    } else {
        // Se non ci sono dati, comunque crea un CSV con solo gli headers
        fputcsv($output, [
            'Numero Fattura',
            'Cliente', 
            'P.IVA Cliente',
            'Oggetto',
            'Descrizione',
            'Quantità',
            'Prezzo Unitario',
            'Subtotale',
            'IVA %',
            'Importo IVA',
            'Totale',
            'Data Fattura',
            'Data Scadenza',
            'Giorni Pagamento',
            'Status',
            'Data Pagamento',
            'Metodo Pagamento',
            'Indirizzo Cliente',
            'Codice Fiscale Cliente',
            'Creata il',
            'Aggiornata il'
        ], ';');
        
        // Riga di avviso
        fputcsv($output, ['Nessuna fattura trovata con i filtri specificati'], ';');
        
        fclose($output);
    }

} catch (PDOException $e) {
    error_log("Database error in export_fatture.php: " . $e->getMessage());
    http_response_code(500);
    
    // Headers per errore
    header('Content-Type: text/plain; charset=utf-8');
    echo 'Errore del database durante l\'export';
    
} catch (Exception $e) {
    error_log("General error in export_fatture.php: " . $e->getMessage());
    http_response_code(500);
    
    // Headers per errore
    header('Content-Type: text/plain; charset=utf-8');
    echo 'Errore interno del server durante l\'export';
}
?>