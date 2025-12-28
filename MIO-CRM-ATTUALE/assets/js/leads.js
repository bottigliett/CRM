// File: /modules/lead_contatti/assets/js/leads.js
// JavaScript per il modulo Lead e Contatti - CRM Studio Mismo

const LeadsManager = {
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
            search: ''
        },
        currentContact: null,
        tags: [],
        socials: []
    },

    // Inizializzazione
    init() {
        console.log('LeadsManager: Initializing...');
        
        // FORZA IL MODAL A ESSERE NASCOSTO ALL'INIZIO
        this.forceHideModals();
        
        this.setupEventListeners();
        this.loadContacts();
        
        console.log('LeadsManager: Initialized');
    },
    
    // Forza il modal a essere nascosto
    forceHideModals() {
        const contactModal = document.getElementById('contactModal');
        const detailsModal = document.getElementById('contactDetailsModal');
        
        if (contactModal) {
            contactModal.classList.remove('show');
            contactModal.style.display = 'none';
            contactModal.style.visibility = 'hidden';
            console.log('Contact modal forced hidden');
        }
        
        if (detailsModal) {
            detailsModal.classList.remove('show');
            detailsModal.style.display = 'none';
            detailsModal.style.visibility = 'hidden';
            console.log('Details modal forced hidden');
        }
        
        // Rimuovi classe modal-open dal body
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
        
        // Modal handlers - CORREZIONE
        const addContactBtn = document.getElementById('addContactBtn');
        if (addContactBtn) {
            addContactBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Add contact button clicked');
                this.openAddContactModal();
            });
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
        
        // Contact type toggle
        document.querySelectorAll('input[name="contact_type"]').forEach(input => {
            input.addEventListener('change', (e) => this.handleContactTypeChange(e));
        });
        
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
            
            const response = await fetch(`${this.config.apiBase}get_contacts.php`);
            const data = await response.json();
            
            if (data.success) {
                this.state.contacts = data.contacts || [];
                this.filterContacts();
                this.hideLoader();
            } else {
                throw new Error(data.message || 'Errore nel caricamento contatti');
            }
            
        } catch (error) {
            console.error('Error loading contacts:', error);
            this.showError('Errore nel caricamento dei contatti: ' + error.message);
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
        const { type, status, search } = this.state.currentFilters;
        
        this.state.filteredContacts = this.state.contacts.filter(contact => {
            // Filtro tipo
            if (type !== 'all' && contact.contact_type !== type) {
                return false;
            }
            
            // Filtro status
            if (status !== 'all' && contact.status !== status) {
                return false;
            }
            
            // Filtro ricerca
            if (search) {
                const searchLower = search.toLowerCase();
                const searchFields = [
                    contact.name,
                    contact.email,
                    contact.phone,
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
        
        // Setup card event listeners
        this.setupCardEventListeners();
    },
    
    renderContactCard(contact, index) {
        const typeIcon = contact.contact_type === 'company' ? '🏢' : '👤';
        const statusBadge = this.getStatusBadge(contact.status);
        const priorityBadge = this.getPriorityBadge(contact.priority);
        const tagsHtml = contact.tags ? contact.tags.map(tag => 
            `<span class="contact-tag">${tag.tag_name}</span>`
        ).join('') : '';
        const socialsHtml = contact.socials ? contact.socials.map(social =>
            `<a href="${social.profile_url}" target="_blank" class="social-link ${social.platform}" title="${social.platform}">
                ${this.getSocialIcon(social.platform)}
            </a>`
        ).join('') : '';
        
        return `
            <div class="contact-card contact-${contact.contact_type} status-${contact.status}" 
                 data-contact-id="${contact.id}" 
                 data-index="${index}"
                 onclick="LeadsManager.openContactDetails(${contact.id})">
                
                <div class="contact-header">
                    <div class="contact-info">
                        <h3 class="contact-name">${this.escapeHtml(contact.name)}</h3>
                        <div class="contact-type-badge ${contact.contact_type}">
                            ${typeIcon} ${contact.contact_type === 'company' ? 'Azienda' : 'Persona'}
                        </div>
                    </div>
                    
                    <div class="contact-actions">
                        <button class="contact-quick-action" onclick="event.stopPropagation(); LeadsManager.editContact(${contact.id})" title="Modifica">
                            ✏️
                        </button>
                        <button class="contact-quick-action" onclick="event.stopPropagation(); LeadsManager.deleteContact(${contact.id})" title="Elimina">
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
                    
                    ${contact.address ? `
                        <div class="contact-meta-item">
                            <span class="contact-meta-icon">📍</span>
                            <span>${this.truncateText(this.escapeHtml(contact.address), 50)}</span>
                        </div>
                    ` : ''}
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
        
        const modal = document.getElementById('contactModal');
        if (!modal) {
            console.error('❌ Modal #contactModal not found!');
            return;
        }
        
        // Prima chiudi tutti i modal
        this.forceHideModals();
        
        // Poi forza l'apertura del modal con tutti i metodi possibili
        setTimeout(() => {
            // Metodo 1: Stili inline per forzare
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
            
            // Metodo 2: Classe CSS
            modal.classList.add('show');
            
            // Metodo 3: Impedisci scroll body
            document.body.classList.add('modal-open');
            document.body.style.overflow = 'hidden';
            
            console.log('✅ Modal styling applied:', {
                display: modal.style.display,
                position: modal.style.position,
                zIndex: modal.style.zIndex,
                classList: modal.classList.toString()
            });
            
            // Focus dopo animazione
            setTimeout(() => {
                const nameField = document.getElementById('name');
                if (nameField) {
                    nameField.focus();
                    console.log('✅ Focus set on name field');
                }
            }, 300);
            
        }, 50); // Piccolo delay per assicurarsi che sia tutto pronto
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
            const response = await fetch(`${this.config.apiBase}get_contact.php?id=${contactId}`);
            const data = await response.json();
            
            if (data.success) {
                this.populateForm(data.contact);
                document.getElementById('modalTitle').textContent = 'Modifica Contatto';
                
                const modal = document.getElementById('contactModal');
                if (modal) {
                    modal.style.display = 'flex';
                    modal.style.visibility = 'visible';  
                    modal.classList.add('show');
                    document.body.classList.add('modal-open');
                    
                    // Focus sul nome
                    setTimeout(() => {
                        const nameField = document.getElementById('name');
                        if (nameField) {
                            nameField.focus();
                        }
                    }, 300);
                }
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            console.error('Error loading contact for edit:', error);
            this.showError('Errore nel caricamento contatto: ' + error.message);
        }
    },
    
    closeModal() {
        console.log('🔄 Closing modal...');
        
        const contactModal = document.getElementById('contactModal');
        const detailsModal = document.getElementById('contactDetailsModal');
        
        // Chiudi modal contatto
        if (contactModal) {
            contactModal.classList.remove('show');
            contactModal.style.display = 'none';
            contactModal.style.visibility = 'hidden';
            contactModal.style.opacity = '0';
        }
        
        // Chiudi modal dettagli  
        if (detailsModal) {
            detailsModal.classList.remove('show');
            detailsModal.style.display = 'none';
            detailsModal.style.visibility = 'hidden';
            detailsModal.style.opacity = '0';
        }
        
        // Ripristina scroll body
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
        
        // Reset form
        this.resetForm();
        
        console.log('✅ Modal closed');
    },

    // === FORM MANAGEMENT ===
    
    async handleFormSubmit(e) {
        e.preventDefault();
        
        if (!this.validateForm()) {
            return;
        }
        
        const formData = new FormData(e.target);
        
        // Aggiungi tags
        formData.append('tags', JSON.stringify(this.state.tags));
        
        // Aggiungi socials
        formData.append('socials', JSON.stringify(this.state.socials));
        
        try {
            this.setFormLoading(true);
            
            const response = await fetch(`${this.config.apiBase}save_contact.php`, {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showSuccess(data.message);
                this.closeModal();
                this.loadContacts(); // Ricarica la lista
            } else {
                throw new Error(data.message || 'Errore nel salvataggio');
            }
            
        } catch (error) {
            console.error('Error saving contact:', error);
            this.showError('Errore nel salvataggio: ' + error.message);
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
        
        return true;
    },
    
    resetForm() {
        document.getElementById('contactForm').reset();
        document.getElementById('contactId').value = '';
        document.getElementById('typePerson').checked = true;
        this.state.tags = [];
        this.state.socials = [];
        this.renderTags();
        this.renderSocials();
    },
    
    populateForm(contact) {
        document.getElementById('contactId').value = contact.id;
        document.getElementById('name').value = contact.name || '';
        document.getElementById('email').value = contact.email || '';
        document.getElementById('phone').value = contact.phone || '';
        document.getElementById('address').value = contact.address || '';
        document.getElementById('status').value = contact.status || 'lead';
        document.getElementById('priority').value = contact.priority || 'medium';
        document.getElementById('description').value = contact.description || '';
        
        // Tipo contatto
        if (contact.contact_type === 'company') {
            document.getElementById('typeCompany').checked = true;
        } else {
            document.getElementById('typePerson').checked = true;
        }
        
        // Tags
        this.state.tags = contact.tags || [];
        this.renderTags();
        
        // Socials
        this.state.socials = contact.socials || [];
        this.renderSocials();
    },

    // === TAGS MANAGEMENT ===
    
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
        
        // Evita duplicati
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
                <button type="button" class="tag-remove" onclick="LeadsManager.removeTag(${index})">×</button>
            </div>
        `).join('');
    },

    // === SOCIAL PROFILES MANAGEMENT ===
    
    addSocialInput() {
        this.state.socials.push({
            platform: '',
            profile_url: '',
            username: ''
        });
        this.renderSocials();
    },
    
    removeSocial(button) {
        const container = button.closest('.social-input-group');
        const index = Array.from(container.parentNode.children).indexOf(container);
        this.state.socials.splice(index, 1);
        this.renderSocials();
    },
    
    renderSocials() {
        const container = document.getElementById('socialsContainer');
        
        if (this.state.socials.length === 0) {
            this.state.socials.push({ platform: '', profile_url: '', username: '' });
        }
        
        container.innerHTML = this.state.socials.map((social, index) => `
            <div class="social-input-group">
                <select class="social-platform" onchange="LeadsManager.updateSocial(${index}, 'platform', this.value)">
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
                       onchange="LeadsManager.updateSocial(${index}, 'profile_url', this.value)"
                       oninput="LeadsManager.updateSocial(${index}, 'profile_url', this.value)">
                <button type="button" class="btn-remove-social" onclick="LeadsManager.removeSocialByIndex(${index})" ${this.state.socials.length === 1 ? 'style="opacity:0.5"' : ''}>×</button>
            </div>
        `).join('');
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
            
            // Se è stata selezionata una piattaforma e non c'è ancora un'altra riga vuota, aggiungila
            if (field === 'platform' && value && this.state.socials.length === index + 1) {
                this.addSocialInput();
            }
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
            lead: '<span class="contact-status-badge lead">Lead</span>',
            prospect: '<span class="contact-status-badge prospect">Prospect</span>',
            client: '<span class="contact-status-badge client">Cliente</span>',
            inactive: '<span class="contact-status-badge inactive">Inattivo</span>'
        };
        return badges[status] || badges.lead;
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
    
    setupCardEventListeners() {
        // Event listeners già gestiti con onclick inline per semplicità
    },
    
    handleContactTypeChange(e) {
        // Placeholder per logica aggiuntiva se necessario
        console.log('Contact type changed to:', e.target.value);
    },
    
    renderContactDetails(contact) {
        const modalTitle = document.getElementById('detailsModalTitle');
        const modalBody = document.getElementById('contactDetailsBody');
        const statusIndicator = document.getElementById('detailsStatusIndicator');
        
        modalTitle.textContent = contact.name;
        statusIndicator.className = `contact-status-indicator ${contact.status}`;
        
        const typeIcon = contact.contact_type === 'company' ? '🏢' : '👤';
        
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
                </div>
                
                <div class="details-section">
                    <h4>Altri Dettagli</h4>
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
                                ${contact.tags.map(tag => `<span class="contact-tag">${tag.tag_name}</span>`).join('')}
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
                            <a href="${social.profile_url}" target="_blank" class="social-link ${social.platform}">
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
    
    showNotification(message, type = 'info') {
        // Crea o riutilizza toast
        let toast = document.getElementById('leads-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'leads-toast';
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
        
        // Stile basato sul tipo
        const styles = {
            success: 'background: #22c55e; color: white; border: 1px solid #16a34a;',
            error: 'background: #ef4444; color: white; border: 1px solid #dc2626;',
            info: 'background: #3b82f6; color: white; border: 1px solid #2563eb;'
        };
        
        toast.style.cssText += styles[type];
        toast.textContent = message;
        
        // Mostra
        setTimeout(() => {
            toast.style.transform = 'translateX(0)';
            toast.style.opacity = '1';
        }, 100);
        
        // Nascondi dopo 4 secondi
        setTimeout(() => {
            toast.style.transform = 'translateX(100%)';
            toast.style.opacity = '0';
        }, 4000);
    }
};

// === FUNZIONI GLOBALI PER ONCLICK ===

function openAddContactModal() {
    LeadsManager.openAddContactModal();
}

function closeDetailsModal() {
    LeadsManager.closeModal();
}

function removeSocial(button) {
    const container = button.closest('.social-input-group');
    const index = Array.from(container.parentNode.children).indexOf(container);
    LeadsManager.removeSocialByIndex(index);
}

// === INIZIALIZZAZIONE ===

document.addEventListener('DOMContentLoaded', function() {
    // Aspetta che il layout base sia pronto
    setTimeout(() => {
        LeadsManager.init();
    }, 200);
});

// Export per uso globale
window.LeadsManager = LeadsManager;