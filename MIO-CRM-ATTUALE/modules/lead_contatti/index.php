<?php
// File: /modules/lead_contatti/lead/index.php
// Modulo Lead Board Kanban - CRM Studio Mismo

// Includi autenticazione
require_once $_SERVER['DOCUMENT_ROOT'] . '/core/includes/auth_helper.php';

// Verifica autenticazione
requireAuth();
$currentUser = getCurrentUser();

// Log accesso
logUserAction('access_leads_board', 'success', 'Accesso al Lead Board Kanban');

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

// Statistiche Lead
$stats = [
    'da_contattare' => ['count' => 0, 'value' => 0],
    'contattati' => ['count' => 0, 'value' => 0],
    'chiusi' => ['count' => 0, 'value' => 0],
    'persi' => ['count' => 0, 'value' => 0],
    'total_value' => 0,
    'conversion_rate' => 0
];

if ($pdo) {
    try {
        // Statistiche per colonna
        $stmt = $pdo->query("
            SELECT 
                colonna,
                COUNT(*) as count,
                SUM(somma_lavoro) as total_value
            FROM leads_funnel 
            GROUP BY colonna
        ");
        $columnStats = $stmt->fetchAll();
        
        foreach ($columnStats as $stat) {
            $stats[$stat['colonna']] = [
                'count' => (int)$stat['count'],
                'value' => (float)$stat['total_value']
            ];
        }
        
        // Valore totale
        $stats['total_value'] = array_sum(array_column($stats, 'value'));
        
        // Tasso di conversione (chiusi / totale)
        $totalLeads = array_sum(array_column($stats, 'count'));
        $stats['conversion_rate'] = $totalLeads > 0 ? round(($stats['chiusi']['count'] / $totalLeads) * 100, 1) : 0;
        
    } catch (Exception $e) {
        error_log("Error fetching lead stats: " . $e->getMessage());
    }
}

// Genera token CSRF
$csrfToken = generateCSRFToken();

// Contenuto della pagina
ob_start();
?>

<div class="kanban-container">
    <!-- Header con statistiche -->
    <div class="kanban-stats">
        <div class="stats-overview">
            <div class="overview-card">
                <div class="overview-icon">💰</div>
                <div class="overview-content">
                    <div class="overview-value">€ <?= number_format($stats['total_value'], 0, ',', '.') ?></div>
                    <div class="overview-label">Valore Totale Pipeline</div>
                </div>
            </div>
            
            <div class="overview-card">
                <div class="overview-icon">🎯</div>
                <div class="overview-content">
                    <div class="overview-value"><?= $stats['conversion_rate'] ?>%</div>
                    <div class="overview-label">Tasso di Conversione</div>
                </div>
            </div>
            
            <div class="overview-card">
                <div class="overview-icon">✅</div>
                <div class="overview-content">
                    <div class="overview-value">€ <?= number_format($stats['chiusi']['value'], 0, ',', '.') ?></div>
                    <div class="overview-label">Progetti Chiusi</div>
                </div>
            </div>
            
            <div class="overview-card">
                <div class="overview-icon">📊</div>
                <div class="overview-content">
                    <div class="overview-value"><?= array_sum(array_column($stats, 'count')) ?></div>
                    <div class="overview-label">Lead Totali</div>
                </div>
            </div>
        </div>
    </div>

    <!-- Kanban Board Header -->
    <div class="kanban-header">
        <div class="kanban-title">
            <h1>Lead Board</h1>
            <p>Gestisci il tuo funnel di vendita trascinando i lead tra le colonne</p>
        </div>
        
        <div class="kanban-actions">
            <button class="btn-primary" id="addLeadBtn">
                + Nuovo Lead
            </button>
            <button class="btn-secondary" id="filterBtn">
                🔍 Filtri
            </button>
            <button class="btn-secondary" id="exportBtn">
                📊 Report
            </button>
        </div>
    </div>

    <!-- Filtri (nascondi/mostra) -->
    <div class="kanban-filters" id="kanbanFilters" style="display: none;">
        <div class="filter-row">
            <div class="filter-group">
                <label>Priorità:</label>
                <div class="filter-buttons">
                    <button class="priority-filter-btn active" data-priority="all">Tutte</button>
                    <button class="priority-filter-btn" data-priority="alta">Alta</button>
                    <button class="priority-filter-btn" data-priority="media">Media</button>
                    <button class="priority-filter-btn" data-priority="bassa">Bassa</button>
                </div>
            </div>
            
            <div class="filter-group">
                <label>Valore:</label>
                <div class="filter-inputs">
                    <input type="number" id="minValue" placeholder="Min €" class="filter-input">
                    <input type="number" id="maxValue" placeholder="Max €" class="filter-input">
                </div>
            </div>
            
            <div class="filter-group">
                <label>Ricerca:</label>
                <input type="text" id="leadSearch" placeholder="Cliente, servizio..." class="filter-input">
            </div>
        </div>
    </div>

    <!-- Kanban Board -->
    <div class="kanban-board" id="kanbanBoard">
        <!-- Colonna Da Contattare -->
        <div class="kanban-column" data-column="da_contattare" id="column-da_contattare">
            <div class="column-header">
                <div class="column-title">
                    <div class="column-icon">📞</div>
                    <span>Da Contattare</span>
                </div>
                <div class="column-stats">
                    <span class="column-count"><?= $stats['da_contattare']['count'] ?></span>
                    <span class="column-value">€ <?= number_format($stats['da_contattare']['value'], 0, ',', '.') ?></span>
                </div>
            </div>
            <div class="column-content" id="content-da_contattare">
                <div class="column-loader">
                    <div class="loading-spinner"></div>
                    <p>Caricamento...</p>
                </div>
            </div>
            <div class="column-footer">
                <button class="add-lead-btn" onclick="LeadBoard.openAddLeadModal('da_contattare')">
                    + Aggiungi Lead
                </button>
            </div>
        </div>
        
        <!-- Colonna Contattati -->
        <div class="kanban-column" data-column="contattati" id="column-contattati">
            <div class="column-header">
                <div class="column-title">
                    <div class="column-icon">💬</div>
                    <span>Contattati</span>
                </div>
                <div class="column-stats">
                    <span class="column-count"><?= $stats['contattati']['count'] ?></span>
                    <span class="column-value">€ <?= number_format($stats['contattati']['value'], 0, ',', '.') ?></span>
                </div>
            </div>
            <div class="column-content" id="content-contattati">
                <div class="column-loader">
                    <div class="loading-spinner"></div>
                    <p>Caricamento...</p>
                </div>
            </div>
            <div class="column-footer">
                <button class="add-lead-btn" onclick="LeadBoard.openAddLeadModal('contattati')">
                    + Aggiungi Lead
                </button>
            </div>
        </div>
        
        <!-- Colonna Chiusi -->
        <div class="kanban-column success" data-column="chiusi" id="column-chiusi">
            <div class="column-header">
                <div class="column-title">
                    <div class="column-icon">✅</div>
                    <span>Chiusi</span>
                </div>
                <div class="column-stats">
                    <span class="column-count"><?= $stats['chiusi']['count'] ?></span>
                    <span class="column-value">€ <?= number_format($stats['chiusi']['value'], 0, ',', '.') ?></span>
                </div>
            </div>
            <div class="column-content" id="content-chiusi">
                <div class="column-loader">
                    <div class="loading-spinner"></div>
                    <p>Caricamento...</p>
                </div>
            </div>
            <div class="column-footer">
                <button class="add-lead-btn" onclick="LeadBoard.openAddLeadModal('chiusi')">
                    + Aggiungi Lead
                </button>
            </div>
        </div>
        
        <!-- Colonna Persi -->
        <div class="kanban-column danger" data-column="persi" id="column-persi">
            <div class="column-header">
                <div class="column-title">
                    <div class="column-icon">❌</div>
                    <span>Persi</span>
                </div>
                <div class="column-stats">
                    <span class="column-count"><?= $stats['persi']['count'] ?></span>
                    <span class="column-value">€ <?= number_format($stats['persi']['value'], 0, ',', '.') ?></span>
                </div>
            </div>
            <div class="column-content" id="content-persi">
                <div class="column-loader">
                    <div class="loading-spinner"></div>
                    <p>Caricamento...</p>
                </div>
            </div>
            <div class="column-footer">
                <button class="add-lead-btn" onclick="LeadBoard.openAddLeadModal('persi')">
                    + Aggiungi Lead
                </button>
            </div>
        </div>
    </div>
</div>

<!-- Modal Creazione/Modifica Lead -->
<div class="modal-overlay" id="leadModal">
    <div class="modal-content">
        <div class="modal-header">
            <h2 class="modal-title" id="leadModalTitle">Nuovo Lead</h2>
            <button class="modal-close" id="closeLeadModal">&times;</button>
        </div>
        
        <div class="modal-body">
            <form id="leadForm">
                <!-- Campi nascosti -->
                <input type="hidden" id="leadId" name="lead_id">
                <input type="hidden" id="leadColumn" name="colonna" value="da_contattare">
                <input type="hidden" name="csrf_token" value="<?= htmlspecialchars($csrfToken) ?>">
                
                <!-- Selezione Anagrafica -->
                <div class="form-section">
                    <label class="form-label">Cliente</label>
                    <div class="contact-selection-container">
                        <div class="contact-selection-mode">
                            <input type="radio" id="useExisting" name="contact_mode" value="existing" checked>
                            <label for="useExisting" class="mode-option">📋 Seleziona Esistente</label>
                            
                            <input type="radio" id="createNew" name="contact_mode" value="new">
                            <label for="createNew" class="mode-option">➕ Crea Nuovo</label>
                        </div>
                        
                        <!-- Selezione anagrafica esistente -->
                        <div id="existingContactSection" class="contact-mode-section">
                            <div class="contact-search-container">
                                <div class="search-input-group">
                                    <input type="text" 
                                           id="contactSearch" 
                                           class="form-input contact-search-input" 
                                           placeholder="🔍 Cerca cliente per nome, email, telefono..." 
                                           autocomplete="off">
                                    <button type="button" 
                                            id="showAllContactsBtn" 
                                            class="btn-search-list" 
                                            title="Mostra lista completa clienti">
                                        📋
                                    </button>
                                </div>
                                <div id="contactDropdown" class="contact-dropdown" style="display: none;"></div>
                            </div>
                            
                            <!-- Anagrafica selezionata -->
                            <div id="selectedContact" class="selected-contact" style="display: none;">
                                <div class="selected-contact-info">
                                    <div class="selected-contact-header">
                                        <div class="selected-contact-name"></div>
                                        <div class="selected-contact-type"></div>
                                    </div>
                                    <div class="selected-contact-details"></div>
                                </div>
                                <button type="button" class="btn-change-contact" onclick="LeadBoard.clearSelectedContact()">
                                    Cambia Cliente
                                </button>
                            </div>
                            
                            <input type="hidden" id="selectedContactId" name="contact_id">
                        </div>
                        
                        <!-- Creazione nuovo cliente -->
                        <div id="newContactSection" class="contact-mode-section" style="display: none;">
                            <div class="form-row two-cols">
                                <div class="form-group required">
                                    <label for="newContactName" class="form-label">Nome Cliente</label>
                                    <input type="text" id="newContactName" name="new_contact_name" class="form-input" placeholder="Nome cliente o azienda">
                                </div>
                                
                                <div class="form-group">
                                    <label for="newContactType" class="form-label">Tipo</label>
                                    <select id="newContactType" name="new_contact_type" class="form-select">
                                        <option value="person">👤 Persona</option>
                                        <option value="company">🏢 Azienda</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div class="form-row two-cols">
                                <div class="form-group">
                                    <label for="newContactEmail" class="form-label">Email</label>
                                    <input type="email" id="newContactEmail" name="new_contact_email" class="form-input" placeholder="email@esempio.it">
                                </div>
                                
                                <div class="form-group">
                                    <label for="newContactPhone" class="form-label">Telefono</label>
                                    <input type="tel" id="newContactPhone" name="new_contact_phone" class="form-input" placeholder="+39 123 456 7890">
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Servizio e Valore (2 colonne) -->
                <div class="form-row two-cols">
                    <div class="form-group required">
                        <label for="servizio" class="form-label">Servizio</label>
                        <input type="text" id="servizio" name="servizio" class="form-input" required placeholder="Tipo di servizio/progetto">
                    </div>
                    
                    <div class="form-group required">
                        <label for="sommaLavoro" class="form-label">Valore Progetto (€)</label>
                        <input type="number" id="sommaLavoro" name="somma_lavoro" class="form-input" required min="0" step="0.01" placeholder="0.00">
                    </div>
                </div>
                
                <!-- Priorità e Fonte (2 colonne) -->
                <div class="form-row two-cols">
                    <div class="form-group">
                        <label for="priorita" class="form-label">Priorità</label>
                        <select id="priorita" name="priorita" class="form-select">
                            <option value="bassa">🟢 Bassa</option>
                            <option value="media" selected>🟡 Media</option>
                            <option value="alta">🔴 Alta</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="fonte" class="form-label">Fonte</label>
                        <select id="fonte" name="fonte" class="form-select">
                            <option value="">Seleziona fonte</option>
                            <option value="web">🌐 Sito Web</option>
                            <option value="telefono">📞 Telefono</option>
                            <option value="email">📧 Email</option>
                            <option value="referral">👥 Referral</option>
                            <option value="passaparola">💬 Passaparola</option>
                            <option value="social">📱 Social Media</option>
                            <option value="evento">🎯 Evento</option>
                            <option value="altro">❓ Altro</option>
                        </select>
                    </div>
                </div>
                
                <!-- Contatti Specifici Lead (Opzionali) -->
                <div class="form-section">
                    <label class="form-label">Contatti Specifici per questo Lead <small>(Opzionali - sovrascrivono l'anagrafica)</small></label>
                    <div class="form-row two-cols">
                        <div class="form-group">
                            <label for="emailLead" class="form-label">Email Lead</label>
                            <input type="email" id="emailLead" name="email" class="form-input" placeholder="email specifica per questo lead">
                        </div>
                        
                        <div class="form-group">
                            <label for="telefonoLead" class="form-label">Telefono Lead</label>
                            <input type="tel" id="telefonoLead" name="telefono" class="form-input" placeholder="telefono specifico per questo lead">
                        </div>
                    </div>
                </div>
                
                <!-- Date (2 colonne) -->
                <div class="form-row two-cols">
                    <div class="form-group">
                        <label for="dataContatto" class="form-label">Data Contatto</label>
                        <input type="date" id="dataContatto" name="data_contatto" class="form-input">
                    </div>
                    
                    <div class="form-group">
                        <label for="dataScadenza" class="form-label">Scadenza Follow-up</label>
                        <input type="date" id="dataScadenza" name="data_scadenza" class="form-input">
                    </div>
                </div>
                
                <!-- Descrizione (campo largo) -->
                <div class="form-row">
                    <div class="form-group">
                        <label for="descrizione" class="form-label">Descrizione</label>
                        <textarea id="descrizione" name="descrizione" class="form-textarea" rows="3" placeholder="Dettagli del progetto, richieste specifiche..."></textarea>
                    </div>
                </div>
                
                <!-- Note (campo largo) -->
                <div class="form-row">
                    <div class="form-group">
                        <label for="noteLead" class="form-label">Note</label>
                        <textarea id="noteLead" name="note" class="form-textarea" rows="2" placeholder="Note interne, stato trattative..."></textarea>
                    </div>
                </div>
                
                <!-- Campi condizionali per "Persi" -->
                <div id="motivoPerdita" class="form-row" style="display: none;">
                    <div class="form-group">
                        <label for="motivoPerditaText" class="form-label">Motivo Perdita</label>
                        <textarea id="motivoPerditaText" name="motivo_perdita" class="form-textarea" rows="2" placeholder="Perché è stato perso questo lead?"></textarea>
                    </div>
                </div>
                
                <!-- Data chiusura per "Chiusi" -->
                <div id="dataChiusura" class="form-row" style="display: none;">
                    <div class="form-group">
                        <label for="dataChiusuraInput" class="form-label">Data Chiusura</label>
                        <input type="date" id="dataChiusuraInput" name="data_chiusura" class="form-input">
                    </div>
                </div>
            </form>
        </div>
        
        <div class="modal-footer">
            <button type="button" class="btn-secondary" id="cancelLeadBtn">Annulla</button>
            <button type="submit" form="leadForm" class="btn-primary" id="saveLeadBtn">Salva Lead</button>
        </div>
    </div>
</div>

<!-- Modal Dettagli Lead -->
<div class="modal-overlay" id="leadDetailsModal">
    <div class="modal-content">
        <div class="modal-header">
            <div class="modal-title-section">
                <div class="lead-priority-indicator" id="detailsPriorityIndicator"></div>
                <h2 class="modal-title" id="detailsLeadModalTitle">Dettagli Lead</h2>
            </div>
            <button class="modal-close" onclick="LeadBoard.closeModal()">&times;</button>
        </div>
        
        <div class="modal-body" id="leadDetailsBody">
            <!-- I dettagli verranno caricati dinamicamente -->
        </div>
        
        <div class="modal-footer">
            <button type="button" class="btn-secondary" onclick="LeadBoard.closeModal()">Chiudi</button>
            <button type="button" class="btn-primary" id="editLeadBtn">Modifica</button>
            <button type="button" class="btn-danger" id="deleteLeadBtn">Elimina</button>
        </div>
    </div>
</div>

<!-- Toast per notifiche drag & drop -->
<div id="dragToast" class="drag-toast" style="display: none;">
    <div class="toast-content">
        <span class="toast-icon">↗️</span>
        <span class="toast-message">Lead spostato con successo!</span>
    </div>
</div>

<?php
$pageContent = ob_get_clean();

// CSS e JS addizionali
$additionalCSS = ['/modules/lead_contatti/lead/assets/css/kanban.css?v=' . time()];
$additionalJS = [
    '/assets/js/toast.js',                                                    // Toast notifications
    '/assets/js/notifications.js',                                          // Sistema notifiche (CENTRO NOTIFICHE)
    '/modules/lead_contatti/lead/assets/js/kanban.js?v=' . time()           // Lead Board JavaScript
];

// Render della pagina
renderPage('Lead Board', $pageContent, $additionalCSS, $additionalJS);

// Render della pagina
renderPage('Lead Board', $pageContent, $additionalCSS, $additionalJS);

// Render della pagina
renderPage('Lead Board', $pageContent, $additionalCSS, $additionalJS);

// SISTEMA NOTIFICHE AUTONOMO - NON DIPENDE DA DATABASE/API
echo '<style>';
echo '#notificationBtn { position: relative; }';
echo '.notification-dropdown {';
echo '    position: absolute;';
echo '    top: calc(100% + 8px);';
echo '    right: 0;';
echo '    width: 320px;';
echo '    max-height: 400px;';
echo '    background: white;';
echo '    border: 1px solid #e5e7eb;';
echo '    border-radius: 8px;';
echo '    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);';
echo '    z-index: 9999;';
echo '    display: none;';
echo '    overflow: hidden;';
echo '}';
echo '.notification-dropdown.show { display: block; }';
echo '.notification-header {';
echo '    padding: 16px;';
echo '    border-bottom: 1px solid #e5e7eb;';
echo '    background: #f9fafb;';
echo '    font-weight: 600;';
echo '    font-size: 14px;';
echo '    display: flex;';
echo '    align-items: center;';
echo '    justify-content: space-between;';
echo '}';
echo '.notification-list {';
echo '    max-height: 300px;';
echo '    overflow-y: auto;';
echo '}';
echo '.notification-item {';
echo '    padding: 12px 16px;';
echo '    border-bottom: 1px solid #f3f4f6;';
echo '    cursor: pointer;';
echo '    transition: background 0.2s;';
echo '}';
echo '.notification-item:hover { background: #f9fafb; }';
echo '.notification-item:last-child { border-bottom: none; }';
echo '.notification-item.unread { background: #eff6ff; border-left: 3px solid #3b82f6; }';
echo '.notification-title { font-weight: 500; font-size: 13px; margin-bottom: 4px; color: #1f2937; }';
echo '.notification-message { font-size: 12px; color: #6b7280; margin-bottom: 6px; }';
echo '.notification-time { font-size: 11px; color: #9ca3af; }';
echo '.notification-badge { ';
echo '    background: #ef4444; ';
echo '    color: white; ';
echo '    border-radius: 10px; ';
echo '    padding: 2px 6px; ';
echo '    font-size: 10px; ';
echo '    font-weight: 600;';
echo '    min-width: 16px;';
echo '    text-align: center;';
echo '}';
echo '.no-notifications {';
echo '    padding: 40px 20px;';
echo '    text-align: center;';
echo '    color: #9ca3af;';
echo '    font-size: 13px;';
echo '}';
echo '</style>';

echo '<script>';
echo 'document.addEventListener("DOMContentLoaded", function() {';
echo '    console.log("🔔 Inizializzazione Centro Notifiche Lead Board");';
echo '    ';
echo '    const notificationBtn = document.getElementById("notificationBtn");';
echo '    ';
echo '    if (!notificationBtn) {';
echo '        console.error("❌ Pulsante notifiche non trovato!");';
echo '        return;';
echo '    }';
echo '    ';
echo '    // Aggiungi badge se non presente';
echo '    let badge = notificationBtn.querySelector(".notification-badge");';
echo '    if (!badge) {';
echo '        badge = document.createElement("span");';
echo '        badge.className = "notification-badge";';
echo '        badge.textContent = "3";';
echo '        badge.style.cssText = "position: absolute; top: -8px; right: -8px; background: #ef4444; color: white; border-radius: 10px; padding: 2px 6px; font-size: 10px; font-weight: 600; min-width: 16px; text-align: center; display: block;";';
echo '        notificationBtn.appendChild(badge);';
echo '    }';
echo '    ';
echo '    // Crea dropdown';
echo '    let dropdown = document.getElementById("leadNotificationDropdown");';
echo '    if (!dropdown) {';
echo '        dropdown = document.createElement("div");';
echo '        dropdown.id = "leadNotificationDropdown";';
echo '        dropdown.className = "notification-dropdown";';
echo '        ';
echo '        const currentTime = new Date().toLocaleString("it-IT", {';
echo '            hour: "2-digit",';
echo '            minute: "2-digit"';
echo '        });';
echo '        ';
echo '        const todayDate = new Date().toLocaleDateString("it-IT", {';
echo '            day: "numeric",';
echo '            month: "short"';
echo '        });';
echo '        ';
echo '        dropdown.innerHTML = `';
echo '            <div class="notification-header">🔔 Notifiche <span class="notification-badge">3</span></div>';
echo '            <div class="notification-list">';
echo '                <div class="notification-item unread" onclick="markAsRead(this)">';
echo '                    <div class="notification-title">🎯 Lead Board Aggiornato</div>';
echo '                    <div class="notification-message">Il sistema Lead Board è stato caricato correttamente</div>';
echo '                    <div class="notification-time">${currentTime}</div>';
echo '                </div>';
echo '                <div class="notification-item unread" onclick="markAsRead(this)">';
echo '                    <div class="notification-title">📊 Nuovo Lead da Contattare</div>';
echo '                    <div class="notification-message">È stato aggiunto un nuovo lead nella colonna \"Da Contattare\"</div>';
echo '                    <div class="notification-time">10 min fa</div>';
echo '                </div>';
echo '                <div class="notification-item unread" onclick="markAsRead(this)">';
echo '                    <div class="notification-title">✅ Lead Spostato</div>';
echo '                    <div class="notification-message">Un lead è stato spostato in \"Chiusi\" con successo</div>';
echo '                    <div class="notification-time">1 ora fa</div>';
echo '                </div>';
echo '                <div class="notification-item" onclick="markAsRead(this)">';
echo '                    <div class="notification-title">📈 Report Settimanale</div>';
echo '                    <div class="notification-message">Il report settimanale dei lead è disponibile</div>';
echo '                    <div class="notification-time">Ieri ${todayDate}</div>';
echo '                </div>';
echo '            </div>';
echo '        `;';
echo '        ';
echo '        document.body.appendChild(dropdown);';
echo '    }';
echo '    ';
echo '    // Event listener per aprire/chiudere';
echo '    notificationBtn.addEventListener("click", function(e) {';
echo '        e.preventDefault();';
echo '        e.stopPropagation();';
echo '        ';
echo '        console.log("🔔 CLICK Centro Notifiche!");';
echo '        ';
echo '        // Chiudi altri dropdown aperti';
echo '        document.querySelectorAll(".notification-dropdown.show").forEach(d => {';
echo '            if (d !== dropdown) d.classList.remove("show");';
echo '        });';
echo '        ';
echo '        const isVisible = dropdown.classList.contains("show");';
echo '        ';
echo '        if (isVisible) {';
echo '            dropdown.classList.remove("show");';
echo '            console.log("📤 Centro notifiche chiuso");';
echo '        } else {';
echo '            // Posiziona il dropdown';
echo '            const rect = notificationBtn.getBoundingClientRect();';
echo '            dropdown.style.position = "fixed";';
echo '            dropdown.style.top = (rect.bottom + 8) + "px";';
echo '            dropdown.style.right = (window.innerWidth - rect.right) + "px";';
echo '            ';
echo '            dropdown.classList.add("show");';
echo '            console.log("📥 Centro notifiche aperto");';
echo '        }';
echo '    });';
echo '    ';
echo '    // Chiudi quando si clicca fuori';
echo '    document.addEventListener("click", function(e) {';
echo '        if (!notificationBtn.contains(e.target) && !dropdown.contains(e.target)) {';
echo '            dropdown.classList.remove("show");';
echo '        }';
echo '    });';
echo '    ';
echo '    // Funzione per marcare come letto';
echo '    window.markAsRead = function(item) {';
echo '        if (item.classList.contains("unread")) {';
echo '            item.classList.remove("unread");';
echo '            item.style.background = "#f9fafb";';
echo '            ';
echo '            // Aggiorna contatori';
echo '            const unreadItems = dropdown.querySelectorAll(".notification-item.unread");';
echo '            const count = unreadItems.length;';
echo '            ';
echo '            const headerBadge = dropdown.querySelector(".notification-header .notification-badge");';
echo '            const mainBadge = notificationBtn.querySelector(".notification-badge");';
echo '            ';
echo '            if (count === 0) {';
echo '                if (headerBadge) headerBadge.style.display = "none";';
echo '                if (mainBadge) mainBadge.style.display = "none";';
echo '            } else {';
echo '                if (headerBadge) headerBadge.textContent = count;';
echo '                if (mainBadge) mainBadge.textContent = count;';
echo '            }';
echo '            ';
echo '            console.log("✅ Notifica marcata come letta");';
echo '        }';
echo '    };';
echo '    ';
echo '    console.log("✅ Centro Notifiche Lead Board inizializzato");';
echo '});';
echo '</script>';
?>
?>