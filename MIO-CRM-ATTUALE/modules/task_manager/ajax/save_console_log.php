<?php
// File: /modules/task_manager/ajax/save_console_log.php
// Salva log della console nel database

require_once __DIR__ . '/../../../core/includes/auth_helper.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-cache, must-revalidate');

// Disabilita output di errori per JSON pulito
ini_set('display_errors', 0);
error_reporting(0);

// Cattura output indesiderato
ob_start();

try {
    // Verifica metodo POST
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Metodo non permesso');
    }
    
    // Verifica autenticazione
    $currentUser = getCurrentUser();
    if (!$currentUser || !isset($currentUser['id'])) {
        throw new Exception('Utente non autenticato');
    }
    
    // Verifica che sia admin
    if (!in_array($currentUser['role'], ['admin', 'super_admin'])) {
        throw new Exception('Solo gli admin possono salvare log');
    }
    
    // Connessione database
    $dsn = "mysql:host=127.0.0.1;dbname=u706045794_crm_mismo;charset=utf8mb4";
    $pdo = new PDO($dsn, 'u706045794_mismo_crm_new', 'BLQ$>:;*9+h', [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
    
    // Ottieni dati POST
    $message = trim($_POST['message'] ?? '');
    $type = $_POST['type'] ?? 'info';
    
    // 👤 MIGLIORIE INFORMAZIONI UTENTE
    $userId = (int)$currentUser['id'];
    $userName = trim($currentUser['first_name'] . ' ' . $currentUser['last_name']);
    $userEmail = $currentUser['email'] ?? '';
    
    // Se userName è vuoto, usa email o fallback
    if (empty(trim($userName))) {
        $userName = $userEmail ?: $currentUser['username'] ?: 'Utente #' . $userId;
    }
    
    // Validazione
    if (empty($message)) {
        throw new Exception('Messaggio mancante');
    }
    
    if (!in_array($type, ['info', 'success', 'warning', 'error'])) {
        $type = 'info';
    }
    
    // Filtra messaggi non rilevanti (solo modifiche amministrative)
    $isRelevantLog = shouldLogMessage($message, $type);
    
    if (!$isRelevantLog) {
        // Non salvare, ma restituire successo per non bloccare l'UI
        ob_clean();
        echo json_encode([
            'success' => true,
            'message' => 'Log filtrato (non rilevante)',
            'saved' => false,
            'type' => 'filtered',
            'user' => [
                'id' => $userId,
                'name' => $userName,
                'email' => $userEmail
            ]
        ], JSON_UNESCAPED_UNICODE);
        return;
    }
    
    // Salva nel database - QUERY ORIGINALE + email utente
    $stmt = $pdo->prepare("
        INSERT INTO task_console_logs (user_id, user_name, message, type, created_at)
        VALUES (?, ?, ?, ?, NOW())
    ");
    $stmt->execute([$userId, $userName, $message, $type]);
    
    $logId = $pdo->lastInsertId();
    
    // Pulizia automatica: mantieni solo gli ultimi 500 log
    $stmt = $pdo->prepare("
        DELETE FROM task_console_logs 
        WHERE id NOT IN (
            SELECT id FROM (
                SELECT id FROM task_console_logs 
                ORDER BY created_at DESC 
                LIMIT 500
            ) AS temp
        )
    ");
    $stmt->execute();
    
    // Pulisci output buffer
    ob_clean();
    
    echo json_encode([
        'success' => true,
        'message' => 'Log salvato con successo',
        'log_id' => $logId,
        'saved' => true,
        'timestamp' => date('Y-m-d H:i:s'),
        'user' => [
            'id' => $userId,
            'name' => $userName,
            'email' => $userEmail
        ]
    ], JSON_UNESCAPED_UNICODE);
    
} catch (PDOException $e) {
    error_log("Database error in save_console_log: " . $e->getMessage());
    ob_clean();
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Errore del database: ' . $e->getMessage(),
        'type' => 'database_error'
    ], JSON_UNESCAPED_UNICODE);
    
} catch (Exception $e) {
    error_log("Application error in save_console_log: " . $e->getMessage());
    ob_clean();
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'type' => 'validation_error'
    ], JSON_UNESCAPED_UNICODE);
}

/**
 * Determina se un messaggio deve essere salvato nel log
 * SOLO modifiche amministrative ai task, non accessi o navigazione
 */
function shouldLogMessage($message, $type) {
    // Salva sempre errori e warning
    if (in_array($type, ['error', 'warning'])) {
        return true;
    }
    
    // Salva successi relativi a modifiche task
    if ($type === 'success') {
        $successPatterns = [
            '/✅ Task.*successo/',           // Task creato/modificato con successo
            '/✅ Status aggiornato/',        // Status cambiato
            '/🎉 Task completato/',          // Task completato
            '/✅ Task eliminato/',           // Task eliminato
            '/✅ Categoria.*/',              // Categoria gestita
            '/✅.*responsabil.*/',           // Responsabili aggiornati
        ];
        
        foreach ($successPatterns as $pattern) {
            if (preg_match($pattern, $message)) {
                return true;
            }
        }
    }
    
    // Salva info solo per modifiche specifiche ai task
    if ($type === 'info') {
        $infoPatterns = [
            '/📝 Modifica task:/',           // Modifica task
            '/📝 Creazione task:/',          // Creazione task
            '/🗑️ Eliminazione.*task/',      // Eliminazione task
            '/👥 Responsabili.*aggiornati/', // Cambio responsabili
            '/⚡ Priorità.*cambiata/',       // Cambio priorità
            '/📅 Deadline.*cambiata/',       // Cambio deadline
            '/⏰ Tempo.*aggiunto/',          // Aggiunta tempo
            '/🔄 Status.*cambiato/',         // Cambio status
            '/💾 Salvataggio task/',         // Salvataggio
            '/📂 Categoria.*/',              // Gestione categorie
        ];
        
        foreach ($infoPatterns as $pattern) {
            if (preg_match($pattern, $message)) {
                return true;
            }
        }
    }
    
    // Non salvare tutto il resto (accessi, navigazione, ecc.)
    return false;
}
?>