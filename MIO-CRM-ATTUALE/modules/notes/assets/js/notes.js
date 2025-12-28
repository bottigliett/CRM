// File: /modules/notes/assets/js/notes.js
// Gestione interazioni pagina Note - Versione corretta

const NotesManager = {
    currentNoteId: null,
    selectedColor: '#FFE066',
    richEditor: null,
    currentPreviewNoteId: null,
    
    init() {
        this.attachEventListeners();
        this.initColorPicker();
        this.initRichEditor();
    },
    
    attachEventListeners() {
        // Nuovo nota
        const newNoteBtn = document.getElementById('newNoteBtn');
        if (newNoteBtn) {
            newNoteBtn.addEventListener('click', () => this.openNewNoteModal());
        }
        
        // Chiudi modal
        document.getElementById('closeModal')?.addEventListener('click', () => this.closeModal());
        document.getElementById('cancelBtn')?.addEventListener('click', () => this.closeModal());
        
        // Preview modal
        document.getElementById('closePreviewModal')?.addEventListener('click', () => this.closePreviewModal());
        document.getElementById('editFromPreview')?.addEventListener('click', () => this.editFromPreview());
        
        // Salva nota
        document.getElementById('saveNoteBtn')?.addEventListener('click', () => this.saveNote());
        
        // Form submit
        document.getElementById('noteForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveNote();
        });
        
        // Pin buttons
        document.querySelectorAll('.pin-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.togglePin(btn.dataset.id);
            });
        });
        
        // Edit buttons
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.editNote(btn.dataset.id);
            });
        });
        
        // Delete buttons
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.confirmDelete(btn.dataset.id);
            });
        });
        
        // Delete modal
        document.getElementById('closeDeleteModal')?.addEventListener('click', () => this.closeDeleteModal());
        document.getElementById('cancelDeleteBtn')?.addEventListener('click', () => this.closeDeleteModal());
        document.getElementById('confirmDeleteBtn')?.addEventListener('click', () => this.deleteNote());
        
        // Filtri
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => this.filterNotes(btn.dataset.filter));
        });
        
        // Ricerca
        const searchInput = document.getElementById('searchNotes');
        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.searchNotes(e.target.value);
                }, 300);
            });
        }
        
        // Click fuori dal modal per chiudere
        document.getElementById('noteModal')?.addEventListener('click', (e) => {
            if (e.target.id === 'noteModal') {
                this.closeModal();
            }
        });
        
        document.getElementById('previewModal')?.addEventListener('click', (e) => {
            if (e.target.id === 'previewModal') {
                this.closePreviewModal();
            }
        });
        
        document.getElementById('deleteModal')?.addEventListener('click', (e) => {
            if (e.target.id === 'deleteModal') {
                this.closeDeleteModal();
            }
        });
    },
    
    initColorPicker() {
        document.querySelectorAll('.color-option').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.color-option').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.selectedColor = btn.dataset.color;
                document.getElementById('noteColor').value = this.selectedColor;
            });
        });
    },
    
    initRichEditor() {
        this.richEditor = document.getElementById('noteDescription');
        if (!this.richEditor) return;
        
        // Toolbar buttons
        document.querySelectorAll('.toolbar-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.executeCommand(btn.dataset.command);
            });
        });
        
        // Aggiorna textarea nascosta quando cambia il contenuto
        this.richEditor.addEventListener('input', () => {
            document.getElementById('noteDescriptionHidden').value = this.richEditor.innerHTML;
        });
        
        // Gestione placeholder
        this.richEditor.addEventListener('focus', () => {
            if (this.richEditor.textContent.trim() === '' && !this.richEditor.innerHTML.includes('<')) {
                this.richEditor.innerHTML = '';
            }
        });
        
        this.richEditor.addEventListener('blur', () => {
            if (this.richEditor.textContent.trim() === '') {
                this.richEditor.innerHTML = '';
            }
        });
    },
    
    executeCommand(command) {
        this.richEditor.focus();
        
        if (command === 'createLink') {
            const url = prompt('Inserisci l\'URL del link:');
            if (url) {
                document.execCommand('createLink', false, url);
            }
        } else {
            document.execCommand(command, false, null);
        }
        
        // Aggiorna textarea nascosta
        document.getElementById('noteDescriptionHidden').value = this.richEditor.innerHTML;
    },
    
    openNewNoteModal() {
        this.currentNoteId = null;
        document.getElementById('modalTitle').textContent = 'Nuova nota';
        document.getElementById('noteForm').reset();
        document.getElementById('noteId').value = '';
        
        // Reset rich editor
        this.richEditor.innerHTML = '';
        document.getElementById('noteDescriptionHidden').value = '';
        
        // Reset color picker
        document.querySelectorAll('.color-option').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.color === '#FFE066') {
                btn.classList.add('active');
            }
        });
        this.selectedColor = '#FFE066';
        document.getElementById('noteColor').value = this.selectedColor;
        
        this.openModal();
    },
    
    async editNote(noteId) {
        try {
            const response = await fetch(`/modules/notes/api.php?action=get&id=${noteId}`);
            const data = await response.json();
            
            if (data.success) {
                const note = data.note;
                this.currentNoteId = noteId;
                
                document.getElementById('modalTitle').textContent = 'Modifica nota';
                document.getElementById('noteId').value = noteId;
                document.getElementById('noteTitleInput').value = note.title;
                
                // Set rich editor content
                this.richEditor.innerHTML = note.description || '';
                document.getElementById('noteDescriptionHidden').value = note.description || '';
                
                document.getElementById('notePinned').checked = note.is_pinned == 1;
                document.getElementById('notePublic').checked = note.is_public == 1;
                
                // Set color
                this.selectedColor = note.color || '#FFE066';
                document.getElementById('noteColor').value = this.selectedColor;
                document.querySelectorAll('.color-option').forEach(btn => {
                    btn.classList.remove('active');
                    if (btn.dataset.color === this.selectedColor) {
                        btn.classList.add('active');
                    }
                });
                
                this.openModal();
            }
        } catch (error) {
            console.error('Errore nel caricamento della nota:', error);
            this.showMessage('Errore nel caricamento della nota', 'error');
        }
    },
    
    async previewNote(noteId) {
        try {
            const response = await fetch(`/modules/notes/api.php?action=get&id=${noteId}`);
            const data = await response.json();
            
            if (data.success) {
                const note = data.note;
                this.currentPreviewNoteId = noteId;
                
                // Popola il modal di anteprima
                document.getElementById('previewNoteTitle').textContent = note.title;
                document.getElementById('previewDescription').innerHTML = note.description || '<em>Nessuna descrizione</em>';
                
                // Informazioni meta
                const authorInfo = note.author_name ? 
                    `Creata da: ${note.author_name}` : 
                    'La tua nota';
                document.getElementById('previewAuthor').textContent = authorInfo;
                
                // Formatta la data
                const createdAt = new Date(note.created_at);
                const options = { 
                    year: 'numeric', month: 'long', day: 'numeric', 
                    hour: '2-digit', minute: '2-digit'
                };
                document.getElementById('previewDate').textContent = 
                    `Creata il ${createdAt.toLocaleDateString('it-IT', options)}`;
                
                // Badge visibilità
                const visibilityBadge = document.getElementById('previewVisibility');
                if (note.is_public == 1) {
                    visibilityBadge.textContent = '🌐 Pubblica';
                    visibilityBadge.className = 'badge public';
                } else {
                    visibilityBadge.textContent = '🔒 Privata';
                    visibilityBadge.className = 'badge private';
                }
                
                // Badge fissata
                const pinnedBadge = document.getElementById('previewPinned');
                if (note.is_pinned == 1) {
                    pinnedBadge.textContent = '📌 Fissata';
                    pinnedBadge.className = 'badge pinned';
                    pinnedBadge.style.display = 'inline';
                } else {
                    pinnedBadge.style.display = 'none';
                }
                
                // Mostra pulsante modifica solo se è la propria nota
                const editBtn = document.getElementById('editFromPreview');
                if (window.currentUser && note.user_id == window.currentUser.id) {
                    editBtn.style.display = 'block';
                } else {
                    editBtn.style.display = 'none';
                }
                
                this.openPreviewModal();
            }
        } catch (error) {
            console.error('Errore nel caricamento della nota:', error);
            this.showMessage('Errore nel caricamento della nota', 'error');
        }
    },
    
    editFromPreview() {
        this.closePreviewModal();
        if (this.currentPreviewNoteId) {
            this.editNote(this.currentPreviewNoteId);
        }
    },
    
    async saveNote() {
        const form = document.getElementById('noteForm');
        const formData = new FormData(form);
        
        // Aggiorna il contenuto del rich editor nella textarea nascosta
        document.getElementById('noteDescriptionHidden').value = this.richEditor.innerHTML;
        
        const noteData = {
            title: formData.get('title'),
            description: this.richEditor.innerHTML,
            is_pinned: formData.get('is_pinned') ? 1 : 0,
            is_public: formData.get('is_public') ? 1 : 0,
            color: formData.get('color')
        };
        
        if (!noteData.title.trim()) {
            this.showMessage('Il titolo è obbligatorio', 'error');
            return;
        }
        
        const isEdit = !!this.currentNoteId;
        if (isEdit) {
            noteData.id = this.currentNoteId;
        }
        
        try {
            const response = await fetch('/modules/notes/api.php', {
                method: isEdit ? 'PUT' : 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(noteData)
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showMessage(data.message, 'success');
                this.closeModal();
                
                // Ricarica la pagina o aggiorna la UI
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
            } else {
                this.showMessage(data.message || 'Errore nel salvataggio', 'error');
            }
        } catch (error) {
            console.error('Errore:', error);
            this.showMessage('Si è verificato un errore', 'error');
        }
    },
    
    async togglePin(noteId) {
        try {
            const response = await fetch('/modules/notes/api.php', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ id: noteId })
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Aggiorna UI
                const noteCard = document.querySelector(`.note-card[data-id="${noteId}"]`);
                const pinBtn = noteCard.querySelector('.pin-btn');
                
                if (data.is_pinned) {
                    noteCard.classList.add('pinned');
                    pinBtn.classList.add('active');
                    pinBtn.title = 'Rimuovi dai fissati';
                } else {
                    noteCard.classList.remove('pinned');
                    pinBtn.classList.remove('active');
                    pinBtn.title = 'Fissa nota';
                }
                
                this.showMessage(data.message, 'success');
                
                // Riordina le note dopo 1 secondo
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
            }
        } catch (error) {
            console.error('Errore:', error);
            this.showMessage('Errore nell\'aggiornamento', 'error');
        }
    },
    
    confirmDelete(noteId) {
        this.currentNoteId = noteId;
        document.getElementById('deleteModal').classList.add('visible');
    },
    
    async deleteNote() {
        if (!this.currentNoteId) return;
        
        try {
            const response = await fetch(`/modules/notes/api.php?id=${this.currentNoteId}`, {
                method: 'DELETE'
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showMessage(data.message, 'success');
                this.closeDeleteModal();
                
                // Rimuovi la card dalla UI
                const noteCard = document.querySelector(`.note-card[data-id="${this.currentNoteId}"]`);
                if (noteCard) {
                    noteCard.style.opacity = '0';
                    noteCard.style.transform = 'scale(0.9)';
                    setTimeout(() => {
                        noteCard.remove();
                        
                        // Controlla se non ci sono più note
                        const remainingNotes = document.querySelectorAll('.note-card').length;
                        if (remainingNotes === 0) {
                            window.location.reload();
                        }
                    }, 300);
                }
            } else {
                this.showMessage(data.message || 'Errore nell\'eliminazione', 'error');
            }
        } catch (error) {
            console.error('Errore:', error);
            this.showMessage('Si è verificato un errore', 'error');
        }
    },
    
    filterNotes(filter) {
        // Aggiorna active state
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.filter === filter) {
                btn.classList.add('active');
            }
        });
        
        const noteCards = document.querySelectorAll('.note-card');
        const isAdmin = window.currentUser && window.currentUser.is_admin;
        const currentUserId = window.currentUser ? window.currentUser.id : null;
        
        noteCards.forEach(card => {
            const isPublic = card.dataset.isPublic === '1';
            const isPinned = card.classList.contains('pinned');
            const isOwner = card.dataset.userId == currentUserId;
            
            let shouldShow = false;
            
            switch (filter) {
                case 'all':
                    shouldShow = true;
                    break;
                case 'pinned':
                    shouldShow = isPinned;
                    break;
                case 'public':
                    shouldShow = isPublic;
                    break;
                case 'private':
                    shouldShow = !isPublic;
                    break;
                case 'my':
                    shouldShow = isOwner;
                    break;
            }
            
            card.style.display = shouldShow ? '' : 'none';
        });
    },
    
    searchNotes(searchTerm) {
        const noteCards = document.querySelectorAll('.note-card');
        const term = searchTerm.toLowerCase();
        
        noteCards.forEach(card => {
            const title = card.querySelector('.note-title').textContent.toLowerCase();
            const description = card.querySelector('.note-description').textContent.toLowerCase();
            
            if (title.includes(term) || description.includes(term)) {
                card.style.display = '';
            } else {
                card.style.display = 'none';
            }
        });
    },
    
    openModal() {
        document.getElementById('noteModal').classList.add('visible');
        document.getElementById('noteTitleInput').focus();
    },
    
    closeModal() {
        document.getElementById('noteModal').classList.remove('visible');
        document.getElementById('noteForm').reset();
        this.richEditor.innerHTML = '';
        document.getElementById('noteDescriptionHidden').value = '';
        this.currentNoteId = null;
    },
    
    openPreviewModal() {
        document.getElementById('previewModal').classList.add('visible');
    },
    
    closePreviewModal() {
        document.getElementById('previewModal').classList.remove('visible');
        this.currentPreviewNoteId = null;
    },
    
    closeDeleteModal() {
        document.getElementById('deleteModal').classList.remove('visible');
        this.currentNoteId = null;
    },
    
    showMessage(message, type = 'info') {
        // Rimuovi eventuali messaggi esistenti
        const existingMessages = document.querySelectorAll('.toast-message');
        existingMessages.forEach(msg => msg.remove());
        
        // Crea elemento messaggio
        const messageEl = document.createElement('div');
        messageEl.className = `toast-message toast-${type}`;
        messageEl.innerHTML = `
            <div class="toast-content">
                <span class="toast-icon">${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span>
                <span class="toast-text">${message}</span>
            </div>
        `;
        
        messageEl.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            background: ${type === 'success' ? '#4caf50' : type === 'error' ? '#f44336' : '#2196f3'};
            color: white;
            border-radius: 8px;
            font-size: 14px;
            z-index: 2000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            animation: slideInToast 0.3s ease;
            max-width: 400px;
        `;
        
        document.body.appendChild(messageEl);
        
        // Rimuovi dopo 4 secondi
        setTimeout(() => {
            messageEl.style.animation = 'slideOutToast 0.3s ease';
            setTimeout(() => {
                messageEl.remove();
            }, 300);
        }, 4000);
        
        // Click per rimuovere
        messageEl.addEventListener('click', () => {
            messageEl.style.animation = 'slideOutToast 0.3s ease';
            setTimeout(() => messageEl.remove(), 300);
        });
    }
};

// CSS per animazioni e toast
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInToast {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutToast {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    .toast-content {
        display: flex;
        align-items: center;
        gap: 8px;
    }
    
    .toast-message {
        cursor: pointer;
    }
    
    .toast-message:hover {
        opacity: 0.9;
    }
`;
document.head.appendChild(style);

// Inizializza quando DOM è pronto
document.addEventListener('DOMContentLoaded', () => {
    NotesManager.init();
});