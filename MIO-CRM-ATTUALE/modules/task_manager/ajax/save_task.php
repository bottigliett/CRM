<?php
// File: /modules/task_manager/ajax/save_task.php
// VERSIONE CORRETTA - Segue il pattern dell'agenda che FUNZIONA

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
        throw new Exception('Solo gli admin possono salvare task');
    }
    
    $dsn = "mysql:host=127.0.0.1;dbname=u706045794_crm_mismo;charset=utf8mb4";
    $pdo = new PDO($dsn, 'u706045794_mismo_crm_new', 'BLQ$>:;*9+h', [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
    ]);
    
    // Validazione input base
    $taskId = !empty($_POST['task_id']) ? (int)$_POST['task_id'] : null;
    $title = trim($_POST['title'] ?? '');
    $description = trim($_POST['description'] ?? '');
    $clientId = !empty($_POST['client_id']) ? (int)$_POST['client_id'] : null;
    $categoryId = (int)($_POST['category_id'] ?? 0);
    $priority = $_POST['priority'] ?? 'P2';
    $status = $_POST['status'] ?? 'todo';
    $deadline = $_POST['deadline'] ?? '';
    $estimatedHours = !empty($_POST['estimated_hours']) ? (float)$_POST['estimated_hours'] : 0;
    $responsables = $_POST['responsables'] ?? [];
    
    // Validazione
    if (empty($title)) {
        throw new Exception('Titolo obbligatorio');
    }
    if ($categoryId <= 0) {
        throw new Exception('Categoria obbligatoria');
    }
    if (empty($deadline)) {
        throw new Exception('Deadline obbligatoria');
    }
    if (!is_array($responsables) || empty($responsables)) {
        throw new Exception('Responsabile obbligatorio');
    }
    
    // Pulisci array responsabili
    $responsables = array_unique(array_filter(array_map('intval', $responsables)));
    if (empty($responsables)) {
        throw new Exception('Nessun responsabile valido');
    }
    
    // Valida valori
    if (!in_array($priority, ['P1', 'P2', 'P3'])) $priority = 'P2';
    if (!in_array($status, ['todo', 'in_progress', 'pending', 'completed'])) $status = 'todo';
    
    $isEdit = ($taskId !== null);
    
    // 👥 PER NOTIFICHE: Ottieni responsabili precedenti se modifica
    $oldResponsables = [];
    $oldTask = null;
    
    if ($isEdit) {
        // Ottieni task esistente
        $stmt = $pdo->prepare("SELECT * FROM tasks WHERE id = ?");
        $stmt->execute([$taskId]);
        $oldTask = $stmt->fetch();
        
        if (!$oldTask) {
            throw new Exception('Task non trovato');
        }
        
        // Ottieni responsabili precedenti
        $stmt = $pdo->prepare("
            SELECT u.id, u.first_name, u.last_name, u.email 
            FROM task_responsables tr
            JOIN users u ON tr.user_id = u.id
            WHERE tr.task_id = ?
        ");
        $stmt->execute([$taskId]);
        $oldResponsables = $stmt->fetchAll();
    }
    
    // 💾 SALVA IL TASK
    if ($isEdit) {
        // MODIFICA task esistente
        $completedAt = ($status === 'completed') ? date('Y-m-d H:i:s') : null;
        
        $stmt = $pdo->prepare("
            UPDATE tasks 
            SET title = ?, description = ?, client_id = ?, category_id = ?, 
                assigned_to = ?, priority = ?, status = ?, deadline = ?, 
                estimated_hours = ?, completed_at = ?, updated_at = NOW()
            WHERE id = ?
        ");
        
        $stmt->execute([
            $title, $description, $clientId, $categoryId,
            $responsables[0], $priority, $status, $deadline,
            $estimatedHours, $completedAt, $taskId
        ]);
        
        $message = '✅ Task modificato con successo: "' . $title . '" (ID: ' . $taskId . ')';
        $action = 'updated';
        
        } else {
            // CREA nuovo task
            $completedAt = ($status === 'completed') ? date('Y-m-d H:i:s') : null;
            
            $stmt = $pdo->prepare("
                INSERT INTO tasks (title, description, client_id, category_id, assigned_to, 
                                 created_by, priority, status, deadline, estimated_hours, 
                                 completed_at, created_at, updated_at, visible_to_client)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), ?)
            ");
            
            $stmt->execute([
                $title, $description, $clientId, $categoryId, $responsables[0],
                $currentUser['id'], $priority, $status, $deadline, $estimatedHours, $completedAt,
                1  // visible_to_client = true di default
            ]);
            
            $taskId = $pdo->lastInsertId();
            
            // ===== AGGIUNGI QUI LA NOTIFICA AL CLIENTE =====
            // Notifica al cliente se il task ha un cliente associato
            if ($clientId && $clientId > 0) {
                try {
                    require_once $_SERVER['DOCUMENT_ROOT'] . '/core/includes/client_notifications.php';
                    notifyClientNewTask($pdo, $taskId, $title, $clientId);
                    
                    // Log dell'invio notifica (opzionale)
                    error_log("Notifica task inviata al cliente ID: {$clientId} per task: {$title}");
                } catch (Exception $e) {
                    // Non bloccare il salvataggio se la notifica fallisce
                    error_log("Errore invio notifica cliente: " . $e->getMessage());
                }
            }
            // ===== FINE NOTIFICA CLIENTE =====
            
            $message = '✅ Task creato con successo: "' . $title . '" (ID: ' . $taskId . ')';
            $action = 'created';
        }
    
    // 👥 GESTISCI RESPONSABILI
    try {
        if ($isEdit) {
            $pdo->prepare("DELETE FROM task_responsables WHERE task_id = ?")->execute([$taskId]);
        }
        
        $stmt = $pdo->prepare("
            INSERT INTO task_responsables (task_id, user_id, role, is_primary, created_at)
            VALUES (?, ?, 'responsable', ?, NOW())
        ");
        
        foreach ($responsables as $index => $respId) {
            $isPrimary = ($index === 0) ? 1 : 0;
            $stmt->execute([$taskId, $respId, $isPrimary]);
        }
    } catch (Exception $e) {
        error_log("Responsables error (ignored): " . $e->getMessage());
    }
    
    // 🔔 SISTEMA NOTIFICHE - IDENTICO ALL'AGENDA CHE FUNZIONA
    try {
        error_log("🔔 Inizio creazione notifiche task...");
        
        // Verifica tabella notifiche esiste
        $stmt = $pdo->query("SHOW TABLES LIKE 'notifications'");
        if ($stmt->rowCount() > 0) {
            error_log("✅ Tabella notifications trovata");
            
            foreach ($responsables as $userId) {
                if (!empty($userId)) {
                    error_log("👤 Creando notifica per utente ID: $userId");
                    
                    if ($userId == $currentUser['id']) {
                        // Notifica per il creatore
                        $notificationTitle = $action === 'created' ? 'Task creato con successo' : 'Task aggiornato';
                        $notificationMessage = $action === 'created' 
                            ? "Hai creato il task: '$title' e sei stato impostato come responsabile"
                            : "Hai aggiornato il task: '$title'";
                    } else {
                        // Notifica per altri responsabili
                        $notificationTitle = $action === 'created' ? 'Nuovo task assegnato' : 'Task aggiornato';
                        $notificationMessage = $action === 'created' 
                            ? "Ti è stato assegnato un nuovo task: '$title'"
                            : "Il task '$title' a cui sei assegnato è stato modificato";
                    }
                    
                    // QUERY IDENTICA ALL'AGENDA - SENZA is_read nella INSERT
                    $stmt = $pdo->prepare("
                        INSERT INTO notifications (user_id, title, message, type, related_type, related_id, created_at)
                        VALUES (?, ?, ?, 'task', 'task', ?, NOW())
                    ");
                    $result = $stmt->execute([$userId, $notificationTitle, $notificationMessage, $taskId]);
                    
                    if ($result) {
                        error_log("✅ Notifica creata per utente $userId: $notificationTitle");
                    } else {
                        error_log("❌ Fallito inserimento notifica per utente $userId");
                    }
                }
            }
            
            error_log("🎯 Notifiche task completate");
            
        } else {
            error_log("⚠️ Tabella notifications non trovata - notifiche saltate");
        }
        
    } catch (Exception $e) {
        error_log("❌ Errore notifiche task: " . $e->getMessage());
        // Non bloccare il salvataggio se le notifiche falliscono
    }
    
    // 📝 LOG CONSOLE
    try {
        error_log("📝 Creando log console...");
        
        $stmt = $pdo->query("SHOW TABLES LIKE 'task_console_logs'");
        if ($stmt->rowCount() > 0) {
            $currentUserName = trim($currentUser['first_name'] . ' ' . $currentUser['last_name']);
            if (empty($currentUserName)) {
                $currentUserName = $currentUser['email'] ?? 'Utente';
            }
            
            $stmt = $pdo->prepare("
                INSERT INTO task_console_logs (user_id, user_name, message, type, created_at)
                VALUES (?, ?, ?, 'success', NOW())
            ");
            $result = $stmt->execute([$currentUser['id'], $currentUserName, $message]);
            
            if ($result) {
                error_log("✅ Console log creato: $message");
            } else {
                error_log("❌ Fallito console log");
            }
        } else {
            error_log("⚠️ Tabella task_console_logs non trovata");
        }
        
    } catch (Exception $e) {
        error_log("Warning: Console log failed: " . $e->getMessage());
    }
    
    echo json_encode([
        'success' => true,
        'message' => $message,
        'task_id' => $taskId,
        'action' => $action,
        'notifications_sent' => true,
        'debug' => [
            'responsables_count' => count($responsables),
            'responsables_ids' => $responsables
        ]
    ]);
    
} catch (Exception $e) {
    error_log("Error in save_task.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>