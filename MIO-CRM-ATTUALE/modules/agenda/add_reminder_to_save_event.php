<?php
// File: /modules/agenda/add_reminder_to_save_event.php
// SCRIPT PER INTEGRARE PROMEMORIA NEL SAVE_EVENT ESISTENTE

// Questo script aggiunge SOLO la parte promemoria al save_event.php esistente
// Da aggiungere DOPO il commit della transazione e PRIMA della risposta JSON

// 🔔 AGGIUNGI QUESTA SEZIONE AL TUO save_event.php DOPO LA RIGA: $pdo->commit();

/*
// ==== INIZIO INTEGRAZIONE PROMEMORIA ====

// Solo se l'evento ha promemoria e è futuro
if ($reminderMinutes > 0 && strtotime($startDateTime) > time()) {
    
    error_log("📧 Tentativo creazione promemoria email...");
    
    try {
        // Verifica/crea tabella promemoria
        $stmt = $pdo->query("SHOW TABLES LIKE 'agenda_email_reminders'");
        if ($stmt->rowCount() === 0) {
            error_log("⚠️ Creazione tabella agenda_email_reminders");
            
            $pdo->exec("
                CREATE TABLE agenda_email_reminders (
                    id INT PRIMARY KEY AUTO_INCREMENT,
                    event_id INT NOT NULL,
                    user_id INT NOT NULL,
                    user_email VARCHAR(255) NOT NULL,
                    event_title VARCHAR(255) NOT NULL,
                    reminder_datetime DATETIME NOT NULL,
                    event_start_datetime DATETIME NOT NULL,
                    status ENUM('pending', 'sent', 'failed') DEFAULT 'pending',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    sent_at DATETIME NULL,
                    
                    FOREIGN KEY (event_id) REFERENCES agenda_events(id) ON DELETE CASCADE,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                    
                    INDEX idx_reminder_datetime (reminder_datetime, status),
                    INDEX idx_event_user (event_id, user_id)
                )
            ");
            
            error_log("✅ Tabella agenda_email_reminders creata");
        }
        
        // Calcola orario promemoria (fuso orario Europa/Roma)
        date_default_timezone_set('Europe/Rome');
        $reminderDateTime = date('Y-m-d H:i:s', strtotime($startDateTime) - ($reminderMinutes * 60));
        
        error_log("📅 Promemoria calcolato:");
        error_log("   - Evento inizio: {$startDateTime}");  
        error_log("   - Promemoria: {$reminderMinutes} minuti prima");
        error_log("   - Orario promemoria: {$reminderDateTime}");
        
        // Ottieni responsabili con email
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
        
        // Inserisci promemoria per ogni responsabile
        $reminderStmt = $pdo->prepare("
            INSERT INTO agenda_email_reminders 
            (event_id, user_id, user_email, event_title, reminder_datetime, event_start_datetime, status)
            VALUES (?, ?, ?, ?, ?, ?, 'pending')
        ");
        
        $remindersCreated = 0;
        foreach ($usersWithEmail as $user) {
            $reminderStmt->execute([
                $eventId,
                $user['id'],
                $user['email'],
                $title,
                $reminderDateTime,
                $startDateTime
            ]);
            $remindersCreated++;
            
            error_log("✅ Promemoria creato per: {$user['email']}");
        }
        
        error_log("📊 Promemoria creati: {$remindersCreated}");
        
    } catch (Exception $e) {
        error_log("❌ Errore creazione promemoria: " . $e->getMessage());
        // Non bloccare il salvataggio evento
    }
    
} else {
    error_log("⏭️ Nessun promemoria da creare");
}

// ==== FINE INTEGRAZIONE PROMEMORIA ====
*/

// ISTRUZIONI:
// 1. Apri il tuo save_event.php
// 2. Trova la riga: $pdo->commit(); 
// 3. Aggiungi tutto il codice sopra (senza i commenti /* */) DOPO quella riga
// 4. Salva il file

echo "Questo file contiene il codice da integrare nel save_event.php esistente";
?>