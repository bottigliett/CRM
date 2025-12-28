# Modulo Lead e Contatti - CRM Studio Mismo

## Descrizione
Modulo completo per la gestione di lead, prospect e clienti con funzionalità avanzate di organizzazione e tracking.

## Funzionalità
- ✅ Gestione contatti (persone e aziende)
- ✅ Sistema di tags con hashtag
- ✅ Profili social integrati
- ✅ Stati e priorità personalizzabili
- ✅ Ricerca e filtri avanzati
- ✅ Log delle attività
- ✅ Interface stile Notion

## Struttura File
```
/modules/lead_contatti/
├── index.php              # Pagina principale
├── ajax/                  # Endpoint AJAX
│   ├── get_contacts.php   # Lista contatti
│   ├── get_contact.php    # Dettagli singolo contatto
│   ├── save_contact.php   # Salva/aggiorna contatto
│   └── delete_contact.php # Elimina contatto
├── assets/                # Asset del modulo
│   ├── css/leads.css      # Stili modulo
│   └── js/leads.js        # JavaScript modulo
├── config/                # Configurazioni
│   └── leads_config.php   # Config principale
└── setup/                 # Script setup
    └── create_directories.php
```

## Database
Il modulo utilizza le seguenti tabelle:
- `leads_contacts` - Contatti principali
- `leads_contacts_tags` - Tags dei contatti  
- `leads_contacts_socials` - Profili social
- `leads_activity_logs` - Log attività

## Installazione
1. Eseguire lo script SQL per creare le tabelle
2. Copiare i file del modulo
3. Eseguire `setup/create_directories.php`
4. Verificare permessi delle directory

## Configurazione
Modificare `/config/leads_config.php` per personalizzare:
- Tipi di contatto supportati
- Stati e priorità
- Piattaforme social
- Limiti e cache

## API Endpoints
- `GET /ajax/get_contacts.php` - Lista contatti con filtri
- `GET /ajax/get_contact.php?id=X` - Dettagli contatto
- `POST /ajax/save_contact.php` - Crea/aggiorna contatto
- `POST /ajax/delete_contact.php` - Elimina contatto

## Sicurezza
- Autenticazione obbligatoria
- Validazione CSRF token
- Sanitizzazione input
- Log delle attività
- Controllo permessi

## Requisiti
- PHP 7.4+
- MySQL 5.7+
- Moduli: PDO, JSON
- CRM Studio Mismo core

## Supporto
Per problemi o domande, controllare i log in `/core/logs/php_errors.log`

---
Versione: 1.0.0
Autore: CRM Studio Mismo
Data: 2025-08-01
