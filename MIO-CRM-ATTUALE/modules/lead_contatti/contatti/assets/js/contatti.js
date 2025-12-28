// File: /modules/lead_contatti/contatti/assets/js/contatti.js
// JavaScript per il modulo Anagrafiche Contatti - VERSIONE AGGIORNATA

const ContactsManager = {
    // Configurazione
    config: {
        apiBase: '/modules/lead_contatti/ajax/',
        debounceDelay: 300,
        animationDelay: 100
    },
    
    // Stato corrente
    state: {
        contacts: [],
        filteredContacts: [],
        currentFilters: {
            type: 'all',
            status: 'all',
            search: '',
            onlyActive: true,
            hasEmail: false
        },
        currentContact: null,
        tags: [],
        socials: [],
        formIsDirty: false // Traccia se il form è stato modificato
    },

    // Inizializzazione
    init() {
        console.log('ContactsManager: Initializing...');
        
        this.forceHideModals();
        this.setupEventListeners();
        this.loadContacts();
        
        console.log('ContactsManager: Initialized');
    },
    
    // Forza il modal a essere nascosto
    forceHideModals() {
        const contactModal = document.getElementById('contactModal');
        const detailsModal = document.getElementById('contactDetailsModal');
        
        if (contactModal) {
            contactModal.classList.remove('show');
            contactModal.style.display = 'none';
            contactModal.style.visibility = 'hidden';
        }
        
        if (detailsModal) {
            detailsModal.classList.remove('show');
            detailsModal.style.display = 'none';
            detailsModal.style.visibility = 'hidden';
        }
        
        document.body.classList.remove('modal-open');
    },

    // Setup event listeners
    setupEventListeners() {
        // Filtri tipo
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleTypeFilter(e));
        });
        
        // Filtri status
        document.querySelectorAll('.status-filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleStatusFilter(e));
        });
        
        // Ricerca
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', this.debounce((e) => {
                this.state.currentFilters.search = e.target.value;
                this.filterContacts();
            }, this.config.debounceDelay));
        }
        
        // Filtri checkbox
        const onlyActiveFilter = document.getElementById('onlyActiveFilter');
        if (onlyActiveFilter) {
            onlyActiveFilter.addEventListener('change', (e) => {
                this.state.currentFilters.onlyActive = e.target.checked;
                this.filterContacts();
            });
        }
        
        const hasEmailFilter = document.getElementById('hasEmailFilter');
        if (hasEmailFilter) {
            hasEmailFilter.addEventListener('change', (e) => {
                this.state.currentFilters.hasEmail = e.target.checked;
                this.filterContacts();
            });
        }
        
        // Modal handlers
        const addContactBtn = document.getElementById('addContactBtn');
        if (addContactBtn) {
            addContactBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.openAddContactModal();
            });
        }
        
        const exportBtn = document.getElementById('exportContactsBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportContacts());
        }
        
        const closeModalBtn = document.getElementById('closeModal');
        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.closeModal();
            });
        }
        
        const cancelBtn = document.getElementById('cancelBtn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.closeModal();
            });
        }
        
        // Form submission
        const contactForm = document.getElementById('contactForm');
        if (contactForm) {
            contactForm.addEventListener('submit', (e) => this.handleFormSubmit(e));
        }
        
        // Tags input
        const tagsInput = document.getElementById('tagsInput');
        if (tagsInput) {
            tagsInput.addEventListener('keypress', (e) => this.handleTagInput(e));
        }
        
        // Social profiles
        const addSocialBtn = document.getElementById('addSocialBtn');
        if (addSocialBtn) {
            addSocialBtn.addEventListener('click', () => this.addSocialInput());
        }
        
        // NUOVO: Formattazione automatica codice fiscale
        const codiceFiscaleInput = document.getElementById('codiceFiscale');
        if (codiceFiscaleInput) {
            codiceFiscaleInput.addEventListener('input', (e) => {
                e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
            });
        }
        
        // NUOVO: Validazione in tempo reale P.IVA
        const partitaIvaInput = document.getElementById('partitaIva');
        if (partitaIvaInput) {
            partitaIvaInput.addEventListener('input', (e) => {
                this.validatePartitaIvaField(e.target);
            });
            partitaIvaInput.addEventListener('blur', (e) => {
                this.validatePartitaIvaField(e.target);
            });
        }
        
        // NUOVO: Validazione in tempo reale CF
        if (codiceFiscaleInput) {
            codiceFiscaleInput.addEventListener('blur', (e) => {
                this.validateCodiceFiscaleField(e.target);
            });
        }
        
        // Form change tracking
        this.setupFormChangeTracking();

        // Close modal on overlay click & Escape key
        this.setupModalCloseHandlers();
    },

    setupFormChangeTracking() {
        const contactForm = document.getElementById('contactForm');
        if (!contactForm) return;

        // Ascolta tutti i campi input, textarea e select nel form
        const formFields = contactForm.querySelectorAll('input:not([type="hidden"]), textarea, select');

        formFields.forEach(field => {
            field.addEventListener('input', () => {
                this.state.formIsDirty = true;
            });
            field.addEventListener('change', () => {
                this.state.formIsDirty = true;
            });
        });
    },

    setupModalCloseHandlers() {
        // Close modal on overlay click
        const contactModal = document.getElementById('contactModal');
        if (contactModal) {
            contactModal.addEventListener('click', (e) => {
                if (e.target.id === 'contactModal') {
                    this.closeModal();
                }
            });
        }
        
        const contactDetailsModal = document.getElementById('contactDetailsModal');
        if (contactDetailsModal) {
            contactDetailsModal.addEventListener('click', (e) => {
                if (e.target.id === 'contactDetailsModal') {
                    this.closeModal();
                }
            });
        }
        
        // Close modal on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const contactModal = document.getElementById('contactModal');
                const detailsModal = document.getElementById('contactDetailsModal');
                
                if (contactModal?.classList.contains('show') || detailsModal?.classList.contains('show')) {
                    this.closeModal();
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

    // === CARICAMENTO CONTATTI ===
    
    async loadContacts() {
        try {
            this.showLoader();
            
            // MODIFICA: escludiamo i lead caricando solo prospect, client, inactive, collaborazioni, contatto_utile
            const response = await fetch(`${this.config.apiBase}get_contacts.php?exclude_leads=1`);
            const data = await response.json();
            
            if (data.success) {
                // Filtra lato client per essere sicuri (esclude i lead)
                this.state.contacts = (data.contacts || []).filter(contact => contact.status !== 'lead');
                this.filterContacts();
                this.hideLoader();
            } else {
                throw new Error(data.message || 'Errore nel caricamento contatti');
            }
            
        } catch (error) {
            console.error('Error loading contacts:', error);
            this.showError('Errore nel caricamento delle anagrafiche: ' + error.message);
            this.hideLoader();
        }
    },

    // === FILTRI E RICERCA ===
    
    handleTypeFilter(e) {
        const buttons = document.querySelectorAll('.filter-btn');
        buttons.forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');
        
        this.state.currentFilters.type = e.target.dataset.filter;
        this.filterContacts();
    },
    
    handleStatusFilter(e) {
        const buttons = document.querySelectorAll('.status-filter-btn');
        buttons.forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');
        
        this.state.currentFilters.status = e.target.dataset.status;
        this.filterContacts();
    },
    
    filterContacts() {
        const { type, status, search, onlyActive, hasEmail } = this.state.currentFilters;
        
        this.state.filteredContacts = this.state.contacts.filter(contact => {
            // Esclude sempre i lead
            if (contact.status === 'lead') {
                return false;
            }
            
            // Filtro tipo
            if (type !== 'all' && contact.contact_type !== type) {
                return false;
            }
            
            // Filtro status
            if (status !== 'all' && contact.status !== status) {
                return false;
            }
            
            // Filtro solo attivi (AGGIORNATO con nuovi status)
            if (onlyActive && contact.status === 'inactive') {
                return false;
            }
            
            // Filtro solo con email
            if (hasEmail && (!contact.email || contact.email.trim() === '')) {
                return false;
            }
            
            // Filtro ricerca (AGGIORNATO: include anche P.IVA e CF)
            if (search) {
                const searchLower = search.toLowerCase();
                const searchFields = [
                    contact.name,
                    contact.email,
                    contact.phone,
                    contact.partita_iva,
                    contact.codice_fiscale,
                    contact.description
                ].filter(field => field).join(' ').toLowerCase();
                
                if (!searchFields.includes(searchLower)) {
                    return false;
                }
            }
            
            return true;
        });
        
        this.renderContacts();
    },

    // === RENDERING ===
    
    renderContacts() {
        const container = document.getElementById('contactsList');
        const noContactsDiv = document.getElementById('noContacts');
        
        if (this.state.filteredContacts.length === 0) {
            container.style.display = 'none';
            noContactsDiv.style.display = 'block';
            return;
        }
        
        noContactsDiv.style.display = 'none';
        container.style.display = 'grid';
        
        container.innerHTML = this.state.filteredContacts.map((contact, index) => 
            this.renderContactCard(contact, index)
        ).join('');
    },
    
    renderContactCard(contact, index) {
        const typeIcon = contact.contact_type === 'company' ? '🏢' : '👤';
        const statusBadge = this.getStatusBadge(contact.status);
        const priorityBadge = this.getPriorityBadge(contact.priority);
        
        // Gestione tags (sia dal campo JSON che dalla tabella separata)
        let tagsHtml = '';
        if (contact.tags && Array.isArray(contact.tags)) {
            tagsHtml = contact.tags.map(tag => 
                `<span class="contact-tag">${typeof tag === 'object' ? tag.tag_name : tag}</span>`
            ).join('');
        }
        
        // Gestione social profiles
        let socialsHtml = '';
        if (contact.socials && Array.isArray(contact.socials)) {
            socialsHtml = contact.socials.map(social =>
                `<a href="${social.profile_url || social.url}" target="_blank" class="social-link ${social.platform}" title="${social.platform}">
                    ${this.getSocialIcon(social.platform)}
                </a>`
            ).join('');
        }
        
        // Informazioni aggiuntive per anagrafiche
        const lastContactInfo = contact.last_contact_date ? 
            `<div class="contact-meta-item">
                <span class="contact-meta-icon">📅</span>
                <span>Ultimo: ${new Date(contact.last_contact_date).toLocaleDateString('it-IT')}</span>
            </div>` : '';
        
        const nextFollowupInfo = contact.next_followup_date ? 
            `<div class="contact-meta-item">
                <span class="contact-meta-icon">⏰</span>
                <span>Follow-up: ${new Date(contact.next_followup_date).toLocaleDateString('it-IT')}</span>
            </div>` : '';
        
        // NUOVO: Informazioni P.IVA e CF
        const partitaIvaInfo = contact.partita_iva ? 
            `<div class="contact-meta-item">
                <span class="contact-meta-icon">🏛️</span>
                <span>P.IVA: ${this.escapeHtml(contact.partita_iva)}</span>
            </div>` : '';
        
        const codiceFiscaleInfo = contact.codice_fiscale ? 
            `<div class="contact-meta-item">
                <span class="contact-meta-icon">🆔</span>
                <span>CF: ${this.escapeHtml(contact.codice_fiscale)}</span>
            </div>` : '';
        
        return `
            <div class="contact-card contact-${contact.contact_type} status-${contact.status}" 
                 data-contact-id="${contact.id}" 
                 data-index="${index}"
                 onclick="ContactsManager.openContactDetails(${contact.id})">
                
                <div class="contact-header">
                    <div class="contact-info">
                        <h3 class="contact-name">${this.escapeHtml(contact.name)}</h3>
                        <div class="contact-type-badge ${contact.contact_type}">
                            ${typeIcon} ${contact.contact_type === 'company' ? 'Azienda' : 'Persona'}
                        </div>
                    </div>
                    
                    <div class="contact-actions">
                        <button class="contact-quick-action" onclick="event.stopPropagation(); ContactsManager.editContact(${contact.id})" title="Modifica">
                            ✏️
                        </button>
                        <button class="contact-quick-action" onclick="event.stopPropagation(); ContactsManager.deleteContact(${contact.id})" title="Elimina">
                            🗑️
                        </button>
                    </div>
                </div>
                
                <div class="contact-status-section">
                    ${statusBadge}
                    ${priorityBadge}
                </div>
                
                <div class="contact-meta">
                    ${contact.email ? `
                        <div class="contact-meta-item">
                            <span class="contact-meta-icon">📧</span>
                            <span class="contact-email">${this.escapeHtml(contact.email)}</span>
                        </div>
                    ` : ''}
                    
                    ${contact.phone ? `
                        <div class="contact-meta-item">
                            <span class="contact-meta-icon">📞</span>
                            <span class="contact-phone">${this.escapeHtml(contact.phone)}</span>
                        </div>
                    ` : ''}
                    
                    ${partitaIvaInfo}
                    ${codiceFiscaleInfo}
                    
                    ${contact.address ? `
                        <div class="contact-meta-item">
                            <span class="contact-meta-icon">📍</span>
                            <span>${this.truncateText(this.escapeHtml(contact.address), 50)}</span>
                        </div>
                    ` : ''}
                    
                    ${lastContactInfo}
                    ${nextFollowupInfo}
                </div>
                
                ${tagsHtml ? `<div class="contact-tags">${tagsHtml}</div>` : ''}
                
                ${socialsHtml ? `<div class="contact-socials">${socialsHtml}</div>` : ''}
                
                ${contact.description ? `
                    <div class="contact-description" title="${this.escapeHtml(contact.description)}">
                        ${this.truncateText(this.escapeHtml(contact.description), 100)}
                    </div>
                ` : ''}
            </div>
        `;
    },

    // === MODAL MANAGEMENT ===
    
    openAddContactModal() {
        console.log('🔄 Opening add contact modal...');
        
        this.resetForm();
        document.getElementById('modalTitle').textContent = 'Nuovo Contatto';
        
        // Imposta status predefinito per anagrafiche (cliente invece di lead)
        document.getElementById('status').value = 'client';
        
        const modal = document.getElementById('contactModal');
        if (!modal) {
            console.error('❌ Modal #contactModal not found!');
            return;
        }
        
        this.forceHideModals();
        
        setTimeout(() => {
            modal.style.position = 'fixed';
            modal.style.top = '0';
            modal.style.left = '0';
            modal.style.right = '0'; 
            modal.style.bottom = '0';
            modal.style.width = '100vw';
            modal.style.height = '100vh';
            modal.style.zIndex = '999999';
            modal.style.display = 'flex';
            modal.style.justifyContent = 'center';
            modal.style.alignItems = 'center';
            modal.style.background = 'rgba(0, 0, 0, 0.6)';
            modal.style.backdropFilter = 'blur(8px)';
            modal.style.visibility = 'visible';
            modal.style.opacity = '1';
            
            modal.classList.add('show');
            document.body.classList.add('modal-open');
            document.body.style.overflow = 'hidden';
            
            setTimeout(() => {
                const nameField = document.getElementById('name');
                if (nameField) {
                    nameField.focus();
                }
            }, 300);
            
        }, 50);
    },
    
    async openContactDetails(contactId) {
        try {
            const response = await fetch(`${this.config.apiBase}get_contact.php?id=${contactId}`);
            const data = await response.json();
            
            if (data.success) {
                this.renderContactDetails(data.contact);
                const modal = document.getElementById('contactDetailsModal');
                if (modal) {
                    modal.style.display = 'flex';
                    modal.style.visibility = 'visible';
                    modal.classList.add('show');
                    document.body.classList.add('modal-open');
                }
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            console.error('Error loading contact details:', error);
            this.showError('Errore nel caricamento dettagli: ' + error.message);
        }
    },
    
    async editContact(contactId) {
        try {
            console.log('🔄 Editing contact ID:', contactId);
            
            const response = await fetch(`${this.config.apiBase}get_contact.php?id=${contactId}`);
            const data = await response.json();
            
            if (data.success) {
                console.log('✅ Contact data received:', data.contact);
                
                // CORREZIONE CRITICA: Popola correttamente tutti i campi incluso contact_id
                this.populateForm(data.contact);
                document.getElementById('modalTitle').textContent = 'Modifica Contatto';
                
                const modal = document.getElementById('contactModal');
                if (modal) {
                    modal.style.position = 'fixed';
                    modal.style.top = '0';
                    modal.style.left = '0';
                    modal.style.right = '0'; 
                    modal.style.bottom = '0';
                    modal.style.width = '100vw';
                    modal.style.height = '100vh';
                    modal.style.zIndex = '999999';
                    modal.style.display = 'flex';
                    modal.style.justifyContent = 'center';
                    modal.style.alignItems = 'center';
                    modal.style.background = 'rgba(0, 0, 0, 0.6)';
                    modal.style.backdropFilter = 'blur(8px)';
                    modal.style.visibility = 'visible';
                    modal.style.opacity = '1';
                    
                    modal.classList.add('show');
                    document.body.classList.add('modal-open');
                    document.body.style.overflow = 'hidden';
                    
                    setTimeout(() => {
                        const nameField = document.getElementById('name');
                        if (nameField) {
                            nameField.focus();
                        }
                    }, 300);
                }
                
                console.log('✅ Modal opened for editing');
                
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            console.error('Error loading contact for edit:', error);
            this.showError('Errore nel caricamento contatto: ' + error.message);
        }
    },
    
    closeModal(skipConfirmation = false) {
        // Se il form è stato modificato e non siamo in modalità skip, chiedi conferma
        if (this.state.formIsDirty && !skipConfirmation) {
            if (!confirm('Sei sicuro di voler chiudere e perdere tutti i dati?')) {
                return; // Annulla la chiusura
            }
        }

        const contactModal = document.getElementById('contactModal');
        const detailsModal = document.getElementById('contactDetailsModal');

        if (contactModal) {
            contactModal.classList.remove('show');
            contactModal.style.display = 'none';
            contactModal.style.visibility = 'hidden';
            contactModal.style.opacity = '0';
        }

        if (detailsModal) {
            detailsModal.classList.remove('show');
            detailsModal.style.display = 'none';
            detailsModal.style.visibility = 'hidden';
            detailsModal.style.opacity = '0';
        }

        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';

        // IMPORTANTE: Reset solo quando si chiude il modal, non su errori di validazione
        this.resetForm();
    },

    // === FORM MANAGEMENT ===
    
    async handleFormSubmit(e) {
        e.preventDefault();
        
        // Rimuovi eventuali errori di campo precedenti
        document.querySelectorAll('.field-error').forEach(error => error.remove());
        document.querySelectorAll('.form-input').forEach(input => {
            input.classList.remove('invalid', 'valid');
        });
        
        if (!this.validateForm()) {
            return; // Non resettare il form, mantieni i dati
        }
        
        const formData = new FormData(e.target);
        
        // Aggiungi tags
        formData.append('tags', JSON.stringify(this.state.tags));
        
        // Aggiungi socials (CORREZIONE: usa il nome corretto per il backend)
        formData.append('socials', JSON.stringify(this.state.socials));
        
        // DEBUG: Log dei dati inviati
        console.log('📤 Form data being sent:');
        for (let [key, value] of formData.entries()) {
            console.log(`${key}:`, value);
        }
        
        try {
            this.setFormLoading(true);
            
            const response = await fetch(`${this.config.apiBase}save_contact.php`, {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            
            console.log('📥 Server response:', data);
            
            if (data.success) {
                this.showSuccess(data.message);
                this.closeModal(true); // Salta la conferma perché il form è stato salvato
                this.loadContacts(); // Ricarica la lista
            } else {
                // Non resettare il form in caso di errore del server
                throw new Error(data.error || 'Errore nel salvataggio');
            }
            
        } catch (error) {
            console.error('Error saving contact:', error);
            this.showError('Errore nel salvataggio: ' + error.message);
            // IMPORTANTE: Non resettare il form qui, mantieni i dati inseriti
        } finally {
            this.setFormLoading(false);
        }
    },
    
    validateForm() {
        const name = document.getElementById('name').value.trim();
        
        if (!name) {
            this.showError('Il nome è obbligatorio');
            document.getElementById('name').focus();
            return false;
        }
        
        const email = document.getElementById('email').value.trim();
        if (email && !this.isValidEmail(email)) {
            this.showError('Inserisci un indirizzo email valido');
            document.getElementById('email').focus();
            return false;
        }
        
        // AGGIORNATO: Validazione P.IVA più permissiva - solo avviso, non blocco
        const partitaIva = document.getElementById('partitaIva').value.trim();
        if (partitaIva && !this.isValidPartitaIva(partitaIva)) {
            // Non bloccare, solo avvisare
            this.showWarning('Formato Partita IVA potrebbe non essere corretto. Continuare comunque?');
        }
        
        // AGGIORNATO: Validazione CF più permissiva - solo avviso, non blocco  
        const codiceFiscale = document.getElementById('codiceFiscale').value.trim();
        if (codiceFiscale && !this.isValidCodiceFiscale(codiceFiscale)) {
            // Non bloccare, solo avvisare
            this.showWarning('Formato Codice Fiscale potrebbe non essere corretto. Continuare comunque?');
        }
        
        return true;
    },
    
    resetForm() {
        document.getElementById('contactForm').reset();
        document.getElementById('contactId').value = ''; // IMPORTANTE: Reset contact_id
        document.getElementById('typePerson').checked = true;
        document.getElementById('status').value = 'client'; // Default per anagrafiche
        this.state.tags = [];
        this.state.socials = [];
        this.renderTags();
        this.renderSocials();

        // Reset flag form modificato
        this.state.formIsDirty = false;

        console.log('🔄 Form reset completed');
    },
    
    populateForm(contact) {
        console.log('🔄 Populating form with contact:', contact);
        
        // CORREZIONE CRITICA: Assicurati che contact_id sia impostato
        document.getElementById('contactId').value = contact.id || '';
        document.getElementById('name').value = contact.name || '';
        document.getElementById('email').value = contact.email || '';
        document.getElementById('phone').value = contact.phone || '';
        document.getElementById('address').value = contact.address || '';
        document.getElementById('status').value = contact.status || 'client';
        document.getElementById('priority').value = contact.priority || 'medium';
        document.getElementById('description').value = contact.description || '';
        
        // NUOVI CAMPI: P.IVA e CF
        document.getElementById('partitaIva').value = contact.partita_iva || '';
        document.getElementById('codiceFiscale').value = contact.codice_fiscale || '';
        
        // Date
        if (contact.last_contact_date) {
            document.getElementById('lastContactDate').value = contact.last_contact_date.split(' ')[0];
        }
        if (contact.next_followup_date) {
            document.getElementById('nextFollowupDate').value = contact.next_followup_date.split(' ')[0];
        }
        
        // Tipo contatto
        if (contact.contact_type === 'company') {
            document.getElementById('typeCompany').checked = true;
        } else {
            document.getElementById('typePerson').checked = true;
        }
        
        // Tags (gestisci sia array che oggetti)
        this.state.tags = [];
        if (contact.tags && Array.isArray(contact.tags)) {
            this.state.tags = contact.tags.map(tag => 
                typeof tag === 'object' ? tag : { tag_name: tag, tag_color: this.getRandomTagColor() }
            );
        }
        this.renderTags();
        
        // Socials (gestisci sia array che oggetti)
        this.state.socials = [];
        if (contact.socials && Array.isArray(contact.socials)) {
            this.state.socials = contact.socials.map(social => ({
                platform: social.platform || '',
                profile_url: social.profile_url || social.url || '',
                username: social.username || ''
            }));
        }
        this.renderSocials();
        
        console.log('✅ Form populated. Contact ID:', document.getElementById('contactId').value);
    },

    // === EXPORT CONTACTS ===
    
    async exportContacts() {
        try {
            const response = await fetch(`${this.config.apiBase}export_contacts.php`);
            const blob = await response.blob();
            
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `anagrafiche_contatti_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            this.showSuccess('Export completato con successo!');
            
        } catch (error) {
            console.error('Error exporting contacts:', error);
            this.showError('Errore nell\'export: ' + error.message);
        }
    },

    // === DELETE CONTACT ===
    
    async deleteContact(contactId) {
        if (!confirm('Sei sicuro di voler eliminare questo contatto? Questa azione non può essere annullata.')) {
            return;
        }
        
        try {
            const formData = new FormData();
            formData.append('contact_id', contactId);
            formData.append('csrf_token', document.querySelector('input[name="csrf_token"]').value);
            
            const response = await fetch(`${this.config.apiBase}delete_contact.php`, {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showSuccess('Contatto eliminato con successo');
                this.loadContacts();
            } else {
                throw new Error(data.message);
            }
            
        } catch (error) {
            console.error('Error deleting contact:', error);
            this.showError('Errore nell\'eliminazione: ' + error.message);
        }
    },

    // === TAGS & SOCIALS MANAGEMENT ===
    
    handleTagInput(e) {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            const tagName = e.target.value.trim();
            
            if (tagName && !tagName.startsWith('#')) {
                e.target.value = '#' + tagName;
            }
            
            if (tagName.length > 1) {
                this.addTag(e.target.value.trim());
                e.target.value = '';
            }
        }
    },
    
    addTag(tagName) {
        if (!tagName.startsWith('#')) {
            tagName = '#' + tagName;
        }
        
        if (!this.state.tags.some(tag => tag.tag_name === tagName)) {
            this.state.tags.push({
                tag_name: tagName,
                tag_color: this.getRandomTagColor()
            });
            this.renderTags();
        }
    },
    
    removeTag(index) {
        this.state.tags.splice(index, 1);
        this.renderTags();
    },
    
    renderTags() {
        const container = document.getElementById('tagsList');
        container.innerHTML = this.state.tags.map((tag, index) => `
            <div class="tag-item" style="border-color: ${tag.tag_color}; color: ${tag.tag_color}">
                <span>${this.escapeHtml(tag.tag_name)}</span>
                <button type="button" class="tag-remove" onclick="ContactsManager.removeTag(${index})">×</button>
            </div>
        `).join('');
    },
    
    addSocialInput() {
        this.state.socials.push({
            platform: '',
            profile_url: '',
            username: ''
        });
        this.renderSocials();
    },
    
    removeSocialByIndex(index) {
        if (this.state.socials.length > 1) {
            this.state.socials.splice(index, 1);
            this.renderSocials();
        }
    },
    
    updateSocial(index, field, value) {
        if (this.state.socials[index]) {
            this.state.socials[index][field] = value;
            
            if (field === 'platform' && value && this.state.socials.length === index + 1) {
                this.addSocialInput();
            }
        }
    },
    
    renderSocials() {
        const container = document.getElementById('socialsContainer');
        
        if (this.state.socials.length === 0) {
            this.state.socials.push({ platform: '', profile_url: '', username: '' });
        }
        
        container.innerHTML = this.state.socials.map((social, index) => `
            <div class="social-input-group">
                <select class="social-platform" onchange="ContactsManager.updateSocial(${index}, 'platform', this.value)">
                    <option value="">Seleziona piattaforma</option>
                    <option value="linkedin" ${social.platform === 'linkedin' ? 'selected' : ''}>LinkedIn</option>
                    <option value="instagram" ${social.platform === 'instagram' ? 'selected' : ''}>Instagram</option>
                    <option value="facebook" ${social.platform === 'facebook' ? 'selected' : ''}>Facebook</option>
                    <option value="twitter" ${social.platform === 'twitter' ? 'selected' : ''}>Twitter</option>
                    <option value="tiktok" ${social.platform === 'tiktok' ? 'selected' : ''}>TikTok</option>
                    <option value="youtube" ${social.platform === 'youtube' ? 'selected' : ''}>YouTube</option>
                    <option value="website" ${social.platform === 'website' ? 'selected' : ''}>Sito Web</option>
                </select>
                <input type="url" class="social-url" placeholder="URL del profilo" 
                       value="${social.profile_url || ''}"
                       onchange="ContactsManager.updateSocial(${index}, 'profile_url', this.value)"
                       oninput="ContactsManager.updateSocial(${index}, 'profile_url', this.value)">
                <button type="button" class="btn-remove-social" onclick="ContactsManager.removeSocialByIndex(${index})" ${this.state.socials.length === 1 ? 'style="opacity:0.5"' : ''}>×</button>
            </div>
        `).join('');
    },

    // === VALIDAZIONE CAMPI ===
    
    validatePartitaIvaField(field) {
        const value = field.value.trim();
        const isValid = this.isValidPartitaIva(value);
        
        if (value && !isValid) {
            field.classList.add('invalid');
            field.classList.remove('valid');
            this.showFieldError(field, 'Formato non valido (es: IT12345678901 oppure 12345678901)');
        } else if (value && isValid) {
            field.classList.add('valid');
            field.classList.remove('invalid');
            this.hideFieldError(field);
        } else {
            field.classList.remove('invalid', 'valid');
            this.hideFieldError(field);
        }
    },
    
    validateCodiceFiscaleField(field) {
        const value = field.value.trim();
        const isValid = this.isValidCodiceFiscale(value);
        
        if (value && !isValid) {
            field.classList.add('invalid');
            field.classList.remove('valid');
            this.showFieldError(field, 'Formato non valido (es: RSSMRA80A01H501Z)');
        } else if (value && isValid) {
            field.classList.add('valid');
            field.classList.remove('invalid');
            this.hideFieldError(field);
        } else {
            field.classList.remove('invalid', 'valid');
            this.hideFieldError(field);
        }
    },
    
    isValidPartitaIva(piva) {
        if (!piva) return true; // Campo opzionale
        
        // Rimuovi spazi e converti in maiuscolo
        piva = piva.replace(/\s/g, '').toUpperCase();
        
        // Accetta diversi formati:
        // IT12345678901 (prefisso + 11 cifre)
        // 12345678901 (solo 11 cifre)
        // 1234567890 (10 cifre - per alcune P.IVA straniere)
        const patterns = [
            /^IT\d{11}$/,  // IT + 11 cifre
            /^\d{11}$/,    // 11 cifre
            /^\d{10}$/,    // 10 cifre
            /^[A-Z]{2}\d{9,11}$/ // Altri prefissi EU
        ];
        
        return patterns.some(pattern => pattern.test(piva));
    },
    
    isValidCodiceFiscale(cf) {
        if (!cf) return true; // Campo opzionale
        
        // Rimuovi spazi e converti in maiuscolo
        cf = cf.replace(/\s/g, '').toUpperCase();
        
        // Formato standard: 6 lettere + 2 cifre + 1 lettera + 2 cifre + 1 lettera + 3 cifre + 1 lettera
        // Ma accettiamo anche formati più flessibili per aziende o stranieri
        const patterns = [
            /^[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]$/,  // Formato standard persona
            /^\d{11}$/,  // P.IVA numerica (spesso usata anche come CF per aziende)
            /^[A-Z0-9]{11,16}$/  // Formato più flessibile
        ];
        
        return patterns.some(pattern => pattern.test(cf));
    },
    
    showFieldError(field, message) {
        this.hideFieldError(field); // Rimuovi errore precedente
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'field-error';
        errorDiv.textContent = message;
        
        field.parentNode.appendChild(errorDiv);
    },
    
    hideFieldError(field) {
        const existingError = field.parentNode.querySelector('.field-error');
        if (existingError) {
            existingError.remove();
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
        if (text.length <= maxLength) return text;
        return text.substr(0, maxLength) + '...';
    },
    
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },
    
    getStatusBadge(status) {
        const badges = {
            prospect: '<span class="contact-status-badge prospect">Prospect</span>',
            client: '<span class="contact-status-badge client">Cliente</span>',
            collaborazioni: '<span class="contact-status-badge collaborazioni">🤝 Collaborazioni</span>',
            contatto_utile: '<span class="contact-status-badge contatto_utile">📞 Contatto Utile</span>',
            inactive: '<span class="contact-status-badge inactive">Inattivo</span>'
        };
        return badges[status] || badges.client;
    },
    
    getPriorityBadge(priority) {
        const badges = {
            high: '<span class="contact-priority high">Alta</span>',
            medium: '<span class="contact-priority medium">Media</span>',
            low: '<span class="contact-priority low">Bassa</span>'
        };
        return badges[priority] || badges.medium;
    },
    
    getSocialIcon(platform) {
        const icons = {
            linkedin: 'in',
            instagram: '📷',
            facebook: '👥',
            twitter: '🐦',
            tiktok: '🎵',
            youtube: '📺',
            website: '🌐'
        };
        return icons[platform] || '🔗';
    },
    
    getRandomTagColor() {
        const colors = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#8b5cf6', '#06b6d4', '#f97316'];
        return colors[Math.floor(Math.random() * colors.length)];
    },
    
    // === UI HELPERS ===
    
    showLoader() {
        document.getElementById('contactsLoader').style.display = 'flex';
        document.getElementById('contactsList').style.display = 'none';
        document.getElementById('noContacts').style.display = 'none';
    },
    
    hideLoader() {
        document.getElementById('contactsLoader').style.display = 'none';
    },
    
    setFormLoading(loading) {
        const saveBtn = document.getElementById('saveBtn');
        if (loading) {
            saveBtn.disabled = true;
            saveBtn.textContent = 'Salvataggio...';
        } else {
            saveBtn.disabled = false;
            saveBtn.textContent = 'Salva Contatto';
        }
    },
    
    renderContactDetails(contact) {
        const modalTitle = document.getElementById('detailsModalTitle');
        const modalBody = document.getElementById('contactDetailsBody');
        const statusIndicator = document.getElementById('detailsStatusIndicator');
        
        modalTitle.textContent = contact.name;
        statusIndicator.className = `contact-status-indicator ${contact.status}`;
        
        const typeIcon = contact.contact_type === 'company' ? '🏢' : '👤';
        
        // DETTAGLI AGGIORNATI con nuovi campi
        modalBody.innerHTML = `
            <div class="contact-details-grid">
                <div class="details-section">
                    <h4>Informazioni Base</h4>
                    <div class="details-item">
                        <span class="details-label">Tipo:</span>
                        <span class="details-value">${typeIcon} ${contact.contact_type === 'company' ? 'Azienda' : 'Persona'}</span>
                    </div>
                    <div class="details-item">
                        <span class="details-label">Status:</span>
                        <span class="details-value">${this.getStatusBadge(contact.status)}</span>
                    </div>
                    <div class="details-item">
                        <span class="details-label">Priorità:</span>
                        <span class="details-value">${this.getPriorityBadge(contact.priority)}</span>
                    </div>
                    ${contact.email ? `
                        <div class="details-item">
                            <span class="details-label">Email:</span>
                            <span class="details-value">${this.escapeHtml(contact.email)}</span>
                        </div>
                    ` : ''}
                    ${contact.phone ? `
                        <div class="details-item">
                            <span class="details-label">Telefono:</span>
                            <span class="details-value">${this.escapeHtml(contact.phone)}</span>
                        </div>
                    ` : ''}
                    ${contact.partita_iva ? `
                        <div class="details-item">
                            <span class="details-label">Partita IVA:</span>
                            <span class="details-value">${this.escapeHtml(contact.partita_iva)}</span>
                        </div>
                    ` : ''}
                    ${contact.codice_fiscale ? `
                        <div class="details-item">
                            <span class="details-label">Codice Fiscale:</span>
                            <span class="details-value">${this.escapeHtml(contact.codice_fiscale)}</span>
                        </div>
                    ` : ''}
                </div>
                
                <div class="details-section">
                    <h4>Timeline</h4>
                    ${contact.last_contact_date ? `
                        <div class="details-item">
                            <span class="details-label">Ultimo contatto:</span>
                            <span class="details-value">${new Date(contact.last_contact_date).toLocaleDateString('it-IT')}</span>
                        </div>
                    ` : ''}
                    ${contact.next_followup_date ? `
                        <div class="details-item">
                            <span class="details-label">Prossimo follow-up:</span>
                            <span class="details-value">${new Date(contact.next_followup_date).toLocaleDateString('it-IT')}</span>
                        </div>
                    ` : ''}
                    ${contact.address ? `
                        <div class="details-item">
                            <span class="details-label">Indirizzo:</span>
                            <span class="details-value">${this.escapeHtml(contact.address)}</span>
                        </div>
                    ` : ''}
                    <div class="details-item">
                        <span class="details-label">Creato il:</span>
                        <span class="details-value">${new Date(contact.created_at).toLocaleDateString('it-IT')}</span>
                    </div>
                    ${contact.tags && contact.tags.length > 0 ? `
                        <div class="details-item">
                            <span class="details-label">Tags:</span>
                            <span class="details-value">
                                ${contact.tags.map(tag => `<span class="contact-tag">${typeof tag === 'object' ? tag.tag_name : tag}</span>`).join('')}
                            </span>
                        </div>
                    ` : ''}
                </div>
            </div>
            
            ${contact.socials && contact.socials.length > 0 ? `
                <div class="details-section">
                    <h4>Profili Social</h4>
                    <div class="contact-socials">
                        ${contact.socials.map(social => `
                            <a href="${social.profile_url || social.url}" target="_blank" class="social-link ${social.platform}">
                                ${this.getSocialIcon(social.platform)} ${social.platform}
                            </a>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
            
            ${contact.description ? `
                <div class="details-section">
                    <h4>Descrizione</h4>
                    <div class="details-description">${this.escapeHtml(contact.description)}</div>
                </div>
            ` : ''}
        `;
        
        // Setup edit button
        document.getElementById('editContactBtn').onclick = () => {
            this.closeModal();
            this.editContact(contact.id);
        };
    },
    
    // === NOTIFICATION HELPERS ===
    
    showSuccess(message) {
        this.showNotification(message, 'success');
    },
    
    showError(message) {
        this.showNotification(message, 'error');
    },
    
    showWarning(message) {
        this.showNotification(message, 'warning');
    },
    
    showNotification(message, type = 'info') {
        let toast = document.getElementById('contacts-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'contacts-toast';
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
            warning: 'background: #f59e0b; color: white; border: 1px solid #d97706;',
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
    }
};

// === FUNZIONI GLOBALI PER ONCLICK ===

function openAddContactModal() {
    ContactsManager.openAddContactModal();
}

function closeDetailsModal() {
    ContactsManager.closeModal();
}

function removeSocial(button) {
    const container = button.closest('.social-input-group');
    const index = Array.from(container.parentNode.children).indexOf(container);
    ContactsManager.removeSocialByIndex(index);
}

// === INIZIALIZZAZIONE ===

document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        ContactsManager.init();
    }, 200);
});

// Export per uso globale
window.ContactsManager = ContactsManager;