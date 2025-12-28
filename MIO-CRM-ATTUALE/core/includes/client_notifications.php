<?php
// File: /core/includes/client_notifications.php
// Sistema notifiche per clienti

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
            return false;
        }
        
        // 1. Crea notifica nel centro notifiche (se esiste tabella client_notifications)
        try {
            $stmt = $pdo->prepare("
                INSERT INTO client_notifications 
                (client_access_id, title, message, type, related_type, related_id, created_at)
                VALUES (?, ?, ?, 'task', 'task', ?, NOW())
            ");
            $stmt->execute([
                $clientAccess['id'],
                '📋 Nuovo Task Assegnato',
                "È stato creato un nuovo task per il tuo progetto: '{$taskTitle}'",
                $taskId
            ]);
        } catch (Exception $e) {
            // Se la tabella non esiste, creiamola
            createClientNotificationsTable($pdo);
            // Riprova
            try {
                $stmt->execute([
                    $clientAccess['id'],
                    '📋 Nuovo Task Assegnato',
                    "È stato creato un nuovo task per il tuo progetto: '{$taskTitle}'",
                    $taskId
                ]);
            } catch (Exception $e2) {
                error_log("Errore creazione notifica cliente: " . $e2->getMessage());
            }
        }
        
        // 2. Invia email se verificata
        if ($clientAccess['email_verified'] && $clientAccess['email']) {
            sendClientTaskEmail($clientAccess['email'], $clientAccess['name'], $taskTitle);
        }
        
        return true;
        
    } catch (Exception $e) {
        error_log("Errore notifica cliente task: " . $e->getMessage());
        return false;
    }
}

/**
 * Invia notifica a cliente quando viene creato un evento
 */
function notifyClientNewEvent($pdo, $eventId, $eventTitle, $eventDate, $clientContactId) {
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
            return false;
        }
        
        // 1. Crea notifica nel centro notifiche
        try {
            $formattedDate = date('d/m/Y H:i', strtotime($eventDate));
            $stmt = $pdo->prepare("
                INSERT INTO client_notifications 
                (client_access_id, title, message, type, related_type, related_id, created_at)
                VALUES (?, ?, ?, 'agenda', 'agenda_event', ?, NOW())
            ");
            $stmt->execute([
                $clientAccess['id'],
                '📅 Nuovo Appuntamento',
                "Nuovo appuntamento programmato: '{$eventTitle}' per il {$formattedDate}",
                $eventId
            ]);
        } catch (Exception $e) {
            error_log("Errore creazione notifica evento: " . $e->getMessage());
        }
        
        // 2. Invia email se verificata
        if ($clientAccess['email_verified'] && $clientAccess['email']) {
            sendClientEventEmail($clientAccess['email'], $clientAccess['name'], $eventTitle, $eventDate);
        }
        
        return true;
        
    } catch (Exception $e) {
        error_log("Errore notifica cliente evento: " . $e->getMessage());
        return false;
    }
}

/**
 * Invia email per nuovo task
 */
function sendClientTaskEmail($email, $name, $taskTitle) {
    $subject = "📋 Nuovo Task - Studio Mismo";
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

/**
 * Invia email per nuovo evento
 */
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

/**
 * Invia notifica a cliente quando viene creato un nuovo preventivo
 */
function notifyClientNewQuote($pdo, $quoteId, $quoteNumber, $clientContactId) {
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
            return false;
        }

        // 1. Crea notifica nel centro notifiche
        try {
            $stmt = $pdo->prepare("
                INSERT INTO client_notifications
                (client_access_id, title, message, type, related_type, related_id, created_at)
                VALUES (?, ?, ?, 'info', 'quote', ?, NOW())
            ");
            $stmt->execute([
                $clientAccess['id'],
                '💼 Nuovo Preventivo Disponibile',
                "È stato creato un nuovo preventivo per te: {$quoteNumber}. Visualizzalo per scoprire i dettagli.",
                $quoteId
            ]);
        } catch (Exception $e) {
            // Se la tabella non esiste, creiamola
            createClientNotificationsTable($pdo);
            // Riprova
            try {
                $stmt->execute([
                    $clientAccess['id'],
                    '💼 Nuovo Preventivo Disponibile',
                    "È stato creato un nuovo preventivo per te: {$quoteNumber}. Visualizzalo per scoprire i dettagli.",
                    $quoteId
                ]);
            } catch (Exception $e2) {
                error_log("Errore creazione notifica preventivo cliente: " . $e2->getMessage());
            }
        }

        // 2. Invia email se verificata
        if ($clientAccess['email_verified'] && $clientAccess['email']) {
            sendClientQuoteEmail($clientAccess['email'], $clientAccess['name'], $quoteNumber, $quoteId);
        }

        return true;

    } catch (Exception $e) {
        error_log("Errore notifica cliente preventivo: " . $e->getMessage());
        return false;
    }
}

/**
 * Invia email per nuovo preventivo
 */
function sendClientQuoteEmail($email, $name, $quoteNumber, $quoteId) {
    $subject = "💼 Nuovo Preventivo Disponibile - Studio Mismo";
    $message = "
    <html>
    <body style='font-family: Arial, sans-serif; background: #f8f9fa; padding: 20px;'>
        <div style='max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; padding: 30px;'>
            <h2 style='color: #8b5cf6;'>Ciao {$name}!</h2>
            <p style='font-size: 16px; color: #333;'>
                Abbiamo preparato un nuovo preventivo per te!
            </p>
            <div style='background: #faf5ff; border-left: 4px solid #8b5cf6; padding: 15px; margin: 20px 0;'>
                <strong style='color: #6b21a8; font-size: 18px;'>💼 {$quoteNumber}</strong>
            </div>
            <p style='color: #666;'>
                Il preventivo è ora disponibile nella tua dashboard. Accedi per visualizzare tutti i dettagli
                e le proposte che abbiamo preparato appositamente per te.
            </p>
            <a href='https://portale.studiomismo.it/client.php'
               style='display: inline-block; background: #8b5cf6; color: white; padding: 12px 24px;
                      border-radius: 6px; text-decoration: none; margin-top: 20px;'>
                Visualizza Preventivo
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

/**
 * Crea tabella notifiche clienti se non esiste
 */
function createClientNotificationsTable($pdo) {
    try {
        $sql = "
        CREATE TABLE IF NOT EXISTS client_notifications (
            id INT PRIMARY KEY AUTO_INCREMENT,
            client_access_id INT NOT NULL,
            title VARCHAR(255) NOT NULL,
            message TEXT NOT NULL,
            type ENUM('info', 'task', 'agenda', 'invoice', 'ticket', 'quote') DEFAULT 'info',
            is_read BOOLEAN DEFAULT 0,
            related_type VARCHAR(50) NULL,
            related_id INT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            read_at DATETIME NULL,

            FOREIGN KEY (client_access_id) REFERENCES client_access(id) ON DELETE CASCADE,
            INDEX idx_client_unread (client_access_id, is_read),
            INDEX idx_created (created_at)
        )";

        $pdo->exec($sql);
        return true;

    } catch (Exception $e) {
        error_log("Errore creazione tabella client_notifications: " . $e->getMessage());
        return false;
    }
}
?>