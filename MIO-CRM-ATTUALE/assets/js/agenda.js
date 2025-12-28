// File: /assets/js/agenda.js
// JavaScript AGENDA ULTRA SICURO - VERSIONE FINALE PULITA

console.log('🗓️ Caricamento Agenda Manager - VERSIONE FINALE...');

document.addEventListener('DOMContentLoaded', function() {
    console.log('📅 DOM Caricato - Inizializzazione Agenda...');
    setTimeout(() => {
        if (typeof AgendaManager !== 'undefined') {
            AgendaManager.init();
        }
    }, 100);
});

const AgendaManager = {
    currentDate: new Date(),
    currentView: 'month',
    events: [],
    categories: [],
    selectedEvent: null,
    csrfToken: null,
    
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
            
            console.log('✅ AGENDA MANAGER FINALE INIZIALIZZATO CORRETTAMENTE! 🎯');
        } catch (error) {
            console.error('❌ Errore inizializzazione Agenda:', error);
            this.showError('Errore durante l\'inizializzazione: ' + error.message);
        }
    },
    
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
    
    initMiniCalendar() {
        // Supporta sia miniCalendar (sidebar) che miniCalendarModal (pop-up)
        const miniCalendar = document.getElementById('miniCalendar');
        const miniCalendarModal = document.getElementById('miniCalendarModal');

        if (!miniCalendar && !miniCalendarModal) {
            console.log('ℹ️ Mini calendario non presente - OK');
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

        // Renderizza in tutti i calendari disponibili
        if (miniCalendar) miniCalendar.innerHTML = html;
        if (miniCalendarModal) miniCalendarModal.innerHTML = html;

        // Aggiorna il label del mese nel popup
        const monthLabel = document.getElementById('miniCalendarMonth');
        if (monthLabel) {
            monthLabel.textContent = this.currentDate.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
        }

        console.log('✅ Mini calendario inizializzato');
    },

    navigateMiniCalendar(direction) {
        // direction: -1 per mese precedente, +1 per mese successivo
        const newDate = new Date(this.currentDate);
        newDate.setMonth(newDate.getMonth() + direction);
        this.currentDate = newDate;
        this.initMiniCalendar();
    },
    
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
            }
        });
        console.log('⌨️ Keyboard shortcuts attivati');
    },
    
    initializeLogSection() {
        const logHeader = document.querySelector('.section-header-compact');
        if (logHeader && !document.querySelector('.log-toggle-btn')) {
            console.log('✅ Log section già inizializzata');
        }
    },
    
    toggleLogSection() {
        const logContainer = document.querySelector('.log-container');
        const toggleBtn = document.querySelector('.log-toggle-btn');
        
        if (logContainer && toggleBtn) {
            const isHidden = logContainer.style.display === 'none';
            
            if (isHidden) {
                logContainer.style.display = 'block';
                toggleBtn.classList.remove('collapsed');
                
                // Forza il caricamento dei log quando si apre la sezione
                console.log('📋 Apertura sezione log - caricamento forzato');
                const logEntries = document.getElementById('logEntries');
                if (logEntries) {
                    logEntries.innerHTML = '<div class="log-loading">📋 Caricamento log...</div>';
                }
                
                setTimeout(() => {
                    this.loadActivityLogs();
                }, 100);
                
            } else {
                logContainer.style.display = 'none';
                toggleBtn.classList.add('collapsed');
            }
        }
    },
    
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
        console.log('📋 Caricamento log attività...');
        
        try {
            const response = await fetch('/modules/agenda/ajax/get_activity_logs.php', {
                method: 'GET',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });
            
            console.log(`📡 Response status log: ${response.status}`);
            
            if (!response.ok) {
                throw new Error(`HTTP Error ${response.status}`);
            }
            
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const textResponse = await response.text();
                console.error('get_activity_logs.php non restituisce JSON:', textResponse.substring(0, 500));
                throw new Error('Risposta non valida dal server');
            }
            
            const data = await response.json();
            console.log('📥 Log data ricevuti:', data);
            
            if (data.success) {
                this.renderActivityLogs(data.logs || []);
                console.log(`📋 ${data.logs?.length || 0} log caricati con successo`);
            } else {
                throw new Error(data.error || 'Errore caricamento log');
            }
            
        } catch (error) {
            console.error('❌ Errore caricamento log:', error);
            this.renderActivityLogsError(error.message);
        }
    },
    
    renderActivityLogsError(errorMessage) {
        const container = document.getElementById('logEntries');
        if (!container) return;
        
        container.innerHTML = `
            <div class="log-error">
                <div class="error-icon">❌</div>
                <div class="error-text">Errore: ${errorMessage}</div>
                <button class="btn-mini" onclick="AgendaManager.loadActivityLogs()" style="margin-top: 10px;">
                    🔄 Riprova
                </button>
                <button class="btn-mini" onclick="AgendaManager.testLogsEndpoint()" style="margin-top: 10px; margin-left: 5px;">
                    🧪 Test
                </button>
            </div>
        `;
    },
    
    async testLogsEndpoint() {
        console.log('🧪 Test endpoint log...');
        
        try {
            const response = await fetch('/modules/agenda/test_logs.php');
            const result = await response.text();
            console.log('🧪 Test result:', result);
            
            if (window.toastManager) {
                window.toastManager.info('Test completato - controlla console', 'Test Log');
            } else {
                alert('Test completato - controlla la console del browser');
            }
            
        } catch (error) {
            console.error('❌ Errore test:', error);
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
            const statusClass = log.status === 'success' ? 'log-success' : 'log-error';
            
            html += `
            <div class="activity-log-item ${statusClass}">
                <div class="log-status-indicator">
                    <div class="log-icon">${statusIcon}</div>
                </div>
                <div class="log-content">
                    <div class="log-main">
                        <span class="log-user">${log.user || 'Sistema'}</span>
                        <span class="log-action">${log.action || 'Azione'}</span>
                    </div>
                    <div class="log-time">${log.time_ago || 'N/A'}</div>
                    ${log.description ? `<div class="log-details">${log.description}</div>` : ''}
                </div>
            </div>`;
        });
        
        container.innerHTML = html;
    },
    
    attachEventListeners() {
        const eventForm = document.getElementById('eventForm');
        if (eventForm) {
            eventForm.addEventListener('submit', (e) => this.handleEventSubmit(e));
        }
        
        const categoryForm = document.getElementById('categoryForm');
        if (categoryForm) {
            categoryForm.addEventListener('submit', (e) => this.handleCategorySubmit(e));
        }
        
        // Quick category form
        const quickCategoryForm = document.getElementById('quickCategoryForm');
        if (quickCategoryForm) {
            quickCategoryForm.addEventListener('submit', (e) => this.handleQuickCategorySubmit(e));
        }
        
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
        
        // Drag-to-create per eventi multi-ora
        this.initDragToCreate();

        console.log('🔗 Event listeners collegati');
    },

    // 🎯 DRAG TO CREATE - Click e trascina per creare eventi multi-ora
    initDragToCreate() {
        let isDragging = false;
        let dragStartCell = null;
        let dragEndCell = null;
        let highlightedCells = [];

        document.addEventListener('mousedown', (e) => {
            const cell = e.target.closest('.timeslot-cell');
            if (!cell || e.target.closest('.timeslot-event')) return;

            isDragging = true;
            dragStartCell = cell;
            dragEndCell = cell;
            highlightedCells = [cell];
            cell.classList.add('drag-selecting');
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging || !dragStartCell) return;

            const cell = e.target.closest('.timeslot-cell');
            if (!cell) return;

            const startDate = dragStartCell.dataset.date;
            const currentDate = cell.dataset.date;

            // Solo nella stessa colonna (stesso giorno)
            if (startDate !== currentDate) return;

            dragEndCell = cell;

            // Rimuovi highlight precedenti
            highlightedCells.forEach(c => c.classList.remove('drag-selecting'));
            highlightedCells = [];

            // Aggiungi highlight alle celle selezionate
            const startHour = parseInt(dragStartCell.dataset.hour);
            const endHour = parseInt(cell.dataset.hour);
            const minHour = Math.min(startHour, endHour);
            const maxHour = Math.max(startHour, endHour);

            const allCells = document.querySelectorAll(`[data-date="${startDate}"].timeslot-cell`);
            allCells.forEach(c => {
                const hour = parseInt(c.dataset.hour);
                if (hour >= minHour && hour <= maxHour) {
                    c.classList.add('drag-selecting');
                    highlightedCells.push(c);
                }
            });
        });

        document.addEventListener('mouseup', (e) => {
            if (!isDragging) return;

            // Rimuovi highlight
            highlightedCells.forEach(c => c.classList.remove('drag-selecting'));

            if (dragStartCell && dragEndCell) {
                const date = dragStartCell.dataset.date;
                const startHour = parseInt(dragStartCell.dataset.hour);
                const endHour = parseInt(dragEndCell.dataset.hour);
                const minHour = Math.min(startHour, endHour);
                const maxHour = Math.max(startHour, endHour);

                // Crea evento con durata multi-ora
                this.createEventWithTimeRange(date, minHour, maxHour + 1);
            }

            isDragging = false;
            dragStartCell = null;
            dragEndCell = null;
            highlightedCells = [];
        });
    },

    createEventWithTimeRange(date, startHour, endHour) {
        const modal = document.getElementById('eventModal');
        if (!modal) return;

        // Reset form
        const form = document.getElementById('eventForm');
        if (form) form.reset();

        // Nascondi delete button
        const deleteBtn = document.getElementById('deleteEventBtn');
        if (deleteBtn) deleteBtn.style.display = 'none';

        // Imposta date e orari
        const startDateField = document.getElementById('eventStartDate');
        const endDateField = document.getElementById('eventEndDate');
        const startTimeField = document.getElementById('eventStartTime');
        const endTimeField = document.getElementById('eventEndTime');

        if (startDateField) startDateField.value = date;
        if (endDateField) endDateField.value = date;
        if (startTimeField) startTimeField.value = `${String(startHour).padStart(2, '0')}:00`;
        if (endTimeField) endTimeField.value = `${String(endHour).padStart(2, '0')}:00`;

        // Valori default
        const priorityField = document.getElementById('eventPriority');
        if (priorityField) priorityField.value = 'medium';

        const reminderField = document.getElementById('eventReminder');
        if (reminderField) reminderField.value = '0';

        // Seleziona utente corrente
        if (window.agendaData && window.agendaData.userId) {
            this.setSelectedResponsables([window.agendaData.userId]);
        }

        // Mostra modal
        modal.style.display = 'flex';

        // Focus su titolo
        const titleField = document.getElementById('eventTitle');
        if (titleField) {
            setTimeout(() => titleField.focus(), 100);
        }
    },

    // 🔧 FIX DEFINITIVO: Gestione form eventi ULTRA SICURA
    async handleEventSubmit(e) {
        e.preventDefault();
        
        let submitBtn = null;
        let originalText = 'Salva Evento'; // Default sicuro
        
        try {
            console.log('🔄 Inizio salvataggio evento...');
            
            // 🛡️ TROVA IL FORM
            const form = e.target;
            if (!form) {
                throw new Error('Form non trovato');
            }
            
            // 🛡️ TROVA IL BOTTONE SUBMIT - METODO ULTRA SICURO
            submitBtn = document.getElementById('saveEventBtn') ||
                       form.querySelector('button[type="submit"]') ||
                       form.querySelector('.btn-primary');
                       
            if (submitBtn) {
                // SALVA TESTO ORIGINALE PULITO
                originalText = submitBtn.textContent ? submitBtn.textContent.trim() : 'Salva Evento';
                console.log(`📝 Testo bottone salvato: "${originalText}"`);
                
                // Cambia testo e disabilita
                submitBtn.textContent = '⏳ Salvataggio...';
                submitBtn.disabled = true;
            }
            
            // 🌐 PREPARA DATI - VALIDAZIONE LATO CLIENT
            const formData = new FormData(form);
            
            // Aggiungi CSRF token
            formData.append('csrf_token', this.csrfToken);
            
            // VALIDAZIONE CLIENT-SIDE
            const title = formData.get('title');
            const startDate = formData.get('start_date');
            const categoryId = formData.get('category_id');
            
            if (!title || title.trim().length === 0) {
                throw new Error('Il titolo è obbligatorio');
            }
            
            if (!startDate) {
                throw new Error('La data di inizio è obbligatoria');
            }
            
            if (!categoryId) {
                throw new Error('La categoria è obbligatoria');
            }
            
            console.log('✅ Validazione client completata');
            
            // 🌐 RICHIESTA AJAX
            const response = await fetch('/modules/agenda/ajax/save_event.php', {
                method: 'POST',
                body: formData,
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });
            
            console.log(`📡 Response status: ${response.status}`);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error(`HTTP ${response.status} Response:`, errorText.substring(0, 500));
                throw new Error(`Errore del server (${response.status}). Controlla i log del server.`);
            }
            
            // Verifica che sia JSON
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const textResponse = await response.text();
                console.error('Response non JSON:', textResponse.substring(0, 500));
                throw new Error('Il server ha restituito una risposta non valida');
            }
            
            const data = await response.json();
            console.log('📥 Response data:', data);
            
            if (data.success) {
                console.log('✅ Evento salvato con successo');
                this.showSuccess(data.message || 'Evento salvato con successo!');
                this.closeEventModal();
                
                // Aggiorna calendario
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
                
            } else {
                throw new Error(data.error || 'Errore durante il salvataggio');
            }
            
        } catch (error) {
            console.error('❌ Errore salvataggio evento:', error);
            this.showError('Errore: ' + error.message);
        } finally {
            // 🛡️ RIPRISTINO BOTTONE SEMPRE E COMUNQUE
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
                console.log(`🔄 Bottone ripristinato: "${originalText}"`);
            }
        }
    },
    
    // 🔧 Quick Category Form Handler
    async handleQuickCategorySubmit(e) {
        e.preventDefault();
        
        let submitBtn = null;
        let originalText = '+';
        
        try {
            console.log('🔄 Salvataggio categoria rapida...');
            
            const form = e.target;
            const formData = new FormData(form);
            formData.append('csrf_token', this.csrfToken);
            
            submitBtn = form.querySelector('button[type="submit"]');
            if (submitBtn) {
                originalText = submitBtn.textContent.trim();
                submitBtn.textContent = '⏳';
                submitBtn.disabled = true;
            }
            
            const response = await fetch('/modules/agenda/ajax/save_category.php', {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error(`HTTP Error ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.success) {
                this.showSuccess('Categoria creata!');
                form.reset();
                
                // Aggiorna tutto dopo un secondo
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
            } else {
                throw new Error(data.error || 'Errore creazione categoria');
            }
            
        } catch (error) {
            console.error('❌ Errore categoria rapida:', error);
            this.showError('Errore: ' + error.message);
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        }
    },
    
    // 🔧 Category Form Handler (modal completo)
    async handleCategorySubmit(e) {
        e.preventDefault();
        
        let submitBtn = null;
        let originalText = 'Aggiungi Categoria';
        
        try {
            console.log('🔄 Salvataggio categoria completa...');
            
            const form = e.target;
            const formData = new FormData(form);
            formData.append('csrf_token', this.csrfToken);
            
            submitBtn = form.querySelector('button[type="submit"]');
            if (submitBtn) {
                originalText = submitBtn.textContent.trim();
                submitBtn.textContent = 'Salvataggio...';
                submitBtn.disabled = true;
            }
            
            const response = await fetch('/modules/agenda/ajax/save_category.php', {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error(`HTTP Error ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.success) {
                this.showSuccess(data.message || 'Categoria salvata!');
                form.reset();
                
                // Reset ID field se in modalità modifica
                const categoryId = document.getElementById('categoryId');
                if (categoryId) categoryId.remove();
                
                await this.loadCategoriesForManagement();
                
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
                
            } else {
                throw new Error(data.error || 'Errore salvataggio categoria');
            }
            
        } catch (error) {
            console.error('❌ Errore categoria:', error);
            this.showError('Errore: ' + error.message);
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        }
    },
    
    // 🎯 MODAL GESTIONE - APERTURA SICURA CON DATA OGGI
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
                // MODIFICA EVENTO ESISTENTE
                if (title) title.textContent = '✏️ Modifica Evento';
                if (deleteBtn) deleteBtn.style.display = 'inline-block';
                
                const eventData = await this.loadEventData(eventId);
                this.populateEventForm(eventData.event, eventData.responsables_ids || []);
                
            } else {
                // NUOVO EVENTO
                if (title) title.textContent = '➕ Nuovo Evento';
                if (deleteBtn) deleteBtn.style.display = 'none';
                
                // Reset completo form
                form.reset();
                
                const eventIdField = document.getElementById('eventId');
                if (eventIdField) eventIdField.value = '';
                
                // 🎯 IMPOSTA DATA DI OGGI AUTOMATICAMENTE
                const today = new Date().toISOString().split('T')[0];
                const startDateField = document.getElementById('eventStartDate');
                const endDateField = document.getElementById('eventEndDate');
                
                if (startDateField) {
                    startDateField.value = today;
                    console.log(`📅 Data di oggi impostata: ${today}`);
                }
                if (endDateField) {
                    endDateField.value = today;
                }
                
                // Valori default
                const priorityField = document.getElementById('eventPriority');
                if (priorityField) priorityField.value = 'medium';

                const reminderField = document.getElementById('eventReminder');
                if (reminderField) reminderField.value = '0';
                
                // Seleziona utente corrente come responsabile
                if (window.agendaData && window.agendaData.userId) {
                    this.setSelectedResponsables([window.agendaData.userId]);
                }
            }
            
            modal.style.display = 'flex';
            modal.classList.add('show');
            
            // Focus sul primo campo
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
        try {
            const response = await fetch(`/modules/agenda/ajax/get_event.php?event_id=${eventId}`);
            
            if (!response.ok) {
                throw new Error(`HTTP Error ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.success) {
                return data;
            } else {
                throw new Error(data.error || 'Errore nel caricamento evento');
            }
        } catch (error) {
            console.error('❌ Errore loadEventData:', error);
            throw error;
        }
    },
    
    // 🔧 FIX: Sostituisci la funzione populateEventForm nell'agenda.js con questa versione
    
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
            'eventClient': event.client_id || '',  // Campo nascosto
            'eventLocation': event.location || '',
            'eventPriority': event.priority || 'medium',
            'eventReminder': event.reminder_minutes || 0
        };
        
        // Popola i campi standard
        Object.keys(fields).forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.value = fields[fieldId];
            }
        });
        
        // Checkbox all day
        const allDayField = document.getElementById('allDayEvent');
        if (allDayField) {
            allDayField.checked = event.all_day || false;
        }
        
        // Responsabili
        this.setSelectedResponsables(responsablesIds);
        
        // 🎯 FIX PRINCIPALE: Preseleziona il cliente nel ContactSelector
        if (event.client_id && typeof ContactSelector !== 'undefined') {
            console.log(`👤 Preselezionando cliente ID: ${event.client_id}`);
            
            // Aspetta un attimo per essere sicuri che ContactSelector sia pronto
            setTimeout(() => {
                ContactSelector.preselectContact('eventClient', event.client_id);
            }, 100);
        } else if (event.client_id) {
            console.warn('⚠️ ContactSelector non disponibile, cliente non preselezionato');
        } else {
            console.log('ℹ️ Nessun cliente associato a questo evento');
        }
    },
    
    setSelectedResponsables(responsablesIds) {
        // Checkbox (metodo principale)
        const responsableCheckboxes = document.querySelectorAll('input[name="responsables[]"]');
        responsableCheckboxes.forEach(checkbox => {
            checkbox.checked = responsablesIds.includes(parseInt(checkbox.value));
        });
        
        // Dropdown multiselect (fallback)
        const responsablesSelect = document.getElementById('eventResponsables');
        if (responsablesSelect) {
            Array.from(responsablesSelect.options).forEach(option => {
                option.selected = responsablesIds.includes(parseInt(option.value));
            });
        }
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
        if (!eventIdField || !eventIdField.value) {
            this.showError('ID evento non valido');
            return;
        }
        
        const eventId = eventIdField.value;
        
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
            
            const data = await response.json();
            
            if (data.success) {
                this.showSuccess('Evento eliminato con successo');
                this.closeEventModal();
                setTimeout(() => window.location.reload(), 1000);
            } else {
                throw new Error(data.error || 'Errore durante l\'eliminazione');
            }
            
        } catch (error) {
            console.error('❌ Errore eliminazione evento:', error);
            this.showError('Errore nell\'eliminazione: ' + error.message);
        }
    },
    
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
            
            const data = await response.json();
            
            if (data.success && data.categories) {
                this.categories = data.categories;
                
                if (data.categories.length === 0) {
                    container.innerHTML = `
                        <div class="no-categories">
                            <div class="no-categories-icon">🏷️</div>
                            <div class="no-categories-text">Nessuna categoria creata</div>
                            <div class="no-categories-hint">Crea la tua prima categoria nel form</div>
                        </div>
                    `;
                    return;
                }
                
                let html = '';
                data.categories.forEach(category => {
                    html += `
                    <div class="category-item-manage" data-category-id="${category.id}">
                        <div class="category-preview">
                            <div class="category-color" style="background-color: ${category.color};"></div>
                            <span class="category-icon">${category.icon}</span>
                            <div class="category-info">
                                <span class="category-name">${category.name}</span>
                                <small class="category-meta">Creata da ${category.created_by_name || 'Sistema'}</small>
                            </div>
                        </div>
                        <div class="category-actions">
                            <button class="btn-small btn-edit" onclick="AgendaManager.editCategory(${category.id})" title="Modifica">✏️</button>
                            <button class="btn-small btn-danger" onclick="AgendaManager.deleteCategory(${category.id})" title="Elimina">🗑️</button>
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
        
        setTimeout(() => {
            if (nameField) {
                nameField.focus();
                nameField.select();
            }
        }, 500);
        
        this.showInfo(`Modifica categoria: ${category.name}`);
    },
    
    async deleteCategory(categoryId) {
        const category = this.categories.find(c => c.id == categoryId);
        const categoryName = category ? category.name : 'Categoria';
        
        const confirmed = confirm(`🗑️ Elimina categoria "${categoryName}"?\n\n⚠️ Questa azione è irreversibile!\n\nConfermi l'eliminazione?`);
        
        if (!confirmed) return;
        
        try {
            const formData = new FormData();
            formData.append('category_id', categoryId);
            formData.append('csrf_token', this.csrfToken);
            
            const response = await fetch('/modules/agenda/ajax/delete_category.php', {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error(`HTTP Error ${response.status}`);
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
    
    // UTILITY FUNCTIONS
    selectMiniCalendarDate(dateStr) {
        this.currentDate = new Date(dateStr);
        this.refreshCalendar();
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
    },
    
    goToToday() {
        this.currentDate = new Date();
        
        const url = new URL(window.location);
        url.searchParams.set('date', this.currentDate.toISOString().split('T')[0]);
        window.history.pushState({}, '', url);
        
        this.refreshCalendar();
    },
    
    dayClick(dateStr) {
        this.openEventModal();
        setTimeout(() => {
            const startDateField = document.getElementById('eventStartDate');
            const endDateField = document.getElementById('eventEndDate');
            if (startDateField) {
                startDateField.value = dateStr;
            }
            if (endDateField) {
                endDateField.value = dateStr;
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
    
    async refreshCalendar() {
        await this.loadEvents();
        this.updateCalendarTitle();
        const url = new URL(window.location);
        url.searchParams.set('view', this.currentView);
        url.searchParams.set('date', this.currentDate.toISOString().split('T')[0]);
        window.location.href = url.toString();
    },
    
    async refreshLogs() {
        await this.loadActivityLogs();
    },
    
    async refreshAll() {
        await this.loadInitialData();
        await this.refreshCalendar();
    },
    
    filterLogs(filter) {
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
    
    // UI FEEDBACK
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

// FUNZIONI GLOBALI
window.openEventModal = (eventId = null) => AgendaManager.openEventModal(eventId);
window.closeEventModal = () => AgendaManager.closeEventModal();
window.deleteEvent = () => AgendaManager.deleteEvent();
window.changeView = (view) => AgendaManager.changeView(view);
window.navigateDate = (direction) => AgendaManager.navigateDate(direction);
window.goToToday = () => AgendaManager.goToToday();
window.dayClick = (dateStr) => AgendaManager.dayClick(dateStr);
window.showDayEvents = (dateStr) => AgendaManager.showDayEvents(dateStr);
window.toggleCategory = (categoryId) => AgendaManager.toggleCategory(categoryId);
window.openCategoriesModal = () => AgendaManager.openCategoriesModal();
window.toggleLogSection = () => AgendaManager.toggleLogSection();

// 🎯 NUOVA FUNZIONE: Crea evento cliccando su fascia oraria
window.createEventAtTime = (dateStr, hour) => {
    console.log('📅 Creazione evento per:', dateStr, 'ore', hour);

    // Apri modal
    AgendaManager.openEventModal();

    // Aspetta che il modal sia aperto e popolalo
    setTimeout(() => {
        const startDateField = document.getElementById('eventStartDate');
        const endDateField = document.getElementById('eventEndDate');
        const startTimeField = document.getElementById('eventStartTime');
        const endTimeField = document.getElementById('eventEndTime');
        const allDayCheckbox = document.getElementById('allDayEvent');

        // Calcola le ore PRIMA degli if
        const startHour = String(hour).padStart(2, '0');
        const endHour = String((hour + 1) % 24).padStart(2, '0');

        if (startDateField) {
            startDateField.value = dateStr;
        }

        if (endDateField) {
            endDateField.value = dateStr;
        }

        if (startTimeField) {
            startTimeField.value = startHour + ':00';
        }

        if (endTimeField) {
            endTimeField.value = endHour + ':00';
        }

        if (allDayCheckbox) {
            allDayCheckbox.checked = false;
        }

        // Focus sul titolo
        const titleField = document.getElementById('eventTitle');
        if (titleField) {
            titleField.focus();
        }

        console.log('✅ Modal popolato con data e ora:', dateStr, startHour + ':00', '-', endHour + ':00');
    }, 200);
};

// 🎯 FUNZIONE: Toggle sezioni sidebar
window.toggleSidebarSection = (sectionId) => {
    const section = document.getElementById(sectionId + '-section');
    const header = event.currentTarget;

    if (!section) return;

    if (section.style.display === 'none' || section.style.display === '') {
        section.style.display = 'block';
        header.classList.add('active');

        // Se è la sezione log, carica i dati
        if (sectionId === 'logs' && AgendaManager.loadActivityLogs) {
            setTimeout(() => AgendaManager.loadActivityLogs(), 100);
        }
    } else {
        section.style.display = 'none';
        header.classList.remove('active');
    }
};

// 🎯 FUNZIONI: Apertura/chiusura modal navigazione date
window.openDatepickerModal = () => {
    const modal = document.getElementById('datepickerModal');
    if (modal) {
        modal.classList.add('show');
        // NON bloccare lo scroll - è un pop-up draggable, non un modal fullscreen
        initDraggableModal();
    }
};

window.closeDatepickerModal = () => {
    const modal = document.getElementById('datepickerModal');
    if (modal) {
        modal.classList.remove('show');
    }
};

// Chiudi modal con tasto ESC
window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const modal = document.getElementById('datepickerModal');
        if (modal && modal.classList.contains('show')) {
            closeDatepickerModal();
        }
    }
});

// === FUNZIONALITÀ DRAG PER POP-UP NAVIGAZIONE ===
function initDraggableModal() {
    const modal = document.getElementById('datepickerModal');
    const dragHandle = document.getElementById('dragHandle');

    if (!modal || !dragHandle) return;

    let isDragging = false;
    let currentX;
    let currentY;
    let initialX;
    let initialY;
    let xOffset = 0;
    let yOffset = 0;

    dragHandle.addEventListener('mousedown', dragStart);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', dragEnd);

    function dragStart(e) {
        initialX = e.clientX - xOffset;
        initialY = e.clientY - yOffset;

        if (e.target === dragHandle || dragHandle.contains(e.target)) {
            // Non draggare se si clicca sul bottone close
            if (e.target.classList.contains('modal-datepicker-close')) {
                return;
            }
            isDragging = true;
        }
    }

    function drag(e) {
        if (isDragging) {
            e.preventDefault();

            currentX = e.clientX - initialX;
            currentY = e.clientY - initialY;

            xOffset = currentX;
            yOffset = currentY;

            setTranslate(currentX, currentY, modal);
        }
    }

    function dragEnd(e) {
        initialX = currentX;
        initialY = currentY;
        isDragging = false;
    }

    function setTranslate(xPos, yPos, el) {
        el.style.transform = `translate(${xPos}px, ${yPos}px)`;
    }
}

window.AgendaManager = AgendaManager;

// Funzione helper globale per navigare nel mini calendario
function navigateMiniCalendar(direction) {
    AgendaManager.navigateMiniCalendar(direction);
}

// ========================================
// FUNZIONI IMPORTAZIONE TASK
// ========================================

let allTasks = [];

window.openTaskSelector = function() {
    const modal = document.getElementById('taskSelectorModal');
    if (modal) {
        modal.classList.add('show');
        loadTasksForSelector();
    }
};

window.closeTaskSelector = function() {
    const modal = document.getElementById('taskSelectorModal');
    if (modal) {
        modal.classList.remove('show');
    }
};

async function loadTasksForSelector() {
    const tasksList = document.getElementById('tasksList');
    tasksList.innerHTML = '<div class="loading">Caricamento task...</div>';

    try {
        const response = await fetch('/modules/task_manager/ajax/get_tasks.php');
        const data = await response.json();

        if (data.success && data.tasks) {
            allTasks = data.tasks;
            // Applica i filtri invece di mostrare tutti
            filterTasks();
        } else {
            tasksList.innerHTML = '<div class="error">Errore nel caricamento dei task</div>';
        }
    } catch (error) {
        console.error('Errore caricamento task:', error);
        tasksList.innerHTML = '<div class="error">Errore di connessione</div>';
    }
}

function renderTasks(tasks) {
    const tasksList = document.getElementById('tasksList');

    if (tasks.length === 0) {
        tasksList.innerHTML = '<div class="no-tasks">Nessun task trovato</div>';
        return;
    }

    const statusLabels = {
        pending: 'In attesa',
        in_progress: 'In corso',
        completed: 'Completato'
    };

    const html = tasks.map(task => `
        <div class="task-selector-item status-${task.status}" onclick="selectTask(${task.id})">
            <div class="task-selector-item-header">
                <div>
                    <div class="task-selector-item-title">${escapeHtml(task.title)}</div>
                    <div class="task-selector-item-meta">
                        <span class="task-selector-item-badge status">${statusLabels[task.status] || task.status}</span>
                        ${task.category_name ? `<span class="task-selector-item-badge">📁 ${escapeHtml(task.category_name)}</span>` : ''}
                        ${task.client_name ? `<span class="task-selector-item-badge">🏢 ${escapeHtml(task.client_name)}</span>` : ''}
                        ${task.deadline ? `<span class="task-selector-item-badge">📅 ${formatDate(task.deadline)}</span>` : ''}
                    </div>
                </div>
            </div>
            ${task.description ? `<div style="font-size: 13px; color: #71717a; margin-top: 6px;">${escapeHtml(task.description.substring(0, 100))}${task.description.length > 100 ? '...' : ''}</div>` : ''}
        </div>
    `).join('');

    tasksList.innerHTML = html;
}

window.filterTasks = function() {
    const searchTerm = document.getElementById('taskSearchInput').value.toLowerCase();
    const showCompleted = document.getElementById('showCompletedTasks').checked;

    console.log('Filtrando task - showCompleted:', showCompleted, 'totali:', allTasks.length);

    let filtered = allTasks.filter(task => {
        // Filtro ricerca testuale
        const matchesSearch = !searchTerm ||
            task.title.toLowerCase().includes(searchTerm) ||
            (task.description && task.description.toLowerCase().includes(searchTerm)) ||
            (task.client_name && task.client_name.toLowerCase().includes(searchTerm));

        // Escludi i completati se la checkbox non è spuntata
        const matchesStatus = showCompleted || task.status !== 'completed';

        return matchesSearch && matchesStatus;
    });

    console.log('Task filtrati:', filtered.length);
    renderTasks(filtered);
};

window.selectTask = function(taskId) {
    const task = allTasks.find(t => t.id === taskId);
    if (!task) {
        console.error('Task non trovato:', taskId);
        return;
    }

    console.log('═══════════════════════════════════════');
    console.log('🔄 IMPORTAZIONE TASK - DIAGNOSTIC MODE');
    console.log('═══════════════════════════════════════');
    console.log('Task:', task);
    console.log('  • category_id:', task.category_id, '(' + typeof task.category_id + ')');
    console.log('  • category_name:', task.category_name);
    console.log('  • client_id:', task.client_id, '(' + typeof task.client_id + ')');
    console.log('  • client_name:', task.client_name);

    // Titolo
    document.getElementById('eventTitle').value = task.title || '';
    console.log('✅ Titolo');

    // Descrizione
    if (task.description) {
        document.getElementById('eventDescription').value = task.description;
        console.log('✅ Descrizione');
    }

    // Data
    if (task.deadline) {
        const deadlineDate = new Date(task.deadline);
        const dateString = deadlineDate.toISOString().split('T')[0];
        const startDateField = document.getElementById('eventStartDate');
        const endDateField = document.getElementById('eventEndDate');
        if (startDateField) startDateField.value = dateString;
        if (endDateField) endDateField.value = dateString;
        console.log('✅ Data:', dateString);
    }

    // ════════════ CATEGORIA ════════════
    console.log('\n📁 CATEGORIA:');
    console.log('  Task categoria:', task.category_name, '(ID:', task.category_id, ')');

    // Mappatura tra task_categories e agenda_categories
    const categoryMapping = {
        1: 56,  // Social Media → Interno
        2: 51,  // Design → Progetti Stefano
        3: 56,  // Gestione → Interno
        4: 56,  // Interno → Interno
        5: 5,   // Strategia → Marketing
        6: 5,   // Ricerca → Marketing
        7: 56   // Clienti → Interno
    };

    if (task.category_id && categoryMapping[task.category_id]) {
        const agendaCategoryId = categoryMapping[task.category_id];
        const categoryField = document.getElementById('eventCategory');

        if (categoryField) {
            categoryField.value = agendaCategoryId;
            console.log('✅ CATEGORIA IMPOSTATA:', task.category_name, '→ ID Agenda:', agendaCategoryId);
        } else {
            console.log('  ⚠️  Campo categoria non trovato');
        }
    } else {
        console.log('  ℹ️  Nessuna categoria o mappatura non disponibile');
    }

    // ════════════ CLIENTE ════════════
    console.log('\n🏢 CLIENTE:');

    if (!task.client_id) {
        console.log('  ℹ️  Nessun cliente associato al task');
    } else {
        console.log('  Cliente da task:', task.client_name, '(ID:', task.client_id, ')');

        // Cerca i campi del contact selector
        const clientHiddenField = document.getElementById('eventClient_id');
        const clientSearchField = document.getElementById('eventClient_search');

        console.log('  Campi trovati:');
        console.log('    - Hidden field:', !!clientHiddenField);
        console.log('    - Search field:', !!clientSearchField);

        if (clientHiddenField && clientSearchField) {
            // Imposta il valore hidden
            clientHiddenField.value = String(task.client_id);
            console.log('  ✅ Hidden field value:', clientHiddenField.value);

            // Imposta il valore visibile
            if (task.client_name) {
                clientSearchField.value = task.client_name;
                console.log('  ✅ Search field value:', clientSearchField.value);

                // Trigger eventi per far reagire il componente
                clientSearchField.dispatchEvent(new Event('input', { bubbles: true }));
                clientSearchField.dispatchEvent(new Event('change', { bubbles: true }));

                // Forza anche l'aggiornamento del campo hidden
                clientHiddenField.dispatchEvent(new Event('change', { bubbles: true }));
            }

            console.log('  ✅ CLIENTE IMPOSTATO');
        } else {
            console.error('  ❌ Campi non trovati nel DOM!');
            console.log('  Debug - tutti i campi con "Client":');
            document.querySelectorAll('[id*="Client"], [id*="client"]').forEach(f => {
                console.log(`    - ${f.id || f.name}: type=${f.type}, value="${f.value}"`);
            });
        }
    }

    // Aggiungi riferimento al task nelle note
    const descriptionField = document.getElementById('eventDescription');
    if (descriptionField) {
        const currentDescription = descriptionField.value || '';
        const taskReference = `\n\n[Creato da Task #${taskId}: ${task.title}]`;
        if (!currentDescription.includes(taskReference)) {
            descriptionField.value = (currentDescription + taskReference).trim();
        }
    }

    console.log('✅ Tutti i campi impostati - chiudo il selettore task');

    // ORA chiudi il selettore task DOPO aver impostato tutti i campi
    closeTaskSelector();

    // Mostra un messaggio
    if (typeof showToast !== 'undefined') {
        showToast('✅ Task importato con successo!', 'success');
    }

    console.log('✨ Import completato per task:', taskId);
};

function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

console.log('✅ AGENDA MANAGER STILE NOTION CON FASCE ORARIE E IMPORTAZIONE TASK CARICATO! 🎯📅✨');