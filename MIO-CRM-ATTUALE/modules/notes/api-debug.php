<?php
// File di debug per API Notes
session_start();

// Abilita tutti gli errori per debug
ini_set('display_errors', 1);
error_reporting(E_ALL);

header('Content-Type: application/json');

// Log delle informazioni di debug
error_log("=== DEBUG API NOTES ===");
error_log("Method: " . $_SERVER['REQUEST_METHOD']);
error_log("Session user_id: " . ($_SESSION['user_id'] ?? 'NOT SET'));
error_log("POST data: " . file_get_contents('php://input'));

// Verifica autenticazione
if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode([
        'success' => false, 
        'message' => 'Non autorizzato',
        'debug' => [
            'session_id' => session_id(),
            'session_data' => $_SESSION
        ]
    ]);
    exit;
}

// Test connessione database
try {
    $dsn = "mysql:host=127.0.0.1;dbname=u706045794_crm_mismo;charset=utf8mb4";
    $db = new PDO($dsn, 'u706045794_mismo_crm_new', 'BLQ$>:;*9+h', [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
    
    // Test timezone
    try {
        $db->exec("SET time_zone = '+01:00'");
        error_log("Timezone impostato correttamente");
    } catch (Exception $e) {
        error_log("Errore timezone: " . $e->getMessage());
    }
    
} catch (Exception $e) {
    error_log("Errore connessione DB: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false, 
        'message' => 'Errore connessione database: ' . $e->getMessage()
    ]);
    exit;
}

$userId = $_SESSION['user_id'];
$method = $_SERVER['REQUEST_METHOD'];

// Test semplice per POST
if ($method === 'POST') {
    try {
        // Verifica se la tabella esiste
        $stmt = $db->prepare("SHOW TABLES LIKE 'notes'");
        $stmt->execute();
        $tableExists = $stmt->fetch() !== false;
        
        if (!$tableExists) {
            error_log("Tabella notes non esiste, la creo...");
            
            // Crea tabella semplificata
            $createSQL = "
                CREATE TABLE notes (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    user_id INT NOT NULL,
                    title VARCHAR(255) NOT NULL,
                    description TEXT,
                    is_pinned TINYINT(1) DEFAULT 0,
                    is_public TINYINT(1) DEFAULT 0,
                    color VARCHAR(7) DEFAULT '#FFE066',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    INDEX(user_id),
                    INDEX(is_pinned),
                    INDEX(is_public)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            ";
            
            $db->exec($createSQL);
            error_log("Tabella notes creata con successo");
        }
        
        // Test inserimento semplice
        $data = json_decode(file_get_contents('php://input'), true);
        
        if (!$data || empty($data['title'])) {
            echo json_encode([
                'success' => false, 
                'message' => 'Dati non validi',
                'debug' => [
                    'received_data' => $data,
                    'raw_input' => file_get_contents('php://input')
                ]
            ]);
            exit;
        }
        
        $stmt = $db->prepare("INSERT INTO notes (user_id, title, description, is_pinned, is_public, color) VALUES (?, ?, ?, ?, ?, ?)");
        $result = $stmt->execute([
            $userId,
            $data['title'],
            $data['description'] ?? '',
            $data['is_pinned'] ?? 0,
            $data['is_public'] ?? 0,
            $data['color'] ?? '#FFE066'
        ]);
        
        if ($result) {
            echo json_encode([
                'success' => true,
                'message' => 'Nota creata con successo (debug mode)',
                'note_id' => $db->lastInsertId()
            ]);
        } else {
            echo json_encode([
                'success' => false,
                'message' => 'Errore durante inserimento'
            ]);
        }
        
    } catch (Exception $e) {
        error_log("Errore POST: " . $e->getMessage());
        error_log("Stack trace: " . $e->getTraceAsString());
        
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Errore interno: ' . $e->getMessage(),
            'debug' => [
                'file' => $e->getFile(),
                'line' => $e->getLine()
            ]
        ]);
    }
} else {
    // Per altri metodi, restituisci solo info di debug
    echo json_encode([
        'success' => true,
        'message' => 'API debug attiva',
        'debug' => [
            'method' => $method,
            'user_id' => $userId,
            'session' => $_SESSION
        ]
    ]);
}
?>