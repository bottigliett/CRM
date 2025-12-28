<?php
// File: /modules/agenda/fix_120_minutes_offset.php
// Risolve il problema dell'offset di 120 minuti (2 ore) sui promemoria

echo "<h2>🎯 Fix Offset 120 Minuti - Soluzione Definitiva</h2>";

try {
    // Connessione database
    $dsn = "mysql:host=127.0.0.1;dbname=u706045794_crm_mismo;charset=utf8mb4";
    $pdo = new PDO($dsn, 'u706045794_mismo_crm_new', 'BLQ$>:;*9+h', [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
    
    // Forza UTC per coerenza
    date_default_timezone_set('UTC');
    
    echo "<div style='background: #e8f5e8; padding: 15px; border-radius: 5px; margin: 10px 0;'>";
    echo "<strong>🔍 PROBLEMA IDENTIFICATO:</strong><br>";
    echo "• Database e Server in UTC: " . date('Y-m-d H:i:s') . "<br>";
    echo "• Orario italiano: " . date('Y-m-d H:i:s', time() + 7200) . "<br>";
    echo "• Offset: +120 minuti (2 ore)<br>";
    echo "• <strong>I promemoria sono salvati con 2 ore di ritardo</strong>";
    echo "</div>";
    
    // === ANALISI PROMEMORIA PROBLEMATICI ===
    echo "<h3>📊 Analisi Promemoria Esistenti</h3>";
    
    $stmt = $pdo->query("
        SELECT 
            r.id,
            r.event_id,
            r.reminder_datetime,
            r.status,
            e.title as event_title,
            e.start_datetime as event_start,
            u.email as user_email,
            TIMESTAMPDIFF(MINUTE, NOW(), r.reminder_datetime) as minutes_until_reminder,
            TIMESTAMPDIFF(MINUTE, NOW(), e.start_datetime) as minutes_until_event,
            -- Calcolo con correzione -2 ore
            TIMESTAMPDIFF(MINUTE, NOW(), DATE_SUB(r.reminder_datetime, INTERVAL 2 HOUR)) as minutes_corrected
        FROM agenda_email_reminders r
        LEFT JOIN agenda_events e ON r.event_id = e.id
        LEFT JOIN users u ON r.user_id = u.id
        WHERE r.status = 'pending'
        ORDER BY r.reminder_datetime ASC
        LIMIT 15
    ");
    $reminders = $stmt->fetchAll();
    
    if (empty($reminders)) {
        echo "<div style='background: #fff3cd; padding: 10px; border-radius: 5px; margin: 10px 0;'>";
        echo "⚠️ <strong>Nessun promemoria pending trovato</strong>";
        echo "</div>";
    } else {
        echo "<table border='1' style='border-collapse: collapse; margin: 10px 0; width: 100%; font-size: 11px;'>";
        echo "<tr style='background: #f8f9fa;'>";
        echo "<th>ID</th><th>Evento</th><th>Email</th>";
        echo "<th>Promemoria Attuale</th><th>Promemoria Corretto</th>";
        echo "<th>Min Attuali</th><th>Min Corretti</th><th>Status</th>";
        echo "</tr>";
        
        $needsCorrection = 0;
        $readyAfterCorrection = 0;
        
        foreach ($reminders as $r) {
            $correctedTime = date('Y-m-d H:i:s', strtotime($r['reminder_datetime']) - 7200);
            $shouldSend = $r['minutes_corrected'] <= 0 && $r['minutes_until_event'] > -120;
            
            if ($r['minutes_until_reminder'] > 60) $needsCorrection++;
            if ($shouldSend) $readyAfterCorrection++;
            
            $rowColor = $shouldSend ? '#e8f5e8' : ($r['minutes_until_reminder'] > 60 ? '#fff3cd' : '#fff');
            
            echo "<tr style='background: {$rowColor};'>";
            echo "<td>{$r['id']}</td>";
            echo "<td>" . htmlspecialchars(substr($r['event_title'] ?? 'N/A', 0, 15)) . "</td>";
            echo "<td>" . htmlspecialchars(substr($r['user_email'] ?? 'N/A', 0, 20)) . "</td>";
            echo "<td style='font-size: 10px;'>{$r['reminder_datetime']}</td>";
            echo "<td style='font-size: 10px; color: blue;'>{$correctedTime}</td>";
            echo "<td style='text-align: center; color: red;'>{$r['minutes_until_reminder']}</td>";
            echo "<td style='text-align: center; color: green; font-weight: bold;'>{$r['minutes_corrected']}</td>";
            echo "<td style='text-align: center;'>";
            if ($shouldSend) {
                echo "🚀 <strong style='color: green;'>PRONTO</strong>";
            } elseif ($r['minutes_until_reminder'] > 60) {
                echo "🔧 <strong style='color: orange;'>FIX</strong>";
            } else {
                echo "⏳ OK";
            }
            echo "</td>";
            echo "</tr>";
        }
        echo "</table>";
        
        echo "<div style='background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 10px 0;'>";
        echo "<strong>📊 Riepilogo Analisi:</strong><br>";
        echo "🔧 <strong>Necessitano correzione:</strong> {$needsCorrection}<br>";
        echo "🚀 <strong>Pronti dopo correzione:</strong> {$readyAfterCorrection}<br>";
        echo "📧 <strong>Totale analizzati:</strong> " . count($reminders);
        echo "</div>";
    }
    
    // === APPLICAZIONE FIX ===
    echo "<h3>🔧 Applicazione Fix</h3>";
    
    if (isset($_GET['apply_fix']) && $_GET['apply_fix'] === 'confirm') {
        echo "<div style='background: #e8f5e8; padding: 15px; border-radius: 5px; margin: 10px 0;'>";
        echo "<strong>🚀 Applicazione Fix in corso...</strong><br><br>";
        
        // Trova tutti i promemoria che sembrano avere l'offset di +2 ore
        $stmt = $pdo->query("
            SELECT r.id, r.reminder_datetime, r.event_id, e.start_datetime
            FROM agenda_email_reminders r
            LEFT JOIN agenda_events e ON r.event_id = e.id
            WHERE r.status = 'pending'
            AND TIMESTAMPDIFF(MINUTE, NOW(), r.reminder_datetime) > 60
        ");
        $toFix = $stmt->fetchAll();
        
        echo "<strong>Promemoria da correggere: " . count($toFix) . "</strong><br><br>";
        
        $fixed = 0;
        $errors = 0;
        
        foreach ($toFix as $reminder) {
            try {
                // Sottrai 2 ore dal reminder_datetime
                $newReminderTime = date('Y-m-d H:i:s', strtotime($reminder['reminder_datetime']) - 7200);
                
                // Verifica struttura tabella per event_start_datetime
                $hasEventStartCol = false;
                $checkStmt = $pdo->query("SHOW COLUMNS FROM agenda_email_reminders LIKE 'event_start_datetime'");
                if ($checkStmt->rowCount() > 0) {
                    $hasEventStartCol = true;
                }
                
                if ($hasEventStartCol) {
                    // Se la tabella ha event_start_datetime, aggiorna anche quello
                    $newEventStartTime = date('Y-m-d H:i:s', strtotime($reminder['start_datetime']) - 7200);
                    $updateStmt = $pdo->prepare("
                        UPDATE agenda_email_reminders 
                        SET reminder_datetime = ?, event_start_datetime = ?
                        WHERE id = ?
                    ");
                    $updateStmt->execute([$newReminderTime, $newEventStartTime, $reminder['id']]);
                } else {
                    // Solo reminder_datetime
                    $updateStmt = $pdo->prepare("
                        UPDATE agenda_email_reminders 
                        SET reminder_datetime = ?
                        WHERE id = ?
                    ");
                    $updateStmt->execute([$newReminderTime, $reminder['id']]);
                }
                
                echo "✅ ID {$reminder['id']}: {$reminder['reminder_datetime']} → {$newReminderTime}<br>";
                $fixed++;
                
            } catch (Exception $e) {
                echo "❌ Errore ID {$reminder['id']}: " . $e->getMessage() . "<br>";
                $errors++;
            }
        }
        
        echo "<br><strong>📊 Risultati Fix:</strong><br>";
        echo "✅ <strong>Corretti:</strong> {$fixed}<br>";
        echo "❌ <strong>Errori:</strong> {$errors}<br>";
        echo "</div>";
        
        // Controlla quanti sono ora pronti per l'invio
        $stmt = $pdo->query("
            SELECT COUNT(*) as count
            FROM agenda_email_reminders r
            LEFT JOIN agenda_events e ON r.event_id = e.id
            WHERE r.status = 'pending'
            AND r.reminder_datetime <= NOW()
            AND e.start_datetime > NOW()
        ");
        $readyNow = $stmt->fetch()['count'];
        
        if ($readyNow > 0) {
            echo "<div style='background: #e8f5e8; padding: 15px; border-radius: 5px; margin: 10px 0;'>";
            echo "<strong>🎉 SUCCESSO! Ora ci sono {$readyNow} promemoria pronti per l'invio!</strong><br><br>";
            echo "<a href='send_email_reminders_simple.php' target='_blank' ";
            echo "style='background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;'>";
            echo "🚀 INVIA {$readyNow} PROMEMORIA SUBITO</a>";
            echo "</div>";
        }
        
        // Ricarica la pagina per vedere i risultati
        echo "<script>setTimeout(() => window.location.href = window.location.pathname, 3000);</script>";
        
    } else {
        // Mostra bottone per applicare il fix
        if ($needsCorrection > 0) {
            echo "<div style='background: #fff3cd; padding: 15px; border-radius: 5px; margin: 10px 0;'>";
            echo "<strong>⚠️ TROVATI {$needsCorrection} PROMEMORIA CON OFFSET +2 ORE</strong><br><br>";
            echo "Questi promemoria sono stati salvati con l'orario italiano invece che UTC.<br>";
            echo "Per correggerli, sottraremo 2 ore da tutti i reminder_datetime.<br><br>";
            echo "<strong>⚠️ ATTENZIONE:</strong> Questa operazione è irreversibile!<br><br>";
            echo "<a href='?apply_fix=confirm' ";
            echo "style='background: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;' ";
            echo "onclick='return confirm(\"CONFERMI di voler correggere " . $needsCorrection . " promemoria sottraendo 2 ore? Questa operazione è IRREVERSIBILE.\")'>";
            echo "🔧 CORREGGI {$needsCorrection} PROMEMORIA (-2 ORE)</a>";
            echo "</div>";
        } else {
            echo "<div style='background: #e8f5e8; padding: 10px; border-radius: 5px; margin: 10px 0;'>";
            echo "✅ <strong>Nessun promemoria necessita correzione offset</strong>";
            echo "</div>";
        }
    }
    
    // === CONTROLLO POST-FIX ===
    echo "<h3>📋 Controllo Stato Attuale</h3>";
    
    $stmt = $pdo->query("
        SELECT COUNT(*) as count
        FROM agenda_email_reminders r
        LEFT JOIN agenda_events e ON r.event_id = e.id
        WHERE r.status = 'pending'
        AND r.reminder_datetime <= NOW()
        AND e.start_datetime > NOW()
    ");
    $currentlyReady = $stmt->fetch()['count'];
    
    echo "<div style='background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 10px 0;'>";
    echo "<strong>📊 Stato Attuale Sistema:</strong><br>";
    echo "🚀 <strong>Promemoria pronti per invio:</strong> {$currentlyReady}<br>";
    
    if ($currentlyReady > 0) {
        echo "<br><a href='send_email_reminders_simple.php' target='_blank' ";
        echo "style='background: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;'>";
        echo "📧 INVIA {$currentlyReady} PROMEMORIA ORA</a>";
    }
    echo "</div>";
    
    // === PREVENZIONE FUTURA ===
    echo "<h3>🛡️ Prevenzione Problemi Futuri</h3>";
    
    echo "<div style='background: #e0f2fe; padding: 15px; border-radius: 5px; margin: 10px 0;'>";
    echo "<strong>📋 Per evitare il problema in futuro:</strong><br><br>";
    echo "1. <strong>Aggiorna il codice di creazione eventi</strong> per gestire correttamente i timezone<br>";
    echo "2. <strong>Configura il cron job</strong> per invii automatici ogni minuto<br>";
    echo "3. <strong>Testa sempre</strong> i nuovi eventi con promemoria a breve termine<br>";
    echo "4. <strong>Monitora i log</strong> per verificare invii regolari<br><br>";
    
    echo "<strong>🔧 Codice da aggiornare:</strong><br>";
    echo "• <code>modules/agenda/index.php</code> - Creazione eventi<br>";
    echo "• <code>modules/agenda/create_event.php</code> - Se esiste<br>";
    echo "• Forza sempre <code>date_default_timezone_set('UTC')</code> prima dei calcoli";
    echo "</div>";
    
    // === LINK UTILI ===
    echo "<h3>🔗 Link Utili</h3>";
    
    echo "<div style='background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 10px 0;'>";
    echo "<a href='send_email_reminders_simple.php' target='_blank' ";
    echo "style='background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; margin-right: 10px;'>";
    echo "📧 Test Invio</a>";
    
    echo "<a href='debug_reminders.php' target='_blank' ";
    echo "style='background: #6f42c1; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; margin-right: 10px;'>";
    echo "🔍 Debug Completo</a>";
    
    echo "<a href='check_time.php' target='_blank' ";
    echo "style='background: #fd7e14; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; margin-right: 10px;'>";
    echo "🕐 Check Orario</a>";
    
    echo "<a href='index.php' target='_blank' ";
    echo "style='background: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;'>";
    echo "📅 Torna Agenda</a>";
    echo "</div>";
    
} catch (Exception $e) {
    echo "<div style='background: #ffe8e8; padding: 15px; border-radius: 5px; margin: 10px 0;'>";
    echo "<strong>💥 ERRORE:</strong> " . htmlspecialchars($e->getMessage());
    echo "</div>";
}
?>