<?php
// File: /modules/media/index.php
// Modulo Media - Gestione file caricati nei Post-it

require_once __DIR__ . '/../../core/includes/auth_helper.php';
requireAuth();

$currentUser = getCurrentUser();
$pageTitle = 'Media Archive';

// Filtri e paginazione
$page = max(1, $_GET['page'] ?? 1);
$perPage = 24;
$search = $_GET['search'] ?? '';
$type = $_GET['type'] ?? '';
$sortBy = $_GET['sort'] ?? 'uploaded_at';
$sortOrder = $_GET['order'] ?? 'DESC';

$offset = ($page - 1) * $perPage;

try {
    $dsn = "mysql:host=127.0.0.1;dbname=u706045794_crm_mismo;charset=utf8mb4";
    $pdo = new PDO($dsn, 'u706045794_mismo_crm_new', 'BLQ$>:;*9+h', [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
    
    // Costruisci query per conteggio
    $whereConditions = ["pm.uploaded_by = ?", "pm.is_deleted = FALSE"];
    $params = [$currentUser['id']];
    
    if (!empty($search)) {
        $whereConditions[] = "(pm.original_filename LIKE ? OR pm.filename LIKE ?)";
        $searchTerm = "%$search%";
        $params[] = $searchTerm;
        $params[] = $searchTerm;
    }
    
    if (!empty($type)) {
        $whereConditions[] = "pm.mime_type LIKE ?";
        $params[] = "$type%";
    }
    
    $whereClause = "WHERE " . implode(" AND ", $whereConditions);
    
    // Conteggio totale
    $countSql = "
        SELECT COUNT(*) as total
        FROM postit_media pm
        $whereClause
    ";
    $stmt = $pdo->prepare($countSql);
    $stmt->execute($params);
    $totalCount = $stmt->fetchColumn();
    
    $totalPages = ceil($totalCount / $perPage);
    
    // Query principale con usage info
    $validSortFields = ['uploaded_at', 'file_size', 'original_filename', 'usage_count'];
    if (!in_array($sortBy, $validSortFields)) {
        $sortBy = 'uploaded_at';
    }
    $sortOrder = strtoupper($sortOrder) === 'ASC' ? 'ASC' : 'DESC';
    
    $sql = "
        SELECT pm.*,
               COUNT(DISTINCT pe.id) as usage_count,
               GROUP_CONCAT(DISTINCT pb.name ORDER BY pb.name SEPARATOR ', ') as board_names,
               GROUP_CONCAT(DISTINCT CONCAT(pb.id, ':', pb.name) ORDER BY pb.name SEPARATOR '|') as board_details
        FROM postit_media pm
        LEFT JOIN postit_element_media pem ON pm.id = pem.media_id
        LEFT JOIN postit_elements pe ON pem.element_id = pe.id AND pe.is_deleted = FALSE
        LEFT JOIN postit_boards pb ON pe.board_id = pb.id AND pb.is_deleted = FALSE
        $whereClause
        GROUP BY pm.id
        ORDER BY $sortBy $sortOrder, pm.id DESC
        LIMIT $perPage OFFSET $offset
    ";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $mediaFiles = $stmt->fetchAll();
    
    // Statistiche
    $statsQuery = "
        SELECT 
            COUNT(*) as total_files,
            SUM(file_size) as total_size,
            COUNT(CASE WHEN mime_type LIKE 'image/%' THEN 1 END) as images,
            COUNT(CASE WHEN usage_count = 0 THEN 1 END) as unused
        FROM (
            SELECT pm.*, COUNT(DISTINCT pe.id) as usage_count
            FROM postit_media pm
            LEFT JOIN postit_element_media pem ON pm.id = pem.media_id
            LEFT JOIN postit_elements pe ON pem.element_id = pe.id AND pe.is_deleted = FALSE
            WHERE pm.uploaded_by = ? AND pm.is_deleted = FALSE
            GROUP BY pm.id
        ) as media_stats
    ";
    $stmt = $pdo->prepare($statsQuery);
    $stmt->execute([$currentUser['id']]);
    $stats = $stmt->fetch();
    
} catch (Exception $e) {
    error_log("Media module error: " . $e->getMessage());
    $mediaFiles = [];
    $totalCount = 0;
    $totalPages = 0;
    $stats = ['total_files' => 0, 'total_size' => 0, 'images' => 0, 'unused' => 0];
}

$additionalCSS = ['/modules/media/assets/css/media.css'];
$additionalJS = ['/modules/media/assets/js/media.js'];

// Contenuto della pagina
ob_start();
?>

<div class="media-container">
    <!-- Header con statistiche -->
    <div class="media-header">
        <div class="media-stats">
            <div class="stat-card">
                <div class="stat-number"><?= $stats['total_files'] ?></div>
                <div class="stat-label">File totali</div>
            </div>
            <div class="stat-card">
                <div class="stat-number"><?= formatFileSize($stats['total_size']) ?></div>
                <div class="stat-label">Spazio utilizzato</div>
            </div>
            <div class="stat-card">
                <div class="stat-number"><?= $stats['images'] ?></div>
                <div class="stat-label">Immagini</div>
            </div>
            <div class="stat-card">
                <div class="stat-number"><?= $stats['unused'] ?></div>
                <div class="stat-label">Non utilizzati</div>
            </div>
        </div>
        
        <div class="media-actions">
            <button class="btn-danger" id="cleanupBtn" <?= $stats['unused'] == 0 ? 'disabled' : '' ?>>
                🗑️ Pulisci file inutilizzati
            </button>
        </div>
    </div>
    
    <!-- Filtri e ricerca -->
    <div class="media-filters">
        <form method="GET" class="filters-form">
            <div class="filter-group">
                <input type="text" 
                       name="search" 
                       placeholder="Cerca file..." 
                       value="<?= htmlspecialchars($search) ?>"
                       class="search-input">
            </div>
            
            <div class="filter-group">
                <select name="type" class="filter-select">
                    <option value="">Tutti i tipi</option>
                    <option value="image" <?= $type === 'image' ? 'selected' : '' ?>>Immagini</option>
                    <option value="video" <?= $type === 'video' ? 'selected' : '' ?>>Video</option>
                    <option value="audio" <?= $type === 'audio' ? 'selected' : '' ?>>Audio</option>
                </select>
            </div>
            
            <div class="filter-group">
                <select name="sort" class="filter-select">
                    <option value="uploaded_at" <?= $sortBy === 'uploaded_at' ? 'selected' : '' ?>>Data caricamento</option>
                    <option value="original_filename" <?= $sortBy === 'original_filename' ? 'selected' : '' ?>>Nome file</option>
                    <option value="file_size" <?= $sortBy === 'file_size' ? 'selected' : '' ?>>Dimensione</option>
                    <option value="usage_count" <?= $sortBy === 'usage_count' ? 'selected' : '' ?>>Utilizzo</option>
                </select>
            </div>
            
            <div class="filter-group">
                <select name="order" class="filter-select">
                    <option value="DESC" <?= $sortOrder === 'DESC' ? 'selected' : '' ?>>Decrescente</option>
                    <option value="ASC" <?= $sortOrder === 'ASC' ? 'selected' : '' ?>>Crescente</option>
                </select>
            </div>
            
            <button type="submit" class="btn-primary">Filtra</button>
            <?php if (!empty($search) || !empty($type) || $sortBy !== 'uploaded_at' || $sortOrder !== 'DESC'): ?>
                <a href="/modules/media/" class="btn-ghost">Reset</a>
            <?php endif; ?>
        </form>
    </div>
    
    <!-- Griglia media -->
    <?php if (empty($mediaFiles)): ?>
        <div class="empty-state">
            <div class="empty-icon">📁</div>
            <h3>Nessun file trovato</h3>
            <p>Non sono stati trovati file corrispondenti ai criteri di ricerca.</p>
        </div>
    <?php else: ?>
        <div class="media-grid">
            <?php foreach ($mediaFiles as $media): ?>
                <div class="media-item" data-media-id="<?= $media['id'] ?>">
                    <div class="media-preview">
                        <?php if (strpos($media['mime_type'], 'image/') === 0): ?>
                            <img src="<?= htmlspecialchars($media['file_path']) ?>" 
                                 alt="<?= htmlspecialchars($media['original_filename']) ?>"
                                 loading="lazy">
                        <?php else: ?>
                            <div class="file-icon">
                                📄
                            </div>
                        <?php endif; ?>
                        
                        <?php if ($media['usage_count'] == 0): ?>
                            <div class="unused-badge">Non utilizzato</div>
                        <?php endif; ?>
                        
                        <div class="media-overlay">
                            <button class="action-btn" data-action="view" title="Visualizza">👁️</button>
                            <button class="action-btn" data-action="download" title="Scarica">⬇️</button>
                            <button class="action-btn danger" data-action="delete" title="Elimina">🗑️</button>
                        </div>
                    </div>
                    
                    <div class="media-info">
                        <h3 class="media-name" title="<?= htmlspecialchars($media['original_filename']) ?>">
                            <?= htmlspecialchars(truncate($media['original_filename'], 25)) ?>
                        </h3>
                        
                        <div class="media-meta">
                            <span class="file-size"><?= formatFileSize($media['file_size']) ?></span>
                            <?php if ($media['width'] && $media['height']): ?>
                                <span class="dimensions"><?= $media['width'] ?>×<?= $media['height'] ?></span>
                            <?php endif; ?>
                        </div>
                        
                        <div class="usage-info">
                            <?php if ($media['usage_count'] > 0): ?>
                                <span class="usage-count">
                                    Utilizzato in <?= $media['usage_count'] ?> elemento<?= $media['usage_count'] > 1 ? 'i' : '' ?>
                                </span>
                                
                                <?php if ($media['board_names']): ?>
                                    <div class="board-list">
                                        <strong>Tavole:</strong> <?= htmlspecialchars($media['board_names']) ?>
                                    </div>
                                <?php endif; ?>
                            <?php else: ?>
                                <span class="no-usage">File non utilizzato</span>
                            <?php endif; ?>
                        </div>
                        
                        <div class="upload-date">
                            <?= date('d/m/Y H:i', strtotime($media['uploaded_at'])) ?>
                        </div>
                    </div>
                </div>
            <?php endforeach; ?>
        </div>
        
        <!-- Paginazione -->
        <?php if ($totalPages > 1): ?>
            <div class="pagination">
                <?php if ($page > 1): ?>
                    <a href="?<?= http_build_query(array_merge($_GET, ['page' => $page - 1])) ?>" 
                       class="page-btn">« Precedente</a>
                <?php endif; ?>
                
                <?php
                $start = max(1, $page - 2);
                $end = min($totalPages, $page + 2);
                
                for ($i = $start; $i <= $end; $i++):
                ?>
                    <a href="?<?= http_build_query(array_merge($_GET, ['page' => $i])) ?>" 
                       class="page-btn <?= $i == $page ? 'active' : '' ?>">
                        <?= $i ?>
                    </a>
                <?php endfor; ?>
                
                <?php if ($page < $totalPages): ?>
                    <a href="?<?= http_build_query(array_merge($_GET, ['page' => $page + 1])) ?>" 
                       class="page-btn">Successiva »</a>
                <?php endif; ?>
                
                <span class="page-info">
                    Pagina <?= $page ?> di <?= $totalPages ?> (<?= $totalCount ?> file totali)
                </span>
            </div>
        <?php endif; ?>
    <?php endif; ?>
</div>

<!-- Modal visualizzazione file -->
<div class="modal" id="viewModal">
    <div class="modal-content large">
        <div class="modal-header">
            <h3 id="modalFileName">File</h3>
            <button class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
            <div class="file-preview" id="filePreview">
                <!-- Contenuto dinamico -->
            </div>
            <div class="file-details" id="fileDetails">
                <!-- Dettagli file -->
            </div>
        </div>
        <div class="modal-actions">
            <button class="btn-primary" id="downloadFromModal">Scarica</button>
            <button class="btn-ghost" id="closeModal">Chiudi</button>
        </div>
    </div>
</div>

<?php
$pageContent = ob_get_clean();

// Funzioni helper
function formatFileSize($bytes) {
    if ($bytes == 0) return '0 B';
    $sizes = ['B', 'KB', 'MB', 'GB'];
    $i = floor(log($bytes) / log(1024));
    return round($bytes / pow(1024, $i), 2) . ' ' . $sizes[$i];
}

function truncate($text, $length) {
    return strlen($text) > $length ? substr($text, 0, $length) . '...' : $text;
}

// Render della pagina
renderPage($pageTitle, $pageContent, $additionalCSS, $additionalJS);
?>