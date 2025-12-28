// File: /assets/js/agenda-form-handler.js
// VERSIONE COMPATIBILE - Si integra con agenda.js esistente

const AgendaFormEnhancer = {
    debug: true,
    
    log(message, data = null) {
        if (this.debug) {
            console.log(`🗓️ [AgendaEnhancer] ${message}`, data || '');
        }
    },
    
    error(message, data = null) {
        console.error(`❌ [AgendaEnhancer] ${message}`, data || '');
    },
    
    // Migliora il popolamento del form esistente
    enhanceFormPopulation(eventData) {
        this.log('Enhancing form population with:', eventData);
        
        try {
            // 🎯 FIX CLIENT_ID - Usa ContactSelector se disponibile
            if (eventData.client_id && typeof ContactSelector !== 'undefined') {
                this.log('Setting client via ContactSelector:', eventData.client_id);
                
                // Aspetta un momento per assicurarsi che il form sia pronto
                setTimeout(() => {
                    try {
                        ContactSelector.selectContact('eventClient', eventData.client_id);
                        this.log('✅ Client set successfully');
                    } catch (error) {
                        this.error('Error setting client:', error);
                        // Fallback: imposta direttamente
                        this.setClientFallback(eventData.client_id, eventData.client_name);
                    }
                }, 100);
            } else if (eventData.client_id) {
                // Fallback senza ContactSelector
                this.setClientFallback(eventData.client_id, eventData.client_name);
            }
            
            // 🎯 FIX ALL_DAY CHECKBOX
            const allDayCheckbox = document.getElementById('allDayEvent');
            if (allDayCheckbox && eventData.is_all_day !== undefined) {
                const isAllDay = Boolean(eventData.is_all_day);
                allDayCheckbox.checked = isAllDay;
                
                this.log('All day checkbox set to:', isAllDay);
                
                // Trigger change event per eventuali listener
                allDayCheckbox.dispatchEvent(new Event('change', { bubbles: true }));
            }
            
            // 🎯 FIX RESPONSABLES CHECKBOXES
            if (eventData.responsables_ids && Array.isArray(eventData.responsables_ids)) {
                this.log('Setting responsables:', eventData.responsables_ids);
                
                // Deseleziona tutti prima
                const responsableCheckboxes = document.querySelectorAll('input[name="responsables[]"]');
                responsableCheckboxes.forEach(checkbox => {
                    checkbox.checked = false;
                });
                
                // Seleziona quelli specifici
                eventData.responsables_ids.forEach(userId => {
                    const checkbox = document.querySelector(`input[name="responsables[]"][value="${userId}"]`);
                    if (checkbox) {
                        checkbox.checked = true;
                        this.log(`✅ Responsable ${userId} checked`);
                    } else {
                        this.log(`⚠️ Responsable checkbox not found: ${userId}`);
                    }
                });
            }
            
            // 🎯 Altri campi che potrebbero non essere gestiti correttamente
            if (eventData.priority && document.getElementById('eventPriority')) {
                document.getElementById('eventPriority').value = eventData.priority;
            }
            
            if (eventData.reminder_minutes !== undefined && document.getElementById('eventReminder')) {
                document.getElementById('eventReminder').value = eventData.reminder_minutes;
            }
            
        } catch (error) {
            this.error('Error in enhanceFormPopulation:', error);
        }
    },
    
    // Fallback per impostare client senza ContactSelector
    setClientFallback(clientId, clientName) {
        this.log('Setting client via fallback method:', { clientId, clientName });
        
        const clientIdField = document.getElementById('eventClient_id');
        const clientSearchField = document.getElementById('eventClient_search');
        
        if (clientIdField) {
            clientIdField.value = clientId;
        }
        
        if (clientSearchField && clientName) {
            clientSearchField.value = clientName;
        }
        
        // Mostra il campo selected se esiste
        const selectedContainer = document.getElementById('eventClient_selected');
        if (selectedContainer && clientName) {
            selectedContainer.innerHTML = `
                <div class="selected-contact-card">
                    <div class="selected-contact-icon">🏢</div>
                    <div class="selected-contact-info">
                        <div class="selected-contact-name">${clientName}</div>
                    </div>
                </div>
            `;
            selectedContainer.style.display = 'block';
        }
        
        // Mostra bottone clear
        const clearBtn = document.querySelector('[data-field-id="eventClient"] .contact-clear-btn');
        if (clearBtn) {
            clearBtn.style.display = 'block';
        }
    },
    
    // Migliora la gestione del submit form
    enhanceFormSubmit() {
        const form = document.getElementById('eventForm');
        if (!form) return;
        
        // Aggiungi listener per il submit che logga i dati
        form.addEventListener('submit', (event) => {
            this.log('Form submit intercepted for debugging');
            
            const formData = new FormData(form);
            
            this.log('🔍 FORM DATA DEBUG:');
            for (let [key, value] of formData.entries()) {
                this.log(`  - ${key}: "${value}" (type: ${typeof value})`);
            }
            
            // Controlli specifici
            const clientId = formData.get('client_id');
            const allDay = formData.get('all_day');
            
            this.log('🎯 CRITICAL FIELDS:');
            this.log(`  - client_id: "${clientId}" (empty: ${!clientId})`);
            this.log(`  - all_day: "${allDay}" (checked: ${!!allDay})`);
            
            // Verifica checkbox responsables
            const responsables = formData.getAll('responsables[]');
            this.log(`  - responsables: [${responsables.join(', ')}] (count: ${responsables.length})`);
        }, true); // true = capture phase, esegue prima di altri listener
    },
    
    // Hook into existing AgendaManager if available
    hookIntoExistingSystem() {
        if (typeof window.AgendaManager !== 'undefined') {
            const originalLoadEventData = window.AgendaManager.loadEventData;
            
            if (originalLoadEventData) {
                window.AgendaManager.loadEventData = async function(eventId) {
                    AgendaFormEnhancer.log('Hooking into loadEventData for event:', eventId);
                    
                    try {
                        // Chiama il metodo originale
                        const result = await originalLoadEventData.call(this, eventId);
                        
                        // Se ha avuto successo, migliora il popolamento
                        if (result && result.success && result.event) {
                            AgendaFormEnhancer.log('Original loadEventData successful, enhancing...');
                            
                            // Aspetta che il form sia popolato
                            setTimeout(() => {
                                AgendaFormEnhancer.enhanceFormPopulation(result.event);
                            }, 200);
                        }
                        
                        return result;
                    } catch (error) {
                        AgendaFormEnhancer.error('Error in hooked loadEventData:', error);
                        throw error;
                    }
                };
                
                this.log('✅ Successfully hooked into AgendaManager.loadEventData');
            }
        }
        
        // Hook into global functions se esistono
        if (typeof window.populateEventForm === 'function') {
            const originalPopulateEventForm = window.populateEventForm;
            
            window.populateEventForm = function(eventData) {
                AgendaFormEnhancer.log('Hooking into populateEventForm');
                
                // Chiama funzione originale
                const result = originalPopulateEventForm.call(this, eventData);
                
                // Migliora con le nostre correzioni
                setTimeout(() => {
                    AgendaFormEnhancer.enhanceFormPopulation(eventData);
                }, 100);
                
                return result;
            };
            
            this.log('✅ Successfully hooked into populateEventForm');
        }
    },
    
    // Inizializzazione compatibile
    init() {
        this.log('Initializing AgendaFormEnhancer (compatible mode)');
        
        // Aspetta che il DOM sia completamente caricato
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.initAfterDOM();
            });
        } else {
            this.initAfterDOM();
        }
    },
    
    initAfterDOM() {
        this.log('DOM ready, initializing enhancements...');
        
        // Migliora form submit
        this.enhanceFormSubmit();
        
        // Hook into existing system
        setTimeout(() => {
            this.hookIntoExistingSystem();
        }, 500); // Aspetta che gli altri script siano caricati
        
        this.log('✅ AgendaFormEnhancer initialization complete');
    }
};

// Inizializza automaticamente
AgendaFormEnhancer.init();

// Export per uso globale
window.AgendaFormEnhancer = AgendaFormEnhancer;