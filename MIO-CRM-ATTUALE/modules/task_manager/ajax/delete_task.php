<?php
// File: /modules/task_manager/ajax/delete_task.php
// Versione SEMPLIFICATA senza errori SQL

require_once __DIR__ . '/../../../core/includes/auth_helper.php';

header('Content-Type: application/json; charset=utf-8');

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Metodo non permesso');
    }
    
    $currentUser = getCurrentUser();
    if (!$currentUser) {
        throw new Exception('Utente non autenticato');
    }
    
    if (!in_array($currentUser['role'], ['admin', 'super_admin'])) {
        throw new Exception('Solo gli admin possono eliminare i task');
    }
    
    $dsn = "mysql:host=127.0.0.1;dbname=u706045794_crm_mismo;charset=utf8mb4";
    $pdo = new PDO($dsn, 'u706045794_mismo_crm_new', 'BLQ$>:;*9+h', [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
    ]);
    
    $action = $_POST['action'] ?? '';
    if ($action !== 'delete') {
        throw new Exception('Azione non valida');
    }
    
    $taskId = (int)($_POST['task_id'] ?? 0);
    if ($taskId <= 0) {
        throw new Exception('ID task non valido');
    }
    
    // Ottieni dettagli task prima di eliminarlo
    $stmt = $pdo->prepare("SELECT title FROM tasks WHERE id = ?");
    $stmt->execute([$taskId]);
    $task = $stmt->fetch();
    
    if (!$task) {
        throw new Exception('Task non trovato');
    }
    
    // Inizia transazione
    $pdo->beginTransaction();
    
    try {
        // Elimina responsabili
        $stmt = $pdo->prepare("DELETE FROM task_responsables WHERE task_id = ?");
        $stmt->execute([$taskId]);
        
        // Elimina activity logs se esistono
        $stmt = $pdo->prepare("DELETE FROM task_activity_logs WHERE task_id = ?");
        $stmt->execute([$taskId]);
        
        // Elimina il task
        $stmt = $pdo->prepare("DELETE FROM tasks WHERE id = ?");
        $stmt->execute([$taskId]);
        
        if ($stmt->rowCount() === 0) {
            throw new Exception('Nessun task eliminato');
        }
        
        $pdo->commit();
        
        echo json_encode([
            'success' => true,
            'message' => "Task '{$task['title']}' eliminato con successo",
            'task_id' => $taskId,
            'task_title' => $task['title']
        ]);
        
    } catch (Exception $e) {
        $pdo->rollback();
        throw $e;
    }
    
} catch (Exception $e) {
    error_log("Error in delete_task.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>