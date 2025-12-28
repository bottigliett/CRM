<?php
// File: /modules/agenda/send_email_reminders_simple.php
// Sistema invio promemoria email - VERSIONE NOTION STYLE CORRETTA

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
            
            // 🔧 FIX: Mantieni nome funzione originale ma con contenuto Notion
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
 * 🔧 FUNZIONE CORRETTA - Mantiene nome originale ma con stile Notion
 */
function sendSimpleReminderEmail($reminder, $eventTitle, $userEmail, $eventStartDatetime) {
    $to = $userEmail;
    
    // 🕐 FIX TIMEZONE: Come il codice originale ma corretto
    $originalTz = date_default_timezone_get();
    
    try {
        // Forza UTC per calcoli
        date_default_timezone_set('UTC');
        $eventTimestamp = strtotime($eventStartDatetime);
        $nowTimestamp = time();
        $minutesUntil = round(($eventTimestamp - $nowTimestamp) / 60);
        
        // Converti per visualizzazione
        date_default_timezone_set('Europe/Rome');
        $startDate = date('d/m/Y', $eventTimestamp);
        $startTime = date('H:i', $eventTimestamp);
        $dayName = date('l', $eventTimestamp);
        $currentTime = date('d/m/Y H:i');
        
        // Calcola tempo rimanente
        if ($minutesUntil < 0) {
            $timeUntil = "iniziato " . abs($minutesUntil) . " minuti fa";
            $urgencyColor = "#ef4444";
            $urgencyIcon = "🚨";
        } elseif ($minutesUntil <= 5) {
            $timeUntil = "{$minutesUntil} minuti";
            $urgencyColor = "#f59e0b";
            $urgencyIcon = "🚨";
        } elseif ($minutesUntil < 60) {
            $timeUntil = "{$minutesUntil} minuti";
            $urgencyColor = "#3b82f6";
            $urgencyIcon = "⏰";
        } else {
            $hours = round($minutesUntil / 60, 1);
            $timeUntil = "{$hours} ore";
            $urgencyColor = "#6b7280";
            $urgencyIcon = "📅";
        }
        
        // Traduzione giorni
        $dayNames = [
            'Monday' => 'Lunedì', 'Tuesday' => 'Martedì', 'Wednesday' => 'Mercoledì',
            'Thursday' => 'Giovedì', 'Friday' => 'Venerdì', 'Saturday' => 'Sabato', 'Sunday' => 'Domenica'
        ];
        $dayNameIT = $dayNames[$dayName] ?? $dayName;
        
        $subject = "🔔 Promemoria: {$eventTitle} - tra {$timeUntil}";
        
        // 🎨 EMAIL STILE NOTION SEMPLIFICATO
        $message = "
        <!DOCTYPE html>
        <html lang='it'>
        <head>
            <meta charset='UTF-8'>
            <meta name='viewport' content='width=device-width, initial-scale=1.0'>
            <title>Promemoria Evento</title>
        </head>
        <body style='margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, sans-serif; background: #f5f5f5;'>
            <div style='max-width: 600px; margin: 0 auto; background: #ffffff;'>
                
                <!-- Header -->
                <div style='background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 32px; text-align: center;'>
                    <div style='font-size: 32px; margin-bottom: 8px;'>⏰</div>
                    <h1 style='color: white; margin: 0; font-size: 24px; font-weight: 600;'>Promemoria Evento</h1>
                    <p style='color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 16px;'>Il tuo evento inizia presto</p>
                </div>
                
                <!-- Contenuto -->
                <div style='padding: 40px 32px;'>
                    <!-- Titolo -->
                    <h1 style='font-size: 28px; font-weight: 700; color: #111827; margin: 0 0 24px 0; line-height: 1.2;'>
                        📅 {$eventTitle}
                    </h1>
                    
                    <!-- Callout urgenza -->
                    <div style='display: flex; padding: 16px; border-radius: 8px; margin: 24px 0; background: rgba(59, 130, 246, 0.1); border-left: 4px solid {$urgencyColor};'>
                        <div style='font-size: 20px; margin-right: 12px;'>{$urgencyIcon}</div>
                        <div>
                            <!--<div style='font-weight: 600; color: {$urgencyColor}; margin-bottom: 4px;'>Inizia tra {$timeUntil}</div>-->
                            <div style='color: #6b7280; font-size: 14px;'>Preparati per il tuo evento</div>
                        </div>
                    </div>
                    
                    <!-- Dettagli -->
                    <div style='margin: 32px 0;'>
                        <h3 style='font-size: 16px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 16px;'>Dettagli Evento</h3>
                        
                        <div style='padding: 12px 0; border-bottom: 1px solid #f3f4f6; display: flex; align-items: center;'>
                            <div style='background: #dbeafe; color: #3b82f6; border-radius: 4px; font-size: 14px; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; margin-right: 12px;'>📅</div>
                            <div style='font-weight: 500; color: #111827;'>{$dayNameIT}, {$startDate}</div>
                        </div>
                        
                        <div style='padding: 12px 0; border-bottom: 1px solid #f3f4f6; display: flex; align-items: center;'>
                            <div style='background: #fef3c7; color: #f59e0b; border-radius: 4px; font-size: 14px; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; margin-right: 12px;'>🕒</div>
                            <div style='font-weight: 500; color: #111827;'>{$startTime} (ora italiana)</div>
                        </div>
                    </div>
                    
                    <!-- Countdown -->
                    <div style='text-align: center; padding: 24px; background: #f8fafc; border-radius: 12px; border: 2px solid #e2e8f0; margin: 24px 0;'>
                        <div style='font-size: 32px; margin-bottom: 8px;'>{$urgencyIcon}</div>
                        <div style='font-size: 20px; font-weight: 700; color: {$urgencyColor}; margin-bottom: 8px;'>
                            " . strtoupper($timeUntil) . "
                        </div>
                        <div style='color: #64748b; font-size: 14px;'>al tuo evento</div>
                    </div>
                    
                    <!-- Bottone -->
                    <div style='text-align: center; margin: 32px 0;'>
                        <a href='https://portale.studiomismo.it/modules/agenda/' style='display: inline-block; padding: 14px 28px; background: #000000; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;'>
                            📅 Apri Agenda
                        </a>
                    </div>
                    
                    <!-- Suggerimento -->
                    <div style='background: #f1f5f9; border-radius: 8px; padding: 20px; margin: 24px 0;'>
                        <div style='display: flex; align-items: center; margin-bottom: 12px;'>
                            <div style='font-size: 16px; margin-right: 8px;'>💡</div>
                            <div style='font-weight: 600; color: #334155;'>Suggerimento</div>
                        </div>
                        <div style='color: #64748b; font-size: 14px; line-height: 1.5;'>
                            Assicurati di essere pronto in anticipo. Puoi modificare l'evento dall'agenda.
                        </div>
                    </div>
                </div>
                
                <!-- Footer -->
                <div style='background: #f9fafb; padding: 24px 32px; border-top: 1px solid #e5e7eb; text-align: center; color: #9ca3af; font-size: 13px;'>
                    <div style='margin-bottom: 8px;'>
                        <strong style='color: #6b7280;'>Studio Mismo CRM</strong>
                    </div>
                    <div>📧 Promemoria automatico inviato il {$currentTime}</div>
                    <div style='margin-top: 8px; font-size: 12px;'>
                        Questo è un messaggio automatico. Non rispondere a questa email.
                    </div>
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
        
        // Ripristina timezone
        date_default_timezone_set($originalTz);
        
        return mail($to, $subject, $message, implode("\r\n", $headers));
        
    } catch (Exception $e) {
        // Ripristina timezone in caso di errore
        if (isset($originalTz)) {
            date_default_timezone_set($originalTz);
        }
        return false;
    }
}
?>