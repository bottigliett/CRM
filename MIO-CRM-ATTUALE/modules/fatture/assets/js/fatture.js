// File: /modules/fatture/assets/js/fatture.js
// JavaScript per il modulo Fatture - CRM Studio Mismo

class FattureManager {
    constructor() {
        this.fatture = [];
        this.allFatture = []; // Aggiungi questa riga per memorizzare tutte le fatture
        this.currentFilters = {
            status: 'all',
            period: 'all',
            search: '',
            unpaidOnly: false,
            currentYear: true
        };
        this.isEditMode = false;
        this.currentFatturaId = null;
        
        console.log('🚀 FattureManager: Constructor called');
    }

    init() {
        console.log('🚀 FattureManager: Initializing...');
        this.initializeEventListeners();
        this.loadFatture();
        console.log('✅ FattureManager: Initialized');
    }

    initializeEventListeners() {
        // Bottoni principali
        document.getElementById('addFatturaBtn')?.addEventListener('click', () => this.openAddFatturaModal());
        document.getElementById('exportFattureBtn')?.addEventListener('click', () => this.exportFatture());

        // Modal fattura
        document.getElementById('closeModal')?.addEventListener('click', () => this.closeFatturaModal());
        document.getElementById('cancelBtn')?.addEventListener('click', () => this.closeFatturaModal());
        document.getElementById('fatturaForm')?.addEventListener('submit', (e) => this.handleFatturaSubmit(e));

        // Filtri
        this.setupFilters();

        // Ricerca
        document.getElementById('searchInput')?.addEventListener('input', (e) => this.handleSearch(e.target.value));

        // Calcoli automatici
        this.setupCalculations();

        // Status change handler
        document.getElementById('status')?.addEventListener('change', (e) => this.handleStatusChange(e.target.value));

        // Date calculations
        this.setupDateCalculations();

        // Close modal on overlay click
        document.getElementById('fatturaModal')?.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-overlay')) {
                this.closeFatturaModal();
            }
        });
        
        console.log('🎯 FattureManager: Event listeners initialized');
    }

    setupFilters() {
        // Status filters
        document.querySelectorAll('.status-filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.status-filter-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentFilters.status = e.target.dataset.status;
                this.filterFatture(); // Applica filtri invece di ricaricare
            });
        });

        // Period filters
        document.querySelectorAll('.period-filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.period-filter-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentFilters.period = e.target.dataset.period;
                this.filterFatture(); // Applica filtri invece di ricaricare
            });
        });

        // Checkbox filters
        document.getElementById('onlyUnpaidFilter')?.addEventListener('change', (e) => {
            this.currentFilters.unpaidOnly = e.target.checked;
            this.filterFatture(); // Applica filtri invece di ricaricare
        });

        document.getElementById('onlyCurrentYearFilter')?.addEventListener('change', (e) => {
            this.currentFilters.currentYear = e.target.checked;
            this.filterFatture(); // Applica filtri invece di ricaricare
        });
    }

    setupCalculations() {
        const quantitaInput = document.getElementById('quantita');
        const prezzoInput = document.getElementById('prezzoUnitario');
        const ivaSelect = document.getElementById('ivaPercentuale');

        [quantitaInput, prezzoInput, ivaSelect].forEach(element => {
            element?.addEventListener('input', () => this.calculateAmounts());
        });
    }

    setupDateCalculations() {
        // Auto-calculate scadenza when giorni or data fattura changes
        const dataFatturaInput = document.getElementById('dataFattura');
        const giorniPagamentoSelect = document.getElementById('giorniPagamento');
        
        [dataFatturaInput, giorniPagamentoSelect].forEach(element => {
            element?.addEventListener('change', () => this.calculateScadenza());
        });
    }

    calculateAmounts() {
        const quantita = parseFloat(document.getElementById('quantita')?.value) || 0;
        const prezzoUnitario = parseFloat(document.getElementById('prezzoUnitario')?.value) || 0;
        const ivaPercentuale = parseFloat(document.getElementById('ivaPercentuale')?.value) || 0;

        const subtotale = quantita * prezzoUnitario;
        const ivaImporto = subtotale * (ivaPercentuale / 100);
        const totale = subtotale + ivaImporto;

        // Update fields
        document.getElementById('subtotale').value = this.formatCurrency(subtotale);
        document.getElementById('ivaImporto').value = this.formatCurrency(ivaImporto);
        document.getElementById('totale').value = this.formatCurrency(totale);
    }

    calculateScadenza() {
        const dataFattura = document.getElementById('dataFattura')?.value;
        const giorni = parseInt(document.getElementById('giorniPagamento')?.value) || 30;

        if (dataFattura) {
            const date = new Date(dataFattura);
            date.setDate(date.getDate() + giorni);
            document.getElementById('dataScadenza').value = date.toISOString().split('T')[0];
        }
    }

    handleStatusChange(status) {
        const dataPagamentoGroup = document.getElementById('dataPagamentoGroup');
        const metodoPagamentoGroup = document.getElementById('metodoPagamentoGroup');

        if (status === 'pagata') {
            dataPagamentoGroup.style.display = 'block';
            metodoPagamentoGroup.style.display = 'block';
            // Set current date as default
            if (!document.getElementById('dataPagamento').value) {
                document.getElementById('dataPagamento').value = new Date().toISOString().split('T')[0];
            }
        } else {
            dataPagamentoGroup.style.display = 'none';
            metodoPagamentoGroup.style.display = 'none';
            document.getElementById('dataPagamento').value = '';
            document.getElementById('metodoPagamento').value = '';
        }
    }

    async loadFatture() {
        try {
            this.showLoader(true);
            
            const response = await fetch('/modules/fatture/ajax/get_fatture.php');
            const data = await response.json();
            
            if (data.success) {
                this.allFatture = data.data || []; // Salva tutte le fatture
                this.filterFatture(); // Applica i filtri
            } else {
                console.error('Error loading fatture:', data.message);
                this.showError('Errore nel caricamento delle fatture');
            }
        } catch (error) {
            console.error('Network error loading fatture:', error);
            this.showError('Errore di connessione');
        } finally {
            this.showLoader(false);
        }
    }

    filterFatture() {
        // Parti da tutte le fatture
        let filteredFatture = [...this.allFatture];
        
        // Applica filtro status
        if (this.currentFilters.status !== 'all') {
            filteredFatture = filteredFatture.filter(fattura => {
                // Gestisci status "scaduta" come caso speciale
                if (this.currentFilters.status === 'scaduta') {
                    return fattura.status === 'emessa' && 
                           new Date(fattura.data_scadenza) < new Date();
                }
                return fattura.status === this.currentFilters.status;
            });
        }
        
        // Applica filtro periodo
        if (this.currentFilters.period !== 'all') {
            const now = new Date();
            const currentYear = now.getFullYear();
            const currentMonth = now.getMonth();
            
            filteredFatture = filteredFatture.filter(fattura => {
                const fatturaDate = new Date(fattura.data_fattura);
                
                switch(this.currentFilters.period) {
                    case 'current_month':
                        return fatturaDate.getFullYear() === currentYear && 
                               fatturaDate.getMonth() === currentMonth;
                    
                    case 'last_month':
                        const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
                        const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
                        return fatturaDate.getFullYear() === lastMonthYear && 
                               fatturaDate.getMonth() === lastMonth;
                    
                    case 'current_year':
                        return fatturaDate.getFullYear() === currentYear;
                    
                    default:
                        return true;
                }
            });
        }
        
        // Applica filtro ricerca
        if (this.currentFilters.search && this.currentFilters.search.length > 0) {
            const searchLower = this.currentFilters.search.toLowerCase();
            filteredFatture = filteredFatture.filter(fattura => {
                return (
                    fattura.numero_fattura.toLowerCase().includes(searchLower) ||
                    fattura.client_name.toLowerCase().includes(searchLower) ||
                    fattura.oggetto.toLowerCase().includes(searchLower) ||
                    (fattura.client_piva && fattura.client_piva.toLowerCase().includes(searchLower))
                );
            });
        }
        
        // Applica filtro "solo non pagate"
        if (this.currentFilters.unpaidOnly) {
            filteredFatture = filteredFatture.filter(fattura => 
                fattura.status !== 'pagata' && fattura.status !== 'stornata'
            );
        }
        
        // Applica filtro "solo anno corrente"
        if (this.currentFilters.currentYear) {
            const currentYear = new Date().getFullYear();
            filteredFatture = filteredFatture.filter(fattura => {
                const fatturaYear = new Date(fattura.data_fattura).getFullYear();
                return fatturaYear === currentYear;
            });
        }
        
        // Aggiorna le fatture visualizzate
        this.fatture = filteredFatture;
        this.renderFatture();
        
        // Aggiorna counter nei filtri (opzionale)
        this.updateFilterCounters();
    }

    updateFilterCounters() {
        // Conta fatture per status
        const statusCounts = {
            all: this.allFatture.length,
            bozza: 0,
            emessa: 0,
            pagata: 0,
            scaduta: 0
        };
        
        this.allFatture.forEach(fattura => {
            if (fattura.status === 'bozza') statusCounts.bozza++;
            else if (fattura.status === 'emessa') {
                statusCounts.emessa++;
                // Controlla se è scaduta
                if (new Date(fattura.data_scadenza) < new Date()) {
                    statusCounts.scaduta++;
                }
            }
            else if (fattura.status === 'pagata') statusCounts.pagata++;
        });
        
        // Aggiorna i badge nei bottoni (opzionale)
        document.querySelectorAll('.status-filter-btn').forEach(btn => {
            const status = btn.dataset.status;
            const count = statusCounts[status] || 0;
            
            // Trova o crea il badge counter
            let badge = btn.querySelector('.filter-count');
            if (!badge && count > 0) {
                badge = document.createElement('span');
                badge.className = 'filter-count';
                btn.appendChild(badge);
            }
            
            if (badge) {
                badge.textContent = count > 0 ? ` (${count})` : '';
                badge.style.display = count > 0 ? 'inline' : 'none';
            }
        });
    }

    handleSearch(query) {
        this.currentFilters.search = query;
        // Debounce the search
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => {
            this.filterFatture(); // Usa filterFatture invece di ricaricre tutto
        }, 300);
    }

    renderFatture() {
        const container = document.getElementById('fattureList');
        const noFattureEl = document.getElementById('noFatture');
        
        if (!this.fatture || this.fatture.length === 0) {
            container.style.display = 'none';
            noFattureEl.style.display = 'block';
            return;
        }

        noFattureEl.style.display = 'none';
        container.style.display = 'block';

        const html = `
            <table class="fatture-table">
                <thead>
                    <tr>
                        <th>Numero</th>
                        <th>Cliente</th>
                        <th class="hide-mobile">Oggetto</th>
                        <th>Importo</th>
                        <th>Data</th>
                        <th>Scadenza</th>
                        <th>Status</th>
                        <th>Azioni</th>
                    </tr>
                </thead>
                <tbody>
                    ${this.fatture.map(fattura => this.renderFatturaRow(fattura)).join('')}
                </tbody>
            </table>
        `;

        container.innerHTML = html;
    }

    renderFatturaRow(fattura) {
        const isOverdue = fattura.status === 'emessa' && new Date(fattura.data_scadenza) < new Date();
        const actualStatus = isOverdue ? 'scaduta' : fattura.status;
        
        return `
            <tr data-fattura-id="${fattura.id}">
                <td>
                    <strong>${this.escapeHtml(fattura.numero_fattura)}</strong>
                </td>
                <td>
                    <div class="client-name">${this.escapeHtml(fattura.client_name)}</div>
                    <div class="client-details">${this.escapeHtml(fattura.client_piva || 'Nessuna P.IVA')}</div>
                </td>
                <td class="hide-mobile">
                    <div title="${this.escapeHtml(fattura.oggetto)}">
                        ${this.truncate(fattura.oggetto, 50)}
                    </div>
                </td>
                <td>
                    <strong>€${this.formatNumber(fattura.totale)}</strong>
                </td>
                <td>${this.formatDate(fattura.data_fattura)}</td>
                <td class="${isOverdue ? 'text-danger' : ''}">
                    ${this.formatDate(fattura.data_scadenza)}
                </td>
                <td>
                    <span class="status-badge ${actualStatus}">
                        ${this.getStatusIcon(actualStatus)} ${this.getStatusLabel(actualStatus)}
                    </span>
                </td>
                <td>
                    <div class="fattura-actions">
                        ${this.renderFatturaActions(fattura)}
                    </div>
                </td>
            </tr>
        `;
    }

    renderFatturaActions(fattura) {
        const actions = [];

        // View PDF (sempre disponibile se status != bozza)
        if (fattura.status !== 'bozza') {
            actions.push(`
                <button class="action-btn primary" onclick="fattureManager.viewPDF(${fattura.id})" title="Visualizza PDF">
                    PDF
                </button>
            `);
        }

        // Edit (sempre disponibile)
        actions.push(`
            <button class="action-btn" onclick="fattureManager.editFattura(${fattura.id})" title="Modifica">
                ✏️
            </button>
        `);

        // Duplicate
        actions.push(`
            <button class="action-btn" onclick="fattureManager.duplicateFattura(${fattura.id})" title="Duplica">
                📋
            </button>
        `);

        // Delete (only for bozze)
        if (fattura.status === 'bozza') {
            actions.push(`
                <button class="action-btn danger" onclick="fattureManager.deleteFattura(${fattura.id})" title="Elimina">
                    🗑️
                </button>
            `);
        }

        return actions.join('');
    }

    getStatusIcon(status) {
        const icons = {
            bozza: '✏️',
            emessa: '📤',
            pagata: '✅',
            scaduta: '⚠️',
            stornata: '❌'
        };
        return icons[status] || '';
    }

    getStatusLabel(status) {
        const labels = {
            bozza: 'Bozza',
            emessa: 'Emessa',
            pagata: 'Pagata',
            scaduta: 'Scaduta',
            stornata: 'Stornata',
            client: 'Cliente',
            prospect: 'Prospect',  
            collaborazioni: 'Collaborazione',
            contatto_utile: 'Contatto Utile',
            inactive: 'Inattivo'
        };
        return labels[status] || status;
    }

    openAddFatturaModal() {
        this.isEditMode = false;
        this.currentFatturaId = null;
        this.resetForm();
        
        document.getElementById('modalTitle').textContent = 'Nuova Fattura';
        document.getElementById('saveBtn').textContent = 'Salva Fattura';
        
        // Set default date
        document.getElementById('dataFattura').value = new Date().toISOString().split('T')[0];
        this.calculateScadenza();
        
        document.getElementById('fatturaModal').style.display = 'flex';
        console.log('📝 Modal nuova fattura aperto');
    }

    closeFatturaModal() {
        document.getElementById('fatturaModal').style.display = 'none';
        this.resetForm();
        console.log('❌ Modal fattura chiuso');
    }

    resetForm() {
        document.getElementById('fatturaForm').reset();
        document.getElementById('fatturaId').value = '';
        
        // Reset defaults
        document.getElementById('quantita').value = '1.00';
        document.getElementById('ivaPercentuale').value = '0';
        document.getElementById('giorniPagamento').value = '30';
        document.getElementById('status').value = 'bozza';
        
        // Reset calculated fields
        document.getElementById('subtotale').value = '';
        document.getElementById('ivaImporto').value = '';
        document.getElementById('totale').value = '';
        
        // Reset contact selector using existing component
        if (window.ContactSelector) {
            ContactSelector.clearSelection('fatturaClient');
        }
        
        // Hide payment fields
        document.getElementById('dataPagamentoGroup').style.display = 'none';
        document.getElementById('metodoPagamentoGroup').style.display = 'none';
    }

    async editFattura(id) {
        try {
            const response = await fetch(`/modules/fatture/ajax/get_fattura.php?id=${id}`);
            const data = await response.json();
            
            if (data.success && data.data) {
                this.isEditMode = true;
                this.currentFatturaId = id;
                this.populateForm(data.data);
                
                document.getElementById('modalTitle').textContent = 'Modifica Fattura';
                document.getElementById('saveBtn').textContent = 'Aggiorna Fattura';
                
                document.getElementById('fatturaModal').style.display = 'flex';
            } else {
                this.showError('Errore nel caricamento della fattura');
            }
        } catch (error) {
            console.error('Error loading fattura:', error);
            this.showError('Errore di connessione');
        }
    }

    populateForm(fattura) {
        // Basic fields
        document.getElementById('fatturaId').value = fattura.id;
        document.getElementById('numeroFattura').value = fattura.numero_fattura;
        document.getElementById('dataFattura').value = fattura.data_fattura;
        document.getElementById('oggetto').value = fattura.oggetto;
        document.getElementById('descrizione').value = fattura.descrizione || '';
        document.getElementById('quantita').value = fattura.quantita;
        document.getElementById('prezzoUnitario').value = fattura.prezzo_unitario;
        document.getElementById('ivaPercentuale').value = fattura.iva_percentuale;
        document.getElementById('giorniPagamento').value = fattura.giorni_pagamento;
        document.getElementById('dataScadenza').value = fattura.data_scadenza;
        document.getElementById('status').value = fattura.status;
        document.getElementById('dataPagamento').value = fattura.data_pagamento || '';
        document.getElementById('metodoPagamento').value = fattura.metodo_pagamento || '';
        document.getElementById('noteFiscali').value = fattura.note_fiscali || '';

        // Set client usando il ContactSelector
        if (window.ContactSelector && fattura.client_id) {
            // Prima aspetta che i contatti siano caricati
            setTimeout(() => {
                ContactSelector.preselectContact('fatturaClient', fattura.client_id);
            }, 100);
        }

        // Calculate amounts
        this.calculateAmounts();
        
        // Handle status-dependent fields
        this.handleStatusChange(fattura.status);
    }

    async handleFatturaSubmit(e) {
        e.preventDefault();
        
        if (!this.validateForm()) {
            return;
        }

        const formData = new FormData(e.target);
        const url = this.isEditMode ? '/modules/fatture/ajax/update_fattura.php' : '/modules/fatture/ajax/save_fattura.php';

        try {
            const response = await fetch(url, {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showSuccess(this.isEditMode ? 'Fattura aggiornata con successo' : 'Fattura creata con successo');
                this.closeFatturaModal();
                await this.loadFatture(); // Ricarica tutte le fatture
            } else {
                this.showError(data.message || 'Errore nel salvataggio della fattura');
            }
        } catch (error) {
            console.error('Error saving fattura:', error);
            this.showError('Errore di connessione');
        }
    }

    validateForm() {
        const requiredFields = ['numero_fattura', 'data_fattura', 'oggetto', 'quantita', 'prezzo_unitario'];
        
        for (const field of requiredFields) {
            const element = document.querySelector(`[name="${field}"]`);
            if (!element || !element.value.trim()) {
                this.showError(`Il campo ${field.replace('_', ' ')} è obbligatorio`);
                element?.focus();
                return false;
            }
        }

        // Verifica selezione cliente usando il contact selector esistente
        const clientId = document.getElementById('fatturaClient_id')?.value;
        if (!clientId) {
            this.showError('Seleziona un cliente dall\'anagrafica');
            // Focus sul campo di ricerca del contact selector
            document.getElementById('fatturaClient_search')?.focus();
            return false;
        }

        return true;
    }

        async viewPDF(id) {
        try {
            // Mostra opzioni all'utente
            const choice = await this.showPDFOptions();
            
            if (choice === 'hd') {
                // Apri con generazione HD automatica
                const pdfWindow = window.open(
                    `/modules/fatture/ajax/generate_pdf.php?id=${id}&auto_pdf=true`, 
                    '_blank'
                );
                
                if (!pdfWindow) {
                    this.showError('Impossibile aprire il PDF. Verifica che i popup non siano bloccati.');
                }
            } else if (choice === 'standard') {
                // Apri per stampa standard
                const pdfWindow = window.open(
                    `/modules/fatture/ajax/generate_pdf.php?id=${id}`, 
                    '_blank'
                );
                
                if (!pdfWindow) {
                    this.showError('Impossibile aprire il PDF. Verifica che i popup non siano bloccati.');
                }
            }
            // Se choice è null, l'utente ha annullato
            
        } catch (error) {
            console.error('Error viewing PDF:', error);
            this.showError('Errore nella generazione del PDF');
        }
    }
    
    // Aggiungi questo nuovo metodo dopo viewPDF:
    showPDFOptions() {
        return new Promise((resolve) => {
            // Crea modal per scelta
            const modal = document.createElement('div');
            modal.className = 'pdf-options-modal';
            modal.innerHTML = `
                <div class="pdf-options-overlay"></div>
                <div class="pdf-options-content">
                    <h3>Scegli formato PDF</h3>
                    <p>Come vuoi generare il PDF della fattura?</p>
                    <div class="pdf-options-buttons">
                        <button class="btn-pdf-hd">
                            <span class="option-icon">🎯</span>
                            <span class="option-title">PDF Alta Qualità</span>
                            <span class="option-desc">Screenshot perfetto del documento</span>
                        </button>
                        <button class="btn-pdf-standard">
                            <span class="option-icon">🖨️</span>
                            <span class="option-title">PDF Standard</span>
                            <span class="option-desc">Stampa tradizionale del browser</span>
                        </button>
                    </div>
                    <button class="btn-pdf-cancel">Annulla</button>
                </div>
            `;
            
            // Aggiungi stili inline per il modal
            const style = document.createElement('style');
            style.textContent = `
                .pdf-options-modal {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    z-index: 10000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .pdf-options-overlay {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.5);
                }
                .pdf-options-content {
                    position: relative;
                    background: white;
                    border-radius: 8px;
                    padding: 24px;
                    max-width: 400px;
                    width: 90%;
                    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
                }
                .pdf-options-content h3 {
                    margin: 0 0 8px 0;
                    font-size: 20px;
                    color: #37352f;
                }
                .pdf-options-content p {
                    margin: 0 0 20px 0;
                    color: #787774;
                    font-size: 14px;
                }
                .pdf-options-buttons {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                    margin-bottom: 16px;
                }
                .pdf-options-buttons button {
                    display: flex;
                    flex-direction: column;
                    align-items: flex-start;
                    padding: 16px;
                    border: 1px solid #e9e9e7;
                    border-radius: 6px;
                    background: white;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    text-align: left;
                }
                .pdf-options-buttons button:hover {
                    border-color: #37352f;
                    background: #f7f7f5;
                }
                .option-icon {
                    font-size: 24px;
                    margin-bottom: 8px;
                }
                .option-title {
                    font-size: 16px;
                    font-weight: 600;
                    color: #37352f;
                    margin-bottom: 4px;
                }
                .option-desc {
                    font-size: 13px;
                    color: #787774;
                }
                .btn-pdf-cancel {
                    width: 100%;
                    padding: 10px;
                    border: 1px solid #e9e9e7;
                    border-radius: 4px;
                    background: white;
                    color: #787774;
                    cursor: pointer;
                    font-size: 14px;
                    transition: all 0.2s ease;
                }
                .btn-pdf-cancel:hover {
                    background: #f7f7f5;
                }
            `;
            document.head.appendChild(style);
            document.body.appendChild(modal);
            
            // Event listeners
            modal.querySelector('.btn-pdf-hd').onclick = () => {
                document.body.removeChild(modal);
                document.head.removeChild(style);
                resolve('hd');
            };
            
            modal.querySelector('.btn-pdf-standard').onclick = () => {
                document.body.removeChild(modal);
                document.head.removeChild(style);
                resolve('standard');
            };
            
            modal.querySelector('.btn-pdf-cancel').onclick = () => {
                document.body.removeChild(modal);
                document.head.removeChild(style);
                resolve(null);
            };
            
            modal.querySelector('.pdf-options-overlay').onclick = () => {
                document.body.removeChild(modal);
                document.head.removeChild(style);
                resolve(null);
            };
        });
    }

    async duplicateFattura(id) {
        if (!confirm('Vuoi duplicare questa fattura?')) {
            return;
        }

        try {
            const response = await fetch(`/modules/fatture/ajax/duplicate_fattura.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ id })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showSuccess('Fattura duplicata con successo');
                this.loadFatture();
            } else {
                this.showError(data.message || 'Errore nella duplicazione della fattura');
            }
        } catch (error) {
            console.error('Error duplicating fattura:', error);
            this.showError('Errore di connessione');
        }
    }

    async deleteFattura(id) {
        if (!confirm('Sei sicuro di voler eliminare questa fattura? Questa azione non può essere annullata.')) {
            return;
        }

        try {
            const response = await fetch(`/modules/fatture/ajax/delete_fattura.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ id })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showSuccess('Fattura eliminata con successo');
                this.loadFatture();
            } else {
                this.showError(data.message || 'Errore nell\'eliminazione della fattura');
            }
        } catch (error) {
            console.error('Error deleting fattura:', error);
            this.showError('Errore di connessione');
        }
    }

    async exportFatture() {
        try {
            const response = await fetch('/modules/fatture/ajax/export_fatture.php');
            
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `fatture_${new Date().toISOString().split('T')[0]}.csv`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
                
                this.showSuccess('Export completato');
            } else {
                this.showError('Errore nell\'export');
            }
        } catch (error) {
            console.error('Error exporting:', error);
            this.showError('Errore nell\'export');
        }
    }

    // Utility methods
    showLoader(show) {
        document.getElementById('fattureLoader').style.display = show ? 'flex' : 'none';
        document.getElementById('fattureList').style.display = show ? 'none' : 'block';
    }

    showSuccess(message) {
        if (window.Toast) {
            Toast.show(message, 'success');
        } else {
            alert(message);
        }
    }

    showError(message) {
        if (window.Toast) {
            Toast.show(message, 'error');
        } else {
            alert(message);
        }
    }

    formatCurrency(amount) {
        return amount.toFixed(2);
    }

    formatNumber(number) {
        return parseFloat(number).toLocaleString('it-IT', { 
            minimumFractionDigits: 2, 
            maximumFractionDigits: 2 
        });
    }

    formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('it-IT');
    }

    escapeHtml(text) {
        if (typeof text !== 'string') return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    truncate(str, length) {
        if (!str) return '';
        return str.length > length ? str.substring(0, length) + '...' : str;
    }
}

// Initialize when DOM is ready - CONTROLLED INITIALIZATION
document.addEventListener('DOMContentLoaded', () => {
    console.log('🔄 DOM Ready - Starting Fatture initialization...');
    
    // Wait a bit for other scripts to load, especially contact-selector.js
    setTimeout(() => {
        // Only initialize if we're on the fatture page
        if (window.location.pathname.includes('/modules/fatture/')) {
            
            // Check if ContactSelector is available
            if (window.ContactSelector) {
                console.log('✅ ContactSelector found and ready');
            } else {
                console.warn('⚠️ ContactSelector not found - contact selector may not work properly');
            }
            
            // Initialize FattureManager
            window.fattureManager = new FattureManager();
            window.fattureManager.init();
            console.log('✅ FattureManager initialized successfully');
        }
    }, 300); // Increased timeout to ensure contact-selector.js loads first
});

// Global functions for onclick handlers
function openAddFatturaModal() {
    console.log('🎯 openAddFatturaModal called');
    if (window.fattureManager) {
        window.fattureManager.openAddFatturaModal();
    } else {
        console.error('❌ FattureManager not found');
    }
}