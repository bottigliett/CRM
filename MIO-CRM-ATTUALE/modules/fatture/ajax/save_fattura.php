<?php
// File: /modules/fatture/ajax/save_fattura.php
// AJAX per salvare una nuova fattura

header('Content-Type: application/json');

// Includi autenticazione
require_once $_SERVER['DOCUMENT_ROOT'] . '/core/includes/auth_helper.php';

// Verifica autenticazione e metodo POST
if (!requireAuth()) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Non autorizzato']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
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

    // Validazione CSRF token
    if (!validateCSRFToken($_POST['csrf_token'] ?? '')) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Token di sicurezza non valido']);
        exit;
    }

    // Sanitizzazione e validazione input
    $numeroFattura = sanitizeInput($_POST['numero_fattura'] ?? '');
    $clientId = intval($_POST['client_id'] ?? 0);
    $dataFattura = sanitizeInput($_POST['data_fattura'] ?? '');
    $oggetto = sanitizeInput($_POST['oggetto'] ?? '');
    $descrizione = sanitizeInput($_POST['descrizione'] ?? '');
    $quantita = floatval($_POST['quantita'] ?? 1.0);
    $prezzoUnitario = floatval($_POST['prezzo_unitario'] ?? 0);
    $ivaPercentuale = floatval($_POST['iva_percentuale'] ?? 0);
    $giorniPagamento = intval($_POST['giorni_pagamento'] ?? 30);
    $dataScadenza = sanitizeInput($_POST['data_scadenza'] ?? '');
    $status = sanitizeInput($_POST['status'] ?? 'bozza');
    $dataPagamento = sanitizeInput($_POST['data_pagamento'] ?? '');
    $metodoPagamento = sanitizeInput($_POST['metodo_pagamento'] ?? '');
    $noteFiscali = sanitizeInput($_POST['note_fiscali'] ?? '');

    // Validazione campi obbligatori
    $errors = [];
    
    if (empty($numeroFattura)) {
        $errors[] = 'Numero fattura obbligatorio';
    }
    
    if ($clientId <= 0) {
        $errors[] = 'Cliente obbligatorio';
    }
    
    if (empty($dataFattura) || !strtotime($dataFattura)) {
        $errors[] = 'Data fattura non valida';
    }
    
    if (empty($oggetto)) {
        $errors[] = 'Oggetto fattura obbligatorio';
    }
    
    if ($quantita <= 0) {
        $errors[] = 'Quantità deve essere maggiore di zero';
    }
    
    if ($prezzoUnitario <= 0) {
        $errors[] = 'Prezzo unitario deve essere maggiore di zero';
    }
    
    if ($ivaPercentuale < 0 || $ivaPercentuale > 100) {
        $errors[] = 'Percentuale IVA non valida';
    }
    
    if (empty($dataScadenza) || !strtotime($dataScadenza)) {
        $errors[] = 'Data scadenza non valida';
    }
    
    if (!in_array($status, ['bozza', 'emessa', 'pagata', 'stornata'])) {
        $errors[] = 'Status non valido';
    }
    
    // Se status è pagata, data pagamento è obbligatoria
    if ($status === 'pagata' && (empty($dataPagamento) || !strtotime($dataPagamento))) {
        $errors[] = 'Data pagamento obbligatoria per fatture pagate';
    }

    if (!empty($errors)) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Dati non validi: ' . implode(', ', $errors)
        ]);
        exit;
    }

    // Verifica univocità numero fattura
    $stmt = $pdo->prepare("SELECT id FROM fatture WHERE numero_fattura = ?");
    $stmt->execute([$numeroFattura]);
    if ($stmt->fetch()) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Numero fattura già esistente'
        ]);
        exit;
    }

    // Ottieni dati cliente
    $stmt = $pdo->prepare("
        SELECT id, name, address, partita_iva, codice_fiscale 
        FROM leads_contacts 
        WHERE id = ? AND status IN ('client', 'prospect')
    ");
    $stmt->execute([$clientId]);
    $cliente = $stmt->fetch();

    if (!$cliente) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Cliente non trovato o non valido'
        ]);
        exit;
    }

    // Calcoli automatici
    $subtotale = $quantita * $prezzoUnitario;
    $ivaImporto = $subtotale * ($ivaPercentuale / 100);
    $totale = $subtotale + $ivaImporto;

    // Ottieni utente corrente
    $currentUser = getCurrentUser();

    // Inizio transazione
    $pdo->beginTransaction();

    try {
        // Inserisci fattura
        $stmt = $pdo->prepare("
            INSERT INTO fatture (
                numero_fattura,
                client_id,
                client_name,
                client_address,
                client_piva,
                client_cf,
                oggetto,
                descrizione,
                quantita,
                prezzo_unitario,
                subtotale,
                iva_percentuale,
                iva_importo,
                totale,
                data_fattura,
                data_scadenza,
                giorni_pagamento,
                status,
                data_pagamento,
                metodo_pagamento,
                note_fiscali,
                created_by,
                created_at,
                updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        ");

        $stmt->execute([
            $numeroFattura,
            $cliente['id'],
            $cliente['name'],
            $cliente['address'],
            $cliente['partita_iva'],
            $cliente['codice_fiscale'],
            $oggetto,
            $descrizione,
            $quantita,
            $prezzoUnitario,
            $subtotale,
            $ivaPercentuale,
            $ivaImporto,
            $totale,
            $dataFattura,
            $dataScadenza,
            $giorniPagamento,
            $status,
            !empty($dataPagamento) ? $dataPagamento : null,
            !empty($metodoPagamento) ? $metodoPagamento : null,
            $noteFiscali,
            $currentUser['id']
        ]);

        $fatturaId = $pdo->lastInsertId();

        // Commit transazione
        $pdo->commit();

        // Log dell'azione
        logUserAction('create_fattura', 'success', 
            'Creata fattura: ' . $numeroFattura . ' per cliente: ' . $cliente['name'] . ' (ID: ' . $fatturaId . ')'
        );

        // Risposta success
        echo json_encode([
            'success' => true,
            'message' => 'Fattura creata con successo',
            'data' => [
                'id' => $fatturaId,
                'numero_fattura' => $numeroFattura,
                'client_name' => $cliente['name'],
                'totale' => number_format($totale, 2, '.', ''),
                'status' => $status
            ]
        ]);

    } catch (Exception $e) {
        // Rollback in caso di errore
        $pdo->rollBack();
        throw $e;
    }

} catch (PDOException $e) {
    error_log("Database error in save_fattura.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Errore del database: ' . $e->getMessage()
    ]);
} catch (Exception $e) {
    error_log("General error in save_fattura.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Errore interno del server'
    ]);
}
?>