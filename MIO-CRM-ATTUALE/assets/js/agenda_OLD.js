// File: /assets/js/agenda.js
// JavaScript COMPATIBILE per Agenda CRM Studio Mismo
// Versione adattata alla struttura HTML esistente

console.log('🗓️ Caricamento Agenda Manager - Versione COMPATIBILE...');

// Inizializzazione DOM
document.addEventListener('DOMContentLoaded', function() {
    console.log('📅 DOM Caricato - Inizializzazione Agenda...');
    setTimeout(() => {
        if (typeof AgendaManager !== 'undefined') {
            AgendaManager.init();
        } else {
            console.error('❌ AgendaManager non definito!');
        }
    }, 100);
});

// AGENDA MANAGER COMPATIBILE
const AgendaManager = {
    // Proprietà
    currentDate: new Date(),
    currentView: 'month',
    events: [],
    categories: [],
    selectedEvent: null,
    csrfToken: null,
    
    // ===== INIZIALIZZAZIONE =====
    init() {
        console.log('🗓️ Inizializzazione Agenda Manager...');
        
        try {
            this.initializeComponents();
            this.attachEventListeners();
            this.loadInitialData();
            this.renderCalendar();
            this.initializeLogSection();
            this.initMiniCalendar();
            this.handleKeyboard();
            
            if (window.toastManager) {
                window.toastManager.success('Agenda caricata correttamente', 'Sistema', 3000);
            }
            
            console.log('✅ Agenda Manager inizializzato correttamentes - VERSIONE COMPATIBILE');
        } catch (error) {
            console.error('❌ Errore inizializzazione Agenda:', error);
            this.showError('Errore durante l\'inizializzazione: ' + error.message);
        }
    },
    
    // ===== COMPONENTI =====
    initializeComponents() {
        this.csrfToken = this.generateCSRFToken();
        
        if (window.agendaData) {
            this.currentView = window.agendaData.currentView || 'month';
            this.currentDate = new Date(window.agendaData.currentDate || new Date());
            this.categories = window.agendaData.categories || [];
            this.events = window.agendaData.events || [];
        }
        
        this.updateCalendarTitle();
        console.log('📊 Componenti inizializzati');
    },
    
    // ===== MINI CALENDARIO (con controllo esistenza) =====
    initMiniCalendar() {
        console.log('📅 Inizializzazione mini calendario...');
        const miniCalendar = document.getElementById('miniCalendar');
        if (!miniCalendar) {
            console.log('ℹ️ Mini calendario non presente nella pagina - OK');
            return;
        }
        
        const today = new Date();
        const currentMonth = this.currentDate.getMonth();
        const currentYear = this.currentDate.getFullYear();
        
        let html = '<div class="mini-calendar-header">';
        html += `<span>${this.currentDate.toLocaleDateString('it-IT', { month: 'short', year: 'numeric' })}</span>`;
        html += '</div>';
        
        html += '<div class="mini-calendar-grid">';
        html += '<div class="mini-cal-days">L M M G V S D</div>';
        
        const firstDay = new Date(currentYear, currentMonth, 1);
        const lastDay = new Date(currentYear, currentMonth + 1, 0);
        const startDay = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
        
        html += '<div class="mini-cal-dates">';
        
        for (let i = 0; i < startDay; i++) {
            html += '<span class="mini-cal-empty"></span>';
        }
        
        for (let day = 1; day <= lastDay.getDate(); day++) {
            const isToday = (day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear());
            const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            
            html += `<span class="mini-cal-day ${isToday ? 'today' : ''}" data-date="${dateStr}" onclick="AgendaManager.selectMiniCalendarDate('${dateStr}')">${day}</span>`;
        }
        
        html += '</div></div>';
        miniCalendar.innerHTML = html;
        
        console.log('✅ Mini calendario inizializzato');
    },
    
    // ===== KEYBOARD SHORTCUTS =====
    handleKeyboard() {
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            
            switch (e.key) {
                case 'n':
                case 'N':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        this.openEventModal();
                    }
                    break;
                case 'ArrowLeft':
                    if (e.altKey) {
                        e.preventDefault();
                        this.navigateDate('prev');
                    }
                    break;
                case 'ArrowRight':
                    if (e.altKey) {
                        e.preventDefault();
                        this.navigateDate('next');
                    }
                    break;
                case 't':
                case 'T':
                    if (e.altKey) {
                        e.preventDefault();
                        this.goToToday();
                    }
                    break;
            }
        });
        console.log('⌨️ Keyboard shortcuts attivati');
    },
    
    // ===== LOG SECTION =====
    initializeLogSection() {
        const logHeader = document.querySelector('.log-header');
        if (logHeader && !document.querySelector('.log-toggle-btn')) {
            const toggleBtn = document.createElement('button');
            toggleBtn.className = 'log-toggle-btn collapsed';
            toggleBtn.innerHTML = '📋 <span class="toggle-text">Mostra Log</span>';
            toggleBtn.onclick = () => this.toggleLogSection();
            
            logHeader.appendChild(toggleBtn);
            
            const logContainer = document.querySelector('.log-container');
            if (logContainer) {
                logContainer.style.display = 'none';
            }
        }
    },
    
    toggleLogSection() {
        const logContainer = document.querySelector('.log-container');
        const toggleBtn = document.querySelector('.log-toggle-btn');
        
        if (logContainer && toggleBtn) {
            const isHidden = logContainer.style.display === 'none';
            
            if (isHidden) {
                logContainer.style.display = 'block';
                toggleBtn.innerHTML = '📋 <span class="toggle-text">Nascondi</span>';
                toggleBtn.classList.remove('collapsed');
                this.loadActivityLogs();
            } else {
                logContainer.style.display = 'none';
                toggleBtn.innerHTML = '📋 <span class="toggle-text">Mostra Log</span>';
                toggleBtn.classList.add('collapsed');
            }
        }
    },
    
    // ===== CARICAMENTO DATI =====
    async loadInitialData() {
        console.log('📥 Caricamento dati iniziali...');
        try {
            await this.loadEvents();
            await this.loadCategories();
            console.log('✅ Dati iniziali caricati');
        } catch (error) {
            console.error('❌ Errore caricamento dati:', error);
        }
    },
    
    async loadEvents() {
        try {
            const params = new URLSearchParams({
                view: this.currentView,
                date: this.currentDate.toISOString().split('T')[0]
            });
            
            const response = await fetch(`/modules/agenda/ajax/load_events.php?${params}`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                console.warn('load_events.php non restituisce JSON valido');
                return;
            }
            
            const data = await response.json();
            
            if (data.success) {
                this.events = data.events || [];
                console.log(`📅 ${this.events.length} eventi caricati`);
            }
            
        } catch (error) {
            console.error('❌ Errore caricamento eventi:', error);
            this.events = [];
        }
    },
    
    async loadCategories() {
        try {
            const response = await fetch('/modules/agenda/ajax/get_categories.php');
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                console.warn('get_categories.php non restituisce JSON valido');
                return;
            }
            
            const data = await response.json();
            
            if (data.success) {
                this.categories = data.categories || [];
                console.log(`🏷️ ${this.categories.length} categorie caricate`);
            }
            
        } catch (error) {
            console.error('❌ Errore caricamento categorie:', error);
            this.categories = [];
        }
    },
    
    async loadActivityLogs() {
        try {
            const response = await fetch('/modules/agenda/ajax/get_activity_logs.php');
            
            if (!response.ok) {
                console.warn('get_activity_logs.php non disponobile');
                const container = document.getElementById('logEntries');
                if (container) {
                    container.innerHTML = '<div class="log-loading">📋 Log non disponibili</div>';
                }
                return;
            }
            
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                console.warn('get_activity_logs.php non restituisce JSON valido');
                return;
            }
            
            const data = await response.json();
            
            if (data.success) {
                this.renderActivityLogs(data.logs || []);
                console.log(`📋 ${data.logs?.length || 0} log attività caricati`);
            }
            
        } catch (error) {
            console.error('❌ Errore caricamento log:', error);
            const container = document.getElementById('logEntries');
            if (container) {
                container.innerHTML = '<div class="log-loading">📋 Log non disponibili</div>';
            }
        }
    },
    
    renderActivityLogs(logs) {
        const container = document.getElementById('logEntries');
        if (!container) return;
        
        if (!logs || logs.length === 0) {
            container.innerHTML = '<div class="no-logs">📋 Nessun log disponibile</div>';
            return;
        }
        
        let html = '';
        logs.forEach(log => {
            const statusIcon = log.status === 'success' ? '✅' : '❌';
            html += `
            <div class="activity-log-item ${log.status}">
                <div class="log-icon">${statusIcon}</div>
                <div class="log-content">
                    <div class="log-header-info">
                        <div class="log-main-info">
                            <span class="log-user">${log.user || 'Sistema'}</span>
                            <span class="log-action">${log.action || 'Azione'}</span>
                        </div>
                        <span class="log-time">${log.time_ago || 'N/A'}</span>
                    </div>
                    ${log.description ? `<div class="log-details">${log.description}</div>` : ''}
                </div>
            </div>`;
        });
        
        container.innerHTML = html;
    },
    
    // ===== EVENT LISTENERS =====
    attachEventListeners() {
        const eventForm = document.getElementById('eventForm');
        if (eventForm) {
            eventForm.addEventListener('submit', (e) => this.handleEventSubmit(e));
        }
        
        const categoryForm = document.getElementById('categoryForm');
        if (categoryForm) {
            categoryForm.addEventListener('submit', (e) => this.handleCategorySubmit(e));
        }
        
        // Modal closers
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                if (e.target.id === 'eventModal') {
                    this.closeEventModal();
                } else if (e.target.id === 'categoriesModal') {
                    this.closeCategoriesModal();
                }
            }
        });
        
        const modalCloses = document.querySelectorAll('.modal-close');
        modalCloses.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const modal = e.target.closest('.modal');
                if (modal) {
                    if (modal.id === 'eventModal') {
                        this.closeEventModal();
                    } else if (modal.id === 'categoriesModal') {
                        this.closeCategoriesModal();
                    }
                }
            });
        });
        
        // Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const eventModal = document.getElementById('eventModal');
                const categoriesModal = document.getElementById('categoriesModal');
                
                if (eventModal && eventModal.style.display === 'flex') {
                    this.closeEventModal();
                }
                if (categoriesModal && categoriesModal.style.display === 'flex') {
                    this.closeCategoriesModal();
                }
            }
        });
        
        console.log('🔗 Event listeners collegati');
    },
    
    // ===== GESTIONE EVENTI =====
    async handleEventSubmit(e) {
        e.preventDefault();
        
        try {
            const formData = new FormData(e.target);
            formData.append('csrf_token', this.csrfToken);
            
            const submitBtn = e.target.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Salvataggio...';
            submitBtn.disabled = true;
            
            const response = await fetch('/modules/agenda/ajax/save_event.php', {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error(`HTTP Error ${response.status}`);
            }
            
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const textResponse = await response.text();
                console.error('save_event.php restituisce HTML:', textResponse.substring(0, 200));
                throw new Error('Il server ha restituito HTML invece di JSON');
            }
            
            const data = await response.json();
            
            if (data.success) {
                this.showSuccess(data.message || 'Evento salvato con successo');
                this.closeEventModal();
                await this.refreshAll();
            } else {
                throw new Error(data.error || 'Errore durante il salvataggio');
            }
            
        } catch (error) {
            console.error('❌ Errore salvataggio evento:', error);
            this.showError('Errore nel salvataggio: ' + error.message);
        } finally {
            const submitBtn = e.target.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.textContent = originalText || 'Salva Evento';
                submitBtn.disabled = false;
            }
        }
    },
    
    async handleCategorySubmit(e) {
        e.preventDefault();
        
        try {
            const formData = new FormData(e.target);
            formData.append('csrf_token', this.csrfToken);
            
            const submitBtn = e.target.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.textContent = originalText.includes('Aggiorna') ? 'Aggiornamento...' : 'Creazione...';
            submitBtn.disabled = true;
            
            const response = await fetch('/modules/agenda/ajax/save_category.php', {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error(`HTTP Error ${response.status}`);
            }
            
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const textResponse = await response.text();
                console.error('save_category.php restituisce HTML:', textResponse.substring(0, 200));
                throw new Error('Il server ha restituito HTML invece di JSON');
            }
            
            const data = await response.json();
            
            if (data.success) {
                this.showSuccess(data.message || 'Categoria salvata con successo');
                
                e.target.reset();
                const categoryId = document.getElementById('categoryId');
                if (categoryId) categoryId.remove();
                
                submitBtn.textContent = 'Aggiungi Categoria';
                await this.loadCategoriesForManagement();
                
                setTimeout(() => window.location.reload(), 1000);
                
            } else {
                throw new Error(data.error || 'Errore durante il salvataggio');
            }
            
        } catch (error) {
            console.error('❌ Errore salvataggio categoria:', error);
            this.showError('Errore nel salvataggio: ' + error.message);
        } finally {
            const submitBtn = e.target.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = false;
                if (!submitBtn.textContent.includes('Aggiungi')) {
                    submitBtn.textContent = 'Aggiungi Categoria';
                }
            }
        }
    },
    
    // ===== MODAL EVENTI =====
    async openEventModal(eventId = null) {
        const modal = document.getElementById('eventModal');
        const form = document.getElementById('eventForm');
        const title = document.getElementById('modalTitle');
        const deleteBtn = document.getElementById('deleteEventBtn');
        
        if (!modal || !form) {
            console.error('Modal o form non trovato');
            this.showError('Componenti modal non trovati');
            return;
        }
        
        try {
            if (eventId) {
                title.textContent = '✏️ Modifica Evento';
                if (deleteBtn) deleteBtn.style.display = 'inline-block';
                
                const eventData = await this.loadEventData(eventId);
                this.populateEventForm(eventData.event, eventData.responsables_ids || []);
                
            } else {
                title.textContent = '➕ Nuovo Evento';
                if (deleteBtn) deleteBtn.style.display = 'none';
                form.reset();
                
                const eventIdField = document.getElementById('eventId');
                if (eventIdField) eventIdField.value = '';
                
                const priorityField = document.getElementById('eventPriority');
                if (priorityField) priorityField.value = 'medium';
                
                const reminderField = document.getElementById('eventReminder');
                if (reminderField) reminderField.value = '15';
                
                if (window.agendaData && window.agendaData.userId) {
                    const userCheckbox = document.querySelector(`input[name="responsables[]"][value="${window.agendaData.userId}"]`);
                    if (userCheckbox) userCheckbox.checked = true;
                }
            }
            
            modal.style.display = 'flex';
            modal.classList.add('show');
            
            setTimeout(() => {
                const firstInput = modal.querySelector('input[type="text"]');
                if (firstInput) firstInput.focus();
            }, 100);
            
        } catch (error) {
            console.error('❌ Errore apertura modal:', error);
            this.showError('Errore nel caricamento del modal: ' + error.message);
        }
    },
    
    async loadEventData(eventId) {
        console.log('📋 Caricamento dati evento:', eventId);
        try {
            const response = await fetch(`/modules/agenda/ajax/get_event.php?event_id=${eventId}`);
            
            if (!response.ok) {
                throw new Error(`HTTP Error ${response.status}`);
            }
            
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const textResponse = await response.text();
                console.error('get_event.php restituisce HTML:', textResponse.substring(0, 200));
                throw new Error('Il server ha restituito HTML invece di JSON');
            }
            
            const data = await response.json();
            
            if (data.success) {
                console.log('✅ Dati evento caricati:', data);
                return data;
            } else {
                throw new Error(data.error || 'Errore nel caricamento evento');
            }
        } catch (error) {
            console.error('❌ Errore loadEventData:', error);
            throw error;
        }
    },
    
    populateEventForm(event, responsablesIds = []) {
        const fields = {
            'eventId': event.id || '',
            'eventTitle': event.title || '',
            'eventDescription': event.description || '',
            'eventStartDate': event.start_date || '',
            'eventStartTime': event.start_time || '',
            'eventEndDate': event.end_date || '',
            'eventEndTime': event.end_time || '',
            'eventCategory': event.category_id || '',
            'eventClient': event.client_id || '',
            'eventLocation': event.location || '',
            'eventPriority': event.priority || 'medium',
            'eventReminder': event.reminder_minutes || 15
        };
        
        Object.keys(fields).forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.value = fields[fieldId];
            }
        });
        
        const allDayField = document.getElementById('allDayEvent');
        if (allDayField) {
            allDayField.checked = event.all_day || false;
        }
        
        const responsableCheckboxes = document.querySelectorAll('input[name="responsables[]"]');
        responsableCheckboxes.forEach(checkbox => {
            checkbox.checked = responsablesIds.includes(parseInt(checkbox.value));
        });
    },
    
    closeEventModal() {
        const modal = document.getElementById('eventModal');
        if (modal) {
            modal.classList.remove('show');
            setTimeout(() => {
                modal.style.display = 'none';
            }, 300);
            
            const form = document.getElementById('eventForm');
            if (form) form.reset();
        }
    },
    
    async deleteEvent() {
        const eventIdField = document.getElementById('eventId');
        if (!eventIdField) {
            this.showError('ID evento non trovato');
            return;
        }
        
        const eventId = eventIdField.value;
        if (!eventId) {
            this.showError('ID evento non valido');
            return;
        }
        
        if (!confirm('🗑️ Sei sicuro di voler eliminare questo evento?\n\nQuesta azione non può essere annullata.')) {
            return;
        }
        
        try {
            const formData = new FormData();
            formData.append('event_id', eventId);
            formData.append('csrf_token', this.csrfToken);
            
            const response = await fetch('/modules/agenda/ajax/delete_event.php', {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error(`HTTP Error ${response.status}`);
            }
            
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const textResponse = await response.text();
                console.error('delete_event.php restituisce HTML:', textResponse.substring(0, 200));
                throw new Error('Il server ha restituito HTML invece di JSON');
            }
            
            const data = await response.json();
            
            if (data.success) {
                this.showSuccess('Evento eliminato con successo');
                this.closeEventModal();
                await this.refreshAll();
            } else {
                throw new Error(data.error || 'Errore durante l\'eliminazione');
            }
            
        } catch (error) {
            console.error('❌ Errore eliminazione evento:', error);
            this.showError('Errore nell\'eliminazione: ' + error.message);
        }
    },
    
    // ===== MODAL CATEGORIE =====
    openCategoriesModal() {
        const modal = document.getElementById('categoriesModal');
        if (modal) {
            modal.style.display = 'flex';
            modal.classList.add('show');
            this.loadCategoriesForManagement();
        }
    },
    
    closeCategoriesModal() {
        const modal = document.getElementById('categoriesModal');
        if (modal) {
            modal.classList.remove('show');
            setTimeout(() => {
                modal.style.display = 'none';
            }, 300);
        }
        
        const form = document.getElementById('categoryForm');
        if (form) {
            form.reset();
            const idField = document.getElementById('categoryId');
            if (idField) idField.remove();
        }
    },
    
    async loadCategoriesForManagement() {
        const container = document.getElementById('categoriesList');
        if (!container) return;
        
        try {
            container.innerHTML = '<div class="loading-categories">📂 Caricamento categorie...</div>';
            
            const response = await fetch('/modules/agenda/ajax/get_categories.php');
            
            if (!response.ok) {
                throw new Error(`HTTP Error ${response.status}`);
            }
            
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const textResponse = await response.text();
                console.error('get_categories.php restituisce HTML:', textResponse.substring(0, 200));
                throw new Error('Il server ha restituito HTML invece di JSON');
            }
            
            const data = await response.json();
            
            if (data.success && data.categories) {
                this.categories = data.categories;
                
                if (data.categories.length === 0) {
                    container.innerHTML = `
                        <div class="no-categories">
                            <div class="no-categories-icon">🏷️</div>
                            <div class="no-categories-text">Nessuna categoria creata</div>
                            <div class="no-categories-hint">Crea la tua prima categoria nel form sopra</div>
                        </div>
                    `;
                    return;
                }
                
                let html = '';
                data.categories.forEach(category => {
                    html += `
                    <div class="category-item-manage" data-category-id="${category.id}">
                        <div class="category-preview">
                            <div class="category-color" 
                                 style="background-color: ${category.color}; width: 16px; height: 16px; border-radius: 3px; flex-shrink: 0;"></div>
                            <span class="category-icon" style="font-size: 16px; margin: 0 8px;">${category.icon}</span>
                            <div class="category-info">
                                <span class="category-name">${category.name}</span>
                                <small class="category-meta">Creata da ${category.created_by_name || 'Sistema'}</small>
                            </div>
                        </div>
                        <div class="category-actions">
                            <button class="btn-small btn-edit" 
                                    onclick="AgendaManager.editCategory(${category.id})" 
                                    title="Modifica categoria">✏️</button>
                            <button class="btn-small btn-danger" 
                                    onclick="AgendaManager.deleteCategory(${category.id})" 
                                    title="Elimina categoria">🗑️</button>
                        </div>
                    </div>`;
                });
                
                container.innerHTML = html;
                console.log(`📂 ${data.categories.length} categorie caricate`);
                
            } else {
                throw new Error(data.error || 'Errore nel caricamento categorie');
            }
            
        } catch (error) {
            console.error('❌ Errore caricamento categorie:', error);
            container.innerHTML = `
                <div class="error-categories">
                    <div class="error-icon">❌</div>
                    <div class="error-text">Errore: ${error.message}</div>
                    <button class="btn-small" onclick="AgendaManager.loadCategoriesForManagement()">🔄 Riprova</button>
                </div>
            `;
        }
    },
    
    editCategory(categoryId) {
        console.log('✏️ Modifica categoria:', categoryId);
        
        const category = this.categories.find(c => c.id == categoryId);
        if (!category) {
            this.showError('Categoria non trovata');
            return;
        }
        
        const nameField = document.getElementById('catName');
        const colorField = document.getElementById('catColor');
        const iconField = document.getElementById('catIcon');
        
        if (nameField) nameField.value = category.name || '';
        if (colorField) colorField.value = category.color || '#3b82f6';
        if (iconField) iconField.value = category.icon || '📅';
        
        let idField = document.getElementById('categoryId');
        if (!idField) {
            idField = document.createElement('input');
            idField.type = 'hidden';
            idField.id = 'categoryId';
            idField.name = 'category_id';
            const form = document.getElementById('categoryForm');
            if (form) form.appendChild(idField);
        }
        idField.value = categoryId;
        
        const submitBtn = document.querySelector('#categoryForm button[type="submit"]');
        if (submitBtn) {
            submitBtn.textContent = '✏️ Aggiorna Categoria';
        }
        
        const form = document.getElementById('categoryForm');
        if (form) {
            form.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        
        setTimeout(() => {
            if (nameField) {
                nameField.focus();
                nameField.select();
            }
        }, 500);
        
        this.showInfo(`Modifica categoria: ${category.name}`);
    },
    
    async deleteCategory(categoryId) {
        console.log('🗑️ Elimina categoria:', categoryId);
        
        const category = this.categories.find(c => c.id == categoryId);
        const categoryName = category ? category.name : 'Categoria';
        
        const confirmed = confirm(`🗑️ Elimina categoria "${categoryName}"?\n\n⚠️ Questa azione è irreversibile!\n\nConfermi l'eliminazione?`);
        
        if (!confirmed) return;
        
        try {
            const formData = new FormData();
            formData.append('category_id', categoryId);
            formData.append('csrf_token', this.csrfToken);
            
            this.showInfo('Eliminazione in corso...');
            
            const response = await fetch('/modules/agenda/ajax/delete_category.php', {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error(`HTTP Error ${response.status}`);
            }
            
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const textResponse = await response.text();
                console.error('delete_category.php restituisce HTML:', textResponse.substring(0, 200));
                throw new Error('Il server ha restituito HTML invece di JSON');
            }
            
            const data = await response.json();
            
            if (data.success) {
                this.showSuccess(`Categoria "${categoryName}" eliminata con successo`);
                await this.loadCategoriesForManagement();
                setTimeout(() => window.location.reload(), 1000);
            } else {
                throw new Error(data.error || 'Errore nell\'eliminazione');
            }
            
        } catch (error) {
            console.error('❌ Errore eliminazione categoria:', error);
            this.showError(`Errore nell'eliminazione: ${error.message}`);
        }
    },
    
    // ===== UTILITY FUNCTIONS =====
    selectMiniCalendarDate(dateStr) {
        this.currentDate = new Date(dateStr);
        this.refreshCalendar();
        console.log(`📅 Selezionata data: ${dateStr}`);
    },
    
    changeView(view) {
        this.currentView = view;
        
        const url = new URL(window.location);
        url.searchParams.set('view', view);
        window.history.pushState({}, '', url);
        
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        const activeBtn = document.querySelector(`.view-btn[onclick*="${view}"]`);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }
        
        this.refreshCalendar();
        console.log(`📅 Vista cambiata a: ${view}`);
    },
    
    navigateDate(direction) {
        switch (this.currentView) {
            case 'day':
                this.currentDate.setDate(this.currentDate.getDate() + (direction === 'next' ? 1 : -1));
                break;
            case 'week':
                this.currentDate.setDate(this.currentDate.getDate() + (direction === 'next' ? 7 : -7));
                break;
            case 'month':
            default:
                this.currentDate.setMonth(this.currentDate.getMonth() + (direction === 'next' ? 1 : -1));
                break;
        }
        
        const url = new URL(window.location);
        url.searchParams.set('date', this.currentDate.toISOString().split('T')[0]);
        window.history.pushState({}, '', url);
        
        this.refreshCalendar();
        console.log(`📅 Navigazione: ${direction}`);
    },
    
    goToToday() {
        this.currentDate = new Date();
        
        const url = new URL(window.location);
        url.searchParams.set('date', this.currentDate.toISOString().split('T')[0]);
        window.history.pushState({}, '', url);
        
        this.refreshCalendar();
        console.log('📅 Navigazione a oggi');
    },
    
    dayClick(dateStr) {
        this.openEventModal();
        setTimeout(() => {
            const startDateField = document.getElementById('eventStartDate');
            if (startDateField) {
                startDateField.value = dateStr;
            }
        }, 100);
    },
    
    showDayEvents(dateStr) {
        console.log(`📋 Mostra eventi giorno: ${dateStr}`);
    },
    
    toggleCategory(categoryId) {
        console.log(`🏷️ Toggle categoria: ${categoryId}`);
    },
    
    updateCalendarTitle() {
        const titleElement = document.getElementById('calendarTitle');
        if (!titleElement) return;
        
        const date = this.currentDate;
        let title = '';
        
        switch (this.currentView) {
            case 'day':
                title = date.toLocaleDateString('it-IT', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                });
                break;
            case 'week':
                const monday = new Date(date);
                monday.setDate(date.getDate() - date.getDay() + 1);
                const sunday = new Date(monday);
                sunday.setDate(monday.getDate() + 6);
                title = `${monday.getDate()} - ${sunday.getDate()} ${sunday.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}`;
                break;
            case 'month':
            default:
                title = date.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
                break;
        }
        
        titleElement.textContent = title;
    },
    
    renderCalendar() {
        this.updateCalendarTitle();
        this.initMiniCalendar();
    },
    
    // ===== REFRESH FUNCTIONS =====
    async refreshCalendar() {
        await this.loadEvents();
        this.updateCalendarTitle();
        const url = new URL(window.location);
        url.searchParams.set('view', this.currentView);
        url.searchParams.set('date', this.currentDate.toISOString().split('T')[0]);
        window.location.href = url.toString();
    },
    
    async refreshLogs() {
        console.log('🔄 Refresh log attività...');
        await this.loadActivityLogs();
    },
    
    async refreshAll() {
        console.log('🔄 Refresh completo agenda...');
        await this.loadInitialData();
        await this.refreshCalendar();
    },
    
    filterLogs(filter) {
        console.log('🔍 Filtra log:', filter);
        const params = filter !== 'all' ? `?filter=${filter}` : '';
        fetch(`/modules/agenda/ajax/get_activity_logs.php${params}`)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    this.renderActivityLogs(data.logs || []);
                }
            })
            .catch(error => {
                console.error('Errore filtro log:', error);
            });
    },
    
    // ===== UI FEEDBACK =====
    showSuccess(message, title = 'Successo') {
        console.log('✅ Successo:', message);
        if (window.toastManager) {
            window.toastManager.success(message, title, 4000);
        } else {
            alert(`✅ ${title}: ${message}`);
        }
    },
    
    showError(message, title = 'Errore') {
        console.error('❌ Errore:', message);
        if (window.toastManager) {
            window.toastManager.error(message, title, 6000);
        } else {
            alert(`❌ ${title}: ${message}`);
        }
    },
    
    showWarning(message, title = 'Attenzione') {
        console.warn('⚠️ Warning:', message);
        if (window.toastManager) {
            window.toastManager.warning(message, title, 5000);
        } else {
            alert(`⚠️ ${title}: ${message}`);
        }
    },
    
    showInfo(message, title = 'Informazione') {
        console.info('ℹ️ Info:', message);
        if (window.toastManager) {
            window.toastManager.info(message, title, 4000);
        } else {
            alert(`ℹ️ ${title}: ${message}`);
        }
    },
    
    generateCSRFToken() {
        const tokenMeta = document.querySelector('meta[name="csrf-token"]');
        if (tokenMeta) {
            return tokenMeta.getAttribute('content');
        }
        
        const csrfInput = document.querySelector('input[name="csrf_token"]');
        if (csrfInput) {
            return csrfInput.value;
        }
        
        return Math.random().toString(36).substring(2) + Date.now().toString(36);
    }
};

// ===== FUNZIONI GLOBALI =====
window.openEventModal = function(eventId = null) {
    return AgendaManager.openEventModal(eventId);
};

window.closeEventModal = function() {
    return AgendaManager.closeEventModal();
};

window.deleteEvent = function() {
    return AgendaManager.deleteEvent();
};

window.changeView = function(view) {
    return AgendaManager.changeView(view);
};

window.navigateDate = function(direction) {
    return AgendaManager.navigateDate(direction);
};

window.goToToday = function() {
    return AgendaManager.goToToday();
};

window.dayClick = function(dateStr) {
    return AgendaManager.dayClick(dateStr);
};

window.showDayEvents = function(dateStr) {
    return AgendaManager.showDayEvents(dateStr);
};

window.toggleCategory = function(categoryId) {
    return AgendaManager.toggleCategory(categoryId);
};

window.openCategoriesModal = function() {
    return AgendaManager.openCategoriesModal();
};

// Export globale
window.AgendaManager = AgendaManager;

console.log('✅ AGENDA MANAGER COMPATIBILE CARICATO - TUTTE LE FUNZIONI PRESENTI! 🎯');