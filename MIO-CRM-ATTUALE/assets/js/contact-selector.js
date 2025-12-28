// File: /assets/js/contact-selector.js
// Componente JavaScript per selettore contatti riutilizzabile

const ContactSelector = {
    // Cache dei contatti
    contacts: [],
    
    // Configurazione
    config: {
        apiBase: '/modules/lead_contatti/ajax/',
        debounceDelay: 300,
        maxSuggestions: 5
    },
    
    // Inizializzazione
    init() {
        console.log('🔄 ContactSelector: Initializing...');
        this.loadContacts();
        this.setupEventListeners();
        console.log('✅ ContactSelector: Initialized');
    },
    
    // Carica tutti i contatti
    async loadContacts() {
        try {
            const response = await fetch(`${this.config.apiBase}get_contacts.php?exclude_leads=1&limit=1000`);
            const data = await response.json();
            
            if (data.success) {
                this.contacts = data.contacts || [];
                console.log(`📋 ContactSelector: Caricati ${this.contacts.length} contatti`);
            } else {
                throw new Error(data.error || 'Errore caricamento contatti');
            }
        } catch (error) {
            console.error('❌ ContactSelector: Errore caricamento contatti:', error);
            this.contacts = [];
        }
    },
    
    // Setup event listeners per tutti i selettori
    setupEventListeners() {
        // Event listener per input di ricerca
        document.addEventListener('input', (e) => {
            if (e.target.classList.contains('contact-search-input')) {
                this.handleSearchInput(e);
            }
        });
        
        // Event listener per focus/blur
        document.addEventListener('focus', (e) => {
            if (e.target.classList.contains('contact-search-input')) {
                this.handleSearchFocus(e);
            }
        }, true);
        
        document.addEventListener('blur', (e) => {
            if (e.target.classList.contains('contact-search-input')) {
                // Ritarda la chiusura per permettere il click sui suggerimenti
                setTimeout(() => this.handleSearchBlur(e), 150);
            }
        }, true);
        
        // Click outside per chiudere suggerimenti
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.contact-selector-wrapper')) {
                this.hideAllSuggestions();
            }
        });
    },
    
    // Gestisce input di ricerca con debounce
    handleSearchInput(e) {
        const fieldId = e.target.dataset.targetId;
        const query = e.target.value.trim();
        
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => {
            this.searchContacts(fieldId, query);
        }, this.config.debounceDelay);
    },
    
    // Focus sull'input
    handleSearchFocus(e) {
        const fieldId = e.target.dataset.targetId;
        const query = e.target.value.trim();
        
        if (query.length > 0) {
            this.searchContacts(fieldId, query);
        }
    },
    
    // Blur dall'input
    handleSearchBlur(e) {
        const fieldId = e.target.dataset.targetId;
        this.hideSuggestions(fieldId);
    },
    
    // Ricerca contatti
    searchContacts(fieldId, query) {
        if (query.length < 2) {
            this.hideSuggestions(fieldId);
            return;
        }
        
        const results = this.contacts.filter(contact => {
            const searchText = [
                contact.name,
                contact.email,
                contact.phone,
                contact.partita_iva,
                contact.codice_fiscale
            ].filter(field => field).join(' ').toLowerCase();
            
            return searchText.includes(query.toLowerCase());
        }).slice(0, this.config.maxSuggestions);
        
        this.showSuggestions(fieldId, results, query);
    },
    
    // Mostra suggerimenti
    showSuggestions(fieldId, contacts, query) {
        const suggestionsContainer = document.getElementById(`${fieldId}_suggestions`);
        if (!suggestionsContainer) return;
        
        if (contacts.length === 0) {
            suggestionsContainer.innerHTML = `
                <div class="contact-suggestion-item no-results">
                    <div class="contact-icon">🔍</div>
                    <div class="contact-info">
                        <div class="contact-name">Nessun risultato per "${query}"</div>
                        <div class="contact-meta">Prova con altri termini o sfoglia la lista completa</div>
                    </div>
                </div>
            `;
        } else {
            suggestionsContainer.innerHTML = contacts.map(contact => 
                this.renderContactSuggestion(contact, fieldId)
            ).join('');
        }
        
        suggestionsContainer.style.display = 'block';
    },
    
    // Render singolo suggerimento
    renderContactSuggestion(contact, fieldId) {
        const typeIcon = contact.contact_type === 'company' ? '🏢' : '👤';
        const statusBadge = this.getStatusBadge(contact.status);
        
        return `
            <div class="contact-suggestion-item" 
                 onclick="ContactSelector.selectContact('${fieldId}', ${contact.id})">
                <div class="contact-icon">${typeIcon}</div>
                <div class="contact-info">
                    <div class="contact-name">${this.escapeHtml(contact.name)}</div>
                    <div class="contact-meta">
                        ${contact.email ? `📧 ${this.escapeHtml(contact.email)}` : ''}
                        ${contact.phone ? ` 📞 ${this.escapeHtml(contact.phone)}` : ''}
                        ${statusBadge}
                    </div>
                </div>
            </div>
        `;
    },
    
    // Nascondi suggerimenti
    hideSuggestions(fieldId) {
        const suggestionsContainer = document.getElementById(`${fieldId}_suggestions`);
        if (suggestionsContainer) {
            suggestionsContainer.style.display = 'none';
        }
    },
    
    // Nascondi tutti i suggerimenti
    hideAllSuggestions() {
        document.querySelectorAll('.contact-suggestions').forEach(container => {
            container.style.display = 'none';
        });
    },
    
    // Seleziona un contatto
    selectContact(fieldId, contactId) {
        const contact = this.contacts.find(c => c.id == contactId);
        if (!contact) {
            console.error('❌ Contatto non trovato:', contactId);
            return;
        }
        
        // Aggiorna campo nascosto
        const hiddenField = document.getElementById(`${fieldId}_id`);
        if (hiddenField) {
            hiddenField.value = contact.id;
        }
        
        // Aggiorna input ricerca
        const searchInput = document.getElementById(`${fieldId}_search`);
        if (searchInput) {
            searchInput.value = contact.name;
        }
        
        // Mostra contatto selezionato
        this.showSelectedContact(fieldId, contact);
        
        // Nascondi suggerimenti
        this.hideSuggestions(fieldId);
        
        // Mostra bottone clear
        const clearBtn = document.querySelector(`[data-field-id="${fieldId}"] .contact-clear-btn`);
        if (clearBtn) {
            clearBtn.style.display = 'block';
        }
        
        console.log('✅ Contatto selezionato:', contact.name, '(ID:', contact.id, ')');
    },
    
    // Mostra info contatto selezionato
    showSelectedContact(fieldId, contact) {
        const selectedContainer = document.getElementById(`${fieldId}_selected`);
        if (!selectedContainer) return;
        
        const typeIcon = contact.contact_type === 'company' ? '🏢' : '👤';
        const statusBadge = this.getStatusBadge(contact.status);
        
        selectedContainer.innerHTML = `
            <div class="selected-contact-card">
                <div class="selected-contact-icon">${typeIcon}</div>
                <div class="selected-contact-info">
                    <div class="selected-contact-name">${this.escapeHtml(contact.name)}</div>
                    <div class="selected-contact-details">
                        ${contact.email ? `📧 ${this.escapeHtml(contact.email)} ` : ''}
                        ${contact.phone ? `📞 ${this.escapeHtml(contact.phone)} ` : ''}
                        ${statusBadge}
                    </div>
                </div>
            </div>
        `;
        
        selectedContainer.style.display = 'block';
    },
    
    // Pulisci selezione
    clearSelection(fieldId) {
        // Pulisci campo nascosto
        const hiddenField = document.getElementById(`${fieldId}_id`);
        if (hiddenField) {
            hiddenField.value = '';
        }
        
        // Pulisci input ricerca
        const searchInput = document.getElementById(`${fieldId}_search`);
        if (searchInput) {
            searchInput.value = '';
            searchInput.focus();
        }
        
        // Nascondi contatto selezionato
        const selectedContainer = document.getElementById(`${fieldId}_selected`);
        if (selectedContainer) {
            selectedContainer.style.display = 'none';
        }
        
        // Nascondi bottone clear
        const clearBtn = document.querySelector(`[data-field-id="${fieldId}"] .contact-clear-btn`);
        if (clearBtn) {
            clearBtn.style.display = 'none';
        }
        
        // Nascondi suggerimenti
        this.hideSuggestions(fieldId);
        
        console.log('🗑️ Selezione pulita per:', fieldId);
    },
    
    // Apri lista completa contatti
    openContactList(fieldId) {
        this.currentFieldId = fieldId;
        
        // Crea e mostra modal
        this.showContactListModal();
    },
    
    // Mostra modal lista contatti
    showContactListModal() {
        // Crea modal se non esiste
        let modal = document.getElementById('contactListModal');
        if (!modal) {
            modal = this.createContactListModal();
            document.body.appendChild(modal);
        }
        
        // Popola con contatti
        this.populateContactListModal();
        
        // Mostra modal
        modal.style.display = 'flex';
        modal.classList.add('show');
        document.body.classList.add('modal-open');
    },
    
    // Crea modal lista contatti
    createContactListModal() {
        const modal = document.createElement('div');
        modal.id = 'contactListModal';
        modal.className = 'modal contact-list-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>📋 Seleziona Contatto</h3>
                    <button type="button" class="modal-close" onclick="ContactSelector.closeContactListModal()">&times;</button>
                </div>
                
                <div class="modal-body">
                    <div class="contact-list-search">
                        <input type="text" id="contactListSearch" 
                               placeholder="🔍 Cerca per nome, email, telefono, P.IVA..." 
                               class="form-input">
                    </div>
                    
                    <div class="contact-list-filters">
                        <button class="filter-btn active" data-status="all">Tutti</button>
                        <button class="filter-btn" data-status="client">Clienti</button>
                        <button class="filter-btn" data-status="prospect">Prospect</button>
                        <button class="filter-btn" data-status="collaborazioni">Collaborazioni</button>
                        <button class="filter-btn" data-status="contatto_utile">Contatti Utili</button>
                    </div>
                    
                    <div id="contactListContainer" class="contact-list-container">
                        <!-- Lista contatti dinamica -->
                    </div>
                </div>
                
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="ContactSelector.closeContactListModal()">
                        ❌ Chiudi
                    </button>
                </div>
            </div>
        `;
        
        // Setup eventi modal
        this.setupModalEvents(modal);
        
        return modal;
    },
    
    // Setup eventi modal
    setupModalEvents(modal) {
        // Ricerca nella modal
        const searchInput = modal.querySelector('#contactListSearch');
        searchInput.addEventListener('input', (e) => {
            clearTimeout(this.modalSearchTimeout);
            this.modalSearchTimeout = setTimeout(() => {
                this.filterModalContacts();
            }, this.config.debounceDelay);
        });
        
        // Filtri status
        modal.addEventListener('click', (e) => {
            if (e.target.classList.contains('filter-btn')) {
                modal.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
                e.target.classList.add('active');
                this.filterModalContacts();
            }
        });
        
        // Chiudi cliccando fuori
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeContactListModal();
            }
        });
    },
    
    // Popola modal contatti
    populateContactListModal() {
        this.filteredModalContacts = [...this.contacts];
        this.renderModalContacts();
    },
    
    // Filtra contatti nella modal
    filterModalContacts() {
        const modal = document.getElementById('contactListModal');
        const searchQuery = modal.querySelector('#contactListSearch').value.toLowerCase();
        const activeFilter = modal.querySelector('.filter-btn.active').dataset.status;
        
        this.filteredModalContacts = this.contacts.filter(contact => {
            // Filtro status
            if (activeFilter !== 'all' && contact.status !== activeFilter) {
                return false;
            }
            
            // Filtro ricerca
            if (searchQuery) {
                const searchText = [
                    contact.name,
                    contact.email,
                    contact.phone,
                    contact.partita_iva,
                    contact.codice_fiscale
                ].filter(field => field).join(' ').toLowerCase();
                
                if (!searchText.includes(searchQuery)) {
                    return false;
                }
            }
            
            return true;
        });
        
        this.renderModalContacts();
    },
    
    // Render contatti nella modal
    renderModalContacts() {
        const container = document.getElementById('contactListContainer');
        if (!container) return;
        
        if (this.filteredModalContacts.length === 0) {
            container.innerHTML = `
                <div class="no-contacts-found">
                    <div class="no-contacts-icon">🔍</div>
                    <h4>Nessun contatto trovato</h4>
                    <p>Prova a modificare i filtri o i termini di ricerca</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = this.filteredModalContacts.map(contact => `
            <div class="contact-list-item" onclick="ContactSelector.selectFromModal(${contact.id})">
                <div class="contact-list-icon">
                    ${contact.contact_type === 'company' ? '🏢' : '👤'}
                </div>
                <div class="contact-list-info">
                    <div class="contact-list-name">${this.escapeHtml(contact.name)}</div>
                    <div class="contact-list-details">
                        ${contact.email ? `📧 ${this.escapeHtml(contact.email)} ` : ''}
                        ${contact.phone ? `📞 ${this.escapeHtml(contact.phone)} ` : ''}
                        ${this.getStatusBadge(contact.status)}
                    </div>
                    ${contact.address ? `<div class="contact-list-address">📍 ${this.escapeHtml(contact.address)}</div>` : ''}
                </div>
            </div>
        `).join('');
    },
    
    // Seleziona dalla modal
    selectFromModal(contactId) {
        this.selectContact(this.currentFieldId, contactId);
        this.closeContactListModal();
    },
    
    // Chiudi modal
    closeContactListModal() {
        const modal = document.getElementById('contactListModal');
        if (modal) {
            modal.style.display = 'none';
            modal.classList.remove('show');
            document.body.classList.remove('modal-open');
        }
    },
    
    // Preseleziona contatto (per modifica)
    preselectContact(fieldId, contactId) {
        if (!contactId) return;
        
        const contact = this.contacts.find(c => c.id == contactId);
        if (contact) {
            this.selectContact(fieldId, contactId);
        }
    },
    
    // === UTILITY FUNCTIONS ===
    
    getStatusBadge(status) {
        const badges = {
            prospect: '<span class="status-badge prospect">Prospect</span>',
            client: '<span class="status-badge client">Cliente</span>',
            collaborazioni: '<span class="status-badge collaborazioni">🤝 Collaborazioni</span>',
            contatto_utile: '<span class="status-badge contatto_utile">📞 Contatto Utile</span>',
            inactive: '<span class="status-badge inactive">Inattivo</span>'
        };
        return badges[status] || badges.client;
    },
    
    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return String(text || '').replace(/[&<>"']/g, (m) => map[m]);
    }
};

// Inizializza automaticamente quando il DOM è pronto
document.addEventListener('DOMContentLoaded', () => {
    // Aspetta un po' per essere sicuri che tutto sia caricato
    setTimeout(() => {
        ContactSelector.init();
    }, 500);
});

// Export globale
window.ContactSelector = ContactSelector;