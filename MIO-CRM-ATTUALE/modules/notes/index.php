<?php
// File: /modules/notes/index.php
// Pagina principale per la gestione delle Note - Versione semplificata

require_once __DIR__ . '/../../core/includes/auth_helper.php';

// Verifica autenticazione e ottieni utente
$currentUser = getCurrentUser();


// Sostituisci requireAuth() con:
requireModulePermission('notes', 'read');

// Per controlli granulari:
$canWrite = hasPermission('notes', 'write');
$canDelete = hasPermission('notes', 'delete');

// Connessione database
try {
    $dsn = "mysql:host=127.0.0.1;dbname=u706045794_crm_mismo;charset=utf8mb4";
    $pdo = new PDO($dsn, 'u706045794_mismo_crm_new', 'BLQ$>:;*9+h', [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
    
    // Imposta il timezone per MySQL (Italia) - Ora legale estiva UTC+2
    $pdo->exec("SET time_zone = '+02:00'");
} catch (Exception $e) {
    die('Errore connessione database: ' . $e->getMessage());
}

// Imposta il timezone PHP per l'Italia
date_default_timezone_set('Europe/Rome');

// Verifica se l'utente è admin
$isAdmin = isset($currentUser['role']) && in_array($currentUser['role'], ['admin', 'super_admin']);

// Recupera le note
$notes = [];
try {
    // Prima verifica se la tabella esiste
    $stmt = $pdo->prepare("SHOW TABLES LIKE 'notes'");
    $stmt->execute();
    $tableExists = $stmt->fetch() !== false;
    
    if ($tableExists) {
        // Query base per le note - Corretta con campi first_name/last_name
        if ($isAdmin) {
            // Gli admin vedono tutte le note pubbliche + le proprie private
            $stmt = $pdo->prepare("
                SELECT n.*, 
                CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')) as author_name, 
                u.email as author_email
                FROM notes n 
                LEFT JOIN users u ON n.user_id = u.id
                WHERE (n.is_public = 1 OR n.user_id = ?)
                ORDER BY n.is_pinned DESC, n.created_at DESC
            ");
            $stmt->execute([$currentUser['id']]);
        } else {
            // Gli utenti normali vedono solo le proprie note
            $stmt = $pdo->prepare("
                SELECT n.*, 
                CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')) as author_name, 
                u.email as author_email
                FROM notes n 
                LEFT JOIN users u ON n.user_id = u.id
                WHERE n.user_id = ? 
                ORDER BY n.is_pinned DESC, n.created_at DESC
            ");
            $stmt->execute([$currentUser['id']]);
        }
        $notes = $stmt->fetchAll();
    } else {
        // Crea la tabella se non esiste
        $createTableSQL = "
            CREATE TABLE IF NOT EXISTS `notes` (
                `id` int(11) NOT NULL AUTO_INCREMENT,
                `user_id` int(11) NOT NULL,
                `title` varchar(255) NOT NULL,
                `description` longtext DEFAULT NULL,
                `is_pinned` tinyint(1) DEFAULT 0,
                `is_public` tinyint(1) DEFAULT 0 COMMENT 'Se true, la nota è visibile agli admin',
                `color` varchar(7) DEFAULT '#FFE066' COMMENT 'Colore esadecimale della nota',
                `created_at` timestamp NULL DEFAULT current_timestamp(),
                `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
                PRIMARY KEY (`id`),
                KEY `idx_user_id` (`user_id`),
                KEY `idx_is_pinned` (`is_pinned`),
                KEY `idx_is_public` (`is_public`),
                KEY `idx_created_at` (`created_at`),
                CONSTRAINT `fk_notes_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ";
        $pdo->exec($createTableSQL);
        
        // Crea indici ottimizzati
        $pdo->exec("CREATE INDEX IF NOT EXISTS idx_user_pinned ON notes(user_id, is_pinned, created_at DESC)");
        $pdo->exec("CREATE INDEX IF NOT EXISTS idx_public_pinned ON notes(is_public, is_pinned, created_at DESC)");
    }
    
    // Verifica se esiste la colonna is_public (per aggiornamenti)
    $stmt = $pdo->prepare("SHOW COLUMNS FROM notes LIKE 'is_public'");
    $stmt->execute();
    if (!$stmt->fetch()) {
        $pdo->exec("ALTER TABLE notes ADD COLUMN is_public BOOLEAN DEFAULT 0 COMMENT 'Se true, la nota è visibile agli admin'");
        $pdo->exec("CREATE INDEX IF NOT EXISTS idx_is_public ON notes(is_public)");
    }
    
} catch (Exception $e) {
    error_log("Error with notes: " . $e->getMessage());
    $notes = [];
}

// Funzione per formattare la data in italiano
function formatItalianDate($date) {
    $timestamp = strtotime($date);
    $now = time();
    $diff = $now - $timestamp;
    
    if ($diff < 60) {
        return "Pochi secondi fa";
    } elseif ($diff < 3600) {
        $minutes = floor($diff / 60);
        return $minutes . " minuto" . ($minutes > 1 ? "i" : "") . " fa";
    } elseif ($diff < 86400) {
        $hours = floor($diff / 3600);
        return $hours . " ora" . ($hours > 1 ? "e" : "") . " fa";
    } else {
        return date('d/m/Y H:i', $timestamp);
    }
}

// Prepara il contenuto della pagina
ob_start();
?>

<div class="notes-container">
    <!-- Header con azioni -->
    <div class="notes-header">
        <div class="header-left">
            <h2 class="notes-title">Le mie note</h2>
            <p class="notes-subtitle">
                Organizza i tuoi pensieri e appunti
                <?php if ($isAdmin): ?>
                    <span class="admin-badge">👑 Admin - Vedi anche le note pubbliche</span>
                <?php endif; ?>
            </p>
        </div>
        <div class="header-actions">
            <button class="btn-primary" id="newNoteBtn">
                <span class="icon">+</span>
                Nuova nota
            </button>
        </div>
    </div>

    <!-- Filtri e ricerca -->
    <div class="notes-filters">
        <div class="search-box">
            <input type="text" id="searchNotes" placeholder="Cerca nelle note..." class="search-input">
            <span class="search-icon">🔍</span>
        </div>
        <div class="filter-buttons">
            <button class="filter-btn active" data-filter="all">Tutte</button>
            <button class="filter-btn" data-filter="pinned">Fissate</button>
            <?php if ($isAdmin): ?>
                <button class="filter-btn" data-filter="public">Pubbliche</button>
                <button class="filter-btn" data-filter="my">Solo mie</button>
            <?php else: ?>
                <button class="filter-btn" data-filter="private">Private</button>
                <button class="filter-btn" data-filter="public">Condivise</button>
            <?php endif; ?>
        </div>
    </div>

    <!-- Griglia delle note -->
    <div class="notes-grid" id="notesGrid">
        <?php if (empty($notes)): ?>
            <div class="empty-state">
                <div class="empty-icon">📝</div>
                <h3>Nessuna nota trovata</h3>
                <p>Crea la tua prima nota per iniziare</p>
            </div>
        <?php else: ?>
            <?php foreach ($notes as $note): ?>
                <div class="note-card <?= $note['is_pinned'] ? 'pinned' : '' ?> <?= $note['is_public'] ? 'public' : 'private' ?>" 
                     data-id="<?= $note['id'] ?>"
                     data-is-public="<?= $note['is_public'] ?>"
                     data-user-id="<?= $note['user_id'] ?>"
                     style="background-color: <?= htmlspecialchars($note['color']) ?>20;">
                    
                    <div class="note-header">
                        <div class="note-badges">
                            <button class="pin-btn <?= $note['is_pinned'] ? 'active' : '' ?>" 
                                    data-id="<?= $note['id'] ?>" 
                                    title="<?= $note['is_pinned'] ? 'Rimuovi dai fissati' : 'Fissa nota' ?>">
                                📌
                            </button>
                            <span class="visibility-badge <?= $note['is_public'] ? 'public' : 'private' ?>"
                                  title="<?= $note['is_public'] ? 'Nota pubblica (visibile agli admin)' : 'Nota privata' ?>">
                                <?= $note['is_public'] ? '🌐' : '🔒' ?>
                            </span>
                        </div>
                        
                        <div class="note-actions">
                            <?php if ($note['user_id'] == $currentUser['id']): ?>
                                <button class="note-action edit-btn" data-id="<?= $note['id'] ?>" title="Modifica">
                                    ✏️
                                </button>
                                <button class="note-action delete-btn" data-id="<?= $note['id'] ?>" title="Elimina">
                                    🗑️
                                </button>
                            <?php else: ?>
                                <span class="note-author" title="Creata da <?= htmlspecialchars($note['author_name']) ?>">
                                    👤 <?= htmlspecialchars($note['author_name']) ?>
                                </span>
                            <?php endif; ?>
                        </div>
                    </div>
                    
                    <div class="note-content" onclick="NotesManager.previewNote(<?= $note['id'] ?>)">
                        <h3 class="note-title"><?= htmlspecialchars($note['title']) ?></h3>
                        <div class="note-description">
                            <?= $note['description'] ? substr(strip_tags($note['description']), 0, 150) . (strlen(strip_tags($note['description'])) > 150 ? '...' : '') : '' ?>
                        </div>
                    </div>
                    
                    <div class="note-footer">
                        <span class="note-date">
                            <?= formatItalianDate($note['created_at']) ?>
                        </span>
                        <?php if ($note['updated_at'] != $note['created_at']): ?>
                            <span class="note-updated" title="Ultimo aggiornamento: <?= date('d/m/Y H:i', strtotime($note['updated_at'])) ?>">
                                ✏️ Modificata
                            </span>
                        <?php endif; ?>
                    </div>
                </div>
            <?php endforeach; ?>
        <?php endif; ?>
    </div>
</div>

<!-- Modal per creare/modificare nota -->
<div class="modal" id="noteModal">
    <div class="modal-content">
        <div class="modal-header">
            <h3 id="modalTitle">Nuova nota</h3>
            <button class="modal-close" id="closeModal">&times;</button>
        </div>
        <div class="modal-body">
            <form id="noteForm">
                <input type="hidden" id="noteId" name="id">
                
                <div class="form-group">
                    <label for="noteTitle">Titolo *</label>
                    <input type="text" id="noteTitleInput" name="title" required 
                           placeholder="Inserisci il titolo della nota">
                </div>
                
                <div class="form-group">
                    <label for="noteDescription">Descrizione</label>
                    <div class="rich-editor-toolbar">
                        <button type="button" class="toolbar-btn" data-command="bold" title="Grassetto">
                            <strong>B</strong>
                        </button>
                        <button type="button" class="toolbar-btn" data-command="italic" title="Corsivo">
                            <em>I</em>
                        </button>
                        <button type="button" class="toolbar-btn" data-command="underline" title="Sottolineato">
                            <u>U</u>
                        </button>
                        <button type="button" class="toolbar-btn" data-command="createLink" title="Inserisci link">
                            🔗
                        </button>
                        <button type="button" class="toolbar-btn" data-command="unlink" title="Rimuovi link">
                            ⛓️‍💥
                        </button>
                    </div>
                    <div id="noteDescription" class="rich-editor" contenteditable="true" 
                         placeholder="Scrivi qui la tua nota..."></div>
                    <textarea id="noteDescriptionHidden" name="description" style="display: none;"></textarea>
                </div>
                
                <div class="form-group">
                    <label>Colore nota</label>
                    <div class="color-picker">
                        <button type="button" class="color-option active" data-color="#FFE066" 
                                style="background-color: #FFE066"></button>
                        <button type="button" class="color-option" data-color="#99CCFF" 
                                style="background-color: #99CCFF"></button>
                        <button type="button" class="color-option" data-color="#FF9999" 
                                style="background-color: #FF9999"></button>
                        <button type="button" class="color-option" data-color="#B4E7CE" 
                                style="background-color: #B4E7CE"></button>
                        <button type="button" class="color-option" data-color="#DDA3FF" 
                                style="background-color: #DDA3FF"></button>
                        <button type="button" class="color-option" data-color="#FFB3BA" 
                                style="background-color: #FFB3BA"></button>
                    </div>
                    <input type="hidden" id="noteColor" name="color" value="#FFE066">
                </div>
                
                <div class="form-group checkbox-group">
                    <label>
                        <input type="checkbox" id="notePinned" name="is_pinned">
                        Fissa questa nota in alto
                    </label>
                </div>
                
                <div class="form-group checkbox-group">
                    <label>
                        <input type="checkbox" id="notePublic" name="is_public">
                        Nota pubblica (visibile agli amministratori)
                    </label>
                </div>
            </form>
        </div>
        <div class="modal-footer">
            <button type="button" class="btn-ghost" id="cancelBtn">Annulla</button>
            <button type="submit" class="btn-primary" id="saveNoteBtn">Salva nota</button>
        </div>
    </div>
</div>

<!-- Modal di anteprima nota -->
<div class="modal" id="previewModal">
    <div class="modal-content large">
        <div class="modal-header">
            <h3 id="previewTitle">Anteprima nota</h3>
            <div class="preview-actions">
                <button class="btn-ghost" id="editFromPreview" style="display: none;">
                    ✏️ Modifica
                </button>
                <button class="modal-close" id="closePreviewModal">&times;</button>
            </div>
        </div>
        <div class="modal-body">
            <div id="previewContent">
                <div class="preview-header">
                    <h2 id="previewNoteTitle"></h2>
                    <div class="preview-meta">
                        <span id="previewAuthor"></span>
                        <span id="previewDate"></span>
                        <div class="preview-badges">
                            <span id="previewVisibility"></span>
                            <span id="previewPinned"></span>
                        </div>
                    </div>
                </div>
                <div id="previewDescription" class="preview-description"></div>
            </div>
        </div>
    </div>
</div>

<!-- Modal di conferma eliminazione -->
<div class="modal" id="deleteModal">
    <div class="modal-content small">
        <div class="modal-header">
            <h3>Conferma eliminazione</h3>
            <button class="modal-close" id="closeDeleteModal">&times;</button>
        </div>
        <div class="modal-body">
            <p>Sei sicuro di voler eliminare questa nota?</p>
            <p class="text-muted">Questa azione non può essere annullata.</p>
        </div>
        <div class="modal-footer">
            <button type="button" class="btn-ghost" id="cancelDeleteBtn">Annulla</button>
            <button type="button" class="btn-danger" id="confirmDeleteBtn">Elimina</button>
        </div>
    </div>
</div>

<?php
$pageContent = ob_get_clean();

// CSS aggiuntivi
$additionalCSS = [
    '/modules/notes/assets/css/notes.css?v=' . time()
];

// JS aggiuntivi
$additionalJS = [
    '/modules/notes/assets/js/notes.js?v=' . time(),
    '/assets/js/notifications.js?v=' . time()
];

// Passa informazioni utente al JavaScript
echo "<script>window.currentUser = " . json_encode([
    'id' => $currentUser['id'],
    'name' => $currentUser['name'] ?? '',
    'is_admin' => $isAdmin
]) . ";</script>";

// Rendering della pagina
if (function_exists('renderPage')) {
    renderPage('Note', $pageContent, $additionalCSS, $additionalJS);
} else {
    // Fallback se renderPage non è disponibile
    echo '<!DOCTYPE html>';
    echo '<html><head><title>Note - CRM Studio Mismo</title>';
    echo '<link rel="stylesheet" href="/assets/css/layout.css">';
    foreach ($additionalCSS as $css) {
        echo '<link rel="stylesheet" href="' . $css . '">';
    }
    echo '</head><body>';
    echo '<div class="app-layout"><main class="main-content"><div class="content-area">';
    echo $pageContent;
    echo '</div></main></div>';
    foreach ($additionalJS as $js) {
        echo '<script src="' . $js . '"></script>';
    }
    echo '</body></html>';
}
?>