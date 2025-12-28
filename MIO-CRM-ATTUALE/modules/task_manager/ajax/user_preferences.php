<?php
// File: /modules/task_manager/ajax/user_preferences.php
// Versione SEMPLIFICATA per preferenze utente

require_once __DIR__ . '/../../../core/includes/auth_helper.php';

header('Content-Type: application/json; charset=utf-8');

try {
    $currentUser = getCurrentUser();
    if (!$currentUser) {
        throw new Exception('Utente non autenticato');
    }
    
    $dsn = "mysql:host=127.0.0.1;dbname=u706045794_crm_mismo;charset=utf8mb4";
    $pdo = new PDO($dsn, 'u706045794_mismo_crm_new', 'BLQ$>:;*9+h', [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
    ]);
    
    // Crea tabella se non esiste
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS task_user_preferences (
            id INT PRIMARY KEY AUTO_INCREMENT,
            user_id INT NOT NULL,
            preferred_view ENUM('kanban','table') DEFAULT 'kanban',
            show_completed TINYINT(1) DEFAULT 1,
            items_per_page INT DEFAULT 25,
            default_priority ENUM('P1','P2','P3') DEFAULT 'P2',
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY unique_user (user_id)
        )
    ");
    
    $action = $_GET['action'] ?? $_POST['action'] ?? '';
    
    if ($action === 'get') {
        // Ottieni preferenze
        $stmt = $pdo->prepare("SELECT * FROM task_user_preferences WHERE user_id = ?");
        $stmt->execute([$currentUser['id']]);
        $prefs = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$prefs) {
            // Crea default
            $stmt = $pdo->prepare("
                INSERT INTO task_user_preferences (user_id, preferred_view, show_completed, items_per_page, default_priority)
                VALUES (?, 'kanban', 1, 25, 'P2')
            ");
            $stmt->execute([$currentUser['id']]);
            
            $prefs = [
                'preferred_view' => 'kanban',
                'show_completed' => 1,
                'items_per_page' => 25,
                'default_priority' => 'P2'
            ];
        }
        
        echo json_encode([
            'success' => true,
            'preferences' => $prefs
        ]);
        
    } elseif ($action === 'save_preference' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        // Salva preferenza
        $key = trim($_POST['key'] ?? '');
        $value = $_POST['value'] ?? '';
        
        $allowedKeys = ['preferred_view', 'show_completed', 'items_per_page', 'default_priority'];
        
        if (!in_array($key, $allowedKeys)) {
            throw new Exception('Chiave non valida');
        }
        
        // Validazione valori
        if ($key === 'preferred_view' && !in_array($value, ['kanban', 'table'])) {
            $value = 'kanban';
        } elseif ($key === 'show_completed') {
            $value = $value ? 1 : 0;
        } elseif ($key === 'items_per_page') {
            $value = max(10, min(100, (int)$value));
        } elseif ($key === 'default_priority' && !in_array($value, ['P1', 'P2', 'P3'])) {
            $value = 'P2';
        }
        
        // Upsert
        $stmt = $pdo->prepare("
            INSERT INTO task_user_preferences (user_id, {$key}) 
            VALUES (?, ?) 
            ON DUPLICATE KEY UPDATE {$key} = VALUES({$key}), updated_at = NOW()
        ");
        $stmt->execute([$currentUser['id'], $value]);
        
        echo json_encode([
            'success' => true,
            'message' => 'Preferenza salvata',
            'key' => $key,
            'value' => $value
        ]);
        
    } else {
        throw new Exception('Azione non valida');
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>