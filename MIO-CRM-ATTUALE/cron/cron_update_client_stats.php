<?php
// File: /cron/cron_update_client_stats.php
// Script cron per aggiornare statistiche dashboard clienti
// Da eseguire una volta al giorno: 0 2 * * * /usr/bin/php /path/to/cron_update_client_stats.php

set_time_limit(300); // 5 minuti max
ini_set('memory_limit', '256M');

// Log di esecuzione
$logFile = __DIR__ . '/logs/client_stats_cron.log';
$startTime = microtime(true);

function logMessage($message) {
    global $logFile;
    $timestamp = date('Y-m-d H:i:s');
    $logDir = dirname($logFile);
    if (!is_dir($logDir)) {
        mkdir($logDir, 0755, true);
    }
    file_put_contents($logFile, "[$timestamp] $message\n", FILE_APPEND | LOCK_EX);
    echo "[$timestamp] $message\n";
}

logMessage("=== INIZIO AGGIORNAMENTO STATISTICHE CLIENTI ===");

try {
    // Connessione database
    $dsn = "mysql:host=127.0.0.1;dbname=u706045794_crm_mismo;charset=utf8mb4";
    $pdo = new PDO($dsn, 'u706045794_mismo_crm_new', 'BLQ$>:;*9+h', [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
    
    logMessage("Connessione database stabilita");
    
    // Ottieni tutti i clienti attivi con accesso
    $stmt = $pdo->prepare("
        SELECT ca.id, ca.contact_id, ca.username, lc.name as client_name
        FROM client_access ca
        INNER JOIN leads_contacts lc ON ca.contact_id = lc.id
        WHERE ca.is_active = 1
        AND ca.password_hash IS NOT NULL
    ");
    $stmt->execute();
    $clients = $stmt->fetchAll();
    
    logMessage("Trovati " . count($clients) . " clienti attivi");
    
    $updated = 0;
    $errors = 0;
    
    foreach ($clients as $client) {
        try {
            logMessage("Aggiornamento cliente: {$client['client_name']} (ID: {$client['contact_id']})");
            
            // Calcola statistiche fatture
            $stmt = $pdo->prepare("
                SELECT 
                    COUNT(*) as total_invoices,
                    COUNT(CASE WHEN status = 'pagata' THEN 1 END) as paid_count,
                    COUNT(CASE WHEN status = 'scaduta' THEN 1 END) as overdue_count,
                    COUNT(CASE WHEN status IN ('emessa', 'da_pagare') THEN 1 END) as pending_count,
                    SUM(totale) as total_project,
                    SUM(CASE WHEN status = 'pagata' THEN totale ELSE 0 END) as total_paid,
                    SUM(CASE WHEN status IN ('emessa', 'da_pagare', 'scaduta') THEN totale ELSE 0 END) as total_pending,
                    MAX(data_fattura) as last_invoice_date,
                    MIN(CASE WHEN status IN ('emessa', 'da_pagare', 'scaduta') THEN data_scadenza END) as next_due_date
                FROM fatture
                WHERE client_id = ?
                AND visible_to_client = 1
            ");
            $stmt->execute([$client['contact_id']]);
            $stats = $stmt->fetch();
            
            // Calcola percentuale completamento
            $completion = 0;
            if ($stats['total_project'] > 0) {
                $completion = round(($stats['total_paid'] / $stats['total_project']) * 100, 1);
            }
            
            // Conta appuntamenti futuri - CORRETTO: usa client_id
            $stmt = $pdo->prepare("
                SELECT COUNT(*) as upcoming_appointments
                FROM agenda_events
                WHERE client_id = ?
                AND start_datetime >= NOW()
                AND (status != 'cancelled' OR status IS NULL)
                AND (visible_to_client = 1 OR visible_to_client IS NULL)
            ");
            $stmt->execute([$client['contact_id']]);
            $appointmentStats = $stmt->fetch();
            
            // Conta tasks attivi - CORRETTO: usa client_id
            $stmt = $pdo->prepare("
                SELECT COUNT(*) as active_tasks
                FROM tasks
                WHERE client_id = ?
                AND status != 'completed'
                AND (visible_to_client = 1 OR visible_to_client IS NULL)
            ");
            $stmt->execute([$client['contact_id']]);
            $taskStats = $stmt->fetch();
            
            // Prepara dati cache
            $cacheData = [
                'client_id' => $client['contact_id'],
                'client_name' => $client['client_name'],
                'payment_stats' => [
                    'total_invoices' => (int)$stats['total_invoices'],
                    'paid_count' => (int)$stats['paid_count'],
                    'overdue_count' => (int)$stats['overdue_count'],
                    'pending_count' => (int)$stats['pending_count'],
                    'total_paid' => (float)$stats['total_paid'],
                    'total_pending' => (float)$stats['total_pending']
                ],
                'project_totals' => [
                    'total_project' => (float)$stats['total_project'],
                    'total_paid' => (float)$stats['total_paid'],
                    'total_pending' => (float)$stats['total_pending'],
                    'completion_percentage' => $completion
                ],
                'activity_stats' => [
                    'upcoming_appointments' => (int)$appointmentStats['upcoming_appointments'],
                    'active_tasks' => (int)$taskStats['active_tasks']
                ],
                'dates' => [
                    'last_invoice_date' => $stats['last_invoice_date'],
                    'next_due_date' => $stats['next_due_date']
                ],
                'last_update' => time(),
                'last_update_formatted' => date('Y-m-d H:i:s')
            ];
            
            // Salva cache
            $cacheKey = "client_stats_{$client['contact_id']}";
            $cacheFile = sys_get_temp_dir() . "/{$cacheKey}.json";
            
            if (file_put_contents($cacheFile, json_encode($cacheData, JSON_PRETTY_PRINT))) {
                $updated++;
                logMessage("  ✓ Cache aggiornata: {$stats['total_invoices']} fatture, €{$stats['total_paid']} versati");
            } else {
                $errors++;
                logMessage("  ❌ Errore scrittura cache per {$client['client_name']}");
            }
            
        } catch (Exception $e) {
            $errors++;
            logMessage("  ❌ Errore cliente {$client['client_name']}: " . $e->getMessage());
        }
    }
    
    // Pulizia cache vecchie (oltre 7 giorni)
    $tempDir = sys_get_temp_dir();
    $pattern = $tempDir . '/client_stats_*.json';
    $cleaned = 0;
    
    foreach (glob($pattern) as $file) {
        if (filemtime($file) < (time() - 7 * 24 * 60 * 60)) {
            if (unlink($file)) {
                $cleaned++;
            }
        }
    }
    
    if ($cleaned > 0) {
        logMessage("Puliti $cleaned file cache obsoleti");
    }
    
    $executionTime = round(microtime(true) - $startTime, 2);
    logMessage("=== COMPLETATO: $updated aggiornati, $errors errori in {$executionTime}s ===");
    
    // Notifica risultati (opzionale)
    if ($errors > 0) {
        // Potresti inviare una email di notifica degli errori
        logMessage("ATTENZIONE: $errors errori durante l'aggiornamento");
    }
    
} catch (Exception $e) {
    logMessage("ERRORE CRITICO: " . $e->getMessage());
    exit(1);
}

// Aggiorna anche statistiche generali del sistema
try {
    $stmt = $pdo->prepare("
        SELECT 
            COUNT(*) as total_active_clients,
            COUNT(CASE WHEN last_login >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 END) as active_last_30_days,
            COUNT(CASE WHEN password_hash IS NULL THEN 1 END) as pending_activation
        FROM client_access
        WHERE is_active = 1
    ");
    $stmt->execute();
    $systemStats = $stmt->fetch();
    
    $systemCacheData = [
        'total_active_clients' => (int)$systemStats['total_active_clients'],
        'active_last_30_days' => (int)$systemStats['active_last_30_days'],
        'pending_activation' => (int)$systemStats['pending_activation'],
        'last_update' => time()
    ];
    
    file_put_contents(sys_get_temp_dir() . '/system_client_stats.json', json_encode($systemCacheData));
    logMessage("Statistiche sistema aggiornate");
    
} catch (Exception $e) {
    logMessage("Errore aggiornamento statistiche sistema: " . $e->getMessage());
}

logMessage("Script terminato con successo");
exit(0);
?>