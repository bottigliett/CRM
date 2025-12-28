<?php
// File: /modules/agenda/ajax/batch_actions.php
// AJAX handler per azioni batch sull'agenda

header('Content-Type: application/json');
require_once __DIR__ . '/../../../core/includes/auth_helper.php';

try {
    // Verifica autenticazione
    $currentUser = getCurrentUser();
    
    // Solo POST requests
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Metodo non consentito');
    }
    
    // Verifica CSRF token
    if (!validateCSRFToken($_POST['csrf_token'] ?? '')) {
        throw new Exception('Token CSRF non valido');
    }
    
    // Connessione database
    $dsn = "mysql:host=127.0.0.1;dbname=u706045794_crm_mismo;charset=utf8mb4";
    $pdo = new PDO($dsn, 'u706045794_mismo_crm_new', 'BLQ$>:;*9+h', [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
    
    // Parametri
    $action = $_POST['action'] ?? '';
    $eventIds = json_decode($_POST['event_ids'] ?? '[]', true);
    $categoryId = $_POST['category_id'] ?? null;
    
    if (empty($action)) {
        throw new Exception('Azione non specificata');
    }
    
    if (!is_array($eventIds) || empty($eventIds)) {
        throw new Exception('Nessun evento selezionato');
    }
    
    // Valida gli ID eventi
    $eventIds = array_filter(array_map('intval', $eventIds));
    if (empty($eventIds)) {
        throw new Exception('ID eventi non validi');
    }
    
    $results = [];
    $errors = [];
    
    $pdo->beginTransaction();
    
    try {
        switch ($action) {
            case 'delete_multiple':
                $results = $this->deleteMultipleEvents($pdo, $eventIds, $currentUser);
                break;
                
            case 'change_category':
                if (!$categoryId) {
                    throw new Exception('Categoria di destinazione non specificata');
                }
                $results = $this->changeCategoryMultiple($pdo, $eventIds, $categoryId, $currentUser);
                break;
                
            case 'change_status':
                $status = $_POST['status'] ?? '';
                if (!in_array($status, ['scheduled', 'confirmed', 'cancelled', 'completed'])) {
                    throw new Exception('Status non valido');
                }
                $results = $this->changeStatusMultiple($pdo, $eventIds, $status, $currentUser);
                break;
                
            case 'duplicate_events':
                $targetDate = $_POST['target_date'] ?? '';
                if (empty($targetDate)) {
                    throw new Exception('Data di destinazione non specificata');
                }
                $results = $this->duplicateEvents($pdo, $eventIds, $targetDate, $currentUser);
                break;
                
            default:
                throw new Exception('Azione non riconosciuta: ' . $action);
        }
        
        $pdo->commit();
        
        // Log dell'operazione
        logUserAction(
            'agenda_batch_' . $action, 
            'success', 
            "Events: " . implode(',', $eventIds) . " - Results: " . json_encode($results)
        );
        
        echo json_encode([
            'success' => true,
            'message' => 'Operazione completata con successo',
            'results' => $results,
            'errors' => $errors,
            'processed' => count($eventIds)
        ]);
        
    } catch (Exception $e) {
        $pdo->rollBack();
        throw $e;
    }
    
} catch (Exception $e) {
    error_log("Agenda batch actions error: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}

// Funzioni helper per le azioni batch
function deleteMultipleEvents($pdo, $eventIds, $currentUser) {
    $results = ['deleted' => 0, 'skipped' => 0];
    
    foreach ($eventIds as $eventId) {
        // Verifica permessi per ogni evento
        $stmt = $pdo->prepare("
            SELECT id, title, created_by, assigned_to 
            FROM agenda_events 
            WHERE id = ?
        ");
        $stmt->execute([$eventId]);
        $event = $stmt->fetch();
        
        if (!$event) {
            $results['skipped']++;
            continue;
        }
        
        // Verifica permessi
        $canDelete = (
            $event['created_by'] == $currentUser['id'] ||
            $event['assigned_to'] == $currentUser['id'] ||
            $currentUser['role'] === 'super_admin'
        );
        
        if (!$canDelete) {
            // Verifica se è tra i responsabili
            $stmt = $pdo->prepare("
                SELECT COUNT(*) as count 
                FROM agenda_event_responsables 
                WHERE event_id = ? AND user_id = ?
            ");
            $stmt->execute([$eventId, $currentUser['id']]);
            $canDelete = $stmt->fetch()['count'] > 0;
        }
        
        if ($canDelete) {
            // Elimina l'evento
            $pdo->prepare("DELETE FROM agenda_event_responsables WHERE event_id = ?")->execute([$eventId]);
            $pdo->prepare("DELETE FROM agenda_notifications WHERE event_id = ?")->execute([$eventId]);
            $pdo->prepare("DELETE FROM agenda_events WHERE id = ?")->execute([$eventId]);
            
            // Log
            $stmt = $pdo->prepare("
                INSERT INTO agenda_activity_log (user_id, action_type, target_type, target_id, description)
                VALUES (?, 'delete', 'event', ?, ?)
            ");
            $stmt->execute([$currentUser['id'], $eventId, "Evento eliminato (batch): " . $event['title']]);
            
            $results['deleted']++;
        } else {
            $results['skipped']++;
        }
    }
    
    return $results;
}

function changeCategoryMultiple($pdo, $eventIds, $categoryId, $currentUser) {
    $results = ['updated' => 0, 'skipped' => 0];
    
    // Verifica che la categoria esista
    $stmt = $pdo->prepare("SELECT id FROM agenda_categories WHERE id = ?");
    $stmt->execute([$categoryId]);
    if (!$stmt->fetch()) {
        throw new Exception('Categoria di destinazione non trovata');
    }
    
    foreach ($eventIds as $eventId) {
        // Verifica permessi
        $stmt = $pdo->prepare("
            SELECT id, title, created_by, assigned_to 
            FROM agenda_events 
            WHERE id = ?
        ");
        $stmt->execute([$eventId]);
        $event = $stmt->fetch();
        
        if (!$event) {
            $results['skipped']++;
            continue;
        }
        
        $canEdit = (
            $event['created_by'] == $currentUser['id'] ||
            $event['assigned_to'] == $currentUser['id'] ||
            $currentUser['role'] === 'super_admin'
        );
        
        if ($canEdit) {
            $stmt = $pdo->prepare("UPDATE agenda_events SET category_id = ? WHERE id = ?");
            $stmt->execute([$categoryId, $eventId]);
            
            // Log
            $stmt = $pdo->prepare("
                INSERT INTO agenda_activity_log (user_id, action_type, target_type, target_id, description)
                VALUES (?, 'update', 'event', ?, ?)
            ");
            $stmt->execute([$currentUser['id'], $eventId, "Categoria cambiata (batch): " . $event['title']]);
            
            $results['updated']++;
        } else {
            $results['skipped']++;
        }
    }
    
    return $results;
}

function changeStatusMultiple($pdo, $eventIds, $status, $currentUser) {
    $results = ['updated' => 0, 'skipped' => 0];
    
    foreach ($eventIds as $eventId) {
        // Verifica permessi (stesso controllo di changeCategoryMultiple)
        $stmt = $pdo->prepare("
            SELECT id, title, created_by, assigned_to 
            FROM agenda_events 
            WHERE id = ?
        ");
        $stmt->execute([$eventId]);
        $event = $stmt->fetch();
        
        if (!$event) {
            $results['skipped']++;
            continue;
        }
        
        $canEdit = (
            $event['created_by'] == $currentUser['id'] ||
            $event['assigned_to'] == $currentUser['id'] ||
            $currentUser['role'] === 'super_admin'
        );
        
        if ($canEdit) {
            $stmt = $pdo->prepare("UPDATE agenda_events SET status = ? WHERE id = ?");
            $stmt->execute([$status, $eventId]);
            
            // Log
            $stmt = $pdo->prepare("
                INSERT INTO agenda_activity_log (user_id, action_type, target_type, target_id, description)
                VALUES (?, 'update', 'event', ?, ?)
            ");
            $stmt->execute([$currentUser['id'], $eventId, "Status cambiato a {$status} (batch): " . $event['title']]);
            
            $results['updated']++;
        } else {
            $results['skipped']++;
        }
    }
    
    return $results;
}

function duplicateEvents($pdo, $eventIds, $targetDate, $currentUser) {
    $results = ['duplicated' => 0, 'skipped' => 0];
    
    // Valida la data target
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $targetDate)) {
        throw new Exception('Formato data non valido');
    }
    
    foreach ($eventIds as $eventId) {
        $stmt = $pdo->prepare("SELECT * FROM agenda_events WHERE id = ?");
        $stmt->execute([$eventId]);
        $event = $stmt->fetch();
        
        if (!$event) {
            $results['skipped']++;
            continue;
        }
        
        // Calcola la nuova data/ora
        $originalStart = new DateTime($event['start_datetime']);
        $originalEnd = new DateTime($event['end_datetime']);
        $targetDateTime = new DateTime($targetDate);
        
        // Mantieni l'ora originale
        $newStart = $targetDateTime->format('Y-m-d') . ' ' . $originalStart->format('H:i:s');
        $newEnd = $targetDateTime->format('Y-m-d') . ' ' . $originalEnd->format('H:i:s');
        
        // Crea il duplicato
        $stmt = $pdo->prepare("
            INSERT INTO agenda_events (
                title, description, start_datetime, end_datetime,
                category_id, client_id, location, is_all_day, status,
                priority, reminder_minutes, created_by, assigned_to
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        
        $stmt->execute([
            $event['title'] . ' (Copia)',
            $event['description'],
            $newStart,
            $newEnd,
            $event['category_id'],
            $event['client_id'],
            $event['location'],
            $event['is_all_day'],
            'scheduled', // Reset status
            $event['priority'],
            $event['reminder_minutes'],
            $currentUser['id'], // Il duplicatore diventa il creatore
            $currentUser['id']  // E anche l'assegnato
        ]);
        
        $newEventId = $pdo->lastInsertId();
        
        // Duplica i responsabili
        $stmt = $pdo->prepare("
            SELECT user_id, is_organizer 
            FROM agenda_event_responsables 
            WHERE event_id = ?
        ");
        $stmt->execute([$eventId]);
        $responsables = $stmt->fetchAll();
        
        $insertResp = $pdo->prepare("
            INSERT INTO agenda_event_responsables (event_id, user_id, is_organizer)
            VALUES (?, ?, ?)
        ");
        
        foreach ($responsables as $resp) {
            $insertResp->execute([$newEventId, $resp['user_id'], $resp['is_organizer']]);
        }
        
        // Log
        $stmt = $pdo->prepare("
            INSERT INTO agenda_activity_log (user_id, action_type, target_type, target_id, description)
            VALUES (?, 'create', 'event', ?, ?)
        ");
        $stmt->execute([$currentUser['id'], $newEventId, "Evento duplicato da ID {$eventId}: " . $event['title']]);
        
        $results['duplicated']++;
    }
    
    return $results;
}
?>