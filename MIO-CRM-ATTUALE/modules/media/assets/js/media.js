// File: /modules/media/assets/js/media.js
// JavaScript per gestione Media Module

class MediaManager {
    constructor() {
        this.init();
    }

    init() {
        this.bindEvents();
        console.log('MediaManager initialized');
    }

    bindEvents() {
        // Cleanup button
        const cleanupBtn = document.getElementById('cleanupBtn');
        if (cleanupBtn) {
            cleanupBtn.addEventListener('click', () => this.cleanupUnusedFiles());
        }

        // Media item actions
        document.querySelectorAll('.media-item').forEach(item => {
            const mediaId = item.dataset.mediaId;
            
            // Action buttons
            item.querySelector('[data-action="view"]')?.addEventListener('click', (e) => {
                e.stopPropagation();
                this.viewFile(mediaId);
            });
            
            item.querySelector('[data-action="download"]')?.addEventListener('click', (e) => {
                e.stopPropagation();
                this.downloadFile(mediaId);
            });
            
            item.querySelector('[data-action="delete"]')?.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteFile(mediaId);
            });
        });

        // Modal events
        this.setupModalEvents();

        // Auto-submit form on filter change
        document.querySelectorAll('.filter-select').forEach(select => {
            select.addEventListener('change', () => {
                select.closest('form').submit();
            });
        });

        // Search form with debounce
        const searchInput = document.querySelector('.search-input');
        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', () => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    searchInput.closest('form').submit();
                }, 500);
            });
        }
    }

    setupModalEvents() {
        const modal = document.getElementById('viewModal');
        const closeButtons = modal?.querySelectorAll('.modal-close, #closeModal');
        const downloadBtn = document.getElementById('downloadFromModal');
        
        closeButtons?.forEach(btn => {
            btn.addEventListener('click', () => this.closeModal());
        });
        
        modal?.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeModal();
            }
        });
        
        downloadBtn?.addEventListener('click', () => {
            const mediaId = modal.dataset.currentMediaId;
            if (mediaId) {
                this.downloadFile(mediaId);
            }
        });
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal?.classList.contains('active')) {
                this.closeModal();
            }
        });
    }

    async viewFile(mediaId) {
        try {
            this.showLoading('Caricamento file...');
            
            const response = await fetch(`/modules/media/ajax/get_media.php?id=${mediaId}`);
            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.message || 'Errore nel caricamento del file');
            }
            
            this.showFileModal(result.media);
            
        } catch (error) {
            console.error('View file error:', error);
            this.showToast('Errore nel caricamento del file', 'error');
        } finally {
            this.hideLoading();
        }
    }

    showFileModal(media) {
        const modal = document.getElementById('viewModal');
        if (!modal) return;
        
        // Update modal content
        document.getElementById('modalFileName').textContent = media.original_filename;
        modal.dataset.currentMediaId = media.id;
        
        const preview = document.getElementById('filePreview');
        const details = document.getElementById('fileDetails');
        
        // File preview
        if (media.mime_type.startsWith('image/')) {
            preview.innerHTML = `<img src="${media.file_path}" alt="${media.original_filename}" />`;
        } else {
            preview.innerHTML = `
                <div class="file-icon-large">
                    <div style="font-size: 64px; opacity: 0.5;">📄</div>
                    <p>${media.mime_type}</p>
                </div>
            `;
        }
        
        // File details
        details.innerHTML = `
            <h4>Dettagli file</h4>
            <div class="detail-row">
                <span class="detail-label">Nome originale:</span>
                <span class="detail-value">${media.original_filename}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Tipo:</span>
                <span class="detail-value">${media.mime_type}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Dimensione:</span>
                <span class="detail-value">${this.formatFileSize(media.file_size)}</span>
            </div>
            ${media.width && media.height ? `
                <div class="detail-row">
                    <span class="detail-label">Risoluzione:</span>
                    <span class="detail-value">${media.width} × ${media.height} px</span>
                </div>
            ` : ''}
            <div class="detail-row">
                <span class="detail-label">Caricato:</span>
                <span class="detail-value">${new Date(media.uploaded_at).toLocaleString('it-IT')}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Utilizzo:</span>
                <span class="detail-value">${media.usage_count || 0} elementi</span>
            </div>
            ${media.board_names ? `
                <div class="detail-row">
                    <span class="detail-label">Tavole:</span>
                    <span class="detail-value">${media.board_names}</span>
                </div>
            ` : ''}
        `;
        
        modal.classList.add('active');
    }

    closeModal() {
        const modal = document.getElementById('viewModal');
        if (modal) {
            modal.classList.remove('active');
            modal.dataset.currentMediaId = '';
        }
    }

    async downloadFile(mediaId) {
        try {
            const response = await fetch(`/modules/media/ajax/download_media.php?id=${mediaId}`);
            
            if (!response.ok) {
                throw new Error('Errore nel download del file');
            }
            
            // Get filename from response headers
            const contentDisposition = response.headers.get('Content-Disposition');
            const filename = contentDisposition 
                ? contentDisposition.split('filename=')[1]?.replace(/"/g, '') 
                : `download_${mediaId}`;
            
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.showToast('File scaricato con successo', 'success');
            
        } catch (error) {
            console.error('Download error:', error);
            this.showToast('Errore nel download del file', 'error');
        }
    }

    async deleteFile(mediaId) {
        const mediaItem = document.querySelector(`[data-media-id="${mediaId}"]`);
        const filename = mediaItem?.querySelector('.media-name')?.textContent || 'questo file';
        
        if (!confirm(`Sei sicuro di voler eliminare "${filename}"?\n\nQuesta azione non può essere annullata.`)) {
            return;
        }
        
        try {
            const response = await fetch('/modules/media/ajax/delete_media.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    media_id: parseInt(mediaId)
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                // Remove from UI with animation
                if (mediaItem) {
                    mediaItem.style.transition = 'all 0.3s ease';
                    mediaItem.style.transform = 'scale(0)';
                    mediaItem.style.opacity = '0';
                    
                    setTimeout(() => {
                        mediaItem.remove();
                        
                        // Check if no more items
                        const remainingItems = document.querySelectorAll('.media-item');
                        if (remainingItems.length === 0) {
                            window.location.reload();
                        }
                    }, 300);
                }
                
                this.showToast('File eliminato con successo', 'success');
            } else {
                throw new Error(result.message || 'Errore durante l\'eliminazione');
            }
            
        } catch (error) {
            console.error('Delete error:', error);
            this.showToast('Errore durante l\'eliminazione del file', 'error');
        }
    }

    async cleanupUnusedFiles() {
        if (!confirm('Sei sicuro di voler eliminare tutti i file non utilizzati?\n\nQuesta azione non può essere annullata.')) {
            return;
        }
        
        try {
            this.showLoading('Eliminazione file inutilizzati...');
            
            const response = await fetch('/modules/media/ajax/cleanup_unused.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showToast(`${result.deleted_count} file eliminati con successo`, 'success');
                
                // Reload page after short delay
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
            } else {
                throw new Error(result.message || 'Errore durante la pulizia');
            }
            
        } catch (error) {
            console.error('Cleanup error:', error);
            this.showToast('Errore durante la pulizia dei file', 'error');
        } finally {
            this.hideLoading();
        }
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }

    showToast(message, type = 'info') {
        // Remove existing toasts
        document.querySelectorAll('.toast').forEach(toast => toast.remove());
        
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        
        Object.assign(toast.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            background: type === 'success' ? '#4caf50' : 
                       type === 'error' ? '#f44336' : '#333',
            color: 'white',
            padding: '12px 16px',
            borderRadius: '6px',
            zIndex: '1002',
            fontSize: '14px',
            maxWidth: '300px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            animation: 'slideInRight 0.3s ease'
        });
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }

    showLoading(message) {
        this.hideLoading();
        
        const loader = document.createElement('div');
        loader.id = 'globalLoader';
        loader.innerHTML = `
            <div style="
                position: fixed;
                inset: 0;
                background: rgba(255, 255, 255, 0.9);
                backdrop-filter: blur(4px);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 1003;
            ">
                <div style="
                    background: white;
                    padding: 24px;
                    border-radius: 12px;
                    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
                    text-align: center;
                ">
                    <div style="
                        width: 24px;
                        height: 24px;
                        border: 2px solid #e9ecef;
                        border-top-color: #37352f;
                        border-radius: 50%;
                        animation: spin 1s linear infinite;
                        margin: 0 auto 12px;
                    "></div>
                    <div style="color: #37352f; font-size: 14px;">${message}</div>
                </div>
            </div>
        `;
        
        document.body.appendChild(loader);
    }

    hideLoading() {
        const loader = document.getElementById('globalLoader');
        if (loader) {
            loader.remove();
        }
    }
}

// CSS for animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    
    @keyframes spin {
        to { transform: rotate(360deg); }
    }
    
    .file-icon-large {
        text-align: center;
        padding: 40px;
        color: #9b9b9b;
    }
    
    .file-icon-large p {
        margin-top: 16px;
        font-size: 14px;
        font-family: monospace;
    }
`;
document.head.appendChild(style);

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.mediaManager = new MediaManager();
});

===== FILE SEPARATO =====

<?php
// File: /modules/media/ajax/get_media.php
// Ottieni dettagli media

header('Content-Type: application/json');
require_once __DIR__ . '/../../../core/includes/auth_helper.php';

if (!isAjaxRequest()) {
    http_response_code(400);
    exit(json_encode(['success' => false, 'message' => 'Invalid request']));
}

requireAuth();
$currentUser = getCurrentUser();

try {
    $mediaId = $_GET['id'] ?? null;
    
    if (!$mediaId) {
        throw new Exception('ID media mancante');
    }
    
    $dsn = "mysql:host=127.0.0.1;dbname=u706045794_crm_mismo;charset=utf8mb4";
    $pdo = new PDO($dsn, 'u706045794_mismo_crm_new', 'BLQ$>:;*9+h', [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
    
    // Ottieni media con info di utilizzo
    $stmt = $pdo->prepare("
        SELECT pm.*,
               COUNT(DISTINCT pe.id) as usage_count,
               GROUP_CONCAT(DISTINCT pb.name ORDER BY pb.name SEPARATOR ', ') as board_names
        FROM postit_media pm
        LEFT JOIN postit_element_media pem ON pm.id = pem.media_id
        LEFT JOIN postit_elements pe ON pem.element_id = pe.id AND pe.is_deleted = FALSE
        LEFT JOIN postit_boards pb ON pe.board_id = pb.id AND pb.is_deleted = FALSE
        WHERE pm.id = ? AND pm.uploaded_by = ? AND pm.is_deleted = FALSE
        GROUP BY pm.id
    ");
    $stmt->execute([$mediaId, $currentUser['id']]);
    $media = $stmt->fetch();
    
    if (!$media) {
        throw new Exception('Media non trovato o accesso negato');
    }
    
    echo json_encode([
        'success' => true,
        'media' => $media
    ]);
    
} catch (Exception $e) {
    error_log("Get media error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
?>

===== FILE SEPARATO =====

<?php
// File: /modules/media/ajax/download_media.php
// Download file media

require_once __DIR__ . '/../../../core/includes/auth_helper.php';

requireAuth();
$currentUser = getCurrentUser();

try {
    $mediaId = $_GET['id'] ?? null;
    
    if (!$mediaId) {
        http_response_code(400);
        exit('ID media mancante');
    }
    
    $dsn = "mysql:host=127.0.0.1;dbname=u706045794_crm_mismo;charset=utf8mb4";
    $pdo = new PDO($dsn, 'u706045794_mismo_crm_new', 'BLQ$>:;*9+h', [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
    
    $stmt = $pdo->prepare("
        SELECT * FROM postit_media 
        WHERE id = ? AND uploaded_by = ? AND is_deleted = FALSE
    ");
    $stmt->execute([$mediaId, $currentUser['id']]);
    $media = $stmt->fetch();
    
    if (!$media) {
        http_response_code(404);
        exit('File non trovato');
    }
    
    $filePath = __DIR__ . '/../../../uploads/postit/' . basename($media['file_path']);
    
    if (!file_exists($filePath)) {
        http_response_code(404);
        exit('File fisico non trovato');
    }
    
    // Set headers per download
    header('Content-Type: ' . $media['mime_type']);
    header('Content-Disposition: attachment; filename="' . $media['original_filename'] . '"');
    header('Content-Length: ' . filesize($filePath));
    header('Cache-Control: no-cache, must-revalidate');
    
    // Output file
    readfile($filePath);
    exit;
    
} catch (Exception $e) {
    error_log("Download media error: " . $e->getMessage());
    http_response_code(500);
    exit('Errore interno del server');
}
?>

===== FILE SEPARATO =====

<?php
// File: /modules/media/ajax/delete_media.php
// Eliminazione file media

header('Content-Type: application/json');
require_once __DIR__ . '/../../../core/includes/auth_helper.php';

if (!isAjaxRequest()) {
    http_response_code(400);
    exit(json_encode(['success' => false, 'message' => 'Invalid request']));
}

requireAuth();
$currentUser = getCurrentUser();

try {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($input['media_id'])) {
        throw new Exception('ID media mancante');
    }
    
    $mediaId = (int)$input['media_id'];
    
    $dsn = "mysql:host=127.0.0.1;dbname=u706045794_crm_mismo;charset=utf8mb4";
    $pdo = new PDO($dsn, 'u706045794_mismo_crm_new', 'BLQ$>:;*9+h', [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
    
    // Verifica permessi
    $stmt = $pdo->prepare("
        SELECT * FROM postit_media 
        WHERE id = ? AND uploaded_by = ? AND is_deleted = FALSE
    ");
    $stmt->execute([$mediaId, $currentUser['id']]);
    $media = $stmt->fetch();
    
    if (!$media) {
        throw new Exception('Media non trovato o accesso negato');
    }
    
    $pdo->beginTransaction();
    
    try {
        // Soft delete del media
        $stmt = $pdo->prepare("UPDATE postit_media SET is_deleted = TRUE WHERE id = ?");
        $stmt->execute([$mediaId]);
        
        // Rimuovi collegamenti elemento-media
        $stmt = $pdo->prepare("DELETE FROM postit_element_media WHERE media_id = ?");
        $stmt->execute([$mediaId]);
        
        $pdo->commit();
        
        // Elimina file fisico
        $filePath = __DIR__ . '/../../../uploads/postit/' . basename($media['file_path']);
        if (file_exists($filePath)) {
            unlink($filePath);
        }
        
        echo json_encode([
            'success' => true,
            'message' => 'File eliminato con successo'
        ]);
        
    } catch (Exception $e) {
        $pdo->rollBack();
        throw $e;
    }
    
} catch (Exception $e) {
    error_log("Delete media error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
?>

===== FILE SEPARATO =====

<?php
// File: /modules/media/ajax/cleanup_unused.php
// Pulizia file non utilizzati

header('Content-Type: application/json');
require_once __DIR__ . '/../../../core/includes/auth_helper.php';

if (!isAjaxRequest()) {
    http_response_code(400);
    exit(json_encode(['success' => false, 'message' => 'Invalid request']));
}

requireAuth();
$currentUser = getCurrentUser();

try {
    $dsn = "mysql:host=127.0.0.1;dbname=u706045794_crm_mismo;charset=utf8mb4";
    $pdo = new PDO($dsn, 'u706045794_mismo_crm_new', 'BLQ$>:;*9+h', [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
    
    // Trova media non utilizzati
    $stmt = $pdo->prepare("
        SELECT pm.*
        FROM postit_media pm
        LEFT JOIN postit_element_media pem ON pm.id = pem.media_id
        LEFT JOIN postit_elements pe ON pem.element_id = pe.id AND pe.is_deleted = FALSE
        WHERE pm.uploaded_by = ? 
        AND pm.is_deleted = FALSE
        AND pe.id IS NULL
    ");
    $stmt->execute([$currentUser['id']]);
    $unusedMedia = $stmt->fetchAll();
    
    if (empty($unusedMedia)) {
        echo json_encode([
            'success' => true,
            'message' => 'Nessun file inutilizzato trovato',
            'deleted_count' => 0
        ]);
        exit;
    }
    
    $pdo->beginTransaction();
    
    try {
        $deletedCount = 0;
        
        foreach ($unusedMedia as $media) {
            // Soft delete nel database
            $stmt = $pdo->prepare("UPDATE postit_media SET is_deleted = TRUE WHERE id = ?");
            $stmt->execute([$media['id']]);
            
            // Elimina file fisico
            $filePath = __DIR__ . '/../../../uploads/postit/' . basename($media['file_path']);
            if (file_exists($filePath)) {
                unlink($filePath);
            }
            
            $deletedCount++;
        }
        
        $pdo->commit();
        
        echo json_encode([
            'success' => true,
            'message' => "Eliminati $deletedCount file inutilizzati",
            'deleted_count' => $deletedCount
        ]);
        
    } catch (Exception $e) {
        $pdo->rollBack();
        throw $e;
    }
    
} catch (Exception $e) {
    error_log("Cleanup unused error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
?>