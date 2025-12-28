<?php
// File: /modules/agenda/ajax/save_event.php
// VERSIONE CORRETTA CON AUTORIZZAZIONI RESPONSABILI

// Headers JSON prima di tutto
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-cache, must-revalidate');

// Disabilita output di errori per JSON pulito
ini_set('display_errors', 0);
error_reporting(0);

// Cattura output indesiderato
ob_start();

try {
    // Log di debug
    error_log("=== SAVE EVENT START " . date('Y-m-d H:i:s') . " ===");
    
    // 1. Verifica metodo POST
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Metodo non permesso');
    }
    
    // 2. Log dati ricevuti
    error_log("POST data: " . json_encode($_POST));
    
    // 3. Includi autenticazione
    require_once $_SERVER['DOCUMENT_ROOT'] . '/core/includes/auth_helper.php';
    
    // 4. Verifica utente
    $currentUser = getCurrentUser();
    if (!$currentUser || !isset($currentUser['id'])) {
        throw new Exception('Utente non autenticato');
    }
    
    error_log("User authenticated: " . $currentUser['id'] . " (" . $currentUser['role'] . ")");
    
    // 5. Connessione database
    $dsn = "mysql:host=127.0.0.1;dbname=u706045794_crm_mismo;charset=utf8mb4";
    $pdo = new PDO($dsn, 'u706045794_mismo_crm_new', 'BLQ$>:;*9+h', [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
    
    error_log("Database connected");
    
    // 6. Estrai e valida dati
    $eventId = !empty($_POST['event_id']) ? (int)$_POST['event_id'] : null;
    $title = trim($_POST['title'] ?? '');
    $description = trim($_POST['description'] ?? '');
    
    // DATE HANDLING
    $startDate = trim($_POST['start_date'] ?? '');
    $startTime = trim($_POST['start_time'] ?? '09:00');
    $endDate = trim($_POST['end_date'] ?? '');
    $endTime = trim($_POST['end_time'] ?? '10:00');
    
    if (empty($endDate)) {
        $endDate = $startDate;
    }
    
    $location = trim($_POST['location'] ?? '');
    $categoryId = !empty($_POST['category_id']) ? (int)$_POST['category_id'] : null;
    $clientId = !empty($_POST['client_id']) ? (int)$_POST['client_id'] : null;
    $priority = trim($_POST['priority'] ?? 'medium');
    $reminderMinutes = !empty($_POST['reminder_minutes']) ? (int)$_POST['reminder_minutes'] : 15;
    $allDay = !empty($_POST['all_day']) ? 1 : 0;
    
    // Responsabili
    $responsables = isset($_POST['responsables']) && is_array($_POST['responsables']) 
        ? array_map('intval', $_POST['responsables']) 
        : [$currentUser['id']];
    
    error_log("Extracted data - Title: '$title', Start: '$startDate $startTime', Category: $categoryId");
    
    // 7. VALIDAZIONE ESSENZIALE
    if (empty($title)) {
        throw new Exception('Il titolo è obbligatorio');
    }
    
    if (empty($startDate)) {
        throw new Exception('La data di inizio è obbligatoria');
    }
    
    if (!$categoryId) {
        throw new Exception('La categoria è obbligatoria');
    }
    
    // 8. Verifica categoria esiste
    $stmt = $pdo->prepare("SELECT id, name FROM agenda_categories WHERE id = ?");
    $stmt->execute([$categoryId]);
    $category = $stmt->fetch();
    
    if (!$category) {
        throw new Exception("Categoria non trovata (ID: $categoryId)");
    }
    
    error_log("Category validated: " . $category['name']);
    
    // 9. Costruisci datetime
    $startDateTime = $startDate . ' ' . $startTime . ':00';
    $endDateTime = $endDate . ' ' . $endTime . ':00';
    
    error_log("DateTime built - Start: $startDateTime, End: $endDateTime");
    
    // 10. VERIFICA STRUTTURA TABELLA E GESTISCI ASSIGNED_TO
    $stmt = $pdo->query("DESCRIBE agenda_events");
    $columns = $stmt->fetchAll(PDO::FETCH_COLUMN);
    $hasAssignedTo = in_array('assigned_to', $columns);
    
    error_log("Has assigned_to column: " . ($hasAssignedTo ? 'YES' : 'NO'));
    
    // 11. INSERIMENTO/AGGIORNAMENTO CON CONTROLLO AUTORIZZAZIONI CORRETTO
    $pdo->beginTransaction();
    
    if ($eventId) {
        // AGGIORNAMENTO CON CONTROLLO AUTORIZZAZIONI MIGLIORATO
        error_log("Updating event ID: $eventId");
        
        // 🎯 FIX PRINCIPALE: Verifica autorizzazioni prima dell'update
        $canEdit = false;

        // Super admin può sempre modificare
        if ($currentUser['role'] === 'super_admin') {
            $canEdit = true;
            error_log("Authorization: SUPER_ADMIN - can edit any event");
        }
        // 🎯 FIX: Admin può modificare TUTTI gli eventi
        elseif ($currentUser['role'] === 'admin') {
            $canEdit = true;
            error_log("Authorization: ADMIN - can edit any event");
        } else {
            error_log("Authorization: Role '" . $currentUser['role'] . "' - checking if creator/responsable");

            // Per altri ruoli, verifica se è creatore O responsabile
            $stmt = $pdo->prepare("
                SELECT e.created_by,
                       (SELECT COUNT(*) FROM agenda_event_responsables r WHERE r.event_id = e.id AND r.user_id = ?) as is_responsable
                FROM agenda_events e
                WHERE e.id = ?
            ");
            $stmt->execute([$currentUser['id'], $eventId]);
            $eventCheck = $stmt->fetch();

            if ($eventCheck) {
                if ($eventCheck['created_by'] == $currentUser['id']) {
                    $canEdit = true;
                    error_log("Authorization: CREATOR - can edit");
                } elseif ($eventCheck['is_responsable'] > 0) {
                    $canEdit = true;
                    error_log("Authorization: RESPONSABLE - can edit");
                } else {
                    error_log("Authorization: Not creator/responsable - DENIED");
                }
            }
        }

        if (!$canEdit) {
            throw new Exception('Non hai i permessi per modificare questo evento');
        }
        
        // Procedi con l'update senza condizione WHERE restrictiva
        if ($hasAssignedTo) {
            $stmt = $pdo->prepare("
                UPDATE agenda_events SET
                    title = ?,
                    description = ?,
                    start_datetime = ?,
                    end_datetime = ?,
                    is_all_day = ?,
                    location = ?,
                    category_id = ?,
                    client_id = ?,
                    priority = ?,
                    reminder_minutes = ?,
                    assigned_to = ?,
                    updated_at = NOW()
                WHERE id = ?
            ");
            
            $stmt->execute([
                $title,
                $description,
                $startDateTime,
                $endDateTime,
                $allDay,
                $location,
                $categoryId,
                $clientId,
                $priority,
                $reminderMinutes,
                $currentUser['id'], // assigned_to
                $eventId
            ]);
        } else {
            $stmt = $pdo->prepare("
                UPDATE agenda_events SET
                    title = ?,
                    description = ?,
                    start_datetime = ?,
                    end_datetime = ?,
                    is_all_day = ?,
                    location = ?,
                    category_id = ?,
                    client_id = ?,
                    priority = ?,
                    reminder_minutes = ?,
                    updated_at = NOW()
                WHERE id = ?
            ");
            
            $stmt->execute([
                $title,
                $description,
                $startDateTime,
                $endDateTime,
                $allDay,
                $location,
                $categoryId,
                $clientId,
                $priority,
                $reminderMinutes,
                $eventId
            ]);
        }
        
        if ($stmt->rowCount() === 0) {
            throw new Exception('Evento non trovato');
        }
        
        error_log("Event updated successfully");
        
        // Elimina responsabili esistenti
        $stmt = $pdo->prepare("DELETE FROM agenda_event_responsables WHERE event_id = ?");
        $stmt->execute([$eventId]);
        
        $action = 'updated';
        
    } else {
        // INSERIMENTO NUOVO (logica invariata)
        error_log("Creating new event");
        
        if ($hasAssignedTo) {
            $stmt = $pdo->prepare("
                INSERT INTO agenda_events (
                    title, description, start_datetime, end_datetime, is_all_day,
                    location, category_id, client_id, priority, reminder_minutes,
                    assigned_to, created_by, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
            ");
            
            $stmt->execute([
                $title,
                $description,
                $startDateTime,
                $endDateTime,
                $allDay,
                $location,
                $categoryId,
                $clientId,
                $priority,
                $reminderMinutes,
                $currentUser['id'], // assigned_to
                $currentUser['id']  // created_by
            ]);
        } else {
            $stmt = $pdo->prepare("
                INSERT INTO agenda_events (
                    title, description, start_datetime, end_datetime, is_all_day,
                    location, category_id, client_id, priority, reminder_minutes,
                    created_by, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
            ");
            
            $stmt->execute([
                $title,
                $description,
                $startDateTime,
                $endDateTime,
                $allDay,
                $location,
                $categoryId,
                $clientId,
                $priority,
                $reminderMinutes,
                $currentUser['id']
            ]);
        }
        
        $eventId = $pdo->lastInsertId();
        $action = 'created';
        
        error_log("New event created with ID: $eventId");
        
        // NOTIFICA AL CLIENTE PER NUOVO EVENTO
        if ($clientId && $clientId > 0) {
            try {
                error_log("Verificando categoria per notifica: categoryId = $categoryId");
                
                if ($categoryId == 2) { // Appuntamenti Clienti
                    error_log("Categoria corretta, invio notifica per evento ID: $eventId al cliente: $clientId");
                    
                    require_once $_SERVER['DOCUMENT_ROOT'] . '/core/includes/client_notifications.php';
                    $result = notifyClientNewEvent($pdo, $eventId, $title, $startDateTime, $clientId);
                    
                    if ($result) {
                        error_log("✅ Notifica evento inviata con successo");
                    } else {
                        error_log("⚠️ Notifica evento non inviata");
                    }
                } else {
                    error_log("Categoria $categoryId non è 'Appuntamenti Clienti', skip notifica");
                }
            } catch (Exception $e) {
                error_log("❌ Errore invio notifica cliente per evento: " . $e->getMessage());
            }
        }
    }
    
    // 12. INSERISCI RESPONSABILI - CONTROLLO DINAMICO COLONNE
    $stmt = $pdo->query("DESCRIBE agenda_event_responsables");
    $responsablesColumns = $stmt->fetchAll(PDO::FETCH_COLUMN);
    $hasRole = in_array('role', $responsablesColumns);
    $hasResponseStatus = in_array('response_status', $responsablesColumns);
    
    error_log("Responsables table columns: " . implode(', ', $responsablesColumns));
    
    // Inserisci responsabili con query dinamica
    if ($hasRole && $hasResponseStatus) {
        $stmt = $pdo->prepare("
            INSERT INTO agenda_event_responsables (event_id, user_id, role, response_status, created_at)
            VALUES (?, ?, 'participant', 'pending', NOW())
        ");
    } elseif ($hasRole) {
        $stmt = $pdo->prepare("
            INSERT INTO agenda_event_responsables (event_id, user_id, role, created_at)
            VALUES (?, ?, 'participant', NOW())
        ");
    } else {
        $stmt = $pdo->prepare("
            INSERT INTO agenda_event_responsables (event_id, user_id, created_at)
            VALUES (?, ?, NOW())
        ");
    }
    
    foreach ($responsables as $userId) {
        if (!empty($userId)) {
            if ($hasRole) {
                $stmt->execute([$eventId, $userId]);
            } else {
                $stmt->execute([$eventId, $userId]);
            }
        }
    }
    
    error_log("Responsables added: " . implode(', ', $responsables));
    
    // 13. CREA PROMEMORIA EMAIL
    if ($reminderMinutes > 0 && strtotime($startDateTime) > time()) {
        error_log("📧 Creazione promemoria email...");
        
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
                
                error_log("✅ Tabella agenda_email_reminders creata");
            }
            
            // Fix timezone: sottrai 120 minuti extra
            $reminderDateTime = date('Y-m-d H:i:s', strtotime($startDateTime) - ($reminderMinutes * 60) - 7200);
            
            error_log("📅 Promemoria calcolato (con fix -120 min):");
            error_log("   - Evento inizio: {$startDateTime}");  
            error_log("   - Promemoria minuti: {$reminderMinutes}");
            error_log("   - Orario promemoria (corretto): {$reminderDateTime}");
            
            // Ottieni responsabili con email valida
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
            
        } catch (Exception $e) {
            error_log("❌ Errore sistema promemoria: " . $e->getMessage());
            // Non bloccare il salvataggio evento
        }
        
    } else {
        error_log("⏭️ Nessun promemoria da creare (minutes: {$reminderMinutes}, future: " . (strtotime($startDateTime) > time() ? 'yes' : 'no') . ")");
    }
    
    // 14. CREA NOTIFICHE AI RESPONSABILI
    try {
        $stmt = $pdo->query("SHOW TABLES LIKE 'notifications'");
        if ($stmt->rowCount() > 0) {
            foreach ($responsables as $userId) {
                if (!empty($userId)) {
                    if ($userId == $currentUser['id']) {
                        $notificationTitle = $action === 'created' ? 'Evento creato con successo' : 'Evento aggiornato';
                        $notificationMessage = $action === 'created' 
                            ? "Hai creato l'evento: '$title' e sei stato impostato come responsabile"
                            : "Hai aggiornato l'evento: '$title'";
                    } else {
                        $notificationTitle = $action === 'created' ? 'Nuovo evento assegnato' : 'Evento aggiornato';
                        $notificationMessage = $action === 'created' 
                            ? "Sei stato aggiunto come responsabile dell'evento: '$title'"
                            : "L'evento '$title' a cui partecipi è stato modificato";
                    }
                    
                    $stmt = $pdo->prepare("
                        INSERT INTO notifications (user_id, title, message, type, related_type, related_id, created_at)
                        VALUES (?, ?, ?, 'agenda', 'agenda_event', ?, NOW())
                    ");
                    $stmt->execute([$userId, $notificationTitle, $notificationMessage, $eventId]);
                    
                    error_log("📧 Notifica creata per utente $userId: $notificationTitle");
                }
            }
        }
    } catch (Exception $e) {
        error_log("Warning: Could not create notifications: " . $e->getMessage());
    }
    
    // 15. Log attività
    try {
        $stmt = $pdo->query("SHOW TABLES LIKE 'agenda_activity_logs'");
        if ($stmt->rowCount() === 0) {
            $pdo->exec("
                CREATE TABLE agenda_activity_logs (
                    id INT PRIMARY KEY AUTO_INCREMENT,
                    user_id INT,
                    action VARCHAR(100) NOT NULL,
                    event_id INT NULL,
                    category_id INT NULL,
                    details TEXT,
                    status ENUM('success', 'failed', 'warning') DEFAULT 'success',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
                    FOREIGN KEY (event_id) REFERENCES agenda_events(id) ON DELETE CASCADE,
                    
                    INDEX idx_created_at (created_at),
                    INDEX idx_user_id (user_id)
                )
            ");
            error_log("✅ Tabella agenda_activity_logs creata");
        }
        
        $stmt = $pdo->prepare("
            INSERT INTO agenda_activity_logs (user_id, action, event_id, details, status, created_at)
            VALUES (?, ?, ?, ?, 'success', NOW())
        ");
        $details = "Evento '$title' " . ($action === 'created' ? 'creato' : 'aggiornato') . 
                  " con " . count($responsables) . " responsabili";
        $stmt->execute([$currentUser['id'], $action . '_event', $eventId, $details]);
        
        error_log("📋 Log attività salvato: $details");
        
    } catch (Exception $e) {
        error_log("Warning: Could not log activity: " . $e->getMessage());
    }
    
    // 16. COMMIT
    $pdo->commit();
    error_log("Transaction committed successfully");
    
    // 17. Pulisci output buffer
    ob_clean();
    
    // 18. RISPOSTA DI SUCCESSO
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
    
} catch (PDOException $e) {
    // Rollback database
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollback();
    }
    
    error_log("Database error: " . $e->getMessage());
    
    // Pulisci output
    ob_clean();
    
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Errore del database: ' . $e->getMessage(),
        'type' => 'database_error'
    ], JSON_UNESCAPED_UNICODE);
    
} catch (Exception $e) {
    // Rollback se necessario
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollback();
    }
    
    error_log("Application error: " . $e->getMessage());
    
    // Pulisci output
    ob_clean();
    
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'type' => 'validation_error'
    ], JSON_UNESCAPED_UNICODE);
}

error_log("=== SAVE EVENT END ===");
?>