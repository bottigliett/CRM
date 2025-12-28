<?php
// File: /modules/task_manager/ajax/get_tasks.php
// Versione SEMPLIFICATA e FUNZIONANTE

require_once __DIR__ . '/../../../core/includes/auth_helper.php';

header('Content-Type: application/json; charset=utf-8');

try {
    // Verifica autenticazione
    $currentUser = getCurrentUser();
    if (!$currentUser) {
        throw new Exception('Utente non autenticato');
    }
    
    // Connessione database
    $dsn = "mysql:host=127.0.0.1;dbname=u706045794_crm_mismo;charset=utf8mb4";
    $pdo = new PDO($dsn, 'u706045794_mismo_crm_new', 'BLQ$>:;*9+h', [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
    
    // Query con leads_contacts invece di clients
    $sql = "
        SELECT
            t.*,
            tc.name as category_name,
            tc.color as category_color,
            tc.icon as category_icon,
            lc.name as client_name,
            lc.contact_type as client_type,
            u_assigned.first_name as assigned_first_name,
            u_assigned.last_name as assigned_last_name,
            u_created.first_name as created_first_name,
            u_created.last_name as created_last_name,
            GROUP_CONCAT(CONCAT(u_resp.first_name, ' ', u_resp.last_name) SEPARATOR ', ') as responsables_names,
            GROUP_CONCAT(u_resp.id SEPARATOR ',') as responsables_ids,
            COUNT(DISTINCT tr.user_id) as responsables_count,
            CASE
                WHEN t.status = 'completed' THEN 1
                WHEN t.deadline < CURDATE() AND t.status != 'completed' THEN -1
                ELSE 0
            END as deadline_status,
            DATEDIFF(t.deadline, CURDATE()) as days_until_deadline
        FROM tasks t
        LEFT JOIN task_categories tc ON t.category_id = tc.id
        LEFT JOIN leads_contacts lc ON t.client_id = lc.id
        LEFT JOIN users u_assigned ON t.assigned_to = u_assigned.id
        LEFT JOIN users u_created ON t.created_by = u_created.id
        LEFT JOIN task_responsables tr ON t.id = tr.task_id
        LEFT JOIN users u_resp ON tr.user_id = u_resp.id
        GROUP BY t.id
        ORDER BY t.priority, t.deadline ASC
    ";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute();
    $tasks = $stmt->fetchAll();
    
    // Post-processing sicuro
    foreach ($tasks as &$task) {
        $task['id'] = (int)$task['id'];
        $task['category_id'] = (int)$task['category_id'];
        $task['assigned_to'] = (int)$task['assigned_to'];
        $task['created_by'] = (int)$task['created_by'];
        $task['client_id'] = $task['client_id'] ? (int)$task['client_id'] : null;
        $task['estimated_hours'] = (float)$task['estimated_hours'];
        $task['actual_hours'] = (float)$task['actual_hours'];
        $task['responsables_count'] = (int)$task['responsables_count'];
        $task['deadline_status'] = (int)$task['deadline_status'];
        $task['days_until_deadline'] = (int)$task['days_until_deadline'];
        
        // Fix responsables_ids
        if (empty($task['responsables_ids'])) {
            $task['responsables_ids'] = (string)$task['assigned_to'];
        }
    }
    
    // Statistiche semplici
    $stats = [
        'total' => count($tasks),
        'todo' => 0,
        'in_progress' => 0,
        'pending' => 0,
        'completed' => 0,
        'overdue' => 0
    ];
    
    foreach ($tasks as $task) {
        $stats[$task['status']]++;
        if ($task['deadline_status'] === -1) {
            $stats['overdue']++;
        }
    }
    
    echo json_encode([
        'success' => true,
        'tasks' => $tasks,
        'total' => count($tasks),
        'stats' => $stats,
        'timestamp' => date('Y-m-d H:i:s')
    ]);
    
} catch (Exception $e) {
    error_log("Error in get_tasks.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>