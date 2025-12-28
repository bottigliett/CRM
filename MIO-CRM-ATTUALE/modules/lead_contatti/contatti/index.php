<?php
// File: /modules/lead_contatti/contatti/index.php
// Modulo Anagrafiche Contatti - CRM Studio Mismo - VERSIONE AGGIORNATA

// Includi autenticazione
require_once $_SERVER['DOCUMENT_ROOT'] . '/core/includes/auth_helper.php';

// Verifica autenticazione
requireAuth();
$currentUser = getCurrentUser();

// ⭐ CONTROLLO PERMESSI PER ANAGRAFICA CONTATTI
// Controlla prima il permesso specifico anagrafica_contatti, poi lead_contatti come fallback
if (!hasPermission('anagrafica_contatti', 'read') && !hasPermission('lead_contatti', 'read')) {
    $_SESSION['error_message'] = 'Non hai i permessi per accedere all\'Anagrafica Contatti';
    header('Location: /dashboard.php');
    exit;
}

// Controlla permessi di scrittura/cancellazione per mostrare/nascondere bottoni
$canWrite = hasPermission('anagrafica_contatti', 'write') || hasPermission('lead_contatti', 'write');
$canDelete = hasPermission('anagrafica_contatti', 'delete') || hasPermission('lead_contatti', 'delete');

// Log accesso
logUserAction('access_contacts_module', 'success', 'Accesso al modulo Anagrafiche Contatti');

// Configurazione database
try {
    $dsn = "mysql:host=127.0.0.1;dbname=u706045794_crm_mismo;charset=utf8mb4";
    $pdo = new PDO($dsn, 'u706045794_mismo_crm_new', 'BLQ$>:;*9+h', [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
} catch (PDOException $e) {
    error_log("Database connection failed: " . $e->getMessage());
    $pdo = null;
}

// Statistiche dei contatti (solo prospect e client - NO lead)
$stats = [
    'total' => 0,
    'prospects' => 0,
    'clients' => 0,
    'inactive' => 0,
    'collaborazioni' => 0,
    'contatto_utile' => 0,
    'companies' => 0,
    'persons' => 0
];

if ($pdo) {
    try {
        // Totale contatti (escludendo i lead)
        $stmt = $pdo->query("SELECT COUNT(*) FROM leads_contacts WHERE status != 'lead'");
        $stats['total'] = $stmt->fetchColumn();
        
        // Per status (escludendo i lead)
        $stmt = $pdo->query("
            SELECT status, COUNT(*) as count 
            FROM leads_contacts 
            WHERE status != 'lead'
            GROUP BY status
        ");
        $statusStats = $stmt->fetchAll();
        foreach ($statusStats as $stat) {
            $stats[$stat['status']] = $stat['count'];
        }
        
        // Per tipo (escludendo i lead)
        $stmt = $pdo->query("
            SELECT contact_type, COUNT(*) as count 
            FROM leads_contacts 
            WHERE status != 'lead'
            GROUP BY contact_type
        ");
        $typeStats = $stmt->fetchAll();
        foreach ($typeStats as $stat) {
            if ($stat['contact_type'] === 'company') {
                $stats['companies'] = $stat['count'];
            } else {
                $stats['persons'] = $stat['count'];
            }
        }
        
    } catch (Exception $e) {
        error_log("Error fetching stats: " . $e->getMessage());
    }
}

// Genera token CSRF
$csrfToken = generateCSRFToken();

// Passa i permessi al JavaScript
$jsPermissions = json_encode([
    'canWrite' => $canWrite,
    'canDelete' => $canDelete
]);

// Contenuto della pagina
ob_start();
?>

<script>
// Passa i permessi al JavaScript per mostrare/nascondere bottoni
window.modulePermissions = <?= $jsPermissions ?>;
</script>

<!-- Aggiungi questa notifica se l'utente ha solo permessi di lettura -->
<?php if (!$canWrite): ?>
<div class="permission-notice">
    <span>⚠️ Modalità solo lettura - Se dai log risulta una modifica senza permesso, avrà una conseguenza</span>
</div>
<style>
.permission-notice {
    background: #fef3c7;
    color: #92400e;
    padding: 0.75rem 1rem;
    border-radius: 0.375rem;
    margin-bottom: 1rem;
    text-align: center;
    font-size: 0.875rem;
}
</style>
<?php endif; ?>

<div class="contacts-container">
    <!-- Header con statistiche AGGIORNATE -->
    <div class="stats-grid">
        <div class="stat-card">
            <div class="stat-icon">📋</div>
            <div class="stat-content">
                <div class="stat-value"><?= $stats['total'] ?></div>
                <div class="stat-label">Totale Anagrafiche</div>
            </div>
        </div>
        
        <div class="stat-card">
            <div class="stat-icon">📈</div>
            <div class="stat-content">
                <div class="stat-value"><?= $stats['prospects'] ?></div>
                <div class="stat-label">Prospect</div>
            </div>
        </div>
        
        <div class="stat-card">
            <div class="stat-icon">✅</div>
            <div class="stat-content">
                <div class="stat-value"><?= $stats['clients'] ?></div>
                <div class="stat-label">Clienti Attivi</div>
            </div>
        </div>
        
        <div class="stat-card">
            <div class="stat-icon">🤝</div>
            <div class="stat-content">
                <div class="stat-value"><?= $stats['collaborazioni'] ?></div>
                <div class="stat-label">Collaborazioni</div>
            </div>
        </div>
        
        <div class="stat-card">
            <div class="stat-icon">📞</div>
            <div class="stat-content">
                <div class="stat-value"><?= $stats['contatto_utile'] ?></div>
                <div class="stat-label">Contatti Utili</div>
            </div>
        </div>
        
        <div class="stat-card">
            <div class="stat-icon">👥</div>
            <div class="stat-content">
                <div class="stat-value"><?= $stats['persons'] ?></div>
                <div class="stat-label">Persone</div>
            </div>
        </div>
    </div>

    <!-- Filtri e controlli -->
    <div class="content-card">
        <div class="card-header">
            <h2>Anagrafiche Contatti</h2>
            <div class="contacts-header-actions">
                <button class="btn-primary" id="addContactBtn">
                    + Nuovo Contatto
                </button>
                <button class="btn-secondary" id="exportContactsBtn">
                    📊 Esporta
                </button>
            </div>
        </div>
        
        <!-- Barra filtri AGGIORNATA -->
        <div class="contacts-filters">
            <div class="filter-section">
                <div class="filter-group">
                    <label>Tipo:</label>
                    <div class="filter-buttons">
                        <button class="filter-btn active" data-filter="all">Tutti</button>
                        <button class="filter-btn" data-filter="person">👤 Persone</button>
                        <button class="filter-btn" data-filter="company">🏢 Aziende</button>
                    </div>
                </div>
                
                <div class="filter-group">
                    <label>Status:</label>
                    <div class="filter-buttons">
                        <button class="status-filter-btn active" data-status="all">Tutti</button>
                        <button class="status-filter-btn" data-status="prospect">Prospect</button>
                        <button class="status-filter-btn" data-status="client">Clienti</button>
                        <button class="status-filter-btn" data-status="collaborazioni">🤝 Collaborazioni</button>
                        <button class="status-filter-btn" data-status="contatto_utile">📞 Contatti Utili</button>
                        <button class="status-filter-btn" data-status="inactive">Inattivi</button>
                    </div>
                </div>
            </div>
            
            <div class="search-section">
                <input type="text" id="searchInput" placeholder="🔍 Cerca per nome, email, telefono, P.IVA..." class="search-input">
                <div class="search-filters">
                    <label class="checkbox-label">
                        <input type="checkbox" id="onlyActiveFilter" checked>
                        <span>Solo contatti attivi</span>
                    </label>
                    <label class="checkbox-label">
                        <input type="checkbox" id="hasEmailFilter">
                        <span>Solo con email</span>
                    </label>
                </div>
            </div>
        </div>
        
        <!-- Lista contatti -->
        <div class="contacts-content">
            <div id="contactsLoader" class="contacts-loader">
                <div class="loading-spinner"></div>
                <p>Caricamento anagrafiche...</p>
            </div>
            
            <div id="contactsList" class="contacts-list" style="display: none;">
                <!-- I contatti verranno caricati via JavaScript -->
            </div>
            
            <div id="noContacts" class="empty-state" style="display: none;">
                <div class="empty-state-icon">📋</div>
                <h3>Nessuna anagrafica trovata</h3>
                <p>Le anagrafiche sono contatti già acquisiti o in trattativa avanzata.</p>
                <button class="btn-primary" onclick="openAddContactModal()">
                    + Aggiungi Prima Anagrafica
                </button>
            </div>
        </div>
    </div>
</div>

<!-- Modal Aggiungi/Modifica Contatto AGGIORNATO -->
<div class="modal-overlay" id="contactModal">
    <div class="modal-content">
        <div class="modal-header">
            <div class="modal-title-section">
                <h2 class="modal-title" id="modalTitle">Nuovo Contatto</h2>
            </div>
            <button class="modal-close" id="closeModal">&times;</button>
        </div>
        
        <form id="contactForm" class="modal-body">
            <input type="hidden" id="contactId" name="contact_id">
            <input type="hidden" name="csrf_token" value="<?= $csrfToken ?>">
            
            <!-- Tipo di contatto -->
            <div class="form-section">
                <label class="form-label">Tipo di Contatto</label>
                <div class="contact-type-toggle">
                    <input type="radio" id="typePerson" name="contact_type" value="person" checked>
                    <label for="typePerson" class="type-option">👤 Persona</label>
                    
                    <input type="radio" id="typeCompany" name="contact_type" value="company">
                    <label for="typeCompany" class="type-option">🏢 Azienda</label>
                </div>
            </div>
            
            <!-- Nome (campo largo) -->
            <div class="form-row">
                <div class="form-group required">
                    <label for="name" class="form-label">Nome</label>
                    <input type="text" id="name" name="name" class="form-input" required placeholder="Nome contatto o azienda">
                </div>
            </div>
            
            <!-- Email e Telefono (2 colonne) -->
            <div class="form-row two-cols">
                <div class="form-group">
                    <label for="email" class="form-label">Email</label>
                    <input type="email" id="email" name="email" class="form-input" placeholder="email@esempio.it">
                </div>
                
                <div class="form-group">
                    <label for="phone" class="form-label">Telefono</label>
                    <input type="tel" id="phone" name="phone" class="form-input" placeholder="+39 123 456 7890">
                </div>
            </div>
            
            <!-- NUOVI CAMPI: Partita IVA e Codice Fiscale (2 colonne) -->
            <div class="form-row two-cols">
                <div class="form-group">
                    <label for="partitaIva" class="form-label">Partita IVA</label>
                    <input type="text" id="partitaIva" name="partita_iva" class="form-input" placeholder="IT12345678901" maxlength="20">
                </div>
                
                <div class="form-group">
                    <label for="codiceFiscale" class="form-label">Codice Fiscale</label>
                    <input type="text" id="codiceFiscale" name="codice_fiscale" class="form-input" placeholder="RSSMRA80A01H501Z" maxlength="20" style="text-transform: uppercase;">
                </div>
            </div>
            
            <!-- Indirizzo (campo largo ma più piccolo) -->
            <div class="form-row">
                <div class="form-group">
                    <label for="address" class="form-label">Indirizzo</label>
                    <textarea id="address" name="address" class="form-textarea" rows="2" placeholder="Via, Città, CAP"></textarea>
                </div>
            </div>
            
            <!-- Status e Priorità (2 colonne) - CON NUOVI STATUS -->
            <div class="form-row two-cols">
                <div class="form-group">
                    <label for="status" class="form-label">Status</label>
                    <select id="status" name="status" class="form-select">
                        <option value="prospect">Prospect</option>
                        <option value="client" selected>Cliente</option>
                        <option value="collaborazioni">🤝 Collaborazioni</option>
                        <option value="contatto_utile">📞 Contatto Utile</option>
                        <option value="inactive">Inattivo</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label for="priority" class="form-label">Priorità</label>
                    <select id="priority" name="priority" class="form-select">
                        <option value="low">Bassa</option>
                        <option value="medium" selected>Media</option>
                        <option value="high">Alta</option>
                    </select>
                </div>
            </div>
            
            <!-- Date follow-up -->
            <div class="form-row two-cols">
                <div class="form-group">
                    <label for="lastContactDate" class="form-label">Ultimo Contatto</label>
                    <input type="date" id="lastContactDate" name="last_contact_date" class="form-input">
                </div>
                
                <div class="form-group">
                    <label for="nextFollowupDate" class="form-label">Prossimo Follow-up</label>
                    <input type="date" id="nextFollowupDate" name="next_followup_date" class="form-input">
                </div>
            </div>
            
            <!-- Tags -->
            <div class="form-section">
                <label class="form-label">Tags</label>
                <div class="tags-input-container">
                    <input type="text" id="tagsInput" placeholder="Aggiungi tag... (es: #cliente-vip, #web-design)">
                    <div id="tagsList" class="tags-list"></div>
                </div>
                <small style="color: var(--text-secondary); font-size: 12px; margin-top: 4px; display: block;">
                    Premi Invio o virgola per aggiungere un tag
                </small>
            </div>
            
            <!-- Profili Social -->
            <div class="form-section">
                <label class="form-label">Profili Social</label>
                <div id="socialsContainer" class="socials-container">
                    <div class="social-input-group">
                        <select class="social-platform">
                            <option value="">Seleziona piattaforma</option>
                            <option value="linkedin">LinkedIn</option>
                            <option value="instagram">Instagram</option>
                            <option value="facebook">Facebook</option>
                            <option value="twitter">Twitter</option>
                            <option value="tiktok">TikTok</option>
                            <option value="youtube">YouTube</option>
                            <option value="website">Sito Web</option>
                        </select>
                        <input type="url" class="social-url" placeholder="URL del profilo">
                        <button type="button" class="btn-remove-social" onclick="removeSocial(this)">×</button>
                    </div>
                </div>
                <button type="button" id="addSocialBtn" class="btn-secondary btn-small">+ Aggiungi Profilo</button>
            </div>
            
            <!-- Descrizione (campo largo) -->
            <div class="form-row">
                <div class="form-group">
                    <label for="description" class="form-label">Descrizione/Note</label>
                    <textarea id="description" name="description" class="form-textarea large" rows="3" placeholder="Note aggiuntive sul contatto..."></textarea>
                </div>
            </div>
        </form>
        
        <div class="modal-footer">
            <button type="button" class="btn-secondary" id="cancelBtn">Annulla</button>
            <button type="submit" form="contactForm" class="btn-primary" id="saveBtn">Salva Contatto</button>
        </div>
    </div>
</div>

<!-- Modal Dettagli Contatto -->
<div class="modal-overlay" id="contactDetailsModal">
    <div class="modal-content">
        <div class="modal-header">
            <div class="modal-title-section">
                <div class="contact-status-indicator" id="detailsStatusIndicator"></div>
                <h2 class="modal-title" id="detailsModalTitle">Dettagli Contatto</h2>
            </div>
            <button class="modal-close" onclick="closeDetailsModal()">&times;</button>
        </div>
        
        <div class="modal-body" id="contactDetailsBody">
            <!-- I dettagli verranno caricati dinamicamente -->
        </div>
        
        <div class="modal-footer">
            <button type="button" class="btn-secondary" onclick="closeDetailsModal()">Chiudi</button>
            <button type="button" class="btn-primary" id="editContactBtn">Modifica</button>
        </div>
    </div>
</div>

<?php
$pageContent = ob_get_clean();

// CSS e JS addizionali (riutilizzo quelli esistenti)
$additionalCSS = ['/assets/css/leads.css?v=' . time()];
$additionalJS = [
    '/assets/js/toast.js',                                                    // Toast notifications
    '/assets/js/notifications.js',                                          // Sistema notifiche (CENTRO NOTIFICHE)
    '/modules/lead_contatti/contatti/assets/js/contatti.js?v=' . time()           // Lead Board JavaScript
];

// Render della pagina
renderPage('Anagrafiche Contatti', $pageContent, $additionalCSS, $additionalJS);
?>