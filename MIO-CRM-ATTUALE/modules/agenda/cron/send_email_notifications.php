<?php
// File: /modules/agenda/cron/send_email_notifications.php
// Cron job per inviare notifiche email prima degli eventi - STILE NOTION

// Aggiungi al crontab: */5 * * * * /usr/bin/php /path/to/this/file.php

require_once __DIR__ . '/../../../core/config/database.php';
require_once __DIR__ . '/../../../core/includes/auth_helper.php';

class EmailNotificationSender {
    private $pdo;
    private $logFile;
    
    public function __construct() {
        try {
            // Connessione database
            $dsn = "mysql:host=127.0.0.1;dbname=u706045794_crm_mismo;charset=utf8mb4";
            $this->pdo = new PDO($dsn, 'u706045794_mismo_crm_new', 'BLQ$>:;*9+h', [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
            ]);
            
            $this->logFile = __DIR__ . '/../../../core/logs/email_notifications.log';
            
        } catch (Exception $e) {
            $this->log("FATAL: " . $e->getMessage());
            die("Database connection failed\n");
        }
    }
    
    public function run() {
        $this->log("🚀 Avvio controllo notifiche email - " . date('Y-m-d H:i:s'));
        
        try {
            $sent = $this->processPendingNotifications();
            $this->log("✅ Processamento completato. Email inviate: {$sent}");
            
        } catch (Exception $e) {
            $this->log("❌ Errore: " . $e->getMessage());
        }
    }
    
    private function processPendingNotifications() {
        $currentTime = date('Y-m-d H:i:s');
        $sentCount = 0;
        
        // Trova notifiche da inviare (con 2 minuti di buffer)
        $stmt = $this->pdo->prepare("
            SELECT 
                n.*,
                e.title as event_title,
                e.start_datetime,
                e.end_datetime,
                e.location,
                e.description,
                u.email as user_email,
                u.first_name as user_name,
                u.last_name as user_surname,
                c.name as category_name,
                c.icon as category_icon
            FROM agenda_notifications n
            JOIN agenda_events e ON n.event_id = e.id
            JOIN users u ON n.user_id = u.id
            LEFT JOIN agenda_categories c ON e.category_id = c.id
            WHERE n.status = 'pending'
            AND n.trigger_datetime <= DATE_ADD(?, INTERVAL 2 MINUTE)
            AND n.trigger_datetime >= DATE_SUB(?, INTERVAL 30 MINUTE)
            ORDER BY n.trigger_datetime ASC
            LIMIT 50
        ");
        
        $stmt->execute([$currentTime, $currentTime]);
        $notifications = $stmt->fetchAll();
        
        $this->log("📧 Trovate " . count($notifications) . " notifiche da processare");
        
        foreach ($notifications as $notification) {
            try {
                $this->sendEventNotification($notification);
                $this->markNotificationAsSent($notification['id']);
                $sentCount++;
                
                $this->log("✅ Email inviata: {$notification['event_title']} -> {$notification['user_email']}");
                
            } catch (Exception $e) {
                $this->markNotificationAsFailed($notification['id'], $e->getMessage());
                $this->log("❌ Errore invio: {$notification['event_title']} -> {$notification['user_email']}: " . $e->getMessage());
            }
        }
        
        return $sentCount;
    }
    
    private function sendEventNotification($notification) {
        $eventDate = new DateTime($notification['start_datetime']);
        $eventEndDate = new DateTime($notification['end_datetime']);
        $now = new DateTime();
        
        // Calcola tempo rimanente
        $interval = $now->diff($eventDate);
        $timeRemaining = $this->formatTimeRemaining($interval);
        
        // Template email stile Notion
        $subject = "🔔 Promemoria: {$notification['event_title']} tra {$timeRemaining}";
        
        $body = $this->createEmailTemplate([
            'user_name' => $notification['user_name'],
            'event_title' => $notification['event_title'],
            'time_remaining' => $timeRemaining,
            'start_datetime' => $eventDate->format('d/m/Y H:i'),
            'end_datetime' => $eventEndDate->format('d/m/Y H:i'),
            'location' => $notification['location'],
            'description' => $notification['description'],
            'category_name' => $notification['category_name'],
            'category_icon' => $notification['category_icon']
        ]);
        
        // Invia email
        if (!$this->sendEmail($notification['user_email'], $subject, $body)) {
            throw new Exception('Invio email fallito');
        }
        
        // Crea notifica nel centro notifiche
        $this->createCenterNotification($notification);
    }
    
    private function createEmailTemplate($data) {
        return "
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset='utf-8'>
            <style>
                body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; margin: 0; padding: 0; background: #f7f7f5; }
                .container { max-width: 600px; margin: 0 auto; background: white; }
                .header { background: #37352f; color: white; padding: 24px; text-align: center; }
                .content { padding: 32px 24px; }
                .event-card { background: #f7f7f5; border-radius: 8px; padding: 20px; margin: 16px 0; border-left: 4px solid #37352f; }
                .detail-row { margin: 8px 0; display: flex; align-items: center; }
                .icon { margin-right: 8px; font-size: 16px; }
                .footer { background: #f7f7f5; padding: 16px 24px; text-align: center; font-size: 12px; color: #787774; }
            </style>
        </head>
        <body>
            <div class='container'>
                <div class='header'>
                    <h1>🔔 Promemoria Evento</h1>
                    <p>Studio Mismo CRM</p>
                </div>
                <div class='content'>
                    <p>Ciao <strong>{$data['user_name']}</strong>,</p>
                    <p>Ti ricordiamo che hai un evento in programma <strong>{$data['time_remaining']}</strong>:</p>
                    
                    <div class='event-card'>
                        <h2>{$data['category_icon']} {$data['event_title']}</h2>
                        
                        <div class='detail-row'>
                            <span class='icon'>🕐</span>
                            <strong>Inizio:</strong> {$data['start_datetime']}
                        </div>
                        
                        <div class='detail-row'>
                            <span class='icon'>⏰</span>
                            <strong>Fine:</strong> {$data['end_datetime']}
                        </div>
                        
                        " . ($data['location'] ? "
                        <div class='detail-row'>
                            <span class='icon'>📍</span>
                            <strong>Luogo:</strong> {$data['location']}
                        </div>
                        " : "") . "
                        
                        " . ($data['category_name'] ? "
                        <div class='detail-row'>
                            <span class='icon'>🏷️</span>
                            <strong>Categoria:</strong> {$data['category_name']}
                        </div>
                        " : "") . "
                        
                        " . ($data['description'] ? "
                        <div style='margin-top: 16px; padding-top: 16px; border-top: 1px solid #e9e9e7;'>
                            <strong>Descrizione:</strong><br>
                            {$data['description']}
                        </div>
                        " : "") . "
                    </div>
                    
                    <p>Buona giornata!</p>
                </div>
                <div class='footer'>
                    <p>Questa email è stata generata automaticamente dal CRM Studio Mismo</p>
                    <p>📧 noreply@studiomismo.it | 🌐 portale.studiomismo.it</p>
                </div>
            </div>
        </body>
        </html>";
    }
    
    private function formatTimeRemaining($interval) {
        if ($interval->days > 0) {
            return $interval->days . ' giorni';
        } elseif ($interval->h > 0) {
            return $interval->h . ' ore';
        } else {
            return $interval->i . ' minuti';
        }
    }
    
    private function sendEmail($to, $subject, $body) {
        // Configurazione email Hostinger
        $headers = [
            'From: Studio Mismo CRM <noreply@studiomismo.it>',
            'Reply-To: noreply@studiomismo.it',
            'Content-Type: text/html; charset=UTF-8',
            'MIME-Version: 1.0',
            'X-Mailer: PHP/' . phpversion(),
            'X-Priority: 3'
        ];
        
        return mail($to, $subject, $body, implode("\r\n", $headers));
    }
    
    private function createCenterNotification($notification) {
        try {
            $stmt = $this->pdo->prepare("
                INSERT INTO notifications (user_id, title, message, type, related_id, related_type)
                VALUES (?, ?, ?, 'info', ?, 'agenda_event')
            ");
            
            $title = "🔔 Promemoria Evento";
            $message = "Il tuo evento \"{$notification['event_title']}\" inizierà presto";
            
            $stmt->execute([
                $notification['user_id'],
                $title,
                $message,
                $notification['event_id']
            ]);
            
        } catch (Exception $e) {
            $this->log("⚠️ Errore creazione notifica centro: " . $e->getMessage());
        }
    }
    
    private function markNotificationAsSent($notificationId) {
        $stmt = $this->pdo->prepare("
            UPDATE agenda_notifications 
            SET status = 'sent', sent_at = CURRENT_TIMESTAMP 
            WHERE id = ?
        ");
        $stmt->execute([$notificationId]);
    }
    
    private function markNotificationAsFailed($notificationId, $error) {
        $stmt = $this->pdo->prepare("
            UPDATE agenda_notifications 
            SET status = 'failed', message = ? 
            WHERE id = ?
        ");
        $stmt->execute([$error, $notificationId]);
    }
    
    private function log($message) {
        $timestamp = date('Y-m-d H:i:s');
        $logEntry = "[{$timestamp}] {$message}\n";
        
        file_put_contents($this->logFile, $logEntry, FILE_APPEND | LOCK_EX);
        
        // Output per cron
        echo $logEntry;
    }
}

// Esegui solo se chiamato da riga di comando
if (php_sapi_name() === 'cli') {
    $sender = new EmailNotificationSender();
    $sender->run();
} else {
    // Test via browser (solo per debug)
    if (isset($_GET['test']) && $_GET['test'] === 'run') {
        $sender = new EmailNotificationSender();
        $sender->run();
    } else {
        echo "
        <h2>📧 Sistema Email Notifiche</h2>
        <p>Questo script viene eseguito automaticamente ogni 5 minuti via cron.</p>
        <p><a href='?test=run'>🧪 Esegui test manuale</a></p>
        <p><strong>Comando cron:</strong></p>
        <code>*/5 * * * * /usr/bin/php " . __FILE__ . "</code>
        ";
    }
}
?>