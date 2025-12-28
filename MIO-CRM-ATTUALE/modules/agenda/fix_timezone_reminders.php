<?php
// File: /modules/agenda/fix_timezone_reminders.php
// Script per risolvere i problemi di timezone sui promemoria esistenti

echo "<h2>🕐 Fix Timezone Promemoria</h2>";

try {
    // Connessione database
    $dsn = "mysql:host=127.0.0.1;dbname=u706045794_crm_mismo;charset=utf8mb4";
    $pdo = new PDO($dsn, 'u706045794_mismo_crm_new', 'BLQ$>:;*9+h', [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
    
    // === DIAGNOSI TIMEZONE ===
    echo "<h3>🔍 Diagnosi Timezone</h3>";
    
    $dbTimezone = $pdo->query("SELECT @@time_zone as tz")->fetch()['tz'];
    $dbNow = $pdo->query("SELECT NOW() as now")->fetch()['now'];
    $phpTimezone = date_default_timezone_get();
    $phpNow = date('Y-m-d H:i:s');
    
    echo "<div style='background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 10px 0;'>";
    echo "<table border='1' style='border-collapse: collapse; width: 100%;'>";
    echo "<tr><td><strong>Database Timezone</strong></td><td>{$dbTimezone}</td></tr>";
    echo "<tr><td><strong>Database NOW()</strong></td><td>{$dbNow}</td></tr>";
    echo "<tr><td><strong>PHP Timezone</strong></td><td>{$phpTimezone}</td></tr>";
    echo "<tr><td><strong>PHP date()</strong></td><td>{$phpNow}</td></tr>";
    echo "</table>";
    echo "</div>";
    
    // Forza UTC per coerenza
    date_default_timezone_set('UTC');
    $phpNowUTC = date('Y-m-d H:i:s');
    
    echo "<div style='background: #e8f5e8; padding: 10px; border-radius: 5px; margin: 10px 0;'>";
    echo "🔧 <strong>PHP Forzato a UTC:</strong> {$phpNowUTC}";
    echo "</div>";
    
    // === VERIFICA STRUTTURA TABELLA ===
    echo "<h3>📊 Struttura Tabella Promemoria</h3>";
    
    $stmt = $pdo->query("DESCRIBE agenda_email_reminders");
    $columns = $stmt->fetchAll();
    
    $columnNames = array_column($columns, 'Field');
    $hasEventStartDatetime = in_array('event_start_datetime', $columnNames);
    $hasEventTitle = in_array('event_title', $columnNames);
    $hasUserEmail = in_array('user_email', $columnNames);
    
    echo "<div style='background: #f8f9fa; padding: 10px; border-radius: 5px; margin: 10px 0;'>";
    echo "<strong>Colonne disponibili:</strong> " . implode(', ', $columnNames) . "<br>";
    echo "<strong>event_start_datetime:</strong> " . ($hasEventStartDatetime ? '✅' : '❌') . "<br>";
    echo "<strong>event_title:</strong> " . ($hasEventTitle ? '✅' : '❌') . "<br>";
    echo "<strong>user_email:</strong> " . ($hasUserEmail ? '✅' : '❌');
    echo "</div>";
    
    // === ANALISI PROMEMORIA PROBLEMATICI ===
    echo "<h3>🚨 Analisi Promemoria Problematici</h3>";
    
    // Query adattiva basata sulla struttura della tabella
    if ($hasEventStartDatetime && $hasEventTitle && $hasUserEmail) {
        // Struttura completa
        $stmt = $pdo->query("
            SELECT 
                r.*,
                r.event_title,
                r.user_email,
                TIMESTAMPDIFF(MINUTE, NOW(), r.reminder_datetime) as minutes_until_reminder,
                TIMESTAMPDIFF(MINUTE, NOW(), r.event_start_datetime) as minutes_until_event,
                CASE 
                    WHEN r.reminder_datetime <= NOW() AND r.event_start_datetime > NOW() 
                    THEN 'PRONTO' 
                    ELSE 'NON_PRONTO' 
                END as should_send
            FROM agenda_email_reminders r
            WHERE r.status = 'pending'
            ORDER BY r.reminder_datetime ASC
            LIMIT 10
        ");
    } else {
        // Struttura base con JOIN
        $stmt = $pdo->query("
            SELECT 
                r.*,
                e.title as event_title,
                u.email as user_email,
                TIMESTAMPDIFF(MINUTE, NOW(), r.reminder_datetime) as minutes_until_reminder,
                TIMESTAMPDIFF(MINUTE, NOW(), e.start_datetime) as minutes_until_event,
                CASE 
                    WHEN r.reminder_datetime <= NOW() AND e.start_datetime > NOW() 
                    THEN 'PRONTO' 
                    ELSE 'NON_PRONTO' 
                END as should_send
            FROM agenda_email_reminders r
            LEFT JOIN agenda_events e ON r.event_id = e.id
            LEFT JOIN users u ON r.user_id = u.id
            WHERE r.status = 'pending'
            ORDER BY r.reminder_datetime ASC
            LIMIT 10
        ");
    }
    $problematicReminders = $stmt->fetchAll();
    
    if (empty($problematicReminders)) {
        echo "<div style='background: #fff3cd; padding: 10px; border-radius: 5px; margin: 10px 0;'>";
        echo "⚠️ <strong>Nessun promemoria pending trovato</strong>";
        echo "</div>";
    } else {
        echo "<table border='1' style='border-collapse: collapse; margin: 10px 0; width: 100%; font-size: 12px;'>";
        echo "<tr style='background: #f8f9fa;'>";
        echo "<th>ID</th><th>Evento</th><th>Promemoria</th><th>Evento Start</th>";
        echo "<th>Min Promemoria</th><th>Min Evento</th><th>Status</th><th>Azione</th>";
        echo "</tr>";
        
        $readyToSend = 0;
        $needsFix = 0;
        
        foreach ($problematicReminders as $reminder) {
            $rowColor = $reminder['should_send'] === 'PRONTO' ? '#e8f5e8' : '#fff3cd';
            
            echo "<tr style='background: {$rowColor};'>";
            echo "<td>{$reminder['id']}</td>";
            echo "<td>" . htmlspecialchars(substr($reminder['event_title'] ?? 'N/A', 0, 20)) . "</td>";
            echo "<td>{$reminder['reminder_datetime']}</td>";
            echo "<td>" . ($reminder['event_start_datetime'] ?? 'N/A') . "</td>";
            echo "<td style='text-align: center;'>{$reminder['minutes_until_reminder']}</td>";
            echo "<td style='text-align: center;'>{$reminder['minutes_until_event']}</td>";
            echo "<td style='text-align: center; font-weight: bold;'>";
            echo $reminder['should_send'] === 'PRONTO' ? '✅ PRONTO' : '⏳ NON PRONTO';
            echo "</td>";
            echo "<td style='text-align: center;'>";
            
            if ($reminder['should_send'] === 'PRONTO') {
                echo "🚀 <strong style='color: green;'>INVIARE</strong>";
                $readyToSend++;
            } elseif ($reminder['minutes_until_reminder'] < -120) { // Più di 2 ore fa
                echo "🔧 <strong style='color: red;'>FIX TIMEZONE</strong>";
                $needsFix++;
            } else {
                echo "⏳ Attendi";
            }
            echo "</td>";
            echo "</tr>";
        }
        echo "</table>";
        
        echo "<div style='background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 10px 0;'>";
        echo "<strong>📊 Riepilogo:</strong><br>";
        echo "✅ <strong>Pronti per invio:</strong> {$readyToSend}<br>";
        echo "🔧 <strong>Necessitano fix timezone:</strong> {$needsFix}<br>";
        echo "📧 <strong>Totale analizzati:</strong> " . count($problematicReminders);
        echo "</div>";
    }
    
    // === SOLUZIONI IMMEDIATE ===
    echo "<h3>🚀 Soluzioni Immediate</h3>";
    
    // Conta quanti sono pronti ORA - Query adattiva
    if ($hasEventStartDatetime) {
        $stmt = $pdo->query("
            SELECT COUNT(*) as count
            FROM agenda_email_reminders r
            WHERE r.status = 'pending'
            AND r.reminder_datetime <= NOW()
            AND r.event_start_datetime > NOW()
        ");
    } else {
        $stmt = $pdo->query("
            SELECT COUNT(*) as count
            FROM agenda_email_reminders r
            LEFT JOIN agenda_events e ON r.event_id = e.id
            WHERE r.status = 'pending'
            AND r.reminder_datetime <= NOW()
            AND e.start_datetime > NOW()
        ");
    }
    $readyNow = $stmt->fetch()['count'];
    
    if ($readyNow > 0) {
        echo "<div style='background: #e8f5e8; padding: 15px; border-radius: 5px; margin: 10px 0;'>";
        echo "<strong>✅ CI SONO {$readyNow} PROMEMORIA PRONTI PER L'INVIO!</strong><br><br>";
        echo "<a href='send_email_reminders_simple.php?force_utc=1' target='_blank' ";
        echo "style='background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;'>";
        echo "🚀 INVIA SUBITO I PROMEMORIA PRONTI</a>";
        echo "</div>";
    }
    
    // === FIX TIMEZONE AUTOMATICO ===
    echo "<h3>🔧 Fix Automatico Timezone</h3>";
    
    if (isset($_GET['fix_timezone']) && $_GET['fix_timezone'] === 'confirm') {
        echo "<div style='background: #fff3cd; padding: 15px; border-radius: 5px; margin: 10px 0;'>";
        echo "<strong>🔧 Applicazione Fix Timezone...</strong><br><br>";
        
        // Trova promemoria che sembrano avere problemi di timezone (molto indietro)
        if ($hasEventStartDatetime) {
            $stmt = $pdo->query("
                SELECT id, reminder_datetime, event_start_datetime
                FROM agenda_email_reminders r
                WHERE r.status = 'pending'
                AND TIMESTAMPDIFF(HOUR, NOW(), r.reminder_datetime) < -3
            ");
        } else {
            $stmt = $pdo->query("
                SELECT r.id, r.reminder_datetime, e.start_datetime as event_start_datetime
                FROM agenda_email_reminders r
                LEFT JOIN agenda_events e ON r.event_id = e.id
                WHERE r.status = 'pending'
                AND TIMESTAMPDIFF(HOUR, NOW(), r.reminder_datetime) < -3
            ");
        }
        $toFix = $stmt->fetchAll();
        
        $fixed = 0;
        foreach ($toFix as $reminder) {
            // Aggiungi 2 ore (differenza UTC+2)
            $newReminderTime = date('Y-m-d H:i:s', strtotime($reminder['reminder_datetime']) + 7200);
            
            if ($hasEventStartDatetime && $reminder['event_start_datetime']) {
                $newEventTime = date('Y-m-d H:i:s', strtotime($reminder['event_start_datetime']) + 7200);
                $updateStmt = $pdo->prepare("
                    UPDATE agenda_email_reminders 
                    SET reminder_datetime = ?, event_start_datetime = ?
                    WHERE id = ?
                ");
                $updateStmt->execute([$newReminderTime, $newEventTime, $reminder['id']]);
                echo "✅ Fixed ID {$reminder['id']}: {$reminder['reminder_datetime']} → {$newReminderTime} (+ event time)<br>";
            } else {
                $updateStmt = $pdo->prepare("
                    UPDATE agenda_email_reminders 
                    SET reminder_datetime = ?
                    WHERE id = ?
                ");
                $updateStmt->execute([$newReminderTime, $reminder['id']]);
                echo "✅ Fixed ID {$reminder['id']}: {$reminder['reminder_datetime']} → {$newReminderTime}<br>";
            }
            $fixed++;
        }
        
        echo "<br><strong>📊 Fix completati: {$fixed}</strong>";
        echo "</div>";
        
        // Ricarica la pagina per vedere i risultati
        echo "<script>setTimeout(() => window.location.href = window.location.pathname, 2000);</script>";
        
    } else {
        // Mostra bottone per fix - Query adattiva
        $stmt = $pdo->query("
            SELECT COUNT(*) as count
            FROM agenda_email_reminders r
            WHERE r.status = 'pending'
            AND TIMESTAMPDIFF(HOUR, NOW(), r.reminder_datetime) < -3
        ");
        $needsTimezineFix = $stmt->fetch()['count'];
        
        if ($needsTimezineFix > 0) {
            echo "<div style='background: #ffe8e8; padding: 15px; border-radius: 5px; margin: 10px 0;'>";
            echo "<strong>⚠️ TROVATI {$needsTimezineFix} PROMEMORIA CON PROBLEMI DI TIMEZONE</strong><br><br>";
            echo "Questi promemoria sembrano essere salvati nel timezone sbagliato.<br><br>";
            echo "<a href='?fix_timezone=confirm' ";
            echo "style='background: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;' ";
            echo "onclick='return confirm(\"Sei sicuro di voler correggere i timezone? Questa operazione aggiungerà 2 ore ai promemoria problematici.\")'>";
            echo "🔧 CORREGGI TIMEZONE (+2 ORE)</a>";
            echo "</div>";
        } else {
            echo "<div style='background: #e8f5e8; padding: 10px; border-radius: 5px; margin: 10px 0;'>";
            echo "✅ <strong>Nessun promemoria necessita fix timezone</strong>";
            echo "</div>";
        }
    }
    
    // === PREVENZIONE FUTURA ===
    echo "<h3>🛡️ Prevenzione Problemi Futuri</h3>";
    
    echo "<div style='background: #e0f2fe; padding: 15px; border-radius: 5px; margin: 10px 0;'>";
    echo "<strong>📋 Checklist per evitare problemi futuri:</strong><br><br>";
    echo "1. ✅ <strong>Database in UTC:</strong> Verificato<br>";
    echo "2. 🔧 <strong>PHP script in UTC:</strong> Aggiorna codice creazione eventi<br>";
    echo "3. ⚙️ <strong>Cron job attivo:</strong> Configura automazione<br>";
    echo "4. 📧 <strong>Test email:</strong> Verifica configurazione mail<br>";
    echo "5. 📊 <strong>Monitoring:</strong> Controlla log regolarmente";
    echo "</div>";
    
    // === AZIONI RAPIDE ===
    echo "<h3>⚡ Azioni Rapide</h3>";
    
    echo "<div style='background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 10px 0;'>";
    echo "<a href='send_email_reminders_simple.php' target='_blank' ";
    echo "style='background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; margin-right: 10px;'>";
    echo "📧 Test Invio Manuale</a>";
    
    echo "<a href='debug_reminders.php' target='_blank' ";
    echo "style='background: #6f42c1; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; margin-right: 10px;'>";
    echo "🔍 Debug Completo</a>";
    
    echo "<a href='test_reminders.php' target='_blank' ";
    echo "style='background: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;'>";
    echo "🧪 Crea Test</a>";
    echo "</div>";
    
} catch (Exception $e) {
    echo "<div style='background: #ffe8e8; padding: 15px; border-radius: 5px; margin: 10px 0;'>";
    echo "<strong>💥 ERRORE:</strong> " . htmlspecialchars($e->getMessage());
    echo "</div>";
}
?>