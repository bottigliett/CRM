<?php
// File: /modules/task_manager/ajax/update_task.php
// VERSIONE MIGLIORATA CON NOTIFICHE ROBUSTE

require_once __DIR__ . '/../../../core/includes/auth_helper.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-cache, must-revalidate');

// Disabilita output di errori per JSON pulito
ini_set('display_errors', 0);
error_reporting(0);

// Cattura output indesiderato
ob_start();

try {
    // Log di debug
    error_log("=== UPDATE TASK START " . date('Y-m-d H:i:s') . " ===");
    
    // 1. Verifica metodo POST
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Metodo non permesso');
    }
    
    // 2. Log dati ricevuti
    error_log("POST data: " . json_encode($_POST));
    
    // 3. Includi autenticazione
    $currentUser = getCurrentUser();
    if (!$currentUser || !isset($currentUser['id'])) {
        throw new Exception('Utente non autenticato');
    }
    
    // 4. VERIFICA PERMESSI ADMIN - TUTTI GLI ADMIN POSSONO MODIFICARE
    if (!in_array($currentUser['role'], ['admin', 'super_admin'])) {
        throw new Exception('Solo gli admin possono modificare i task');
    }
    
    error_log("User authenticated: " . $currentUser['id'] . " (" . $currentUser['role'] . ")");
    
    // 5. Connessione database
    $dsn = "mysql:host=127.0.0.1;dbname=u706045794_crm_mismo;charset=utf8mb4";
    $pdo = new PDO($dsn, 'u706045794_mismo_crm_new', 'BLQ$>:;*9+h', [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
    
    error_log("Database connected");
    
    // 6. Gestisci azione
    $action = $_POST['action'] ?? '';
    $taskId = (int)($_POST['task_id'] ?? 0);
    
    if (!$taskId) {
        throw new Exception('ID task mancante');
    }
    
    switch ($action) {
        case 'update_status':
            updateTaskStatus($pdo, $taskId, $_POST['status'] ?? '', $currentUser);
            break;
            
        case 'update_priority':
            updateTaskPriority($pdo, $taskId, $_POST['priority'] ?? '', $currentUser);
            break;
            
        case 'toggle_complete':
            toggleTaskComplete($pdo, $taskId, $currentUser);
            break;
            
        case 'update_responsables':
            updateTaskResponsables($pdo, $taskId, $_POST['responsables'] ?? [], $currentUser);
            break;
            
        case 'update_deadline':
            updateTaskDeadline($pdo, $taskId, $_POST['deadline'] ?? '', $currentUser);
            break;
            
        case 'add_time':
            addTimeToTask($pdo, $taskId, (float)($_POST['hours'] ?? 0), $currentUser);
            break;
            
        default:
            throw new Exception('Azione non valida: ' . $action);
    }
    
} catch (PDOException $e) {
    error_log("Database error: " . $e->getMessage());
    ob_clean();
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Errore del database: ' . $e->getMessage(),
        'type' => 'database_error'
    ], JSON_UNESCAPED_UNICODE);
    
} catch (Exception $e) {
    error_log("Application error: " . $e->getMessage());
    ob_clean();
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'type' => 'validation_error'
    ], JSON_UNESCAPED_UNICODE);
}

// =====================================================
// FUNZIONI DI AGGIORNAMENTO - VERSIONI MIGLIORATE
// =====================================================

function updateTaskStatus($pdo, $taskId, $newStatus, $currentUser) {
    $validStatuses = ['todo', 'in_progress', 'pending', 'completed'];
    
    if (!in_array($newStatus, $validStatuses)) {
        throw new Exception('Status non valido: ' . $newStatus);
    }
    
    // Ottieni task corrente con dettagli
    $stmt = $pdo->prepare("SELECT * FROM tasks WHERE id = ?");
    $stmt->execute([$taskId]);
    $task = $stmt->fetch();
    
    if (!$task) {
        throw new Exception('Task non trovato');
    }
    
    $oldStatus = $task['status'];
    
    if ($oldStatus === $newStatus) {
        throw new Exception('Il task ha già questo status');
    }
    
    // Aggiorna status
    $completedAt = ($newStatus === 'completed') ? 'NOW()' : 'NULL';
    
    $stmt = $pdo->prepare("
        UPDATE tasks 
        SET status = ?, 
            completed_at = $completedAt,
            updated_at = NOW()
        WHERE id = ?
    ");
    $stmt->execute([$newStatus, $taskId]);
    
    // 🔔 NOTIFICHE MIGLIORATI
    $currentUserName = getUserDisplayName($currentUser);
    
    // Log attività
    logTaskActivity($pdo, $taskId, $currentUser['id'], 'status_changed', 
        "🔄 Status cambiato da '{$oldStatus}' a '{$newStatus}' da {$currentUserName}");
    
    // Crea notifiche per responsabili
    createStatusChangeNotifications($pdo, $task, $oldStatus, $newStatus, $currentUser);
    
    // Pulisci output buffer
    ob_clean();
    
    // Risposta di successo
    echo json_encode([
        'success' => true,
        'message' => getStatusChangeMessage($oldStatus, $newStatus),
        'old_status' => $oldStatus,
        'new_status' => $newStatus,
        'task_id' => $taskId,
        'completed_at' => $newStatus === 'completed' ? date('Y-m-d H:i:s') : null,
        'notifications_sent' => true
    ], JSON_UNESCAPED_UNICODE);
}

function updateTaskPriority($pdo, $taskId, $newPriority, $currentUser) {
    $validPriorities = ['P1', 'P2', 'P3'];
    
    if (!in_array($newPriority, $validPriorities)) {
        throw new Exception('Priorità non valida: ' . $newPriority);
    }
    
    // Ottieni task corrente
    $stmt = $pdo->prepare("SELECT * FROM tasks WHERE id = ?");
    $stmt->execute([$taskId]);
    $task = $stmt->fetch();
    
    if (!$task) {
        throw new Exception('Task non trovato');
    }
    
    $oldPriority = $task['priority'];
    
    if ($oldPriority === $newPriority) {
        throw new Exception('Il task ha già questa priorità');
    }
    
    // Aggiorna priorità
    $stmt = $pdo->prepare("
        UPDATE tasks 
        SET priority = ?, updated_at = NOW()
        WHERE id = ?
    ");
    $stmt->execute([$newPriority, $taskId]);
    
    // 🔔 LOG E NOTIFICHE
    $currentUserName = getUserDisplayName($currentUser);
    
    logTaskActivity($pdo, $taskId, $currentUser['id'], 'priority_changed',
        "⚡ Priorità cambiata da '{$oldPriority}' a '{$newPriority}' da {$currentUserName}");
    
    // Notifica responsabili se priorità aumentata (P3->P2->P1)
    if (shouldNotifyPriorityChange($oldPriority, $newPriority)) {
        $responsablesIds = getTaskResponsables($pdo, $taskId);
        
        foreach ($responsablesIds as $respId) {
            if ($respId != $currentUser['id']) {
                createTaskNotification($pdo, $respId, 
                    '⚡ Priorità task aumentata', 
                    "La priorità del task '{$task['title']}' è stata cambiata a {$newPriority} da {$currentUserName}",
                    $taskId
                );
            }
        }
    }
    
    ob_clean();
    
    echo json_encode([
        'success' => true,
        'message' => "⚡ Priorità aggiornata a {$newPriority}",
        'old_priority' => $oldPriority,
        'new_priority' => $newPriority,
        'task_id' => $taskId,
        'notifications_sent' => shouldNotifyPriorityChange($oldPriority, $newPriority)
    ], JSON_UNESCAPED_UNICODE);
}

function toggleTaskComplete($pdo, $taskId, $currentUser) {
    // Ottieni task corrente
    $stmt = $pdo->prepare("SELECT * FROM tasks WHERE id = ?");
    $stmt->execute([$taskId]);
    $task = $stmt->fetch();
    
    if (!$task) {
        throw new Exception('Task non trovato');
    }
    
    $newStatus = ($task['status'] === 'completed') ? 'todo' : 'completed';
    
    // Usa la funzione esistente
    updateTaskStatus($pdo, $taskId, $newStatus, $currentUser);
}

function updateTaskResponsables($pdo, $taskId, $newResponsables, $currentUser) {
    if (!is_array($newResponsables)) {
        $newResponsables = [$newResponsables];
    }
    
    $newResponsables = array_unique(array_filter(array_map('intval', $newResponsables)));
    
    if (empty($newResponsables)) {
        throw new Exception('Almeno un responsabile è obbligatorio');
    }
    
    // Verifica che i responsabili esistano
    $placeholders = str_repeat('?,', count($newResponsables) - 1) . '?';
    $stmt = $pdo->prepare("SELECT id, first_name, last_name FROM users WHERE id IN ($placeholders) AND is_active = 1");
    $stmt->execute($newResponsables);
    $validResponsables = $stmt->fetchAll();
    
    if (count($validResponsables) !== count($newResponsables)) {
        throw new Exception('Alcuni responsabili selezionati non sono validi');
    }
    
    // Ottieni task corrente
    $stmt = $pdo->prepare("SELECT * FROM tasks WHERE id = ?");
    $stmt->execute([$taskId]);
    $task = $stmt->fetch();
    
    if (!$task) {
        throw new Exception('Task non trovato');
    }
    
    // Ottieni responsabili attuali
    $stmt = $pdo->prepare("
        SELECT u.id, u.first_name, u.last_name 
        FROM task_responsables tr
        JOIN users u ON tr.user_id = u.id
        WHERE tr.task_id = ?
    ");
    $stmt->execute([$taskId]);
    $oldResponsables = $stmt->fetchAll();
    
    // Inizia transazione
    $pdo->beginTransaction();
    
    try {
        // Elimina responsabili esistenti
        $stmt = $pdo->prepare("DELETE FROM task_responsables WHERE task_id = ?");
        $stmt->execute([$taskId]);
        
        // Inserisci nuovi responsabili
        $stmt = $pdo->prepare("
            INSERT INTO task_responsables (task_id, user_id, role, created_at)
            VALUES (?, ?, 'responsable', NOW())
        ");
        
        foreach ($validResponsables as $responsable) {
            $stmt->execute([$taskId, $responsable['id']]);
        }
        
        // Aggiorna assigned_to con il primo responsabile per compatibilità
        $stmt = $pdo->prepare("
            UPDATE tasks 
            SET assigned_to = ?, updated_at = NOW()
            WHERE id = ?
        ");
        $stmt->execute([$validResponsables[0]['id'], $taskId]);
        
        $pdo->commit();
        
        // 🔔 LOG E NOTIFICHE MIGLIORATI
        $currentUserName = getUserDisplayName($currentUser);
        
        $oldNames = implode(', ', array_map(function($r) { return $r['first_name'] . ' ' . $r['last_name']; }, $oldResponsables));
        $newNames = implode(', ', array_map(function($r) { return $r['first_name'] . ' ' . $r['last_name']; }, $validResponsables));
        
        logTaskActivity($pdo, $taskId, $currentUser['id'], 'responsables_changed',
            "👥 Responsabili aggiornati da {$currentUserName}: '{$oldNames}' → '{$newNames}'");
        
        // Notifiche intelligenti
        $oldIds = array_column($oldResponsables, 'id');
        $newIds = array_column($validResponsables, 'id');
        
        // Notifica nuovi responsabili
        foreach ($validResponsables as $responsable) {
            if (!in_array($responsable['id'], $oldIds) && $responsable['id'] != $currentUser['id']) {
                createTaskNotification($pdo, $responsable['id'], 
                    '👥 Aggiunto come responsabile', 
                    "Ti è stato assegnato il task '{$task['title']}' da {$currentUserName}",
                    $taskId
                );
            }
        }
        
        // Notifica responsabili rimossi
        foreach ($oldResponsables as $responsable) {
            if (!in_array($responsable['id'], $newIds) && $responsable['id'] != $currentUser['id']) {
                createTaskNotification($pdo, $responsable['id'], 
                    '👥 Rimosso come responsabile', 
                    "Non sei più responsabile del task '{$task['title']}'",
                    $taskId
                );
            }
        }
        
        ob_clean();
        
        echo json_encode([
            'success' => true,
            'message' => "👥 Responsabili aggiornati (" . count($validResponsables) . " totali)",
            'old_responsables' => $oldResponsables,
            'new_responsables' => $validResponsables,
            'responsables_count' => count($validResponsables),
            'task_id' => $taskId,
            'notifications_sent' => true
        ], JSON_UNESCAPED_UNICODE);
        
    } catch (Exception $e) {
        $pdo->rollback();
        throw $e;
    }
}

function updateTaskDeadline($pdo, $taskId, $newDeadline, $currentUser) {
    if (empty($newDeadline)) {
        throw new Exception('Data deadline mancante');
    }
    
    // Valida formato data
    $date = DateTime::createFromFormat('Y-m-d', $newDeadline);
    if (!$date || $date->format('Y-m-d') !== $newDeadline) {
        throw new Exception('Formato data non valido');
    }
    
    // Ottieni task corrente
    $stmt = $pdo->prepare("SELECT * FROM tasks WHERE id = ?");
    $stmt->execute([$taskId]);
    $task = $stmt->fetch();
    
    if (!$task) {
        throw new Exception('Task non trovato');
    }
    
    $oldDeadline = $task['deadline'];
    
    if ($oldDeadline === $newDeadline) {
        throw new Exception('Il task ha già questa scadenza');
    }
    
    // Aggiorna deadline
    $stmt = $pdo->prepare("
        UPDATE tasks 
        SET deadline = ?, updated_at = NOW()
        WHERE id = ?
    ");
    $stmt->execute([$newDeadline, $taskId]);
    
    // 🔔 LOG E NOTIFICHE
    $currentUserName = getUserDisplayName($currentUser);
    
    logTaskActivity($pdo, $taskId, $currentUser['id'], 'deadline_changed',
        "📅 Deadline cambiata da '" . date('d/m/Y', strtotime($oldDeadline)) . "' a '" . date('d/m/Y', strtotime($newDeadline)) . "' da {$currentUserName}");
    
    // Notifica responsabili se scadenza anticipata o importante
    $daysDifference = (strtotime($newDeadline) - strtotime($oldDeadline)) / (60 * 60 * 24);
    
    if ($daysDifference < 0) { // Scadenza anticipata
        $responsablesIds = getTaskResponsables($pdo, $taskId);
        
        foreach ($responsablesIds as $respId) {
            if ($respId != $currentUser['id']) {
                createTaskNotification($pdo, $respId, 
                    '📅 Scadenza task anticipata', 
                    "La scadenza del task '{$task['title']}' è stata anticipata al " . date('d/m/Y', strtotime($newDeadline)) . " da {$currentUserName}",
                    $taskId
                );
            }
        }
    }
    
    ob_clean();
    
    echo json_encode([
        'success' => true,
        'message' => "📅 Scadenza aggiornata al " . date('d/m/Y', strtotime($newDeadline)),
        'old_deadline' => $oldDeadline,
        'new_deadline' => $newDeadline,
        'new_deadline_formatted' => date('d/m/Y', strtotime($newDeadline)),
        'task_id' => $taskId,
        'notifications_sent' => $daysDifference < 0
    ], JSON_UNESCAPED_UNICODE);
}

function addTimeToTask($pdo, $taskId, $hours, $currentUser) {
    if ($hours <= 0) {
        throw new Exception('Ore non valide');
    }
    
    if ($hours > 24) {
        throw new Exception('Non puoi aggiungere più di 24 ore alla volta');
    }
    
    // Ottieni task corrente
    $stmt = $pdo->prepare("SELECT * FROM tasks WHERE id = ?");
    $stmt->execute([$taskId]);
    $task = $stmt->fetch();
    
    if (!$task) {
        throw new Exception('Task non trovato');
    }
    
    $oldHours = $task['actual_hours'];
    $newHours = $oldHours + $hours;
    
    // Aggiorna ore
    $stmt = $pdo->prepare("
        UPDATE tasks 
        SET actual_hours = ?, updated_at = NOW()
        WHERE id = ?
    ");
    $stmt->execute([$newHours, $taskId]);
    
    // 🔔 LOG E NOTIFICHE
    $currentUserName = getUserDisplayName($currentUser);
    
    logTaskActivity($pdo, $taskId, $currentUser['id'], 'time_added',
        "⏰ Tempo aggiunto: {$hours}h da {$currentUserName} (totale: {$newHours}h)");
    
    // Notifica creatore se ore > stimate
    if ($task['estimated_hours'] > 0 && $newHours > $task['estimated_hours'] && $task['created_by'] != $currentUser['id']) {
        createTaskNotification($pdo, $task['created_by'], 
            '⏰ Task oltre la stima', 
            "Il task '{$task['title']}' ha superato la stima di {$task['estimated_hours']}h (attuale: {$newHours}h)",
            $taskId
        );
    }
    
    ob_clean();
    
    echo json_encode([
        'success' => true,
        'message' => "⏰ Aggiunte {$hours}h al task",
        'hours_added' => $hours,
        'old_hours' => $oldHours,
        'new_hours' => $newHours,
        'estimated_hours' => $task['estimated_hours'],
        'over_estimate' => $task['estimated_hours'] > 0 && $newHours > $task['estimated_hours'],
        'task_id' => $taskId,
        'notifications_sent' => $task['estimated_hours'] > 0 && $newHours > $task['estimated_hours']
    ], JSON_UNESCAPED_UNICODE);
}

// =====================================================
// FUNZIONI HELPER MIGLIORATE
// =====================================================

function createTaskNotification($pdo, $userId, $title, $message, $taskId) {
    try {
        // Verifica se tabella notifiche esiste
        $stmt = $pdo->query("SHOW TABLES LIKE 'notifications'");
        if ($stmt->rowCount() === 0) {
            error_log("⚠️ Tabella notifications non trovata");
            return false;
        }
        
        // QUERY IDENTICA ALL'AGENDA FUNZIONANTE - SENZA is_read nella INSERT
        $stmt = $pdo->prepare("
            INSERT INTO notifications (user_id, title, message, type, related_type, related_id, created_at)
            VALUES (?, ?, ?, 'task', 'task', ?, NOW())
        ");
        $result = $stmt->execute([$userId, $title, $message, $taskId]);
        
        if ($result) {
            error_log("✅ Notifica creata per utente {$userId}: {$title}");
            return true;
        } else {
            error_log("❌ Fallito inserimento notifica per utente {$userId}");
            return false;
        }
        
    } catch (Exception $e) {
        error_log("❌ Errore creazione notifica: " . $e->getMessage());
        return false;
    }
}

function logTaskActivity($pdo, $taskId, $userId, $action, $message) {
    try {
        // Log console task manager
        $stmt = $pdo->query("SHOW TABLES LIKE 'task_console_logs'");
        if ($stmt->rowCount() > 0) {
            // Ottieni nome utente
            $stmt = $pdo->prepare("SELECT first_name, last_name FROM users WHERE id = ?");
            $stmt->execute([$userId]);
            $user = $stmt->fetch();
            $userName = $user ? trim($user['first_name'] . ' ' . $user['last_name']) : 'Utente';
            
            $stmt = $pdo->prepare("
                INSERT INTO task_console_logs (user_id, user_name, message, type, created_at)
                VALUES (?, ?, ?, 'info', NOW())
            ");
            $stmt->execute([$userId, $userName, $message]);
        }
        
        error_log("📋 Task activity logged: {$message}");
        
    } catch (Exception $e) {
        error_log("Warning: Could not log task activity: " . $e->getMessage());
    }
}

function createStatusChangeNotifications($pdo, $task, $oldStatus, $newStatus, $currentUser) {
    $statusLabels = [
        'todo' => 'Da fare',
        'in_progress' => 'In corso',
        'pending' => 'In attesa',
        'completed' => 'Completato'
    ];
    
    $statusIcons = [
        'todo' => '⚠️',
        'in_progress' => '⏳',
        'pending' => '😐',
        'completed' => '✅'
    ];
    
    $currentUserName = getUserDisplayName($currentUser);
    
    // Ottieni responsabili
    $responsablesIds = getTaskResponsables($pdo, $task['id']);
    
    // Notifica tutti i responsabili del cambio status
    $title = '🔄 Status task cambiato';
    $message = "Il task '{$task['title']}' è passato da '{$statusIcons[$oldStatus]} {$statusLabels[$oldStatus]}' a '{$statusIcons[$newStatus]} {$statusLabels[$newStatus]}' da {$currentUserName}";
    
    foreach ($responsablesIds as $respId) {
        if ($respId != $currentUser['id']) {
            createTaskNotification($pdo, $respId, $title, $message, $task['id']);
        }
    }
    
    // Notifica speciale se task completato
    if ($newStatus === 'completed' && $task['created_by'] != $currentUser['id']) {
        createTaskNotification($pdo, $task['created_by'], 
            '🎉 Task completato!', 
            "Il task '{$task['title']}' è stato completato da {$currentUserName}",
            $task['id']
        );
    }
}

function getUserDisplayName($user) {
    $name = trim($user['first_name'] . ' ' . $user['last_name']);
    return !empty($name) ? $name : ($user['email'] ?? 'Utente');
}

function getTaskResponsables($pdo, $taskId) {
    try {
        $stmt = $pdo->prepare("
            SELECT DISTINCT u.id 
            FROM task_responsables tr
            JOIN users u ON tr.user_id = u.id
            WHERE tr.task_id = ? AND u.is_active = 1
        ");
        $stmt->execute([$taskId]);
        return $stmt->fetchAll(PDO::FETCH_COLUMN);
    } catch (Exception $e) {
        return [];
    }
}

function getStatusChangeMessage($oldStatus, $newStatus) {
    $messages = [
        'todo' => [
            'in_progress' => '🚀 Task avviato!',
            'pending' => '😐 Task messo in attesa',
            'completed' => '🎉 Task completato!'
        ],
        'in_progress' => [
            'todo' => '⚠️ Task rimesso in coda',
            'pending' => '😐 Task messo in attesa',
            'completed' => '🎉 Task completato!'
        ],
        'pending' => [
            'todo' => '⚠️ Task rimesso in coda',
            'in_progress' => '🚀 Task ripreso!',
            'completed' => '🎉 Task completato!'
        ],
        'completed' => [
            'todo' => '⚠️ Task riaperto',
            'in_progress' => '⏳ Task riaperto e in lavorazione',
            'pending' => '😐 Task riaperto in attesa'
        ]
    ];
    
    return $messages[$oldStatus][$newStatus] ?? '✅ Status aggiornato con successo';
}

function shouldNotifyPriorityChange($oldPriority, $newPriority) {
    $priorityLevels = ['P3' => 1, 'P2' => 2, 'P1' => 3];
    return $priorityLevels[$newPriority] > $priorityLevels[$oldPriority];
}

error_log("=== UPDATE TASK END ===");
?>