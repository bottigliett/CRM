<?php
// File: /modules/notes/api.php
// API endpoint per la gestione delle note - Versione semplificata e corretta

session_start();

// Verifica autenticazione semplice
if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Non autorizzato']);
    exit;
}

header('Content-Type: application/json');

// DEBUG TEMPORANEO - RIMUOVERE DOPO
ini_set('display_errors', 1);
error_reporting(E_ALL);
ini_set('log_errors', 1);

error_log("=== API Notes Debug ===");
error_log("Method: " . $_SERVER['REQUEST_METHOD']);
error_log("User ID: " . ($_SESSION['user_id'] ?? 'NOT SET'));
error_log("Raw input: " . file_get_contents('php://input'));

// Connessione database
try {
    $dsn = "mysql:host=127.0.0.1;dbname=u706045794_crm_mismo;charset=utf8mb4";
    $db = new PDO($dsn, 'u706045794_mismo_crm_new', 'BLQ$>:;*9+h', [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
    
    // Imposta il timezone per MySQL (Italia) - Ora legale estiva UTC+2
    $db->exec("SET time_zone = '+02:00'");
} catch (Exception $e) {
    error_log("Database connection error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Errore connessione database']);
    exit;
}

// Imposta il timezone PHP per l'Italia
date_default_timezone_set('Europe/Rome');

$userId = $_SESSION['user_id'];
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

// Verifica se l'utente è admin
function isAdmin($db, $userId) {
    try {
        $stmt = $db->prepare("SELECT role FROM users WHERE id = ?");
        $stmt->execute([$userId]);
        $user = $stmt->fetch();
        return $user && in_array($user['role'], ['admin', 'super_admin']);
    } catch (Exception $e) {
        error_log("Error checking admin status: " . $e->getMessage());
        return false;
    }
}

$isAdmin = isAdmin($db, $userId);

// Funzione per sanitizzare HTML mantenendo la formattazione base
function sanitizeHTML($html) {
    // Rimuovi tag pericolosi ma mantieni quelli per la formattazione
    $allowedTags = '<p><br><strong><b><em><i><u><a><h1><h2><h3><h4><h5><h6><ul><ol><li><div>';
    $cleaned = strip_tags($html, $allowedTags);
    
    // Sanitizza gli attributi dei link
    $cleaned = preg_replace_callback('/<a\s+[^>]*href\s*=\s*["\']([^"\']*)["\'][^>]*>(.*?)<\/a>/i', 
        function($matches) {
            $url = filter_var($matches[1], FILTER_SANITIZE_URL);
            $text = htmlspecialchars($matches[2], ENT_QUOTES, 'UTF-8');
            return '<a href="' . $url . '" target="_blank" rel="noopener noreferrer">' . $text . '</a>';
        }, $cleaned);
    
    return $cleaned;
}

try {
    // Prima verifica che la tabella esista e sia aggiornata
    $stmt = $db->prepare("SHOW TABLES LIKE 'notes'");
    $stmt->execute();
    if (!$stmt->fetch()) {
        // Crea la tabella se non esiste
        $createTableSQL = "
            CREATE TABLE IF NOT EXISTS `notes` (
                `id` int(11) NOT NULL AUTO_INCREMENT,
                `user_id` int(11) NOT NULL,
                `title` varchar(255) NOT NULL,
                `description` longtext DEFAULT NULL,
                `is_pinned` tinyint(1) DEFAULT 0,
                `is_public` tinyint(1) DEFAULT 0 COMMENT 'Se true, la nota è visibile agli admin',
                `color` varchar(7) DEFAULT '#FFE066',
                `created_at` timestamp NULL DEFAULT current_timestamp(),
                `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
                PRIMARY KEY (`id`),
                KEY `idx_user_id` (`user_id`),
                KEY `idx_is_pinned` (`is_pinned`),
                KEY `idx_is_public` (`is_public`),
                KEY `idx_created_at` (`created_at`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ";
        $db->exec($createTableSQL);
    }
    
    // Verifica se esiste la colonna is_public
    $stmt = $db->prepare("SHOW COLUMNS FROM notes LIKE 'is_public'");
    $stmt->execute();
    if (!$stmt->fetch()) {
        $db->exec("ALTER TABLE notes ADD COLUMN is_public BOOLEAN DEFAULT 0 COMMENT 'Se true, la nota è visibile agli admin'");
        $db->exec("CREATE INDEX IF NOT EXISTS idx_is_public ON notes(is_public)");
    }
    
    // Verifica se la colonna description è LONGTEXT
    $stmt = $db->prepare("SHOW COLUMNS FROM notes WHERE Field = 'description'");
    $stmt->execute();
    $column = $stmt->fetch();
    if ($column && strpos(strtolower($column['Type']), 'longtext') === false) {
        $db->exec("ALTER TABLE notes MODIFY COLUMN description LONGTEXT");
    }
    
    switch ($method) {
        case 'GET':
            if ($action === 'get' && isset($_GET['id'])) {
                // Recupera singola nota
                $noteId = intval($_GET['id']);
                error_log("Getting note with ID: " . $noteId);
                
                // Query con campi corretti della tabella users
                $query = "SELECT n.*, 
                         CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')) as author_name, 
                         u.email as author_email 
                         FROM notes n 
                         LEFT JOIN users u ON n.user_id = u.id 
                         WHERE n.id = ?";
                $params = [$noteId];
                
                // Controlli di accesso
                if ($isAdmin) {
                    // Admin può vedere note pubbliche o proprie
                    $query .= " AND (n.is_public = 1 OR n.user_id = ?)";
                    $params[] = $userId;
                } else {
                    // Utenti normali vedono solo le proprie
                    $query .= " AND n.user_id = ?";
                    $params[] = $userId;
                }
                
                error_log("Query: " . $query);
                error_log("Params: " . json_encode($params));
                
                $stmt = $db->prepare($query);
                $stmt->execute($params);
                $note = $stmt->fetch();
                
                if ($note) {
                    echo json_encode(['success' => true, 'note' => $note]);
                } else {
                    http_response_code(404);
                    echo json_encode(['success' => false, 'message' => 'Nota non trovata']);
                }
            } else {
                // Lista tutte le note con filtri
                $filter = $_GET['filter'] ?? 'all';
                $search = $_GET['search'] ?? '';
                
                // Query base con campi corretti
                if ($isAdmin) {
                    $query = "SELECT n.*, 
                             CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')) as author_name, 
                             u.email as author_email 
                             FROM notes n 
                             LEFT JOIN users u ON n.user_id = u.id 
                             WHERE (n.is_public = 1 OR n.user_id = ?)";
                    $params = [$userId];
                } else {
                    $query = "SELECT n.*, 
                             CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')) as author_name, 
                             u.email as author_email 
                             FROM notes n 
                             LEFT JOIN users u ON n.user_id = u.id 
                             WHERE n.user_id = ?";
                    $params = [$userId];
                }
                
                // Applica filtri
                switch ($filter) {
                    case 'pinned':
                        $query .= " AND n.is_pinned = 1";
                        break;
                    case 'public':
                        if ($isAdmin) {
                            $query .= " AND n.is_public = 1";
                        }
                        break;
                    case 'private':
                        $query .= " AND n.is_public = 0";
                        break;
                    case 'my':
                        if ($isAdmin) {
                            $query = "SELECT n.*, 
                                     CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')) as author_name, 
                                     u.email as author_email 
                                     FROM notes n 
                                     LEFT JOIN users u ON n.user_id = u.id 
                                     WHERE n.user_id = ?";
                            $params = [$userId];
                        }
                        break;
                }
                
                // Ricerca
                if (!empty($search)) {
                    $query .= " AND (n.title LIKE ? OR n.description LIKE ?)";
                    $searchTerm = "%$search%";
                    $params[] = $searchTerm;
                    $params[] = $searchTerm;
                }
                
                $query .= " ORDER BY n.is_pinned DESC, n.created_at DESC";
                
                $stmt = $db->prepare($query);
                $stmt->execute($params);
                $notes = $stmt->fetchAll();
                
                echo json_encode(['success' => true, 'notes' => $notes]);
            }
            break;
            
        case 'POST':
            // Crea nuova nota
            $data = json_decode(file_get_contents('php://input'), true);
            error_log("POST data: " . json_encode($data));
            
            if (empty($data['title'])) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Il titolo è obbligatorio']);
                exit;
            }
            
            // Sanitizza input
            $title = htmlspecialchars(trim($data['title']), ENT_QUOTES, 'UTF-8');
            $description = sanitizeHTML($data['description'] ?? '');
            $isPinned = isset($data['is_pinned']) ? (int)$data['is_pinned'] : 0;
            $isPublic = isset($data['is_public']) ? (int)$data['is_public'] : 0;
            $color = preg_match('/^#[0-9A-F]{6}$/i', $data['color'] ?? '') ? $data['color'] : '#FFE066';
            
            // Validazione lunghezza
            if (strlen($title) > 255) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Il titolo è troppo lungo (massimo 255 caratteri)']);
                exit;
            }
            
            if (strlen($description) > 100000) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Il contenuto è troppo lungo']);
                exit;
            }
            
            $stmt = $db->prepare("
                INSERT INTO notes (user_id, title, description, is_pinned, is_public, color) 
                VALUES (?, ?, ?, ?, ?, ?)
            ");
            
            $stmt->execute([
                $userId,
                $title,
                $description,
                $isPinned,
                $isPublic,
                $color
            ]);
            
            $noteId = $db->lastInsertId();
            
            // Recupera la nota appena creata
            $stmt = $db->prepare("
                SELECT n.*, 
                CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')) as author_name, 
                u.email as author_email
                FROM notes n 
                LEFT JOIN users u ON n.user_id = u.id 
                WHERE n.id = ?
            ");
            $stmt->execute([$noteId]);
            $note = $stmt->fetch();
            
            echo json_encode([
                'success' => true, 
                'message' => 'Nota creata con successo', 
                'note' => $note
            ]);
            break;
            
        case 'PUT':
            // Aggiorna nota esistente
            $data = json_decode(file_get_contents('php://input'), true);
            error_log("PUT data: " . json_encode($data));
            
            if (empty($data['id'])) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'ID nota mancante']);
                exit;
            }
            
            $noteId = intval($data['id']);
            
            // Verifica che la nota appartenga all'utente
            $stmt = $db->prepare("SELECT id FROM notes WHERE id = ? AND user_id = ?");
            $stmt->execute([$noteId, $userId]);
            if (!$stmt->fetch()) {
                http_response_code(403);
                echo json_encode(['success' => false, 'message' => 'Non autorizzato a modificare questa nota']);
                exit;
            }
            
            // Sanitizza input
            $title = htmlspecialchars(trim($data['title']), ENT_QUOTES, 'UTF-8');
            $description = sanitizeHTML($data['description'] ?? '');
            $isPinned = isset($data['is_pinned']) ? (int)$data['is_pinned'] : 0;
            $isPublic = isset($data['is_public']) ? (int)$data['is_public'] : 0;
            $color = preg_match('/^#[0-9A-F]{6}$/i', $data['color'] ?? '') ? $data['color'] : '#FFE066';
            
            // Validazioni
            if (empty($title)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Il titolo è obbligatorio']);
                exit;
            }
            
            if (strlen($title) > 255) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Il titolo è troppo lungo']);
                exit;
            }
            
            if (strlen($description) > 100000) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Il contenuto è troppo lungo']);
                exit;
            }
            
            // Aggiorna la nota
            $stmt = $db->prepare("
                UPDATE notes 
                SET title = ?, description = ?, is_pinned = ?, is_public = ?, color = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ? AND user_id = ?
            ");
            
            $stmt->execute([
                $title,
                $description,
                $isPinned,
                $isPublic,
                $color,
                $noteId,
                $userId
            ]);
            
            // Recupera la nota aggiornata
            $stmt = $db->prepare("
                SELECT n.*, 
                CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')) as author_name, 
                u.email as author_email 
                FROM notes n 
                LEFT JOIN users u ON n.user_id = u.id 
                WHERE n.id = ?
            ");
            $stmt->execute([$noteId]);
            $note = $stmt->fetch();
            
            echo json_encode([
                'success' => true, 
                'message' => 'Nota aggiornata con successo', 
                'note' => $note
            ]);
            break;
            
        case 'PATCH':
            // Aggiorna solo lo stato "pinned"
            $data = json_decode(file_get_contents('php://input'), true);
            error_log("PATCH data: " . json_encode($data));
            
            if (empty($data['id'])) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'ID nota mancante']);
                exit;
            }
            
            $noteId = intval($data['id']);
            
            // Verifica che la nota appartenga all'utente
            $stmt = $db->prepare("SELECT is_pinned FROM notes WHERE id = ? AND user_id = ?");
            $stmt->execute([$noteId, $userId]);
            $note = $stmt->fetch();
            
            if (!$note) {
                http_response_code(403);
                echo json_encode(['success' => false, 'message' => 'Non autorizzato a modificare questa nota']);
                exit;
            }
            
            // Toggle dello stato pinned
            $newPinnedState = !$note['is_pinned'];
            
            $stmt = $db->prepare("
                UPDATE notes 
                SET is_pinned = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ? AND user_id = ?
            ");
            
            $stmt->execute([$newPinnedState, $noteId, $userId]);
            
            echo json_encode([
                'success' => true, 
                'message' => $newPinnedState ? 'Nota fissata in alto' : 'Nota rimossa dai fissati',
                'is_pinned' => $newPinnedState
            ]);
            break;
            
        case 'DELETE':
            // Elimina nota
            if (!isset($_GET['id'])) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'ID nota mancante']);
                exit;
            }
            
            $noteId = intval($_GET['id']);
            error_log("DELETE note ID: " . $noteId);
            
            // Verifica che la nota appartenga all'utente
            $stmt = $db->prepare("SELECT title FROM notes WHERE id = ? AND user_id = ?");
            $stmt->execute([$noteId, $userId]);
            $note = $stmt->fetch();
            
            if (!$note) {
                http_response_code(403);
                echo json_encode(['success' => false, 'message' => 'Non autorizzato a eliminare questa nota']);
                exit;
            }
            
            // Elimina la nota
            $stmt = $db->prepare("DELETE FROM notes WHERE id = ? AND user_id = ?");
            $stmt->execute([$noteId, $userId]);
            
            if ($stmt->rowCount() > 0) {
                echo json_encode([
                    'success' => true, 
                    'message' => 'Nota "' . htmlspecialchars($note['title']) . '" eliminata con successo'
                ]);
            } else {
                http_response_code(500);
                echo json_encode(['success' => false, 'message' => 'Errore durante l\'eliminazione']);
            }
            break;
            
        default:
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Metodo non consentito']);
    }
    
} catch (Exception $e) {
    http_response_code(500);
    error_log("Notes API Error: " . $e->getMessage());
    error_log("Stack trace: " . $e->getTraceAsString());
    echo json_encode([
        'success' => false, 
        'message' => 'Si è verificato un errore del server',
        'error_code' => 'INTERNAL_ERROR'
    ]);
}
?>