// File: /assets/js/test_fix.js  
// Script di emergenza per ripristinare le funzioni base

// Funzioni globali di emergenza
window.changeView = function(view) {
    console.log('🔄 Cambio vista:', view);
    
    // Aggiorna URL
    const url = new URL(window.location);
    url.searchParams.set('view', view);
    window.location.href = url.toString();
};

window.navigateDate = function(direction) {
    console.log('📅 Navigazione:', direction);
    
    const url = new URL(window.location);
    const currentDate = new Date(url.searchParams.get('date') || new Date());
    
    if (direction === 'next') {
        currentDate.setDate(currentDate.getDate() + 1);
    } else {
        currentDate.setDate(currentDate.getDate() - 1);
    }
    
    url.searchParams.set('date', currentDate.toISOString().split('T')[0]);
    window.location.href = url.toString();
};

window.goToToday = function() {
    console.log('📅 Vai a oggi');
    
    const url = new URL(window.location);
    url.searchParams.set('date', new Date().toISOString().split('T')[0]);
    window.location.href = url.toString();
};

window.openEventModal = function(eventId = null) {
    console.log('📝 Apri modal evento:', eventId);
    
    const modal = document.getElementById('eventModal');
    if (!modal) {
        console.error('❌ Modal evento non trovato');
        return;
    }
    
    // Reset form
    const form = document.getElementById('eventForm');
    if (form) {
        form.reset();
    }
    
    if (eventId) {
        // Carica dati evento
        fetch(`/modules/agenda/ajax/get_event.php?event_id=${eventId}`)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Popola form
                    document.getElementById('eventId').value = data.event.id;
                    document.getElementById('eventTitle').value = data.event.title;
                    document.getElementById('eventDescription').value = data.event.description;
                    document.getElementById('eventStartDate').value = data.event.start_date;
                    document.getElementById('eventStartTime').value = data.event.start_time;
                    document.getElementById('eventEndDate').value = data.event.end_date;
                    document.getElementById('eventEndTime').value = data.event.end_time;
                    document.getElementById('allDayEvent').checked = data.event.all_day;
                    document.getElementById('eventCategory').value = data.event.category_id;
                    document.getElementById('eventClient').value = data.event.client_id || '';
                    document.getElementById('eventLocation').value = data.event.location;
                    document.getElementById('eventPriority').value = data.event.priority;
                    document.getElementById('eventReminder').value = data.event.reminder_minutes;
                    
                    // Imposta responsabili
                    data.responsables_ids.forEach(userId => {
                        const checkbox = document.querySelector(`input[name="responsables[]"][value="${userId}"]`);
                        if (checkbox) checkbox.checked = true;
                    });
                    
                    // Mostra bottone elimina
                    document.getElementById('deleteEventBtn').style.display = 'inline-block';
                    document.getElementById('modalTitle').textContent = 'Modifica Evento';
                } else {
                    alert('Errore caricamento evento: ' + data.error);
                }
            })
            .catch(error => {
                console.error('Errore:', error);
                alert('Errore di connessione');
            });
    } else {
        // Nascondi bottone elimina
        document.getElementById('deleteEventBtn').style.display = 'none';
        document.getElementById('modalTitle').textContent = 'Nuovo Evento';
        
        // Seleziona utente corrente
        if (window.agendaData && window.agendaData.userId) {
            const userCheckbox = document.querySelector(`input[name="responsables[]"][value="${window.agendaData.userId}"]`);
            if (userCheckbox) userCheckbox.checked = true;
        }
    }
    
    modal.style.display = 'flex';
    modal.classList.add('show');
};

window.closeEventModal = function() {
    console.log('❌ Chiudi modal evento');
    
    const modal = document.getElementById('eventModal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('show');
    }
};

window.deleteEvent = function() {
    const eventId = document.getElementById('eventId').value;
    if (!eventId) return;
    
    if (!confirm('Sei sicuro di voler eliminare questo evento?')) {
        return;
    }
    
    console.log('🗑️ Elimina evento:', eventId);
    
    const formData = new FormData();
    formData.append('event_id', eventId);
    formData.append('csrf_token', document.querySelector('input[name="csrf_token"]').value);
    
    fetch('/modules/agenda/ajax/delete_event.php', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('Evento eliminato con successo');
            window.closeEventModal();
            window.location.reload();
        } else {
            alert('Errore: ' + data.error);
        }
    })
    .catch(error => {
        console.error('Errore:', error);
        alert('Errore di connessione');
    });
};

window.dayClick = function(dateStr) {
    console.log('📅 Click giorno:', dateStr);
    window.openEventModal();
    
    // Imposta data
    setTimeout(() => {
        document.getElementById('eventStartDate').value = dateStr;
    }, 100);
};

window.showDayEvents = function(dateStr) {
    console.log('📋 Mostra eventi giorno:', dateStr);
    // TODO: Implementare popup eventi giorno
};

window.toggleCategory = function(categoryId) {
    console.log('🏷️ Toggle categoria:', categoryId);
    // TODO: Implementare toggle categoria
};

window.openCategoriesModal = function() {
    console.log('🏷️ Apri modal categorie');
    
    const modal = document.getElementById('categoriesModal');
    if (modal) {
        modal.style.display = 'flex';
        modal.classList.add('show');
        
        // Carica categorie esistenti
        loadCategoriesForManagement();
    }
};

function loadCategoriesForManagement() {
    const container = document.getElementById('categoriesList');
    if (!container) return;
    
    if (window.agendaData && window.agendaData.categories) {
        let html = '';
        window.agendaData.categories.forEach(category => {
            html += `
            <div class="category-item-manage" data-category-id="${category.id}">
                <div class="category-preview">
                    <div class="category-color" style="background-color: ${category.color}"></div>
                    <span class="category-icon">${category.icon}</span>
                    <span class="category-name">${category.name}</span>
                </div>
                <div class="category-actions">
                    <button class="btn-small" onclick="editCategory(${category.id})" title="Modifica">
                        ✏️
                    </button>
                    <button class="btn-small btn-danger" onclick="deleteCategory(${category.id})" title="Elimina">
                        🗑️
                    </button>
                </div>
            </div>`;
        });
        
        container.innerHTML = html || '<div class="no-categories">Nessuna categoria disponibile</div>';
    }
}

window.closeCategoriesModal = function() {
    const modal = document.getElementById('categoriesModal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('show');
    }
};

window.editCategory = function(categoryId) {
    console.log('✏️ Modifica categoria:', categoryId);
    // TODO: Implementare modifica categoria
};

window.deleteCategory = function(categoryId) {
    if (!confirm('Sei sicuro di voler eliminare questa categoria?')) return;
    
    console.log('🗑️ Elimina categoria:', categoryId);
    
    const formData = new FormData();
    formData.append('category_id', categoryId);
    formData.append('csrf_token', document.querySelector('input[name="csrf_token"]').value);
    
    fetch('/modules/agenda/ajax/delete_category.php', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('Categoria eliminata con successo');
            window.location.reload();
        } else {
            alert('Errore: ' + data.error);
        }
    })
    .catch(error => {
        console.error('Errore:', error);
        alert('Errore di connessione');
    });
};

// Event listeners per form
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Test fix caricato');
    
    // Form evento
    const eventForm = document.getElementById('eventForm');
    if (eventForm) {
        eventForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const formData = new FormData(e.target);
            
            fetch('/modules/agenda/ajax/save_event.php', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    alert('Evento salvato con successo');
                    window.closeEventModal();
                    window.location.reload();
                } else {
                    alert('Errore: ' + data.error);
                }
            })
            .catch(error => {
                console.error('Errore:', error);
                alert('Errore di connessione');
            });
        });
    }
    
    // Form categoria
    const categoryForm = document.getElementById('categoryForm');
    if (categoryForm) {
        categoryForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const formData = new FormData(e.target);
            
            fetch('/modules/agenda/ajax/save_category.php', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    alert('Categoria salvata con successo');
                    e.target.reset();
                    window.location.reload();
                } else {
                    alert('Errore: ' + data.error);
                }
            })
            .catch(error => {
                console.error('Errore:', error);
                alert('Errore di connessione');
            });
        });
    }
    
    // Click fuori modal per chiudere
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal')) {
            if (e.target.id === 'eventModal') {
                window.closeEventModal();
            } else if (e.target.id === 'categoriesModal') {
                window.closeCategoriesModal();
            }
        }
    });
});

console.log('🔧 Test Fix caricato - Funzioni di emergenza disponibili');