// File: /modules/lead_contatti/lead/assets/js/kanban.js
// JavaScript per Lead Board Kanban - CRM Studio Mismo
// VERSIONE CORRETTA CON CONTROLLI DOM

const LeadBoard = {
    // Configurazione
    config: {
        apiBase: '/modules/lead_contatti/lead/ajax/',
        debounceDelay: 300,
        autoRefreshInterval: 60000, // 1 minuto
        columns: ['da_contattare', 'contattati', 'chiusi', 'persi']
    },
    
    // Stato corrente
    state: {
        leads: [],
        filteredLeads: [],
        contacts: [], // Cache delle anagrafiche per la ricerca
        currentFilters: {
            priority: 'all',
            minValue: '',
            maxValue: '',
            search: ''
        },
        currentLead: null,
        selectedContact: null, // Anagrafica selezionata nel form
        isDragging: false,
        draggedLead: null,
        autoRefreshTimer: null,
        formIsDirty: false // Traccia se il form è stato modificato
    },

    // Inizializzazione
    init() {
        console.log('LeadBoard: Initializing...');
        
        this.forceHideModals();
        this.setupEventListeners();
        this.setupDragAndDrop();
        this.loadLeads();
        this.startAutoRefresh();
        
        console.log('LeadBoard: Initialized');
    },
    
    // Forza modals nascosti
    forceHideModals() {
        const leadModal = document.getElementById('leadModal');
        const detailsModal = document.getElementById('leadDetailsModal');
        const contactsModal = document.getElementById('contactsListModal');
        
        if (leadModal) {
            leadModal.classList.remove('show');
            leadModal.removeAttribute('style'); // Pulisci stili inline
            leadModal.style.display = 'none';
            leadModal.style.visibility = 'hidden';
        }
        
        if (detailsModal) {
            detailsModal.classList.remove('show');
            detailsModal.removeAttribute('style'); // Pulisci stili inline
            detailsModal.style.display = 'none';
            detailsModal.style.visibility = 'hidden';
        }
        
        if (contactsModal) {
            contactsModal.classList.remove('show');
            contactsModal.style.display = 'none';
            contactsModal.style.visibility = 'hidden';
        }
        
        // Ripristina body
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
    },

    // Setup event listeners
    setupEventListeners() {
        // Filtri priorità
        document.querySelectorAll('.priority-filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.handlePriorityFilter(e));
        });
        
        // Filtri valore
        const minValue = document.getElementById('minValue');
        const maxValue = document.getElementById('maxValue');
        if (minValue) {
            minValue.addEventListener('input', this.debounce(() => {
                this.state.currentFilters.minValue = minValue.value;
                this.filterLeads();
            }, this.config.debounceDelay));
        }
        if (maxValue) {
            maxValue.addEventListener('input', this.debounce(() => {
                this.state.currentFilters.maxValue = maxValue.value;
                this.filterLeads();
            }, this.config.debounceDelay));
        }
        
        // Ricerca
        const searchInput = document.getElementById('leadSearch');
        if (searchInput) {
            searchInput.addEventListener('input', this.debounce((e) => {
                this.state.currentFilters.search = e.target.value;
                this.filterLeads();
            }, this.config.debounceDelay));
        }
        
        // Toggle filtri
        const filterBtn = document.getElementById('filterBtn');
        const filtersDiv = document.getElementById('kanbanFilters');
        if (filterBtn && filtersDiv) {
            filterBtn.addEventListener('click', () => {
                const isVisible = filtersDiv.style.display !== 'none';
                filtersDiv.style.display = isVisible ? 'none' : 'block';
                filterBtn.textContent = isVisible ? 'Filtri' : 'Nascondi';
            });
        }
        
        // Modal handlers
        const addLeadBtn = document.getElementById('addLeadBtn');
        if (addLeadBtn) {
            addLeadBtn.addEventListener('click', () => this.openAddLeadModal('da_contattare'));
        }
        
        const exportBtn = document.getElementById('exportBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportReport());
        }
        
        const closeLeadModal = document.getElementById('closeLeadModal');
        if (closeLeadModal) {
            closeLeadModal.addEventListener('click', () => this.closeModal());
        }
        
        const cancelLeadBtn = document.getElementById('cancelLeadBtn');
        if (cancelLeadBtn) {
            cancelLeadBtn.addEventListener('click', () => this.closeModal());
        }
        
        // Form submission
        const leadForm = document.getElementById('leadForm');
        if (leadForm) {
            leadForm.addEventListener('submit', (e) => this.handleFormSubmit(e));
        }
        
        // Conditional fields based on column
        const leadColumn = document.getElementById('leadColumn');
        if (leadColumn) {
            const observer = new MutationObserver(() => {
                this.updateConditionalFields();
            });
            observer.observe(leadColumn, { attributes: true, attributeFilter: ['value'] });
            
            // Aggiungi anche listener per il change event
            leadColumn.addEventListener('change', () => {
                this.updateConditionalFields();
            });
        }
        
        // === GESTIONE SELEZIONE ANAGRAFICA ===
        this.setupContactSelection();

        // Form change tracking
        this.setupFormChangeTracking();

        // Close modal handlers
        this.setupModalCloseHandlers();
    },
    
    setupFormChangeTracking() {
        const leadForm = document.getElementById('leadForm');
        if (!leadForm) return;

        // Ascolta tutti i campi input, textarea e select nel form
        const formFields = leadForm.querySelectorAll('input:not([type="hidden"]), textarea, select');

        formFields.forEach(field => {
            field.addEventListener('input', () => {
                this.state.formIsDirty = true;
            });
            field.addEventListener('change', () => {
                this.state.formIsDirty = true;
            });
        });
    },

    setupContactSelection() {
        // Toggle tra selezione esistente e creazione nuovo
        const contactModeRadios = document.querySelectorAll('input[name="contact_mode"]');
        contactModeRadios.forEach(radio => {
            radio.addEventListener('change', (e) => this.handleContactModeChange(e.target.value));
        });

        // Campo ricerca anagrafica
        const contactSearch = document.getElementById('contactSearch');
        if (contactSearch) {
            contactSearch.addEventListener('input', this.debounce((e) => {
                this.searchContacts(e.target.value);
            }, 300));

            contactSearch.addEventListener('focus', () => {
                if (contactSearch.value.trim()) {
                    this.searchContacts(contactSearch.value);
                }
            });

            // Chiudi dropdown quando si clicca fuori
            document.addEventListener('click', (e) => {
                if (!e.target.closest('.contact-search-container')) {
                    this.hideContactDropdown();
                }
            });
        }
        
        // Pulsante per lista completa contatti
        const showAllContactsBtn = document.getElementById('showAllContactsBtn');
        if (showAllContactsBtn) {
            console.log('Button showAllContactsBtn found, attaching event listener');
            showAllContactsBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('ShowAllContactsBtn clicked');
                this.showAllContactsList();
            });
        } else {
            console.warn('Button showAllContactsBtn not found in DOM - lista completa contatti non disponibile');
        }
        
        // Carica cache contatti solo se i controlli esistono
        if (contactSearch || showAllContactsBtn) {
            this.loadContactsCache();
        } else {
            console.warn('Controlli selezione contatti non trovati - funzionalità disabilitata');
        }
    },
    
    async loadContactsCache() {
        try {
            console.log('Loading contacts cache...');
            // Carica tutti i contatti per la cache di ricerca veloce
            const response = await fetch('/modules/lead_contatti/ajax/get_all_contacts.php?limit=500&order_by=name');
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (data.success) {
                this.state.contacts = data.contacts || [];
                console.log(`Caricate ${this.state.contacts.length} anagrafiche in cache per selezione`);
            } else {
                throw new Error(data.error || 'Errore nel caricamento contatti');
            }
        } catch (error) {
            console.error('Error loading contacts cache:', error);
            this.state.contacts = []; // Fallback a array vuoto
            
            // Disabilita il pulsante se c'è un errore
            const showAllContactsBtn = document.getElementById('showAllContactsBtn');
            if (showAllContactsBtn) {
                showAllContactsBtn.disabled = true;
                showAllContactsBtn.title = 'Lista contatti non disponibile (errore caricamento)';
                showAllContactsBtn.style.opacity = '0.5';
            }
        }
    },
    
    async showAllContactsList() {
        console.log('showAllContactsList called');
        try {
            // Carica tutti i contatti se non sono già stati caricati
            if (this.state.contacts.length < 50) { // Se abbiamo meno di 50, ricarica tutti
                await this.loadAllContacts();
            }

            this.renderContactsListModal();
            
        } catch (error) {
            console.error('Error showing contacts list:', error);
            this.showError('Errore nel caricamento della lista contatti: ' + error.message);
        }
    },
    
    async loadAllContacts() {
        try {
            console.log('Loading all contacts...');
            const response = await fetch('/modules/lead_contatti/ajax/get_all_contacts.php?limit=500');
            const data = await response.json();
            
            if (data.success) {
                this.state.contacts = data.contacts || [];
                console.log(`Loaded ${this.state.contacts.length} contacts for list`);
            } else {
                throw new Error(data.error || 'Errore nel caricamento contatti');
            }
        } catch (error) {
            console.error('Error loading all contacts:', error);
            throw error;
        }
    },
    
    renderContactsListModal() {
        console.log('Rendering contacts list modal');
        
        // Crea o aggiorna il modal per la lista contatti
        let modal = document.getElementById('contactsListModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'contactsListModal';
            modal.className = 'modal-overlay';
            document.body.appendChild(modal);
        }
        
        const modalContent = `
            <div class="modal-content contacts-list-modal">
                <div class="modal-header">
                    <h3>Seleziona Cliente</h3>
                    <button class="modal-close" onclick="LeadBoard.closeContactsListModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="contacts-list-search">
                        <input type="text" 
                               id="contactsListSearch" 
                               placeholder="🔍 Cerca nella lista..." 
                               class="form-input">
                    </div>
                    <div class="contacts-list-container" id="contactsListContainer">
                        ${this.renderContactsListItems(this.state.contacts)}
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="LeadBoard.closeContactsListModal()">Chiudi</button>
                </div>
            </div>
        `;
        
        modal.innerHTML = modalContent;
        modal.style.display = 'flex';
        modal.classList.add('show');
        document.body.classList.add('modal-open');
        
        // Chiudi modal cliccando fuori dal contenuto
        modal.addEventListener('click', (e) => {
            if (e.target.id === 'contactsListModal') {
                this.closeContactsListModal();
            }
        });
        
        // Setup search nella lista
        const searchInput = document.getElementById('contactsListSearch');
        if (searchInput) {
            searchInput.addEventListener('input', this.debounce((e) => {
                this.filterContactsList(e.target.value);
            }, 300));
            
            // Focus automatico sul campo ricerca
            setTimeout(() => searchInput.focus(), 300);
        }
    },
    
    renderContactsListItems(contacts) {
        if (!contacts || contacts.length === 0) {
            return '<div class="contacts-list-empty">Nessun cliente trovato</div>';
        }
        
        return contacts.map(contact => `
            <div class="contact-list-item" onclick="LeadBoard.selectContactFromList(${contact.id})">
                <div class="contact-list-info">
                    <div class="contact-list-header">
                        <div class="contact-list-name">${this.escapeHtml(contact.name)}</div>
                        <div class="contact-list-type ${contact.contact_type}">
                            ${contact.contact_type === 'company' ? '🏢' : '👤'} 
                            ${contact.contact_type === 'company' ? 'Azienda' : 'Persona'}
                        </div>
                    </div>
                    <div class="contact-list-details">
                        ${contact.email ? `<span>📧 ${this.escapeHtml(contact.email)}</span>` : ''}
                        ${contact.phone ? `<span>📞 ${this.escapeHtml(contact.phone)}</span>` : ''}
                        <span class="contact-status status-${contact.status}">${contact.status_label}</span>
                    </div>
                </div>
                <div class="contact-list-date">
                    ${contact.created_at_formatted}
                </div>
            </div>
        `).join('');
    },
    
    filterContactsList(query) {
        const filteredContacts = query.trim() === '' ? 
            this.state.contacts : 
            this.state.contacts.filter(contact => {
                const searchText = [
                    contact.name,
                    contact.email,
                    contact.phone,
                    contact.address
                ].filter(Boolean).join(' ').toLowerCase();
                
                return searchText.includes(query.toLowerCase());
            });
        
        const container = document.getElementById('contactsListContainer');
        if (container) {
            container.innerHTML = this.renderContactsListItems(filteredContacts);
        }
    },
    
    selectContactFromList(contactId) {
        console.log('Selecting contact from list:', contactId);
        this.selectContact(contactId);
        this.closeContactsListModal();
    },
    
    closeContactsListModal() {
        const modal = document.getElementById('contactsListModal');
        if (modal) {
            modal.classList.remove('show');
            modal.style.display = 'none';
            document.body.classList.remove('modal-open');
        }
    },
    
    handleContactModeChange(mode) {
        const existingSection = document.getElementById('existingContactSection');
        const newSection = document.getElementById('newContactSection');

        // Controlla se gli elementi esistono prima di accedere alle loro proprietà
        if (!existingSection || !newSection) {
            console.warn('Contact mode sections not found in DOM');
            return;
        }

        if (mode === 'existing') {
            existingSection.style.display = 'block';
            newSection.style.display = 'none';
            this.clearNewContactFields();
        } else {
            // Quando l'utente clicca "Crea Nuovo", apri la pagina anagrafica
            this.openAnagraficaPage();
            // Torna a "Seleziona Esistente" dopo aver mostrato il messaggio
            setTimeout(() => {
                const useExisting = document.getElementById('useExisting');
                if (useExisting) {
                    useExisting.checked = true;
                    existingSection.style.display = 'block';
                    newSection.style.display = 'none';
                }
            }, 100);
        }
    },

    openAnagraficaPage() {
        // Apri la pagina anagrafica in una nuova finestra
        const anagraficaUrl = '/modules/lead_contatti/contatti/index.php';
        const width = Math.min(1200, screen.width * 0.8);
        const height = Math.min(800, screen.height * 0.8);
        const left = (screen.width - width) / 2;
        const top = (screen.height - height) / 2;

        const anagraficaWindow = window.open(
            anagraficaUrl,
            'AnagraficaWindow',
            `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
        );

        if (!anagraficaWindow) {
            alert('Impossibile aprire la finestra dell\'anagrafica. Verifica che il browser non stia bloccando i popup.');
            return;
        }

        // Mostra un messaggio all'utente
        this.showNotification('Crea il contatto nella finestra aperta. Una volta salvato, torna qui e cercalo per selezionarlo.', 'info');

        // Ricarica la cache dei contatti quando la finestra viene chiusa
        const checkWindow = setInterval(() => {
            if (anagraficaWindow.closed) {
                clearInterval(checkWindow);
                console.log('Finestra anagrafica chiusa, ricarico cache contatti...');
                this.loadContactsCache();
            }
        }, 500);
    },
    
    async searchContacts(query) {
        if (!query || query.length < 2) {
            this.hideContactDropdown();
            return;
        }
        
        try {
            const response = await fetch(`/modules/lead_contatti/ajax/search_contacts.php?q=${encodeURIComponent(query)}&limit=10`);
            const data = await response.json();
            
            if (data.success) {
                this.showContactDropdown(data.contacts);
            } else {
                console.error('Search contacts error:', data.error);
                this.hideContactDropdown();
            }
        } catch (error) {
            console.error('Error searching contacts:', error);
            this.hideContactDropdown();
        }
    },
    
    showContactDropdown(contacts) {
        const dropdown = document.getElementById('contactDropdown');
        if (!dropdown) return;
        
        if (contacts.length === 0) {
            dropdown.innerHTML = '<div class="contact-dropdown-empty">Nessun cliente trovato</div>';
        } else {
            dropdown.innerHTML = contacts.map(contact => `
                <div class="contact-dropdown-item" onclick="LeadBoard.selectContact(${contact.id})">
                    <div class="contact-dropdown-name">${this.escapeHtml(contact.name)}</div>
                    <div class="contact-dropdown-details">
                        <span class="contact-dropdown-type ${contact.contact_type}">
                            ${contact.contact_type === 'company' ? '🏢' : '👤'} 
                            ${contact.contact_type === 'company' ? 'Azienda' : 'Persona'}
                        </span>
                        ${contact.email ? `<span>📧 ${this.escapeHtml(contact.email)}</span>` : ''}
                        ${contact.phone ? `<span>📞 ${this.escapeHtml(contact.phone)}</span>` : ''}
                    </div>
                </div>
            `).join('');
        }
        
        dropdown.style.display = 'block';
    },
    
    hideContactDropdown() {
        const dropdown = document.getElementById('contactDropdown');
        if (dropdown) {
            dropdown.style.display = 'none';
        }
    },
    
    async selectContact(contactId) {
        let contact = this.state.contacts.find(c => c.id === contactId);

        // Se il contatto non è in cache, caricalo dal server
        if (!contact) {
            console.log('Contact not in cache, loading from server:', contactId);
            try {
                const response = await fetch(`/modules/lead_contatti/ajax/get_contact.php?id=${contactId}`);
                const data = await response.json();

                if (data.success && data.contact) {
                    contact = data.contact;
                    // Aggiungi alla cache per usi futuri
                    this.state.contacts.push(contact);
                } else {
                    console.error('Failed to load contact:', data.error);
                    return;
                }
            } catch (error) {
                console.error('Error loading contact:', error);
                return;
            }
        }

        this.state.selectedContact = contact;
        
        // Aggiorna UI solo se gli elementi esistono
        const selectedContactIdEl = document.getElementById('selectedContactId');
        const contactSearchEl = document.getElementById('contactSearch');
        const selectedDiv = document.getElementById('selectedContact');
        
        if (selectedContactIdEl) selectedContactIdEl.value = contactId;
        if (contactSearchEl) contactSearchEl.value = contact.name;
        
        if (selectedDiv) {
            const nameEl = selectedDiv.querySelector('.selected-contact-name');
            const typeEl = selectedDiv.querySelector('.selected-contact-type');
            const detailsEl = selectedDiv.querySelector('.selected-contact-details');
            
            if (nameEl) nameEl.textContent = contact.name;
            
            if (typeEl) {
                typeEl.innerHTML = `
                    ${contact.contact_type === 'company' ? '🏢' : '👤'} 
                    ${contact.contact_type === 'company' ? 'Azienda' : 'Persona'}
                `;
                typeEl.className = `selected-contact-type ${contact.contact_type}`;
            }
            
            if (detailsEl) {
                const details = [];
                if (contact.email) details.push(`📧 ${contact.email}`);
                if (contact.phone) details.push(`📞 ${contact.phone}`);
                detailsEl.innerHTML = details.join(' • ');
            }
            
            selectedDiv.style.display = 'flex';
        }
        
        this.hideContactDropdown();
        
        console.log('Cliente selezionato:', contact.name);
    },
    
    clearSelectedContact() {
        this.state.selectedContact = null;
        const selectedContactId = document.getElementById('selectedContactId');
        const contactSearch = document.getElementById('contactSearch');
        const selectedContact = document.getElementById('selectedContact');
        
        if (selectedContactId) selectedContactId.value = '';
        if (contactSearch) contactSearch.value = '';
        if (selectedContact) selectedContact.style.display = 'none';
        
        this.hideContactDropdown();
        
        // Focus sul campo ricerca solo se esiste
        if (contactSearch) contactSearch.focus();
    },
    
    clearNewContactFields() {
        const fields = ['newContactName', 'newContactType', 'newContactEmail', 'newContactPhone'];
        fields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                if (field.tagName === 'SELECT') {
                    field.selectedIndex = 0;
                } else {
                    field.value = '';
                }
            }
        });
    },
    
    setupModalCloseHandlers() {
        // Close modal on overlay click
        const leadModal = document.getElementById('leadModal');
        if (leadModal) {
            leadModal.addEventListener('click', (e) => {
                if (e.target.id === 'leadModal') {
                    this.closeModal();
                }
            });
        }
        
        const leadDetailsModal = document.getElementById('leadDetailsModal');
        if (leadDetailsModal) {
            leadDetailsModal.addEventListener('click', (e) => {
                if (e.target.id === 'leadDetailsModal') {
                    this.closeModal();
                }
            });
        }
        
        // Close modal on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const expandedModal = document.getElementById('expandedColumnModal');
                const leadModal = document.getElementById('leadModal');
                const detailsModal = document.getElementById('leadDetailsModal');
                const contactsModal = document.getElementById('contactsListModal');

                // Chiudi il modal espanso per primo se aperto
                if (expandedModal && expandedModal.style.display === 'flex') {
                    this.closeExpandedColumn();
                } else if (leadModal?.classList.contains('show')) {
                    this.closeModal();
                } else if (detailsModal?.classList.contains('show')) {
                    this.closeModal();
                } else if (contactsModal?.classList.contains('show')) {
                    this.closeContactsListModal();
                }
            }
        });
        
        // Prevent modal close when clicking inside modal content
        document.querySelectorAll('.modal-content').forEach(content => {
            content.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        });
    },

    // === CARICAMENTO LEAD ===
    
    async loadLeads() {
        try {
            this.showColumnLoaders();
            
            const response = await fetch(`${this.config.apiBase}get_leads.php`);
            const data = await response.json();
            
            if (data.success) {
                this.state.leads = data.leads || [];
                this.filterLeads();
                this.updateStats(data.stats);
                this.hideColumnLoaders();
            } else {
                throw new Error(data.message || 'Errore nel caricamento lead');
            }
            
        } catch (error) {
            console.error('Error loading leads:', error);
            this.showError('Errore nel caricamento lead: ' + error.message);
            this.hideColumnLoaders();
        }
    },

    // === FILTRI ===
    
    handlePriorityFilter(e) {
        const buttons = document.querySelectorAll('.priority-filter-btn');
        buttons.forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');
        
        this.state.currentFilters.priority = e.target.dataset.priority;
        this.filterLeads();
    },
    
    filterLeads() {
        const { priority, minValue, maxValue, search } = this.state.currentFilters;
        
        this.state.filteredLeads = this.state.leads.filter(lead => {
            // Filtro priorità
            if (priority !== 'all' && lead.priorita !== priority) {
                return false;
            }
            
            // Filtro valore minimo
            if (minValue && parseFloat(lead.somma_lavoro) < parseFloat(minValue)) {
                return false;
            }
            
            // Filtro valore massimo
            if (maxValue && parseFloat(lead.somma_lavoro) > parseFloat(maxValue)) {
                return false;
            }
            
            // Filtro ricerca
            if (search) {
                const searchLower = search.toLowerCase();
                const searchFields = [
                    lead.nome_cliente,
                    lead.servizio,
                    lead.descrizione,
                    lead.note
                ].filter(field => field).join(' ').toLowerCase();
                
                if (!searchFields.includes(searchLower)) {
                    return false;
                }
            }
            
            return true;
        });
        
        this.renderLeads();
    },

    // === RENDERING ===
    
    renderLeads() {
        // Raggruppa lead per colonna
        const leadsByColumn = {};
        this.config.columns.forEach(column => {
            leadsByColumn[column] = this.state.filteredLeads.filter(lead => lead.colonna === column);
        });
        
        // Renderizza ogni colonna
        this.config.columns.forEach(column => {
            this.renderColumn(column, leadsByColumn[column]);
        });
        
        // Aggiorna contatori nelle intestazioni colonne
        this.updateColumnCounters(leadsByColumn);
    },
    
    renderColumn(column, leads) {
        const container = document.getElementById(`content-${column}`);
        if (!container) return;
        
        if (leads.length === 0) {
            container.innerHTML = `
                <div class="empty-column">
                    <p style="text-align: center; color: var(--text-light); font-size: 13px; padding: 20px;">
                        Nessun lead in questa colonna
                    </p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = leads.map(lead => this.renderLeadCard(lead)).join('');
        
        // Setup drag and drop per le nuove card
        this.setupCardDragAndDrop(container);
    },
    
    renderLeadCard(lead) {
        const priorityClass = lead.priorita || 'media';
        const formattedValue = new Intl.NumberFormat('it-IT', {
            style: 'currency',
            currency: 'EUR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(lead.somma_lavoro);
        
        const sourceIcon = this.getSourceIcon(lead.fonte);
        const dateInfo = lead.data_contatto ? 
            new Date(lead.data_contatto).toLocaleDateString('it-IT') : 
            new Date(lead.created_at).toLocaleDateString('it-IT');
        
        // Usa il nome dell'anagrafica se disponibile, altrimenti quello del lead
        const clientName = lead.display_name || lead.contact_name || lead.nome_cliente;
        const clientType = lead.contact_type ? (lead.contact_type === 'company' ? '🏢' : '👤') : '';
        
        // Telefono ed email: usa quelli specifici del lead se presenti, altrimenti quelli dell'anagrafica
        const displayPhone = lead.telefono || lead.display_phone || lead.contact_phone;
        const displayEmail = lead.email || lead.display_email || lead.contact_email;
        
        return `
            <div class="lead-card" 
                 data-lead-id="${lead.id}" 
                 data-column="${lead.colonna}"
                 draggable="true"
                 onclick="LeadBoard.openLeadDetails(${lead.id})">
                
                <div class="lead-header">
                    <h4 class="lead-client">
                        ${clientType} ${this.escapeHtml(clientName)}
                        ${lead.contact_id ? '<span class="client-linked" title="Cliente dall\'anagrafica"></span>' : ''}
                    </h4>
                    <div class="lead-priority ${priorityClass}"></div>
                </div>
                
                <div class="lead-service">${this.escapeHtml(lead.servizio)}</div>
                
                <div class="lead-value">${formattedValue}</div>
                
                <div class="lead-meta">
                    ${lead.fonte ? `
                        <div class="lead-meta-item">
                            <span class="lead-source">${sourceIcon} ${this.getSourceLabel(lead.fonte)}</span>
                        </div>
                    ` : ''}
                    
                    <div class="lead-meta-item">
                        <span class="lead-date">${dateInfo}</span>
                    </div>
                    
                    ${displayPhone ? `
                        <div class="lead-meta-item">
                            <span class="lead-date">${this.escapeHtml(displayPhone)}</span>
                        </div>
                    ` : ''}
                    
                    ${displayEmail ? `
                        <div class="lead-meta-item">
                            <span class="lead-date">${this.truncateText(this.escapeHtml(displayEmail), 20)}</span>
                        </div>
                    ` : ''}
                </div>
                
                <div class="lead-actions">
                    <button class="lead-action-btn" onclick="event.stopPropagation(); LeadBoard.editLead(${lead.id})" title="Modifica">
                        ✏️
                    </button>
                    <button class="lead-action-btn danger" onclick="event.stopPropagation(); LeadBoard.deleteLead(${lead.id})" title="Elimina">
                        🗑️
                    </button>
                </div>
            </div>
        `;
    },
    
    updateColumnCounters(leadsByColumn) {
        this.config.columns.forEach(column => {
            const countEl = document.querySelector(`#column-${column} .column-count`);
            const valueEl = document.querySelector(`#column-${column} .column-value`);
            
            if (countEl && valueEl) {
                const leads = leadsByColumn[column] || [];
                const totalValue = leads.reduce((sum, lead) => sum + parseFloat(lead.somma_lavoro), 0);
                
                countEl.textContent = leads.length;
                valueEl.textContent = new Intl.NumberFormat('it-IT', {
                    style: 'currency',
                    currency: 'EUR',
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0
                }).format(totalValue);
            }
        });
    },

    // === DRAG & DROP ===
    
    setupDragAndDrop() {
        // Setup drop zones (column contents)
        this.config.columns.forEach(column => {
            const dropZone = document.getElementById(`content-${column}`);
            if (dropZone) {
                dropZone.addEventListener('dragover', (e) => this.handleDragOver(e));
                dropZone.addEventListener('drop', (e) => this.handleDrop(e, column));
                dropZone.addEventListener('dragenter', (e) => this.handleDragEnter(e));
                dropZone.addEventListener('dragleave', (e) => this.handleDragLeave(e));
            }
        });
    },
    
    setupCardDragAndDrop(container) {
        const cards = container.querySelectorAll('.lead-card');
        cards.forEach(card => {
            card.addEventListener('dragstart', (e) => this.handleDragStart(e));
            card.addEventListener('dragend', (e) => this.handleDragEnd(e));
        });
    },
    
    handleDragStart(e) {
        this.state.isDragging = true;
        this.state.draggedLead = {
            id: parseInt(e.target.dataset.leadId),
            originalColumn: e.target.dataset.column
        };
        
        e.target.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', e.target.outerHTML);
    },
    
    handleDragEnd(e) {
        this.state.isDragging = false;
        e.target.classList.remove('dragging');
        
        // Rimuovi tutti i visual feedback
        document.querySelectorAll('.column-content').forEach(content => {
            content.classList.remove('drag-over');
        });
    },
    
    handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    },
    
    handleDragEnter(e) {
        e.preventDefault();
        if (this.state.isDragging) {
            e.currentTarget.classList.add('drag-over');
        }
    },
    
    handleDragLeave(e) {
        // Solo rimuovi se stiamo lasciando l'elemento corrente, non i suoi children
        if (!e.currentTarget.contains(e.relatedTarget)) {
            e.currentTarget.classList.remove('drag-over');
        }
    },
    
    async handleDrop(e, targetColumn) {
        e.preventDefault();
        e.currentTarget.classList.remove('drag-over');
        
        if (!this.state.draggedLead) return;
        
        const leadId = this.state.draggedLead.id;
        const originalColumn = this.state.draggedLead.originalColumn;
        
        // Se è nella stessa colonna, non fare niente
        if (originalColumn === targetColumn) {
            this.state.draggedLead = null;
            return;
        }
        
        try {
            // Mostra loading nell'elemento trascinato
            const draggedElement = document.querySelector(`[data-lead-id="${leadId}"]`);
            if (draggedElement) {
                draggedElement.style.opacity = '0.5';
                draggedElement.style.pointerEvents = 'none';
            }
            
            // Aggiorna lead sul server
            await this.moveLead(leadId, targetColumn);
            
            // Mostra toast di successo
            this.showDragToast(`Lead spostato in "${this.getColumnLabel(targetColumn)}"`);
            
        } catch (error) {
            console.error('Error moving lead:', error);
            this.showError('Errore nello spostamento: ' + error.message);
        } finally {
            this.state.draggedLead = null;
        }
    },
    
    async moveLead(leadId, newColumn) {
        // CONTROLLO CSRF TOKEN - VERSIONE CORRETTA
        const csrfTokenEl = document.querySelector('input[name="csrf_token"]');
        if (!csrfTokenEl) {
            throw new Error('Token CSRF non trovato nel DOM');
        }
        
        const formData = new FormData();
        formData.append('lead_id', leadId);
        formData.append('new_column', newColumn);
        formData.append('csrf_token', csrfTokenEl.value);
        
        const response = await fetch(`${this.config.apiBase}move_lead.php`, {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Ricarica i lead per aggiornare la vista
            await this.loadLeads();
        } else {
            throw new Error(data.message || 'Errore nello spostamento');
        }
    },

    // === MODAL MANAGEMENT ===
    
    openAddLeadModal(defaultColumn = 'da_contattare') {
        this.resetForm();
        
        const modalTitle = document.getElementById('leadModalTitle');
        const leadColumn = document.getElementById('leadColumn');
        
        if (modalTitle) modalTitle.textContent = 'Nuovo Lead';
        if (leadColumn) leadColumn.value = defaultColumn;
        
        this.updateConditionalFields();
        
        const modal = document.getElementById('leadModal');
        if (modal) {
            console.log('Opening add lead modal');
            
            // Prima nasconde tutti i modal
            this.forceHideModals();
            
            // Sposta il modal alla fine del body se non ci sta già
            if (modal.parentElement !== document.body) {
                console.log('Moving modal to body');
                document.body.appendChild(modal);
            }
            
            // Applica gli stili immediatamente
            this.applyModalStyles(modal);
            
            // Focus sul primo campo disponibile dopo un piccolo delay
            setTimeout(() => {
                const firstField = document.getElementById('contactSearch') || 
                                 document.getElementById('newContactName') || 
                                 document.getElementById('servizio');
                if (firstField) {
                    firstField.focus();
                }
            }, 300);
        } else {
            console.error('Modal leadModal not found!');
        }
    },
    
    applyModalStyles(modal) {
        // Rimuovi tutti gli stili esistenti
        modal.removeAttribute('style');
        modal.className = 'modal-overlay show';
        
        // Applica stili con massima priorità
        const styles = [
            'position: fixed !important',
            'top: 0 !important',
            'left: 0 !important',
            'right: 0 !important', 
            'bottom: 0 !important',
            'width: 100vw !important',
            'height: 100vh !important',
            'z-index: 9998',
            'display: flex !important',
            'justify-content: center !important',
            'align-items: center !important',
            'background: rgba(0, 0, 0, 0.6) !important',
            'backdrop-filter: blur(8px) !important',
            'visibility: visible !important',
            'opacity: 1 !important',
            'overflow-y: auto !important'
        ].join('; ');
        
        modal.setAttribute('style', styles);
        
        // Aggiungi stili al body
        document.body.classList.add('modal-open');
        document.body.style.cssText += 'overflow: hidden !important;';
        
        console.log('Modal styles applied');
    },
    
    async openLeadDetails(leadId) {
        try {
            const response = await fetch(`${this.config.apiBase}get_lead.php?id=${leadId}`);
            const data = await response.json();
            
            if (data.success) {
                this.renderLeadDetails(data.lead);
                const modal = document.getElementById('leadDetailsModal');
                if (modal) {
                    // Prima nasconde tutti i modal
                    this.forceHideModals();
                    
                    // Poi mostra il modal corretto come overlay
                    setTimeout(() => {
                        this.applyModalStyles(modal);
                    }, 50);
                }
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            console.error('Error loading lead details:', error);
            this.showError('Errore nel caricamento dettagli: ' + error.message);
        }
    },
    
    async editLead(leadId) {
        try {
            console.log('Editing lead:', leadId);
            const response = await fetch(`${this.config.apiBase}get_lead.php?id=${leadId}`);
            const data = await response.json();
            
            if (data.success) {
                console.log('Lead data loaded:', data.lead);
                this.populateForm(data.lead);
                
                const modalTitle = document.getElementById('leadModalTitle');
                if (modalTitle) modalTitle.textContent = 'Modifica Lead';
                
                const modal = document.getElementById('leadModal');
                if (modal) {
                    console.log('Opening edit lead modal');
                    
                    // Prima nasconde tutti i modal
                    this.forceHideModals();
                    
                    // Applica gli stili
                    this.applyModalStyles(modal);
                    
                    // Focus sul primo campo disponibile
                    setTimeout(() => {
                        const firstField = document.getElementById('contactSearch') || 
                                         document.getElementById('newContactName') || 
                                         document.getElementById('servizio');
                        if (firstField) {
                            firstField.focus();
                        }
                    }, 300);
                }
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            console.error('Error loading lead for edit:', error);
            this.showError('Errore nel caricamento lead: ' + error.message);
        }
    },
    
    closeModal(skipConfirmation = false) {
        // Se il form è stato modificato e non siamo in modalità skip, chiedi conferma
        if (this.state.formIsDirty && !skipConfirmation) {
            if (!confirm('Sei sicuro di voler chiudere e perdere tutti i dati?')) {
                return; // Annulla la chiusura
            }
        }

        const leadModal = document.getElementById('leadModal');
        const detailsModal = document.getElementById('leadDetailsModal');

        if (leadModal) {
            leadModal.classList.remove('show');
            leadModal.removeAttribute('style'); // Rimuovi tutti gli stili inline
            leadModal.style.display = 'none';
            leadModal.style.visibility = 'hidden';
        }

        if (detailsModal) {
            detailsModal.classList.remove('show');
            detailsModal.removeAttribute('style'); // Rimuovi tutti gli stili inline
            detailsModal.style.display = 'none';
            detailsModal.style.visibility = 'hidden';
        }

        // Ripristina body
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';

        this.resetForm();
    },

    // === FORM MANAGEMENT ===
    
    async handleFormSubmit(e) {
        e.preventDefault();
        
        if (!this.validateForm()) {
            return;
        }
        
        const formData = new FormData(e.target);
        
        try {
            this.setFormLoading(true);
            
            const response = await fetch(`${this.config.apiBase}save_lead.php`, {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showSuccess(data.message);
                this.closeModal(true); // Salta la conferma perché il form è stato salvato
                this.loadLeads(); // Ricarica i lead
            } else {
                throw new Error(data.message || 'Errore nel salvataggio');
            }
            
        } catch (error) {
            console.error('Error saving lead:', error);
            this.showError('Errore nel salvataggio: ' + error.message);
        } finally {
            this.setFormLoading(false);
        }
    },
    
    validateForm() {
        const contactModeRadio = document.querySelector('input[name="contact_mode"]:checked');
        const contactMode = contactModeRadio ? contactModeRadio.value : 'existing';
        
        // Validazione cliente
        if (contactMode === 'existing') {
            const selectedContactIdEl = document.getElementById('selectedContactId');
            const selectedContactId = selectedContactIdEl ? selectedContactIdEl.value : '';
            
            if (!selectedContactId) {
                this.showError('Seleziona un cliente esistente o passa a "Crea Nuovo"');
                const contactSearchEl = document.getElementById('contactSearch');
                if (contactSearchEl) contactSearchEl.focus();
                return false;
            }
        } else {
            const newContactNameEl = document.getElementById('newContactName');
            const newContactName = newContactNameEl ? newContactNameEl.value.trim() : '';
            
            if (!newContactName) {
                this.showError('Il nome del nuovo cliente è obbligatorio');
                if (newContactNameEl) newContactNameEl.focus();
                return false;
            }
            
            const newContactEmailEl = document.getElementById('newContactEmail');
            const newContactEmail = newContactEmailEl ? newContactEmailEl.value.trim() : '';
            
            if (newContactEmail && !this.isValidEmail(newContactEmail)) {
                this.showError('Inserisci un indirizzo email valido per il nuovo cliente');
                if (newContactEmailEl) newContactEmailEl.focus();
                return false;
            }
        }
        
        // Validazione servizio
        const servizioEl = document.getElementById('servizio');
        const servizio = servizioEl ? servizioEl.value.trim() : '';
        
        if (!servizio) {
            this.showError('Il servizio è obbligatorio');
            if (servizioEl) servizioEl.focus();
            return false;
        }
        
        // Validazione valore
        const sommaLavoroEl = document.getElementById('sommaLavoro');
        const sommaLavoro = sommaLavoroEl ? sommaLavoroEl.value.trim() : '';
        
        if (!sommaLavoro || parseFloat(sommaLavoro) < 0) {
            this.showError('Inserisci un valore progetto valido');
            if (sommaLavoroEl) sommaLavoroEl.focus();
            return false;
        }
        
        // Validazione email lead specifica (opzionale)
        const emailLeadEl = document.getElementById('emailLead');
        const emailLead = emailLeadEl ? emailLeadEl.value.trim() : '';
        
        if (emailLead && !this.isValidEmail(emailLead)) {
            this.showError('Inserisci un indirizzo email valido per il lead');
            if (emailLeadEl) emailLeadEl.focus();
            return false;
        }
        
        return true;
    },
    
    resetForm() {
        const form = document.getElementById('leadForm');
        if (form) {
            form.reset();
        }

        // Reset flag form modificato
        this.state.formIsDirty = false;

        // Reset campi specifici solo se esistono
        const fields = {
            'leadId': '',
            'leadColumn': 'da_contattare',
            'priorita': 'media',
            'selectedContactId': ''
        };

        Object.entries(fields).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.value = value;
            }
        });

        // Reset selezione contatto
        this.clearSelectedContact();

        // Reset modalità contatto solo se gli elementi esistono
        const useExisting = document.getElementById('useExisting');
        if (useExisting) {
            useExisting.checked = true;
            this.handleContactModeChange('existing');
        }
        
        this.updateConditionalFields();
    },
    
    populateForm(lead) {
        console.log('Populating form with lead:', lead);
        
        // Helper function per impostare valore solo se l'elemento esiste
        const setValueIfExists = (id, value) => {
            const element = document.getElementById(id);
            if (element) {
                element.value = value || '';
                console.log(`Set ${id} = ${value}`);
            } else {
                console.warn(`Element with ID '${id}' not found`);
            }
        };
        
        // Campi base del lead
        setValueIfExists('leadId', lead.id);
        setValueIfExists('servizio', lead.servizio);
        setValueIfExists('sommaLavoro', lead.somma_lavoro);
        setValueIfExists('emailLead', lead.email);
        setValueIfExists('telefonoLead', lead.telefono);
        setValueIfExists('priorita', lead.priorita || 'media');
        setValueIfExists('fonte', lead.fonte);
        setValueIfExists('descrizione', lead.descrizione);
        setValueIfExists('noteLead', lead.note);
        setValueIfExists('leadColumn', lead.colonna || 'da_contattare');
        
        // Date con controllo formato
        if (lead.data_contatto) {
            const dateValue = lead.data_contatto.includes(' ') ? 
                lead.data_contatto.split(' ')[0] : lead.data_contatto;
            setValueIfExists('dataContatto', dateValue);
        }
        
        if (lead.data_chiusura) {
            const dateValue = lead.data_chiusura.includes(' ') ? 
                lead.data_chiusura.split(' ')[0] : lead.data_chiusura;
            setValueIfExists('dataChiusuraInput', dateValue);
        }
        
        setValueIfExists('motivoPerditaText', lead.motivo_perdita);
        
        // Gestione anagrafica per modifica
        if (lead.contact_id) {
            console.log('Lead has contact_id:', lead.contact_id);
            // Se ha un contact_id, imposta modalità "existing" e carica l'anagrafica
            const existingRadio = document.getElementById('useExisting');
            if (existingRadio) {
                existingRadio.checked = true;
                this.handleContactModeChange('existing');
                
                // Simula la selezione del contatto
                const contactData = {
                    id: lead.contact_id,
                    name: lead.contact_name || lead.display_name || lead.nome_cliente,
                    email: lead.contact_email,
                    phone: lead.contact_phone,
                    contact_type: lead.contact_type || 'person'
                };
                
                // Aggiungi alla cache se non presente
                const existingContact = this.state.contacts.find(c => c.id === lead.contact_id);
                if (!existingContact) {
                    this.state.contacts.push(contactData);
                }
                
                // Seleziona il contatto
                this.selectContact(lead.contact_id);
            }
        } else {
            console.log('Lead has no contact_id, using new contact mode');
            // Se non ha contact_id, usa modalità "new" e popola i campi
            const newRadio = document.getElementById('createNew');
            if (newRadio) {
                newRadio.checked = true;
                this.handleContactModeChange('new');
                
                setValueIfExists('newContactName', lead.nome_cliente);
                setValueIfExists('newContactEmail', lead.email);
                setValueIfExists('newContactPhone', lead.telefono);
            }
        }
        
        this.updateConditionalFields();
        console.log('Form populated successfully');
    },
    
    // VERSIONE CORRETTA - CONTROLLO ESISTENZA ELEMENTO
    updateConditionalFields() {
        const leadColumnEl = document.getElementById('leadColumn');
        if (!leadColumnEl) {
            console.warn('Element leadColumn not found');
            return;
        }
        
        const column = leadColumnEl.value;
        const motivoPerdita = document.getElementById('motivoPerdita');
        const dataChiusura = document.getElementById('dataChiusura');
        
        // Mostra/nascondi campi basato sulla colonna
        if (motivoPerdita) {
            motivoPerdita.style.display = column === 'persi' ? 'block' : 'none';
        }
        
        if (dataChiusura) {
            dataChiusura.style.display = column === 'chiusi' ? 'block' : 'none';
        }
    },

    // === DELETE LEAD ===
    
    async deleteLead(leadId) {
        if (!confirm('Sei sicuro di voler eliminare questo lead? Questa azione non può essere annullata.')) {
            return;
        }
        
        try {
            // CONTROLLO CSRF TOKEN - VERSIONE CORRETTA
            const csrfTokenEl = document.querySelector('input[name="csrf_token"]');
            if (!csrfTokenEl) {
                throw new Error('Token CSRF non trovato nel DOM');
            }
            
            const formData = new FormData();
            formData.append('lead_id', leadId);
            formData.append('csrf_token', csrfTokenEl.value);
            
            const response = await fetch(`${this.config.apiBase}delete_lead.php`, {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showSuccess('Lead eliminato con successo');
                this.loadLeads();
            } else {
                throw new Error(data.message);
            }
            
        } catch (error) {
            console.error('Error deleting lead:', error);
            this.showError('Errore nell\'eliminazione: ' + error.message);
        }
    },

    // === UTILITY FUNCTIONS ===
    
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },
    
    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return String(text).replace(/[&<>"']/g, (m) => map[m]);
    },
    
    truncateText(text, maxLength) {
        if (!text) return '';
        if (text.length <= maxLength) return text;
        return text.substr(0, maxLength) + '...';
    },
    
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },
    
    getSourceIcon(fonte) {
        // Rimosso emoji - ritorna stringa vuota
        return '';
    },
    
    getSourceLabel(fonte) {
        const labels = {
            web: 'Web',
            telefono: 'Telefono',
            email: 'Email',
            referral: 'Referral',
            passaparola: 'Passaparola',
            social: 'Social',
            evento: 'Evento',
            altro: 'Altro'
        };
        return labels[fonte] || 'Altro';
    },
    
    getColumnLabel(column) {
        const labels = {
            da_contattare: 'Da Contattare',
            contattati: 'Contattati',
            chiusi: 'Chiusi',
            persi: 'Persi'
        };
        return labels[column] || column;
    },

    // === AUTO REFRESH ===
    
    startAutoRefresh() {
        this.state.autoRefreshTimer = setInterval(() => {
            // Solo se non stiamo trascinando o non ci sono modal aperti
            if (!this.state.isDragging && !document.querySelector('.modal-overlay.show')) {
                this.loadLeads();
            }
        }, this.config.autoRefreshInterval);
    },
    
    stopAutoRefresh() {
        if (this.state.autoRefreshTimer) {
            clearInterval(this.state.autoRefreshTimer);
            this.state.autoRefreshTimer = null;
        }
    },

    // === UI HELPERS ===
    
    showColumnLoaders() {
        this.config.columns.forEach(column => {
            const container = document.getElementById(`content-${column}`);
            if (container) {
                container.innerHTML = `
                    <div class="column-loader">
                        <div class="loading-spinner"></div>
                        <p>Caricamento...</p>
                    </div>
                `;
            }
        });
    },
    
    hideColumnLoaders() {
        // I loader vengono sostituiti dal contenuto durante il rendering
    },
    
    setFormLoading(loading) {
        const saveBtn = document.getElementById('saveLeadBtn');
        if (saveBtn) {
            if (loading) {
                saveBtn.disabled = true;
                saveBtn.textContent = 'Salvataggio...';
            } else {
                saveBtn.disabled = false;
                saveBtn.textContent = 'Salva Lead';
            }
        }
    },
    
    updateStats(stats) {
        // Aggiorna le statistiche nell'header se fornite
        if (stats) {
            const totalValueEl = document.querySelector('.overview-value');
            if (totalValueEl && stats.total_value !== undefined) {
                totalValueEl.textContent = new Intl.NumberFormat('it-IT', {
                    style: 'currency',
                    currency: 'EUR',
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0
                }).format(stats.total_value);
            }
        }
    },
    
    renderLeadDetails(lead) {
        const modalTitle = document.getElementById('detailsLeadModalTitle');
        const modalBody = document.getElementById('leadDetailsBody');
        const priorityIndicator = document.getElementById('detailsPriorityIndicator');
        
        if (modalTitle) modalTitle.textContent = lead.nome_cliente;
        if (priorityIndicator) priorityIndicator.className = `lead-priority-indicator ${lead.priorita}`;
        
        const formattedValue = new Intl.NumberFormat('it-IT', {
            style: 'currency',
            currency: 'EUR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(lead.somma_lavoro);
        
        if (modalBody) {
            modalBody.innerHTML = `
                <div class="lead-details-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px;">
                    <div class="details-section" style="background: var(--background-light); padding: 16px; border-radius: var(--border-radius); border: 1px solid var(--border-light);">
                        <h4 style="font-size: 14px; font-weight: 600; color: var(--text-primary); margin: 0 0 12px 0; border-bottom: 1px solid var(--border-light); padding-bottom: 8px;">Informazioni Base</h4>
                        <div class="details-item" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; font-size: 13px;">
                            <span style="color: var(--text-secondary); font-weight: 500;">Servizio:</span>
                            <span style="color: var(--text-primary); font-weight: 500; text-align: right;">${this.escapeHtml(lead.servizio)}</span>
                        </div>
                        <div class="details-item" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; font-size: 13px;">
                            <span style="color: var(--text-secondary); font-weight: 500;">Valore:</span>
                            <span style="color: var(--text-primary); font-weight: 500; text-align: right;">${formattedValue}</span>
                        </div>
                        <div class="details-item" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; font-size: 13px;">
                            <span style="color: var(--text-secondary); font-weight: 500;">Priorità:</span>
                            <span style="color: var(--text-primary); font-weight: 500; text-align: right;">
                                <span class="lead-priority-indicator ${lead.priorita}" style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 6px;"></span>
                                ${lead.priorita.charAt(0).toUpperCase() + lead.priorita.slice(1)}
                            </span>
                        </div>
                        <div class="details-item" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; font-size: 13px;">
                            <span style="color: var(--text-secondary); font-weight: 500;">Colonna:</span>
                            <span style="color: var(--text-primary); font-weight: 500; text-align: right;">${this.getColumnLabel(lead.colonna)}</span>
                        </div>
                        ${lead.fonte ? `
                            <div class="details-item" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; font-size: 13px;">
                                <span style="color: var(--text-secondary); font-weight: 500;">Fonte:</span>
                                <span style="color: var(--text-primary); font-weight: 500; text-align: right;">${this.getSourceIcon(lead.fonte)} ${this.getSourceLabel(lead.fonte)}</span>
                            </div>
                        ` : ''}
                    </div>
                    
                    <div class="details-section" style="background: var(--background-light); padding: 16px; border-radius: var(--border-radius); border: 1px solid var(--border-light);">
                        <h4 style="font-size: 14px; font-weight: 600; color: var(--text-primary); margin: 0 0 12px 0; border-bottom: 1px solid var(--border-light); padding-bottom: 8px;">Contatti</h4>
                        ${lead.email ? `
                            <div class="details-item" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; font-size: 13px;">
                                <span style="color: var(--text-secondary); font-weight: 500;">Email:</span>
                                <span style="color: var(--text-primary); font-weight: 500; text-align: right;">${this.escapeHtml(lead.email)}</span>
                            </div>
                        ` : ''}
                        ${lead.telefono ? `
                            <div class="details-item" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; font-size: 13px;">
                                <span style="color: var(--text-secondary); font-weight: 500;">Telefono:</span>
                                <span style="color: var(--text-primary); font-weight: 500; text-align: right;">${this.escapeHtml(lead.telefono)}</span>
                            </div>
                        ` : ''}
                        ${lead.data_contatto ? `
                            <div class="details-item" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; font-size: 13px;">
                                <span style="color: var(--text-secondary); font-weight: 500;">Data contatto:</span>
                                <span style="color: var(--text-primary); font-weight: 500; text-align: right;">${new Date(lead.data_contatto).toLocaleDateString('it-IT')}</span>
                            </div>
                        ` : ''}
                        ${lead.data_chiusura ? `
                            <div class="details-item" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; font-size: 13px;">
                                <span style="color: var(--text-secondary); font-weight: 500;">Data chiusura:</span>
                                <span style="color: var(--text-primary); font-weight: 500; text-align: right;">${new Date(lead.data_chiusura).toLocaleDateString('it-IT')}</span>
                            </div>
                        ` : ''}
                        <div class="details-item" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; font-size: 13px;">
                            <span style="color: var(--text-secondary); font-weight: 500;">Creato il:</span>
                            <span style="color: var(--text-primary); font-weight: 500; text-align: right;">${new Date(lead.created_at).toLocaleDateString('it-IT')}</span>
                        </div>
                    </div>
                </div>
                
                ${lead.descrizione ? `
                    <div class="details-section" style="background: var(--background-light); padding: 16px; border-radius: var(--border-radius); border: 1px solid var(--border-light); margin-bottom: 16px;">
                        <h4 style="font-size: 14px; font-weight: 600; color: var(--text-primary); margin: 0 0 12px 0; border-bottom: 1px solid var(--border-light); padding-bottom: 8px;">Descrizione</h4>
                        <div style="background: var(--background-main); padding: 12px; border-radius: var(--border-radius); border: 1px solid var(--border-light); font-size: 13px; line-height: 1.5; color: var(--text-primary);">${this.escapeHtml(lead.descrizione)}</div>
                    </div>
                ` : ''}
                
                ${lead.note ? `
                    <div class="details-section" style="background: var(--background-light); padding: 16px; border-radius: var(--border-radius); border: 1px solid var(--border-light); margin-bottom: 16px;">
                        <h4 style="font-size: 14px; font-weight: 600; color: var(--text-primary); margin: 0 0 12px 0; border-bottom: 1px solid var(--border-light); padding-bottom: 8px;">Note</h4>
                        <div style="background: var(--background-main); padding: 12px; border-radius: var(--border-radius); border: 1px solid var(--border-light); font-size: 13px; line-height: 1.5; color: var(--text-primary); font-style: italic;">${this.escapeHtml(lead.note)}</div>
                    </div>
                ` : ''}
                
                ${lead.motivo_perdita ? `
                    <div class="details-section" style="background: rgba(239, 68, 68, 0.05); padding: 16px; border-radius: var(--border-radius); border: 1px solid rgba(239, 68, 68, 0.2); margin-bottom: 16px;">
                        <h4 style="font-size: 14px; font-weight: 600; color: var(--priority-alta); margin: 0 0 12px 0; border-bottom: 1px solid rgba(239, 68, 68, 0.2); padding-bottom: 8px;">Motivo Perdita</h4>
                        <div style="background: var(--background-main); padding: 12px; border-radius: var(--border-radius); border: 1px solid var(--border-light); font-size: 13px; line-height: 1.5; color: var(--text-primary);">${this.escapeHtml(lead.motivo_perdita)}</div>
                    </div>
                ` : ''}
            `;
        }
        
        // Setup action buttons
        const editBtn = document.getElementById('editLeadBtn');
        const deleteBtn = document.getElementById('deleteLeadBtn');
        
        if (editBtn) {
            editBtn.onclick = () => {
                this.closeModal();
                this.editLead(lead.id);
            };
        }
        
        if (deleteBtn) {
            deleteBtn.onclick = () => {
                this.closeModal();
                this.deleteLead(lead.id);
            };
        }
    },
    
    async exportReport() {
        try {
            const response = await fetch(`${this.config.apiBase}export_leads.php`);
            const blob = await response.blob();
            
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `lead_report_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            this.showSuccess('Report esportato con successo!');
            
        } catch (error) {
            console.error('Error exporting report:', error);
            this.showError('Errore nell\'export: ' + error.message);
        }
    },
    
    showDragToast(message) {
        const toast = document.getElementById('dragToast');
        if (toast) {
            const messageEl = toast.querySelector('.toast-message');
            if (messageEl) {
                messageEl.textContent = message;
            }
            
            toast.classList.add('show');
            
            setTimeout(() => {
                toast.classList.remove('show');
            }, 3000);
        }
    },
    
    // === NOTIFICATION HELPERS ===
    
    showSuccess(message) {
        this.showNotification(message, 'success');
    },
    
    showError(message) {
        this.showNotification(message, 'error');
    },
    
    showNotification(message, type = 'info') {
        let toast = document.getElementById('kanban-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'kanban-toast';
            toast.style.cssText = `
                position: fixed;
                top: 80px;
                right: 20px;
                min-width: 300px;
                padding: 16px 20px;
                border-radius: 8px;
                font-size: 14px;
                font-weight: 500;
                z-index: 10000;
                transition: all 0.3s ease;
                transform: translateX(100%);
                opacity: 0;
            `;
            document.body.appendChild(toast);
        }
        
        const styles = {
            success: 'background: #22c55e; color: white; border: 1px solid #16a34a;',
            error: 'background: #ef4444; color: white; border: 1px solid #dc2626;',
            info: 'background: #3b82f6; color: white; border: 1px solid #2563eb;'
        };
        
        toast.style.cssText += styles[type];
        toast.textContent = message;
        
        setTimeout(() => {
            toast.style.transform = 'translateX(0)';
            toast.style.opacity = '1';
        }, 100);
        
        setTimeout(() => {
            toast.style.transform = 'translateX(100%)';
            toast.style.opacity = '0';
        }, 4000);
    },

    // === EXPANDED COLUMN ===

    expandColumn(columnId, columnTitle) {
        console.log('Expanding column:', columnId);

        // Ferma l'auto-refresh
        this.stopAutoRefresh();

        const modal = document.getElementById('expandedColumnModal');
        const modalTitle = document.getElementById('expandedColumnTitle');
        const modalContent = document.getElementById('expandedColumnContent');

        if (!modal || !modalTitle || !modalContent) {
            console.error('Expanded column modal elements not found');
            return;
        }

        // Imposta il titolo
        modalTitle.textContent = columnTitle;

        // Prendi tutti i lead della colonna
        const columnLeads = this.state.filteredLeads.filter(lead => lead.colonna === columnId);

        // Genera le card
        modalContent.innerHTML = columnLeads.map(lead => this.renderLeadCard(lead)).join('');

        // Aggiungi event listeners alle card clonate
        modalContent.querySelectorAll('.lead-card').forEach(card => {
            card.addEventListener('click', (e) => {
                // Previeni il click se si sta cliccando su un link o bottone
                if (e.target.closest('a') || e.target.closest('button')) {
                    return;
                }
                const leadId = parseInt(card.dataset.leadId);
                this.openLeadDetails(leadId);
            });
        });

        // Mostra il modal
        modal.style.display = 'flex';
        document.body.classList.add('modal-open');
        document.body.style.overflow = 'hidden';
    },

    closeExpandedColumn() {
        const modal = document.getElementById('expandedColumnModal');
        if (modal) {
            modal.style.display = 'none';
        }

        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';

        // Riavvia l'auto-refresh
        this.startAutoRefresh();
    }
};

// === INIZIALIZZAZIONE ===

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing LeadBoard...');
    
    setTimeout(() => {
        LeadBoard.init();
    }, 200);
});

// Cleanup quando si esce dalla pagina
window.addEventListener('beforeunload', () => {
    LeadBoard.stopAutoRefresh();
});

// Export per uso globale
window.LeadBoard = LeadBoard;