// File: /assets/js/dashboard.js
// JavaScript specifico per la dashboard del CRM Studio Mismo

const DashboardManager = {
    // Inizializza dashboard
    init() {
        console.log('DashboardManager: Initializing...');
        
        this.setupFilterButtons();
        this.setupTaskButtons();
        
        console.log('DashboardManager: Initialized');
    },

    // Setup filtri task
    setupFilterButtons() {
        const filterButtons = document.querySelectorAll('.filter-btn');
        
        filterButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Rimuovi active da tutti
                filterButtons.forEach(b => b.classList.remove('active'));
                
                // Aggiungi active al clicked
                e.target.classList.add('active');
                
                // Filtra task (placeholder per ora)
                const filter = e.target.dataset.filter;
                this.filterTasks(filter);
            });
        });
    },

    // Setup bottoni task
    setupTaskButtons() {
        const taskButtons = document.querySelectorAll('.task-complete-btn');
        
        taskButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.completeTask(e.target);
            });
        });
    },

    // Filtra task per periodo
    filterTasks(filter) {
        console.log('Filtering tasks by:', filter);
        
        // Placeholder - in futuro qui filtreremo i task reali
        switch(filter) {
            case 'oggi':
                this.showMessage('Mostrando task di oggi');
                break;
            case 'domani':
                this.showMessage('Mostrando task di domani');
                break;
            case 'prossimi':
                this.showMessage('Mostrando task dei prossimi 7 giorni');
                break;
        }
    },

    // Completa task
    completeTask(button) {
        if (confirm('Sei sicuro di voler segnare questo task come completato?')) {
            button.textContent = '✅ Completato';
            button.style.background = '#16a34a';
            button.disabled = true;
            
            // Placeholder - in futuro qui salveremo nel database
            console.log('Task marked as completed');
        }
    },

    // Mostra messaggio temporaneo
    showMessage(message) {
        // Crea o aggiorna toast message
        let toast = document.getElementById('dashboard-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'dashboard-toast';
            toast.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: #3b82f6;
                color: white;
                padding: 12px 20px;
                border-radius: 8px;
                font-size: 14px;
                z-index: 1000;
                transition: all 0.3s ease;
            `;
            document.body.appendChild(toast);
        }
        
        toast.textContent = message;
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
        
        // Nascondi dopo 3 secondi
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(-20px)';
        }, 3000);
    }
};

// Funzioni globali per onclick handlers
function addTask() {
    alert('Funzionalità per aggiungere task in fase di implementazione.\n\nIn futuro aprirà un modal per creare nuovi task.');
}

function completeTask(button) {
    DashboardManager.completeTask(button);
}

// Auto-inizializza quando DOM è pronto
document.addEventListener('DOMContentLoaded', function() {
    // Aspetta che il layout base sia inizializzato
    setTimeout(() => {
        DashboardManager.init();
    }, 200);
});

// Export per uso globale
window.DashboardManager = DashboardManager;