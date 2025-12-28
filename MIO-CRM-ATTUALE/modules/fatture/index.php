<?php
// File: /modules/fatture/index.php
// Modulo Fatture - CRM Studio Mismo

// IMPORTANTE: Carica financial_pin_guard PRIMA di auth_helper per gestire AJAX
require_once $_SERVER['DOCUMENT_ROOT'] . '/core/includes/financial_pin_guard.php';

// Gestisci richieste AJAX PIN PRIMA di auth_helper (che potrebbe fare redirect)
handleFinancialPinAjax();

// Ora includi autenticazione
require_once $_SERVER['DOCUMENT_ROOT'] . '/core/includes/auth_helper.php';

// ⭐ CONTROLLO PERMESSI DEL MODULO
requireModulePermission('fatture', 'read');

// ⭐ PROTEZIONE PIN - Verifica se serve il PIN
$needsPin = requireFinancialPin();

$currentUser = getCurrentUser();

// Verifica permessi di scrittura/cancellazione per mostrare/nascondere bottoni
$canWrite = hasPermission('fatture', 'write');
$canDelete = hasPermission('fatture', 'delete');

// Log accesso
logUserAction('access_fatture_module', 'success', 'Accesso al modulo Fatture');

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

// Se serve il PIN, non caricare i dati
if (!$needsPin) {
    // Statistiche fatture
    $stats = [
        'total' => 0,
        'bozza' => 0,
        'emessa' => 0,
        'pagata' => 0,
        'scaduta' => 0,
        'totale_emesso' => 0,
        'totale_incassato' => 0,
        'in_attesa_pagamento' => 0
];

if ($pdo) {
    try {
        // Totale fatture
        $stmt = $pdo->query("SELECT COUNT(*) FROM fatture");
        $stats['total'] = $stmt->fetchColumn();
        
        // Per status
        $stmt = $pdo->query("
            SELECT status, COUNT(*) as count, SUM(totale) as totale
            FROM fatture 
            GROUP BY status
        ");
        $statusStats = $stmt->fetchAll();
        foreach ($statusStats as $stat) {
            $stats[$stat['status']] = $stat['count'];
            
            if ($stat['status'] === 'emessa') {
                $stats['totale_emesso'] = $stat['totale'] ?? 0;
            } elseif ($stat['status'] === 'pagata') {
                $stats['totale_incassato'] = $stat['totale'] ?? 0;
            }
        }
        
        // Fatture scadute (emesse da più di 30 giorni)
        $stmt = $pdo->query("
            SELECT COUNT(*) FROM fatture 
            WHERE status = 'emessa' AND data_scadenza < CURDATE()
        ");
        $stats['scaduta'] = $stmt->fetchColumn();
        
        // In attesa di pagamento (emesse non scadute)
        $stmt = $pdo->query("
            SELECT COALESCE(SUM(totale), 0) FROM fatture 
            WHERE status = 'emessa' AND data_scadenza >= CURDATE()
        ");
        $stats['in_attesa_pagamento'] = $stmt->fetchColumn();
        
    } catch (Exception $e) {
        error_log("Error fetching fatture stats: " . $e->getMessage());
    }
}

// Genera token CSRF
$csrfToken = generateCSRFToken();

} // Fine if (!$needsPin) - chiusura caricamento dati

// Contenuto della pagina
ob_start();

// Se serve il PIN, mostra solo il modal PIN
if ($needsPin) {
    renderFinancialPinModal();
} else {
?>

<div class="fatture-container">
    <!-- Header con statistiche -->
    <div class="stats-grid">
        <div class="stat-card">
            <div class="stat-icon">📄</div>
            <div class="stat-content">
                <div class="stat-value"><?= $stats['total'] ?></div>
                <div class="stat-label">Totale Fatture</div>
            </div>
        </div>
        
        <div class="stat-card">
            <div class="stat-icon">✏️</div>
            <div class="stat-content">
                <div class="stat-value"><?= $stats['bozza'] ?></div>
                <div class="stat-label">Bozze</div>
            </div>
        </div>
        
        <div class="stat-card">
            <div class="stat-icon">📤</div>
            <div class="stat-content">
                <div class="stat-value"><?= $stats['emessa'] ?></div>
                <div class="stat-label">Emesse</div>
            </div>
        </div>
        
        <div class="stat-card">
            <div class="stat-icon">✅</div>
            <div class="stat-content">
                <div class="stat-value"><?= $stats['pagata'] ?></div>
                <div class="stat-label">Pagate</div>
            </div>
        </div>
        
        <div class="stat-card">
            <div class="stat-icon">⚠️</div>
            <div class="stat-content">
                <div class="stat-value"><?= $stats['scaduta'] ?></div>
                <div class="stat-label">Scadute</div>
            </div>
        </div>
        
        <div class="stat-card">
            <div class="stat-icon">💰</div>
            <div class="stat-content">
                <div class="stat-value">€<?= number_format($stats['totale_incassato'], 0, ',', '.') ?></div>
                <div class="stat-label">Incassato</div>
            </div>
        </div>
    </div>

    <!-- Controlli principali -->
    <div class="content-card">
        <div class="card-header">
            <h2>Gestione Fatture</h2>
            <div class="fatture-header-actions">
                <?= getFinancialLockButton() ?>
                <button class="btn-primary" id="addFatturaBtn">
                    + Nuova Fattura
                </button>
                <button class="btn-secondary" id="exportFattureBtn">
                    📊 Esporta Lista
                </button>
            </div>
        </div>
        
        <!-- Filtri -->
        <div class="fatture-filters">
            <div class="filter-section">
                <div class="filter-group">
                    <label>Status:</label>
                    <div class="filter-buttons">
                        <button class="status-filter-btn active" data-status="all">Tutte</button>
                        <button class="status-filter-btn" data-status="bozza">✏️ Bozze</button>
                        <button class="status-filter-btn" data-status="emessa">📤 Emesse</button>
                        <button class="status-filter-btn" data-status="pagata">✅ Pagate</button>
                        <button class="status-filter-btn" data-status="scaduta">⚠️ Scadute</button>
                    </div>
                </div>
                
                <div class="filter-group">
                    <label>Periodo:</label>
                    <div class="filter-buttons">
                        <button class="period-filter-btn active" data-period="all">Tutte</button>
                        <button class="period-filter-btn" data-period="current_month">Mese corrente</button>
                        <button class="period-filter-btn" data-period="last_month">Mese scorso</button>
                        <button class="period-filter-btn" data-period="current_year">Anno corrente</button>
                    </div>
                </div>
            </div>
            
            <div class="search-section">
                <input type="text" id="searchInput" placeholder="🔍 Cerca per numero, cliente, oggetto..." class="search-input">
                <div class="search-filters">
                    <label class="checkbox-label">
                        <input type="checkbox" id="onlyUnpaidFilter">
                        <span>Solo non pagate</span>
                    </label>
                    <label class="checkbox-label">
                        <input type="checkbox" id="onlyCurrentYearFilter" checked>
                        <span>Solo anno corrente</span>
                    </label>
                </div>
            </div>
        </div>
        
        <!-- Lista fatture -->
        <div class="fatture-content">
            <div id="fattureLoader" class="fatture-loader">
                <div class="loading-spinner"></div>
                <p>Caricamento fatture...</p>
            </div>
            
            <div id="fattureList" class="fatture-list" style="display: none;">
                <!-- Le fatture verranno caricate via JavaScript -->
            </div>
            
            <div id="noFatture" class="empty-state" style="display: none;">
                <div class="empty-state-icon">📄</div>
                <h3>Nessuna fattura trovata</h3>
                <p>Inizia creando la tua prima fattura per tenere traccia dei pagamenti.</p>
                <button class="btn-primary" onclick="openAddFatturaModal()">
                    + Crea Prima Fattura
                </button>
            </div>
        </div>
    </div>
</div>

<!-- Modal Nuova/Modifica Fattura -->
<div class="modal-overlay" id="fatturaModal" style="display: none;">
    <div class="modal-content large">
        <div class="modal-header">
            <div class="modal-title-section">
                <h2 class="modal-title" id="modalTitle">Nuova Fattura</h2>
            </div>
            <button class="modal-close" id="closeModal">&times;</button>
        </div>
        
        <form id="fatturaForm" class="modal-body">
            <input type="hidden" id="fatturaId" name="fattura_id">
            <input type="hidden" name="csrf_token" value="<?= $csrfToken ?>">
            
            <!-- Numero fattura e Data -->
            <div class="form-row two-cols">
                <div class="form-group required">
                    <label for="numeroFattura" class="form-label">Numero Fattura</label>
                    <input type="text" id="numeroFattura" name="numero_fattura" class="form-input" required placeholder="es: #142025">
                    <small class="form-hint">Formato libero (es: #142025, FAT/2025/001)</small>
                </div>
                
                <div class="form-group required">
                    <label for="dataFattura" class="form-label">Data Fattura</label>
                    <input type="date" id="dataFattura" name="data_fattura" class="form-input" required>
                </div>
            </div>
            
            <!-- Cliente -->
            <div class="form-section">
                <?php
                // Usa il componente contact selector esistente che funziona
                require_once $_SERVER['DOCUMENT_ROOT'] . '/core/components/contact_selector.php';
                echo renderContactSelector('fatturaClient', 'client_id', 'Cliente', null, true, 'Cerca cliente dall\'anagrafica...');
                ?>
            </div>
            
            <!-- Oggetto e Descrizione -->
            <div class="form-row">
                <div class="form-group required">
                    <label for="oggetto" class="form-label">Oggetto</label>
                    <input type="text" id="oggetto" name="oggetto" class="form-input" required placeholder="SOCIAL MEDIA MANAGEMENT - MESE DI AGOSTO 2025">
                </div>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label for="descrizione" class="form-label">Descrizione Servizio</label>
                    <input type="text" id="descrizione" name="descrizione" class="form-input" placeholder="SOCIAL MEDIA MANAGEMENT PER 2 PROFILI">
                </div>
            </div>
            
            <!-- Importi -->
            <div class="form-section">
                <h3 class="section-title">Importi e IVA</h3>
                
                <div class="form-row three-cols">
                    <div class="form-group required">
                        <label for="quantita" class="form-label">Quantità</label>
                        <input type="number" id="quantita" name="quantita" class="form-input" step="0.01" min="0" value="1.00" required>
                    </div>
                    
                    <div class="form-group required">
                        <label for="prezzoUnitario" class="form-label">Prezzo Unitario (€)</label>
                        <input type="number" id="prezzoUnitario" name="prezzo_unitario" class="form-input" step="0.01" min="0" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="subtotale" class="form-label">Subtotale</label>
                        <input type="text" id="subtotale" class="form-input" readonly>
                    </div>
                </div>
                
                <div class="form-row three-cols">
                    <div class="form-group">
                        <label for="ivaPercentuale" class="form-label">IVA (%)</label>
                        <select id="ivaPercentuale" name="iva_percentuale" class="form-select">
                            <option value="0">0% - Esente</option>
                            <option value="4">4% - Ridotta</option>
                            <option value="10">10% - Ridotta</option>
                            <option value="22">22% - Ordinaria</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="ivaImporto" class="form-label">Importo IVA (€)</label>
                        <input type="text" id="ivaImporto" class="form-input" readonly>
                    </div>
                    
                    <div class="form-group">
                        <label for="totale" class="form-label">Totale</label>
                        <input type="text" id="totale" class="form-input total-amount" readonly>
                    </div>
                </div>
            </div>
            
            <!-- Scadenza e Status -->
            <div class="form-row two-cols">
                <div class="form-group">
                    <label for="giorniPagamento" class="form-label">Giorni per Pagamento</label>
                    <select id="giorniPagamento" name="giorni_pagamento" class="form-select">
                        <option value="15">15 giorni</option>
                        <option value="30" selected>30 giorni</option>
                        <option value="60">60 giorni</option>
                        <option value="90">90 giorni</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label for="dataScadenza" class="form-label">Data Scadenza</label>
                    <input type="date" id="dataScadenza" name="data_scadenza" class="form-input">
                </div>
            </div>
            
            <!-- Status e Pagamento -->
            <div class="form-section">
                <h3 class="section-title">Status e Pagamento</h3>
                
                <div class="form-row two-cols">
                    <div class="form-group">
                        <label for="status" class="form-label">Status</label>
                        <select id="status" name="status" class="form-select">
                            <option value="bozza" selected>✏️ Bozza</option>
                            <option value="emessa">📤 Emessa</option>
                            <option value="pagata">✅ Pagata</option>
                            <option value="stornata">❌ Stornata</option>
                        </select>
                    </div>
                    
                    <div class="form-group" id="dataPagamentoGroup" style="display: none;">
                        <label for="dataPagamento" class="form-label">Data Pagamento</label>
                        <input type="date" id="dataPagamento" name="data_pagamento" class="form-input">
                    </div>
                </div>
                
                <div class="form-row" id="metodoPagamentoGroup" style="display: none;">
                    <div class="form-group">
                        <label for="metodoPagamento" class="form-label">Metodo di Pagamento</label>
                        <input type="text" id="metodoPagamento" name="metodo_pagamento" class="form-input" placeholder="Bonifico bancario, PayPal, ecc...">
                    </div>
                </div>
            </div>
            
            <!-- Note fiscali -->
            <div class="form-row">
                <div class="form-group">
                    <label for="noteFiscali" class="form-label">Note Fiscali</label>
                    <textarea id="noteFiscali" name="note_fiscali" class="form-textarea" rows="3">IVA 0% - OPERAZIONE NON SOGGETTA A IVA AI SENSI DELL'ART. 1, COMMI 54-89, LEGGE N. 190/2014 E SUCC. MODIFICHE/INTEGRAZIONI.

QUESTO DOCUMENTO NON COSTITUISCE FATTURA A FINI FISCALI, CHE SARÀ EMESSA AL MOMENTO DEL PAGAMENTO.</textarea>
                </div>
            </div>
        </form>
        
        <div class="modal-footer">
            <button type="button" class="btn-secondary" id="cancelBtn">Annulla</button>
            <button type="submit" form="fatturaForm" class="btn-primary" id="saveBtn">Salva Fattura</button>
        </div>
    </div>
</div>

<?php
} // Fine else - chiusura contenuto normale
$pageContent = ob_get_clean();

// Include CSS e JS solo se non serve il PIN
$additionalCSS = ['/modules/fatture/assets/css/fatture.css?v=' . time()];
$additionalJS = [];

// Carica gli script JS solo se il PIN è sbloccato
if (!$needsPin) {
    $additionalJS = [
        '/assets/js/toast.js',
        '/assets/js/notifications.js',
        '/assets/js/contact-selector.js?v=' . time(),
        '/modules/fatture/assets/js/fatture.js?v=' . time()
    ];
}

// Render della pagina
renderPage('Fatture', $pageContent, $additionalCSS, $additionalJS);
?>