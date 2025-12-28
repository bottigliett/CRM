<?php
// File: /api/client-notifications.php
// API endpoint per gestione notifiche clienti

session_start();

// Connessione database
try {
    $dsn = "mysql:host=127.0.0.1;dbname=u706045794_crm_mismo;charset=utf8mb4";
    $pdo = new PDO($dsn, 'u706045794_mismo_crm_new', 'BLQ$>:;*9+h', [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
} catch (Exception $e) {
    error_log("Errore connessione database: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Errore connessione database']);
    exit;
}

// Gestione richieste API
if ($_SERVER['REQUEST_METHOD'] === 'POST' || isset($_GET['action'])) {
    header('Content-Type: application/json');

    // Debug: Log della sessione
    error_log("API client-notifications - Session data: " . print_r($_SESSION, true));
    error_log("API client-notifications - POST data: " . print_r($_POST, true));

    // Verifica autenticazione cliente
    if (!isset($_SESSION['client_access_id'])) {
        error_log("API client-notifications - Errore: client_access_id non in sessione");
        http_response_code(401);
        echo json_encode([
            'success' => false,
            'message' => 'Non autenticato',
            'debug' => [
                'session_exists' => isset($_SESSION),
                'client_id' => $_SESSION['client_id'] ?? 'not set',
                'client_access_id' => $_SESSION['client_access_id'] ?? 'not set'
            ]
        ]);
        exit;
    }

    $clientAccessId = $_SESSION['client_access_id'];
    $action = $_POST['action'] ?? $_GET['action'] ?? '';

    error_log("API client-notifications - Action: $action, ClientAccessId: $clientAccessId");

    try {
        switch ($action) {
            case 'mark_read':
                $notificationId = (int)($_POST['notification_id'] ?? 0);
                error_log("API client-notifications - mark_read: notificationId=$notificationId, clientAccessId=$clientAccessId");

                if ($notificationId <= 0) {
                    throw new Exception('ID notifica non valido');
                }

                // Prima verifica se la tabella esiste
                try {
                    // Verifica che la notifica appartenga al cliente
                    $stmt = $pdo->prepare("
                        UPDATE client_notifications
                        SET is_read = 1, read_at = NOW()
                        WHERE id = ? AND client_access_id = ?
                    ");
                    $stmt->execute([$notificationId, $clientAccessId]);

                    $rowsAffected = $stmt->rowCount();
                    error_log("API client-notifications - Rows affected: $rowsAffected");

                    echo json_encode(['success' => true, 'rows_affected' => $rowsAffected]);
                } catch (PDOException $e) {
                    error_log("API client-notifications - PDO Error: " . $e->getMessage());
                    throw new Exception('Errore database: ' . $e->getMessage());
                }
                exit;

            case 'mark_all_read':
                $stmt = $pdo->prepare("
                    UPDATE client_notifications
                    SET is_read = 1, read_at = NOW()
                    WHERE client_access_id = ? AND is_read = 0
                ");
                $stmt->execute([$clientAccessId]);

                echo json_encode(['success' => true]);
                exit;

            case 'get_count':
                // Verifica che la tabella esista
                try {
                    $stmt = $pdo->prepare("
                        SELECT COUNT(*) as count
                        FROM client_notifications
                        WHERE client_access_id = ? AND is_read = 0
                    ");
                    $stmt->execute([$clientAccessId]);
                    $result = $stmt->fetch(PDO::FETCH_ASSOC);

                    echo json_encode(['count' => (int)($result['count'] ?? 0)]);
                } catch (PDOException $e) {
                    // Tabella non esiste, restituisci 0
                    echo json_encode(['count' => 0]);
                }
                exit;

            default:
                throw new Exception('Azione non valida');
        }
    } catch (Exception $e) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        exit;
    }
}

// ===== FUNZIONI HELPER =====

/**
 * Invia notifica a cliente quando viene creato un task
 */
function notifyClientNewTask($pdo, $taskId, $taskTitle, $clientContactId) {
    try {
        // Trova l'accesso del cliente
        $stmt = $pdo->prepare("
            SELECT ca.*, lc.email, lc.name 
            FROM client_access ca
            INNER JOIN leads_contacts lc ON ca.contact_id = lc.id
            WHERE ca.contact_id = ? AND ca.is_active = 1
        ");
        $stmt->execute([$clientContactId]);
        $clientAccess = $stmt->fetch();
        
        if (!$clientAccess) {
            error_log("Client access non trovato per contact_id: $clientContactId");
            return false;
        }
        
        // 1. Crea notifica nel centro notifiche
        try {
            // Prima assicurati che la tabella esista
            createClientNotificationsTable($pdo);
            
            $stmt = $pdo->prepare("
                INSERT INTO client_notifications 
                (client_access_id, title, message, type, related_type, related_id, created_at)
                VALUES (?, ?, ?, 'task', 'task', ?, NOW())
            ");
            $stmt->execute([
                $clientAccess['id'],
                'Nuovo Task Assegnato',
                "È stato creato un nuovo task per il tuo progetto: '{$taskTitle}'",
                $taskId
            ]);
            
            error_log("Notifica task creata per client_access_id: {$clientAccess['id']}");
            
        } catch (Exception $e) {
            error_log("Errore creazione notifica task nel DB: " . $e->getMessage());
        }
        
        // 2. Invia email se verificata
        if ($clientAccess['email_verified'] && $clientAccess['email']) {
            sendClientTaskEmail($clientAccess['email'], $clientAccess['name'], $taskTitle);
            error_log("Email task inviata a: {$clientAccess['email']}");
        }
        
        return true;
        
    } catch (Exception $e) {
        error_log("Errore generale notifica cliente task: " . $e->getMessage());
        return false;
    }
}

/**
 * Invia notifica a cliente quando viene creato un evento - VERSIONE CORRETTA
 */
function notifyClientNewEvent($pdo, $eventId, $eventTitle, $eventDate, $clientContactId) {
    try {
        error_log("Iniziando notifica evento per cliente contact_id: $clientContactId");
        
        // Trova l'accesso del cliente
        $stmt = $pdo->prepare("
            SELECT ca.*, lc.email, lc.name 
            FROM client_access ca
            INNER JOIN leads_contacts lc ON ca.contact_id = lc.id
            WHERE ca.contact_id = ? AND ca.is_active = 1
        ");
        $stmt->execute([$clientContactId]);
        $clientAccess = $stmt->fetch();
        
        if (!$clientAccess) {
            error_log("Client access non trovato per contact_id: $clientContactId");
            return false;
        }
        
        error_log("Client access trovato: ID {$clientAccess['id']}, Nome: {$clientAccess['name']}");
        
        // 1. Crea notifica nel centro notifiche
        try {
            // Prima assicurati che la tabella esista
            createClientNotificationsTable($pdo);
            
            $formattedDate = date('d/m/Y H:i', strtotime($eventDate));
            
            $stmt = $pdo->prepare("
                INSERT INTO client_notifications 
                (client_access_id, title, message, type, related_type, related_id, created_at)
                VALUES (?, ?, ?, 'agenda', 'agenda_event', ?, NOW())
            ");
            
            $result = $stmt->execute([
                $clientAccess['id'],
                '📅 Nuovo Appuntamento',
                "Nuovo appuntamento programmato: '{$eventTitle}' per il {$formattedDate}",
                $eventId
            ]);
            
            if ($result) {
                error_log("✅ Notifica evento creata con successo nel DB per client_access_id: {$clientAccess['id']}");
            } else {
                error_log("❌ Errore nell'inserimento notifica evento");
            }
            
        } catch (Exception $e) {
            error_log("❌ Errore creazione notifica evento nel DB: " . $e->getMessage());
            error_log("SQL Error Info: " . print_r($stmt->errorInfo(), true));
        }
        
        // 2. Invia email se verificata
        if ($clientAccess['email_verified'] && $clientAccess['email']) {
            sendClientEventEmail($clientAccess['email'], $clientAccess['name'], $eventTitle, $eventDate);
            error_log("✅ Email evento inviata a: {$clientAccess['email']}");
        } else {
            error_log("⚠️ Email non inviata - Verificata: {$clientAccess['email_verified']}, Email: {$clientAccess['email']}");
        }
        
        return true;
        
    } catch (Exception $e) {
        error_log("❌ Errore generale notifica cliente evento: " . $e->getMessage());
        return false;
    }
}

/**
 * Crea tabella notifiche clienti se non esiste - VERSIONE MIGLIORATA
 */
function createClientNotificationsTable($pdo) {
    try {
        // Prima verifica se la tabella esiste
        $stmt = $pdo->prepare("SHOW TABLES LIKE 'client_notifications'");
        $stmt->execute();
        
        if ($stmt->fetch()) {
            // Tabella già esiste
            return true;
        }
        
        // Crea la tabella
        $sql = "
        CREATE TABLE client_notifications (
            id INT PRIMARY KEY AUTO_INCREMENT,
            client_access_id INT NOT NULL,
            title VARCHAR(255) NOT NULL,
            message TEXT NOT NULL,
            type ENUM('info', 'task', 'agenda', 'invoice', 'ticket') DEFAULT 'info',
            is_read BOOLEAN DEFAULT 0,
            related_type VARCHAR(50) NULL,
            related_id INT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            read_at DATETIME NULL,
            
            FOREIGN KEY (client_access_id) REFERENCES client_access(id) ON DELETE CASCADE,
            INDEX idx_client_unread (client_access_id, is_read),
            INDEX idx_created (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
        
        $pdo->exec($sql);
        error_log("✅ Tabella client_notifications creata con successo");
        return true;
        
    } catch (Exception $e) {
        error_log("Errore creazione/verifica tabella client_notifications: " . $e->getMessage());
        return false;
    }
}

// Le funzioni di invio email rimangono invariate...
function sendClientTaskEmail($email, $name, $taskTitle) {
    $subject = "Nuovo Task - Studio Mismo";
    $message = "
    <html>
    <body style='font-family: Arial, sans-serif; background: #f8f9fa; padding: 20px;'>
        <div style='max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; padding: 30px;'>
            <h2 style='color: #3b82f6;'>Ciao {$name}!</h2>
            <p style='font-size: 16px; color: #333;'>
                È stato creato un nuovo task per il tuo progetto:
            </p>
            <div style='background: #f0f9ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0;'>
                <strong style='color: #1e40af; font-size: 18px;'>📋 {$taskTitle}</strong>
            </div>
            <p style='color: #666;'>
                Puoi visualizzare tutti i dettagli accedendo alla tua dashboard.
            </p>
            <a href='https://portale.studiomismo.it/client.php' 
               style='display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; 
                      border-radius: 6px; text-decoration: none; margin-top: 20px;'>
                Vai alla Dashboard
            </a>
            <hr style='margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;'>
            <p style='font-size: 12px; color: #9ca3af;'>
                Studio Mismo - Via Esempio 123, Verona<br>
                Questa email è stata inviata automaticamente dal sistema CRM.
            </p>
        </div>
    </body>
    </html>";
    
    $headers = [
        'From: Studio Mismo <noreply@studiomismo.it>',
        'Reply-To: info@studiomismo.it',
        'Content-Type: text/html; charset=UTF-8',
        'MIME-Version: 1.0'
    ];
    
    return mail($email, $subject, $message, implode("\r\n", $headers));
}

function sendClientEventEmail($email, $name, $eventTitle, $eventDate) {
    $formattedDate = date('d/m/Y', strtotime($eventDate));
    $formattedTime = date('H:i', strtotime($eventDate));
    
    $subject = "📅 Nuovo Appuntamento - Studio Mismo";
    $message = "
    <html>
    <body style='font-family: Arial, sans-serif; background: #f8f9fa; padding: 20px;'>
        <div style='max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; padding: 30px;'>
            <h2 style='color: #10b981;'>Ciao {$name}!</h2>
            <p style='font-size: 16px; color: #333;'>
                È stato programmato un nuovo appuntamento:
            </p>
            <div style='background: #f0fdf4; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0;'>
                <strong style='color: #059669; font-size: 18px;'>📅 {$eventTitle}</strong><br>
                <span style='color: #6b7280; margin-top: 5px; display: block;'>
                    📆 Data: {$formattedDate}<br>
                    ⏰ Ora: {$formattedTime}
                </span>
            </div>
            <p style='color: #666;'>
                Ti invieremo un promemoria prima dell'appuntamento.
            </p>
            <a href='https://portale.studiomismo.it/client.php' 
               style='display: inline-block; background: #10b981; color: white; padding: 12px 24px; 
                      border-radius: 6px; text-decoration: none; margin-top: 20px;'>
                Visualizza Dettagli
            </a>
            <hr style='margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;'>
            <p style='font-size: 12px; color: #9ca3af;'>
                Studio Mismo - Via Esempio 123, Verona<br>
                Questa email è stata inviata automaticamente dal sistema CRM.
            </p>
        </div>
    </body>
    </html>";
    
    $headers = [
        'From: Studio Mismo <noreply@studiomismo.it>',
        'Reply-To: info@studiomismo.it',
        'Content-Type: text/html; charset=UTF-8',
        'MIME-Version: 1.0'
    ];
    
    return mail($email, $subject, $message, implode("\r\n", $headers));
}
?>