<?php
// File: /api/notifications.php - API per il centro notifiche

require_once __DIR__ . '/../core/includes/auth_helper.php';

header('Content-Type: application/json');

try {
    $currentUser = getCurrentUser();
    
    // Connessione database
    $dsn = "mysql:host=127.0.0.1;dbname=u706045794_crm_mismo;charset=utf8mb4";
    $pdo = new PDO($dsn, 'u706045794_mismo_crm_new', 'BLQ$>:;*9+h', [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
    
    $action = $_GET['action'] ?? $_POST['action'] ?? '';
    
    switch ($action) {
        case 'get':
            getNotifications($pdo, $currentUser['id']);
            break;
            
        case 'mark_read':
            markNotificationAsRead($pdo, $_POST['notification_id'] ?? 0, $currentUser['id']);
            break;
            
        case 'mark_all_read':
            markAllNotificationsAsRead($pdo, $currentUser['id']);
            break;
            
        case 'delete':
            deleteNotification($pdo, $_POST['notification_id'] ?? 0, $currentUser['id']);
            break;
            
        case 'get_count':
            getUnreadCount($pdo, $currentUser['id']);
            break;
            
        default:
            throw new Exception('Azione non valida');
    }
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}

// Ottieni notifiche dell'utente
function getNotifications($pdo, $userId) {
    $limit = min((int)($_GET['limit'] ?? 20), 50);
    $offset = max((int)($_GET['offset'] ?? 0), 0);
    
    $stmt = $pdo->prepare("
        SELECT 
            n.*,
            -- Dettagli evento se correlato
            CASE WHEN n.related_type = 'agenda_event' THEN e.title ELSE NULL END as event_title,
            CASE WHEN n.related_type = 'agenda_event' THEN c.icon ELSE NULL END as event_icon,
            CASE WHEN n.related_type = 'agenda_event' THEN c.color ELSE NULL END as event_color
        FROM notifications n
        LEFT JOIN agenda_events e ON n.related_type = 'agenda_event' AND n.related_id = e.id
        LEFT JOIN agenda_categories c ON e.category_id = c.id
        WHERE n.user_id = ?
        ORDER BY n.created_at DESC
        LIMIT {$limit} OFFSET {$offset}
    ");
    
    $stmt->execute([$userId]);
    $notifications = $stmt->fetchAll();
    
    // Processa notifiche per il frontend
    $processedNotifications = [];
    
    foreach ($notifications as $notification) {
        $timeAgo = timeAgo($notification['created_at']);
        $typeInfo = getNotificationTypeInfo($notification['type']);
        
        $processedNotifications[] = [
            'id' => $notification['id'],
            'title' => $notification['title'],
            'message' => $notification['message'],
            'type' => $notification['type'],
            'type_icon' => $typeInfo['icon'],
            'type_color' => $typeInfo['color'],
            'is_read' => (bool)$notification['is_read'],
            'related_type' => $notification['related_type'],
            'related_id' => $notification['related_id'],
            'event_title' => $notification['event_title'],
            'event_icon' => $notification['event_icon'] ?? '📅',
            'event_color' => $notification['event_color'] ?? '#3b82f6',
            'time_ago' => $timeAgo,
            'created_at' => $notification['created_at']
        ];
    }
    
    // Conta non lette
    $stmt = $pdo->prepare("SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0");
    $stmt->execute([$userId]);
    $unreadCount = $stmt->fetch()['count'];
    
    echo json_encode([
        'success' => true,
        'notifications' => $processedNotifications,
        'unread_count' => (int)$unreadCount,
        'total' => count($processedNotifications)
    ]);
}

// Marca notifica come letta
function markNotificationAsRead($pdo, $notificationId, $userId) {
    if (!$notificationId) {
        throw new Exception('ID notifica mancante');
    }
    
    $stmt = $pdo->prepare("
        UPDATE notifications 
        SET is_read = 1 
        WHERE id = ? AND user_id = ?
    ");
    $stmt->execute([$notificationId, $userId]);
    
    echo json_encode([
        'success' => true,
        'message' => 'Notifica marcata come letta'
    ]);
}

// Marca tutte le notifiche come lette
function markAllNotificationsAsRead($pdo, $userId) {
    $stmt = $pdo->prepare("
        UPDATE notifications 
        SET is_read = 1 
        WHERE user_id = ? AND is_read = 0
    ");
    $stmt->execute([$userId]);
    
    $affected = $stmt->rowCount();
    
    echo json_encode([
        'success' => true,
        'message' => "{$affected} notifiche marcate come lette"
    ]);
}

// Elimina notifica
function deleteNotification($pdo, $notificationId, $userId) {
    if (!$notificationId) {
        throw new Exception('ID notifica mancante');
    }
    
    $stmt = $pdo->prepare("
        DELETE FROM notifications 
        WHERE id = ? AND user_id = ?
    ");
    $stmt->execute([$notificationId, $userId]);
    
    echo json_encode([
        'success' => true,
        'message' => 'Notifica eliminata'
    ]);
}

// Ottieni solo il conteggio non lette
function getUnreadCount($pdo, $userId) {
    $stmt = $pdo->prepare("SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0");
    $stmt->execute([$userId]);
    $count = $stmt->fetch()['count'];
    
    echo json_encode([
        'success' => true,
        'unread_count' => (int)$count
    ]);
}

// Helper functions
function timeAgo($datetime) {
    $time = time() - strtotime($datetime);
    
    if ($time < 60) return 'Ora';
    if ($time < 3600) return floor($time/60) . 'm fa';
    if ($time < 86400) return floor($time/3600) . 'h fa';
    if ($time < 2592000) return floor($time/86400) . 'g fa';
    
    return date('d/m', strtotime($datetime));
}

function getNotificationTypeInfo($type) {
    $types = [
        'info' => ['icon' => 'ℹ️', 'color' => '#3b82f6'],
        'task' => ['icon' => '📋', 'color' => '#22c55e'],
        'ticket' => ['icon' => '🎫', 'color' => '#f59e0b'],
        'warning' => ['icon' => '⚠️', 'color' => '#ef4444'],
        'agenda' => ['icon' => '📅', 'color' => '#8b5cf6']
    ];
    
    return $types[$type] ?? ['icon' => '🔔', 'color' => '#6b7280'];
}

// Funzione per creare notifiche (da usare in altri file)
function createNotification($pdo, $userId, $title, $message, $type = 'info', $relatedId = null, $relatedType = null) {
    try {
        $stmt = $pdo->prepare("
            INSERT INTO notifications (user_id, title, message, type, related_id, related_type)
            VALUES (?, ?, ?, ?, ?, ?)
        ");
        
        $stmt->execute([$userId, $title, $message, $type, $relatedId, $relatedType]);
        
        return $pdo->lastInsertId();
        
    } catch (Exception $e) {
        error_log("Errore creazione notifica: " . $e->getMessage());
        return false;
    }
}
?>