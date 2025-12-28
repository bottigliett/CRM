# 📬 Sistema di Notifiche CRM - Guida Completa

## ✅ Configurazione Completata

Il sistema di notifiche è stato completamente implementato e configurato con:

- ✅ **Database**: Tabelle Prisma migrate applicate
- ✅ **Backend API**: Endpoint REST completi
- ✅ **Email SMTP**: Hostinger configurato (noreply@studiomismo.it)
- ✅ **Frontend UI**: Centro notifiche e pagina impostazioni
- ✅ **Promemoria**: Sistema di scheduling eventi

---

## 🚀 Come Avviare

### 1. Backend (Terminale 1)
```bash
cd /Users/davide/Documents/shadcn-dashboard/backend
npm run dev
```
Server disponibile su: `http://localhost:3001`

### 2. Script Promemoria (Terminale 2)
```bash
cd /Users/davide/Documents/shadcn-dashboard/backend
npx ts-node src/scripts/process-reminders.ts
```
Questo script controlla ogni **60 secondi** se ci sono promemoria da inviare.

### 3. Frontend (Terminale 3)
```bash
cd /Users/davide/Documents/shadcn-dashboard/vite-version
npm run dev
```
Applicazione disponibile su: `http://localhost:5173`

---

## 📋 Funzionalità Implementate

### 1. Centro Notifiche 🔔
**Posizione**: Sidebar (sopra il blocco PIN)

**Funzionalità**:
- Badge con contatore notifiche non lette
- Click per aprire pannello laterale
- Lista notifiche con:
  - Icone colorate per tipo
  - Badge "Nuova" per non lette
  - Pulsante segna come letta
  - Pulsante elimina
  - Click sulla notifica per navigare
- Polling automatico ogni 30 secondi
- Pulsante "Segna tutte lette"

**File**: `vite-version/src/components/nav-notifications.tsx`

### 2. Promemoria Eventi 📅
**Posizione**: Form creazione/modifica evento

**Funzionalità**:
- Toggle per abilitare promemoria
- Opzioni tempo:
  - 15 minuti prima
  - 30 minuti prima
  - 1 ora prima
  - 1 giorno prima
- Toggle per invio email
- Promemoria salvati nel database
- Processing automatico ogni minuto

**File**: `vite-version/src/app/calendar/components/event-form.tsx` (linee 590-643)

### 3. Pagina Impostazioni Notifiche ⚙️
**URL**: `/settings/notifications`

**Sezioni**:

#### Email Notifications
- Toggle globale email
- Per ogni tipo di notifica:
  - ✅ Promemoria eventi
  - ✅ Evento assegnato
  - ✅ Task assegnata
  - ⏰ Scadenza task vicina
  - 🚨 Task in ritardo

#### Browser Notifications
- Toggle globale browser
- Stesso set di notifiche delle email

#### Centro Notifiche
- Mostra/nascondi icona in sidebar

#### Default Reminder
- Abilita promemoria di default per nuovi eventi
- Seleziona tempo predefinito

**File**: `vite-version/src/app/settings/notifications/page.tsx`

---

## 🔌 API Endpoints

Tutti gli endpoint richiedono autenticazione tramite header:
```
Authorization: Bearer <token>
```

### GET `/api/notifications`
Recupera notifiche utente con conteggio non lette

**Query params**:
- `unreadOnly=true` - Solo notifiche non lette

**Risposta**:
```json
{
  "success": true,
  "data": {
    "notifications": [...],
    "unreadCount": 5
  }
}
```

### PATCH `/api/notifications/:id/read`
Segna una notifica come letta

### PATCH `/api/notifications/read-all`
Segna tutte le notifiche come lette

### DELETE `/api/notifications/:id`
Elimina una notifica

### GET `/api/notifications/preferences`
Recupera preferenze notifiche (crea default se non esistono)

### PUT `/api/notifications/preferences`
Aggiorna preferenze notifiche

---

## 📧 Template Email

Sono disponibili 5 template email professionali in HTML:

1. **Promemoria Evento** - Blu (#2563eb)
   - Inviato prima dell'evento secondo preferenze
   - Include data/ora e link all'evento

2. **Evento Assegnato** - Verde (#10b981)
   - Inviato quando un utente viene assegnato a un evento
   - Include chi ha assegnato e dettagli evento

3. **Task Assegnata** - Viola (#8b5cf6)
   - Inviato quando un utente viene assegnato a una task
   - Include scadenza e chi ha assegnato

4. **Scadenza Task Imminente** - Arancione (#f59e0b)
   - Inviato quando una task è in scadenza a breve

5. **Task in Ritardo** - Rosso (#ef4444)
   - Inviato quando una task ha superato la scadenza

**File**: `backend/src/services/email.service.ts`

---

## 🗃️ Struttura Database

### Tabella: `notifications`
```sql
- id: int
- user_id: int
- type: enum (EVENT_REMINDER, EVENT_ASSIGNED, TASK_ASSIGNED, etc.)
- title: string
- message: string
- link: string (nullable)
- is_read: boolean
- read_at: datetime (nullable)
- event_id: int (nullable)
- task_id: int (nullable)
- created_at: datetime
```

### Tabella: `notification_preferences`
```sql
- id: int
- user_id: int
- email_enabled: boolean
- email_event_reminder: boolean
- email_event_assigned: boolean
- email_task_assigned: boolean
- email_task_due_soon: boolean
- email_task_overdue: boolean
- browser_enabled: boolean
- browser_event_reminder: boolean
- browser_event_assigned: boolean
- browser_task_assigned: boolean
- browser_task_due_soon: boolean
- browser_task_overdue: boolean
- center_enabled: boolean
- default_reminder_enabled: boolean
- default_reminder_type: enum (nullable)
- created_at: datetime
- updated_at: datetime
```

### Tabella: `event_reminders`
```sql
- id: int
- event_id: int
- reminder_type: enum (MINUTES_15, MINUTES_30, HOUR_1, DAY_1)
- send_email: boolean
- email_sent: boolean
- email_sent_at: datetime (nullable)
- send_browser: boolean
- browser_sent: boolean
- browser_sent_at: datetime (nullable)
- scheduled_at: datetime
- created_at: datetime
```

---

## ⚙️ Configurazione Email

### File: `backend/.env`
```env
MAIL_PASSWORD="CRM2025!Email#Studio"
FRONTEND_URL="http://localhost:5173"
```

### Configurazione SMTP Hostinger
- **Host**: smtp.hostinger.com
- **Port**: 587
- **Security**: TLS
- **Username**: noreply@studiomismo.it
- **Password**: CRM2025!Email#Studio

### Test Email
Per testare la configurazione email:
```bash
cd backend
npx ts-node src/scripts/test-email.ts
```

---

## 🔧 File Principali

### Backend
```
backend/
├── src/
│   ├── controllers/
│   │   └── notification.controller.ts    # CRUD notifiche
│   ├── routes/
│   │   └── notification.routes.ts        # API routes
│   ├── services/
│   │   ├── email.service.ts              # Invio email (nodemailer)
│   │   └── reminder.service.ts           # Processing promemoria
│   └── scripts/
│       ├── process-reminders.ts          # Script background (cron)
│       └── test-email.ts                 # Test configurazione email
└── prisma/
    └── schema.prisma                     # Schema database
```

### Frontend
```
vite-version/src/
├── app/
│   ├── calendar/components/
│   │   └── event-form.tsx                # Form evento con promemoria
│   └── settings/notifications/
│       └── page.tsx                      # Pagina impostazioni
├── components/
│   └── nav-notifications.tsx             # Centro notifiche sidebar
└── lib/
    └── notifications-api.ts              # Client API TypeScript
```

---

## 🧪 Come Testare

### 1. Testare Centro Notifiche
1. Avvia backend e frontend
2. Login nell'applicazione
3. Click sull'icona campanella nella sidebar
4. Verifica che si apra il pannello notifiche

### 2. Testare Promemoria Evento
1. Vai su Calendar
2. Crea un nuovo evento con data/ora futura (es. tra 20 minuti)
3. Abilita "Promemoria" e seleziona "15 minuti prima"
4. Abilita "Invia anche via email"
5. Salva l'evento
6. Avvia lo script promemoria
7. Dopo 5 minuti (20 - 15), riceverai:
   - Notifica nel centro notifiche
   - Email all'indirizzo dell'utente

### 3. Testare Impostazioni
1. Vai su `/settings/notifications`
2. Modifica le preferenze
3. Click "Salva Preferenze"
4. Verifica toast di successo
5. Ricarica la pagina e verifica che le preferenze siano salvate

### 4. Testare Email
```bash
# Test configurazione SMTP
cd backend
npx ts-node src/scripts/test-email.ts

# Controlla l'email su davide@mismostudio.com
```

---

## 🐛 Troubleshooting

### Email non vengono inviate
1. Verifica password in `.env`: `MAIL_PASSWORD="CRM2025!Email#Studio"`
2. Testa configurazione: `npx ts-node src/scripts/test-email.ts`
3. Controlla logs del backend per errori SMTP
4. Verifica che lo script promemoria sia in esecuzione

### Notifiche non appaiono
1. Verifica che il backend sia in esecuzione
2. Apri DevTools → Network e controlla chiamate a `/api/notifications`
3. Verifica token JWT valido
4. Controlla preferenze utente (centro notifiche abilitato)

### Promemoria non vengono inviati
1. Verifica che lo script `process-reminders.ts` sia in esecuzione
2. Controlla logs dello script per errori
3. Verifica che `scheduled_at` sia nel passato:
   ```sql
   SELECT * FROM event_reminders WHERE scheduled_at <= datetime('now');
   ```
4. Controlla preferenze utente per tipo di notifica

### Errori di compilazione TypeScript
Gli errori negli script di migrazione legacy (con 'LEAD') non bloccano il sistema:
- `src/scripts/check-leads.ts`
- `src/scripts/delete-all-leads.ts`
- `src/scripts/import-*.ts`

Questi script non vengono usati dal sistema in produzione.

---

## 📊 Metriche e Monitoraggio

### Logs Backend
Il backend logga automaticamente:
- Email inviate con successo
- Errori nell'invio email
- Promemoria processati
- Errori nel processing promemoria

### Query Utili

**Conteggio notifiche per utente**:
```sql
SELECT user_id, COUNT(*) as total, SUM(CASE WHEN is_read = 0 THEN 1 ELSE 0 END) as unread
FROM notifications
GROUP BY user_id;
```

**Promemoria pending**:
```sql
SELECT COUNT(*) FROM event_reminders
WHERE scheduled_at <= datetime('now')
AND (
  (send_email = 1 AND email_sent = 0) OR
  (send_browser = 1 AND browser_sent = 0)
);
```

**Preferenze utenti**:
```sql
SELECT
  user_id,
  email_enabled,
  browser_enabled,
  center_enabled,
  default_reminder_enabled
FROM notification_preferences;
```

---

## 🚀 Deployment in Produzione

### 1. Variabili d'Ambiente
Crea `.env.production`:
```env
DATABASE_URL="postgresql://..."
JWT_SECRET="<random-secret-molto-lungo>"
MAIL_PASSWORD="CRM2025!Email#Studio"
FRONTEND_URL="https://portale.studiomismo.it"
NODE_ENV="production"
```

### 2. Script Promemoria
Configura come servizio systemd o cron job per eseguire continuamente:

**Cron (ogni minuto)**:
```bash
* * * * * cd /path/to/backend && npx ts-node src/scripts/process-reminders.ts
```

**PM2 (raccomandato)**:
```bash
pm2 start "npx ts-node src/scripts/process-reminders.ts" --name "crm-reminders"
pm2 save
pm2 startup
```

### 3. Build Frontend
```bash
cd vite-version
npm run build
# Deploy cartella dist/ su hosting
```

---

## 📝 Note Importanti

1. **Password Email**: Già configurata nel `.env`, non modificare
2. **Polling Frontend**: Ogni 30 secondi (configurabile in `nav-notifications.tsx:74`)
3. **Processing Promemoria**: Ogni 60 secondi (configurabile in `process-reminders.ts:4`)
4. **Limite Notifiche**: Mostra le 50 più recenti (configurabile in `notification.controller.ts`)
5. **Timezone**: Europe/Rome (configurato in Prisma)
6. **Web Push**: Non implementato (richiede VAPID keys e service worker)

---

## ✨ Funzionalità Future

- [ ] Web Push API per notifiche browser native
- [ ] Notifiche in-app con toast
- [ ] Suoni notifiche personalizzabili
- [ ] Digest email giornaliero
- [ ] Notifiche Telegram/WhatsApp
- [ ] Analytics notifiche (tasso apertura, click, etc.)
- [ ] Snooze notifiche
- [ ] Raggruppamento notifiche simili

---

## 🎉 Sistema Pronto!

Il sistema di notifiche è **completamente funzionante** e pronto per l'uso in produzione!

**Testato e verificato**:
- ✅ Invio email SMTP Hostinger
- ✅ API backend funzionanti
- ✅ Centro notifiche UI
- ✅ Pagina impostazioni
- ✅ Processing promemoria

**Per supporto**: Consulta questo documento o controlla i logs del backend.
