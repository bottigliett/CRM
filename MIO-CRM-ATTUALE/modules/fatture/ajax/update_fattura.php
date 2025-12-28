<?php
// File: /modules/fatture/ajax/update_fattura.php
// AJAX per aggiornare una fattura esistente

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
    $fatturaId = intval($_POST['fattura_id'] ?? 0);
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

    // Validazione ID fattura
    if ($fatturaId <= 0) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'ID fattura non valido']);
        exit;
    }

    // Verifica che la fattura esista
    $stmt = $pdo->prepare("SELECT id, numero_fattura, status FROM fatture WHERE id = ?");
    $stmt->execute([$fatturaId]);
    $esistente = $stmt->fetch();

    if (!$esistente) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Fattura non trovata']);
        exit;
    }

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

    // Verifica univocità numero fattura (escludendo la fattura corrente)
    if ($numeroFattura !== $esistente['numero_fattura']) {
        $stmt = $pdo->prepare("SELECT id FROM fatture WHERE numero_fattura = ? AND id != ?");
        $stmt->execute([$numeroFattura, $fatturaId]);
        if ($stmt->fetch()) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'message' => 'Numero fattura già esistente'
            ]);
            exit;
        }
    }

    // Ottieni dati cliente aggiornati
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

    // Inizio transazione
    $pdo->beginTransaction();

    try {
        // Aggiorna fattura
        $stmt = $pdo->prepare("
            UPDATE fatture SET
                numero_fattura = ?,
                client_id = ?,
                client_name = ?,
                client_address = ?,
                client_piva = ?,
                client_cf = ?,
                oggetto = ?,
                descrizione = ?,
                quantita = ?,
                prezzo_unitario = ?,
                subtotale = ?,
                iva_percentuale = ?,
                iva_importo = ?,
                totale = ?,
                data_fattura = ?,
                data_scadenza = ?,
                giorni_pagamento = ?,
                status = ?,
                data_pagamento = ?,
                metodo_pagamento = ?,
                note_fiscali = ?,
                updated_at = NOW()
            WHERE id = ?
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
            $fatturaId
        ]);

        // Se lo status è cambiato da/per pagata, registra la modifica
        $statusChanged = $esistente['status'] !== $status;
        $note_extra = '';
        if ($statusChanged) {
            $note_extra = ' - Status cambiato da "' . $esistente['status'] . '" a "' . $status . '"';
        }

        // Commit transazione
        $pdo->commit();

        // Log dell'azione
        logUserAction('update_fattura', 'success', 
            'Aggiornata fattura: ' . $numeroFattura . ' per cliente: ' . $cliente['name'] . $note_extra . ' (ID: ' . $fatturaId . ')'
        );

        // Risposta success
        echo json_encode([
            'success' => true,
            'message' => 'Fattura aggiornata con successo',
            'data' => [
                'id' => $fatturaId,
                'numero_fattura' => $numeroFattura,
                'client_name' => $cliente['name'],
                'totale' => number_format($totale, 2, '.', ''),
                'status' => $status,
                'status_changed' => $statusChanged
            ]
        ]);

    } catch (Exception $e) {
        // Rollback in caso di errore
        $pdo->rollBack();
        throw $e;
    }

} catch (PDOException $e) {
    error_log("Database error in update_fattura.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Errore del database: ' . $e->getMessage()
    ]);
} catch (Exception $e) {
    error_log("General error in update_fattura.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Errore interno del server'
    ]);
}
?>