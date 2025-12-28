<?php
// File: /modules/agenda/setup_notifications.php
// Script per verificare e creare la tabella notifications

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
    
    // 1. VERIFICA TABELLA NOTIFICATIONS
    $stmt = $pdo->query("SHOW TABLES LIKE 'notifications'");
    if ($stmt->rowCount() === 0) {
        // CREA TABELLA NOTIFICATIONS
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
        
        // INSERISCI NOTIFICA DI BENVENUTO
        $stmt = $pdo->prepare("
            INSERT INTO notifications (user_id, title, message, type, created_at)
            VALUES (?, 'Benvenuto nel sistema Agenda!', 'Il sistema notifiche è stato configurato correttamente. Riceverai aggiornamenti sugli eventi dell\'agenda.', 'agenda', NOW())
        ");
        $stmt->execute([$currentUser['id']]);
        $actions[] = "📧 Notifica di benvenuto creata";
        
    } else {
        // VERIFICA STRUTTURA ESISTENTE
        $stmt = $pdo->query("DESCRIBE notifications");
        $columns = $stmt->fetchAll();
        $columnNames = array_column($columns, 'Field');
        
        $actions[] = "📋 Tabella notifications già esistente con colonne: " . implode(', ', $columnNames);
        
        // Verifica colonne essenziali
        $requiredColumns = [
            'related_type' => "VARCHAR(50) NULL",
            'related_id' => "INT NULL"
        ];
        
        foreach ($requiredColumns as $column => $definition) {
            if (!in_array($column, $columnNames)) {
                $pdo->exec("ALTER TABLE notifications ADD COLUMN {$column} {$definition}");
                $actions[] = "✅ Colonna '$column' aggiunta";
            }
        }
        
        // Verifica tipo 'agenda' nell'ENUM
        $typeColumn = array_filter($columns, function($col) {
            return $col['Field'] === 'type';
        });
        
        if ($typeColumn) {
            $typeColumn = array_values($typeColumn)[0];
            if (strpos($typeColumn['Type'], 'agenda') === false) {
                $pdo->exec("ALTER TABLE notifications MODIFY COLUMN type ENUM('info', 'success', 'warning', 'error', 'agenda', 'task', 'ticket') DEFAULT 'info'");
                $actions[] = "✅ Tipo 'agenda' aggiunto all'ENUM";
            }
        }
    }
    
    // 2. TEST SISTEMA NOTIFICHE
    try {
        // Test inserimento notifica
        $stmt = $pdo->prepare("
            INSERT INTO notifications (user_id, title, message, type, related_type, related_id, created_at)
            VALUES (?, 'Test Sistema Notifiche', 'Questo è un test per verificare che il sistema notifiche funzioni correttamente.', 'info', 'test', 0, NOW())
        ");
        $stmt->execute([$currentUser['id']]);
        $testNotificationId = $pdo->lastInsertId();
        $actions[] = "✅ Test notifica creata (ID: $testNotificationId)";
        
        // Test lettura notifiche
        $stmt = $pdo->prepare("SELECT COUNT(*) as count FROM notifications WHERE user_id = ?");
        $stmt->execute([$currentUser['id']]);
        $userNotificationsCount = $stmt->fetch()['count'];
        $actions[] = "📊 L'utente ha $userNotificationsCount notifiche totali";
        
        // Test conteggio non lette
        $stmt = $pdo->prepare("SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0");
        $stmt->execute([$currentUser['id']]);
        $unreadCount = $stmt->fetch()['count'];
        $actions[] = "📬 L'utente ha $unreadCount notifiche non lette";
        
    } catch (Exception $e) {
        $actions[] = "❌ Errore test notifiche: " . $e->getMessage();
    }
    
    // 3. VERIFICA API NOTIFICHE
    $apiPath = $_SERVER['DOCUMENT_ROOT'] . '/api/notifications.php';
    if (file_exists($apiPath)) {
        $actions[] = "✅ API notifiche presente: /api/notifications.php";
    } else {
        $actions[] = "❌ API notifiche mancante: /api/notifications.php";
    }
    
    // 4. VERIFICA JAVASCRIPT NOTIFICHE
    $jsPath = $_SERVER['DOCUMENT_ROOT'] . '/assets/js/notifications.js';
    if (file_exists($jsPath)) {
        $actions[] = "✅ JavaScript notifiche presente: /assets/js/notifications.js";
    } else {
        $actions[] = "❌ JavaScript notifiche mancante: /assets/js/notifications.js";
    }
    
    // 5. STATISTICHE FINALI
    $stmt = $pdo->prepare("
        SELECT 
            COUNT(*) as total_notifications,
            COUNT(CASE WHEN is_read = 0 THEN 1 END) as unread_notifications,
            COUNT(CASE WHEN type = 'agenda' THEN 1 END) as agenda_notifications,
            COUNT(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR) THEN 1 END) as today_notifications
        FROM notifications
        WHERE user_id = ?
    ");
    $stmt->execute([$currentUser['id']]);
    $stats = $stmt->fetch();
    
    echo json_encode([
        'success' => true,
        'actions' => $actions,
        'statistics' => [
            'total_notifications' => (int)$stats['total_notifications'],
            'unread_notifications' => (int)$stats['unread_notifications'],
            'agenda_notifications' => (int)$stats['agenda_notifications'],
            'today_notifications' => (int)$stats['today_notifications']
        ],
        'recommendations' => [
            'Crea un evento nell\'agenda per testare le notifiche automatiche',
            'Aggiungi altri utenti come responsabili per verificare le notifiche',
            'Controlla il centro notifiche cliccando sulla campanella',
            'Verifica che i log attività si popolino correttamente'
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