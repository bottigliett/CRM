// File: /assets/js/agenda-layout-management.js
// JavaScript per gestire il layout side-by-side dell'agenda - STILE NOTION

console.log('🎨 Caricamento Layout Management...');

// ============================================
// GESTIONE SEZIONI MANAGEMENT PANEL
// ============================================

const LayoutManager = {
    openSections: new Set(['categories']), // Sezioni aperte di default
    
    init() {
        console.log('🔧 Inizializzazione Layout Manager...');
        
        this.initializeSectionToggles();
        this.initializeQuickCategoryForm();
        this.initializeMultiSelectDropdown();
        this.loadQuickCategories();
        
        // Carica stato salvato
        this.loadSectionStates();
        
        console.log('✅ Layout Manager inizializzato');
    },
    
    initializeSectionToggles() {
        const toggles = document.querySelectorAll('.section-toggle');
        
        toggles.forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const section = e.target.closest('.management-section');
                if (section) {
                    const sectionType = this.getSectionType(section);
                    this.toggleSection(sectionType);
                }
            });
        });
        
        // Anche click sull'header per aprire/chiudere
        const headers = document.querySelectorAll('.section-header');
        headers.forEach(header => {
            header.addEventListener('click', (e) => {
                if (e.target.closest('.section-toggle')) return; // Skip se è il bottone
                
                const section = e.target.closest('.management-section');
                if (section) {
                    const sectionType = this.getSectionType(section);
                    this.toggleSection(sectionType);
                }
            });
        });
        
        console.log('🔗 Section toggles inizializzati');
    },
    
    getSectionType(sectionElement) {
        if (sectionElement.classList.contains('categories-management')) return 'categories';
        if (sectionElement.classList.contains('log-management')) return 'logs';
        if (sectionElement.classList.contains('stats-management')) return 'stats';
        return 'unknown';
    },
    
    toggleSection(sectionType) {
        const section = document.querySelector(`.${sectionType}-management`);
        if (!section) return;
        
        const content = section.querySelector('.section-content');
        const toggle = section.querySelector('.section-toggle');
        
        if (!content || !toggle) return;
        
        const isOpen = this.openSections.has(sectionType);
        
        if (isOpen) {
            // Chiudi sezione
            this.closeSection(sectionType, content, toggle);
        } else {
            // Apri sezione
            this.openSection(sectionType, content, toggle);
        }
        
        // Salva stato
        this.saveSectionStates();
        
        console.log(`📂 Sezione ${sectionType}: ${isOpen ? 'chiusa' : 'aperta'}`);
    },
    
    openSection(sectionType, content, toggle) {
        this.openSections.add(sectionType);
        
        content.style.maxHeight = content.scrollHeight + 'px';
        content.classList.remove('collapsed');
        content.classList.add('expanding');
        
        toggle.classList.remove('collapsed');
        
        // Carica contenuto se necessario
        if (sectionType === 'categories') {
            this.loadQuickCategories();
        } else if (sectionType === 'logs') {
            if (window.AgendaManager) {
                window.AgendaManager.loadActivityLogs();
            }
        }
        
        setTimeout(() => {
            content.classList.remove('expanding');
            content.style.maxHeight = 'none';
        }, 300);
    },
    
    closeSection(sectionType, content, toggle) {
        this.openSections.delete(sectionType);
        
        content.style.maxHeight = content.scrollHeight + 'px';
        content.classList.add('collapsing');
        
        // Force reflow
        content.offsetHeight;
        
        content.style.maxHeight = '0px';
        content.classList.add('collapsed');
        
        toggle.classList.add('collapsed');
        
        setTimeout(() => {
            content.classList.remove('collapsing');
        }, 300);
    },
    
    saveSectionStates() {
        try {
            const states = Array.from(this.openSections);
            localStorage.setItem('agenda_section_states', JSON.stringify(states));
        } catch (error) {
            console.warn('⚠️ Impossibile salvare stati sezioni:', error);
        }
    },
    
    loadSectionStates() {
        try {
            const saved = localStorage.getItem('agenda_section_states');
            if (saved) {
                const states = JSON.parse(saved);
                this.openSections = new Set(states);
                
                // Applica stati salvati
                ['categories', 'logs', 'stats'].forEach(sectionType => {
                    const section = document.querySelector(`.${sectionType}-management`);
                    if (!section) return;
                    
                    const content = section.querySelector('.section-content');
                    const toggle = section.querySelector('.section-toggle');
                    
                    if (this.openSections.has(sectionType)) {
                        content.classList.remove('collapsed');
                        toggle.classList.remove('collapsed');
                    } else {
                        content.classList.add('collapsed');
                        toggle.classList.add('collapsed');
                    }
                });
            }
        } catch (error) {
            console.warn('⚠️ Impossibile caricare stati sezioni:', error);
        }
    },
    
    // ============================================
    // GESTIONE QUICK CATEGORY FORM
    // ============================================
    
    initializeQuickCategoryForm() {
        const form = document.getElementById('quickCategoryForm');
        if (!form) return;
        
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleQuickCategorySubmit(e);
        });
        
        console.log('📝 Quick category form inizializzato');
    },
    
    async handleQuickCategorySubmit(e) {
        const form = e.target;
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        
        try {
            submitBtn.textContent = '⏳';
            submitBtn.disabled = true;
            
            const formData = new FormData(form);
            
            const response = await fetch('/modules/agenda/ajax/save_category.php', {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.success) {
                if (window.toastManager) {
                    window.toastManager.success('Categoria creata!', '🏷️ Successo');
                }
                
                form.reset();
                await this.loadQuickCategories();
                
                // Ricarica anche la lista principale se esiste
                if (window.AgendaManager && window.AgendaManager.loadCategories) {
                    await window.AgendaManager.loadCategories();
                }
                
                // Ricarica pagina dopo un po' per aggiornare tutto
                setTimeout(() => window.location.reload(), 1500);
                
            } else {
                throw new Error(data.error || 'Errore nel salvataggio');
            }
            
        } catch (error) {
            console.error('❌ Errore quick category:', error);
            
            if (window.toastManager) {
                window.toastManager.error(error.message, '❌ Errore');
            } else {
                alert('Errore: ' + error.message);
            }
        } finally {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    },
    
    // ============================================
    // CARICAMENTO CATEGORIE QUICK
    // ============================================
    
    async loadQuickCategories() {
        const container = document.getElementById('categoriesQuickList');
        if (!container) return;
        
        try {
            container.innerHTML = '<div class="loading-mini">📂 Caricamento...</div>';
            
            const response = await fetch('/modules/agenda/ajax/get_categories.php');
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.success && data.categories) {
                this.renderQuickCategories(data.categories, container);
            } else {
                throw new Error(data.error || 'Errore nel caricamento');
            }
            
        } catch (error) {
            console.error('❌ Errore caricamento quick categories:', error);
            container.innerHTML = `
                <div class="loading-mini" style="color: #ef4444;">
                    ❌ Errore caricamento
                </div>
            `;
        }
    },
    
    renderQuickCategories(categories, container) {
        if (!categories || categories.length === 0) {
            container.innerHTML = `
                <div class="loading-mini" style="color: #9ca3af;">
                    📂 Nessuna categoria
                </div>
            `;
            return;
        }
        
        let html = '';
        
        categories.forEach(category => {
            html += `
                <div class="category-quick-item" data-category-id="${category.id}">
                    <div class="category-quick-preview">
                        <div class="category-color" style="background: ${category.color};"></div>
                        <span class="category-icon">${category.icon}</span>
                        <span class="category-quick-name">${category.name}</span>
                    </div>
                    <div class="category-quick-actions">
                        <button onclick="LayoutManager.editQuickCategory(${category.id})" title="Modifica">✏️</button>
                        <button onclick="LayoutManager.deleteQuickCategory(${category.id})" title="Elimina">🗑️</button>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
        console.log(`📂 ${categories.length} categorie quick caricate`);
    },
    
    editQuickCategory(categoryId) {
        console.log(`✏️ Modifica categoria ${categoryId}`);
        
        if (window.AgendaManager && window.AgendaManager.editCategory) {
            window.AgendaManager.editCategory(categoryId);
            
            // Apri modal gestione categorie
            if (window.AgendaManager.openCategoriesModal) {
                window.AgendaManager.openCategoriesModal();
            }
        }
    },
    
    async deleteQuickCategory(categoryId) {
        const confirmed = confirm('🗑️ Elimina questa categoria?\n\nQuesta azione non può essere annullata.');
        
        if (!confirmed) return;
        
        try {
            const formData = new FormData();
            formData.append('category_id', categoryId);
            formData.append('csrf_token', window.AgendaManager?.csrfToken || '');
            
            const response = await fetch('/modules/agenda/ajax/delete_category.php', {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.success) {
                if (window.toastManager) {
                    window.toastManager.success('Categoria eliminata!', '🗑️ Successo');
                }
                
                await this.loadQuickCategories();
                setTimeout(() => window.location.reload(), 1000);
                
            } else {
                throw new Error(data.error || 'Errore nell\'eliminazione');
            }
            
        } catch (error) {
            console.error('❌ Errore eliminazione categoria:', error);
            
            if (window.toastManager) {
                window.toastManager.error(error.message, '❌ Errore');
            }
        }
    },
    
    // ============================================
    // MULTISELECT DROPDOWN RESPONSABILI
    // ============================================
    
    initializeMultiSelectDropdown() {
        const dropdown = document.getElementById('eventResponsables');
        if (!dropdown) return;
        
        // Migliora l'esperienza utente
        this.enhanceMultiSelect(dropdown);
        
        console.log('📋 Multiselect dropdown inizializzato');
    },
    
    enhanceMultiSelect(dropdown) {
        // Aggiungi helper text dinamico
        const helpText = dropdown.parentNode.querySelector('.form-help');
        
        dropdown.addEventListener('change', () => {
            const selected = Array.from(dropdown.selectedOptions);
            const count = selected.length;
            
            if (helpText) {
                if (count === 0) {
                    helpText.innerHTML = `
                        ⚠️ <strong>Seleziona almeno un responsabile.</strong><br>
                        Tieni premuto Ctrl (o Cmd su Mac) per selezionare più responsabili.
                    `;
                    helpText.style.borderLeft = '3px solid #ef4444';
                } else if (count === 1) {
                    const selectedName = selected[0].textContent.split(' (')[0];
                    helpText.innerHTML = `
                        ✅ <strong>1 responsabile selezionato:</strong> ${selectedName}<br>
                        Tieni premuto Ctrl (o Cmd su Mac) per selezionare altri responsabili.
                    `;
                    helpText.style.borderLeft = '3px solid #22c55e';
                } else {
                    const names = selected.slice(0, 2).map(opt => opt.textContent.split(' (')[0]);
                    const moreText = count > 2 ? ` e altri ${count - 2}` : '';
                    
                    helpText.innerHTML = `
                        ✅ <strong>${count} responsabili selezionati:</strong> ${names.join(', ')}${moreText}<br>
                        Tutti riceveranno le notifiche per questo evento.
                    `;
                    helpText.style.borderLeft = '3px solid #3b82f6';
                }
            }
        });
        
        // Trigger iniziale
        dropdown.dispatchEvent(new Event('change'));
        
        // Highlight opzione current user
        const currentUserOption = dropdown.querySelector('option[data-current="true"]');
        if (currentUserOption && !currentUserOption.selected) {
            currentUserOption.selected = true;
            dropdown.dispatchEvent(new Event('change'));
        }
    }
};

// ============================================
// FUNZIONI GLOBALI PER TEMPLATE
// ============================================

window.toggleManagementSection = (sectionType) => {
    LayoutManager.toggleSection(sectionType);
};

window.LayoutManager = LayoutManager;

// ============================================
// INIZIALIZZAZIONE AUTOMATICA
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    // Aspetta che AgendaManager sia caricato
    setTimeout(() => {
        LayoutManager.init();
    }, 200);
});

// ============================================
// GESTIONE RESPONSIVE
// ============================================

const ResponsiveManager = {
    init() {
        this.handleResponsive();
        window.addEventListener('resize', () => this.handleResponsive());
    },
    
    handleResponsive() {
        const width = window.innerWidth;
        const managementColumn = document.querySelector('.management-column');
        
        if (width <= 1024) {
            // Mobile: chiudi tutte le sezioni tranne una
            if (LayoutManager.openSections.size > 1) {
                const firstOpen = Array.from(LayoutManager.openSections)[0];
                
                LayoutManager.openSections.clear();
                LayoutManager.openSections.add(firstOpen);
                
                ['categories', 'logs', 'stats'].forEach(section => {
                    if (section !== firstOpen) {
                        LayoutManager.closeSection(
                            section,
                            document.querySelector(`.${section}-management .section-content`),
                            document.querySelector(`.${section}-management .section-toggle`)
                        );
                    }
                });
            }
            
            if (managementColumn) {
                managementColumn.style.position = 'static';
            }
        } else {
            // Desktop: ripristina comportamento normale
            if (managementColumn) {
                managementColumn.style.position = 'sticky';
            }
        }
    }
};

// Inizializza responsive manager
document.addEventListener('DOMContentLoaded', function() {
    ResponsiveManager.init();
});

console.log('✅ Layout Management JavaScript caricato completamente! 🎨');