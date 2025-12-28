// File: /assets/js/agenda-populate-client-fix.js
// Fix MINIMO per popolare il campo cliente quando si modifica un evento

(function() {
    // Salva la funzione originale
    const originalPopulateEventForm = AgendaManager.populateEventForm;
    
    // Override solo per aggiungere il popolamento del cliente
    AgendaManager.populateEventForm = function(event, responsablesIds = []) {
        // Chiama la funzione originale
        originalPopulateEventForm.call(this, event, responsablesIds);
        
        // AGGIUNGI SOLO QUESTO: popola il campo cliente se presente
        if (event.client_id) {
            // Imposta l'ID nel campo nascosto del contact selector
            const clientIdField = document.getElementById('eventClient_id');
            if (clientIdField) {
                clientIdField.value = event.client_id;
            }
            
            // Mostra il nome nel campo di ricerca (se lo abbiamo)
            if (event.client_name) {
                const searchField = document.getElementById('eventClient_search');
                if (searchField) {
                    searchField.value = event.client_name;
                }
            }
        }
    };
    
    console.log('✅ Client populate fix applicato');
})();