// =====================================================
// TASK MANAGER JAVASCRIPT - VERSIONE CORRETTA
// =====================================================

class TaskManager {
    constructor() {
        this.currentView = window.taskManagerData?.currentView || 'kanban';
        this.tasks = window.taskManagerData?.tasks || [];
        this.categories = window.taskManagerData?.categories || [];
        this.clients = window.taskManagerData?.clients || [];
        this.admins = window.taskManagerData?.admins || [];
        this.currentFilter = 'all';
        this.sortColumn = null;
        this.sortDirection = 'asc';
        this.draggedTask = null;
        this.selectedResponsables = [];
        this.currentPreviewTask = null;
        
        this.init();
    }
    
    init() {
        console.log('🚀 Inizializzazione Task Manager...');
        
        // Verifica che i dati siano disponibili
        if (!window.taskManagerData) {
            console.error('❌ taskManagerData non disponibile');
            return;
        }
        
        // Inizializza vista corrente
        this.switchView(this.currentView, false);
        
        // Event listeners
        this.attachEventListeners();
        
        // Inizializza drag & drop
        this.initializeDragAndDrop();
        
        // Carica preferenze utente
        this.loadUserPreferences();
        
        // Inizializza console (SEMPRE CHIUSA)
        this.initializeConsole();
        
        console.log('✅ Task Manager inizializzato');
        
        // NON LOGGARE L'ACCESSO - Solo modifiche amministrative
    }
    
    // =====================================================
    // CONSOLE LOG SYSTEM SOLO PER MODIFICHE ADMIN
    // =====================================================
    
    initializeConsole() {
        // Carica log precedenti dal database (solo modifiche amministrative)
        this.loadPreviousLogs();
        
        // CONSOLE SEMPRE CHIUSA - Non mostrare automaticamente
        this.hideConsole();
        
        // Log solo inizializzazione sistema (una volta per sessione)
        const sessionKey = 'taskManagerInit_' + Date.now().toString().slice(0, -6); // Reset ogni ~16 minuti
        if (!sessionStorage.getItem(sessionKey)) {
            this.logToConsole('🚀 Sistema Task Manager inizializzato', 'success');
            sessionStorage.setItem(sessionKey, 'true');
            
            // Pulisci vecchie chiavi di sessione
            Object.keys(sessionStorage).forEach(key => {
                if (key.startsWith('taskManagerInit_') && key !== sessionKey) {
                    sessionStorage.removeItem(key);
                }
            });
        }
    }
    
    async loadPreviousLogs() {
        try {
            // Carica SOLO log di modifiche amministrative
            const response = await fetch('/modules/task_manager/ajax/get_console_logs.php?only_changes=true&limit=50');
            
            if (!response.ok) {
                console.warn('⚠️ Impossibile caricare log console (server error)');
                return;
            }
            
            const data = await response.json();
            
            if (data.success && data.logs && data.logs.length > 0) {
                const consoleElement = document.getElementById('consoleContent');
                if (consoleElement) {
                    // Pulisci console corrente
                    consoleElement.innerHTML = '';
                    
                    // Aggiungi log precedenti (solo modifiche)
                    data.logs.forEach(log => {
                        this.addLogToConsole(log.message, log.type, log.created_at, false);
                    });
                    
                    console.log(`✅ Caricati ${data.logs.length} log di modifiche amministrative`);
                }
            } else {
                console.log('📝 Nessun log precedente trovato');
            }
        } catch (error) {
            console.warn('⚠️ Errore caricamento log precedenti:', error.message);
            // Non bloccare l'inizializzazione per errori di log
        }
    }
    
    // SOLO PER MODIFICHE AMMINISTRATIVE - Non accessi o navigazione
    logToConsole(message, type = 'info') {
        // Filtra messaggi non rilevanti
        if (!this.shouldLogMessage(message, type)) {
            return;
        }
        
        // Aggiungi alla console UI
        this.addLogToConsole(message, type, null, true);
        
        // Salva nel database (async, non bloccare l'UI)
        this.saveLogToDatabase(message, type);
        
        // Log anche nella console del browser per debug
        const browserConsole = type === 'error' ? console.error : console.log;
        if (typeof browserConsole === 'function') {
            browserConsole(`[TaskManager] ${message}`);
        }
    }
    
    // Determina se il messaggio deve essere loggato (SOLO modifiche amministrative)
    shouldLogMessage(message, type) {
        // Sempre logga errori e warning
        if (type === 'error' || type === 'warning') {
            return true;
        }
        
        // Logga solo successi di modifiche task
        if (type === 'success') {
            const successPatterns = [
                /✅ Task.*successo/,           // Task creato/modificato
                /✅ Status aggiornato/,        // Status cambiato
                /🎉 Task completato/,          // Task completato
                /✅ Task eliminato/,           // Task eliminato
                /✅ Categoria/,                // Categoria gestita
                /🚀 Sistema.*inizializzato/   // Inizializzazione sistema
            ];
            
            return successPatterns.some(pattern => pattern.test(message));
        }
        
        // Info solo per modifiche specifiche
        if (type === 'info') {
            const infoPatterns = [
                /📝 Modifica task:/,           // Modifica task
                /📝 Creazione task:/,          // Creazione task
                /🗑️ Eliminazione.*task/,      // Eliminazione task
                /👥 Responsabili.*aggiornati/, // Cambio responsabili
                /⚡ Priorità.*cambiata/,       // Cambio priorità
                /📅 Deadline.*cambiata/,       // Cambio deadline
                /⏰ Tempo.*aggiunto/,          // Aggiunta tempo
                /🔄 Status.*cambiato/,         // Cambio status (per drag&drop)
                /💾 Salvataggio task/,         // Salvataggio
                /📂 Categoria.*(creata|eliminata|modificata)/ // Gestione categorie
            ];
            
            return infoPatterns.some(pattern => pattern.test(message));
        }
        
        // Non loggare tutto il resto (accessi, navigazione, aperture modal, ecc.)
        return false;
    }
    
    addLogToConsole(message, type = 'info', timestamp = null, isNew = true) {
        const consoleElement = document.getElementById('consoleContent');
        if (!consoleElement) return;
        
        const logTime = timestamp ? new Date(timestamp) : new Date();
        const timeString = logTime.toLocaleTimeString('it-IT');
        const dateString = logTime.toLocaleDateString('it-IT');
        
        const logElement = document.createElement('div');
        logElement.className = `console-log ${type}`;
        
        // Aggiungi data se è un log di un giorno diverso
        const lastLog = consoleElement.lastElementChild;
        const showDate = !lastLog || 
            lastLog.dataset.date !== dateString ||
            isNew;
        
        logElement.dataset.date = dateString;
        
        logElement.innerHTML = `
            ${showDate && !isNew ? `<div class="console-date">${dateString}</div>` : ''}
            <span class="console-time">${timeString}</span>
            <span class="console-message">${message}</span>
            ${isNew ? '<span class="console-new">●</span>' : ''}
        `;
        
        if (isNew) {
            consoleElement.appendChild(logElement);
            
            // Auto-scroll to bottom per log nuovi
            consoleElement.scrollTop = consoleElement.scrollHeight;
            
            // Rimuovi indicatore "nuovo" dopo 3 secondi
            setTimeout(() => {
                const newIndicator = logElement.querySelector('.console-new');
                if (newIndicator) {
                    newIndicator.remove();
                }
            }, 3000);
        } else {
            // Log precedenti: aggiungi all'inizio
            if (consoleElement.firstChild) {
                consoleElement.insertBefore(logElement, consoleElement.firstChild);
            } else {
                consoleElement.appendChild(logElement);
            }
        }
        
        // Mantieni solo gli ultimi 100 log per performance
        const logs = consoleElement.querySelectorAll('.console-log');
        if (logs.length > 100) {
            logs[0].remove();
        }
    }
    
    async saveLogToDatabase(message, type) {
        try {
            const formData = new FormData();
            formData.append('message', message);
            formData.append('type', type);
            formData.append('user_id', window.taskManagerData.userId);
            formData.append('user_name', window.taskManagerData.userName);
            formData.append('csrf_token', this.getCSRFToken());
            
            // Non aspettare la risposta e non bloccare l'UI in caso di errore
            fetch('/modules/task_manager/ajax/save_console_log.php', {
                method: 'POST',
                body: formData
            }).then(response => {
                // Gestione silenziosa degli errori di logging
                if (!response.ok) {
                    console.debug('⚠️ Log non salvato nel database (normale se tabella non esiste)');
                }
            }).catch(error => {
                console.debug('⚠️ Errore salvataggio log (normale, non blocca il sistema):', error.message);
            });
            
        } catch (error) {
            console.debug('⚠️ Errore preparazione log (normale, non blocca il sistema):', error.message);
        }
    }
    
    showConsole() {
        const consoleElement = document.getElementById('taskConsole');
        const toggleBtn = document.getElementById('consoleToggleBtn');
        
        if (consoleElement) {
            consoleElement.classList.add('show');
        }
        if (toggleBtn) {
            toggleBtn.style.display = 'none';
        }
    }
    
    hideConsole() {
        const consoleElement = document.getElementById('taskConsole');
        const toggleBtn = document.getElementById('consoleToggleBtn');
        
        if (consoleElement) {
            consoleElement.classList.remove('show');
        }
        if (toggleBtn) {
            toggleBtn.style.display = 'block';
        }
    }
    
    toggleConsole() {
        const consoleElement = document.getElementById('taskConsole');
        if (consoleElement && consoleElement.classList.contains('show')) {
            this.hideConsole();
        } else {
            this.showConsole();
        }
    }
    
    // =====================================================
    // POPUP ANTEPRIMA TASK
    // =====================================================
    
    openTaskPreviewModal(taskId) {
        console.log(`👁️ Apertura anteprima task ID: ${taskId}`);
        
        const task = this.tasks.find(t => parseInt(t.id) === parseInt(taskId));
        if (!task) {
            console.error(`❌ Task ${taskId} non trovato`);
            
            if (window.toastManager) {
                window.toastManager.error(`Task ${taskId} non trovato`, '❌ Errore');
            }
            return;
        }
        
        console.log('✅ Task trovato:', task);
        this.currentPreviewTask = task;
        
        try {
            this.renderTaskPreview(task);
            
            const modal = document.getElementById('taskPreviewModal');
            if (!modal) {
                console.error('❌ Modal preview non trovato');
                return;
            }
            
            modal.classList.add('show');
            document.body.style.overflow = 'hidden';
            
            console.log('✅ Modal anteprima aperto');
            
        } catch (error) {
            console.error('❌ Errore apertura anteprima:', error);
            
            if (window.toastManager) {
                window.toastManager.error(`Errore apertura anteprima: ${error.message}`, '❌ Errore');
            }
        }
    }
    
    renderTaskPreview(task) {
        const content = document.getElementById('taskPreviewContent');
        const priorityColors = { 'P1': '#ef4444', 'P2': '#f59e0b', 'P3': '#22c55e' };
        
        // Ottieni responsabili - FIX: Converti ID in stringhe
        const responsablesIds = task.responsables_ids ? 
            task.responsables_ids.split(',').map(id => String(id).trim()) : 
            [String(task.assigned_to)];
            
        const responsablesHtml = responsablesIds.map(id => {
            const admin = this.admins.find(a => String(a.id) === String(id));
            if (!admin) {
                console.warn(`⚠️ Admin non trovato per ID: ${id}`);
                return '';
            }
            
            return `
                <div class="task-responsable-item">
                    <div class="task-responsable-avatar" style="background: ${this.generateUserColor(admin.id)}">
                        ${admin.first_name.charAt(0)}${admin.last_name.charAt(0)}
                    </div>
                    <span>${admin.first_name} ${admin.last_name}</span>
                </div>
            `;
        }).filter(html => html !== '').join('');
        
        content.innerHTML = `
            <div class="task-preview-header">
                <div class="task-preview-title">${task.title}</div>
                <div class="task-preview-priority" style="background: ${priorityColors[task.priority]}">
                    ${task.priority}
                </div>
            </div>
            
            <div class="task-preview-meta">
                <div class="task-meta-group">
                    <h4>📅 Scadenza</h4>
                    <p>${this.formatDate(task.deadline)} ${this.getDeadlineStatus(task)}</p>
                </div>
                
                <div class="task-meta-group">
                    <h4>🏷️ Categoria</h4>
                    <p>${task.category_icon} ${task.category_name}</p>
                </div>
                
                <div class="task-meta-group">
                    <h4>🏢 Cliente</h4>
                    <p>${task.client_name || 'Nessun cliente'}</p>
                </div>
                
                <div class="task-meta-group">
                    <h4>⏰ Status</h4>
                    <p>${this.getStatusLabel(task.status)}</p>
                </div>
                
                ${task.estimated_hours > 0 ? `
                <div class="task-meta-group">
                    <h4>⌚ Tempo stimato</h4>
                    <p>${task.estimated_hours}</p>
                </div>
                ` : ''}
                
                ${task.actual_hours > 0 ? `
                <div class="task-meta-group">
                    <h4>📊 Tempo effettivo</h4>
                    <p>${task.actual_hours}</p>
                </div>
                ` : ''}
            </div>
            
            ${task.description ? `
            <div class="task-preview-description">
                <h4>📝 Descrizione</h4>
                <p>${task.description}</p>
            </div>
            ` : ''}
            
            <div class="task-preview-responsables">
                <h4>👥 Responsabili (${responsablesIds.length})</h4>
                <div class="task-responsables-list">
                    ${responsablesHtml}
                </div>
            </div>
            
            <div class="task-preview-actions">
                <div class="task-preview-status">
                    ${task.status !== 'completed' ? `
                        <button class="quick-status-btn" onclick="taskManager.quickCompleteTask(${task.id})">
                            ✅ Completa
                        </button>
                    ` : `
                        <button class="quick-status-btn completed" onclick="taskManager.quickReopenTask(${task.id})">
                            🔄 Riapri
                        </button>
                    `}
                    
                    <button class="quick-status-btn" onclick="taskManager.quickChangeStatus(${task.id})">
                        🔄 Cambia Status
                    </button>
                </div>
            </div>
        `;
    }
    
    closeTaskPreviewModal() {
        const modal = document.getElementById('taskPreviewModal');
        if (modal) {
            modal.classList.remove('show');
        }
        document.body.style.overflow = 'auto';
        
        console.log('✅ Modal anteprima chiuso');
        
        // Pulisci il task corrente
        this.currentPreviewTask = null;
    }
    
    editTaskFromPreview() {
        console.log('🔧 editTaskFromPreview chiamato');
        console.log('📋 currentPreviewTask:', this.currentPreviewTask);
        
        // Prova a recuperare il task dalla UI se currentPreviewTask è null
        let taskToEdit = this.currentPreviewTask;
        
        if (!taskToEdit) {
            console.warn('⚠️ currentPreviewTask è null, tentativo recupero da UI...');
            
            // Cerca nel DOM l'anteprima aperta
            const previewModal = document.getElementById('taskPreviewModal');
            if (previewModal && previewModal.classList.contains('show')) {
                // Cerca l'ID nel contenuto dell'anteprima
                const quickBtns = previewModal.querySelectorAll('.quick-status-btn[onclick*="quickCompleteTask"]');
                if (quickBtns.length > 0) {
                    const onclick = quickBtns[0].getAttribute('onclick');
                    const taskIdMatch = onclick.match(/quickCompleteTask\((\d+)\)/);
                    if (taskIdMatch) {
                        const taskId = parseInt(taskIdMatch[1]);
                        taskToEdit = this.tasks.find(t => parseInt(t.id) === taskId);
                        console.log(`✅ Task recuperato da UI: ${taskId}`);
                    }
                }
            }
            
            // Ultimo tentativo: cerca il primo task selezionato
            if (!taskToEdit) {
                const selectedCard = document.querySelector('.task-card.selected');
                if (selectedCard) {
                    const taskId = parseInt(selectedCard.dataset.taskId);
                    taskToEdit = this.tasks.find(t => parseInt(t.id) === taskId);
                    console.log(`✅ Task recuperato da selezione: ${taskId}`);
                }
            }
        }
        
        if (!taskToEdit) {
            console.error('❌ Impossibile trovare il task da modificare');
            
            if (window.toastManager) {
                window.toastManager.error('Impossibile aprire il task per la modifica', '❌ Errore');
            }
            return;
        }
        
        console.log('✅ Task da modificare trovato:', taskToEdit);
        this.logToConsole(`✏️ Modifica task ${taskToEdit.id}: "${taskToEdit.title}"`, 'info');
        
        this.closeTaskPreviewModal();
        this.openTaskModal(taskToEdit.id);
    }
    
    // =====================================================
    // QUICK ACTIONS DA ANTEPRIMA
    // =====================================================
    
    async quickCompleteTask(taskId) {
        this.logToConsole(`🔄 Completamento rapido task ${taskId}`, 'info');
        
        try {
            await this.updateTaskStatus(taskId, 'completed');
            this.closeTaskPreviewModal();
            
            if (window.toastManager) {
                window.toastManager.success('Task completato! 🎉', '✅ Successo');
            }
            
        } catch (error) {
            this.logToConsole(`❌ Errore completamento task: ${error.message}`, 'error');
        }
    }
    
    async quickReopenTask(taskId) {
        this.logToConsole(`🔄 Riapertura rapida task ${taskId}`, 'info');
        
        try {
            await this.updateTaskStatus(taskId, 'todo');
            this.closeTaskPreviewModal();
            
            if (window.toastManager) {
                window.toastManager.success('Task riaperto', '🔄 Task riaperto');
            }
            
        } catch (error) {
            this.logToConsole(`❌ Errore riapertura task: ${error.message}`, 'error');
        }
    }
    
    quickChangeStatus(taskId) {
        // TODO: Implementare modal rapido per cambio status
        this.editTaskFromPreview();
    }
    
    // =====================================================
    // MULTIPLI RESPONSABILI
    // =====================================================
    
    initializeResponsablesSelector() {
        this.selectedResponsables = [];
        this.updateResponsablesUI();
    }
    
    addResponsable(userId, userName) {
        // Converti userId a numero per sicurezza
        const numericUserId = parseInt(userId);
        
        if (isNaN(numericUserId) || numericUserId <= 0) {
            console.error(`❌ ID utente non valido: ${userId}`);
            return;
        }
        
        if (this.selectedResponsables.find(r => parseInt(r.id) === numericUserId)) {
            console.warn(`⚠️ Responsabile ${userName} già aggiunto`);
            return;
        }
        
        this.selectedResponsables.push({ id: numericUserId, name: userName });
        this.updateResponsablesUI();
        this.hideResponsableDropdown();
        
        console.log(`✅ Aggiunto responsabile: ${userName} (ID: ${numericUserId})`);
    }
    
    removeResponsable(userId) {
        const numericUserId = parseInt(userId);
        this.selectedResponsables = this.selectedResponsables.filter(r => parseInt(r.id) !== numericUserId);
        this.updateResponsablesUI();
        
        console.log(`✅ Rimosso responsabile ID: ${numericUserId}`);
    }
    
    updateResponsablesUI() {
        const selector = document.getElementById('responsablesSelector');
        const inputsContainer = document.getElementById('responsablesInputs');
        
        if (!selector || !inputsContainer) return;
        
        // Rimuovi tag esistenti
        selector.querySelectorAll('.responsable-tag').forEach(tag => tag.remove());
        
        // Pulisci input esistenti
        inputsContainer.innerHTML = '';
        
        // Aggiungi tag per ogni responsabile selezionato
        this.selectedResponsables.forEach((resp, index) => {
            // Crea tag visivo
            const tag = document.createElement('div');
            tag.className = 'responsable-tag';
            tag.innerHTML = `
                <div class="user-avatar" style="background: ${this.generateUserColor(resp.id)}">
                    ${this.generateUserInitials(resp.name)}
                </div>
                <span>${resp.name}</span>
                <button type="button" class="remove-tag" onclick="taskManager.removeResponsable(${resp.id})">&times;</button>
            `;
            
            // Inserisci prima del dropdown
            const dropdown = selector.querySelector('.add-responsable-dropdown');
            selector.insertBefore(tag, dropdown);
            
            // Crea input hidden
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = 'responsables[]';
            input.value = resp.id;
            inputsContainer.appendChild(input);
        });
        
        // Se nessun responsabile selezionato, aggiungi utente corrente
        if (this.selectedResponsables.length === 0) {
            const currentUser = this.admins.find(a => a.id === window.taskManagerData.userId);
            if (currentUser) {
                this.addResponsable(currentUser.id, `${currentUser.first_name} ${currentUser.last_name}`);
            }
        }
    }
    
    toggleResponsableDropdown() {
        const dropdown = document.getElementById('responsableDropdown');
        if (!dropdown) return;
        
        const isVisible = dropdown.style.display !== 'none';
        
        if (isVisible) {
            this.hideResponsableDropdown();
        } else {
            this.showResponsableDropdown();
        }
    }
    
    showResponsableDropdown() {
        const dropdown = document.getElementById('responsableDropdown');
        if (!dropdown) return;
        
        dropdown.style.display = 'block';
        
        // Aggiorna opzioni (nascondi già selezionati)
        dropdown.querySelectorAll('.responsable-option').forEach(option => {
            const userId = parseInt(option.dataset.userId);
            const isSelected = this.selectedResponsables.find(r => r.id === userId);
            option.style.display = isSelected ? 'none' : 'flex';
        });
    }
    
    hideResponsableDropdown() {
        const dropdown = document.getElementById('responsableDropdown');
        if (dropdown) {
            dropdown.style.display = 'none';
        }
    }
    
    // =====================================================
    // EVENT LISTENERS
    // =====================================================
    
    attachEventListeners() {
        // Form submission
        const taskForm = document.getElementById('taskForm');
        if (taskForm) {
            taskForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveTask();
            });
            console.log('✅ Task form listener attached');
        } else {
            console.warn('⚠️ Task form non trovato');
        }
        
        // Category form
        const categoryForm = document.getElementById('categoryForm');
        if (categoryForm) {
            categoryForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveCategory();
            });
            console.log('✅ Category form listener attached');
        }
        
        // Filtri status
        const statusFilters = document.querySelectorAll('.status-filter');
        if (statusFilters.length > 0) {
            statusFilters.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    this.setStatusFilter(e.target.dataset.status);
                });
            });
            console.log(`✅ ${statusFilters.length} status filters attached`);
        }
        
        // Checkbox select all
        const selectAll = document.getElementById('selectAll');
        if (selectAll) {
            selectAll.addEventListener('change', (e) => {
                this.selectAllTasks(e.target.checked);
            });
            console.log('✅ Select all listener attached');
        }
        
        // Chiudi modal con ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeTaskModal();
                this.closeTaskPreviewModal();
                this.closeCategoriesModal();
                this.hideResponsableDropdown();
            }
        });
        
        // Click fuori modal e dropdown
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeTaskModal();
                this.closeTaskPreviewModal();
                this.closeCategoriesModal();
            }
            
            // Chiudi dropdown responsabili se click fuori
            if (!e.target.closest('.add-responsable-dropdown')) {
                this.hideResponsableDropdown();
            }
        });
        
        console.log('✅ Event listeners inizializzati');
    }
    
    // =====================================================
    // SWITCHING VISTE
    // =====================================================
    
    switchView(view, savePreference = true) {
        console.log(`🔄 Switching to ${view} view`);
        
        // Aggiorna UI
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[onclick="switchView('${view}')"]`)?.classList.add('active');
        
        // Mostra/nascondi viste
        document.querySelectorAll('.task-view').forEach(viewEl => {
            viewEl.classList.remove('active');
        });
        document.getElementById(`${view}-view`)?.classList.add('active');
        
        this.currentView = view;
        
        // Salva preferenza
        if (savePreference) {
            this.saveUserPreference('preferred_view', view);
        }
        
        // Aggiorna URL
        const url = new URL(window.location);
        url.searchParams.set('view', view);
        window.history.replaceState({}, '', url);
    }
    
    // =====================================================
    // DRAG & DROP KANBAN
    // =====================================================
    
    initializeDragAndDrop() {
        // Rendi task cards draggable
        document.querySelectorAll('.task-card').forEach(card => {
            card.addEventListener('dragstart', (e) => {
                this.draggedTask = {
                    id: card.dataset.taskId,
                    element: card
                };
                card.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
            });
            
            card.addEventListener('dragend', () => {
                card.classList.remove('dragging');
                this.draggedTask = null;
            });
        });
        
        // Setup drop zones
        document.querySelectorAll('.kanban-column').forEach(column => {
            column.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                column.classList.add('drag-over');
            });
            
            column.addEventListener('dragleave', () => {
                column.classList.remove('drag-over');
            });
            
            column.addEventListener('drop', (e) => {
                e.preventDefault();
                column.classList.remove('drag-over');
                
                if (this.draggedTask) {
                    const newStatus = column.dataset.status;
                    const task = this.tasks.find(t => t.id == this.draggedTask.id);
                    const taskTitle = task ? task.title : `ID ${this.draggedTask.id}`;
                    
                    this.logToConsole(`🔄 Status cambiato: "${taskTitle}" → ${newStatus}`, 'info');
                    this.updateTaskStatus(this.draggedTask.id, newStatus);
                }
            });
        });
    }
    
    async updateTaskStatus(taskId, newStatus) {
        const task = this.tasks.find(t => parseInt(t.id) === parseInt(taskId));
        const taskTitle = task ? task.title : `ID ${taskId}`;
        
        try {
            const formData = new FormData();
            formData.append('action', 'update_status');
            formData.append('task_id', taskId);
            formData.append('status', newStatus);
            formData.append('csrf_token', this.getCSRFToken());
            
            const response = await fetch('/modules/task_manager/ajax/update_task.php', {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Aggiorna task locale
                if (task) {
                    const oldStatus = task.status;
                    task.status = newStatus;
                    
                    this.logToConsole(`✅ Status aggiornato: "${taskTitle}" (${oldStatus} → ${newStatus})`, 'success');
                    
                    if (newStatus === 'completed') {
                        this.logToConsole(`🎉 Task completato: "${taskTitle}" - Congratulazioni!`, 'success');
                    }
                    
                    if (oldStatus === 'completed' && newStatus !== 'completed') {
                        this.logToConsole(`🔄 Task riaperto: "${taskTitle}" - Ripreso in lavorazione`, 'info');
                    }
                }
                
                // Refresh kanban
                this.refreshKanbanView();
                
                // Toast success
                if (window.toastManager) {
                    window.toastManager.success(data.message, '📋 Task aggiornato');
                }
                
                // Aggiorna statistiche
                this.updateStats();
                
            } else {
                throw new Error(data.error);
            }
            
        } catch (error) {
            this.logToConsole(`❌ Errore aggiornamento status "${taskTitle}": ${error.message}`, 'error');
            
            if (window.toastManager) {
                window.toastManager.error('Errore aggiornamento task: ' + error.message, '❌ Errore');
            }
        }
    }
    
    // =====================================================
    // MODAL TASK FORM - FIX PER PARAMETRI STRINGA
    // =====================================================
    
    openTaskModal(taskId = null, defaultStatus = null) {
        console.log(`📝 Apertura form task (ID: ${taskId || 'nuovo'})`);
        
        const modal = document.getElementById('taskModal');
        const form = document.getElementById('taskForm');
        const title = document.getElementById('taskModalTitle');
        const deleteBtn = document.getElementById('deleteTaskBtn');
        
        if (!modal || !form || !title || !deleteBtn) {
            console.error('❌ Elementi modal non trovati');
            return;
        }
        
        // Reset form
        form.reset();
        this.initializeResponsablesSelector();
        
        // FIX: Controlla se taskId è un numero valido (task esistente) o una stringa (nuovo task)
        const isNumericTaskId = taskId && !isNaN(parseInt(taskId));
        
        if (isNumericTaskId) {
            // Modalità modifica - Cerca task esistente
            const task = this.tasks.find(t => parseInt(t.id) === parseInt(taskId));
            if (!task) {
                console.error(`❌ Task ${taskId} non trovato per modifica`);
                this.logToConsole(`❌ Task ${taskId} non trovato per modifica`, 'error');
                return;
            }
            
            title.textContent = 'Modifica Task';
            deleteBtn.style.display = 'block';
            
            this.populateTaskForm(task);
            
        } else {
            // Modalità creazione - taskId è il defaultStatus o null
            title.textContent = 'Nuovo Task';
            deleteBtn.style.display = 'none';
            
            // Se taskId è una stringa, usala come defaultStatus
            const statusToSet = taskId || defaultStatus;
            if (statusToSet && ['todo', 'in_progress', 'pending', 'completed'].includes(statusToSet)) {
                document.getElementById('taskStatus').value = statusToSet;
            }
            
            // Imposta data deadline di default (OGGI)
            document.getElementById('taskDeadline').value = new Date().toISOString().split('T')[0];
        }
        
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
        
        // Focus primo campo
        setTimeout(() => {
            const titleInput = document.getElementById('taskTitle');
            if (titleInput) {
                titleInput.focus();
            }
        }, 100);
        
        console.log('✅ Modal task aperto');
    }
    
    // Nel file task_manager.js, sostituisci la funzione populateTaskForm con questa versione corretta:

populateTaskForm(task) {
    console.log('📝 Popolamento form task:', task);
    
    // Campi standard
    document.getElementById('taskId').value = task.id;
    document.getElementById('taskTitle').value = task.title;
    document.getElementById('taskDescription').value = task.description || '';
    
    // FIX: Controlla se il campo cliente esiste prima di popolarlo
    const clientField = document.getElementById('taskClient');
    if (clientField) {
        clientField.value = task.client_id || '';
    } else {
        // Se è un selettore di contatti, prova a trovarlo con il nuovo nome
        const contactField = document.querySelector('[name="client_id"]');
        if (contactField) {
            contactField.value = task.client_id || '';
        } else {
            console.warn('⚠️ Campo cliente/contatto non trovato nel form');
        }
    }
    
    // Altri campi
    const categoryField = document.getElementById('taskCategory');
    if (categoryField) {
        categoryField.value = task.category_id;
    }
    
    const priorityField = document.getElementById('taskPriority');
    if (priorityField) {
        priorityField.value = task.priority;
    }
    
    const deadlineField = document.getElementById('taskDeadline');
    if (deadlineField) {
        deadlineField.value = task.deadline;
    }
    
    const statusField = document.getElementById('taskStatus');
    if (statusField) {
        statusField.value = task.status;
    }
    
    const estimatedField = document.getElementById('taskEstimated');
    if (estimatedField) {
        estimatedField.value = task.estimated_hours || '';
    }
    
    // Carica responsabili esistenti - FIX: Controllo più robusto
    if (task.responsables_ids && task.responsables_ids.trim() !== '') {
        try {
            const responsablesIds = task.responsables_ids.split(',')
                .map(id => parseInt(String(id).trim()))
                .filter(id => !isNaN(id) && id > 0);
                
            console.log('📋 Responsabili IDs trovati:', responsablesIds);
            
            responsablesIds.forEach(id => {
                const admin = this.admins.find(a => parseInt(a.id) === id);
                if (admin) {
                    this.addResponsable(admin.id, `${admin.first_name} ${admin.last_name}`);
                    console.log(`✅ Aggiunto responsabile: ${admin.first_name} ${admin.last_name}`);
                } else {
                    console.warn(`⚠️ Admin non trovato per ID: ${id}`);
                }
            });
        } catch (error) {
            console.error('❌ Errore parsing responsabili:', error);
        }
    } else if (task.assigned_to) {
        // Fallback al responsabile principale
        const admin = this.admins.find(a => parseInt(a.id) === parseInt(task.assigned_to));
        if (admin) {
            this.addResponsable(admin.id, `${admin.first_name} ${admin.last_name}`);
            console.log(`✅ Aggiunto responsabile principale: ${admin.first_name} ${admin.last_name}`);
        }
    }
    
    // Assicurati che ci sia almeno un responsabile
    if (this.selectedResponsables.length === 0) {
        const currentUser = this.admins.find(a => a.id === window.taskManagerData.userId);
        if (currentUser) {
            this.addResponsable(currentUser.id, `${currentUser.first_name} ${currentUser.last_name}`);
            console.log('✅ Aggiunto utente corrente come responsabile di default');
        }
    }

    // 🎯 FIX PRINCIPALE: Preseleziona il cliente nel ContactSelector
    if (task.client_id && typeof ContactSelector !== 'undefined') {
        console.log(`👤 Preselezionando cliente ID: ${task.client_id} per task`);
        
        // Aspetta un attimo per essere sicuri che ContactSelector sia pronto
        setTimeout(() => {
            // Il TaskManager usa 'taskClient' come fieldId per il selettore contatti
            ContactSelector.preselectContact('taskClient', task.client_id);
        }, 100);
    } else if (task.client_id) {
        console.warn('⚠️ ContactSelector non disponibile per task, cliente non preselezionato');
    } else {
        console.log('ℹ️ Nessun cliente associato a questo task');
    }
}
    
    async deleteTask(taskId = null) {
        if (!taskId) {
            taskId = document.getElementById('taskId').value;
        }
        
        if (!taskId) return;
        
        const task = this.tasks.find(t => parseInt(t.id) === parseInt(taskId));
        const taskTitle = task ? task.title : `ID ${taskId}`;
        
        if (!confirm(`Sei sicuro di voler eliminare il task "${taskTitle}"?`)) {
            return;
        }
        
        this.logToConsole(`🗑️ Eliminazione in corso: "${taskTitle}"`, 'info');
        
        try {
            const formData = new FormData();
            formData.append('action', 'delete');
            formData.append('task_id', taskId);
            formData.append('csrf_token', this.getCSRFToken());
            
            const response = await fetch('/modules/task_manager/ajax/delete_task.php', {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.closeTaskModal();
                
                // Toast success
                if (window.toastManager) {
                    window.toastManager.success(data.message, '🗑️ Task eliminato');
                }
                
                // Log dettagliato dell'eliminazione
                this.logToConsole(`✅ Task eliminato definitivamente: "${taskTitle}" (ID: ${taskId})`, 'success');
                
                // Ricarica task
                await this.loadTasks();
                
            } else {
                throw new Error(data.error);
            }
            
        } catch (error) {
            this.logToConsole(`❌ Errore eliminazione "${taskTitle}": ${error.message}`, 'error');
            
            if (window.toastManager) {
                window.toastManager.error('Errore: ' + error.message, '❌ Errore');
            }
        }
    }
    
    // Aggiungi questa funzione nella classe TaskManager, dopo le altre funzioni come deleteTask()

async saveTask() {
    console.log('💾 Salvataggio task in corso...');
    
    try {
        const form = document.getElementById('taskForm');
        const formData = new FormData(form);
        
        // Ottieni dati del task
        const taskId = document.getElementById('taskId').value;
        const taskTitle = document.getElementById('taskTitle').value.trim();
        
        if (!taskTitle) {
            throw new Error('Il titolo del task è obbligatorio');
        }
        
        // Aggiungi azione
        formData.append('action', taskId ? 'update' : 'create');
        formData.append('csrf_token', this.getCSRFToken());
        
        // Log dettagli operazione
        if (taskId) {
            this.logToConsole(`📝 Modifica task: "${taskTitle}" (ID: ${taskId})`, 'info');
        } else {
            this.logToConsole(`📝 Creazione task: "${taskTitle}"`, 'info');
        }
        
        // Invio richiesta
        const response = await fetch('/modules/task_manager/ajax/save_task.php', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error(`Errore server: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            // Chiudi modal
            this.closeTaskModal();
            
            // Toast success
            if (window.toastManager) {
                const message = taskId ? 'Task aggiornato con successo!' : 'Task creato con successo!';
                window.toastManager.success(message, '✅ Successo');
            }
            
            // Log successo
            if (taskId) {
                this.logToConsole(`✅ Task modificato con successo: "${taskTitle}" (ID: ${taskId})`, 'success');
            } else {
                this.logToConsole(`✅ Task creato con successo: "${taskTitle}" (ID: ${data.task_id || 'nuovo'})`, 'success');
            }
            
            // Ricarica task
            await this.loadTasks();
            
            // Aggiorna statistiche
            this.updateStats();
            
        } else {
            throw new Error(data.error || 'Errore sconosciuto durante il salvataggio');
        }
        
    } catch (error) {
        console.error('❌ Errore salvataggio task:', error);
        
        this.logToConsole(`❌ Errore salvataggio task: ${error.message}`, 'error');
        
        if (window.toastManager) {
            window.toastManager.error('Errore salvataggio task: ' + error.message, '❌ Errore');
        }
    }
}

// Assicurati anche che closeTaskModal() sia definita
closeTaskModal() {
    const modal = document.getElementById('taskModal');
    if (modal) {
        modal.classList.remove('show');
    }
    document.body.style.overflow = 'auto';
    
    // Reset form
    const form = document.getElementById('taskForm');
    if (form) {
        form.reset();
    }
    
    // Reset responsabili
    this.selectedResponsables = [];
    this.updateResponsablesUI();
    
    console.log('✅ Modal task chiuso');
}
    
    // =====================================================
    // GESTIONE CATEGORIE
    // =====================================================
    
    openTaskSettings() {
        this.openCategoriesModal();
    }
    
    openCategoriesModal() {
        const modal = document.getElementById('categoriesModal');
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
        
        this.loadCategories();
    }
    
    closeCategoriesModal() {
        const modal = document.getElementById('categoriesModal');
        modal.classList.remove('show');
        document.body.style.overflow = 'auto';
    }
    
    async loadCategories() {
        try {
            const response = await fetch('/modules/task_manager/ajax/get_categories.php');
            const data = await response.json();
            
            if (data.success) {
                this.renderCategoriesList(data.categories);
            } else {
                throw new Error(data.error);
            }
            
        } catch (error) {
            document.getElementById('categoriesList').innerHTML = `
                <div class="error-state">
                    <p>Errore caricamento categorie: ${error.message}</p>
                    <button onclick="taskManager.loadCategories()">🔄 Riprova</button>
                </div>
            `;
        }
    }
    
    renderCategoriesList(categories) {
        const container = document.getElementById('categoriesList');
        
        if (categories.length === 0) {
            container.innerHTML = `
                <div class="no-categories">
                    <p>Nessuna tipologia presente</p>
                </div>
            `;
            return;
        }
        
        let html = '<div class="categories-list">';
        
        categories.forEach(category => {
            html += `
                <div class="category-item" data-category-id="${category.id}">
                    <div class="category-info">
                        <div class="category-color" style="background: ${category.color}"></div>
                        <span class="category-icon">${category.icon}</span>
                        <span class="category-name">${category.name}</span>
                    </div>
                    <div class="category-actions">
                        <button class="action-btn edit-btn" onclick="taskManager.editCategory(${category.id})" title="Modifica">
                            ✏️
                        </button>
                        <button class="action-btn delete-btn" onclick="taskManager.deleteCategory(${category.id})" title="Elimina">
                            🗑️
                        </button>
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        container.innerHTML = html;
    }
    
    async saveCategory() {
        this.logToConsole('📂 Creazione nuova categoria in corso...', 'info');
        
        try {
            const form = document.getElementById('categoryForm');
            const formData = new FormData(form);
            formData.append('action', 'save');
            
            const categoryName = formData.get('name').trim();
            const categoryIcon = formData.get('icon').trim();
            const categoryColor = formData.get('color');
            
            const response = await fetch('/modules/task_manager/ajax/save_category.php', {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Reset form
                form.reset();
                
                // Toast success
                if (window.toastManager) {
                    window.toastManager.success(data.message, '✅ Categoria creata');
                }
                
                this.logToConsole(`✅ Categoria creata con successo: "${categoryName}" ${categoryIcon}`, 'success');
                
                // Ricarica categorie
                this.loadCategories();
                
                // Aggiorna select nel form task
                this.updateCategorySelect();
                
            } else {
                throw new Error(data.error);
            }
            
        } catch (error) {
            this.logToConsole(`❌ Errore creazione categoria: ${error.message}`, 'error');
            
            if (window.toastManager) {
                window.toastManager.error('Errore: ' + error.message, '❌ Errore');
            }
        }
    }
    
    async deleteCategory(categoryId) {
        // Trova la categoria per il nome
        const category = this.categories.find(c => c.id == categoryId);
        const categoryName = category ? category.name : `ID ${categoryId}`;
        
        if (!confirm(`Sei sicuro di voler eliminare la categoria "${categoryName}"?`)) {
            return;
        }
        
        this.logToConsole(`🗑️ Eliminazione categoria in corso: "${categoryName}"`, 'info');
        
        try {
            const formData = new FormData();
            formData.append('action', 'delete');
            formData.append('category_id', categoryId);
            formData.append('csrf_token', this.getCSRFToken());
            
            const response = await fetch('/modules/task_manager/ajax/delete_category.php', {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Toast success
                if (window.toastManager) {
                    window.toastManager.success(data.message, '🗑️ Categoria eliminata');
                }
                
                this.logToConsole(`✅ Categoria eliminata: "${categoryName}" (ID: ${categoryId})`, 'success');
                
                // Ricarica categorie
                this.loadCategories();
                
                // Aggiorna select nel form task
                this.updateCategorySelect();
                
            } else {
                throw new Error(data.error);
            }
            
        } catch (error) {
            this.logToConsole(`❌ Errore eliminazione categoria "${categoryName}": ${error.message}`, 'error');
            
            if (window.toastManager) {
                window.toastManager.error('Errore: ' + error.message, '❌ Errore');
            }
        }
    }
    
    async updateCategorySelect() {
        try {
            const response = await fetch('/modules/task_manager/ajax/get_categories.php');
            const data = await response.json();
            
            if (data.success) {
                const select = document.getElementById('taskCategory');
                const currentValue = select.value;
                
                // Ricostruisci opzioni
                select.innerHTML = '<option value="">Seleziona tipologia...</option>';
                
                data.categories.forEach(category => {
                    const option = document.createElement('option');
                    option.value = category.id;
                    option.textContent = `${category.icon} ${category.name}`;
                    option.dataset.color = category.color;
                    option.dataset.icon = category.icon;
                    select.appendChild(option);
                });
                
                // Ripristina selezione se possibile
                if (currentValue) {
                    select.value = currentValue;
                }
                
                // Aggiorna array locale
                this.categories = data.categories;
            }
            
        } catch (error) {
            console.error('❌ Errore aggiornamento select categorie:', error);
        }
    }
    
    // =====================================================
    // FILTRI E ORDINAMENTO
    // =====================================================
    
    setStatusFilter(status) {
        const oldFilter = this.currentFilter;
        this.currentFilter = status;
        
        // Aggiorna UI filtri
        document.querySelectorAll('.status-filter').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-status="${status}"]`).classList.add('active');
        
        // Applica filtro
        this.applyFilters();
        
        // Conta task visibili dopo il filtro
        const visibleTasks = this.tasks.filter(t => status === 'all' || t.status === status);
        console.log(`📊 Task visibili con filtro "${status}": ${visibleTasks.length}/${this.tasks.length}`);
    }
    
    applyFilters() {
        if (this.currentView === 'kanban') {
            this.filterKanbanTasks();
        } else {
            this.filterTableTasks();
        }
    }
    
    filterKanbanTasks() {
        document.querySelectorAll('.task-card').forEach(card => {
            const taskId = card.dataset.taskId;
            const task = this.tasks.find(t => t.id == taskId);
            
            if (!task) return;
            
            const shouldShow = this.currentFilter === 'all' || task.status === this.currentFilter;
            card.style.display = shouldShow ? 'block' : 'none';
        });
    }
    
    filterTableTasks() {
        document.querySelectorAll('.task-row').forEach(row => {
            const taskId = row.dataset.taskId;
            const task = this.tasks.find(t => t.id == taskId);
            
            if (!task) return;
            
            const shouldShow = this.currentFilter === 'all' || task.status === this.currentFilter;
            row.style.display = shouldShow ? 'table-row' : 'none';
        });
    }
    
    sortTable(column) {
        const oldColumn = this.sortColumn;
        const oldDirection = this.sortDirection;
        
        if (this.sortColumn === column) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortColumn = column;
            this.sortDirection = 'asc';
        }
        
        // Aggiorna UI header
        document.querySelectorAll('.tasks-table th').forEach(th => {
            th.classList.remove('sorted-asc', 'sorted-desc');
        });
        
        const header = document.querySelector(`[onclick="sortTable('${column}')"]`);
        if (header) {
            header.classList.add(`sorted-${this.sortDirection}`);
        }
        
        // Ordina e renderizza
        this.sortAndRenderTable();
    }
    
    sortAndRenderTable() {
        const sortedTasks = [...this.tasks].sort((a, b) => {
            let aVal = a[this.sortColumn];
            let bVal = b[this.sortColumn];
            
            // Handle null values
            if (aVal === null || aVal === undefined) aVal = '';
            if (bVal === null || bVal === undefined) bVal = '';
            
            // Convert to string for comparison
            aVal = String(aVal).toLowerCase();
            bVal = String(bVal).toLowerCase();
            
            const comparison = aVal.localeCompare(bVal);
            return this.sortDirection === 'asc' ? comparison : -comparison;
        });
        
        // Re-render table body
        this.renderTableRows(sortedTasks);
    }
    
    renderTableRows(tasks) {
        const tbody = document.getElementById('tasks-table-body');
        tbody.innerHTML = '';
        
        tasks.forEach(task => {
            tbody.innerHTML += this.renderTaskRow(task);
        });
    }
    
    // =====================================================
    // SELEZIONE MULTIPLA
    // =====================================================
    
    selectAllTasks(checked) {
        document.querySelectorAll('.task-checkbox').forEach(checkbox => {
            checkbox.checked = checked;
        });
    }
    
    getSelectedTasks() {
        return Array.from(document.querySelectorAll('.task-checkbox:checked'))
                   .map(cb => cb.value);
    }
    
    // =====================================================
    // CARICAMENTO DATI
    // =====================================================
    
    async loadTasks() {
        try {
            const response = await fetch('/modules/task_manager/ajax/get_tasks.php');
            
            if (!response.ok) {
                console.warn('⚠️ Errore caricamento task (server error)');
                // Non ricaricare la pagina se c'è un errore server
                if (window.toastManager) {
                    window.toastManager.warning('Errore ricaricamento task. La modifica è stata salvata.', '⚠️ Attenzione');
                }
                return;
            }
            
            const data = await response.json();
            
            if (data.success) {
                this.tasks = data.tasks;
                
                // Refresh vista corrente senza ricaricare pagina
                if (this.currentView === 'kanban') {
                    this.refreshKanbanView();
                } else {
                    this.refreshTableView();
                }
                
                console.log(`✅ Ricaricati ${data.tasks.length} task`);
                
            } else {
                throw new Error(data.error || 'Errore sconosciuto');
            }
            
        } catch (error) {
            console.warn('⚠️ Errore caricamento task:', error.message);
            
            // Non mostrare errore all'utente se la pagina funziona comunque
            if (window.toastManager) {
                window.toastManager.info('Task aggiornato. Ricarica la pagina per vedere i cambiamenti.', '📋 Task Manager');
            }
        }
    }
    
    refreshKanbanView() {
        // Implementa refresh kanban
        window.location.reload(); // Temporary solution
    }
    
    refreshTableView() {
        // Implementa refresh tabella
        this.renderTableRows(this.tasks);
    }
    
    updateStats() {
        // Ricalcola e aggiorna statistiche
        const stats = {
            total: this.tasks.length,
            todo: this.tasks.filter(t => t.status === 'todo').length,
            in_progress: this.tasks.filter(t => t.status === 'in_progress').length,
            pending: this.tasks.filter(t => t.status === 'pending').length,
            completed: this.tasks.filter(t => t.status === 'completed').length,
            overdue: this.tasks.filter(t => new Date(t.deadline) < new Date() && t.status !== 'completed').length
        };
        
        // Aggiorna UI stats
        this.updateStatsUI(stats);
    }
    
    updateStatsUI(stats) {
        // Aggiorna badges nei filtri
        document.querySelector('[data-status="all"] .badge').textContent = stats.todo;
        document.querySelector('[data-status="in_progress"] .badge').textContent = stats.in_progress;
        document.querySelector('[data-status="pending"] .badge').textContent = stats.pending;
        document.querySelector('[data-status="completed"] .badge').textContent = stats.completed;
        
        // Aggiorna column counts nel kanban
        document.querySelector('.todo-column .column-count').textContent = stats.todo;
        document.querySelector('.progress-column .column-count').textContent = stats.in_progress;
        document.querySelector('.pending-column .column-count').textContent = stats.pending;
        document.querySelector('.completed-column .column-count').textContent = stats.completed;
        
        // Aggiorna stats quick
        document.querySelector('.stat-quick.overdue .stat-value').textContent = stats.overdue;
        document.querySelector('.stat-quick.total .stat-value').textContent = stats.total;
    }
    
    // =====================================================
    // UTILITY FUNCTIONS
    // =====================================================
    
    getCSRFToken() {
        const tokenInput = document.querySelector('input[name="csrf_token"]');
        if (tokenInput) {
            return tokenInput.value;
        }
        
        // Fallback: prova a generare un token temporaneo
        console.warn('⚠️ CSRF token non trovato, usando fallback');
        return 'temp_token_' + Date.now();
    }
    
    async saveUserPreference(key, value) {
        try {
            const formData = new FormData();
            formData.append('action', 'save_preference');
            formData.append('key', key);
            formData.append('value', value);
            formData.append('csrf_token', this.getCSRFToken());
            
            await fetch('/modules/task_manager/ajax/user_preferences.php', {
                method: 'POST',
                body: formData
            });
            
        } catch (error) {
            console.error('❌ Errore salvataggio preferenza:', error);
        }
    }
    
    async loadUserPreferences() {
        try {
            const response = await fetch('/modules/task_manager/ajax/user_preferences.php?action=get');
            const data = await response.json();
            
            if (data.success && data.preferences) {
                // Applica preferenze
                if (data.preferences.preferred_view) {
                    this.switchView(data.preferences.preferred_view, false);
                }
            }
            
        } catch (error) {
            console.error('❌ Errore caricamento preferenze:', error);
        }
    }
    
    // Helper functions per UI
    generateUserColor(userId) {
        const colors = [
            '#3b82f6', '#22c55e', '#ef4444', '#f59e0b', '#8b5cf6', '#06b6d4', 
            '#84cc16', '#f97316', '#ec4899', '#14b8a6', '#6366f1', '#a855f7'
        ];
        return colors[userId % colors.length];
    }
    
    generateUserInitials(name) {
        return name.split(' ').map(n => n.charAt(0)).join('').toUpperCase().substring(0, 2);
    }
    
    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('it-IT');
    }
    
    getDeadlineStatus(task) {
        if (task.deadline_status === -1) return '🚨 Scaduto';
        if (task.days_until_deadline === 0) return '📅 Oggi';
        if (task.days_until_deadline === 1) return '⏰ Domani';
        return '';
    }
    
    getStatusLabel(status) {
        const labels = {
            'todo': '⚠️ Da fare',
            'in_progress': '⏳ In corso',
            'pending': '😐 In attesa',
            'completed': '✅ Concluso'
        };
        return labels[status] || status;
    }
    
    renderTaskRow(task) {
        // Questa funzione dovrebbe essere implementata come nel PHP
        // Per ora usiamo un placeholder
        return `<tr class="task-row" data-task-id="${task.id}">
            <td colspan="9">Task: ${task.title}</td>
        </tr>`;
    }
}

// =====================================================
// FUNZIONI GLOBALI
// =====================================================

function switchView(view) {
    if (window.taskManager) {
        window.taskManager.switchView(view);
    }
}

function openTaskModal(taskId = null, defaultStatus = null) {
    if (window.taskManager) {
        window.taskManager.openTaskModal(taskId, defaultStatus);
    }
}

function openTaskPreviewModal(taskId) {
    if (window.taskManager) {
        window.taskManager.openTaskPreviewModal(taskId);
    }
}

function closeTaskModal() {
    if (window.taskManager) {
        window.taskManager.closeTaskModal();
    }
}

function closeTaskPreviewModal() {
    if (window.taskManager) {
        window.taskManager.closeTaskPreviewModal();
    }
}

function editTaskFromPreview() {
    if (window.taskManager) {
        window.taskManager.editTaskFromPreview();
    }
}

function openTaskSettings() {
    if (window.taskManager) {
        window.taskManager.openTaskSettings();
    }
}

function closeCategoriesModal() {
    if (window.taskManager) {
        window.taskManager.closeCategoriesModal();
    }
}

function deleteTask(taskId = null) {
    if (window.taskManager) {
        window.taskManager.deleteTask(taskId);
    }
}

function sortTable(column) {
    if (window.taskManager) {
        window.taskManager.sortTable(column);
    }
}

function selectAllTasks(checkbox) {
    if (window.taskManager) {
        window.taskManager.selectAllTasks(checkbox.checked);
    }
}

function addResponsable(userId, userName) {
    if (window.taskManager) {
        window.taskManager.addResponsable(userId, userName);
    }
}

function toggleResponsableDropdown() {
    if (window.taskManager) {
        window.taskManager.toggleResponsableDropdown();
    }
}

function toggleConsole() {
    if (window.taskManager) {
        window.taskManager.toggleConsole();
    }
}

function showConsole() {
    if (window.taskManager) {
        window.taskManager.showConsole();
    }
}

function openFiltersModal() {
    console.log('🔍 Apertura filtri avanzati...');
    // TODO: Implementare modal filtri avanzati
}

// =====================================================
// FUNZIONI PER GESTIONE TASK CONCLUSI E FILTRI
// =====================================================

// Aggiungi queste funzioni al file task_manager.js esistente

// =====================================================
// FILTRI TASK CONCLUSI
// =====================================================

function filterCompletedTasks() {
    const clientFilter = document.getElementById('completedClientFilter').value;
    const categoryFilter = document.getElementById('completedCategoryFilter').value;
    const periodFilter = document.getElementById('completedPeriodFilter').value;
    
    const completedCards = document.querySelectorAll('.completed-task-card');
    let visibleCount = 0;
    const totalCount = completedCards.length;
    
    console.log(`🔍 Applicazione filtri - Cliente: ${clientFilter || 'tutti'}, Categoria: ${categoryFilter || 'tutte'}, Periodo: ${periodFilter || 'tutti'}`);
    
    completedCards.forEach(card => {
        let shouldShow = true;
        
        // Filtro cliente
        if (clientFilter && card.dataset.clientId !== clientFilter) {
            shouldShow = false;
        }
        
        // Filtro categoria
        if (categoryFilter && card.dataset.categoryId !== categoryFilter) {
            shouldShow = false;
        }
        
        // Filtro periodo
        if (periodFilter && shouldShow) {
            const completedDate = new Date(card.dataset.completedDate);
            const now = new Date();
            
            switch(periodFilter) {
                case 'today':
                    shouldShow = isSameDay(completedDate, now);
                    break;
                case 'week':
                    shouldShow = isThisWeek(completedDate);
                    break;
                case 'month':
                    shouldShow = isThisMonth(completedDate);
                    break;
                case 'quarter':
                    shouldShow = isThisQuarter(completedDate);
                    break;
                case 'year':
                    shouldShow = isThisYear(completedDate);
                    break;
            }
        }
        
        // Applica visibilità
        if (shouldShow) {
            card.classList.remove('filtered-out');
            visibleCount++;
        } else {
            card.classList.add('filtered-out');
        }
    });
    
    // Aggiorna contatori
    document.getElementById('filteredCompletedCount').textContent = visibleCount;
    document.getElementById('totalCompletedCount').textContent = totalCount;
    document.getElementById('completedCount').textContent = visibleCount;
    
    // Mostra messaggio se nessun risultato
    const noResultsElement = document.getElementById('noFilteredTasks');
    const tasksContainer = document.getElementById('tasks-completed');
    
    if (visibleCount === 0) {
        noResultsElement.style.display = 'block';
        tasksContainer.style.display = 'none';
    } else {
        noResultsElement.style.display = 'none';
        tasksContainer.style.display = '';
    }
    
    console.log(`✅ Filtri applicati: ${visibleCount}/${totalCount} task visibili`);
    
    // Toast feedback
    if (window.toastManager) {
        if (visibleCount === 0) {
            window.toastManager.info('Nessun task trovato con i filtri selezionati', '🔍 Filtri');
        } else {
            window.toastManager.success(`${visibleCount} task trovati`, '✅ Filtri applicati');
        }
    }
}

// Reset filtri
function resetCompletedFilters() {
    document.getElementById('completedClientFilter').value = '';
    document.getElementById('completedCategoryFilter').value = '';
    document.getElementById('completedPeriodFilter').value = '';
    
    // Rimuovi classe filtered-out da tutti i task
    document.querySelectorAll('.completed-task-card').forEach(card => {
        card.classList.remove('filtered-out');
    });
    
    // Aggiorna contatori
    const totalCount = document.querySelectorAll('.completed-task-card').length;
    document.getElementById('filteredCompletedCount').textContent = totalCount;
    document.getElementById('totalCompletedCount').textContent = totalCount;
    document.getElementById('completedCount').textContent = totalCount;
    
    // Nascondi messaggio no risultati
    document.getElementById('noFilteredTasks').style.display = 'none';
    document.getElementById('tasks-completed').style.display = '';
    
    console.log('🔄 Filtri resettati');
    
    if (window.toastManager) {
        window.toastManager.info('Filtri resettati', '🔄 Reset');
    }
}

// =====================================================
// TOGGLE SEZIONE COMPLETATI
// =====================================================

function toggleCompletedSection() {
    const completedColumn = document.querySelector('.completed-column');
    const toggleIcon = document.querySelector('.toggle-icon');
    
    if (completedColumn.classList.contains('completed-collapsed')) {
        // Espandi
        completedColumn.classList.remove('completed-collapsed');
        toggleIcon.textContent = '▼';
        
        // Salva preferenza
        localStorage.setItem('completedSectionCollapsed', 'false');
        
        console.log('📂 Sezione task completati espansa');
    } else {
        // Comprimi
        completedColumn.classList.add('completed-collapsed');
        toggleIcon.textContent = '▶';
        
        // Salva preferenza
        localStorage.setItem('completedSectionCollapsed', 'true');
        
        console.log('📁 Sezione task completati compressa');
    }
}

// Ripristina stato al caricamento
document.addEventListener('DOMContentLoaded', function() {
    const isCollapsed = localStorage.getItem('completedSectionCollapsed') === 'true';
    if (isCollapsed) {
        const completedColumn = document.querySelector('.completed-column');
        const toggleIcon = document.querySelector('.toggle-icon');
        if (completedColumn && toggleIcon) {
            completedColumn.classList.add('completed-collapsed');
            toggleIcon.textContent = '▶';
        }
    }
});

// =====================================================
// CAMBIO MODALITÀ VISTA COMPLETATI
// =====================================================

function setCompletedViewMode(mode) {
    const container = document.getElementById('tasks-completed');
    const gridBtn = document.querySelector('.view-mode-btn.grid-view');
    const listBtn = document.querySelector('.view-mode-btn.list-view');
    
    if (mode === 'grid') {
        container.classList.remove('completed-list');
        container.classList.add('completed-grid');
        gridBtn.classList.add('active');
        listBtn.classList.remove('active');
        
        console.log('📋 Vista griglia attivata per task completati');
    } else {
        container.classList.remove('completed-grid');
        container.classList.add('completed-list');
        listBtn.classList.add('active');
        gridBtn.classList.remove('active');
        
        console.log('📋 Vista lista attivata per task completati');
    }
    
    // Salva preferenza
    localStorage.setItem('completedViewMode', mode);
}

// Ripristina modalità vista al caricamento
document.addEventListener('DOMContentLoaded', function() {
    const savedMode = localStorage.getItem('completedViewMode') || 'grid';
    setCompletedViewMode(savedMode);
});

// =====================================================
// AZIONI RAPIDE SUI TASK COMPLETATI
// =====================================================

async function reopenTask(taskId) {
    event.stopPropagation();
    
    if (!confirm('Vuoi riaprire questo task?')) {
        return;
    }
    
    console.log(`🔄 Riapertura task ${taskId}`);
    
    try {
        const formData = new FormData();
        formData.append('action', 'update_status');
        formData.append('task_id', taskId);
        formData.append('status', 'todo');
        formData.append('csrf_token', getCSRFToken());
        
        const response = await fetch('/modules/task_manager/ajax/update_task.php', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Rimuovi card dalla sezione completati
            const card = document.querySelector(`[data-task-id="${taskId}"]`);
            if (card) {
                card.style.animation = 'fadeOut 0.3s ease';
                setTimeout(() => {
                    card.remove();
                    updateCompletedCount();
                }, 300);
            }
            
            if (window.toastManager) {
                window.toastManager.success('Task riaperto con successo', '🔄 Task riaperto');
            }
            
            // Ricarica la pagina per aggiornare le colonne
            setTimeout(() => {
                window.location.reload();
            }, 1000);
            
        } else {
            throw new Error(data.error || 'Errore sconosciuto');
        }
        
    } catch (error) {
        console.error('❌ Errore riapertura task:', error);
        
        if (window.toastManager) {
            window.toastManager.error('Errore: ' + error.message, '❌ Errore');
        }
    }
}

async function archiveTask(taskId) {
    event.stopPropagation();
    
    if (!confirm('Vuoi archiviare questo task? Sarà nascosto dalla vista principale.')) {
        return;
    }
    
    console.log(`📦 Archiviazione task ${taskId}`);
    
    try {
        const formData = new FormData();
        formData.append('action', 'archive');
        formData.append('task_id', taskId);
        formData.append('csrf_token', getCSRFToken());
        
        const response = await fetch('/modules/task_manager/ajax/archive_task.php', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Rimuovi card con animazione
            const card = document.querySelector(`[data-task-id="${taskId}"]`);
            if (card) {
                card.style.animation = 'slideDown 0.3s ease';
                setTimeout(() => {
                    card.remove();
                    updateCompletedCount();
                }, 300);
            }
            
            if (window.toastManager) {
                window.toastManager.success('Task archiviato', '📦 Archiviato');
            }
            
        } else {
            throw new Error(data.error || 'Errore sconosciuto');
        }
        
    } catch (error) {
        console.error('❌ Errore archiviazione task:', error);
        
        if (window.toastManager) {
            window.toastManager.error('Errore: ' + error.message, '❌ Errore');
        }
    }
}

// =====================================================
// FUNZIONI HELPER PER DATE
// =====================================================

function isSameDay(date1, date2) {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
}

function isThisWeek(date) {
    const now = new Date();
    const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
    const weekEnd = new Date(now.setDate(now.getDate() - now.getDay() + 6));
    return date >= weekStart && date <= weekEnd;
}

function isThisMonth(date) {
    const now = new Date();
    return date.getFullYear() === now.getFullYear() &&
           date.getMonth() === now.getMonth();
}

function isThisQuarter(date) {
    const now = new Date();
    const currentQuarter = Math.floor(now.getMonth() / 3);
    const dateQuarter = Math.floor(date.getMonth() / 3);
    return date.getFullYear() === now.getFullYear() &&
           dateQuarter === currentQuarter;
}

function isThisYear(date) {
    const now = new Date();
    return date.getFullYear() === now.getFullYear();
}

// =====================================================
// AGGIORNA CONTATORI
// =====================================================

function updateCompletedCount() {
    const visibleCards = document.querySelectorAll('.completed-task-card:not(.filtered-out)');
    const totalCards = document.querySelectorAll('.completed-task-card');
    
    document.getElementById('filteredCompletedCount').textContent = visibleCards.length;
    document.getElementById('totalCompletedCount').textContent = totalCards.length;
    document.getElementById('completedCount').textContent = visibleCards.length;
    
    // Aggiorna anche il separatore
    const separatorCount = document.querySelector('.separator-count');
    if (separatorCount) {
        separatorCount.textContent = totalCards.length;
    }
}

// =====================================================
// HELPER PER CSRF TOKEN
// =====================================================

function getCSRFToken() {
    const tokenInput = document.querySelector('input[name="csrf_token"]');
    return tokenInput ? tokenInput.value : 'temp_token_' + Date.now();
}

// =====================================================
// ANIMAZIONI CSS AGGIUNTIVE
// =====================================================

// Aggiungi queste animazioni al CSS
const additionalAnimations = `
@keyframes fadeOut {
    from { opacity: 1; transform: scale(1); }
    to { opacity: 0; transform: scale(0.9); }
}

@keyframes slideDown {
    from { opacity: 1; transform: translateY(0); }
    to { opacity: 0; transform: translateY(20px); }
}
`;

// Inietta animazioni se non esistono
if (!document.querySelector('#taskManagerAnimations')) {
    const style = document.createElement('style');
    style.id = 'taskManagerAnimations';
    style.innerHTML = additionalAnimations;
    document.head.appendChild(style);
}

console.log('✅ Funzioni per task completati e filtri caricate');

// =====================================================
// INIZIALIZZAZIONE
// =====================================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('📋 DOM caricato, inizializzazione Task Manager...');
    
    // Funzione per inizializzare il Task Manager
    function initTaskManager() {
        if (window.taskManagerData) {
            console.log('✅ taskManagerData trovato, inizializzazione...');
            try {
                window.taskManager = new TaskManager();
                console.log('✅ Task Manager inizializzato con successo');
                return true;
            } catch (error) {
                console.error('❌ Errore inizializzazione Task Manager:', error);
                return false;
            }
        } else {
            console.warn('⚠️ taskManagerData non ancora disponibile');
            return false;
        }
    }
    
    // Tenta inizializzazione immediata
    if (!initTaskManager()) {
        console.log('⏳ Tentativo inizializzazione differita...');
        
        // Retry ogni 100ms per max 5 secondi
        let attempts = 0;
        const maxAttempts = 50;
        
        const retryInterval = setInterval(() => {
            attempts++;
            
            if (initTaskManager()) {
                clearInterval(retryInterval);
                console.log(`✅ Task Manager inizializzato al tentativo ${attempts}`);
            } else if (attempts >= maxAttempts) {
                clearInterval(retryInterval);
                console.error('❌ Impossibile inizializzare Task Manager dopo 50 tentativi');
                
                // Mostra errore all'utente
                const errorDiv = document.createElement('div');
                errorDiv.style.cssText = `
                    position: fixed; top: 20px; right: 20px; 
                    background: #fee; border: 1px solid #fcc; 
                    padding: 12px; border-radius: 4px; 
                    color: #c33; font-family: Arial; 
                    max-width: 300px; z-index: 9999;
                `;
                errorDiv.innerHTML = `
                    <strong>⚠️ Errore Task Manager</strong><br>
                    Impossibile inizializzare il sistema. 
                    Ricarica la pagina o contatta l'amministratore.
                `;
                document.body.appendChild(errorDiv);
                
                // Rimuovi dopo 10 secondi
                setTimeout(() => {
                    errorDiv.remove();
                }, 10000);
            }
        }, 100);
    }
});

// ========================================
// FUNZIONE PER VEDERE TASK IN AGENDA
// ========================================

window.viewTaskInAgenda = function(taskId) {
    // Trova il task
    const task = window.taskManagerData?.tasks?.find(t => t.id === taskId);

    if (!task) {
        console.error('Task non trovato:', taskId);
        return;
    }

    // Costruisci l'URL dell'agenda
    let agendaUrl = '/modules/agenda/index.php?view=week';

    // Se il task ha una deadline, usa quella data
    if (task.deadline) {
        const deadlineDate = new Date(task.deadline);
        const year = deadlineDate.getFullYear();
        const month = String(deadlineDate.getMonth() + 1).padStart(2, '0');
        const day = String(deadlineDate.getDate()).padStart(2, '0');
        agendaUrl += `&date=${year}-${month}-${day}`;
    }

    // Salva il task ID in sessionStorage per evidenziarlo
    sessionStorage.setItem('highlightTaskId', taskId);
    sessionStorage.setItem('highlightTaskTitle', task.title);

    // Redirect all'agenda
    window.location.href = agendaUrl;
};

console.log('📋 Task Manager Script caricato con integrazione Agenda');

// =====================================================
// FILTRI TASK ATTIVI
// =====================================================

function filterActiveTasks() {
    const categoryFilter = document.getElementById('activeTasksCategoryFilter')?.value || '';
    const clientFilter = document.getElementById('activeTasksClientFilter')?.value || '';
    const responsableFilter = document.getElementById('activeTasksResponsableFilter')?.value || '';

    // Ottieni tutte le task card attive (non concluse)
    const activeColumns = document.querySelectorAll('.kanban-column[data-status="todo"], .kanban-column[data-status="in_progress"], .kanban-column[data-status="pending"]');

    let visibleCount = 0;

    activeColumns.forEach(column => {
        const taskCards = column.querySelectorAll('.task-card');

        taskCards.forEach(card => {
            const taskId = card.getAttribute('data-task-id');
            const task = window.taskManagerData?.tasks?.find(t => t.id == taskId);

            if (!task) {
                card.style.display = 'none';
                return;
            }

            let shouldShow = true;

            // Filtro categoria
            if (categoryFilter && task.category_id != categoryFilter) {
                shouldShow = false;
            }

            // Filtro cliente
            if (clientFilter && task.client_id != clientFilter) {
                shouldShow = false;
            }

            // Filtro responsabile
            if (responsableFilter) {
                const responsablesIds = task.responsables_ids ? task.responsables_ids.split(',').map(id => id.trim()) : [];
                if (!responsablesIds.includes(responsableFilter) && task.assigned_to != responsableFilter) {
                    shouldShow = false;
                }
            }

            card.style.display = shouldShow ? '' : 'none';
            if (shouldShow) visibleCount++;
        });
    });

    // Aggiorna contatore
    const countElement = document.getElementById('filteredActiveCount');
    if (countElement) {
        countElement.textContent = visibleCount;
    }

    console.log('🔍 Filtri attivi applicati:', { categoryFilter, clientFilter, responsableFilter, visibleCount });
}

function resetActiveTasksFilters() {
    // Reset selects
    document.getElementById('activeTasksCategoryFilter').value = '';
    document.getElementById('activeTasksClientFilter').value = '';
    document.getElementById('activeTasksResponsableFilter').value = '';

    // Mostra tutti i task
    const activeColumns = document.querySelectorAll('.kanban-column[data-status="todo"], .kanban-column[data-status="in_progress"], .kanban-column[data-status="pending"]');

    let totalCount = 0;
    activeColumns.forEach(column => {
        const taskCards = column.querySelectorAll('.task-card');
        taskCards.forEach(card => {
            card.style.display = '';
            totalCount++;
        });
    });

    // Aggiorna contatore
    const countElement = document.getElementById('filteredActiveCount');
    if (countElement) {
        countElement.textContent = totalCount;
    }

    console.log('🔄 Filtri attivi resettati');
}

// Inizializza contatore al caricamento
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        resetActiveTasksFilters();
    }, 500);
});