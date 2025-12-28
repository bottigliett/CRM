<?php
// File: /modules/task_manager/functions/completed_tasks.php
// Funzioni helper per gestire i task completati con filtri

/**
 * Ottiene i task completati con filtri applicati
 */
function getFilteredCompletedTasks($pdo, $filters = []) {
    $clientId = $filters['client_id'] ?? null;
    $categoryId = $filters['category_id'] ?? null;
    $period = $filters['period'] ?? null;
    
    // Usa la stored procedure se disponibile
    try {
        $stmt = $pdo->prepare("CALL GetFilteredCompletedTasks(:client_id, :category_id, :period)");
        $stmt->execute([
            ':client_id' => $clientId,
            ':category_id' => $categoryId,
            ':period' => $period
        ]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    } catch (Exception $e) {
        // Fallback se la stored procedure non esiste
        return getFilteredCompletedTasksFallback($pdo, $filters);
    }
}

/**
 * Fallback per ottenere task completati senza stored procedure
 */
function getFilteredCompletedTasksFallback($pdo, $filters = []) {
    $sql = "
        SELECT 
            t.*,
            tc.name as category_name,
            tc.color as category_color,
            tc.icon as category_icon,
            lc.name as client_name,
            lc.email as client_email,
            lc.phone as client_phone,
            lc.contact_type as client_type,
            u_assigned.first_name as assigned_first_name,
            u_assigned.last_name as assigned_last_name,
            GROUP_CONCAT(
                CONCAT(u_resp.first_name, ' ', u_resp.last_name) 
                SEPARATOR ', '
            ) as responsables_names,
            TIMESTAMPDIFF(DAY, t.created_at, COALESCE(t.completed_at, t.updated_at)) as completion_days
        FROM tasks t
        LEFT JOIN task_categories tc ON t.category_id = tc.id
        LEFT JOIN leads_contacts lc ON t.client_id = lc.id
        LEFT JOIN users u_assigned ON t.assigned_to = u_assigned.id
        LEFT JOIN task_responsables tr ON t.id = tr.task_id
        LEFT JOIN users u_resp ON tr.user_id = u_resp.id
        WHERE t.status = 'completed'
    ";
    
    $params = [];
    
    // Aggiungi filtro archiviazione se il campo esiste
    $checkArchived = $pdo->query("SHOW COLUMNS FROM tasks LIKE 'is_archived'");
    if ($checkArchived->rowCount() > 0) {
        $sql .= " AND (t.is_archived = 0 OR t.is_archived IS NULL)";
    }
    
    // Filtro cliente
    if (!empty($filters['client_id'])) {
        $sql .= " AND t.client_id = :client_id";
        $params[':client_id'] = $filters['client_id'];
    }
    
    // Filtro categoria
    if (!empty($filters['category_id'])) {
        $sql .= " AND t.category_id = :category_id";
        $params[':category_id'] = $filters['category_id'];
    }
    
    // Filtro periodo
    if (!empty($filters['period'])) {
        $dateCondition = getPeriodDateCondition($filters['period']);
        if ($dateCondition) {
            $sql .= " AND " . $dateCondition;
        }
    }
    
    $sql .= " GROUP BY t.id ORDER BY COALESCE(t.completed_at, t.updated_at) DESC";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

/**
 * Genera la condizione SQL per il filtro periodo
 */
function getPeriodDateCondition($period) {
    $dateField = "DATE(COALESCE(t.completed_at, t.updated_at))";
    
    switch($period) {
        case 'today':
            return "$dateField = CURDATE()";
            
        case 'week':
            return "$dateField >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY) 
                    AND $dateField <= DATE_ADD(DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY), INTERVAL 6 DAY)";
            
        case 'month':
            return "MONTH($dateField) = MONTH(CURDATE()) AND YEAR($dateField) = YEAR(CURDATE())";
            
        case 'quarter':
            return "QUARTER($dateField) = QUARTER(CURDATE()) AND YEAR($dateField) = YEAR(CURDATE())";
            
        case 'year':
            return "YEAR($dateField) = YEAR(CURDATE())";
            
        default:
            return null;
    }
}

/**
 * Ottiene la lista dei clienti che hanno task completati
 */
function getClientsWithCompletedTasks($pdo) {
    $sql = "
        SELECT DISTINCT 
            lc.id,
            lc.name,
            lc.contact_type,
            COUNT(DISTINCT t.id) as completed_tasks_count
        FROM tasks t
        INNER JOIN leads_contacts lc ON t.client_id = lc.id
        WHERE t.status = 'completed'
    ";
    
    // Controlla se esiste il campo is_archived
    $checkArchived = $pdo->query("SHOW COLUMNS FROM tasks LIKE 'is_archived'");
    if ($checkArchived->rowCount() > 0) {
        $sql .= " AND (t.is_archived = 0 OR t.is_archived IS NULL)";
    }
    
    $sql .= " GROUP BY lc.id, lc.name, lc.contact_type ORDER BY lc.name";
    
    $stmt = $pdo->query($sql);
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

/**
 * Ottiene la lista delle categorie che hanno task completati
 */
function getCategoriesWithCompletedTasks($pdo) {
    $sql = "
        SELECT DISTINCT 
            tc.id,
            tc.name,
            tc.icon,
            tc.color,
            COUNT(DISTINCT t.id) as completed_tasks_count
        FROM tasks t
        INNER JOIN task_categories tc ON t.category_id = tc.id
        WHERE t.status = 'completed'
    ";
    
    // Controlla se esiste il campo is_archived
    $checkArchived = $pdo->query("SHOW COLUMNS FROM tasks LIKE 'is_archived'");
    if ($checkArchived->rowCount() > 0) {
        $sql .= " AND (t.is_archived = 0 OR t.is_archived IS NULL)";
    }
    
    $sql .= " GROUP BY tc.id, tc.name, tc.icon, tc.color ORDER BY tc.name";
    
    $stmt = $pdo->query($sql);
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

/**
 * Ottiene statistiche sui task completati
 */
function getCompletedTasksStats($pdo, $userId = null) {
    $stats = [
        'total_completed' => 0,
        'completed_today' => 0,
        'completed_this_week' => 0,
        'completed_this_month' => 0,
        'avg_completion_days' => 0,
        'by_category' => [],
        'by_client' => []
    ];
    
    try {
        // Task completati totali
        $sql = "SELECT COUNT(*) as count FROM tasks WHERE status = 'completed'";
        $checkArchived = $pdo->query("SHOW COLUMNS FROM tasks LIKE 'is_archived'");
        if ($checkArchived->rowCount() > 0) {
            $sql .= " AND (is_archived = 0 OR is_archived IS NULL)";
        }
        $stmt = $pdo->query($sql);
        $stats['total_completed'] = (int)$stmt->fetch()['count'];
        
        // Task completati oggi
        $sql = "SELECT COUNT(*) as count FROM tasks 
                WHERE status = 'completed' 
                AND DATE(COALESCE(completed_at, updated_at)) = CURDATE()";
        if ($checkArchived->rowCount() > 0) {
            $sql .= " AND (is_archived = 0 OR is_archived IS NULL)";
        }
        $stmt = $pdo->query($sql);
        $stats['completed_today'] = (int)$stmt->fetch()['count'];
        
        // Task completati questa settimana
        $sql = "SELECT COUNT(*) as count FROM tasks 
                WHERE status = 'completed' 
                AND DATE(COALESCE(completed_at, updated_at)) >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)";
        if ($checkArchived->rowCount() > 0) {
            $sql .= " AND (is_archived = 0 OR is_archived IS NULL)";
        }
        $stmt = $pdo->query($sql);
        $stats['completed_this_week'] = (int)$stmt->fetch()['count'];
        
        // Task completati questo mese
        $sql = "SELECT COUNT(*) as count FROM tasks 
                WHERE status = 'completed' 
                AND MONTH(COALESCE(completed_at, updated_at)) = MONTH(CURDATE())
                AND YEAR(COALESCE(completed_at, updated_at)) = YEAR(CURDATE())";
        if ($checkArchived->rowCount() > 0) {
            $sql .= " AND (is_archived = 0 OR is_archived IS NULL)";
        }
        $stmt = $pdo->query($sql);
        $stats['completed_this_month'] = (int)$stmt->fetch()['count'];
        
        // Media giorni per completamento
        $sql = "SELECT AVG(TIMESTAMPDIFF(DAY, created_at, COALESCE(completed_at, updated_at))) as avg_days 
                FROM tasks WHERE status = 'completed'";
        if ($checkArchived->rowCount() > 0) {
            $sql .= " AND (is_archived = 0 OR is_archived IS NULL)";
        }
        $stmt = $pdo->query($sql);
        $stats['avg_completion_days'] = round((float)$stmt->fetch()['avg_days'], 1);
        
        // Statistiche per categoria
        $sql = "SELECT 
                    tc.name, 
                    tc.icon,
                    tc.color,
                    COUNT(t.id) as count 
                FROM tasks t
                JOIN task_categories tc ON t.category_id = tc.id
                WHERE t.status = 'completed'";
        if ($checkArchived->rowCount() > 0) {
            $sql .= " AND (t.is_archived = 0 OR t.is_archived IS NULL)";
        }
        $sql .= " GROUP BY tc.id ORDER BY count DESC LIMIT 5";
        $stmt = $pdo->query($sql);
        $stats['by_category'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Statistiche per cliente (top 5)
        $sql = "SELECT 
                    lc.name as client_name,
                    COUNT(t.id) as count 
                FROM tasks t
                JOIN leads_contacts lc ON t.client_id = lc.id
                WHERE t.status = 'completed'";
        if ($checkArchived->rowCount() > 0) {
            $sql .= " AND (t.is_archived = 0 OR t.is_archived IS NULL)";
        }
        $sql .= " GROUP BY lc.id ORDER BY count DESC LIMIT 5";
        $stmt = $pdo->query($sql);
        $stats['by_client'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
    } catch (Exception $e) {
        error_log("Errore calcolo statistiche task completati: " . $e->getMessage());
    }
    
    return $stats;
}

/**
 * Archivia un task completato
 */
function archiveCompletedTask($pdo, $taskId, $userId) {
    try {
        // Verifica se la colonna is_archived esiste
        $checkColumn = $pdo->query("SHOW COLUMNS FROM tasks LIKE 'is_archived'");
        if ($checkColumn->rowCount() === 0) {
            throw new Exception("Funzionalità archiviazione non disponibile");
        }
        
        $stmt = $pdo->prepare("
            UPDATE tasks 
            SET is_archived = 1,
                archived_at = NOW(),
                archived_by = :user_id
            WHERE id = :task_id 
                AND status = 'completed'
        ");
        
        $result = $stmt->execute([
            ':user_id' => $userId,
            ':task_id' => $taskId
        ]);
        
        if ($result && $stmt->rowCount() > 0) {
            // Log l'azione se la tabella task_logs esiste
            try {
                $stmt = $pdo->prepare("
                    INSERT INTO task_logs (task_id, user_id, action, details, created_at)
                    VALUES (:task_id, :user_id, 'archived', 'Task archiviato', NOW())
                ");
                $stmt->execute([
                    ':task_id' => $taskId,
                    ':user_id' => $userId
                ]);
            } catch (Exception $e) {
                // La tabella task_logs potrebbe non esistere, continua comunque
            }
            
            return true;
        }
        
        return false;
        
    } catch (Exception $e) {
        error_log("Errore archiviazione task: " . $e->getMessage());
        throw $e;
    }
}

/**
 * Riapre un task completato
 */
function reopenCompletedTask($pdo, $taskId, $userId) {
    try {
        $stmt = $pdo->prepare("
            UPDATE tasks 
            SET status = 'todo',
                completed_at = NULL
            WHERE id = :task_id 
                AND status = 'completed'
        ");
        
        $result = $stmt->execute([':task_id' => $taskId]);
        
        if ($result && $stmt->rowCount() > 0) {
            // Log l'azione nella tabella activity_logs esistente
            $stmt = $pdo->prepare("
                INSERT INTO task_activity_logs (task_id, user_id, action, old_value, new_value, created_at)
                VALUES (:task_id, :user_id, 'status_changed', 'completed', 'todo', NOW())
            ");
            $stmt->execute([
                ':task_id' => $taskId,
                ':user_id' => $userId
            ]);
            
            return true;
        }
        
        return false;
        
    } catch (Exception $e) {
        error_log("Errore riapertura task: " . $e->getMessage());
        throw $e;
    }
}

// Esempio di utilizzo nel file index.php:
/*
// Ottieni filtri dalla richiesta
$filters = [
    'client_id' => $_GET['client_id'] ?? null,
    'category_id' => $_GET['category_id'] ?? null,
    'period' => $_GET['period'] ?? null
];

// Ottieni task completati filtrati
$completedTasks = getFilteredCompletedTasks($pdo, $filters);

// Ottieni liste per i dropdown
$completedClients = getClientsWithCompletedTasks($pdo);
$completedCategories = getCategoriesWithCompletedTasks($pdo);

// Ottieni statistiche
$completedStats = getCompletedTasksStats($pdo, $currentUser['id']);
*/
?>