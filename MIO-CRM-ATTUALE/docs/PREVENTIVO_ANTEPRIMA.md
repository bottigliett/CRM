# Sistema di Anteprima Preventivi - Documentazione

## Panoramica

Il sistema di anteprima preventivi permette agli amministratori di visualizzare **esattamente** come apparirà un preventivo al cliente **prima** e **dopo** il salvataggio, in totale sicurezza.

**Soluzione Elegante**: Utilizza lo stesso file `preventivo.php` dei clienti, garantendo che l'anteprima sia identica al 100% alla vista reale.

## Caratteristiche Principali

### 🔒 Sicurezza
- **Accesso limitato**: Solo utenti con ruolo `admin` o `super_admin` possono accedere all'anteprima
- **Verifica autenticazione**: La pagina `preventivo_preview.php` verifica sempre la sessione admin
- **Protezione URL**: Anche conoscendo l'URL, senza login admin l'accesso è negato (HTTP 403)
- **Preventivi temporanei**: Le anteprime pre-salvataggio sono marcate con status `preview` e auto-eliminate dopo 24h

### 👁️ Modalità Anteprima

#### Banner Visivo
Quando un admin visualizza l'anteprima, appare un banner rosso in alto con:
- Indicazione chiara "MODALITÀ ANTEPRIMA ADMIN"
- Nome dell'admin che sta visualizzando
- Data e ora dell'anteprima
- ID e status del preventivo
- Pulsante per chiudere l'anteprima

#### Protezioni
- Form di accettazione disabilitati in anteprima
- Console log con informazioni di debug per l'admin
- Impossibile inviare dati in modalità anteprima

## Utilizzo

### 1. Anteprima Durante la Creazione (Step 3 del Wizard)

Quando si crea un nuovo preventivo:

1. Compilare tutti i campi negli Step 1 e 2
2. Arrivare allo Step 3 (Riepilogo)
3. Cliccare sul pulsante **"👁️ Anteprima Preventivo"**
4. Si apre una nuova finestra con l'anteprima esatta di come il cliente vedrà il preventivo
5. Verificare che tutto sia corretto
6. Chiudere l'anteprima e tornare al wizard
7. Se tutto OK, cliccare "💾 Salva Accesso"

**Nota**: L'anteprima prima del salvataggio crea un preventivo temporaneo con status `preview` che viene automaticamente eliminato dopo 24 ore.

### 2. Anteprima di Preventivi Salvati

Per visualizzare l'anteprima di un preventivo già salvato:

#### Dalla Tabella Principale
- Nella colonna "Azioni" dei preventivi, cliccare sull'icona **👁️**
- Si apre l'anteprima in una nuova finestra

#### Dal Modal Dettagli
1. Cliccare su "Dettagli" per un cliente con preventivo
2. Andare nel tab "Preventivo"
3. In alto a destra c'è il pulsante **"👁️ Anteprima Preventivo"**
4. Si apre l'anteprima in una nuova finestra

## Implementazione Tecnica

### File Coinvolti

1. **`/preventivo.php`** - Pagina preventivo unificata (cliente + admin preview)
   - Modalità normale: Visualizzazione cliente autenticato
   - Modalità preview (`?preview=1`): Visualizzazione admin con banner
   - Verifica autenticazione in base alla modalità
   - Carica dati preventivo da `quote_id` o `access_id`
   - Mostra banner admin rosso in alto quando `$isAdminPreview = true`
   - Disabilita form di accettazione in modalità preview
   - Salta logging e aggiornamento status in modalità preview

2. **`/modules/admin_utenti/index.php`** - Gestione admin
   - Pulsante anteprima nello Step 3
   - Pulsante anteprima nella tabella
   - Pulsante anteprima nel modal dettagli
   - Endpoint AJAX `create_temp_preview`
   - Funzioni JS: `openPreventivoPrev()` e `openSavedQuotePreview()`

### Parametri URL

La modalità anteprima si attiva con il parametro `preview=1` combinato con:

- `?preview=1&quote_id=123` - Anteprima preventivo con ID specifico
- `?preview=1&access_id=456` - Anteprima preventivo legato all'accesso cliente

**Esempi**:
```
# Anteprima preventivo con ID 42
https://portale.studiomismo.it/preventivo.php?preview=1&quote_id=42

# Anteprima preventivo da access_id
https://portale.studiomismo.it/preventivo.php?preview=1&access_id=15
```

**Nota**: Senza `preview=1`, la pagina funziona normalmente per i clienti autenticati.

### Database

#### Status Preventivi
- `draft` - Bozza normale
- `sent` - Inviato al cliente
- `accepted` - Accettato
- `rejected` - Rifiutato
- **`preview`** - Anteprima temporanea (auto-eliminata dopo 24h)

#### Pulizia Automatica
Ogni volta che viene caricata la pagina admin_utenti, viene eseguita questa query:

```sql
DELETE FROM quotes
WHERE status = 'preview'
AND created_at < DATE_SUB(NOW(), INTERVAL 24 HOUR)
```

## Sicurezza Implementata

### Livelli di Protezione

1. **Autenticazione Obbligatoria**
   ```php
   $currentUser = getCurrentUser();
   if (!$currentUser || !in_array($currentUser['role'], ['admin', 'super_admin'])) {
       http_response_code(403);
       die('Accesso negato...');
   }
   ```

2. **Esclusione Preventivi Temporanei**
   - I preventivi con status `preview` NON appaiono nella lista principale
   - Query modificata con: `AND q.status != 'preview'`

3. **Validazione Parametri**
   - Controllo presenza `quote_id` o `access_id`
   - Casting a integer per prevenire SQL injection
   - Prepared statements per tutte le query

4. **Banner Visivo Admin**
   - Impossibile confondere anteprima con vista reale cliente
   - Banner fisso in alto sempre visibile
   - Informazioni di debug in console

## Funzionalità JavaScript

### `openPreventivoPrev()`
Apre anteprima durante la creazione (Step 3):
- Verifica che si sia nello step 3
- Salva i dati del form
- Chiama endpoint `create_temp_preview`
- Apre nuova finestra con l'anteprima

### `openSavedQuotePreview(quoteId)`
Apre anteprima di preventivo già salvato:
- Riceve l'ID del preventivo
- Apre direttamente la finestra di anteprima
- Dimensioni: 1200x800px

## Manutenzione

### Pulizia Manuale Preventivi Preview

Se necessario pulire manualmente:

```sql
-- Vedi quanti preventivi preview ci sono
SELECT COUNT(*) FROM quotes WHERE status = 'preview';

-- Elimina tutti i preventivi preview (anche recenti)
DELETE FROM quotes WHERE status = 'preview';

-- Elimina solo quelli vecchi di più di 1 ora
DELETE FROM quotes
WHERE status = 'preview'
AND created_at < DATE_SUB(NOW(), INTERVAL 1 HOUR);
```

### Log

La pulizia automatica scrive nel log PHP:
```
[2025-11-19 10:30:15] Puliti 3 preventivi di anteprima vecchi
```

Controlla i log con:
```bash
tail -f /var/log/php/error.log | grep "preventivi di anteprima"
```

## Troubleshooting

### L'anteprima non si apre

**Problema**: Cliccando sul pulsante non succede nulla

**Soluzioni**:
1. Verificare che il browser non stia bloccando i popup
2. Aprire la console browser (F12) e cercare errori JavaScript
3. Verificare che tutti i campi obbligatori siano compilati

### Errore 403 - Accesso Negato

**Problema**: L'anteprima mostra "Accesso negato"

**Soluzioni**:
1. Verificare di essere loggati come admin
2. Controllare che la sessione non sia scaduta
3. Ri-effettuare il login

### Anteprima mostra dati vecchi

**Problema**: L'anteprima non riflette le modifiche appena fatte

**Soluzioni**:
1. Prima di cliccare "Anteprima", tornare indietro e avanti negli step per assicurarsi che i dati siano salvati
2. Ricaricare la pagina di anteprima (F5)
3. Chiudere e riaprire l'anteprima

### Preventivi temporanei non vengono eliminati

**Problema**: Molti preventivi con status `preview` nel database

**Soluzioni**:
1. Verificare che la pagina admin_utenti venga visitata regolarmente
2. Eseguire manualmente la query di pulizia (vedi sopra)
3. Creare un cron job per la pulizia automatica

## Best Practices

1. **Usare sempre l'anteprima** prima di inviare il preventivo al cliente
2. **Verificare su dispositivi diversi** usando le dev tools del browser
3. **Controllare i calcoli** dei totali e delle percentuali
4. **Testare i link** e le call-to-action
5. **Non condividere URL di anteprima** con persone non autorizzate

## Changelog

### v1.0.0 (2025-11-19)
- ✅ Implementata anteprima sicura per admin
- ✅ Banner identificativo modalità anteprima
- ✅ Pulsanti anteprima in wizard, tabella e modal
- ✅ Preventivi temporanei con auto-eliminazione
- ✅ Protezione accessi non autorizzati
- ✅ Documentazione completa

## Supporto

Per problemi o domande:
- Email: dev@studiomismo.it
- Documentazione: `/docs/`
- Issue tracker: GitHub (se disponibile)
