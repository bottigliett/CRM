<?php
// File: /modules/fatture/ajax/get_fattura.php
// AJAX per ottenere i dati di una singola fattura per modifica

header('Content-Type: application/json');

// Includi autenticazione
require_once $_SERVER['DOCUMENT_ROOT'] . '/core/includes/auth_helper.php';

// Verifica autenticazione
if (!requireAuth()) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Non autorizzato']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Metodo non consentito']);
    exit;
}

try {
    // Connessione database
    $dsn = "mysql:host=127.0.0.1;dbname=u706045794_crm_mismo;charset=utf8mb4";
    $pdo = new PDO($dsn, 'u706045794_mismo_crm_new', 'BLQ$>:;*9+h', [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);

    // Validazione ID
    $id = intval($_GET['id'] ?? 0);
    
    if ($id <= 0) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'ID fattura non valido'
        ]);
        exit;
    }

    // Query per ottenere la fattura
    $stmt = $pdo->prepare("
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
            f.pdf_generated_at,
            f.created_by
        FROM fatture f
        WHERE f.id = ?
    ");
    
    $stmt->execute([$id]);
    $fattura = $stmt->fetch();
    
    if (!$fattura) {
        http_response_code(404);
        echo json_encode([
            'success' => false,
            'message' => 'Fattura non trovata'
        ]);
        exit;
    }

    // Formatta i dati per la visualizzazione
    $fattura['quantita'] = number_format($fattura['quantita'], 2, '.', '');
    $fattura['prezzo_unitario'] = number_format($fattura['prezzo_unitario'], 2, '.', '');
    $fattura['subtotale'] = number_format($fattura['subtotale'], 2, '.', '');
    $fattura['iva_percentuale'] = number_format($fattura['iva_percentuale'], 2, '.', '');
    $fattura['iva_importo'] = number_format($fattura['iva_importo'], 2, '.', '');
    $fattura['totale'] = number_format($fattura['totale'], 2, '.', '');

    // Controlla se la fattura è scaduta
    $fattura['is_overdue'] = false;
    if ($fattura['status'] === 'emessa' && 
        new DateTime($fattura['data_scadenza']) < new DateTime()) {
        $fattura['is_overdue'] = true;
    }

    // Log dell'azione
    logUserAction('get_fattura_details', 'success', 
        'Visualizzata fattura: ' . $fattura['numero_fattura'] . ' (ID: ' . $id . ')'
    );

    // Risposta JSON
    echo json_encode([
        'success' => true,
        'data' => $fattura
    ], JSON_UNESCAPED_UNICODE);

} catch (PDOException $e) {
    error_log("Database error in get_fattura.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Errore del database'
    ]);
} catch (Exception $e) {
    error_log("General error in get_fattura.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Errore interno del server'
    ]);
}
?>