<?php
// File: /modules/agenda/fix_responsables_table.php
// Script per verificare e correggere la tabella agenda_event_responsables

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
    
    // 1. VERIFICA SE TABELLA ESISTE
    $stmt = $pdo->query("SHOW TABLES LIKE 'agenda_event_responsables'");
    if ($stmt->rowCount() === 0) {
        // CREA TABELLA COMPLETA
        $pdo->exec("
            CREATE TABLE agenda_event_responsables (
                id INT PRIMARY KEY AUTO_INCREMENT,
                event_id INT NOT NULL,
                user_id INT NOT NULL,
                role ENUM('organizer', 'participant') DEFAULT 'participant',
                response_status ENUM('pending', 'accepted', 'declined') DEFAULT 'pending',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                
                FOREIGN KEY (event_id) REFERENCES agenda_events(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                
                UNIQUE KEY unique_event_user (event_id, user_id)
            )
        ");
        $actions[] = "✅ Tabella agenda_event_responsables creata completamente";
        
    } else {
        // VERIFICA E AGGIORNA STRUTTURA
        $stmt = $pdo->query("DESCRIBE agenda_event_responsables");
        $columns = $stmt->fetchAll();
        $columnNames = array_column($columns, 'Field');
        
        $actions[] = "📋 Tabella esistente con colonne: " . implode(', ', $columnNames);
        
        // Aggiungi colonne mancanti
        if (!in_array('role', $columnNames)) {
            $pdo->exec("ALTER TABLE agenda_event_responsables ADD COLUMN role ENUM('organizer', 'participant') DEFAULT 'participant' AFTER user_id");
            $actions[] = "✅ Colonna 'role' aggiunta";
        }
        
        if (!in_array('response_status', $columnNames)) {
            $pdo->exec("ALTER TABLE agenda_event_responsables ADD COLUMN response_status ENUM('pending', 'accepted', 'declined') DEFAULT 'pending' AFTER role");
            $actions[] = "✅ Colonna 'response_status' aggiunta";
        }
        
        if (!in_array('created_at', $columnNames)) {
            $pdo->exec("ALTER TABLE agenda_event_responsables ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP");
            $actions[] = "✅ Colonna 'created_at' aggiunta";
        }
        
        // Verifica foreign keys
        $stmt = $pdo->query("
            SELECT CONSTRAINT_NAME 
            FROM information_schema.KEY_COLUMN_USAGE 
            WHERE TABLE_SCHEMA = 'u706045794_crm_mismo' 
            AND TABLE_NAME = 'agenda_event_responsables'
            AND REFERENCED_TABLE_NAME IS NOT NULL
        ");
        $foreignKeys = $stmt->fetchAll(PDO::FETCH_COLUMN);
        
        if (empty($foreignKeys)) {
            try {
                $pdo->exec("ALTER TABLE agenda_event_responsables ADD FOREIGN KEY (event_id) REFERENCES agenda_events(id) ON DELETE CASCADE");
                $actions[] = "✅ Foreign key event_id aggiunta";
            } catch (Exception $e) {
                $actions[] = "⚠️ Foreign key event_id: " . $e->getMessage();
            }
            
            try {
                $pdo->exec("ALTER TABLE agenda_event_responsables ADD FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE");
                $actions[] = "✅ Foreign key user_id aggiunta";
            } catch (Exception $e) {
                $actions[] = "⚠️ Foreign key user_id: " . $e->getMessage();
            }
        }
        
        // Aggiungi unique constraint se non esiste
        $stmt = $pdo->query("SHOW INDEX FROM agenda_event_responsables WHERE Key_name = 'unique_event_user'");
        if ($stmt->rowCount() === 0) {
            try {
                $pdo->exec("ALTER TABLE agenda_event_responsables ADD UNIQUE KEY unique_event_user (event_id, user_id)");
                $actions[] = "✅ Unique constraint unique_event_user aggiunto";
            } catch (Exception $e) {
                $actions[] = "⚠️ Unique constraint: " . $e->getMessage();
            }
        }
    }
    
    // 2. VERIFICA STRUTTURA FINALE
    $stmt = $pdo->query("DESCRIBE agenda_event_responsables");
    $finalColumns = $stmt->fetchAll();
    
    // 3. TEST INSERIMENTO
    try {
        $testUserId = $currentUser['id'];
        
        // Crea evento test se non esiste
        $stmt = $pdo->prepare("SELECT id FROM agenda_events LIMIT 1");
        $stmt->execute();
        $testEvent = $stmt->fetch();
        
        if (!$testEvent) {
            // Trova categoria per test
            $stmt = $pdo->prepare("SELECT id FROM agenda_categories LIMIT 1");
            $stmt->execute();
            $testCategory = $stmt->fetch();
            
            if ($testCategory) {
                $stmt = $pdo->prepare("
                    INSERT INTO agenda_events (title, start_datetime, end_datetime, category_id, created_by, assigned_to, created_at, updated_at)
                    VALUES ('Test Event', NOW(), DATE_ADD(NOW(), INTERVAL 1 HOUR), ?, ?, ?, NOW(), NOW())
                ");
                $stmt->execute([$testCategory['id'], $testUserId, $testUserId]);
                $testEventId = $pdo->lastInsertId();
                $actions[] = "📝 Evento test creato: ID {$testEventId}";
            }
        } else {
            $testEventId = $testEvent['id'];
        }
        
        if (isset($testEventId)) {
            // Test inserimento responsabile
            $stmt = $pdo->prepare("
                INSERT IGNORE INTO agenda_event_responsables (event_id, user_id, role, response_status, created_at)
                VALUES (?, ?, 'participant', 'pending', NOW())
            ");
            $stmt->execute([$testEventId, $testUserId]);
            $actions[] = "✅ Test inserimento responsabile completato";
        }
        
    } catch (Exception $e) {
        $actions[] = "❌ Errore test: " . $e->getMessage();
    }
    
    echo json_encode([
        'success' => true,
        'actions' => $actions,
        'final_structure' => $finalColumns,
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