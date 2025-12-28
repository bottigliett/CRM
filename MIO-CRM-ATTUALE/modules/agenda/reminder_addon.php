<?php
// File: /modules/agenda/reminder_addon.php
// ADDON PER AGGIUNGERE PROMEMORIA AL save_event.php ESISTENTE

// ==== ISTRUZIONI ====
// Copia questo codice e aggiungilo al tuo save_event.php
// DOPO la riga: $pdo->commit();
// PRIMA della riga: ob_clean();

/*
// ==== INIZIO ADDON PROMEMORIA (copiare nel save_event.php) ====

// 🔔 CREAZIONE PROMEMORIA EMAIL - ADDON per save_event.php esistente
if ($reminderMinutes > 0 && strtotime($startDateTime) > time()) {
    
    error_log("📧 Creazione promemoria email...");
    
    try {
        // Verifica/crea tabella promemoria (struttura semplice)
        $stmt = $pdo->query("SHOW TABLES LIKE 'agenda_email_reminders'");
        if ($stmt->rowCount() === 0) {
            error_log("⚠️ Creazione tabella agenda_email_reminders");
            
            $pdo->exec("
                CREATE TABLE agenda_email_reminders (
                    id INT PRIMARY KEY AUTO_INCREMENT,
                    event_id INT NOT NULL,
                    user_id INT NOT NULL,
                    reminder_datetime DATETIME NOT NULL,
                    status ENUM('pending', 'sent', 'failed') DEFAULT 'pending',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    sent_at DATETIME NULL,
                    
                    FOREIGN KEY (event_id) REFERENCES agenda_events(id) ON DELETE CASCADE,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                    
                    INDEX idx_reminder_status (reminder_datetime, status),
                    INDEX idx_event_user (event_id, user_id)
                )
            ");
            
            error_log("✅ Tabella agenda_email_reminders creata (struttura semplice)");
        }
        
        // Calcola orario promemoria (MANTIENI UTC come il resto del database)
        $reminderDateTime = date('Y-m-d H:i:s', strtotime($startDateTime) - ($reminderMinutes * 60));
        
        error_log("📅 Promemoria calcolato (UTC):");
        error_log("   - Evento inizio: {$startDateTime}");  
        error_log("   - Promemoria minuti: {$reminderMinutes}");
        error_log("   - Orario promemoria: {$reminderDateTime}");
        
        // Ottieni responsabili per i promemoria
        $placeholders = str_repeat('?,', count($responsables) - 1) . '?';
        $stmt = $pdo->prepare("
            SELECT id, email, first_name, last_name 
            FROM users 
            WHERE id IN ($placeholders) 
            AND is_active = 1 
            AND email IS NOT NULL 
            AND email != ''
        ");
        $stmt->execute($responsables);
        $usersWithEmail = $stmt->fetchAll();
        
        // Inserisci promemoria per ogni responsabile con email
        $reminderStmt = $pdo->prepare("
            INSERT INTO agenda_email_reminders 
            (event_id, user_id, reminder_datetime, status, created_at)
            VALUES (?, ?, ?, 'pending', NOW())
        ");
        
        $remindersCreated = 0;
        foreach ($usersWithEmail as $user) {
            try {
                $reminderStmt->execute([
                    $eventId,
                    $user['id'],
                    $reminderDateTime
                ]);
                $remindersCreated++;
                
                error_log("✅ Promemoria creato per: {$user['email']} (ID: {$user['id']})");
                
            } catch (Exception $e) {
                error_log("❌ Errore promemoria per {$user['email']}: " . $e->getMessage());
            }
        }
        
        error_log("📊 Promemoria creati: {$remindersCreated} su " . count($usersWithEmail) . " utenti");
        
        // Aggiungi info promemoria alla risposta JSON
        $remindersInfo = [
            'reminders_created' => $remindersCreated,
            'reminder_datetime' => $reminderDateTime,
            'reminder_minutes' => $reminderMinutes
        ];
        
    } catch (Exception $e) {
        error_log("❌ Errore sistema promemoria: " . $e->getMessage());
        // Non bloccare il salvataggio evento
        $remindersInfo = [
            'reminders_created' => 0,
            'error' => $e->getMessage()
        ];
    }
    
} else {
    error_log("⏭️ Nessun promemoria da creare (minutes: {$reminderMinutes}, future: " . (strtotime($startDateTime) > time() ? 'yes' : 'no') . ")");
    $remindersInfo = [
        'reminders_created' => 0,
        'reason' => 'No reminder minutes or past event'
    ];
}

// ==== FINE ADDON PROMEMORIA ====
*/

// INOLTRE, modifica la risposta JSON finale per includere info promemoria:
// Cambia questa parte nel save_event.php:

/*
// PRIMA (riga ~290 circa):
echo json_encode([
    'success' => true,
    'message' => $action === 'created' ? 'Evento creato con successo!' : 'Evento aggiornato con successo!',
    'event_id' => $eventId,
    'action' => $action,
    'data' => [
        'title' => $title,
        'start_datetime' => $startDateTime,
        'end_datetime' => $endDateTime,
        'category' => $category['name'],
        'responsables_count' => count($responsables)
    ]
], JSON_UNESCAPED_UNICODE);

// DOPO:
echo json_encode([
    'success' => true,
    'message' => $action === 'created' ? 'Evento creato con successo!' : 'Evento aggiornato con successo!',
    'event_id' => $eventId,
    'action' => $action,
    'data' => [
        'title' => $title,
        'start_datetime' => $startDateTime,
        'end_datetime' => $endDateTime,
        'category' => $category['name'],
        'responsables_count' => count($responsables),
        'reminders' => $remindersInfo ?? ['reminders_created' => 0]  // ← AGGIUNTA
    ]
], JSON_UNESCAPED_UNICODE);
*/

echo "
ISTRUZIONI IMPLEMENTAZIONE ADDON PROMEMORIA:

1. Apri il tuo save_event.php
2. Trova la riga: \$pdo->commit();
3. Dopo quella riga, aggiungi tutto il codice nell'addon sopra
4. Modifica la risposta JSON finale come indicato
5. Salva il file

OPPURE:

Usa solo la Soluzione 1 (fix fuso orario) se preferisci aggiungere promemoria manualmente.
";
?>