<?php
// File: /core/includes/ticket_notifications.php
// Funzioni per notifiche ticket agli admin

require_once __DIR__ . '/../../api/notifications.php';

/**
 * Notifica tutti gli admin quando arriva un nuovo ticket
 * Da chiamare nel portale clienti dopo la creazione del ticket
 */
function notifyAdminsNewTicket($pdo, $ticketId) {
    try {
        // Ottieni dettagli ticket
        $stmt = $pdo->prepare("
            SELECT t.*, 
                   ca.username as client_username,
                   lc.name as client_name,
                   lc.email as client_email
            FROM tickets t
            LEFT JOIN client_access ca ON t.client_id = ca.id
            LEFT JOIN leads_contacts lc ON t.contact_id = lc.id
            WHERE t.id = ?
        ");
        $stmt->execute([$ticketId]);
        $ticket = $stmt->fetch();
        
        if (!$ticket) {
            error_log("Ticket {$ticketId} non trovato per notifiche");
            return false;
        }
        
        // Ottieni tutti gli admin attivi
        $stmt = $pdo->prepare("
            SELECT id, first_name, last_name, email 
            FROM users 
            WHERE role IN ('admin', 'super_admin') 
            AND is_active = 1
        ");
        $stmt->execute();
        $admins = $stmt->fetchAll();
        
        if (empty($admins)) {
            error_log("Nessun admin attivo trovato per notifiche ticket");
            return false;
        }
        
        // Preparazione messaggio
        $clientName = $ticket['client_name'] ?: $ticket['client_username'] ?: 'Cliente sconosciuto';
        $priorityEmoji = getPriorityEmojiForTicket($ticket['priority']);
        
        $title = "Nuovo Ticket #{$ticket['ticket_number']}";
        $message = "{$priorityEmoji} {$ticket['subject']} - Da: {$clientName}";
        
        $notificationsCreated = 0;
        
        // Invia notifica a ogni admin
        foreach ($admins as $admin) {
            $result = createNotification(
                $pdo,
                $admin['id'],
                $title,
                $message,
                'ticket',
                $ticket['id'],
                'ticket'
            );
            
            if ($result) {
                $notificationsCreated++;
            }
        }
        
        // Log per debug
        error_log("Nuovo ticket #{$ticket['ticket_number']}: create {$notificationsCreated} notifiche per " . count($admins) . " admin(s)");
        
        return $notificationsCreated > 0;
        
    } catch (Exception $e) {
        error_log("Errore notifica nuovo ticket {$ticketId}: " . $e->getMessage());
        return false;
    }
}

/**
 * Notifica admin quando un ticket viene aggiornato dal cliente
 */
function notifyAdminsTicketUpdated($pdo, $ticketId, $updateType = 'client_reply') {
    try {
        // Ottieni dettagli ticket
        $stmt = $pdo->prepare("
            SELECT t.*, 
                   ca.username as client_username,
                   lc.name as client_name
            FROM tickets t
            LEFT JOIN client_access ca ON t.client_id = ca.id
            LEFT JOIN leads_contacts lc ON t.contact_id = lc.id
            WHERE t.id = ?
        ");
        $stmt->execute([$ticketId]);
        $ticket = $stmt->fetch();
        
        if (!$ticket) return false;
        
        // Trova admin interessati (creatore e assegnatario)
        $interestedAdmins = [];
        
        if ($ticket['created_by']) {
            $interestedAdmins[] = $ticket['created_by'];
        }
        
        if ($ticket['assigned_to'] && $ticket['assigned_to'] != $ticket['created_by']) {
            $interestedAdmins[] = $ticket['assigned_to'];
        }
        
        // Se nessun admin specifico, notifica tutti
        if (empty($interestedAdmins)) {
            $stmt = $pdo->prepare("SELECT id FROM users WHERE role IN ('admin', 'super_admin') AND is_active = 1");
            $stmt->execute();
            $interestedAdmins = $stmt->fetchAll(PDO::FETCH_COLUMN);
        }
        
        if (empty($interestedAdmins)) return false;
        
        $clientName = $ticket['client_name'] ?: $ticket['client_username'] ?: 'Cliente';
        
        $titles = [
            'client_reply' => "Risposta Cliente Ticket #{$ticket['ticket_number']}",
            'client_update' => "Aggiornamento Cliente Ticket #{$ticket['ticket_number']}"
        ];
        
        $title = $titles[$updateType] ?? "Aggiornamento Ticket #{$ticket['ticket_number']}";
        $message = "{$clientName} ha aggiornato: {$ticket['subject']}";
        
        $notificationsCreated = 0;
        
        foreach ($interestedAdmins as $adminId) {
            $result = createNotification(
                $pdo,
                $adminId,
                $title,
                $message,
                'ticket',
                $ticket['id'],
                'ticket'
            );
            
            if ($result) {
                $notificationsCreated++;
            }
        }
        
        return $notificationsCreated > 0;
        
    } catch (Exception $e) {
        error_log("Errore notifica aggiornamento ticket {$ticketId}: " . $e->getMessage());
        return false;
    }
}

/**
 * Helper per emoji priorità
 */
function getPriorityEmojiForTicket($priority) {
    $emojis = [
        'bassa' => '🟢',
        'normale' => '🟡', 
        'alta' => '🟠',
        'urgente' => '🔴'
    ];
    
    return $emojis[$priority] ?? '🟡';
}

/**
 * Test delle notifiche - per debug
 */
function testTicketNotifications($pdo, $adminId = null) {
    try {
        // Se non specificato, usa il primo admin
        if (!$adminId) {
            $stmt = $pdo->prepare("SELECT id FROM users WHERE role IN ('admin', 'super_admin') AND is_active = 1 LIMIT 1");
            $stmt->execute();
            $adminId = $stmt->fetchColumn();
        }
        
        if (!$adminId) {
            return "Nessun admin trovato per test";
        }
        
        // Crea notifica di test
        $result = createNotification(
            $pdo,
            $adminId,
            "Test Notifica Ticket",
            "Questa è una notifica di test per verificare che il sistema funzioni correttamente",
            'ticket',
            999999, // ID fittizio
            'ticket'
        );
        
        return $result ? "Notifica di test creata con successo" : "Errore nella creazione della notifica di test";
        
    } catch (Exception $e) {
        return "Errore test: " . $e->getMessage();
    }
}
?>