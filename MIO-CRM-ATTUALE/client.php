<?php
// File: /client.php
// Dashboard cliente completa - CRM Studio Mismo

session_start();

// Verifica autenticazione cliente
if (!isset($_SESSION['logged_in']) || !$_SESSION['logged_in'] || 
    !isset($_SESSION['user_type']) || $_SESSION['user_type'] !== 'client') {
    header('Location: /');
    exit;
}

// Verifica che sia un accesso tipo cliente (non preventivo)
$accessType = $_SESSION['client_access_type'] ?? '';
if ($accessType !== 'cliente') {
    header('Location: /preventivo.php');
    exit;
}

// Connessione database diretta
try {
    $dsn = "mysql:host=127.0.0.1;dbname=u706045794_crm_mismo;charset=utf8mb4";
    $pdo = new PDO($dsn, 'u706045794_mismo_crm_new', 'BLQ$>:;*9+h', [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
} catch (Exception $e) {
    die('Errore connessione database: ' . $e->getMessage());
}

// Ottieni informazioni cliente
$clientId = $_SESSION['client_id'];
$clientUsername = $_SESSION['client_username'];

// Assicurati che client_access_id sia impostato per le API
if (!isset($_SESSION['client_access_id'])) {
    $_SESSION['client_access_id'] = $clientId;
}

// Carica informazioni accesso cliente
$stmt = $pdo->prepare("
    SELECT ca.*, 
           lc.name as client_name, 
           lc.email as client_email, 
           lc.phone as client_phone, 
           lc.address as client_address,
           lc.partita_iva, 
           lc.codice_fiscale,
           ca.project_name,
           ca.project_description,
           ca.project_budget,
           ca.project_start_date,
           ca.project_end_date,
           ca.monthly_fee,
           ca.bespoke_details,
           ca.support_hours_included,
           ca.support_hours_used
    FROM client_access ca
    INNER JOIN leads_contacts lc ON ca.contact_id = lc.id
    WHERE ca.id = ?
");
$stmt->execute([$clientId]);
$currentUser = $stmt->fetch();

if (!$currentUser) {
    die('Errore: Account non trovato');
}

// Fallback per company name se non presente
if (!isset($currentUser['company'])) {
    $currentUser['company'] = $currentUser['client_name'];
}

// Check per notifica preventivo non letta E non ancora gestita (accettata/rifiutata)
$hasUnreadQuoteNotification = false;
$quoteNotificationData = null;
try {
    $stmt = $pdo->prepare("
        SELECT cn.*, q.quote_number, q.title as quote_title, q.status as quote_status
        FROM client_notifications cn
        LEFT JOIN quotes q ON cn.related_id = q.id AND cn.related_type = 'quote'
        WHERE cn.client_access_id = ?
        AND cn.related_type = 'quote'
        AND cn.is_read = 0
        AND q.status IN ('sent', 'viewed')
        ORDER BY cn.created_at DESC
        LIMIT 1
    ");
    $stmt->execute([$clientId]);
    $quoteNotification = $stmt->fetch();

    if ($quoteNotification) {
        $hasUnreadQuoteNotification = true;
        $quoteNotificationData = $quoteNotification;
    }
} catch (Exception $e) {
    // Ignora errori se tabella non esiste
}

// ===== CARICAMENTO PREVENTIVI ACCETTATI DEL CLIENTE =====
$clientQuotes = [];
$quotesTotalBudget = 0;
try {
    // Carica tutti i preventivi accettati per questo cliente
    $stmt = $pdo->prepare("
        SELECT q.*,
               u.first_name as created_by_name,
               u.last_name as created_by_surname
        FROM quotes q
        LEFT JOIN users u ON q.created_by = u.id
        WHERE q.contact_id = ?
        AND q.status = 'accepted'
        ORDER BY q.accepted_date DESC
    ");
    $stmt->execute([$currentUser['contact_id']]);
    $clientQuotes = $stmt->fetchAll();

    // Calcola il budget totale con sconti applicati
    foreach ($clientQuotes as $quote) {
        $quoteTotal = (float)$quote['subtotal'];

        // Applica sconto base se presente
        if (!empty($quote['discount_amount'])) {
            $quoteTotal -= (float)$quote['discount_amount'];
        }

        // Applica sconto pagamento se è stato selezionato un metodo
        if (!empty($quote['selected_payment_option'])) {
            $discountField = '';
            switch($quote['selected_payment_option']) {
                case 'one_time':
                    $discountField = 'one_time_discount';
                    break;
                case 'payment_2':
                    $discountField = 'payment_2_discount';
                    break;
                case 'payment_3':
                    $discountField = 'payment_3_discount';
                    break;
                case 'payment_4':
                    $discountField = 'payment_4_discount';
                    break;
            }

            if ($discountField && !empty($quote[$discountField])) {
                $paymentDiscount = ((float)$quote['subtotal'] * (float)$quote[$discountField]) / 100;
                $quoteTotal -= $paymentDiscount;
            }
        }

        // Aggiungi IVA
        if (!empty($quote['tax_rate'])) {
            $quoteTotal += ($quoteTotal * (float)$quote['tax_rate']) / 100;
        }

        $quotesTotalBudget += $quoteTotal;
    }

    error_log("Cliente {$currentUser['client_name']} - Preventivi trovati: " . count($clientQuotes) . " - Budget totale: €" . number_format($quotesTotalBudget, 2));

} catch (Exception $e) {
    error_log("Errore caricamento preventivi cliente: " . $e->getMessage());
}

// FUNZIONI EMAIL
function sendAdminTicketNotification($pdo, $ticketId, $client) {
    try {
        // Carica dettagli ticket
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
        
        // Email admin (modifica con i tuoi indirizzi)
        $adminEmails = [
            'davide@studiomismo.it',
            'stefano@studiomismo.it'
        ];
        
        $subject = "Nuovo Ticket #{$ticket['ticket_number']} - {$ticket['client_name']}";
        
        $message = "
        <html>
        <body style='font-family: Arial, sans-serif; color: #333;'>
            <div style='max-width: 600px; margin: 0 auto; background: #fff;'>
                <div style='background: #37352f; color: white; padding: 20px; text-align: center;'>
                    <h2>Nuovo Ticket di Supporto</h2>
                    <div style='font-size: 18px;'>#{$ticket['ticket_number']}</div>
                </div>
                
                <div style='padding: 30px;'>
                    <div style='background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;'>
                        <h3>Dettagli Ticket</h3>
                        <p><strong>Cliente:</strong> {$ticket['client_name']}</p>
                        <p><strong>Email:</strong> {$ticket['client_email']}</p>
                        <p><strong>Tipo:</strong> " . ucfirst($ticket['support_type']) . "</p>
                        <p><strong>Priorità:</strong> " . ucfirst($ticket['priority']) . "</p>
                        <p><strong>Creato:</strong> " . date('d/m/Y H:i', strtotime($ticket['created_at'])) . "</p>
                    </div>
                    
                    <div style='background: #fff; border: 1px solid #ddd; padding: 20px; border-radius: 8px;'>
                        <h4>Descrizione:</h4>
                        <p>" . nl2br(htmlspecialchars($ticket['description'])) . "</p>
                    </div>
                    
                    <div style='text-align: center; margin-top: 30px;'>
                        <a href='https://crm.studiomismo.it/modules/ticket/' 
                           style='background: #37352f; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;'>
                            Gestisci Ticket
                        </a>
                    </div>
                    
                    " . ($ticket['priority'] === 'urgente' ? "
                    <div style='background: #fee2e2; border: 1px solid #fecaca; color: #991b1b; padding: 12px; border-radius: 4px; margin-top: 16px;'>
                        <strong>PRIORITÀ URGENTE:</strong> Questo ticket richiede attenzione immediata!
                    </div>
                    " : "") . "
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
            mail($email, $subject, $message, implode("\r\n", $headers));
        }
        
    } catch (Exception $e) {
        error_log("Errore invio email admin: " . $e->getMessage());
    }
}

function sendClientMessageConfirmation($pdo, $ticketId, $message, $client) {
    try {
        // Carica dettagli ticket
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
                    
                    <div style='background: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 6px; padding: 15px; margin: 20px 0;'>
                        <h4 style='margin-top: 0; color: #0369a1;'>Cosa succede ora?</h4>
                        <ul style='margin: 0; padding-left: 20px; color: #0c4a6e;'>
                            <li>Il nostro team di supporto è stato notificato</li>
                            <li>Ti risponderemo il prima possibile</li>
                            <li>Riceverai un'email quando avremo una risposta</li>
                        </ul>
                    </div>
                    
                    <div style='text-align: center; margin: 30px 0;'>
                        <a href='https://portale.studiomismo.it/client.php' 
                           style='background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;'>
                            Torna alla Dashboard
                        </a>
                    </div>
                    
                    <p style='color: #6b7280; font-size: 14px;'>
                        Puoi continuare a rispondere direttamente dalla chat nella tua dashboard cliente. 
                        Il team di Studio Mismo è sempre a tua disposizione per qualsiasi necessità.
                    </p>
                </div>
                
                <div style='background: #f9fafb; padding: 15px; text-align: center; font-size: 12px; color: #6b7280;'>
                    Questa email è stata inviata automaticamente. Per assistenza scrivi a: <a href='mailto:support@studiomismo.it'>support@studiomismo.it</a>
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
        // Carica dettagli ticket
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
        
        // Email admin
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
                        <p><strong>Stato:</strong> " . ucfirst(str_replace('_', ' ', $ticket['status'])) . "</p>
                    </div>
                    
                    <div style='background: #ffffff; border: 1px solid #e5e7eb; padding: 15px; border-radius: 6px;'>
                        <h4>Messaggio del cliente:</h4>
                        <p style='font-style: italic; color: #374151; line-height: 1.6;'>" . nl2br(htmlspecialchars($message)) . "</p>
                        <div style='font-size: 12px; color: #9ca3af; margin-top: 10px; padding-top: 10px; border-top: 1px solid #f3f4f6;'>
                            Inviato alle: " . date('H:i d/m/Y') . " | 
                            Da: {$ticket['client_email']}
                        </div>
                    </div>
                    
                    <div style='text-align: center; margin-top: 20px;'>
                        <a href='https://crm.studiomismo.it/modules/ticket/' 
                           style='background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;'>
                            Rispondi nel CRM
                        </a>
                    </div>
                    
                    " . ($ticket['priority'] === 'urgente' ? "
                    <div style='background: #fee2e2; border: 1px solid #fecaca; color: #991b1b; padding: 12px; border-radius: 4px; margin-top: 16px;'>
                        <strong>PRIORITÀ URGENTE:</strong> Questo ticket richiede attenzione immediata!
                    </div>
                    " : "") . "
                </div>
                
                <div style='background: #f9fafb; padding: 15px; text-align: center; font-size: 12px; color: #6b7280;'>
                    Accedi al <strong>CRM Studio Mismo</strong> per gestire questo ticket | 
                    <a href='mailto:support@studiomismo.it'>support@studiomismo.it</a>
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

// GESTIONE FORM TICKET SUPPORTO - SISTEMA COMPLETO
$successMessage = '';
$errorMessage = '';

// Controlla messaggi dalla sessione (per evitare loop)
if (isset($_SESSION['ticket_success'])) {
    $successMessage = $_SESSION['ticket_success'];
    unset($_SESSION['ticket_success']);
}

if (isset($_SESSION['ticket_error'])) {
    $errorMessage = $_SESSION['ticket_error'];
    unset($_SESSION['ticket_error']);
}

if (isset($_SESSION['chat_success'])) {
    $successMessage = $_SESSION['chat_success'];
    unset($_SESSION['chat_success']);
}

if (isset($_SESSION['chat_error'])) {
    $errorMessage = $_SESSION['chat_error'];
    unset($_SESSION['chat_error']);
}

// Gestione invio messaggio chat
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'send_chat_message') {
    
    // DEBUG: Log completo di quello che arriva
    error_log("=== DEBUG CHAT MESSAGE ===");
    error_log("POST data: " . print_r($_POST, true));
    error_log("Session client_id: " . ($_SESSION['client_id'] ?? 'NON IMPOSTATO'));
    
    // Se è una richiesta AJAX, restituisci JSON
    $isAjax = isset($_POST['ajax']) && $_POST['ajax'] === '1';
    
    try {
        $ticketId = (int)($_POST['ticket_id'] ?? 0);
        $message = trim($_POST['message'] ?? '');
        
        error_log("Ticket ID: $ticketId");
        error_log("Message: '$message' (length: " . strlen($message) . ")");
        
        if (!$ticketId) {
            throw new Exception('ID ticket mancante');
        }
        
        if (empty($message)) {
            throw new Exception('Il messaggio non può essere vuoto');
        }
        
        // Verifica che il ticket appartenga al cliente e sia attivo
        $stmt = $pdo->prepare("
            SELECT id, ticket_number, subject, status 
            FROM tickets 
            WHERE id = ? AND client_id = ?
            AND status IN ('aperto', 'in_lavorazione', 'in_attesa_cliente', 'risolto')
        ");
        $stmt->execute([$ticketId, $currentUser['id']]);
        $ticket = $stmt->fetch();
        
        if (!$ticket) {
            throw new Exception('Ticket non trovato o non accessibile');
        }
        
        // Inserisci messaggio
        $stmt = $pdo->prepare("
            INSERT INTO ticket_messages (ticket_id, client_id, message, is_internal, created_at)
            VALUES (?, ?, ?, 0, NOW())
        ");
        $stmt->execute([$ticketId, $currentUser['id'], $message]);
        $messageId = $pdo->lastInsertId();
        
        // Aggiorna timestamp ticket
        $stmt = $pdo->prepare("UPDATE tickets SET updated_at = NOW() WHERE id = ?");
        $stmt->execute([$ticketId]);
        
        // Log attività
        $stmt = $pdo->prepare("
            INSERT INTO ticket_activity_logs (ticket_id, client_id, action, details, created_at)
            VALUES (?, ?, 'client_message', 'Messaggio inviato tramite chat', NOW())
        ");
        $stmt->execute([$ticketId, $currentUser['id']]);
        
        // Invia email di notifica agli admin
        sendAdminChatNotification($pdo, $ticketId, $message, $currentUser);
        
        // Invia email di conferma al cliente
        sendClientMessageConfirmation($pdo, $ticketId, $message, $currentUser);
        
        if ($isAjax) {
            header('Content-Type: application/json');
            echo json_encode(['success' => true, 'message' => 'Messaggio inviato']);
            exit;
        } else {
            $_SESSION['chat_success'] = 'Messaggio inviato con successo';
            header('Location: ' . $_SERVER['REQUEST_URI'] . '#chat-widget');
            exit;
        }
        
    } catch (Exception $e) {
        if ($isAjax) {
            header('Content-Type: application/json');
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
            exit;
        } else {
            $_SESSION['chat_error'] = $e->getMessage();
            header('Location: ' . $_SERVER['REQUEST_URI']);
            exit;
        }
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'create_ticket') {
    try {
        $supportType = $_POST['support_type'] ?? '';
        $description = trim($_POST['description'] ?? '');
        $priority = $_POST['priority'] ?? 'normale';
        
        // Validazioni
        if (empty($supportType) || empty($description) || empty($priority)) {
            throw new Exception('Tutti i campi sono obbligatori');
        }
        
        // Verifica ore supporto disponibili
        if ($currentUser['support_hours_included'] > 0) {
            $hoursUsed = (float)$currentUser['support_hours_used'];
            $hoursIncluded = (int)$currentUser['support_hours_included'];
            
            if ($hoursUsed >= $hoursIncluded) {
                throw new Exception('Hai esaurito le ore di supporto incluse nel tuo contratto. Contatta il nostro team per pacchetti aggiuntivi.');
            }
        }
        
        // Genera numero ticket progressivo
        $year = date('Y');
        $stmt = $pdo->prepare("SELECT COUNT(*) + 1 as num FROM tickets WHERE YEAR(created_at) = ?");
        $stmt->execute([$year]);
        $ticketNum = $stmt->fetch()['num'];
        $ticketNumber = sprintf('T%s-%04d', $year, $ticketNum);
        
        // Genera oggetto automatico
        $subjectMap = [
            'tecnico' => 'Richiesta Supporto Tecnico',
            'design' => 'Richiesta Modifica Design', 
            'contenuti' => 'Gestione Contenuti',
            'fatturazione' => 'Questione Fatturazione',
            'altro' => 'Richiesta Supporto Generale'
        ];
        $subject = $subjectMap[$supportType] ?? 'Richiesta Supporto';
        
        // Inserisci ticket nel database
        $stmt = $pdo->prepare("
    INSERT INTO tickets (
        ticket_number, client_id, contact_id, support_type, 
        subject, description, priority, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'aperto', NOW())
");

$stmt->execute([
    $ticketNumber,
    $currentUser['id'], 
    $currentUser['contact_id'],
    $supportType,
    $subject,
    $description,
    $priority
]);

$ticketId = $pdo->lastInsertId();

// NOTIFICA ADMIN DEL NUOVO TICKET
try {
    // Ottieni tutti gli admin attivi
    $stmt = $pdo->prepare("SELECT id FROM users WHERE role IN ('admin', 'super_admin') AND is_active = 1");
    $stmt->execute();
    $admins = $stmt->fetchAll(PDO::FETCH_COLUMN);
    
    if (!empty($admins)) {
        // Ottieni nome cliente per la notifica
        $stmt = $pdo->prepare("SELECT name FROM leads_contacts WHERE id = ?");
        $stmt->execute([$currentUser['contact_id']]);
        $clientName = $stmt->fetchColumn() ?: 'Cliente sconosciuto';
        
        // Emoji per priorità
        $priorityEmojis = [
            'bassa' => '🟢',
            'normale' => '🟡', 
            'alta' => '🟠',
            'urgente' => '🔴'
        ];
        $priorityEmoji = $priorityEmojis[$priority] ?? '🟡';
        
        // Crea notifica per ogni admin
        foreach ($admins as $adminId) {
            $stmt = $pdo->prepare("
                INSERT INTO notifications (user_id, title, message, type, related_id, related_type, created_at) 
                VALUES (?, ?, ?, ?, ?, ?, NOW())
            ");
            
            $stmt->execute([
                $adminId,
                "Nuovo Ticket #{$ticketNumber}",
                "{$priorityEmoji} {$subject} - Da: {$clientName}",
                'ticket',
                $ticketId,
                'ticket'
            ]);
        }
        
        // Log per debug
        error_log("Notifiche create per nuovo ticket #{$ticketNumber} a " . count($admins) . " admin(s)");
    }
} catch (Exception $e) {
    // Non fermare l'esecuzione se le notifiche falliscono
    error_log("Errore creazione notifiche per ticket #{$ticketNumber}: " . $e->getMessage());
}
        
        // Log creazione ticket
        $stmt = $pdo->prepare("
            INSERT INTO ticket_activity_logs (
                ticket_id, client_id, action, details, created_at
            ) VALUES (?, ?, 'ticket_created', ?, NOW())
        ");
        $stmt->execute([
            $ticketId, 
            $currentUser['id'],
            "Ticket creato dal cliente - Tipo: $supportType, Priorità: $priority"
        ]);
        
        // Messaggio iniziale del ticket
        $stmt = $pdo->prepare("
            INSERT INTO ticket_messages (
                ticket_id, client_id, message, is_internal, created_at
            ) VALUES (?, ?, ?, 0, NOW())
        ");
        $stmt->execute([
            $ticketId,
            $currentUser['id'], 
            $description
        ]);
        
        // Invia email agli admin
        sendAdminTicketNotification($pdo, $ticketId, $currentUser);
        
        // Salva messaggio in sessione e redirigi (POST-redirect-GET pattern)
        $_SESSION['ticket_success'] = "Ticket #$ticketNumber creato con successo! Riceverai aggiornamenti via email.";
        
        // FORZA il recaricamento per mostrare immediatamente la chat
        // Aggiungi un piccolo delay per assicurare che il database sia aggiornato
        usleep(100000); // 100ms delay
        
        // Redirect per evitare il loop
        header('Location: ' . $_SERVER['REQUEST_URI'] . '?new_ticket=' . $ticketId);
        exit;
        
    } catch (Exception $e) {
        // Salva errore in sessione e redirigi
        $_SESSION['ticket_error'] = $e->getMessage();
        header('Location: ' . $_SERVER['REQUEST_URI']);
        exit;
    }
}

// Controllo ore supporto per disabilitare form se necessario
$canCreateTicket = true;
$disableReason = '';

// Controlla solo se ci sono ore di supporto limitate (> 0)
if (isset($currentUser['support_hours_included']) && $currentUser['support_hours_included'] > 0) {
    $hoursUsed = (float)($currentUser['support_hours_used'] ?? 0);
    $hoursIncluded = (int)$currentUser['support_hours_included'];
    
    // Disabilita solo se le ore sono completamente esaurite
    if ($hoursUsed >= $hoursIncluded) {
        $canCreateTicket = false;
        $disableReason = 'Hai esaurito le ore di supporto incluse nel tuo contratto. Contatta il nostro team per informazioni su pacchetti aggiuntivi.';
    }
} 
// Se support_hours_included è 0 o NULL = supporto illimitato, sempre abilitato

// Carica ticket attivi per la chat
$activeTickets = [];
$currentChatTicket = null;
$newTicketId = isset($_GET['new_ticket']) ? (int)$_GET['new_ticket'] : null;

try {
    // Query migliorata per includere tutti i ticket attivi
    $stmt = $pdo->prepare("
        SELECT t.id, t.ticket_number, t.subject, t.status, t.priority, t.support_type,
               t.created_at, t.updated_at,
               COALESCE(unread_count.unread_messages, 0) as unread_messages
        FROM tickets t
        LEFT JOIN (
            SELECT ticket_id, COUNT(*) as unread_messages
            FROM ticket_messages tm
            WHERE tm.user_id IS NOT NULL 
            AND tm.is_internal = 0
            AND (tm.client_read_at IS NULL OR tm.client_read_at < tm.created_at)
            GROUP BY ticket_id
        ) unread_count ON t.id = unread_count.ticket_id
        WHERE t.client_id = ? 
        AND t.status IN ('aperto', 'in_lavorazione', 'in_attesa_cliente', 'risolto')
        ORDER BY t.updated_at DESC
    ");
    $stmt->execute([$currentUser['id']]);
    $activeTickets = $stmt->fetchAll();
    
    // Se c'è un nuovo ticket specifico, mettilo come primo
    if ($newTicketId) {
        foreach ($activeTickets as $index => $ticket) {
            if ($ticket['id'] == $newTicketId) {
                // Sposta il nuovo ticket in prima posizione
                $newTicket = array_splice($activeTickets, $index, 1)[0];
                array_unshift($activeTickets, $newTicket);
                break;
            }
        }
    }
    
    // Prendi il primo ticket attivo come chat corrente
    $currentChatTicket = $activeTickets[0] ?? null;
    
    // DEBUG: Verifica se il ticket corrente è ancora valido
    if ($currentChatTicket && $currentChatTicket['status'] === 'chiuso') {
        error_log("ATTENZIONE: Ticket #{$currentChatTicket['ticket_number']} è chiuso ma ancora in lista attivi");
        $currentChatTicket = null; // Forza la chiusura della chat
    }
    
    // Debug: Log del ticket corrente
    if ($currentChatTicket) {
        error_log("Chat ticket caricato: #" . $currentChatTicket['ticket_number'] . " (ID: " . $currentChatTicket['id'] . ")");
    } else {
        error_log("Nessun ticket attivo trovato per client_id: " . $currentUser['id']);
        
        // Se non ci sono ticket attivi ma c'era un parametro new_ticket, proviamo a caricarlo comunque
        if ($newTicketId) {
            $stmt = $pdo->prepare("
                SELECT t.id, t.ticket_number, t.subject, t.status, t.priority, t.support_type,
                       t.created_at, t.updated_at, 0 as unread_messages
                FROM tickets t
                WHERE t.id = ? AND t.client_id = ?
            ");
            $stmt->execute([$newTicketId, $currentUser['id']]);
            $currentChatTicket = $stmt->fetch() ?: null;
            
            if ($currentChatTicket) {
                error_log("Forzato caricamento nuovo ticket: #" . $currentChatTicket['ticket_number']);
            }
        }
    }
    
} catch (Exception $e) {
    error_log("Errore caricamento chat tickets: " . $e->getMessage());
}

// Carica messaggi per la chat corrente
$chatMessages = [];
if ($currentChatTicket) {
    try {
        $stmt = $pdo->prepare("
            SELECT tm.*, 
                   u.first_name as admin_name,
                   DATE_FORMAT(tm.created_at, '%H:%i') as time_formatted,
                   DATE_FORMAT(tm.created_at, '%Y-%m-%d') as date_formatted
            FROM ticket_messages tm
            LEFT JOIN users u ON tm.user_id = u.id
            WHERE tm.ticket_id = ? AND tm.is_internal = 0
            ORDER BY tm.created_at ASC
        ");
        $stmt->execute([$currentChatTicket['id']]);
        $chatMessages = $stmt->fetchAll();
        
        // Segna messaggi come letti dal cliente
        $stmt = $pdo->prepare("
            UPDATE ticket_messages 
            SET client_read_at = NOW() 
            WHERE ticket_id = ? AND user_id IS NOT NULL AND client_read_at IS NULL
        ");
        $stmt->execute([$currentChatTicket['id']]);
        
    } catch (Exception $e) {
        error_log("Errore caricamento messaggi chat: " . $e->getMessage());
    }
}

// Prossimi appuntamenti - SOLO categoria "appuntamento clienti"
$appointments = [];
try {
    $stmt = $pdo->prepare("
        SELECT ae.*, ac.name as category_name, ac.color as category_color
        FROM agenda_events ae
        LEFT JOIN agenda_categories ac ON ae.category_id = ac.id
        WHERE ae.client_id = ?
        AND ae.start_datetime >= NOW()
        AND (ae.visible_to_client = 1 OR ae.visible_to_client IS NULL)
        AND (ae.status != 'cancelled' OR ae.status IS NULL)
        AND LOWER(ac.name) = 'appuntamenti clienti'  -- CORRETTO: con 'i' finale
        ORDER BY ae.start_datetime ASC
        LIMIT 3
    ");
    $stmt->execute([$currentUser['contact_id']]);
    $appointments = $stmt->fetchAll();
    
} catch (Exception $e) {
    $appointments = [];
    error_log("Errore agenda_events: " . $e->getMessage());
}

// Tasks - TUTTE incluse quelle completate
$tasks = [];
try {
    $stmt = $pdo->prepare("
        SELECT t.*, tc.name as category_name, tc.color as category_color,
               u.first_name as assigned_name
        FROM tasks t
        LEFT JOIN task_categories tc ON t.category_id = tc.id
        LEFT JOIN users u ON t.assigned_to = u.id
        WHERE t.client_id = ?
        AND (t.visible_to_client = 1 OR t.visible_to_client IS NULL)
        ORDER BY 
            CASE 
                WHEN t.status = 'completed' THEN 1 
                ELSE 0 
            END,
            t.priority ASC, 
            t.deadline ASC
        LIMIT 20
    ");
    $stmt->execute([$currentUser['contact_id']]);
    $tasks = $stmt->fetchAll();
    
} catch (Exception $e) {
    $tasks = [];
    error_log("Errore tasks: " . $e->getMessage());
}

// Fatture REALI dal database con calcoli automatici
$invoices = [];
$paymentStats = ['paid_count' => 0, 'overdue_count' => 0, 'pending_count' => 0, 'total_paid' => 0, 'total_pending' => 0];
try {
    // Query fatture
    $stmt = $pdo->prepare("
        SELECT *
        FROM fatture
        WHERE client_id = ?
        AND visible_to_client = 1
        ORDER BY data_fattura DESC
        LIMIT 8
    ");
    $stmt->execute([$currentUser['contact_id']]);
    $invoices = $stmt->fetchAll();
    
    // Calcola statistiche pagamenti CORRETTE
    $stmt = $pdo->prepare("
        SELECT 
            COUNT(CASE WHEN status = 'pagata' THEN 1 END) as paid_count,
            COUNT(CASE WHEN status = 'scaduta' OR (status = 'emessa' AND data_scadenza < CURDATE()) THEN 1 END) as overdue_count,
            COUNT(CASE WHEN status IN ('emessa', 'da_pagare', 'bozza') THEN 1 END) as pending_count,
            COALESCE(SUM(CASE WHEN status = 'pagata' THEN totale ELSE 0 END), 0) as total_paid,
            COALESCE(SUM(CASE WHEN status IN ('emessa', 'da_pagare', 'scaduta', 'bozza') THEN totale ELSE 0 END), 0) as total_pending
        FROM fatture
        WHERE client_id = ?
        AND visible_to_client = 1
    ");
    $stmt->execute([$currentUser['contact_id']]);
    $paymentStats = $stmt->fetch() ?: $paymentStats;
    
    // Assicurati che i valori siano numeri
    $paymentStats['total_paid'] = (float)$paymentStats['total_paid'];
    $paymentStats['total_pending'] = (float)$paymentStats['total_pending'];
    
} catch (Exception $e) {
    $invoices = [];
    error_log("Errore fatture: " . $e->getMessage());
}

// Calcola totale progetto reale (budget vs fatture)
$projectTotals = ['total_project' => 0, 'total_paid' => 0, 'total_pending' => 0, 'completion_percentage' => 0];
try {
    // Prima calcola i totali dalle fatture
    $stmt = $pdo->prepare("
        SELECT 
            SUM(totale) as total_invoiced,
            SUM(CASE WHEN status = 'pagata' THEN totale ELSE 0 END) as total_paid,
            SUM(CASE WHEN status IN ('emessa', 'da_pagare', 'scaduta') THEN totale ELSE 0 END) as total_pending_invoiced
        FROM fatture
        WHERE client_id = ?
        AND visible_to_client = 1
    ");
    $stmt->execute([$currentUser['contact_id']]);
    $invoiceData = $stmt->fetch();
    
    $totalInvoiced = (float)($invoiceData['total_invoiced'] ?? 0);
    $totalPaid = (float)($invoiceData['total_paid'] ?? 0);
    $totalPendingInvoiced = (float)($invoiceData['total_pending_invoiced'] ?? 0);
    
    // PRIORITÀ: Usa il budget calcolato dai preventivi accettati
    // Se non c'è, usa il budget manuale dal project_budget
    // Altrimenti usa il totale fatturato
    $projectBudget = $quotesTotalBudget > 0 ? $quotesTotalBudget : (float)($currentUser['project_budget'] ?? 0);

    $totalProject = $projectBudget > 0 ? $projectBudget : $totalInvoiced;
    
    // Se non c'è budget e nemmeno fatture, prova da monthly_fee * durata
    if ($totalProject == 0 && $currentUser['monthly_fee'] > 0) {
        $monthlyFee = (float)$currentUser['monthly_fee'];
        if ($currentUser['project_start_date'] && $currentUser['project_end_date']) {
            $startDate = new DateTime($currentUser['project_start_date']);
            $endDate = new DateTime($currentUser['project_end_date']);
            $interval = $startDate->diff($endDate);
            $months = ($interval->y * 12) + $interval->m + ($interval->d > 0 ? 1 : 0);
            $totalProject = $monthlyFee * max(1, $months);
        }
    }
    
    // Calcola totale ancora da versare
    $totalPending = max(0, $totalProject - $totalPaid);
    
    // Calcola percentuale di completamento
    $completionPercentage = $totalProject > 0 ? round(($totalPaid / $totalProject) * 100, 1) : 0;
    
    $projectTotals = [
        'total_project' => $totalProject,
        'total_paid' => $totalPaid,
        'total_pending' => $totalPending,
        'completion_percentage' => $completionPercentage,
        'total_invoiced' => $totalInvoiced,
        'pending_invoiced' => $totalPendingInvoiced,
        'project_budget' => $projectBudget
    ];
    
} catch (Exception $e) {
    error_log("Errore calcolo progetto: " . $e->getMessage());
}

// Cache delle statistiche (aggiornata max 1 volta al giorno)
$cacheKey = "client_stats_{$currentUser['contact_id']}";
$cacheFile = sys_get_temp_dir() . "/{$cacheKey}.json";
$cacheExpiry = 24 * 60 * 60; // 24 ore

$useCache = false;
if (file_exists($cacheFile) && (time() - filemtime($cacheFile)) < $cacheExpiry) {
    $cachedData = json_decode(file_get_contents($cacheFile), true);
    if ($cachedData) {
        $useCache = true;
        // Usa dati cached per statistiche pesanti se necessario
    }
}

if (!$useCache) {
    // Aggiorna cache con nuovi dati
    $cacheData = [
        'payment_stats' => $paymentStats,
        'project_totals' => $projectTotals,
        'last_update' => time()
    ];
    file_put_contents($cacheFile, json_encode($cacheData));
}

// Dettagli progetto Bespoke se presenti
$bespokeDetails = null;
if ($currentUser['bespoke_details']) {
    $decoded = json_decode($currentUser['bespoke_details'], true);
    $bespokeDetails = is_array($decoded) ? $decoded : null;
}
?>
<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard - <?= htmlspecialchars($currentUser['client_name']) ?></title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background-color: #ffffff;
            color: #000000;
            font-size: 14px;
            line-height: 1.6;
        }
        
        .container {
            max-width: 1440px;
            margin: 0 auto;
            padding: 30px 84px;
        }
        
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 50px;
        }
        
        .header h1 {
            font-size: 24px;
            font-weight: 600;
            color: #000000;
        }
        
        .user-menu {
            display: flex;
            align-items: center;
            position: relative;
            gap: 20px;
        }
        
        .notification-badge {
            position: relative;
            cursor: pointer;
        }
        
        .notification-icon {
            width: 25px;
            height: 25px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 12px;
            font-weight: 400;
        }
        
        .user-avatar {
            width: 48px;
            height: 48px;
            border-radius: 50%;
            background-color: #cbd5e1;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 24px;
            font-weight: 400;
            cursor: pointer;
        }
        
        .user-dropdown {
            position: absolute;
            top: 60px;
            right: 0;
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
            padding: 8px;
            display: none;
            z-index: 100;
            min-width: 200px;
        }
        
        .user-dropdown.active {
            display: block;
        }
        
        .dropdown-item {
            display: block;
            padding: 10px 16px;
            color: #374151;
            text-decoration: none;
            border-radius: 6px;
            transition: background 0.2s;
        }
        
        .dropdown-item:hover {
            background: #f3f4f6;
        }
        
        .shortcuts {
            margin-bottom: 40px;
        }
        
        .shortcuts h2 {
            font-size: 20px;
            font-weight: 600;
            margin-bottom: 20px;
            color: #000000;
        }
        
        .shortcuts-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 16px;
        }
        
        .shortcut-card {
            background: white;
            padding: 20px;
            border: 1.5px solid #cbd5e1;
            border-radius: 8px;
            display: flex;
            align-items: center;
            gap: 12px;
            cursor: pointer;
            transition: all 0.2s ease;
            text-decoration: none;
            color: inherit;
        }
        
        .shortcut-card:hover {
            border-color: #94a3b8;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            transform: translateY(-2px);
        }
        
        .shortcut-icon {
            width: 20px;
            height: 20px;
        }
        .shortcut-icon2 {
            width: 16px;
            height: 16px;
        }

        
        .shortcut-text {
            font-size: 16px;
            font-weight: 500;
            color: #000000;
            flex-grow: 1;
            text-align: left;
        }
        
        .panoramica {
            margin-bottom: 40px;
        }
        
        .panoramica h2 {
            font-size: 20px;
            font-weight: 600;
            margin-bottom: 20px;
            color: #000000;
        }
        
        .overview-section {
            background: white;
            padding: 0;
            margin-bottom: 30px;
        }
        
        .overview-title {
            font-size: 16px;
            font-weight: 500;
            color: #000000;
            margin-bottom: 30px;
        }
        
        .appointments-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 26px;
            margin-bottom: 40px;
        }
        
        .appointment-card {
            background: white;
            border: 1.5px solid #cbd5e1;
            border-radius: 8px;
            overflow: hidden;
        }
        
        .appointment-card h3 {
            font-size: 20px;
            font-weight: 600;
            padding: 24px 24px 16px;
            color: #000000;
        }
        
        .appointment-details {
            padding: 0 24px 24px;
        }
        
        .detail-row {
            display: flex;
            margin-bottom: 8px;
            font-size: 16px;
        }
        
        .detail-label {
            color: #94a3b8;
            font-weight: 500;
            width: 165px;
        }
        
        .detail-value {
            color: #0f172a;
            font-weight: 500;
            flex: 1;
        }
        
        .stats-row {
            display: grid;
            grid-template-columns: 413px 1fr;
            gap: 26px;
            margin-bottom: 40px;
        }
        
        .payment-status {
            background: white;
            padding: 24px;
            border: 1.5px solid #cbd5e1;
            border-radius: 8px;
        }
        
        .chart-container {
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 30px 0;
        }
        
        .donut-chart {
            width: 142px;
            height: 142px;
        }
        
        .payment-items {
            font-size: 16px;
        }
        
        .payment-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
            padding-bottom: 12px;
            border-bottom: 1px solid #f1f5f9;
        }
        
        .payment-label {
            color: #0f172a;
            font-weight: 500;
        }
        
        .payment-status-label {
            font-size: 14px;
            font-weight: 600;
            text-transform: uppercase;
        }
        
        .status-pagata { color: #0f172a; }
        .status-scaduta { color: #ef4444; }
        .status-emessa { color: #f59e0b; }
        .status-da_pagare { color: #f59e0b; }
        
        .roadmap-section {
            background: white;
            padding: 24px;
            border: 1.5px solid #cbd5e1;
            border-radius: 8px;
        }
        
        .roadmap-table {
            width: 100%;
            margin-top: 20px;
            border-collapse: collapse;
        }
        
        .roadmap-table th {
            text-align: left;
            font-size: 16px;
            font-weight: 500;
            color: #94a3b8;
            padding: 12px 0;
            border-bottom: 1px solid #e2e8f0;
        }
        
        .roadmap-table td {
            padding: 20px 0;
            font-size: 16px;
            font-weight: 500;
            color: #0f172a;
            border-bottom: 1px solid #f8fafc;
        }
        
        .support-section {
            margin-top: 40px;
        }
        
        .support-section h2 {
            font-size: 20px;
            font-weight: 600;
            margin-bottom: 30px;
            color: #000000;
        }
        
        .support-grid {
            display: grid;
            grid-template-columns: 1fr 413px;
            gap: 17px;
        }
        
        .support-card {
            background: white;
            padding: 24px;
            border: 1.5px solid #cbd5e1;
            border-radius: 8px;
        }
        
        .support-card h3 {
            font-size: 16px;
            font-weight: 500;
            color: #000000;
            margin-bottom: 30px;
        }
        
        .form-group {
            margin-bottom: 24px;
        }
        
        .form-label {
            font-size: 16px;
            font-weight: 500;
            color: #0f172a;
            display: block;
            margin-bottom: 12px;
        }
        
        select, input[type="text"], textarea {
            width: 100%;
            padding: 12px 16px;
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            font-size: 14px;
            font-family: 'Inter', sans-serif;
            background: white;
            transition: border-color 0.2s;
        }
        
        textarea {
            resize: vertical;
            min-height: 120px;
        }
        
        .btn-apri-ticket {
            width: 100%;
            background: #0f172a;
            color: white;
            border: none;
            padding: 16px;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 500;
            cursor: pointer;
            margin-top: 20px;
            transition: background 0.2s;
        }
        
        .btn-apri-ticket:hover {
            background: #1e293b;
        }
        
        .empty-state {
            text-align: center;
            padding: 40px;
            color: #94a3b8;
        }
        
        .empty-state-icon {
            font-size: 48px;
            margin-bottom: 16px;
        }
        
        .priority-badge {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
        }
        
        .priority-P1 {
            background: #fee2e2;
            color: #991b1b;
        }
        
        .priority-P2 {
            background: #fef3c7;
            color: #92400e;
        }
        
        .priority-P3 {
            background: #e0e7ff;
            color: #3730a3;
        }
        
        .task-status {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 500;
        }
        
        .status-todo {
            background: #f3f4f6;
            color: #374151;
        }
        
        .status-in_progress {
            background: #dbeafe;
            color: #1e40af;
        }
        
        .status-pending {
            background: #fef3c7;
            color: #92400e;
        }
        
        .alert {
            background: #d1fae5;
            border: 1px solid #a7f3d0;
            color: #065f46;
            padding: 16px 20px;
            border-radius: 8px;
            margin-bottom: 24px;
            display: flex;
            align-items: center;
            gap: 12px;
        }
        
        .alert-error {
            background: #fee2e2;
            border: 1px solid #fecaca;
            color: #991b1b;
        }
        
        @media (max-width: 1280px) {
            .container {
                padding: 30px 40px;
            }
            
            .shortcuts-grid {
                grid-template-columns: repeat(2, 1fr);
            }
            
            .appointments-grid {
                grid-template-columns: 1fr;
            }
            
            .stats-row {
                grid-template-columns: 1fr;
            }
            
            .support-grid {
                grid-template-columns: 1fr;
            }
        }
        /* Centro Notifiche */
        .notification-center {
            position: relative;
        }
        
        .notification-bell {
            position: relative;
            background: none;
            border: none;
            cursor: pointer;
            padding: 8px;
            border-radius: 50%;
            transition: background 0.2s;
        }
        
        .notification-bell:hover {
            background: #f3f4f6;
        }
        
        .notification-bell svg {
            width: 24px;
            height: 24px;
            color: #374151;
        }
        
        .notification-count {
            position: absolute;
            top: 0;
            right: 0;
            background: #ef4444;
            color: white;
            font-size: 10px;
            font-weight: bold;
            padding: 2px 5px;
            border-radius: 10px;
            min-width: 18px;
            text-align: center;
        }
        
        .notifications-dropdown {
            position: absolute;
            top: 100%;
            right: 0;
            margin-top: 8px;
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
            width: 380px;
            max-height: 500px;
            z-index: 1000;
            overflow: hidden;
        }
        
        .notifications-header {
            padding: 16px;
            border-bottom: 1px solid #e5e7eb;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .notifications-header h3 {
            font-size: 16px;
            font-weight: 600;
            margin: 0;
        }
        
        .mark-all-read {
            background: none;
            border: none;
            color: #3b82f6;
            font-size: 13px;
            cursor: pointer;
        }
        
        .mark-all-read:hover {
            text-decoration: underline;
        }
        
        .notifications-list {
            max-height: 400px;
            overflow-y: auto;
        }
        
        .notification-item {
            display: flex;
            gap: 12px;
            padding: 12px 16px;
            border-bottom: 1px solid #f3f4f6;
            cursor: pointer;
            transition: background 0.2s;
        }
        
        .notification-item:hover {
            background: #f9fafb;
        }
        
        .notification-item.unread {
            background: #eff6ff;
        }
        
        .notification-icon {
            font-size: 20px;
            flex-shrink: 0;
        }
        
        .notification-content {
            flex: 1;
            min-width: 0;
        }
        
        .notification-title {
            font-weight: 600;
            font-size: 14px;
            color: #111827;
            margin-bottom: 2px;
        }
        
        .notification-message {
            font-size: 13px;
            color: #6b7280;
            line-height: 1.4;
        }
        
        .notification-time {
            font-size: 11px;
            color: #9ca3af;
            margin-top: 4px;
        }
        
        .no-notifications {
            padding: 40px;
            text-align: center;
            color: #9ca3af;
        }
        
        .dropdown-user-info {
            padding: 12px 16px;
        }
        
        .dropdown-user-info strong {
            display: block;
            font-size: 14px;
            margin-bottom: 2px;
        }
        
        .dropdown-user-info small {
            color: #6b7280;
            font-size: 12px;
        }

        /* Chat Widget Styles */
        .chat-widget {
            position: fixed;
            bottom: 0;
            right: 20px;
            width: 380px;
            max-height: 600px;
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: 12px 12px 0 0;
            box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.15);
            z-index: 1000;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            transition: all 0.3s ease;
        }

        .chat-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 16px 20px;
            border-radius: 12px 12px 0 0;
            cursor: pointer;
            display: flex;
            justify-content: space-between;
            align-items: center;
            user-select: none;
        }

        .chat-header-info {
            flex: 1;
            min-width: 0;
        }

        .chat-title {
            font-size: 16px;
            font-weight: 600;
            margin-bottom: 2px;
        }

        .chat-subtitle {
            font-size: 13px;
            opacity: 0.9;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .chat-controls {
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .chat-unread-badge {
            background: #ef4444;
            color: white;
            font-size: 12px;
            font-weight: 600;
            padding: 2px 6px;
            border-radius: 10px;
            min-width: 18px;
            text-align: center;
        }

        .chat-toggle-btn {
            background: rgba(255, 255, 255, 0.2);
            border: none;
            color: white;
            padding: 6px;
            border-radius: 4px;
            cursor: pointer;
            transition: background 0.2s;
        }

        .chat-toggle-btn:hover {
            background: rgba(255, 255, 255, 0.3);
        }

        .chat-toggle-icon {
            display: block;
            font-size: 14px;
            transition: transform 0.3s ease;
        }

        .chat-body {
            height: 450px;
            display: flex;
            flex-direction: column;
            background: #fafafa;
        }

        .chat-body.collapsed {
            height: 0;
            overflow: hidden;
        }

        .chat-widget.collapsed .chat-toggle-icon {
            transform: rotate(180deg);
        }

        .chat-messages {
            flex: 1;
            padding: 16px;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            gap: 12px;
        }

        .chat-date-separator {
            text-align: center;
            margin: 8px 0;
        }

        .chat-date-separator span {
            background: #e5e7eb;
            color: #6b7280;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 500;
        }

        .chat-message {
            max-width: 85%;
        }

        .client-message {
            align-self: flex-end;
        }

        .admin-message {
            align-self: flex-start;
        }

        .internal-message {
            display: none;
        }

        .message-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 4px;
        }

        .message-author {
            font-size: 12px;
            font-weight: 600;
            color: #6b7280;
        }

        .message-time {
            font-size: 11px;
            color: #9ca3af;
        }

        .message-content {
            background: white;
            padding: 10px 14px;
            border-radius: 16px;
            font-size: 14px;
            line-height: 1.4;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            word-wrap: break-word;
        }

        .client-message .message-content {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }

        .admin-message .message-content {
            background: #ffffff;
            color: #374151;
            border: 1px solid #e5e7eb;
        }

        .chat-input-form {
            padding: 12px 16px;
            border-top: 1px solid #e5e7eb;
            background: white;
        }

        .chat-input-container {
            display: flex;
            align-items: flex-end;
            gap: 8px;
        }

        .chat-input {
            flex: 1;
            border: 1px solid #d1d5db;
            border-radius: 20px;
            padding: 8px 16px;
            font-size: 14px;
            font-family: inherit;
            resize: none;
            min-height: 36px;
            max-height: 100px;
            overflow-y: auto;
            transition: border-color 0.2s;
        }

        .chat-input:focus {
            outline: none;
            border-color: #667eea;
            box-shadow: 0 0 0 1px #667eea;
        }

        .chat-send-btn {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border: none;
            color: white;
            width: 36px;
            height: 36px;
            border-radius: 18px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: transform 0.2s;
        }

        .chat-send-btn:hover {
            transform: scale(1.05);
        }

        .chat-send-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            transform: none;
        }

        /* Scrollbar personalizzata */
        .chat-messages::-webkit-scrollbar {
            width: 4px;
        }

        .chat-messages::-webkit-scrollbar-track {
            background: #f1f5f9;
        }

        .chat-messages::-webkit-scrollbar-thumb {
            background: #cbd5e1;
            border-radius: 4px;
        }

        .chat-messages::-webkit-scrollbar-thumb:hover {
            background: #94a3b8;
        }

        /* Responsive */
        @media (max-width: 768px) {
            .chat-widget {
                left: 10px;
                right: 10px;
                width: auto;
            }
        }

        /* Stile per dettagli preventivi espandibili */
        details summary span {
            transition: transform 0.2s ease;
            display: inline-block;
        }
        details[open] summary span {
            transform: rotate(90deg);
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
        <h1>Benvenuto sulla tua dashboard, <?= htmlspecialchars($currentUser['client_name']) ?></h1>
        <div class="user-menu">
            <!-- CENTRO NOTIFICHE -->
            <div class="notification-center">
                <button class="notification-bell" onclick="toggleNotifications()">
                    <img src="/assets/images/icone/bell.svg" alt="Icona Notifiche" style="width: 1.2em; height: 1.2em;">
                    <?php
                    // Conta notifiche non lette
                    $unreadCount = 0;
                    try {
                        $stmt = $pdo->prepare("
                            SELECT COUNT(*) as count 
                            FROM client_notifications 
                            WHERE client_access_id = ? AND is_read = 0
                        ");
                        $stmt->execute([$clientId]);
                        $unreadCount = $stmt->fetch()['count'] ?? 0;
                    } catch (Exception $e) {
                        // Tabella potrebbe non esistere ancora
                    }
                    ?>
                    <?php if ($unreadCount > 0): ?>
                    <span class="notification-count"><?= $unreadCount > 9 ? '9+' : $unreadCount ?></span>
                    <?php endif; ?>
                </button>
                
                <!-- Dropdown Notifiche -->
                <div class="notifications-dropdown" id="notificationsDropdown" style="display: none;">
                    <div class="notifications-header">
                        <h3>Notifiche</h3>
                        <?php if ($unreadCount > 0): ?>
                        <button onclick="markAllAsRead()" class="mark-all-read">Segna tutte come lette</button>
                        <?php endif; ?>
                    </div>
                    <div class="notifications-list">
                        <?php
                        // Carica notifiche
                        $notifications = [];
                        try {
                            $stmt = $pdo->prepare("
                                SELECT * FROM client_notifications 
                                WHERE client_access_id = ? 
                                ORDER BY created_at DESC 
                                LIMIT 10
                            ");
                            $stmt->execute([$clientId]);
                            $notifications = $stmt->fetchAll();
                        } catch (Exception $e) {
                            // Tabella non esiste
                        }
                        
                        if (count($notifications) > 0):
                            foreach ($notifications as $notification):
                                // Determina icon in base al tipo
                                $icon = match($notification['type']) {
                                    'task' => '📋',
                                    'agenda' => '📅',
                                    'quote' => '💼',
                                    default => 'ℹ️'
                                };

                                // Se è una notifica di preventivo, rendiamola cliccabile per aprire preventivo.php
                                $isQuoteNotification = ($notification['related_type'] === 'quote');
                                $clickHandler = $isQuoteNotification
                                    ? "markAsReadAndRedirect({$notification['id']}, '/preventivo.php')"
                                    : "markAsRead({$notification['id']})";
                        ?>
                            <div class="notification-item <?= !$notification['is_read'] ? 'unread' : '' ?>"
                                 data-id="<?= $notification['id'] ?>"
                                 onclick="<?= $clickHandler ?>"
                                 style="<?= $isQuoteNotification ? 'cursor: pointer;' : '' ?>">
                                <div class="notification-icon">
                                    <?= $icon ?>
                                </div>
                                <div class="notification-content">
                                    <div class="notification-title"><?= htmlspecialchars($notification['title']) ?></div>
                                    <div class="notification-message"><?= htmlspecialchars($notification['message']) ?></div>
                                    <?php if ($isQuoteNotification): ?>
                                        <div style="margin-top: 8px;">
                                            <span style="color: #8b5cf6; font-weight: 500; font-size: 13px;">
                                                👉 Clicca per visualizzare
                                            </span>
                                        </div>
                                    <?php endif; ?>
                                    <div class="notification-time">
                                        <?= date('d/m H:i', strtotime($notification['created_at'])) ?>
                                    </div>
                                </div>
                            </div>
                        <?php 
                            endforeach;
                        else: 
                        ?>
                            <div class="no-notifications">
                                <p>Nessuna notifica</p>
                            </div>
                        <?php endif; ?>
                    </div>
                </div>
            </div>
            
            <!-- MENU UTENTE (esistente) -->
            <div class="user-avatar" onclick="toggleUserMenu()">
                <?= strtoupper(substr($currentUser['client_name'], 0, 1)) ?>
            </div>
            <div class="user-dropdown" id="userDropdown">
                <div class="dropdown-user-info">
                    <strong><?= htmlspecialchars($currentUser['client_name']) ?></strong>
                    <small><?= htmlspecialchars($currentUser['client_email']) ?></small>
                </div>
                <hr style="margin: 8px 0; border: none; border-top: 1px solid #e5e7eb;">
                <a href="/core/auth/logout.php" class="dropdown-item">🚪 Esci</a>
            </div>
        </div>
    </div>
        
        <?php if ($successMessage): ?>
        <div class="alert">
            <span>✓</span>
            <span><?= htmlspecialchars($successMessage) ?></span>
        </div>
        <?php endif; ?>
        
        <?php if ($errorMessage): ?>
        <div class="alert alert-error">
            <span>✗</span>
            <span><?= htmlspecialchars($errorMessage) ?></span>
        </div>
        <?php endif; ?>
        
        <!-- Debug Info Cliente (rimovibile in produzione) -->
       <!--<div style="background: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 6px; padding: 12px; margin-bottom: 20px; font-size: 12px; color: #0369a1;">
            <strong>🔧 Debug Info:</strong> 
            Cliente ID: <?= $currentUser['contact_id'] ?> | 
            Appuntamenti: <?= count($appointments) ?> | 
            Tasks: <?= count($tasks) ?> | 
            Fatture: <?= count($invoices) ?> |
            Totale versato: €<?= number_format($paymentStats['total_paid'], 2, ',', '.') ?> |
            Ore supporto: <?= $currentUser['support_hours_used'] ?? 0 ?>/<?= $currentUser['support_hours_included'] ?? 0 ?>h |
            Chat ticket: <?= $currentChatTicket ? '#' . $currentChatTicket['ticket_number'] : 'Nessuno' ?>
        </div> -->
        
        <?php if ($currentUser['drive_folder_link'] || $currentUser['documents_folder'] || 
          $currentUser['assets_folder'] || $currentUser['invoice_folder']): ?>
        <div class="shortcuts">
            <h2>Shortcuts</h2>
            <div class="shortcuts-grid">
                <?php if ($currentUser['documents_folder']): ?>
                <a href="<?= htmlspecialchars($currentUser['documents_folder']) ?>" target="_blank" class="shortcut-card">
                    <img src="assets/images/icone/documenti.svg" alt="Icona Documenti" class="shortcut-icon">
                    <span class="shortcut-text">Documenti</span>
                   <img src="assets/images/icone/esterno.svg" alt="Icona esterno" class="shortcut-icon2">
                </a>
                <?php endif; ?>
                
                <!-- NUOVO BOTTONE FATTURE CON POPUP -->
                <button onclick="openInvoicesModal()" class="shortcut-card">
                    <img src="assets/images/icone/documenti.svg" alt="Icona Documenti" class="shortcut-icon">
                    <span class="shortcut-text">Fatture</span>
                  
                </button>
                
                <?php if ($currentUser['assets_folder']): ?>
                <a href="<?= htmlspecialchars($currentUser['assets_folder']) ?>" target="_blank" class="shortcut-card">
                    <img src="assets/images/icone/assets.svg" alt="Icona Documenti" class="shortcut-icon">
                    <span class="shortcut-text">Assets</span>
                   <img src="assets/images/icone/esterno.svg" alt="Icona esterno" class="shortcut-icon2">
                </a>
                <?php endif; ?>
                
                <?php if ($currentUser['drive_folder_link']): ?>
                <a href="<?= htmlspecialchars($currentUser['drive_folder_link']) ?>" target="_blank" class="shortcut-card">
                    <img src="assets/images/icone/foto.svg" alt="Icona Documenti" class="shortcut-icon">
                    <span class="shortcut-text">Notion</span>
                   <img src="assets/images/icone/esterno.svg" alt="Icona esterno" class="shortcut-icon2">
                </a>
                <?php endif; ?>
            </div>
        </div>
        <?php endif; ?>
        
        <div class="panoramica">
            <h2>Panoramica</h2>
            
            <div class="overview-section">
                <?php if (count($appointments) > 0): ?>
                <div class="overview-title">PROSSIMI APPUNTAMENTI</div>
                <div class="appointments-grid">
                    <?php foreach ($appointments as $appointment): ?>
                    <div class="appointment-card">
                        <h3><?= htmlspecialchars($appointment['title']) ?></h3>
                        <div class="appointment-details">
                            <div class="detail-row">
                                <span class="detail-label">Categoria:</span>
                                <span class="detail-value"><?= htmlspecialchars($appointment['category_name'] ?: 'Generale') ?></span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Data:</span>
                                <span class="detail-value">
                                    <?= date('d/m/Y', strtotime($appointment['start_datetime'])) ?>
                                </span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Orario:</span>
                                <span class="detail-value">
                                    <?= date('H:i', strtotime($appointment['start_datetime'])) ?>
                                </span>
                            </div>
                            <?php if ($appointment['location']): ?>
                            <div class="detail-row">
                                <span class="detail-label">Luogo:</span>
                                <span class="detail-value"><?= htmlspecialchars($appointment['location']) ?></span>
                            </div>
                            <?php endif; ?>
                        </div>
                    </div>
                    <?php endforeach; ?>
                </div>
                <?php else: ?>
                <div class="empty-state">
                    <div class="empty-state-icon">📅</div>
                    <p>Nessun appuntamento programmato</p>
                </div>
                <?php endif; ?>
                
                <div class="stats-row">
                    <div class="payment-status">
                <div class="overview-title">STATUS DEI PAGAMENTI</div>
                
                <?php if (count($invoices) > 0): ?>
                
                <!-- Progresso Progetto (questa parte funziona già bene) -->
                <?php if ($projectTotals['total_project'] > 0): ?>
                <div style="background: #f8fafc; border-radius: 6px; padding: 16px; margin-bottom: 20px;">
                    <h4 style="font-size: 14px; font-weight: 600; margin-bottom: 12px; color: #0f172a;">
                        📊 Progresso Progetto
                    </h4>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <span style="font-size: 13px; color: #64748b;">Completamento</span>
                        <span style="font-size: 14px; font-weight: 600; color: #0f172a;">
                            <?= $projectTotals['completion_percentage'] ?>%
                        </span>
                    </div>
                    <div style="background: #e2e8f0; height: 8px; border-radius: 4px; overflow: hidden;">
                        <div style="background: linear-gradient(90deg, #10b981, #059669); height: 100%; width: <?= $projectTotals['completion_percentage'] ?>%; transition: width 0.3s ease;"></div>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-top: 8px; font-size: 12px; color: #64748b;">
                        <span>€ <?= number_format($projectTotals['total_paid'], 0, ',', '.') ?> versati</span>
                        <span>€ <?= number_format($projectTotals['total_project'], 0, ',', '.') ?> totale</span>
                    </div>
                </div>
                <?php endif; ?>
                
                <!-- Grafico a torta CORRETTO (usa la stessa percentuale del progresso) -->
                <div class="chart-container">
                    <svg class="donut-chart" viewBox="0 0 42 42">
                        <!-- Sfondo completo grigio -->
                        <circle cx="21" cy="21" r="15.91549430918954" 
                                fill="transparent" 
                                stroke="#e2e8f0" 
                                stroke-width="3"></circle>
                        
                        <?php 
                        // USA LA STESSA PERCENTUALE DEL PROGRESSO!
                        $chartPercentage = $projectTotals['completion_percentage'];
                        ?>
                        
                        <?php if ($chartPercentage > 0): ?>
                        <!-- Parte completata (verde) -->
                        <circle cx="21" cy="21" r="15.91549430918954" 
                                fill="transparent" 
                                stroke="#10b981" 
                                stroke-width="3" 
                                stroke-dasharray="<?= $chartPercentage ?> <?= (100 - $chartPercentage) ?>" 
                                stroke-dashoffset="25" 
                                transform="rotate(-90 21 21)"></circle>
                        <?php endif; ?>
                        
                        <!-- Testo centrale con percentuale -->
                        <text x="21" y="24" 
                              text-anchor="middle" 
                              font-size="8" 
                              font-weight="bold" 
                              fill="#0f172a">
                            <?= round($chartPercentage) ?>%
                        </text>
                    </svg>
                </div>
                
                <!-- Lista fatture -->
                <div class="payment-items">
                    <?php foreach (array_slice($invoices, 0, 4) as $invoice): ?>
                    <div class="payment-item">
                        <div class="payment-label">
                            Fattura <?= htmlspecialchars($invoice['numero_fattura']) ?> 
                            del <?= date('d/m/Y', strtotime($invoice['data_fattura'])) ?>
                        </div>
                        <span class="payment-status-label status-<?= $invoice['status'] ?>">
                            <?= strtoupper(str_replace('_', ' ', $invoice['status'])) ?>
                        </span>
                    </div>
                    <?php endforeach; ?>
                </div>
                
                <!-- Riepilogo totali -->
                <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                    <div class="detail-row">
                        <span class="detail-label">Totale versato:</span>
                        <span class="detail-value" style="color: #059669; font-weight: 600;">
                            € <?= number_format($projectTotals['total_paid'], 2, ',', '.') ?>
                        </span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Totale da versare:</span>
                        <span class="detail-value" style="color: <?= $projectTotals['total_pending'] > 0 ? '#f59e0b' : '#64748b' ?>;">
                            € <?= number_format($projectTotals['total_pending'], 2, ',', '.') ?>
                        </span>
                    </div>
                </div>
                
                <?php else: ?>
                <div class="empty-state">
                    <div class="empty-state-icon">💰</div>
                    <p>Nessuna fattura disponibile</p>
                </div>
                <?php endif; ?>
            </div>
                    
                    <div class="roadmap-section">
                        <div class="overview-title">PROJECT ROADMAP</div>
                        <?php if (count($tasks) > 0): ?>
                        <table class="roadmap-table">
                            <thead>
                                <tr>
                                    <th>Task</th>
                                    <th>Categoria</th>
                                    <th>Scadenza</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php foreach ($tasks as $task): ?>
                                <tr>
                                    <td>
                                        <?= htmlspecialchars($task['title']) ?>
                                        <span class="priority-badge priority-<?= $task['priority'] ?>">
                                            <?= $task['priority'] ?>
                                        </span>
                                    </td>
                                    <td><?= htmlspecialchars($task['category_name'] ?: 'Generale') ?></td>
                                    <td><?= date('d/m/Y', strtotime($task['deadline'])) ?></td>
                                    <td>
                                        <span class="task-status status-<?= $task['status'] ?>">
                                            <?= str_replace('_', ' ', $task['status']) ?>
                                        </span>
                                    </td>
                                </tr>
                                <?php endforeach; ?>
                            </tbody>
                        </table>
                        <?php else: ?>
                        <div class="empty-state">
                            <div class="empty-state-icon">📋</div>
                            <p>Nessun task attivo</p>
                        </div>
                        <?php endif; ?>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="support-section">
            <h2>Supporto</h2>
            <div class="support-grid">
                <div class="support-card">
                    <h3>APRI UN TICKET DI SUPPORTO</h3>
                    
                    <?php if (!$canCreateTicket): ?>
                    <div style="padding: 16px; background: #fee2e2; border: 1px solid #fecaca; border-radius: 8px; margin-bottom: 16px;">
                        <div style="color: #991b1b; font-weight: 500;">
                            ⚠️ <?= $disableReason ?>
                        </div>
                    </div>
                    <div style="opacity: 0.5; pointer-events: none;">
                    <?php endif; ?>
                    
                    <form action="" method="POST">
                        <input type="hidden" name="action" value="create_ticket">
                        
                        <div class="form-group">
                            <label class="form-label">Seleziona il tipo di supporto</label>
                            <select name="support_type" required>
                                <option value="">-- Seleziona --</option>
                                <option value="tecnico">Supporto Tecnico</option>
                                <option value="design">Modifica Design</option>
                                <option value="contenuti">Gestione Contenuti</option>
                                <option value="fatturazione">Fatturazione</option>
                                <option value="altro">Altro</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Descrivi il tipo di intervento richiesto</label>
                            <textarea name="description" placeholder="Scrivi qui..." required></textarea>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Seleziona la priorità</label>
                            <select name="priority" required>
                                <option value="bassa">Bassa</option>
                                <option value="normale" selected>Normale</option>
                                <option value="urgente">Urgente</option>
                            </select>
                        </div>
                        
                        <button type="submit" class="btn-apri-ticket">Apri ticket</button>
                    </form>
                    
                    <?php if (!$canCreateTicket): ?>
                    </div>
                    <?php endif; ?>
                </div>
                
                <div class="support-card">
                    <h3>INFORMAZIONI PROGETTO</h3>

                    <?php if (!empty($currentUser['project_name'])): ?>
                    <div class="detail-row">
                        <span class="detail-label">Nome progetto:</span>
                        <span class="detail-value"><?= htmlspecialchars($currentUser['project_name']) ?></span>
                    </div>
                    <?php endif; ?>

                    <?php if (!empty($currentUser['project_description'])): ?>
                    <div class="detail-row">
                        <span class="detail-label">Descrizione:</span>
                        <span class="detail-value"><?= nl2br(htmlspecialchars($currentUser['project_description'])) ?></span>
                    </div>
                    <?php endif; ?>

                    <!-- SEZIONE PREVENTIVI ACCETTATI -->
                    <?php if (count($clientQuotes) > 0): ?>
                    <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                        <h4 style="font-size: 14px; font-weight: 600; margin-bottom: 16px; color: #37352f; display: flex; align-items: center; gap: 8px;">
                            Preventivi Accettati
                            <span style="background: #37352f; color: white; padding: 2px 10px; border-radius: 4px; font-size: 11px; font-weight: 500;">
                                <?= count($clientQuotes) ?>
                            </span>
                        </h4>

                        <?php foreach ($clientQuotes as $index => $quote):
                            // Calcola il totale finale con tutti gli sconti
                            $quoteSubtotal = (float)$quote['subtotal'];
                            $quoteDiscountBase = (float)($quote['discount_amount'] ?? 0);
                            $quoteSubtotalAfterBaseDiscount = $quoteSubtotal - $quoteDiscountBase;

                            // Sconto pagamento
                            $paymentDiscountAmount = 0;
                            $paymentDiscountLabel = '';
                            if (!empty($quote['selected_payment_option'])) {
                                $discountField = '';
                                switch($quote['selected_payment_option']) {
                                    case 'one_time':
                                        $discountField = 'one_time_discount';
                                        $paymentDiscountLabel = 'Pagamento Unico';
                                        break;
                                    case 'payment_2':
                                        $discountField = 'payment_2_discount';
                                        $paymentDiscountLabel = '2 Rate';
                                        break;
                                    case 'payment_3':
                                        $discountField = 'payment_3_discount';
                                        $paymentDiscountLabel = '3 Rate';
                                        break;
                                    case 'payment_4':
                                        $discountField = 'payment_4_discount';
                                        $paymentDiscountLabel = '4 Rate';
                                        break;
                                }

                                if ($discountField && !empty($quote[$discountField])) {
                                    $paymentDiscountAmount = ($quoteSubtotal * (float)$quote[$discountField]) / 100;
                                }
                            }

                            $quoteFinalSubtotal = $quoteSubtotalAfterBaseDiscount - $paymentDiscountAmount;
                            $quoteTaxAmount = ($quoteFinalSubtotal * (float)$quote['tax_rate']) / 100;
                            $quoteTotalWithTax = $quoteFinalSubtotal + $quoteTaxAmount;
                        ?>

                        <div style="background: #fafaf9; padding: 16px; border-radius: 3px; margin-bottom: 10px; border: 1px solid #e7e5e4;">
                            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
                                <div style="flex: 1;">
                                    <div style="font-weight: 600; font-size: 15px; color: #37352f; margin-bottom: 4px;">
                                        <?= htmlspecialchars($quote['title']) ?>
                                    </div>
                                    <div style="font-size: 12px; color: #787774; font-family: 'Inter Tight', sans-serif;">
                                        #<?= htmlspecialchars($quote['quote_number']) ?>
                                        <?php if (!empty($quote['selected_package_id'])): ?>
                                        <span style="margin-left: 8px; padding: 2px 6px; background: #e7e5e4; border-radius: 3px; font-size: 11px;">
                                            Pacchetto
                                        </span>
                                        <?php endif; ?>
                                    </div>
                                </div>
                                <div style="text-align: right; padding-left: 16px;">
                                    <div style="font-size: 20px; font-weight: 600; color: #37352f; white-space: nowrap;">
                                        € <?= number_format($quoteTotalWithTax, 2, ',', '.') ?>
                                    </div>
                                    <?php if ($paymentDiscountAmount > 0): ?>
                                    <div style="font-size: 11px; color: #787774; margin-top: 2px;">
                                        Con sconto <?= $paymentDiscountLabel ?>
                                    </div>
                                    <?php endif; ?>
                                </div>
                            </div>

                            <div style="font-size: 12px; color: #787774; padding-top: 8px; border-top: 1px solid #e7e5e4;">
                                Accettato il <?= date('d/m/Y', strtotime($quote['accepted_date'])) ?>
                            </div>

                            <!-- Dettaglio sconti applicati (espandibile) -->
                            <details style="margin-top: 12px;">
                                <summary style="cursor: pointer; color: #37352f; font-size: 12px; font-weight: 500; list-style: none; user-select: none;">
                                    <span style="display: inline-block; margin-right: 4px;">▸</span> Dettaglio prezzi
                                </summary>
                                <div style="margin-top: 12px; padding: 12px; background: white; border-radius: 3px; border: 1px solid #e7e5e4;">
                                    <div style="display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; color: #37352f;">
                                        <span>Subtotale</span>
                                        <span style="font-weight: 500;">€ <?= number_format($quoteSubtotal, 2, ',', '.') ?></span>
                                    </div>
                                    <?php if ($quoteDiscountBase > 0): ?>
                                    <div style="display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; color: #787774;">
                                        <span>Sconto base (<?= number_format($quote['discount_percentage'], 0) ?>%)</span>
                                        <span style="font-weight: 500;">- € <?= number_format($quoteDiscountBase, 2, ',', '.') ?></span>
                                    </div>
                                    <?php endif; ?>
                                    <?php if ($paymentDiscountAmount > 0): ?>
                                    <div style="display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; color: #787774;">
                                        <span>Sconto <?= $paymentDiscountLabel ?></span>
                                        <span style="font-weight: 500;">- € <?= number_format($paymentDiscountAmount, 2, ',', '.') ?></span>
                                    </div>
                                    <?php endif; ?>
                                    <div style="display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; color: #787774;">
                                        <span>IVA (<?= number_format($quote['tax_rate'], 0) ?>%)</span>
                                        <span style="font-weight: 500;">€ <?= number_format($quoteTaxAmount, 2, ',', '.') ?></span>
                                    </div>
                                    <div style="display: flex; justify-content: space-between; padding: 8px 0; border-top: 1px solid #e7e5e4; margin-top: 6px; font-size: 14px; color: #37352f;">
                                        <span style="font-weight: 600;">Totale</span>
                                        <span style="font-weight: 600;">€ <?= number_format($quoteTotalWithTax, 2, ',', '.') ?></span>
                                    </div>
                                </div>
                            </details>
                        </div>

                        <?php endforeach; ?>

                        <!-- Riepilogo Totale Preventivi -->
                        <?php if (count($clientQuotes) > 1): ?>
                        <div style="background: #37352f; color: white; padding: 18px 20px; border-radius: 3px; margin-top: 16px;">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <div>
                                    <div style="font-size: 13px; font-weight: 500; opacity: 0.9;">Valore totale progetti</div>
                                    <div style="font-size: 11px; opacity: 0.65; margin-top: 4px; font-family: 'Inter Tight', sans-serif;">
                                        Somma di <?= count($clientQuotes) ?> preventivi accettati
                                    </div>
                                </div>
                                <div style="font-size: 26px; font-weight: 600;">
                                    € <?= number_format($quotesTotalBudget, 2, ',', '.') ?>
                                </div>
                            </div>
                        </div>
                        <?php endif; ?>
                    </div>
                    <?php endif; ?>
                    
                    <!-- SEZIONE ORE SUPPORTO TICKET -->
                    <?php if ($currentUser['support_hours_included'] > 0): ?>
                    <div class="detail-row">
                        <span class="detail-label">Ore supporto:</span>
                        <span class="detail-value">
                            <?php 
                            $hoursUsed = (float)$currentUser['support_hours_used'];
                            $hoursIncluded = (int)$currentUser['support_hours_included'];
                            $hoursRemaining = $hoursIncluded - $hoursUsed;
                            ?>
                            <strong><?= number_format($hoursUsed, 1) ?>h</strong> utilizzate su <strong><?= $hoursIncluded ?>h</strong>
                            (rimangono <span style="color: <?= $hoursRemaining > 0 ? '#059669' : '#dc2626' ?>;">
                                <strong><?= number_format($hoursRemaining, 1) ?>h</strong>
                            </span>)
                        </span>
                    </div>
                    <?php elseif ($currentUser['support_hours_included'] == 0): ?>
                    <div class="detail-row">
                        <span class="detail-label">Ore supporto:</span>
                        <span class="detail-value" style="color: #059669; font-weight: 500;">
                            Supporto illimitato
                        </span>
                    </div>
                    <?php endif; ?>
                    
                    <?php if ($currentUser['project_start_date']): ?>
                    <div class="detail-row">
                        <span class="detail-label">Inizio progetto:</span>
                        <span class="detail-value">
                            <?= date('d/m/Y', strtotime($currentUser['project_start_date'])) ?>
                        </span>
                    </div>
                    <?php endif; ?>
                    
                    <?php if ($currentUser['project_end_date']): ?>
                    <div class="detail-row">
                        <span class="detail-label">Fine progetto:</span>
                        <span class="detail-value">
                            <?= date('d/m/Y', strtotime($currentUser['project_end_date'])) ?>
                        </span>
                    </div>
                    <?php endif; ?>
                    
                    <?php
                    // Usa il budget calcolato dai preventivi se disponibile, altrimenti usa quello manuale
                    $displayBudget = $quotesTotalBudget > 0 ? $quotesTotalBudget : ($currentUser['project_budget'] ?? 0);
                    ?>
                    <?php if ($displayBudget > 0): ?>
                    <div class="detail-row">
                        <span class="detail-label">Budget totale:</span>
                        <span class="detail-value" style="font-weight: 600; color: #059669;">
                            € <?= number_format($displayBudget, 2, ',', '.') ?>
                        </span>
                        <?php if ($quotesTotalBudget > 0 && count($clientQuotes) > 0): ?>
                        <div style="font-size: 11px; color: #64748b; margin-top: 4px;">
                            Calcolato da <?= count($clientQuotes) ?> preventiv<?= count($clientQuotes) > 1 ? 'i' : 'o' ?> accettat<?= count($clientQuotes) > 1 ? 'i' : 'o' ?>
                        </div>
                        <?php endif; ?>
                    </div>
                    <?php endif; ?>
                    
                    <?php if ($currentUser['monthly_fee'] && $currentUser['monthly_fee'] > 0): ?>
                    <div class="detail-row">
                        <span class="detail-label">Canone mensile:</span>
                        <span class="detail-value">
                            € <?= number_format($currentUser['monthly_fee'], 2, ',', '.') ?>
                        </span>
                    </div>
                    <?php endif; ?>
                    
                    <!-- Mostra il riepilogo finanziario -->
                    <?php if ($projectTotals['total_project'] > 0): ?>
                    <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                        <h4 style="font-size: 14px; font-weight: 600; margin-bottom: 12px;">
                            💰 Riepilogo Finanziario
                        </h4>
                        <div class="detail-row">
                            <span class="detail-label">Totale progetto:</span>
                            <span class="detail-value">€ <?= number_format($projectTotals['total_project'], 2, ',', '.') ?></span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Già versato:</span>
                            <span class="detail-value" style="color: #059669;">€ <?= number_format($projectTotals['total_paid'], 2, ',', '.') ?></span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Da versare:</span>
                            <span class="detail-value" style="color: #f59e0b;">€ <?= number_format($projectTotals['total_pending'], 2, ',', '.') ?></span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Completamento:</span>
                            <span class="detail-value"><?= $projectTotals['completion_percentage'] ?>%</span>
                        </div>
                    </div>
                    <?php endif; ?>
                    
                    <?php if ($bespokeDetails): ?>
                    <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                        <h4 style="font-size: 14px; font-weight: 600; margin-bottom: 12px;">
                            Dettagli Bespoke
                        </h4>
                        <p style="font-size: 14px; color: #6b7280; line-height: 1.6;">
                            <?= nl2br(htmlspecialchars($bespokeDetails['details'] ?? $bespokeDetails['description'] ?? 'Progetto personalizzato in corso')) ?>
                        </p>
                    </div>
                    <?php endif; ?>
                </div>
            </div>
        </div>
    </div>
    
    <!-- Modal Fatture -->
    <div id="invoicesModal" style="display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 9999;">
        <div style="position: relative; width: 90%; max-width: 1200px; height: 90%; margin: 5% auto; background: white; border-radius: 12px; overflow: hidden;">
            <div style="padding: 20px; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: between; align-items: center;">
                <h2 style="font-size: 24px; font-weight: 600;">📊 Le mie Fatture</h2>
                <button onclick="closeInvoicesModal()" style="position: absolute; right: 20px; top: 20px; background: none; border: none; font-size: 24px; cursor: pointer;">✕</button>
            </div>
            
            <div style="padding: 20px; height: calc(100% - 80px); overflow-y: auto;">
                <?php if (count($invoices) > 0): ?>
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="border-bottom: 2px solid #e5e7eb;">
                                <th style="text-align: left; padding: 12px;">Numero</th>
                                <th style="text-align: left; padding: 12px;">Data</th>
                                <th style="text-align: left; padding: 12px;">Oggetto</th>
                                <th style="text-align: right; padding: 12px;">Importo</th>
                                <th style="text-align: center; padding: 12px;">Status</th>
                                <th style="text-align: center; padding: 12px;">Azioni</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ($invoices as $invoice): ?>
                            <tr style="border-bottom: 1px solid #f3f4f6;">
                                <td style="padding: 12px; font-weight: 600;"><?= htmlspecialchars($invoice['numero_fattura']) ?></td>
                                <td style="padding: 12px;"><?= date('d/m/Y', strtotime($invoice['data_fattura'])) ?></td>
                                <td style="padding: 12px;"><?= htmlspecialchars(substr($invoice['oggetto'], 0, 50)) ?>...</td>
                                <td style="padding: 12px; text-align: right; font-weight: 600;">€ <?= number_format($invoice['totale'], 2, ',', '.') ?></td>
                                <td style="padding: 12px; text-align: center;">
                                    <?php
                                    $statusColors = [
                                        'bozza' => '#94a3b8',
                                        'emessa' => '#f59e0b',
                                        'pagata' => '#10b981',
                                        'scaduta' => '#ef4444'
                                    ];
                                    $statusLabels = [
                                        'bozza' => 'Bozza',
                                        'emessa' => 'Emessa',
                                        'pagata' => 'Pagata',
                                        'scaduta' => 'Scaduta'
                                    ];
                                    $color = $statusColors[$invoice['status']] ?? '#6b7280';
                                    $label = $statusLabels[$invoice['status']] ?? $invoice['status'];
                                    ?>
                                    <span style="background: <?= $color ?>; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">
                                        <?= strtoupper($label) ?>
                                    </span>
                                </td>
                                <td style="padding: 12px; text-align: center;">
                                    <button onclick="viewInvoicePDF(<?= $invoice['id'] ?>)" 
                                            style="background: #3b82f6; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 14px;">
                                        Visualizza PDF
                                    </button>
                                </td>
                            </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                    
                    <!-- Riepilogo totali -->
                    <div style="margin-top: 30px; padding: 20px; background: #f8fafc; border-radius: 8px;">
                        <h3 style="font-size: 18px; font-weight: 600; margin-bottom: 16px;">Riepilogo Pagamenti</h3>
                        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px;">
                            <div>
                                <p style="color: #64748b; font-size: 14px;">Totale Pagato</p>
                                <p style="font-size: 24px; font-weight: 600; color: #10b981;">€ <?= number_format($paymentStats['total_paid'], 2, ',', '.') ?></p>
                            </div>
                            <div>
                                <p style="color: #64748b; font-size: 14px;">Da Pagare</p>
                                <p style="font-size: 24px; font-weight: 600; color: #f59e0b;">€ <?= number_format($paymentStats['total_pending'], 2, ',', '.') ?></p>
                            </div>
                            <div>
                                <p style="color: #64748b; font-size: 14px;">Totale Fatture</p>
                                <p style="font-size: 24px; font-weight: 600; color: #3b82f6;">
                                    € <?= number_format($paymentStats['total_paid'] + $paymentStats['total_pending'], 2, ',', '.') ?>
                                </p>
                            </div>
                        </div>
                    </div>
                <?php else: ?>
                    <div style="text-align: center; padding: 60px;">
                        <div style="font-size: 48px; margin-bottom: 16px;">📄</div>
                        <h3 style="font-size: 20px; font-weight: 600; margin-bottom: 8px;">Nessuna fattura disponibile</h3>
                        <p style="color: #64748b;">Le tue fatture appariranno qui quando saranno emesse.</p>
                    </div>
                <?php endif; ?>
            </div>
        </div>
    </div>

    <!-- Widget Chat Ticket -->
    <?php if ($currentChatTicket): ?>
    <div id="ticketChatWidget" class="chat-widget">
        <div class="chat-header" onclick="toggleChat()">
            <div class="chat-header-info">
                <div class="chat-title">Ticket #<?= $currentChatTicket['ticket_number'] ?></div>
                <div class="chat-subtitle"><?= htmlspecialchars($currentChatTicket['subject']) ?></div>
            </div>
            <div class="chat-controls">
                <?php if ($currentChatTicket['unread_messages'] > 0): ?>
                <div class="chat-unread-badge"><?= $currentChatTicket['unread_messages'] ?></div>
                <?php endif; ?>
                <button class="chat-toggle-btn" id="chatToggleBtn">
                    <span class="chat-toggle-icon">▲</span>
                </button>
            </div>
        </div>
        
        <div class="chat-body" id="chatBody">
            <div class="chat-messages" id="chatMessages">
                <?php
                $lastDate = '';
                foreach ($chatMessages as $msg):
                    // Separatore data
                    if ($msg['date_formatted'] !== $lastDate):
                        $lastDate = $msg['date_formatted'];
                        $dateLabel = date('d/m/Y') === $msg['date_formatted'] ? 'Oggi' : date('d/m/Y', strtotime($msg['date_formatted']));
                ?>
                <div class="chat-date-separator">
                    <span><?= $dateLabel ?></span>
                </div>
                <?php endif; ?>
                
                <div class="chat-message <?= $msg['client_id'] ? 'client-message' : 'admin-message' ?> <?= $msg['is_internal'] ? 'internal-message' : '' ?>">
                    <?php if (!$msg['is_internal']): ?>
                    <div class="message-header">
                        <span class="message-author">
                            <?= $msg['client_id'] ? 'Tu' : ($msg['admin_name'] ?: 'Supporto') ?>
                        </span>
                        <span class="message-time"><?= $msg['time_formatted'] ?></span>
                    </div>
                    <div class="message-content">
                        <?= nl2br(htmlspecialchars($msg['message'])) ?>
                    </div>
                    <?php endif; ?>
                </div>
                <?php endforeach; ?>
            </div>
            
            <form class="chat-input-form" onsubmit="sendChatMessage(event)">
                <div class="chat-input-container">
                    <textarea class="chat-input" 
                              placeholder="Scrivi un messaggio..." 
                              name="message" 
                              rows="1" 
                              maxlength="1000"
                              onkeypress="handleChatKeypress(event)"
                              required></textarea>
                    <button type="submit" class="chat-send-btn">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                        </svg>
                    </button>
                </div>
                <input type="hidden" name="action" value="send_chat_message">
                <input type="hidden" name="ticket_id" value="<?= $currentChatTicket['id'] ?>">
            </form>
        </div>
    </div>
    <?php endif; ?>

    <script>
        function toggleUserMenu() {
            const dropdown = document.getElementById('userDropdown');
            dropdown.classList.toggle('active');
        }
        
        // Chiudi dropdown cliccando fuori
        document.addEventListener('click', function(e) {
            const userMenu = document.querySelector('.user-menu');
            if (!userMenu.contains(e.target)) {
                document.getElementById('userDropdown').classList.remove('active');
            }
        });

        function openInvoicesModal() {
        const modal = document.getElementById('invoicesModal');
        if (!modal) {
            console.error('Modal fatture non trovato');
            alert('Errore: impossibile aprire il modal delle fatture');
            return;
        }
        
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
        
        // Add event listener for ESC key
        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                closeInvoicesModal();
                document.removeEventListener('keydown', handleEsc);
            }
        };
        document.addEventListener('keydown', handleEsc);
    }
    
    function closeInvoicesModal() {
        const modal = document.getElementById('invoicesModal');
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    }
        
        function viewInvoicePDF(invoiceId) {
            // Usa l'endpoint specifico per i clienti
            window.open('/ajax/client_generate_pdf.php?id=' + invoiceId, '_blank');
        }
        
        // Chiudi modal cliccando fuori
        document.getElementById('invoicesModal').addEventListener('click', function(e) {
            if (e.target === this) {
                closeInvoicesModal();
            }
        });
        function showInvoiceDetails(invoiceId) {
            // Trova la fattura nei dati già caricati (se disponibili)
            // Questo evita chiamate AJAX non necessarie
            const invoiceRows = document.querySelectorAll('tr[data-invoice-id="' + invoiceId + '"]');
            
            if (invoiceRows.length > 0) {
                const row = invoiceRows[0];
                const cells = row.querySelectorAll('td');
                
                if (cells.length >= 5) {
                    const details = {
                        numero: cells[0].textContent,
                        data: cells[1].textContent,
                        oggetto: cells[2].textContent,
                        importo: cells[3].textContent,
                        status: cells[4].textContent
                    };
                    
                    // Mostra un piccolo tooltip o highlight
                    showInvoiceTooltip(invoiceId, details);
                }
            }
        }
        
        function showInvoiceTooltip(invoiceId, details) {
            // Rimuovi tooltip esistenti
            const existingTooltips = document.querySelectorAll('.invoice-tooltip');
            existingTooltips.forEach(tooltip => tooltip.remove());
            
            // Crea nuovo tooltip
            const tooltip = document.createElement('div');
            tooltip.className = 'invoice-tooltip';
            tooltip.innerHTML = `
                <div style="background: #1f2937; color: white; padding: 12px; border-radius: 6px; position: fixed; 
                            z-index: 10000; box-shadow: 0 4px 12px rgba(0,0,0,0.3); max-width: 300px;">
                    <h4 style="margin: 0 0 8px 0; font-size: 14px;">Fattura ${details.numero}</h4>
                    <p style="margin: 0; font-size: 12px; opacity: 0.9;">
                        <strong>Data:</strong> ${details.data}<br>
                        <strong>Oggetto:</strong> ${details.oggetto}<br>
                        <strong>Importo:</strong> ${details.importo}<br>
                        <strong>Status:</strong> ${details.status}
                    </p>
                    <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.2); font-size: 11px; opacity: 0.8;">
                        Clicca "Visualizza PDF" per aprire la fattura completa
                    </div>
                </div>
            `;
            
            document.body.appendChild(tooltip);
            
            // Posiziona il tooltip vicino al mouse
            const updatePosition = (e) => {
                const tooltipDiv = tooltip.querySelector('div');
                tooltipDiv.style.left = (e.clientX + 10) + 'px';
                tooltipDiv.style.top = (e.clientY - 10) + 'px';
            };
            
            document.addEventListener('mousemove', updatePosition);
            
            // Rimuovi tooltip dopo 3 secondi o al click
            setTimeout(() => {
                tooltip.remove();
                document.removeEventListener('mousemove', updatePosition);
            }, 3000);
            
            tooltip.addEventListener('click', () => {
                tooltip.remove();
                document.removeEventListener('mousemove', updatePosition);
            });
        }

        // Gestione notifiche
        function toggleNotifications() {
            const dropdown = document.getElementById('notificationsDropdown');
            const isVisible = dropdown.style.display === 'block';
            dropdown.style.display = isVisible ? 'none' : 'block';
            
            // Chiudi menu utente se aperto
            document.getElementById('userDropdown').classList.remove('active');
        }
        
        function markAsRead(notificationId) {
            fetch('/api/client-notifications.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                credentials: 'include',
                body: 'action=mark_read&notification_id=' + notificationId
            }).then(() => {
                // Rimuovi classe unread
                document.querySelector(`[data-id="${notificationId}"]`).classList.remove('unread');

                // Aggiorna contatore
                updateNotificationCount();
            });
        }

        function markAsReadAndRedirect(notificationId, url) {
            // Prima marca come letto
            fetch('/api/client-notifications.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                credentials: 'include',
                body: 'action=mark_read&notification_id=' + notificationId
            }).then(() => {
                // Poi reindirizza
                window.location.href = url;
            });
        }

        function markAllAsRead() {
            fetch('/api/client-notifications.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                credentials: 'include',
                body: 'action=mark_all_read'
            }).then(() => {
                // Rimuovi tutte le classi unread
                document.querySelectorAll('.notification-item.unread').forEach(item => {
                    item.classList.remove('unread');
                });
                
                // Nascondi contatore
                const countElement = document.querySelector('.notification-count');
                if (countElement) {
                    countElement.style.display = 'none';
                }
            });
        }
        
        function updateNotificationCount() {
            fetch('/api/client-notifications.php?action=get_count', {
                credentials: 'include'
            })
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Network response was not ok');
                    }
                    return response.json();
                })
                .then(data => {
                    const countElement = document.querySelector('.notification-count');
                    if (data.count > 0) {
                        if (!countElement) {
                            // Crea elemento contatore
                            const bell = document.querySelector('.notification-bell');
                            const span = document.createElement('span');
                            span.className = 'notification-count';
                            span.textContent = data.count > 9 ? '9+' : data.count;
                            bell.appendChild(span);
                        } else {
                            countElement.textContent = data.count > 9 ? '9+' : data.count;
                            countElement.style.display = 'block';
                        }
                    } else if (countElement) {
                        countElement.style.display = 'none';
                    }
                })
                .catch(error => {
                    console.log('Errore caricamento notifiche:', error);
                    // Silenzioso - non disturbare l'utente
                });
        }
        
        // Chiudi dropdown cliccando fuori
        document.addEventListener('click', function(e) {
            const notificationCenter = document.querySelector('.notification-center');
            const notificationsDropdown = document.getElementById('notificationsDropdown');
            
            if (!notificationCenter.contains(e.target)) {
                notificationsDropdown.style.display = 'none';
            }
        });
        
        // Aggiorna notifiche ogni 30 secondi
        setInterval(updateNotificationCount, 30000);

        // Gestione Chat Widget
        let chatCollapsed = localStorage.getItem('chatCollapsed') === 'true';

        // Inizializza stato chat
        document.addEventListener('DOMContentLoaded', function() {
            const chatBody = document.getElementById('chatBody');
            const chatWidget = document.getElementById('ticketChatWidget');
            
            if (chatBody && chatWidget) {
                if (chatCollapsed) {
                    chatBody.classList.add('collapsed');
                    chatWidget.classList.add('collapsed');
                }
                
                // Scroll automatico in fondo
                scrollToBottom();
                
                // Auto-resize textarea
                const chatInput = document.querySelector('.chat-input');
                if (chatInput) {
                    chatInput.addEventListener('input', function() {
                        this.style.height = 'auto';
                        this.style.height = (this.scrollHeight) + 'px';
                    });
                }
            }
        });

        function toggleChat() {
            const chatBody = document.getElementById('chatBody');
            const chatWidget = document.getElementById('ticketChatWidget');
            
            if (!chatBody || !chatWidget) return;
            
            chatCollapsed = !chatCollapsed;
            localStorage.setItem('chatCollapsed', chatCollapsed);
            
            if (chatCollapsed) {
                chatBody.classList.add('collapsed');
                chatWidget.classList.add('collapsed');
            } else {
                chatBody.classList.remove('collapsed');
                chatWidget.classList.remove('collapsed');
                scrollToBottom();
            }
        }

        function scrollToBottom() {
            const chatMessages = document.getElementById('chatMessages');
            if (chatMessages) {
                chatMessages.scrollTop = chatMessages.scrollHeight;
            }
        }

        function handleChatKeypress(event) {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                sendChatMessage(event);
            }
        }

        async function sendChatMessage(event) {
            event.preventDefault();
            
            const form = event.target.closest('form');
            const textarea = form.querySelector('.chat-input');
            const sendBtn = form.querySelector('.chat-send-btn');
            const message = textarea.value.trim();
            
            // DEBUG: Log del messaggio
            console.log('Messaggio da inviare:', message);
            console.log('Lunghezza messaggio:', message.length);
            
            if (!message) {
                alert('Inserisci un messaggio prima di inviare');
                return;
            }
            
            // Disabilita input
            textarea.disabled = true;
            sendBtn.disabled = true;
            
            // Aggiungi messaggio temporaneo
            addTempMessage(message);
            
            // Crea FormData manualmente per essere sicuri
            const formData = new FormData();
            formData.append('action', 'send_chat_message');
            formData.append('ticket_id', form.querySelector('input[name="ticket_id"]').value);
            formData.append('message', message);
            formData.append('ajax', '1');
            
            // DEBUG: Log FormData
            console.log('FormData entries:');
            for (let pair of formData.entries()) {
                console.log(pair[0] + ': ' + pair[1]);
            }
            
            // Pulisci textarea
            textarea.value = '';
            textarea.style.height = 'auto';
            
            try {
                const response = await fetch('', {
                    method: 'POST',
                    body: formData
                });
                
                const result = await response.json();
                console.log('Risposta server:', result);
                
                if (result.success) {
                    // Ricarica solo i messaggi della chat
                    setTimeout(() => {
                        location.reload();
                    }, 300);
                } else {
                    alert('Errore: ' + (result.error || 'Errore sconosciuto'));
                    // Rimuovi messaggio temporaneo in caso di errore
                    const tempMsg = document.querySelector('.temp-message');
                    if (tempMsg) tempMsg.remove();
                    // Ripristina messaggio nel textarea
                    textarea.value = message;
                }
                
            } catch (error) {
                console.error('Errore invio messaggio:', error);
                alert('Errore nell\'invio del messaggio');
                // Rimuovi messaggio temporaneo
                const tempMsg = document.querySelector('.temp-message');
                if (tempMsg) tempMsg.remove();
                // Ripristina messaggio nel textarea
                textarea.value = message;
            } finally {
                textarea.disabled = false;
                sendBtn.disabled = false;
            }
        }

        function addTempMessage(message) {
            const chatMessages = document.getElementById('chatMessages');
            if (!chatMessages) return;
            
            const tempMessage = document.createElement('div');
            tempMessage.className = 'chat-message client-message temp-message';
            tempMessage.innerHTML = `
                <div class="message-header">
                    <span class="message-author">Tu</span>
                    <span class="message-time">Ora</span>
                </div>
                <div class="message-content" style="opacity: 0.7;">
                    ${message.replace(/\n/g, '<br>')}
                </div>
            `;
            
            chatMessages.appendChild(tempMessage);
            scrollToBottom();
        }

        // Polling per nuovi messaggi (opzionale - ogni 30 secondi)
        setInterval(function() {
            // Solo se la chat è aperta e esiste
            if (!chatCollapsed && document.getElementById('ticketChatWidget')) {
                checkForNewMessages();
                // NUOVO: Controlla anche se il ticket è ancora attivo
                checkTicketStatus();
            }
        }, 30000);

        async function checkTicketStatus() {
            <?php if ($currentChatTicket): ?>
            try {
                const response = await fetch('/ajax/check_ticket_status.php?ticket_id=<?= $currentChatTicket['id'] ?>');
                const data = await response.json();
                
                if (data.status === 'chiuso') {
                    // Ticket chiuso, nascondi la chat
                    const chatWidget = document.getElementById('ticketChatWidget');
                    if (chatWidget) {
                        chatWidget.style.display = 'none';
                    }
                    
                    // Mostra notifica
                    alert('Il ticket #<?= $currentChatTicket['ticket_number'] ?> è stato chiuso. La chat non è più disponibile.');
                    
                    // Ricarica la pagina per aggiornare completamente
                    setTimeout(() => location.reload(), 2000);
                }
            } catch (error) {
                // Silenzioso - non disturbare l'utente
            }
            <?php endif; ?>
        }

        async function checkForNewMessages() {
            <?php if ($currentChatTicket): ?>
            try {
                const response = await fetch('ajax/check_chat_messages.php?ticket_id=<?= $currentChatTicket['id'] ?>&last_check=' + Date.now());
                const data = await response.json();
                
                if (data.hasNewMessages) {
                    // Ricarica solo la sezione chat
                    location.reload();
                }
            } catch (error) {
                // Silenzioso - non disturbare l'utente
            }
            <?php endif; ?>
        }
    </script>

    <!-- Popup Nuovo Preventivo - Stile Notion -->
    <?php if ($hasUnreadQuoteNotification && $quoteNotificationData): ?>
    <div id="quoteNotificationModal" class="quote-modal-overlay" style="display: block;">
        <div class="quote-modal-content">
            <div class="quote-modal-header">
                <div style="text-align: center; margin-bottom: 16px;">
                    <div style="font-size: 48px; line-height: 1;">💼</div>
                </div>
                <h2 style="color: #37352f; margin: 0; font-size: 20px; font-weight: 600; text-align: center; line-height: 1.3;">
                    Nuovo Preventivo Disponibile
                </h2>
            </div>
            <div class="quote-modal-body">
                <p style="font-size: 14px; color: #37352f; text-align: center; margin: 0 0 8px 0;">
                    <?= htmlspecialchars($quoteNotificationData['title'] ?? 'Hai un nuovo preventivo') ?>
                </p>
                <?php if (!empty($quoteNotificationData['quote_number'])): ?>
                <p style="text-align: center; color: rgba(55, 53, 47, 0.65); font-size: 13px; margin: 0 0 16px 0;">
                    <?= htmlspecialchars($quoteNotificationData['quote_number']) ?>
                </p>
                <?php endif; ?>
                <div style="background: rgba(55, 53, 47, 0.04); border-radius: 6px; padding: 12px; margin: 16px 0 24px 0;">
                    <p style="text-align: center; color: rgba(55, 53, 47, 0.65); font-size: 13px; margin: 0; line-height: 1.5;">
                        <?= htmlspecialchars($quoteNotificationData['message'] ?? '') ?>
                    </p>
                </div>
                <div style="display: flex; gap: 8px;">
                    <button onclick="dismissQuoteNotification()" class="quote-modal-btn-secondary">
                        Più tardi
                    </button>
                    <button onclick="viewQuoteNow(<?= $quoteNotificationData['id'] ?>)" class="quote-modal-btn-primary">
                        Visualizza preventivo
                    </button>
                </div>
            </div>
        </div>
    </div>

    <style>
        /* Popup Stile Notion */
        .quote-modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(15, 15, 15, 0.6);
            backdrop-filter: blur(8px);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
            animation: fadeIn 0.2s ease;
        }

        .quote-modal-content {
            background: #ffffff;
            border-radius: 12px;
            padding: 48px 40px 40px 40px;
            max-width: 520px;
            width: 90%;
            box-shadow:
                0 16px 70px rgba(0, 0, 0, 0.2),
                0 0 0 1px rgba(0, 0, 0, 0.05);
            animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif, "Segoe UI Emoji", "Segoe UI Symbol";
        }

        .quote-modal-header {
            border-bottom: none;
            padding-bottom: 0;
            margin-bottom: 24px;
        }

        .quote-modal-body {
            padding: 0;
        }

        .quote-modal-body p {
            line-height: 1.5;
            color: #37352f;
        }

        .quote-modal-btn-primary {
            flex: 1;
            background: #37352f;
            color: #ffffff;
            border: none;
            padding: 10px 16px;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: background 0.15s ease;
            font-family: inherit;
            height: 36px;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .quote-modal-btn-primary:hover {
            background: #2f2f2f;
            transform: none;
            box-shadow: none;
        }

        .quote-modal-btn-primary:active {
            background: #1a1a1a;
        }

        .quote-modal-btn-secondary {
            flex: 1;
            background: transparent;
            color: rgba(55, 53, 47, 0.65);
            border: none;
            padding: 10px 16px;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: background 0.15s ease;
            font-family: inherit;
            height: 36px;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .quote-modal-btn-secondary:hover {
            background: rgba(55, 53, 47, 0.08);
            border-color: transparent;
        }

        .quote-modal-btn-secondary:active {
            background: rgba(55, 53, 47, 0.12);
        }

        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }

        @keyframes slideUp {
            from {
                opacity: 0;
                transform: translateY(30px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        @keyframes bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
        }

        @keyframes fadeOut {
            from { opacity: 1; }
            to { opacity: 0; }
        }
    </style>

    <script>
        function dismissQuoteNotification() {
            const modal = document.getElementById('quoteNotificationModal');
            if (modal) {
                modal.style.animation = 'fadeOut 0.3s ease';
                setTimeout(() => {
                    modal.style.display = 'none';
                }, 300);
            }
        }

        function viewQuoteNow(notificationId) {
            // Marca come letta e reindirizza
            fetch('/api/client-notifications.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                credentials: 'include',
                body: 'action=mark_read&notification_id=' + notificationId
            }).then(() => {
                window.location.href = '/preventivo.php';
            });
        }
    </script>
    <?php endif; ?>

</body>
</html>