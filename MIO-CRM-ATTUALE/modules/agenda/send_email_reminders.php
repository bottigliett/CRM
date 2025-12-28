<?php
// File: /modules/agenda/send_email_reminders_simple.php
// Sistema invio promemoria email - VERSIONE SEMPLIFICATA per integrazione esistente

// 🕐 MANTIENI FUSO ORARIO UTC (come il database)
// date_default_timezone_set('Europe/Rome'); // ← COMMENTATO per allinearsi al database

// Log con timestamp
function logMessage($message) {
    $timestamp = date('Y-m-d H:i:s');
    $logLine = "[{$timestamp} UTC] {$message}" . PHP_EOL;
    echo $logLine;
    error_log($logLine);
}

logMessage("🚀 Controllo promemoria email - Allineato al database UTC");
logMessage("📅 Ora attuale: " . date('Y-m-d H:i:s') . " (UTC - database timezone)");

try {
    // Connessione database
    $dsn = "mysql:host=127.0.0.1;dbname=u706045794_crm_mismo;charset=utf8mb4";
    $pdo = new PDO($dsn, 'u706045794_mismo_crm_new', 'BLQ$>:;*9+h', [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
    
    // Controlla se tabella esiste
    $stmt = $pdo->query("SHOW TABLES LIKE 'agenda_email_reminders'");
    if ($stmt->rowCount() === 0) {
        logMessage("⚠️ Tabella agenda_email_reminders non trovata");
        logMessage("💡 Crea prima un evento con promemoria per inizializzare il sistema");
        exit;
    }
    
    // Controlla struttura tabella esistente
    $stmt = $pdo->query("DESCRIBE agenda_email_reminders");
    $columns = $stmt->fetchAll(PDO::FETCH_COLUMN);
    
    logMessage("📊 Colonne tabella: " . implode(', ', $columns));
    
    // Adatta query alla struttura esistente
    $hasEventStartDatetime = in_array('event_start_datetime', $columns);
    $hasUserEmail = in_array('user_email', $columns);
    $hasEventTitle = in_array('event_title', $columns);
    $hasSentAt = in_array('sent_at', $columns);
    $hasEmailSentAt = in_array('email_sent_at', $columns);
    
    // Determina nome colonna per timestamp invio
    $sentAtColumn = $hasEmailSentAt ? 'email_sent_at' : ($hasSentAt ? 'sent_at' : 'created_at');
    
    logMessage("📊 Struttura tabella - sent_at: " . ($hasSentAt ? 'YES' : 'NO') . ", email_sent_at: " . ($hasEmailSentAt ? 'YES' : 'NO'));
    
    // Trova promemoria da inviare
    $now = date('Y-m-d H:i:s');
    
    if ($hasEventStartDatetime) {
        // Usa struttura personalizzata
        $stmt = $pdo->prepare("
            SELECT * FROM agenda_email_reminders r
            WHERE r.status = 'pending'
            AND r.reminder_datetime <= ?
            AND r.event_start_datetime > ?
            ORDER BY r.reminder_datetime ASC
            LIMIT 20
        ");
        $stmt->execute([$now, $now]);
        $reminders = $stmt->fetchAll();
        
    } else {
        // Usa struttura standard con JOIN
        $stmt = $pdo->prepare("
            SELECT 
                r.*,
                e.title as event_title,
                e.start_datetime as event_start_datetime,
                u.email as user_email,
                u.first_name,
                u.last_name
            FROM agenda_email_reminders r
            JOIN agenda_events e ON r.event_id = e.id  
            JOIN users u ON r.user_id = u.id
            WHERE r.status = 'pending'
            AND r.reminder_datetime <= ?
            AND e.start_datetime > ?
            ORDER BY r.reminder_datetime ASC
            LIMIT 20
        ");
        $stmt->execute([$now, $now]);
        $reminders = $stmt->fetchAll();
    }
    
    logMessage("🔍 Query eseguita - Trovati: " . count($reminders) . " promemoria");
    
    if (empty($reminders)) {
        // Mostra statistiche debug adattate alla struttura
        if ($hasEventStartDatetime) {
            $stmt = $pdo->query("
                SELECT 
                    COUNT(*) as total,
                    COUNT(CASE WHEN r.status = 'pending' THEN 1 END) as pending,
                    COUNT(CASE WHEN r.reminder_datetime <= '{$now}' THEN 1 END) as ready_by_time,
                    COUNT(CASE WHEN r.event_start_datetime > '{$now}' THEN 1 END) as future_events
                FROM agenda_email_reminders r
            ");
        } else {
            $stmt = $pdo->query("
                SELECT 
                    COUNT(*) as total,
                    COUNT(CASE WHEN r.status = 'pending' THEN 1 END) as pending,
                    COUNT(CASE WHEN r.reminder_datetime <= '{$now}' THEN 1 END) as ready_by_time,
                    COUNT(CASE WHEN e.start_datetime > '{$now}' THEN 1 END) as future_events
                FROM agenda_email_reminders r
                JOIN agenda_events e ON r.event_id = e.id
            ");
        }
        $stats = $stmt->fetch();
        
        logMessage("📊 Statistiche:");
        logMessage("   - Totali: {$stats['total']}");
        logMessage("   - Pending: {$stats['pending']}");
        logMessage("   - Pronti per orario: {$stats['ready_by_time']}");
        logMessage("   - Eventi futuri: {$stats['future_events']}");
        logMessage("📭 Nessun promemoria da inviare");
        exit;
    }
    
    $sentCount = 0;
    $failedCount = 0;
    
    foreach ($reminders as $reminder) {
        try {
            // Adatta i dati alla struttura disponibile
            $eventTitle = $reminder['event_title'] ?? 'Evento senza titolo';
            $userEmail = $reminder['user_email'] ?? $reminder['email'] ?? '';
            $eventStartDatetime = $reminder['event_start_datetime'] ?? $reminder['start_datetime'] ?? '';
            
            if (empty($userEmail)) {
                logMessage("⚠️ Skipping reminder ID {$reminder['id']} - no email");
                continue;
            }
            
            logMessage("📧 Invio promemoria: {$eventTitle} -> {$userEmail}");
            
            // Invia email
            $success = sendSimpleReminderEmail($reminder, $eventTitle, $userEmail, $eventStartDatetime);
            
            if ($success) {
                // Aggiorna stato con nome colonna corretto
                $updateStmt = $pdo->prepare("
                    UPDATE agenda_email_reminders 
                    SET status = 'sent', {$sentAtColumn} = NOW() 
                    WHERE id = ?
                ");
                $updateStmt->execute([$reminder['id']]);
                
                $sentCount++;
                logMessage("✅ Inviato con successo (ID: {$reminder['id']})");
            } else {
                throw new Exception("Invio email fallito");
            }
            
        } catch (Exception $e) {
            // Aggiorna stato errore con nome colonna corretto
            $updateStmt = $pdo->prepare("
                UPDATE agenda_email_reminders 
                SET status = 'failed', {$sentAtColumn} = NOW() 
                WHERE id = ?
            ");
            $updateStmt->execute([$reminder['id']]);
            
            $failedCount++;
            logMessage("❌ Errore invio (ID: {$reminder['id']}): " . $e->getMessage());
        }
        
        // Pausa tra invii
        usleep(300000); // 0.3 secondi
    }
    
    logMessage("📊 Riepilogo: {$sentCount} inviati, {$failedCount} falliti");
    
    // Pulizia promemoria vecchi (adattata alla struttura)
    if ($hasEventStartDatetime) {
        $cleanupStmt = $pdo->prepare("
            DELETE FROM agenda_email_reminders 
            WHERE event_start_datetime < DATE_SUB(NOW(), INTERVAL 7 DAY)
        ");
    } else {
        $cleanupStmt = $pdo->prepare("
            DELETE r FROM agenda_email_reminders r
            JOIN agenda_events e ON r.event_id = e.id
            WHERE e.start_datetime < DATE_SUB(NOW(), INTERVAL 7 DAY)
        ");
    }
    $cleanupStmt->execute();
    $deleted = $cleanupStmt->rowCount();
    
    if ($deleted > 0) {
        logMessage("🧹 Eliminati {$deleted} promemoria di eventi passati");
    }
    
    logMessage("✅ Controllo completato");
    
} catch (Exception $e) {
    logMessage("💥 ERRORE: " . $e->getMessage());
    exit(1);
}

/**
 * Invia email promemoria semplificata - versione adattiva
 */
function sendSimpleReminderEmail($reminder, $eventTitle, $userEmail, $eventStartDatetime) {
    $to = $userEmail;
    
    // Calcola tempo rimanente
    $eventTimestamp = strtotime($eventStartDatetime);
    $minutesUntil = round(($eventTimestamp - time()) / 60);
    $timeUntil = $minutesUntil < 60 ? "{$minutesUntil} minuti" : round($minutesUntil / 60, 1) . " ore";
    
    $subject = "Promemoria: {$eventTitle}";
    
    $startDate = date('d/m/Y', $eventTimestamp);
    $startTime = date('H:i', $eventTimestamp);
    
    $message = "
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset='UTF-8'>
        <meta name='viewport' content='width=device-width, initial-scale=1.0'>
        <title>Promemoria Evento</title>
    </head>
    <body style='font-family: elza, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; background: #f5f5f5;'>
        <div style='max-width:680px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;box-shadow: 5px 5px 38px 1px rgba(0,0,0,0.2);'>
            
            <!-- Header -->
            <div style='background: #f5f5f5;color:white;padding:30px 20px;text-align:center'>
                <h1 style='margin:0;color: #0f172a;font-size: 45px;font-family: elza;'>Promemoria Evento</h1>

            </div>
            
            <!-- Contenuto -->
            <div style='padding: 30px 20px;'>
                
                <!-- Card Evento -->
                <div style='background: #f5f5f5; border-radius: 8px; border-left: 5px solid #0f172a; padding: 20px; margin: 20px 0;'>
                    <h2 style='margin:0 0 15px 0;color:#333;font-size: 33px;'>
                        {$eventTitle}
                    </h2>
                    
                    <div style='display: grid; gap: 12px;'>
                        <div style='display: flex; align-items: center; gap: 10px;'>
                            <span style='color: #666; min-width: 80px;'><strong> Data:</strong></span>
                            <span>{$startDate}</span>
                        </div>
                        
                        <div style='display: flex; align-items: center; gap: 10px;'>
                            <span style='color: #666; min-width: 80px;'><strong> Orario:</strong></span>
                            <span>{$startTime}</span>
                        </div>
                    </div>
                </div>
                
                <!-- Azione -->
                <div style='text-align: center; margin: 30px 0;'>
                    <a href='https://portale.studiomismo.it/modules/agenda/' 
                       style='display: inline-block; background: #0f172a; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold;'>
                        Apri Agenda
                    </a>
                </div>
            </div>
            
            <!-- Footer -->
            <div style='background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 14px;'>
                <p style='margin: 0;'>
                    📧 Email automatica da <strong>CRM Studio Mismo</strong><br>
                    🕒 Inviata il " . date('d/m/Y \a\l\l\e H:i') . "
                </p>
            </div>
        </div>
    </body>
    </html>
    ";
    
    $headers = [
        'MIME-Version: 1.0',
        'Content-type: text/html; charset=UTF-8',
        'From: CRM Studio Mismo <agenda@studiomismo.it>',
        'Reply-To: noreply@studiomismo.it',
        'X-Mailer: PHP/' . phpversion()
    ];
    
    return mail($to, $subject, $message, implode("\r\n", $headers));
}
?>