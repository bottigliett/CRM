<?php
// File: /modules/agenda/ajax/get_categories.php
// AJAX handler per ottenere la lista delle categorie - VERSIONE ANTI-DUPLICATE

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-cache, must-revalidate');
header('Expires: Mon, 26 Jul 1997 05:00:00 GMT');

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
    
    // 🔧 QUERY ANTI-DUPLICATE con DISTINCT e GROUP BY
    $stmt = $pdo->prepare("
        SELECT DISTINCT
            c.id,
            c.name,
            c.color,
            c.icon,
            c.created_by,
            c.created_at,
            c.updated_at,
            CONCAT(u.first_name, ' ', u.last_name) as created_by_name,
            u.email as created_by_email,
            COUNT(DISTINCT e1.id) as events_count,
            COUNT(DISTINCT CASE WHEN e1.status != 'cancelled' THEN e1.id END) as active_events_count
        FROM agenda_categories c
        LEFT JOIN users u ON c.created_by = u.id
        LEFT JOIN agenda_events e1 ON c.id = e1.category_id
        GROUP BY 
            c.id, c.name, c.color, c.icon, c.created_by, 
            c.created_at, c.updated_at, u.first_name, u.last_name, u.email
        ORDER BY c.name ASC
    ");
    $stmt->execute();
    $categories = $stmt->fetchAll();
    
    // 🛡️ PROTEZIONE ANTI-DUPLICATE LATO PHP
    $uniqueCategories = [];
    $seenIds = [];
    
    foreach ($categories as $category) {
        $categoryId = (int)$category['id'];
        
        // Skip se già visto questo ID
        if (in_array($categoryId, $seenIds)) {
            error_log("⚠️ Categoria duplicata rilevata e saltata: ID {$categoryId}");
            continue;
        }
        
        $seenIds[] = $categoryId;
        $uniqueCategories[] = $category;
    }
    
    // Log per debug
    $originalCount = count($categories);
    $uniqueCount = count($uniqueCategories);
    
    if ($originalCount !== $uniqueCount) {
        error_log("🔧 DUPLICATE FILTER: {$originalCount} → {$uniqueCount} categorie");
    }
    
    // Formatta le categorie per il frontend
    $formattedCategories = array_map(function($category) {
        return [
            'id' => (int)$category['id'],
            'name' => trim($category['name']),
            'color' => $category['color'],
            'icon' => $category['icon'],
            'created_by' => (int)$category['created_by'],
            'created_by_name' => $category['created_by_name'] ?? 'Sistema',
            'created_by_email' => $category['created_by_email'],
            'events_count' => (int)$category['events_count'],
            'active_events_count' => (int)$category['active_events_count'],
            'created_at' => $category['created_at'],
            'updated_at' => $category['updated_at'],
            'can_edit' => true,
            'can_delete' => (int)$category['events_count'] === 0
        ];
    }, $uniqueCategories);
    
    // 🛡️ VERIFICA FINALE ANTI-DUPLICATE
    $finalIds = array_column($formattedCategories, 'id');
    $finalUniqueIds = array_unique($finalIds);
    
    if (count($finalIds) !== count($finalUniqueIds)) {
        error_log("❌ ATTENZIONE: Ancora duplicati dopo formattazione!");
        
        // Rimuovi duplicati finali
        $temp = [];
        $usedIds = [];
        
        foreach ($formattedCategories as $cat) {
            if (!in_array($cat['id'], $usedIds)) {
                $temp[] = $cat;
                $usedIds[] = $cat['id'];
            }
        }
        
        $formattedCategories = $temp;
    }
    
    // Statistiche rapide
    $totalCategories = count($formattedCategories);
    $totalEvents = array_sum(array_column($formattedCategories, 'events_count'));
    $activeEvents = array_sum(array_column($formattedCategories, 'active_events_count'));
    
    // Log dell'accesso
    logUserAction('view_categories', 'success', "Visualizzate {$totalCategories} categorie (unique)");
    
    // 🎯 RISPOSTA JSON SICURA
    $response = [
        'success' => true,
        'categories' => $formattedCategories,
        'total_categories' => $totalCategories,
        'statistics' => [
            'total_categories' => $totalCategories,
            'total_events' => $totalEvents,
            'active_events' => $activeEvents,
            'categories_with_events' => count(array_filter($formattedCategories, function($c) {
                return $c['events_count'] > 0;
            })),
            'empty_categories' => count(array_filter($formattedCategories, function($c) {
                return $c['events_count'] == 0;
            }))
        ],
        'user_permissions' => [
            'can_create' => in_array($currentUser['role'], ['admin', 'super_admin']),
            'can_edit_all' => $currentUser['role'] === 'super_admin',
            'can_delete_all' => $currentUser['role'] === 'super_admin'
        ],
        'debug_info' => [
            'original_count' => $originalCount,
            'filtered_count' => $uniqueCount,
            'final_count' => $totalCategories,
            'duplicates_removed' => $originalCount - $totalCategories
        ]
    ];
    
    // Output JSON
    echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    // Log dell'errore
    error_log("Errore get_categories.php: " . $e->getMessage());
    
    if (isset($currentUser)) {
        logUserAction('view_categories', 'failed', "Errore: " . $e->getMessage());
    }
    
    // Risposta errore
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'code' => 'CATEGORIES_LOAD_ERROR',
        'categories' => [] // Array vuoto come fallback
    ], JSON_UNESCAPED_UNICODE);
}

// 🧹 FUNZIONE DI PULIZIA DATABASE (opzionale - chiamare solo se necessario)
function cleanDuplicateCategories($pdo) {
    try {
        // Trova eventuali duplicati reali nel database
        $stmt = $pdo->query("
            SELECT name, COUNT(*) as count 
            FROM agenda_categories 
            GROUP BY name 
            HAVING count > 1
        ");
        
        $duplicates = $stmt->fetchAll();
        
        if (empty($duplicates)) {
            return "✅ Nessun duplicato trovato nel database";
        }
        
        $cleanedCount = 0;
        
        foreach ($duplicates as $duplicate) {
            $name = $duplicate['name'];
            
            // Trova tutte le categorie con questo nome
            $stmt = $pdo->prepare("
                SELECT * FROM agenda_categories 
                WHERE name = ? 
                ORDER BY created_at ASC
            ");
            $stmt->execute([$name]);
            $categories = $stmt->fetchAll();
            
            // Mantieni solo la prima (più vecchia)
            $keepCategory = array_shift($categories);
            
            foreach ($categories as $categoryToDelete) {
                // Sposta tutti gli eventi alla categoria da mantenere  
                $stmt = $pdo->prepare("
                    UPDATE agenda_events 
                    SET category_id = ? 
                    WHERE category_id = ?
                ");
                $stmt->execute([$keepCategory['id'], $categoryToDelete['id']]);
                
                // Elimina la categoria duplicata
                $stmt = $pdo->prepare("DELETE FROM agenda_categories WHERE id = ?");
                $stmt->execute([$categoryToDelete['id']]);
                
                $cleanedCount++;
            }
        }
        
        return "🧹 Puliti {$cleanedCount} duplicati dal database";
        
    } catch (Exception $e) {
        error_log("Errore pulizia duplicati: " . $e->getMessage());
        return "❌ Errore nella pulizia: " . $e->getMessage();
    }
}
?>