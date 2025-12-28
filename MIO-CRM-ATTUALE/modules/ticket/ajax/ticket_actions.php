<?php
// File: /modules/ticket/ajax/ticket_actions.php
// Azioni AJAX per gestione ticket

require_once __DIR__ . '/../../../core/includes/auth_helper.php';

header('Content-Type: application/json');

$currentUser = getCurrentUser();

try {
    $dsn = "mysql:host=127.0.0.1;dbname=u706045794_crm_mismo;charset=utf8mb4";
    $pdo = new PDO($dsn, 'u706045794_mismo_crm_new', 'BLQ$>:;*9+h', [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
} catch (Exception $e) {
    die(json_encode(['success' => false, 'error' => 'Database connection failed']));
}

$action = $_POST['action'] ?? $_GET['action'] ?? '';

switch ($action) {
    case 'add_message':
        $ticketId = (int)$_POST['ticket_id'];
        $message = trim($_POST['message']);
        $isInternal = (bool)$_POST['is_internal'];
        
        if (empty($message)) {
            throw new Exception('Messaggio vuoto');
        }
        
        // Inserisci messaggio
        $stmt = $pdo->prepare("
            INSERT INTO ticket_messages (ticket_id, user_id, message, is_internal, created_at)
            VALUES (?, ?, ?, ?, NOW())
        ");
        $stmt->execute([$ticketId, $currentUser['id'], $message, $isInternal]);
        
        // Log attività
        $stmt = $pdo->prepare("
            INSERT INTO ticket_activity_logs (ticket_id, user_id, action, details, created_at)
            VALUES (?, ?, 'message_added', ?, NOW())
        ");
        $stmt->execute([
            $ticketId, 
            $currentUser['id'], 
            $isInternal ? 'Aggiunta nota interna' : 'Inviata risposta al cliente'
        ]);
        
        // Se non è una nota interna, invia notifica al cliente
        if (!$isInternal) {
            sendClientNotification($pdo, $ticketId, 'reply', $message);
        }
        
        echo json_encode(['success' => true]);
        break;
        
    case 'update_ticket':
        $ticketId = (int)$_POST['ticket_id'];
        $status = $_POST['status'];
        $assignedTo = $_POST['assigned_to'] ?: null;
        
        // Ottieni stato precedente
        $stmt = $pdo->prepare("SELECT status, assigned_to FROM tickets WHERE id = ?");
        $stmt->execute([$ticketId]);
        $oldTicket = $stmt->fetch();
        
        // Aggiorna ticket
        $stmt = $pdo->prepare("
            UPDATE tickets 
            SET status = ?, assigned_to = ?, updated_at = NOW()
            WHERE id = ?
        ");
        $stmt->execute([$status, $assignedTo, $ticketId]);
        
        // Log cambio stato
        if ($oldTicket['status'] != $status) {
            $stmt = $pdo->prepare("
                INSERT INTO ticket_activity_logs (ticket_id, user_id, action, old_value, new_value, created_at)
                VALUES (?, ?, 'status_changed', ?, ?, NOW())
            ");
            $stmt->execute([$ticketId, $currentUser['id'], $oldTicket['status'], $status]);
        }
        
        // Log cambio assegnazione
        if ($oldTicket['assigned_to'] != $assignedTo) {
            $stmt = $pdo->prepare("
                INSERT INTO ticket_activity_logs (ticket_id, user_id, action, old_value, new_value, created_at)
                VALUES (?, ?, 'assigned', ?, ?, NOW())
            ");
            $stmt->execute([$ticketId, $currentUser['id'], $oldTicket['assigned_to'], $assignedTo]);
            
            // Invia notifica email all'utente assegnato (se presente)
            if ($assignedTo) {
                sendAssignmentNotification($pdo, $ticketId, $assignedTo);
            }
        }
        
        echo json_encode(['success' => true]);
        break;
        
    case 'add_time':
        $ticketId = (int)$_POST['ticket_id'];
        $minutes = (int)$_POST['minutes'];
        
        if ($minutes <= 0) {
            throw new Exception('Minuti non validi');
        }
        
        // Aggiorna tempo e sottrai dalle ore disponibili del cliente
        $stmt = $pdo->prepare("
            UPDATE tickets t
            JOIN client_access ca ON t.client_id = ca.id
            SET 
                t.time_spent_minutes = t.time_spent_minutes + ?,
                ca.support_hours_used = ca.support_hours_used + ?
            WHERE t.id = ?
        ");
        $hoursToAdd = $minutes / 60;
        $stmt->execute([$minutes, $hoursToAdd, $ticketId]);
        
        // Log tempo
        $stmt = $pdo->prepare("
            INSERT INTO ticket_activity_logs (ticket_id, user_id, action, new_value, details, created_at)
            VALUES (?, ?, 'time_logged', ?, ?, NOW())
        ");
        $stmt->execute([
            $ticketId, 
            $currentUser['id'], 
            $minutes,
            "Aggiunti $minutes minuti di lavoro"
        ]);
        
        echo json_encode(['success' => true]);
        break;
        
    case 'close_ticket':
        $ticketId = (int)$_POST['ticket_id'];
        $closingNotes = trim($_POST['closing_notes']);
        
        if (empty($closingNotes)) {
            throw new Exception('Le note di chiusura sono obbligatorie');
        }
        
        // Ottieni info ticket per email
        $stmt = $pdo->prepare("
            SELECT t.*, ca.username, lc.name as client_name, lc.email as client_email
            FROM tickets t
            JOIN client_access ca ON t.client_id = ca.id
            JOIN leads_contacts lc ON t.contact_id = lc.id
            WHERE t.id = ?
        ");
        $stmt->execute([$ticketId]);
        $ticket = $stmt->fetch();
        
        if (!$ticket) {
            throw new Exception('Ticket non trovato');
        }
        
        // Chiudi ticket
        $stmt = $pdo->prepare("
            UPDATE tickets 
            SET status = 'chiuso', 
                closing_notes = ?,
                closed_at = NOW(),
                updated_at = NOW()
            WHERE id = ?
        ");
        $stmt->execute([$closingNotes, $ticketId]);
        
        // Log chiusura
        $stmt = $pdo->prepare("
            INSERT INTO ticket_activity_logs (ticket_id, user_id, action, details, created_at)
            VALUES (?, ?, 'closed', ?, NOW())
        ");
        $stmt->execute([$ticketId, $currentUser['id'], $closingNotes]);
        
        // Invia email al cliente
        sendTicketClosedEmail($ticket, $closingNotes, $currentUser);
        
        // Crea notifica per il cliente
        sendClientNotification($pdo, $ticketId, 'ticket_closed', 
            "Il ticket #{$ticket['ticket_number']} è stato chiuso: $closingNotes");
        
        echo json_encode(['success' => true]);
        break;
        
    default:
        throw new Exception('Azione non valida');
}

// Funzione invio notifica cliente
function sendClientNotification($pdo, $ticketId, $type, $message) {
    try {
        // Ottieni info ticket
        $stmt = $pdo->prepare("
            SELECT t.*, ca.id as client_access_id, ca.username
            FROM tickets t
            JOIN client_access ca ON t.client_id = ca.id
            WHERE t.id = ?
        ");
        $stmt->execute([$ticketId]);
        $ticket = $stmt->fetch();
        
        if ($ticket) {
            // Crea notifica per il cliente
            $stmt = $pdo->prepare("
                INSERT INTO client_notifications (
                    client_access_id, title, message, type, related_id, related_type, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, NOW())
            ");
            
            $title = $type === 'ticket_closed' 
                ? "Ticket #{$ticket['ticket_number']} - Chiuso"
                : "Risposta al ticket #{$ticket['ticket_number']}";
            
            $notifMessage = substr($message, 0, 200) . (strlen($message) > 200 ? '...' : '');
            
            $stmt->execute([
                $ticket['client_access_id'],
                $title,
                $notifMessage,
                'ticket',
                $ticketId,
                $type === 'ticket_closed' ? 'ticket_closed' : 'ticket_reply'
            ]);
        }
    } catch (Exception $e) {
        error_log("Errore invio notifica cliente: " . $e->getMessage());
    }
}

function sendClientTicketNotification($pdo, $ticketId, $message, $adminUser) {
    try {
        // Carica dettagli ticket e cliente
        $stmt = $pdo->prepare("
            SELECT t.*, lc.name as client_name, lc.email as client_email,
                   ca.username as client_username
            FROM tickets t
            JOIN client_access ca ON t.client_id = ca.id
            JOIN leads_contacts lc ON ca.contact_id = lc.id
            WHERE t.id = ?
        ");
        $stmt->execute([$ticketId]);
        $ticket = $stmt->fetch();
        
        if (!$ticket || !$ticket['client_email']) return;
        
        $subject = "Risposta al Ticket #{$ticket['ticket_number']} - Studio Mismo";
        
        $emailContent = "
        <html>
        <body style='font-family: Arial, sans-serif; color: #333;'>
            <div style='max-width: 600px; margin: 0 auto; background: #fff; border: 1px solid #ddd;'>
                <div style='background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px;'>
                    <h2>Nuova Risposta dal Supporto</h2>
                    <div style='font-size: 16px;'>Ticket #{$ticket['ticket_number']}</div>
                </div>
                
                <div style='padding: 20px;'>
                    <p>Ciao <strong>{$ticket['client_name']}</strong>,</p>
                    
                    <p>Hai ricevuto una nuova risposta per il ticket <strong>#{$ticket['ticket_number']}</strong>:</p>
                    
                    <div style='background: #f8fafc; padding: 15px; border-left: 4px solid #667eea; margin: 20px 0;'>
                        <h4 style='margin-top: 0;'>Oggetto: {$ticket['subject']}</h4>
                        <p style='color: #666; margin-bottom: 0;'>Tipo: " . ucfirst($ticket['support_type']) . " | Priorità: " . ucfirst($ticket['priority']) . "</p>
                    </div>
                    
                    <div style='background: #ffffff; border: 1px solid #e5e7eb; padding: 15px; border-radius: 6px;'>
                        <h4>Risposta del nostro team:</h4>
                        <p style='color: #374151; line-height: 1.6;'>" . nl2br(htmlspecialchars($message)) . "</p>
                        <div style='font-size: 12px; color: #9ca3af; margin-top: 10px;'>
                            Risposta di: {$adminUser['first_name']} {$adminUser['last_name']} - " . date('H:i d/m/Y') . "
                        </div>
                    </div>
                    
                    <div style='text-align: center; margin: 30px 0;'>
                        <a href='https://portale.studiomismo.it/client.php' 
                           style='background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;'>
                            Visualizza e Rispondi
                        </a>
                    </div>
                    
                    <p style='color: #6b7280; font-size: 14px;'>
                        Puoi rispondere direttamente dalla tua dashboard cliente. 
                        Il team di Studio Mismo è sempre a tua disposizione per qualsiasi necessità.
                    </p>
                </div>
                
                <div style='background: #f9fafb; padding: 15px; text-align: center; font-size: 12px; color: #6b7280;'>
                    Questa email è stata inviata automaticamente. Non rispondere a questa email.
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
        
        mail($ticket['client_email'], $subject, $emailContent, implode("\r\n", $headers));
        
    } catch (Exception $e) {
        error_log("Errore invio email cliente: " . $e->getMessage());
    }
}




// Funzione invio notifica assegnazione
function sendAssignmentNotification($pdo, $ticketId, $userId) {
    try {
        // Ottieni info ticket e utente
        $stmt = $pdo->prepare("
            SELECT t.*, lc.name as client_name, u.email as user_email, u.first_name
            FROM tickets t
            JOIN leads_contacts lc ON t.contact_id = lc.id
            JOIN users u ON u.id = ?
            WHERE t.id = ?
        ");
        $stmt->execute([$userId, $ticketId]);
        $data = $stmt->fetch();
        
        if ($data && $data['user_email']) {
            $subject = "Ticket #{$data['ticket_number']} - Assegnato a te";
            
            $message = "
            <html>
            <body style='font-family: sans-serif;'>
                <h3>Ticket Assegnato</h3>
                <p>Ciao {$data['first_name']},</p>
                <p>Ti è stato assegnato un nuovo ticket:</p>
                <ul>
                    <li><strong>Numero:</strong> #{$data['ticket_number']}</li>
                    <li><strong>Cliente:</strong> {$data['client_name']}</li>
                    <li><strong>Oggetto:</strong> {$data['subject']}</li>
                    <li><strong>Priorità:</strong> {$data['priority']}</li>
                </ul>
                <p>Accedi al CRM per gestire il ticket.</p>
            </body>
            </html>
            ";
            
            $headers = [
                'MIME-Version: 1.0',
                'Content-type: text/html; charset=UTF-8',
                'From: Studio Mismo CRM <noreply@studiomismo.it>'
            ];
            
            mail($data['user_email'], $subject, $message, implode("\r\n", $headers));
        }
    } catch (Exception $e) {
        error_log("Errore invio notifica assegnazione: " . $e->getMessage());
    }
}

// Funzione invio email chiusura ticket
function sendTicketClosedEmail($ticket, $closingNotes, $currentUser) {
    $subject = "Ticket #{$ticket['ticket_number']} - Chiuso";
    
    $message = "
    <html>
    <head>
        <style>
            body { font-family: 'Segoe UI', sans-serif; line-height: 1.6; color: #37352f; }
            .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
            .header { background: #37352f; color: white; padding: 20px; text-align: center; }
            .content { padding: 30px; background: white; }
            .notes { background: #f7f7f5; padding: 20px; border-left: 4px solid #37352f; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            .info-box { background: #f7f7f5; padding: 16px; border-radius: 6px; margin: 16px 0; }
        </style>
    </head>
    <body>
        <div class='container'>
            <div class='header'>
                <h2>🎫 Ticket Risolto</h2>
            </div>
            <div class='content'>
                <p>Gentile <strong>{$ticket['client_name']}</strong>,</p>
                
                <p>Il ticket <strong>#{$ticket['ticket_number']}</strong> è stato chiuso con successo dal nostro team di supporto.</p>
                
                <div class='notes'>
                    <h3>📝 Note di chiusura:</h3>
                    <p>" . nl2br(htmlspecialchars($closingNotes)) . "</p>
                </div>
                
                <div class='info-box'>
                    <h3>📋 Riepilogo ticket:</h3>
                    <ul>
                        <li><strong>Oggetto:</strong> " . htmlspecialchars($ticket['subject']) . "</li>
                        <li><strong>Tipo:</strong> " . htmlspecialchars($ticket['support_type']) . "</li>
                        <li><strong>Priorità:</strong> " . htmlspecialchars($ticket['priority']) . "</li>
                        <li><strong>Tempo impiegato:</strong> " . formatTime($ticket['time_spent_minutes']) . "</li>
                        <li><strong>Chiuso da:</strong> {$currentUser['first_name']} {$currentUser['last_name']}</li>
                        <li><strong>Data chiusura:</strong> " . date('d/m/Y H:i') . "</li>
                    </ul>
                </div>
                
                <p>Se hai bisogno di ulteriore assistenza, non esitare ad aprire un nuovo ticket tramite il portale cliente.</p>
                
                <p>Cordiali saluti,<br>
                <strong>Team Studio Mismo</strong></p>
            </div>
            <div class='footer'>
                <p>Questa è una email automatica, non rispondere a questo messaggio.</p>
                <p>Per assistenza scrivi a: <a href='mailto:support@studiomismo.it'>support@studiomismo.it</a></p>
            </div>
        </div>
    </body>
    </html>
    ";
    
    $headers = [
        'MIME-Version: 1.0',
        'Content-type: text/html; charset=UTF-8',
        'From: Studio Mismo <noreply@studiomismo.it>',
        'Reply-To: support@studiomismo.it'
    ];
    
    mail($ticket['client_email'], $subject, $message, implode("\r\n", $headers));
}

// Funzione formattazione tempo
function formatTime($minutes) {
    if (!$minutes || $minutes <= 0) return '0 minuti';
    
    $hours = floor($minutes / 60);
    $mins = $minutes % 60;
    
    if ($hours > 0 && $mins > 0) {
        return "{$hours}h {$mins}m";
    } elseif ($hours > 0) {
        return "{$hours}h";
    } else {
        return "{$mins} minuti";
    }
}
?>