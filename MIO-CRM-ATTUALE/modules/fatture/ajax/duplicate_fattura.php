<?php
// File: /modules/fatture/ajax/duplicate_fattura.php
// AJAX per duplicare una fattura esistente (crea una nuova bozza)

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

    // Leggi JSON input
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !isset($input['id'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'ID fattura richiesto']);
        exit;
    }

    $originalId = intval($input['id']);
    
    if ($originalId <= 0) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'ID fattura non valido']);
        exit;
    }

    // Ottieni dati fattura originale
    $stmt = $pdo->prepare("
        SELECT 
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
            giorni_pagamento,
            note_fiscali,
            numero_fattura
        FROM fatture 
        WHERE id = ?
    ");
    $stmt->execute([$originalId]);
    $original = $stmt->fetch();
    
    if (!$original) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Fattura originale non trovata']);
        exit;
    }

    // Genera nuovo numero fattura suggerito
    $currentYear = date('Y');
    
    // Trova l'ultimo numero dell'anno corrente
    $stmt = $pdo->prepare("
        SELECT numero_fattura 
        FROM fatture 
        WHERE YEAR(data_fattura) = ? 
        ORDER BY id DESC 
        LIMIT 1
    ");
    $stmt->execute([$currentYear]);
    $lastFattura = $stmt->fetch();
    
    // Suggerisci un nuovo numero
    $suggestedNumber = '#001' . $currentYear;
    if ($lastFattura && preg_match('/#(\d+)' . $currentYear . '/', $lastFattura['numero_fattura'], $matches)) {
        $nextNumber = intval($matches[1]) + 1;
        $suggestedNumber = '#' . str_pad($nextNumber, 3, '0', STR_PAD_LEFT) . $currentYear;
    } elseif ($lastFattura && preg_match('/#(\d+)/', $lastFattura['numero_fattura'], $matches)) {
        $nextNumber = intval($matches[1]) + 1;
        $suggestedNumber = '#' . $nextNumber . $currentYear;
    }
    
    // Se il numero suggerito esiste già, trova il prossimo disponibile
    $counter = 1;
    $baseNumber = $suggestedNumber;
    while (true) {
        $stmt = $pdo->prepare("SELECT id FROM fatture WHERE numero_fattura = ?");
        $stmt->execute([$suggestedNumber]);
        if (!$stmt->fetch()) {
            break; // Numero disponibile
        }
        
        // Prova con un suffixso _COPY
        $suggestedNumber = $baseNumber . '_COPY' . ($counter > 1 ? $counter : '');
        $counter++;
        
        if ($counter > 99) { // Evita loop infiniti
            $suggestedNumber = $baseNumber . '_' . time();
            break;
        }
    }

    // Ottieni utente corrente
    $currentUser = getCurrentUser();

    // Date per la nuova fattura
    $dataFattura = date('Y-m-d');
    $dataScadenza = date('Y-m-d', strtotime('+' . $original['giorni_pagamento'] . ' days'));

    // Inizio transazione
    $pdo->beginTransaction();

    try {
        // Crea la nuova fattura duplicata come bozza
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
                note_fiscali,
                created_by,
                created_at,
                updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'bozza', ?, ?, NOW(), NOW())
        ");

        $stmt->execute([
            $suggestedNumber,
            $original['client_id'],
            $original['client_name'],
            $original['client_address'],
            $original['client_piva'],
            $original['client_cf'],
            $original['oggetto'],
            $original['descrizione'],
            $original['quantita'],
            $original['prezzo_unitario'],
            $original['subtotale'],
            $original['iva_percentuale'],
            $original['iva_importo'],
            $original['totale'],
            $dataFattura,
            $dataScadenza,
            $original['giorni_pagamento'],
            $original['note_fiscali'],
            $currentUser['id']
        ]);

        $newFatturaId = $pdo->lastInsertId();

        // Commit transazione
        $pdo->commit();

        // Log dell'azione
        logUserAction('duplicate_fattura', 'success', 
            'Duplicata fattura: ' . $original['numero_fattura'] . ' -> ' . $suggestedNumber . ' per cliente: ' . $original['client_name'] . ' (Nuovo ID: ' . $newFatturaId . ')'
        );

        // Risposta success
        echo json_encode([
            'success' => true,
            'message' => 'Fattura duplicata con successo',
            'data' => [
                'id' => $newFatturaId,
                'numero_fattura' => $suggestedNumber,
                'client_name' => $original['client_name'],
                'totale' => number_format($original['totale'], 2, '.', ''),
                'status' => 'bozza',
                'original_numero' => $original['numero_fattura']
            ]
        ]);

    } catch (Exception $e) {
        // Rollback in caso di errore
        $pdo->rollBack();
        throw $e;
    }

} catch (PDOException $e) {
    error_log("Database error in duplicate_fattura.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Errore del database: ' . $e->getMessage()
    ]);
} catch (Exception $e) {
    error_log("General error in duplicate_fattura.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Errore interno del server'
    ]);
}
?>