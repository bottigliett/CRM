<?php
// File: /modules/fatture/ajax/delete_fattura.php
// AJAX per eliminare una fattura (solo se in stato bozza)

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

    $id = intval($input['id']);
    
    if ($id <= 0) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'ID fattura non valido']);
        exit;
    }

    // Verifica che la fattura esista e sia in stato bozza
    $stmt = $pdo->prepare("
        SELECT id, numero_fattura, client_name, status, pdf_path
        FROM fatture 
        WHERE id = ?
    ");
    $stmt->execute([$id]);
    $fattura = $stmt->fetch();
    
    if (!$fattura) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Fattura non trovata']);
        exit;
    }

    // Controlla che la fattura sia solo bozza - non si possono eliminare fatture emesse
    if ($fattura['status'] !== 'bozza') {
        http_response_code(400);
        echo json_encode([
            'success' => false, 
            'message' => 'Impossibile eliminare fatture emesse. Solo le bozze possono essere eliminate.'
        ]);
        exit;
    }

    // Inizio transazione
    $pdo->beginTransaction();

    try {
        // Elimina la fattura
        $stmt = $pdo->prepare("DELETE FROM fatture WHERE id = ?");
        $stmt->execute([$id]);

        // Elimina eventuale file PDF se esiste
        if ($fattura['pdf_path'] && file_exists($_SERVER['DOCUMENT_ROOT'] . $fattura['pdf_path'])) {
            unlink($_SERVER['DOCUMENT_ROOT'] . $fattura['pdf_path']);
        }

        // Commit transazione
        $pdo->commit();

        // Log dell'azione
        logUserAction('delete_fattura', 'success', 
            'Eliminata fattura bozza: ' . $fattura['numero_fattura'] . ' - Cliente: ' . $fattura['client_name'] . ' (ID: ' . $id . ')'
        );

        // Risposta success
        echo json_encode([
            'success' => true,
            'message' => 'Fattura eliminata con successo',
            'data' => [
                'id' => $id,
                'numero_fattura' => $fattura['numero_fattura']
            ]
        ]);

    } catch (Exception $e) {
        // Rollback in caso di errore
        $pdo->rollBack();
        throw $e;
    }

} catch (PDOException $e) {
    error_log("Database error in delete_fattura.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Errore del database'
    ]);
} catch (Exception $e) {
    error_log("General error in delete_fattura.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Errore interno del server'
    ]);
}
?>