<?php
// File: /modules/task_manager/setup_notifications.php
// Script per verificare e testare notifiche task - BASATO SU AGENDA FUNZIONANTE

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../../core/includes/auth_helper.php';

// Verifica autenticazione admin
$currentUser = getCurrentUser();
if (!$currentUser || !in_array($currentUser['role'], ['admin', 'super_admin'])) {
    die(json_encode(['error' => 'Accesso negato - Solo amministratori']));
}

try {
    // Connessione database
    $dsn = "mysql:host=127.0.0.1;dbname=u706045794_crm_mismo;charset=utf8mb4";
    $pdo = new PDO($dsn, 'u706045794_mismo_crm_new', 'BLQ$>:;*9+h', [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
    
    $actions = [];
    
    // 1. VERIFICA TABELLA NOTIFICATIONS - COME AGENDA
    $stmt = $pdo->query("SHOW TABLES LIKE 'notifications'");
    if ($stmt->rowCount() === 0) {
        $actions[] = "❌ Tabella notifications NON ESISTE - da creare prima";
        
        // CREA TABELLA IDENTICA A AGENDA
        $pdo->exec("
            CREATE TABLE notifications (
                id INT PRIMARY KEY AUTO_INCREMENT,
                user_id INT NOT NULL,
                title VARCHAR(255) NOT NULL,
                message TEXT NOT NULL,
                type ENUM('info', 'success', 'warning', 'error', 'agenda', 'task', 'ticket') DEFAULT 'info',
                is_read BOOLEAN DEFAULT FALSE,
                related_type VARCHAR(50) NULL,
                related_id INT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                
                INDEX idx_user_id (user_id),
                INDEX idx_created_at (created_at),
                INDEX idx_is_read (is_read),
                INDEX idx_type (type)
            )
        ");
        $actions[] = "✅ Tabella notifications creata";
        
    } else {
        // VERIFICA STRUTTURA ESISTENTE
        $stmt = $pdo->query("DESCRIBE notifications");
        $columns = $stmt->fetchAll();
        $columnNames = array_column($columns, 'Field');
        
        $actions[] = "📋 Tabella notifications esistente con colonne: " . implode(', ', $columnNames);
        
        // Verifica se 'task' è nell'ENUM type
        $typeColumn = array_filter($columns, function($col) {
            return $col['Field'] === 'type';
        });
        
        if ($typeColumn) {
            $typeColumn = array_values($typeColumn)[0];
            if (strpos($typeColumn['Type'], 'task') === false) {
                $pdo->exec("ALTER TABLE notifications MODIFY COLUMN type ENUM('info', 'success', 'warning', 'error', 'agenda', 'task', 'ticket') DEFAULT 'info'");
                $actions[] = "✅ Tipo 'task' aggiunto all'ENUM";
            } else {
                $actions[] = "✅ Tipo 'task' già presente nell'ENUM";
            }
        }
    }
    
    // 2. TEST NOTIFICA TASK - ESATTO COME AGENDA
    try {
        $stmt = $pdo->prepare("
            INSERT INTO notifications (user_id, title, message, type, related_type, related_id, created_at)
            VALUES (?, ?, ?, 'task', 'task', ?, NOW())
        ");
        $stmt->execute([
            $currentUser['id'], 
            '📋 Test notifica task', 
            'Questo è un test per verificare che le notifiche task funzionino correttamente.',
            999
        ]);
        $testNotificationId = $pdo->lastInsertId();
        $actions[] = "✅ Test notifica task creata (ID: $testNotificationId)";
        
    } catch (Exception $e) {
        $actions[] = "❌ Errore test notifica task: " . $e->getMessage();
    }
    
    // 3. VERIFICA TASK CONSOLE LOGS
    $stmt = $pdo->query("SHOW TABLES LIKE 'task_console_logs'");
    if ($stmt->rowCount() > 0) {
        $actions[] = "✅ Tabella task_console_logs presente";
        
        // Test log console
        try {
            $currentUserName = trim($currentUser['first_name'] . ' ' . $currentUser['last_name']);
            if (empty($currentUserName)) {
                $currentUserName = $currentUser['email'] ?? 'Utente Test';
            }
            
            $stmt = $pdo->prepare("
                INSERT INTO task_console_logs (user_id, user_name, message, type, created_at)
                VALUES (?, ?, ?, 'info', NOW())
            ");
            $stmt->execute([
                $currentUser['id'], 
                $currentUserName, 
                '🧪 Test sistema notifiche task manager'
            ]);
            $actions[] = "✅ Test console log creato";
            
        } catch (Exception $e) {
            $actions[] = "❌ Errore test console log: " . $e->getMessage();
        }
    } else {
        $actions[] = "❌ Tabella task_console_logs mancante";
    }
    
    // 4. VERIFICA FILES TASK MANAGER
    $saveTaskPath = __DIR__ . '/ajax/save_task.php';
    $updateTaskPath = __DIR__ . '/ajax/update_task.php';
    
    $actions[] = file_exists($saveTaskPath) ? "✅ save_task.php presente" : "❌ save_task.php mancante";
    $actions[] = file_exists($updateTaskPath) ? "✅ update_task.php presente" : "❌ update_task.php mancante";
    
    // 5. TEST UTENTI DISPONIBILI
    $stmt = $pdo->query("
        SELECT COUNT(*) as count 
        FROM users 
        WHERE role IN ('admin', 'super_admin') 
        AND is_active = 1
    ");
    $adminCount = $stmt->fetch()['count'];
    $actions[] = "👥 Admin disponibili per test: $adminCount";
    
    if ($adminCount < 2) {
        $actions[] = "⚠️ Warning: Serve almeno 2 admin per testare le notifiche tra utenti diversi";
    }
    
    // 6. STATISTICHE NOTIFICHE
    $stmt = $pdo->prepare("
        SELECT 
            COUNT(*) as total_notifications,
            COUNT(CASE WHEN is_read = 0 THEN 1 END) as unread_notifications,
            COUNT(CASE WHEN type = 'task' THEN 1 END) as task_notifications,
            COUNT(CASE WHEN type = 'agenda' THEN 1 END) as agenda_notifications,
            COUNT(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR) THEN 1 END) as today_notifications
        FROM notifications
        WHERE user_id = ?
    ");
    $stmt->execute([$currentUser['id']]);
    $stats = $stmt->fetch();
    
    // 7. CONFRONTO CON AGENDA (FUNZIONANTE)
    $agendaSetupPath = __DIR__ . '/../agenda/setup_notifications.php';
    $agendaSavePath = __DIR__ . '/../agenda/ajax/save_event.php';
    
    $actions[] = file_exists($agendaSetupPath) ? "✅ Agenda setup_notifications.php presente" : "❌ Agenda setup mancante";
    $actions[] = file_exists($agendaSavePath) ? "✅ Agenda save_event.php presente" : "❌ Agenda save mancante";
    
    // 8. ISTRUZIONI SPECIFICHE PER TEST
    $testInstructions = [
        "1. Crea un nuovo task con un altro admin come responsabile",
        "2. Controlla se il responsabile riceve la notifica nel centro notifiche",
        "3. Modifica il task e verifica le notifiche di aggiornamento",
        "4. Cambia lo status del task e controlla le notifiche",
        "5. Verifica che i log della console mostrino il nome utente"
    ];
    
    echo json_encode([
        'success' => true,
        'actions' => $actions,
        'statistics' => [
            'total_notifications' => (int)$stats['total_notifications'],
            'unread_notifications' => (int)$stats['unread_notifications'],
            'task_notifications' => (int)$stats['task_notifications'],
            'agenda_notifications' => (int)$stats['agenda_notifications'],
            'today_notifications' => (int)$stats['today_notifications'],
            'admin_count' => (int)$adminCount
        ],
        'test_instructions' => $testInstructions,
        'debug_info' => [
            'current_user_id' => $currentUser['id'],
            'current_user_name' => trim($currentUser['first_name'] . ' ' . $currentUser['last_name']),
            'current_user_email' => $currentUser['email'] ?? 'N/A',
            'current_user_role' => $currentUser['role'] ?? 'N/A'
        ],
        'timestamp' => date('Y-m-d H:i:s')
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'file' => basename($e->getFile()),
        'line' => $e->getLine()
    ], JSON_PRETTY_PRINT);
}
?>