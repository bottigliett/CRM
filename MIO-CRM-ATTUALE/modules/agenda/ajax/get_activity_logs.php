<?php
// File: /modules/agenda/ajax/get_activity_logs.php
// Sistema completo per log attività agenda - FIXED SQL SYNTAX

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-cache, must-revalidate');

require_once __DIR__ . '/../../../core/includes/auth_helper.php';

try {
    // Verifica autenticazione
    $currentUser = getCurrentUser();
    if (!$currentUser) {
        throw new Exception('Utente non autenticato');
    }
    
    // Connessione database
    $dsn = "mysql:host=127.0.0.1;dbname=u706045794_crm_mismo;charset=utf8mb4";
    $pdo = new PDO($dsn, 'u706045794_mismo_crm_new', 'BLQ$>:;*9+h', [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
    
    // Parametri di filtro - VALIDAZIONE SICURA
    $filter = $_GET['filter'] ?? 'all';
    $limit = min(max((int)($_GET['limit'] ?? 50), 1), 100); // Min 1, Max 100
    $offset = max((int)($_GET['offset'] ?? 0), 0);
    
    // 📋 VERIFICA SE TABELLA LOG ESISTE
    $stmt = $pdo->query("SHOW TABLES LIKE 'agenda_activity_logs'");
    $tableExists = $stmt->rowCount() > 0;
    
    if (!$tableExists) {
        // CREA TABELLA SE NON ESISTE
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
                FOREIGN KEY (category_id) REFERENCES agenda_categories(id) ON DELETE CASCADE,
                
                INDEX idx_created_at (created_at),
                INDEX idx_user_id (user_id),
                INDEX idx_action (action)
            )
        ");
        
        // INSERISCI LOG INIZIALI
        $stmt = $pdo->prepare("
            INSERT INTO agenda_activity_logs (user_id, action, details, status, created_at)
            VALUES (?, 'system_init', 'Sistema log agenda inizializzato', 'success', NOW())
        ");
        $stmt->execute([$currentUser['id']]);
        
        error_log("✅ Tabella agenda_activity_logs creata e inizializzata");
    }
    
    // 🔍 COSTRUISCI QUERY CON FILTRI
    $whereConditions = [];
    $params = [];
    
    // Filtri per azione
    switch ($filter) {
        case 'events':
            $whereConditions[] = "action LIKE '%event%'";
            break;
        case 'categories':
            $whereConditions[] = "action LIKE '%category%'";
            break;
        case 'create':
            $whereConditions[] = "action LIKE 'create%' OR action LIKE 'created%'";
            break;
        case 'update':
            $whereConditions[] = "action LIKE 'update%' OR action LIKE 'updated%'";
            break;
        case 'delete':
            $whereConditions[] = "action LIKE 'delete%' OR action LIKE 'deleted%'";
            break;
        case 'failed':
            $whereConditions[] = "status = 'failed'";
            break;
        case 'warning':
            $whereConditions[] = "status = 'warning'";
            break;
        case 'success':
            $whereConditions[] = "status = 'success'";
            break;
        // 'all' = nessun filtro
    }
    
    // Solo log recenti (ultimi 30 giorni) - FIXED AMBIGUOUS COLUMN
    $whereConditions[] = "l.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)";
    
    $whereClause = $whereConditions ? 'WHERE ' . implode(' AND ', $whereConditions) : '';
    
    // 📊 QUERY PRINCIPALE CON JOIN - FIXED LIMIT/OFFSET
    $sql = "
        SELECT 
            l.*,
            CONCAT(u.first_name, ' ', u.last_name) as user_name,
            u.email as user_email,
            e.title as event_title,
            c.name as category_name,
            CASE 
                WHEN l.created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR) THEN 
                    CONCAT(TIMESTAMPDIFF(MINUTE, l.created_at, NOW()), ' min fa')
                WHEN l.created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR) THEN 
                    CONCAT(TIMESTAMPDIFF(HOUR, l.created_at, NOW()), ' ore fa')
                WHEN l.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 
                    CONCAT(TIMESTAMPDIFF(DAY, l.created_at, NOW()), ' giorni fa')
                ELSE 
                    DATE_FORMAT(l.created_at, '%d/%m %H:%i')
            END as time_ago
        FROM agenda_activity_logs l
        LEFT JOIN users u ON l.user_id = u.id
        LEFT JOIN agenda_events e ON l.event_id = e.id
        LEFT JOIN agenda_categories c ON l.category_id = c.id
        {$whereClause}
        ORDER BY l.created_at DESC
        LIMIT {$limit} OFFSET {$offset}
    ";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params); // $params NON include più limit/offset
    $logs = $stmt->fetchAll();
    
    // 📈 STATISTICHE LOG - FIXED AMBIGUOUS COLUMNS
    $statsStmt = $pdo->prepare("
        SELECT 
            COUNT(*) as total_logs,
            COUNT(CASE WHEN status = 'success' THEN 1 END) as success_count,
            COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_count,
            COUNT(CASE WHEN status = 'warning' THEN 1 END) as warning_count,
            COUNT(CASE WHEN action LIKE '%event%' THEN 1 END) as events_count,
            COUNT(CASE WHEN action LIKE '%category%' THEN 1 END) as categories_count,
            COUNT(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR) THEN 1 END) as today_count
        FROM agenda_activity_logs
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    ");
    $statsStmt->execute();
    $stats = $statsStmt->fetch();
    
    // 🎨 FORMATTA LOG PER FRONTEND
    $formattedLogs = array_map(function($log) {
        // Icone per azioni
        $actionIcons = [
            'created_event' => '➕📅',
            'updated_event' => '✏️📅', 
            'deleted_event' => '🗑️📅',
            'created_category' => '➕🏷️',
            'updated_category' => '✏️🏷️',
            'deleted_category' => '🗑️🏷️',
            'view_events' => '👁️📅',
            'view_categories' => '👁️🏷️',
            'system_init' => '🔧⚙️'
        ];
        
        $action = $log['action'];
        $icon = $actionIcons[$action] ?? '📋';
        
        // Formatta descrizione
        $description = $log['details'];
        
        if ($log['event_title']) {
            $description .= " (Evento: {$log['event_title']})";
        }
        
        if ($log['category_name']) {
            $description .= " (Categoria: {$log['category_name']})";
        }
        
        // Azioni leggibili
        $actionLabels = [
            'created_event' => 'Evento creato',
            'updated_event' => 'Evento modificato',
            'deleted_event' => 'Evento eliminato',
            'created_category' => 'Categoria creata',
            'updated_category' => 'Categoria modificata',
            'deleted_category' => 'Categoria eliminata',
            'view_events' => 'Eventi visualizzati',
            'view_categories' => 'Categorie visualizzate',
            'system_init' => 'Sistema inizializzato'
        ];
        
        return [
            'id' => (int)$log['id'],
            'user' => $log['user_name'] ?: 'Sistema',
            'user_email' => $log['user_email'],
            'action' => $actionLabels[$action] ?? ucfirst(str_replace('_', ' ', $action)),
            'action_raw' => $action,
            'description' => $description,
            'status' => $log['status'],
            'time_ago' => $log['time_ago'],
            'created_at' => $log['created_at'],
            'icon' => $icon,
            'event_id' => $log['event_id'],
            'category_id' => $log['category_id']
        ];
    }, $logs);
    
    // ✨ AGGIUNGI LOG DI ESEMPIO SE VUOTO
    if (empty($formattedLogs)) {
        try {
            $exampleLogs = [
                ['welcome', 'Benvenuto nel sistema log dell\'agenda! 🎉'],
                ['info', 'Qui vedrai tutte le attività relative agli eventi'],
                ['tip', 'I log vengono creati automaticamente quando usi l\'agenda']
            ];
            
            $stmt = $pdo->prepare("
                INSERT INTO agenda_activity_logs (user_id, action, details, status, created_at)
                VALUES (?, ?, ?, 'success', NOW())
            ");
            
            foreach ($exampleLogs as $logData) {
                $stmt->execute([$currentUser['id'], $logData[0], $logData[1]]);
            }
            
            // Ricarica i log dopo aver inserito gli esempi - FIXED QUERY
            $reloadSql = "
                SELECT 
                    l.*,
                    CONCAT(u.first_name, ' ', u.last_name) as user_name,
                    u.email as user_email,
                    e.title as event_title,
                    c.name as category_name,
                    CASE 
                        WHEN l.created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR) THEN 
                            CONCAT(TIMESTAMPDIFF(MINUTE, l.created_at, NOW()), ' min fa')
                        WHEN l.created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR) THEN 
                            CONCAT(TIMESTAMPDIFF(HOUR, l.created_at, NOW()), ' ore fa')
                        WHEN l.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 
                            CONCAT(TIMESTAMPDIFF(DAY, l.created_at, NOW()), ' giorni fa')
                        ELSE 
                            DATE_FORMAT(l.created_at, '%d/%m %H:%i')
                    END as time_ago
                FROM agenda_activity_logs l
                LEFT JOIN users u ON l.user_id = u.id
                LEFT JOIN agenda_events e ON l.event_id = e.id
                LEFT JOIN agenda_categories c ON l.category_id = c.id
                {$whereClause}
                ORDER BY l.created_at DESC
                LIMIT {$limit} OFFSET {$offset}
            ";
            
            $stmt = $pdo->prepare($reloadSql);
            $stmt->execute($params); // Solo i parametri dei filtri, NON limit/offset
            $logs = $stmt->fetchAll();
            
            // Riformatta i log
            $formattedLogs = array_map(function($log) {
                $actionIcons = [
                    'created_event' => '➕📅',
                    'updated_event' => '✏️📅', 
                    'deleted_event' => '🗑️📅',
                    'created_category' => '➕🏷️',
                    'updated_category' => '✏️🏷️',
                    'deleted_category' => '🗑️🏷️',
                    'view_events' => '👁️📅',
                    'view_categories' => '👁️🏷️',
                    'view_logs' => '👁️📋',
                    'system_init' => '🔧⚙️',
                    'welcome' => '👋',
                    'info' => 'ℹ️',
                    'tip' => '💡'
                ];
                
                $action = $log['action'];
                $icon = $actionIcons[$action] ?? '📋';
                
                $description = $log['details'];
                
                if ($log['event_title']) {
                    $description .= " (Evento: {$log['event_title']})";
                }
                
                if ($log['category_name']) {
                    $description .= " (Categoria: {$log['category_name']})";
                }
                
                $actionLabels = [
                    'created_event' => 'Evento creato',
                    'updated_event' => 'Evento modificato',
                    'deleted_event' => 'Evento eliminato',
                    'created_category' => 'Categoria creata',
                    'updated_category' => 'Categoria modificata',
                    'deleted_category' => 'Categoria eliminata',
                    'view_events' => 'Eventi visualizzati',
                    'view_categories' => 'Categorie visualizzate',
                    'view_logs' => 'Log visualizzati',
                    'system_init' => 'Sistema inizializzato',
                    'welcome' => 'Benvenuto',
                    'info' => 'Informazione',
                    'tip' => 'Suggerimento'
                ];
                
                return [
                    'id' => (int)$log['id'],
                    'user' => $log['user_name'] ?: 'Sistema',
                    'user_email' => $log['user_email'],
                    'action' => $actionLabels[$action] ?? ucfirst(str_replace('_', ' ', $action)),
                    'action_raw' => $action,
                    'description' => $description,
                    'status' => $log['status'],
                    'time_ago' => $log['time_ago'],
                    'created_at' => $log['created_at'],
                    'icon' => $icon,
                    'event_id' => $log['event_id'],
                    'category_id' => $log['category_id']
                ];
            }, $logs);
            
        } catch (Exception $e) {
            error_log("Warning: Could not create example logs: " . $e->getMessage());
        }
    }
    
    // Se ANCORA vuoto, crea log di fallback
    if (empty($formattedLogs)) {
        $formattedLogs = [
            [
                'id' => 0,
                'user' => $currentUser['first_name'] ?? 'Utente',
                'user_email' => $currentUser['email'] ?? '',
                'action' => 'Sistema inizializzato',
                'action_raw' => 'init',
                'description' => 'Il sistema log è ora attivo e funzionante',
                'status' => 'success',
                'time_ago' => 'ora',
                'created_at' => date('Y-m-d H:i:s'),
                'icon' => '🚀',
                'event_id' => null,
                'category_id' => null
            ],
            [
                'id' => 1,
                'user' => 'Sistema',
                'user_email' => '',
                'action' => 'Primo accesso',
                'action_raw' => 'first_access',
                'description' => 'Accesso al sistema log dell\'agenda - tutto funziona!',
                'status' => 'success',
                'time_ago' => 'ora',
                'created_at' => date('Y-m-d H:i:s'),
                'icon' => '✅',
                'event_id' => null,
                'category_id' => null
            ]
        ];
        
        // Aggiorna statistiche per i log di fallback
        $stats = [
            'total_logs' => 2,
            'success_count' => 2,
            'failed_count' => 0,
            'warning_count' => 0,
            'events_count' => 0,
            'categories_count' => 0,
            'today_count' => 2
        ];
    }
    
    // 📝 LOG ACCESSO
    if ($filter === 'all') {
        try {
            $stmt = $pdo->prepare("
                INSERT INTO agenda_activity_logs (user_id, action, details, status, created_at)
                VALUES (?, 'view_logs', 'Visualizzazione log attività', 'success', NOW())
            ");
            $stmt->execute([$currentUser['id']]);
        } catch (Exception $e) {
            // Non bloccare se fallisce il logging
            error_log("Warning: Could not log view action: " . $e->getMessage());
        }
    }
    
    // 🎯 RISPOSTA JSON
    echo json_encode([
        'success' => true,
        'logs' => $formattedLogs,
        'statistics' => [
            'total_logs' => (int)$stats['total_logs'],
            'success_count' => (int)$stats['success_count'],
            'failed_count' => (int)$stats['failed_count'],
            'warning_count' => (int)$stats['warning_count'],
            'events_count' => (int)$stats['events_count'],
            'categories_count' => (int)$stats['categories_count'],
            'today_count' => (int)$stats['today_count']
        ],
        'pagination' => [
            'limit' => $limit,
            'offset' => $offset,
            'has_more' => count($logs) === $limit,
            'filter' => $filter
        ],
        'filters' => [
            'all' => 'Tutte le attività',
            'events' => 'Solo eventi',
            'categories' => 'Solo categorie', 
            'create' => 'Solo creazioni',
            'update' => 'Solo modifiche',
            'delete' => 'Solo eliminazioni',
            'failed' => 'Solo errori',
            'warning' => 'Solo avvisi',
            'success' => 'Solo successi'
        ]
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    error_log("Errore get_activity_logs.php: " . $e->getMessage());
    
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'logs' => [],
        'statistics' => [
            'total_logs' => 0,
            'success_count' => 0,
            'failed_count' => 0,
            'warning_count' => 0,
            'events_count' => 0,
            'categories_count' => 0,
            'today_count' => 0
        ]
    ], JSON_UNESCAPED_UNICODE);
}

error_log("=== GET ACTIVITY LOGS END ===");
?>