<?php
// File: /modules/task_manager/ajax/archive_task.php
// Handler per archiviazione task

require_once __DIR__ . '/../../../core/includes/auth_helper.php';

// Verifica autenticazione
$currentUser = getCurrentUser();
if (!$currentUser) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Non autenticato']);
    exit;
}

// Verifica CSRF token
if (!isset($_POST['csrf_token']) || $_POST['csrf_token'] !== $_SESSION['csrf_token']) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Token CSRF non valido']);
    exit;
}

// Verifica parametri
if (!isset($_POST['task_id']) || !is_numeric($_POST['task_id'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'ID task non valido']);
    exit;
}

$taskId = intval($_POST['task_id']);
$action = $_POST['action'] ?? 'archive';

try {
    // Connessione database
    $dsn = "mysql:host=127.0.0.1;dbname=u706045794_crm_mismo;charset=utf8mb4";
    $pdo = new PDO($dsn, 'u706045794_mismo_crm_new', 'BLQ$>:;*9+h', [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
    
    // Verifica che il task esista e l'utente abbia i permessi
    $stmt = $pdo->prepare("
        SELECT t.*, 
               u.first_name as creator_first_name,
               u.last_name as creator_last_name
        FROM tasks t
        LEFT JOIN users u ON t.created_by = u.id
        WHERE t.id = ?
    ");
    $stmt->execute([$taskId]);
    $task = $stmt->fetch();
    
    if (!$task) {
        throw new Exception('Task non trovato');
    }
    
    // Verifica permessi (solo admin o creatore del task)
    $isAdmin = in_array($currentUser['role'], ['admin', 'super_admin']);
    $isCreator = $task['created_by'] == $currentUser['id'];
    $isResponsible = false;
    
    // Verifica se è responsabile
    $stmt = $pdo->prepare("SELECT * FROM task_responsables WHERE task_id = ? AND user_id = ?");
    $stmt->execute([$taskId, $currentUser['id']]);
    if ($stmt->rowCount() > 0) {
        $isResponsible = true;
    }
    
    if (!$isAdmin && !$isCreator && !$isResponsible) {
        throw new Exception('Non hai i permessi per archiviare questo task');
    }
    
    // Procedi con l'archiviazione
    if ($action === 'archive') {
        // Aggiungi campo is_archived al task
        $stmt = $pdo->prepare("
            UPDATE tasks 
            SET is_archived = 1,
                archived_at = NOW(),
                archived_by = ?
            WHERE id = ?
        ");
        $stmt->execute([$currentUser['id'], $taskId]);
        
        // Log dell'operazione
        $stmt = $pdo->prepare("
            INSERT INTO task_logs (task_id, user_id, action, details, created_at)
            VALUES (?, ?, 'archived', ?, NOW())
        ");
        $logDetails = json_encode([
            'task_title' => $task['title'],
            'archived_by' => $currentUser['first_name'] . ' ' . $currentUser['last_name']
        ]);
        $stmt->execute([$taskId, $currentUser['id'], $logDetails]);
        
        // Log nella console
        $stmt = $pdo->prepare("
            INSERT INTO task_console_logs (user_id, message, type, created_at)
            VALUES (?, ?, 'success', NOW())
        ");
        $message = sprintf(
            '📦 Task archiviato: "%s" (ID: %d) da %s %s',
            $task['title'],
            $taskId,
            $currentUser['first_name'],
            $currentUser['last_name']
        );
        $stmt->execute([$currentUser['id'], $message]);
        
        echo json_encode([
            'success' => true,
            'message' => 'Task archiviato con successo',
            'task_id' => $taskId
        ]);
        
    } elseif ($action === 'unarchive') {
        // Ripristina task dall'archivio
        $stmt = $pdo->prepare("
            UPDATE tasks 
            SET is_archived = 0,
                archived_at = NULL,
                archived_by = NULL
            WHERE id = ?
        ");
        $stmt->execute([$taskId]);
        
        // Log dell'operazione
        $stmt = $pdo->prepare("
            INSERT INTO task_logs (task_id, user_id, action, details, created_at)
            VALUES (?, ?, 'unarchived', ?, NOW())
        ");
        $logDetails = json_encode([
            'task_title' => $task['title'],
            'unarchived_by' => $currentUser['first_name'] . ' ' . $currentUser['last_name']
        ]);
        $stmt->execute([$taskId, $currentUser['id'], $logDetails]);
        
        echo json_encode([
            'success' => true,
            'message' => 'Task ripristinato dall\'archivio',
            'task_id' => $taskId
        ]);
    }
    
} catch (Exception $e) {
    error_log('Errore archiviazione task: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>