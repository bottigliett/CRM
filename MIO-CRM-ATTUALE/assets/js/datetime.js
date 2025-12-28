// File: /assets/js/datetime.js
// JavaScript per gestione data e ora CRM Studio Mismo

document.addEventListener('DOMContentLoaded', function() {
    // Inizializza e aggiorna data/ora
    updateDateTime();
    
    // Aggiorna ogni minuto
    setInterval(updateDateTime, 60000);
    
    // Aggiorna quando la finestra torna in focus
    window.addEventListener('focus', updateDateTime);
});

function updateDateTime() {
    const dateTimeElement = document.getElementById('currentDateTime');
    if (!dateTimeElement) return;
    
    const now = new Date();
    
    // Opzioni per la formattazione italiana
    const options = { 
        weekday: 'short', 
        day: '2-digit', 
        month: 'short', 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false
    };
    
    try {
        const formattedDate = now.toLocaleDateString('it-IT', options);
        dateTimeElement.textContent = formattedDate.toUpperCase();
        
        // Aggiungi attributo per accessibilità
        dateTimeElement.setAttribute('title', now.toLocaleString('it-IT'));
        
    } catch (error) {
        console.warn('Error formatting date:', error);
        // Fallback semplice
        dateTimeElement.textContent = now.toLocaleString('it-IT', {
            day: '2-digit',
            month: '2-digit', 
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}

// Funzioni utility per la gestione del tempo
window.DateTimeUtils = {
    // Aggiorna immediatamente
    forceUpdate: function() {
        updateDateTime();
    },
    
    // Ottieni timestamp corrente
    getCurrentTimestamp: function() {
        return Date.now();
    },
    
    // Formatta data per display
    formatDate: function(date, format = 'short') {
        const d = new Date(date);
        
        switch (format) {
            case 'short':
                return d.toLocaleDateString('it-IT', { 
                    day: '2-digit', 
                    month: '2-digit', 
                    year: '2-digit' 
                });
            case 'long':
                return d.toLocaleDateString('it-IT', { 
                    weekday: 'long',
                    day: '2-digit', 
                    month: 'long', 
                    year: 'numeric' 
                });
            case 'time':
                return d.toLocaleTimeString('it-IT', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                });
            default:
                return d.toLocaleDateString('it-IT');
        }
    },
    
    // Calcola tempo relativo (es: "2 ore fa")
    getRelativeTime: function(date) {
        const now = new Date();
        const past = new Date(date);
        const diffMs = now - past;
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMinutes / 60);
        const diffDays = Math.floor(diffHours / 24);
        
        if (diffMinutes < 1) return 'ora';
        if (diffMinutes < 60) return `${diffMinutes} min fa`;
        if (diffHours < 24) return `${diffHours} ore fa`;
        if (diffDays < 7) return `${diffDays} giorni fa`;
        
        return this.formatDate(date);
    }
};