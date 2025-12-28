<?php
// File: /modules/task_manager/ajax/get_console_logs.php
// VERSIONE MIGLIORATA - Mostra chi ha fatto ogni azione
require_once __DIR__ . '/../../../core/includes/auth_helper.php';

header('Content-Type: application/json; charset=utf-8');

try {
    $currentUser = getCurrentUser();
    if (!$currentUser) {
        throw new Exception('Non autenticato');
    }
    
    $dsn = "mysql:host=127.0.0.1;dbname=u706045794_crm_mismo;charset=utf8mb4";
    $pdo = new PDO($dsn, 'u706045794_mismo_crm_new', 'BLQ$>:;*9+h');
    
    // Verifica se tabella esiste
    $result = $pdo->query("SHOW TABLES LIKE 'task_console_logs'");
    
    if ($result->rowCount() === 0) {
        // Tabella non esiste - risposta vuota
        echo json_encode([
            'success' => true,
            'logs' => [],
            'total' => 0
        ]);
        exit;
    }
    
    // Query con JOIN per ottenere info utente complete
    $stmt = $pdo->query("
        SELECT 
            tcl.*,
            u.email as user_email,
            CASE 
                WHEN tcl.created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR) THEN 
                    CONCAT(TIMESTAMPDIFF(MINUTE, tcl.created_at, NOW()), ' min fa')
                WHEN tcl.created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR) THEN 
                    CONCAT(TIMESTAMPDIFF(HOUR, tcl.created_at, NOW()), ' ore fa')
                WHEN tcl.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 
                    CONCAT(TIMESTAMPDIFF(DAY, tcl.created_at, NOW()), ' giorni fa')
                ELSE 
                    DATE_FORMAT(tcl.created_at, '%d/%m %H:%i')
            END as time_ago
        FROM task_console_logs tcl
        LEFT JOIN users u ON tcl.user_id = u.id
        ORDER BY tcl.created_at DESC 
        LIMIT 50
    ");
    
    $logs = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // 🎨 FORMATTA LOG PER MOSTRARE UTENTE
    $formattedLogs = array_map(function($log) {
        $userName = $log['user_name'] ?: 'Sistema';
        $userEmail = $log['user_email'] ?: '';
        $originalMessage = $log['message'];
        $type = $log['type'];
        $timeAgo = $log['time_ago'];
        $createdAt = $log['created_at'];
        
        // 👤 MODIFICA DIRETTAMENTE IL CAMPO MESSAGE per compatibilità frontend
        $messageWithUser = "👤 {$userName}: {$originalMessage}";
        
        // 🎨 ICONE PER TIPO
        $typeIcons = [
            'success' => '✅',
            'error' => '❌',
            'warning' => '⚠️',
            'info' => 'ℹ️'
        ];
        
        $icon = $typeIcons[$type] ?? 'ℹ️';
        
        return [
            'id' => (int)$log['id'],
            'user_id' => (int)$log['user_id'],
            'user_name' => $userName,
            'user_email' => $userEmail,
            'message' => $messageWithUser, // ORA INCLUDE IL NOME UTENTE
            'original_message' => $originalMessage, // Messaggio originale se serve
            'type' => $type,
            'icon' => $icon,
            'time_ago' => $timeAgo,
            'created_at' => $createdAt,
            'timestamp' => date('H:i:s', strtotime($createdAt))
        ];
    }, $logs);
    
    echo json_encode([
        'success' => true,
        'logs' => $formattedLogs,
        'total' => count($formattedLogs)
    ]);
    
} catch (Exception $e) {
    // Anche in caso di errore, non bloccare il sistema
    echo json_encode([
        'success' => true,
        'logs' => [],
        'total' => 0,
        'note' => 'Console non disponibile: ' . $e->getMessage()
    ]);
}
?>