<?php
// File: /ajax/send_chat_message.php
// Gestisce l'invio dei messaggi chat via AJAX

session_start();

header('Content-Type: application/json');

// Verifica autenticazione cliente
if (!isset($_SESSION['logged_in']) || !$_SESSION['logged_in'] || 
    !isset($_SESSION['user_type']) || $_SESSION['user_type'] !== 'client') {
    die(json_encode(['success' => false, 'error' => 'Non autenticato']));
}

// Connessione database
try {
    $dsn = "mysql:host=127.0.0.1;dbname=u706045794_crm_mismo;charset=utf8mb4";
    $pdo = new PDO($dsn, 'u706045794_mismo_crm_new', 'BLQ$>:;*9+h', [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
} catch (Exception $e) {
    die(json_encode(['success' => false, 'error' => 'Errore connessione database']));
}

// Funzioni email
function sendClientMessageConfirmation($pdo, $ticketId, $message, $client) {
    try {
        $stmt = $pdo->prepare("
            SELECT t.*, lc.name as client_name, lc.email as client_email 
            FROM tickets t
            JOIN client_access ca ON t.client_id = ca.id
            JOIN leads_contacts lc ON ca.contact_id = lc.id
            WHERE t.id = ?
        ");
        $stmt->execute([$ticketId]);
        $ticket = $stmt->fetch();
        
        if (!$ticket || !$ticket['client_email']) return;
        
        $subject = "Messaggio ricevuto - Ticket #{$ticket['ticket_number']} - Studio Mismo";
        
        $messageHtml = "
        <html>
        <body style='font-family: Arial, sans-serif; color: #333;'>
            <div style='max-width: 600px; margin: 0 auto; background: #fff; border: 1px solid #ddd;'>
                <div style='background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px;'>
                    <h2>Messaggio Ricevuto con Successo</h2>
                    <div style='font-size: 16px;'>Ticket #{$ticket['ticket_number']}</div>
                </div>
                
                <div style='padding: 20px;'>
                    <p>Ciao <strong>{$ticket['client_name']}</strong>,</p>
                    
                    <p>Abbiamo ricevuto il tuo messaggio per il ticket <strong>#{$ticket['ticket_number']}</strong>:</p>
                    
                    <div style='background: #f8fafc; padding: 15px; border-left: 4px solid #3b82f6; margin: 20px 0;'>
                        <h4 style='margin-top: 0;'>Oggetto: {$ticket['subject']}</h4>
                        <p style='color: #666; margin-bottom: 0;'>Tipo: " . ucfirst($ticket['support_type']) . " | Priorità: " . ucfirst($ticket['priority']) . "</p>
                    </div>
                    
                    <div style='background: #ffffff; border: 1px solid #e5e7eb; padding: 15px; border-radius: 6px;'>
                        <h4>Il tuo messaggio:</h4>
                        <p style='font-style: italic; color: #374151;'>" . nl2br(htmlspecialchars($message)) . "</p>
                        <div style='font-size: 12px; color: #9ca3af; margin-top: 10px;'>
                            Inviato alle: " . date('H:i d/m/Y') . "
                        </div>
                    </div>
                    
                    <div style='text-align: center; margin: 30px 0;'>
                        <a href='https://portale.studiomismo.it/client.php' 
                           style='background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;'>
                            Torna alla Dashboard
                        </a>
                    </div>
                </div>
                
                <div style='background: #f9fafb; padding: 15px; text-align: center; font-size: 12px; color: #6b7280;'>
                    Questa email è stata inviata automaticamente.
                </div>
            </div>
        </body>
        </html>
        ";
        
        $headers = [
            'MIME-Version: 1.0',
            'Content-type: text/html; charset=UTF-8',
            'From: Studio Mismo Support <support@studiomismo.it>',
            'Reply-To: support@studiomismo.it'
        ];
        
        mail($ticket['client_email'], $subject, $messageHtml, implode("\r\n", $headers));
        
    } catch (Exception $e) {
        error_log("Errore invio conferma cliente: " . $e->getMessage());
    }
}

function sendAdminChatNotification($pdo, $ticketId, $message, $client) {
    try {
        $stmt = $pdo->prepare("
            SELECT t.*, lc.name as client_name, lc.email as client_email 
            FROM tickets t
            JOIN client_access ca ON t.client_id = ca.id
            JOIN leads_contacts lc ON ca.contact_id = lc.id
            WHERE t.id = ?
        ");
        $stmt->execute([$ticketId]);
        $ticket = $stmt->fetch();
        
        if (!$ticket) return;
        
        $adminEmails = [
            'davide@studiomismo.it',
            'stefano@studiomismo.it'
        ];
        
        $subject = "Nuovo messaggio Ticket #{$ticket['ticket_number']} - {$ticket['client_name']}";
        
        $emailHtml = "
        <html>
        <body style='font-family: Arial, sans-serif; color: #333;'>
            <div style='max-width: 600px; margin: 0 auto; background: #fff; border: 1px solid #ddd;'>
                <div style='background: #37352f; color: white; padding: 20px;'>
                    <h2>Nuovo Messaggio Chat</h2>
                    <div style='font-size: 16px;'>Ticket #{$ticket['ticket_number']}</div>
                </div>
                
                <div style='padding: 20px;'>
                    <div style='background: #f8fafc; padding: 15px; border-left: 4px solid #3b82f6; margin-bottom: 20px;'>
                        <p><strong>Cliente:</strong> {$ticket['client_name']}</p>
                        <p><strong>Email:</strong> {$ticket['client_email']}</p>
                        <p><strong>Oggetto:</strong> {$ticket['subject']}</p>
                        <p><strong>Priorità:</strong> " . ucfirst($ticket['priority']) . "</p>
                    </div>
                    
                    <div style='background: #ffffff; border: 1px solid #e5e7eb; padding: 15px; border-radius: 6px;'>
                        <h4>Messaggio del cliente:</h4>
                        <p style='font-style: italic; color: #374151; line-height: 1.6;'>" . nl2br(htmlspecialchars($message)) . "</p>
                    </div>
                    
                    <div style='text-align: center; margin-top: 20px;'>
                        <a href='https://crm.studiomismo.it/modules/ticket/' 
                           style='background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;'>
                            Rispondi nel CRM
                        </a>
                    </div>
                </div>
            </div>
        </body>
        </html>
        ";
        
        $headers = [
            'MIME-Version: 1.0',
            'Content-type: text/html; charset=UTF-8',
            'From: Studio Mismo CRM <noreply@studiomismo.it>',
            'Reply-To: support@studiomismo.it'
        ];
        
        foreach ($adminEmails as $email) {
            mail($email, $subject, $emailHtml, implode("\r\n", $headers));
        }
        
    } catch (Exception $e) {
        error_log("Errore invio email chat admin: " . $e->getMessage());
    }
}

// Gestione invio messaggio
try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Metodo non consentito');
    }

    // DEBUG: Log dei parametri ricevuti
    error_log("Parametri POST ricevuti: " . json_encode($_POST));
    error_log("SESSION client_id: " . ($_SESSION['client_id'] ?? 'NON IMPOSTATO'));

    $ticketId = (int)($_POST['ticket_id'] ?? 0);
    $message = trim($_POST['message'] ?? '');
    $clientId = $_SESSION['client_id'] ?? null;
    
    error_log("Parametri elaborati - Ticket ID: $ticketId, Message length: " . strlen($message) . ", Client ID: $clientId");
    
    if (!$ticketId) {
        throw new Exception('ID ticket mancante');
    }
    
    if (empty($message)) {
        throw new Exception('Messaggio vuoto');
    }
    
    if (!$clientId) {
        throw new Exception('Client ID mancante dalla sessione');
    }
    
    // Verifica che il ticket appartenga al cliente e sia attivo
    $stmt = $pdo->prepare("
        SELECT t.*, ca.contact_id
        FROM tickets t
        JOIN client_access ca ON t.client_id = ca.id
        WHERE t.id = ? AND t.client_id = ?
        AND t.status IN ('aperto', 'in_lavorazione', 'in_attesa_cliente', 'risolto')
    ");
    $stmt->execute([$ticketId, $clientId]);
    $ticket = $stmt->fetch();
    
    if (!$ticket) {
        throw new Exception('Ticket non trovato o non accessibile');
    }
    
    // Crea oggetto cliente per le email
    $currentUser = [
        'id' => $clientId,
        'contact_id' => $ticket['contact_id']
    ];
    
    // Inizia transazione
    $pdo->beginTransaction();
    
    // Inserisci messaggio
    $stmt = $pdo->prepare("
        INSERT INTO ticket_messages (ticket_id, client_id, message, is_internal, created_at)
        VALUES (?, ?, ?, 0, NOW())
    ");
    $stmt->execute([$ticketId, $clientId, $message]);
    $messageId = $pdo->lastInsertId();
    
    // Aggiorna timestamp ticket
    $stmt = $pdo->prepare("UPDATE tickets SET updated_at = NOW() WHERE id = ?");
    $stmt->execute([$ticketId]);
    
    // Log attività
    $stmt = $pdo->prepare("
        INSERT INTO ticket_activity_logs (ticket_id, client_id, action, details, created_at)
        VALUES (?, ?, 'client_message', 'Messaggio inviato tramite chat', NOW())
    ");
    $stmt->execute([$ticketId, $clientId]);
    
    // Commit transazione
    $pdo->commit();
    
    // Invia email di notifica agli admin
    sendAdminChatNotification($pdo, $ticketId, $message, $currentUser);
    
    // Invia email di conferma al cliente
    sendClientMessageConfirmation($pdo, $ticketId, $message, $currentUser);
    
    echo json_encode([
        'success' => true,
        'message' => 'Messaggio inviato con successo'
    ]);
    
} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollback();
    }
    
    error_log("Errore invio messaggio chat: " . $e->getMessage());
    
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>