# PIANO IMPLEMENTAZIONE MODULO CLIENTI - CRM

## INDICE
1. [Panoramica Generale](#panoramica-generale)
2. [Architettura Sistema](#architettura-sistema)
3. [Database Schema](#database-schema)
4. [Backend API](#backend-api)
5. [Frontend Components](#frontend-components)
6. [Flussi di Lavoro](#flussi-di-lavoro)
7. [Miglioramenti vs Sistema Attuale](#miglioramenti)
8. [Timeline Implementazione](#timeline)

---

## PANORAMICA GENERALE

### Sistema Attuale (PHP)
- **Tech Stack**: PHP nativo + MySQL
- **Architettura**: Monolitica con pattern MVC informale
- **Auth**: Session-based PHP
- **Frontend**: HTML/CSS/JS vanilla con AJAX

### Nuovo Sistema (TypeScript)
- **Backend**: Node.js + Express + TypeScript
- **Database**: SQLite (Turso) + Prisma ORM
- **Frontend**: React + TypeScript + shadcn/ui
- **Auth**: JWT con ruoli multi-livello (SUPER_ADMIN, ADMIN, USER, CLIENT)
- **State Management**: Zustand
- **API**: RESTful con validation (Zod)

### Funzionalità Principali da Implementare

#### 1. PREVENTIVI (Quotes)
- ✅ Creazione preventivi da admin con selezione cliente
- ✅ Preventivi multipli per cliente
- ✅ Pacchetti bespoke configurabili
- ✅ Sconti per modalità pagamento (1, 2, 3, 4 rate)
- ✅ Stati: draft, sent, viewed, accepted, rejected, expired
- ✅ Visualizzazione e accettazione/rifiuto da parte cliente
- ✅ Tracking visualizzazioni e azioni

#### 2. ACCESSI CLIENTI (Client Access)
- ✅ Due tipi di accesso:
  - **Tipo "preventivo"**: accesso limitato solo a visualizzare preventivo
  - **Tipo "cliente"**: accesso completo alla dashboard cliente
- ✅ Registrazione su invito (no self-service)
- ✅ Attivazione account via token email
- ✅ Storico accessi completo
- ✅ Blocco accessi (manuale admin + automatico tentativi falliti)

#### 3. DASHBOARD CLIENTE
- ✅ Preventivi accettati e storico
- ✅ Download fatture in autonomia
- ✅ Gestione ticket assistenza con chat
- ✅ Accesso a file e documenti condivisi
- ✅ Notifiche in tempo reale
- ✅ Ore supporto (consumate/disponibili)

#### 4. TICKET ASSISTENZA
- ✅ Creazione ticket con categorie (tecnico, design, contenuti, fatturazione, altro)
- ✅ Priorità (bassa, normale, alta, urgente)
- ✅ Stati (aperto, in_lavorazione, in_attesa_cliente, risolto, chiuso)
- ✅ Chat bidirezionale cliente ↔ admin
- ✅ Note interne admin (non visibili al cliente)
- ✅ Tracking ore lavorate
- ✅ Allegati messaggi (da implementare)
- ✅ Notifiche email + in-app

#### 5. GESTIONE FILE
- ✅ Upload file da admin per clienti
- ✅ Categorie: documenti, immagini, contratti, asset, fatture
- ✅ Download protetto (solo file del proprio account)
- ✅ Integrazione Google Drive (link condivisi)

---

## ARCHITETTURA SISTEMA

### Stack Tecnologico

#### Backend
```
/backend/
├── src/
│   ├── controllers/
│   │   ├── quote.controller.ts         # Gestione preventivi
│   │   ├── clientAccess.controller.ts  # Gestione accessi clienti
│   │   ├── ticket.controller.ts        # Gestione ticket
│   │   └── clientFiles.controller.ts   # Gestione file clienti
│   ├── routes/
│   │   ├── quotes.ts
│   │   ├── clientAccess.ts
│   │   ├── tickets.ts
│   │   └── clientFiles.ts
│   ├── middleware/
│   │   ├── auth.ts                     # JWT auth esistente
│   │   ├── clientAuth.ts               # Auth specifica per clienti
│   │   └── permissions.ts              # Controllo permessi
│   ├── services/
│   │   ├── email.service.ts            # Invio email (Nodemailer)
│   │   ├── pdf.service.ts              # Generazione PDF (Puppeteer/PDFKit)
│   │   ├── notification.service.ts     # Sistema notifiche
│   │   └── activityLog.service.ts      # Logging attività
│   └── utils/
│       ├── tokenGenerator.ts           # Token attivazione
│       └── validators.ts               # Validazioni Zod
└── prisma/
    └── schema.prisma                    # Schema database aggiornato
```

#### Frontend
```
/vite-version/src/
├── app/
│   ├── clients/                        # NUOVO modulo clienti
│   │   ├── page.tsx                   # Lista clienti (admin)
│   │   ├── components/
│   │   │   ├── client-list.tsx
│   │   │   ├── create-client-modal.tsx
│   │   │   ├── client-detail.tsx
│   │   │   └── access-history.tsx
│   ├── quotes/                         # NUOVO modulo preventivi
│   │   ├── page.tsx                   # Lista preventivi (admin)
│   │   ├── create/page.tsx            # Crea preventivo
│   │   ├── [id]/page.tsx              # Dettaglio preventivo
│   │   ├── components/
│   │   │   ├── quote-form.tsx
│   │   │   ├── package-configurator.tsx
│   │   │   ├── payment-options.tsx
│   │   │   └── quote-preview.tsx
│   ├── client-portal/                  # NUOVO portale cliente
│   │   ├── dashboard/page.tsx         # Dashboard cliente
│   │   ├── quote/[id]/page.tsx        # Visualizza preventivo
│   │   ├── tickets/page.tsx           # Ticket assistenza
│   │   ├── files/page.tsx             # File e documenti
│   │   ├── invoices/page.tsx          # Fatture
│   │   ├── components/
│   │   │   ├── quote-viewer.tsx
│   │   │   ├── ticket-chat.tsx
│   │   │   ├── support-hours-widget.tsx
│   │   │   └── file-browser.tsx
│   └── tickets/                        # NUOVO modulo ticket (admin)
│       ├── page.tsx                   # Lista ticket
│       ├── [id]/page.tsx              # Dettaglio ticket
│       └── components/
│           ├── ticket-list.tsx
│           ├── ticket-detail.tsx
│           ├── chat-interface.tsx
│           └── ticket-filters.tsx
├── lib/
│   ├── quotes-api.ts                  # API client preventivi
│   ├── clients-api.ts                 # API client accessi
│   ├── tickets-api.ts                 # API client ticket
│   └── notifications-api.ts           # API notifiche
└── components/
    └── client-portal/                  # Componenti riutilizzabili
        ├── client-header.tsx
        ├── notification-bell.tsx
        └── support-widget.tsx
```

### Autenticazione Multi-Ruolo

#### Ruoli Esistenti (già implementati)
- `SUPER_ADMIN`: accesso completo
- `ADMIN`: accesso moduli consentiti
- `USER`: accesso limitato

#### Nuovo Ruolo: CLIENT
```typescript
enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  USER = 'USER',
  CLIENT = 'CLIENT'  // NUOVO
}
```

#### Client Access Types
```typescript
enum ClientAccessType {
  QUOTE_ONLY = 'QUOTE_ONLY',     // Solo visualizzazione preventivo
  FULL_PORTAL = 'FULL_PORTAL'    // Dashboard completa
}
```

#### JWT Token Payload
```typescript
interface JWTPayload {
  userId: number
  email: string
  role: UserRole

  // Campi specifici per CLIENT
  clientAccessId?: number        // ID nella tabella client_access
  accessType?: ClientAccessType  // Tipo accesso cliente
  contactId?: number             // ID del contatto associato
}
```

---

## DATABASE SCHEMA

### Schema Prisma Completo

```prisma
// ==========================================
// MODULO CLIENTI - PREVENTIVI E ACCESSI
// ==========================================

// Preventivi
model Quote {
  id                    Int       @id @default(autoincrement())
  quoteNumber           String    @unique @map("quote_number")

  // Relazioni
  clientAccessId        Int?      @map("client_access_id")
  clientAccess          ClientAccess? @relation(fields: [clientAccessId], references: [id])
  contactId             Int       @map("contact_id")
  contact               Contact   @relation(fields: [contactId], references: [id])

  // Contenuto
  title                 String
  description           String?   @db.Text
  projectType           String?   @map("project_type")
  projectTypeCustom     String?   @map("project_type_custom")
  objectives            Json?     // [{title, description}]
  bespokeOptions        Json?     @map("bespoke_options") // [{id, title, features[], price}]

  // Prezzi
  subtotal              Decimal   @db.Decimal(10, 2)
  discountPercentage    Decimal   @default(0) @map("discount_percentage") @db.Decimal(5, 2)
  discountAmount        Decimal   @default(0) @map("discount_amount") @db.Decimal(10, 2)
  taxRate               Decimal   @default(22) @map("tax_rate") @db.Decimal(5, 2)
  total                 Decimal   @db.Decimal(10, 2)

  // Sconti pagamento
  enablePaymentDiscount Boolean   @default(false) @map("enable_payment_discount")
  oneTimeDiscount       Decimal   @default(0) @map("one_time_discount") @db.Decimal(5, 2)
  payment2Discount      Decimal   @default(0) @map("payment_2_discount") @db.Decimal(5, 2)
  payment3Discount      Decimal   @default(0) @map("payment_3_discount") @db.Decimal(5, 2)
  payment4Discount      Decimal   @default(0) @map("payment_4_discount") @db.Decimal(5, 2)

  // Selezioni cliente
  selectedPackageId     Int?      @map("selected_package_id")
  selectedPaymentOption String?   @map("selected_payment_option") // 'one_time', 'payment_2', 'payment_3', 'payment_4'

  // Validità
  validUntil            DateTime  @map("valid_until")
  termsConditions       String?   @map("terms_conditions") @db.Text
  notes                 String?   @db.Text

  // Stati e tracking
  status                QuoteStatus @default(DRAFT)
  createdAt             DateTime  @default(now()) @map("created_at")
  updatedAt             DateTime  @updatedAt @map("updated_at")
  viewedAt              DateTime? @map("viewed_at")
  acceptedDate          DateTime? @map("accepted_date")
  rejectedDate          DateTime? @map("rejected_date")
  rejectionReason       String?   @map("rejection_reason") @db.Text

  createdById           Int       @map("created_by")
  createdBy             User      @relation(fields: [createdById], references: [id])

  @@map("quotes")
  @@index([clientAccessId])
  @@index([contactId])
  @@index([status])
  @@index([validUntil])
}

enum QuoteStatus {
  DRAFT
  SENT
  VIEWED
  ACCEPTED
  REJECTED
  CANCELLED
  EXPIRED
}

// Accessi Clienti
model ClientAccess {
  id                    Int       @id @default(autoincrement())

  // Relazione contatto
  contactId             Int       @map("contact_id")
  contact               Contact   @relation(fields: [contactId], references: [id], onDelete: Cascade)

  // Credenziali
  username              String    @unique
  passwordHash          String?   @map("password_hash")
  accessType            ClientAccessType @default(QUOTE_ONLY) @map("access_type")

  // Dettagli progetto (per tipo FULL_PORTAL)
  driveFolderLink       String?   @map("drive_folder_link")
  documentsFolder       String?   @map("documents_folder")
  assetsFolder          String?   @map("assets_folder")
  invoiceFolder         String?   @map("invoice_folder")
  bespokeDetails        String?   @map("bespoke_details") @db.Text
  projectName           String?   @map("project_name")
  projectDescription    String?   @map("project_description") @db.Text
  projectBudget         Decimal?  @map("project_budget") @db.Decimal(10, 2)
  projectStartDate      DateTime? @map("project_start_date")
  projectEndDate        DateTime? @map("project_end_date")

  // Supporto
  monthlyFee            Decimal?  @map("monthly_fee") @db.Decimal(10, 2)
  supportHoursIncluded  Int       @default(0) @map("support_hours_included") // 0 = illimitato
  supportHoursUsed      Decimal   @default(0) @map("support_hours_used") @db.Decimal(5, 2)

  // Attivazione
  isActive              Boolean   @default(true) @map("is_active")
  emailVerified         Boolean   @default(false) @map("email_verified")
  activationToken       String?   @unique @map("activation_token")
  activationExpires     DateTime? @map("activation_expires")
  resetToken            String?   @unique @map("reset_token")
  resetTokenExpires     DateTime? @map("reset_token_expires")

  // Sicurezza
  loginAttempts         Int       @default(0) @map("login_attempts")
  lockedUntil           DateTime? @map("locked_until")
  lastLogin             DateTime? @map("last_login")

  // Tracking
  createdAt             DateTime  @default(now()) @map("created_at")
  updatedAt             DateTime  @updatedAt @map("updated_at")
  createdById           Int?      @map("created_by")
  createdBy             User?     @relation(fields: [createdById], references: [id])

  // Relazioni
  quotes                Quote[]
  tickets               Ticket[]
  files                 ClientFile[]
  notifications         ClientNotification[]
  activityLogs          ClientActivityLog[]

  @@map("client_access")
  @@index([contactId])
  @@index([accessType])
  @@index([isActive])
  @@index([activationToken])
}

enum ClientAccessType {
  QUOTE_ONLY      // Solo visualizzazione preventivo
  FULL_PORTAL     // Dashboard completa
}

// ==========================================
// MODULO TICKET ASSISTENZA
// ==========================================

model Ticket {
  id                    Int       @id @default(autoincrement())
  ticketNumber          String    @unique @map("ticket_number")

  // Cliente
  clientAccessId        Int       @map("client_access_id")
  clientAccess          ClientAccess @relation(fields: [clientAccessId], references: [id], onDelete: Cascade)
  contactId             Int       @map("contact_id")
  contact               Contact   @relation(fields: [contactId], references: [id])

  // Contenuto
  supportType           SupportType @map("support_type")
  subject               String
  description           String    @db.Text

  // Status e priorità
  priority              TicketPriority @default(NORMAL)
  status                TicketStatus @default(OPEN)

  // Assegnazione
  assignedToId          Int?      @map("assigned_to")
  assignedTo            User?     @relation(fields: [assignedToId], references: [id])
  assignedAt            DateTime? @map("assigned_at")

  // Tracking tempo
  estimatedHours        Decimal   @default(0) @map("estimated_hours") @db.Decimal(5, 2)
  actualHours           Decimal   @default(0) @map("actual_hours") @db.Decimal(5, 2)

  // Date
  createdAt             DateTime  @default(now()) @map("created_at")
  updatedAt             DateTime  @updatedAt @map("updated_at")
  resolvedAt            DateTime? @map("resolved_at")
  closedAt              DateTime? @map("closed_at")

  // Relazioni
  messages              TicketMessage[]
  activityLogs          TicketActivityLog[]

  @@map("tickets")
  @@index([clientAccessId])
  @@index([contactId])
  @@index([status])
  @@index([priority])
  @@index([assignedToId])
  @@index([createdAt])
}

enum SupportType {
  TECNICO
  DESIGN
  CONTENUTI
  FATTURAZIONE
  ALTRO
}

enum TicketPriority {
  BASSA
  NORMALE
  ALTA
  URGENTE
}

enum TicketStatus {
  OPEN               // Aperto
  IN_PROGRESS        // In lavorazione
  WAITING_CLIENT     // In attesa cliente
  RESOLVED           // Risolto
  CLOSED             // Chiuso
}

model TicketMessage {
  id                    Int       @id @default(autoincrement())
  ticketId              Int       @map("ticket_id")
  ticket                Ticket    @relation(fields: [ticketId], references: [id], onDelete: Cascade)

  // Autore (uno dei due deve essere NULL)
  clientAccessId        Int?      @map("client_access_id")
  clientAccess          ClientAccess? @relation(fields: [clientAccessId], references: [id])
  userId                Int?      @map("user_id")
  user                  User?     @relation(fields: [userId], references: [id])

  // Contenuto
  message               String    @db.Text
  isInternal            Boolean   @default(false) @map("is_internal") // Note interne admin
  attachments           Json?     // [{filename, path, size}]

  // Tracking lettura
  clientReadAt          DateTime? @map("client_read_at")
  adminReadAt           DateTime? @map("admin_read_at")

  createdAt             DateTime  @default(now()) @map("created_at")

  @@map("ticket_messages")
  @@index([ticketId])
  @@index([createdAt])
}

model TicketActivityLog {
  id                    Int       @id @default(autoincrement())
  ticketId              Int       @map("ticket_id")
  ticket                Ticket    @relation(fields: [ticketId], references: [id], onDelete: Cascade)

  // Autore
  clientAccessId        Int?      @map("client_access_id")
  userId                Int?      @map("user_id")

  // Azione
  action                String    // 'ticket_created', 'status_changed', 'assigned', etc.
  details               String?   @db.Text

  createdAt             DateTime  @default(now()) @map("created_at")

  @@map("ticket_activity_logs")
  @@index([ticketId])
  @@index([action])
}

// ==========================================
// GESTIONE FILE CLIENTI
// ==========================================

model ClientFile {
  id                    Int       @id @default(autoincrement())
  clientAccessId        Int       @map("client_access_id")
  clientAccess          ClientAccess @relation(fields: [clientAccessId], references: [id], onDelete: Cascade)

  // File info
  filename              String
  originalFilename      String    @map("original_filename")
  filePath              String    @map("file_path")
  fileSize              Int       @map("file_size")
  mimeType              String?   @map("mime_type")

  // Categorizzazione
  category              FileCategory @default(DOCUMENT)
  folder                String?

  // Metadata
  title                 String?
  description           String?   @db.Text
  tags                  Json?     // ['tag1', 'tag2']

  // Visibilità
  isPublic              Boolean   @default(false) @map("is_public")
  sharedWith            Json?     @map("shared_with") // [clientId1, clientId2]

  // Tracking
  uploadedById          Int?      @map("uploaded_by")
  uploadedBy            User?     @relation(fields: [uploadedById], references: [id])
  createdAt             DateTime  @default(now()) @map("created_at")
  updatedAt             DateTime  @updatedAt @map("updated_at")

  @@map("client_files")
  @@index([clientAccessId])
  @@index([category])
  @@index([isPublic])
}

enum FileCategory {
  DOCUMENT
  IMAGE
  INVOICE
  CONTRACT
  ASSET
  OTHER
}

// ==========================================
// NOTIFICHE E LOGGING
// ==========================================

model ClientNotification {
  id                    Int       @id @default(autoincrement())
  clientAccessId        Int       @map("client_access_id")
  clientAccess          ClientAccess @relation(fields: [clientAccessId], references: [id], onDelete: Cascade)

  // Contenuto
  type                  NotificationType
  title                 String
  message               String    @db.Text

  // Riferimento
  relatedType           String?   @map("related_type") // 'quote', 'ticket', 'invoice', etc.
  relatedId             Int?      @map("related_id")

  // Status
  isRead                Boolean   @default(false) @map("is_read")
  readAt                DateTime? @map("read_at")

  createdAt             DateTime  @default(now()) @map("created_at")

  @@map("client_notifications")
  @@index([clientAccessId])
  @@index([isRead])
  @@index([createdAt])
}

enum NotificationType {
  QUOTE
  INVOICE
  TICKET
  TASK
  INFO
}

model ClientActivityLog {
  id                    Int       @id @default(autoincrement())
  clientAccessId        Int       @map("client_access_id")
  clientAccess          ClientAccess @relation(fields: [clientAccessId], references: [id], onDelete: Cascade)

  username              String
  action                String    // 'login', 'view_quote', 'accept_quote', 'download_invoice', etc.
  ipAddress             String?   @map("ip_address")
  userAgent             String?   @map("user_agent") @db.Text
  deviceInfo            String?   @map("device_info")
  details               String?   @db.Text

  createdAt             DateTime  @default(now()) @map("created_at")

  @@map("client_activity_logs")
  @@index([clientAccessId])
  @@index([action])
  @@index([createdAt])
}

// ==========================================
// AGGIORNAMENTI MODELLI ESISTENTI
// ==========================================

// Aggiungere al modello Contact esistente:
model Contact {
  // ... campi esistenti ...

  // Nuove relazioni
  clientAccess          ClientAccess[]
  quotes                Quote[]
  tickets               Ticket[]
}

// Aggiungere al modello User esistente:
model User {
  // ... campi esistenti ...

  // Nuove relazioni
  quotesCreated         Quote[]
  clientAccessCreated   ClientAccess[]
  ticketsAssigned       Ticket[]
  ticketMessages        TicketMessage[]
  filesUploaded         ClientFile[]
}

// Aggiungere al modello Invoice esistente (se esiste):
model Invoice {
  // ... campi esistenti ...

  // Nuova relazione opzionale
  quoteId               Int?      @map("quote_id")
  quote                 Quote?    @relation(fields: [quoteId], references: [id])
}
```

---

## BACKEND API

### Endpoints da Implementare

#### 1. PREVENTIVI (Quotes)

```typescript
// routes/quotes.ts

// Admin endpoints
POST   /api/quotes                      // Crea preventivo
GET    /api/quotes                      // Lista preventivi
GET    /api/quotes/:id                  // Dettaglio preventivo
PUT    /api/quotes/:id                  // Aggiorna preventivo
DELETE /api/quotes/:id                  // Elimina preventivo
POST   /api/quotes/:id/send             // Invia preventivo a cliente
GET    /api/quotes/:id/preview          // Anteprima preventivo

// Client endpoints
GET    /api/client/quote                // Ottieni preventivo associato (QUOTE_ONLY)
POST   /api/client/quote/select-package // Seleziona pacchetto
POST   /api/client/quote/select-payment // Seleziona modalità pagamento
POST   /api/client/quote/accept         // Accetta preventivo
POST   /api/client/quote/reject         // Rifiuta preventivo
```

**Controller Example**:
```typescript
// controllers/quote.controller.ts

export const createQuote = async (req: Request, res: Response) => {
  try {
    const {
      contactId,
      title,
      description,
      bespokeOptions,
      subtotal,
      taxRate,
      validUntil,
      // ... altri campi
    } = req.body;

    // Genera numero preventivo
    const year = new Date().getFullYear();
    const count = await prisma.quote.count({
      where: {
        createdAt: {
          gte: new Date(`${year}-01-01`),
          lt: new Date(`${year + 1}-01-01`)
        }
      }
    });
    const quoteNumber = `Q-${year}-${String(count + 1).padStart(4, '0')}`;

    // Calcola totale
    const discountAmount = (subtotal * discountPercentage) / 100;
    const subtotalAfterDiscount = subtotal - discountAmount;
    const taxAmount = (subtotalAfterDiscount * taxRate) / 100;
    const total = subtotalAfterDiscount + taxAmount;

    const quote = await prisma.quote.create({
      data: {
        quoteNumber,
        contactId,
        title,
        description,
        bespokeOptions,
        subtotal,
        discountPercentage,
        discountAmount,
        taxRate,
        total,
        validUntil: new Date(validUntil),
        status: 'DRAFT',
        createdById: req.user.userId
      },
      include: {
        contact: true,
        createdBy: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    res.json({
      success: true,
      message: 'Preventivo creato con successo',
      data: quote
    });
  } catch (error) {
    console.error('Errore creazione preventivo:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante la creazione del preventivo'
    });
  }
};

export const sendQuoteToClient = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { createClientAccess } = req.body;

    const quote = await prisma.quote.findUnique({
      where: { id: parseInt(id) },
      include: { contact: true }
    });

    if (!quote) {
      return res.status(404).json({
        success: false,
        message: 'Preventivo non trovato'
      });
    }

    let clientAccess;

    if (createClientAccess) {
      // Genera username
      const username = generateUsername(quote.contact.name);

      // Genera token attivazione
      const activationToken = generateSecureToken();
      const activationExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 giorni

      // Crea accesso cliente
      clientAccess = await prisma.clientAccess.create({
        data: {
          contactId: quote.contactId,
          username,
          accessType: 'QUOTE_ONLY',
          activationToken,
          activationExpires,
          createdById: req.user.userId
        }
      });

      // Aggiorna preventivo con link accesso
      await prisma.quote.update({
        where: { id: quote.id },
        data: {
          clientAccessId: clientAccess.id,
          status: 'SENT'
        }
      });

      // Invia email attivazione
      const activationLink = `${process.env.FRONTEND_URL}/client-activation?token=${activationToken}`;
      await sendQuoteActivationEmail(quote.contact.email, {
        quoteNumber: quote.quoteNumber,
        contactName: quote.contact.name,
        activationLink,
        expiresIn: '7 giorni'
      });
    } else {
      // Aggiorna solo status
      await prisma.quote.update({
        where: { id: quote.id },
        data: { status: 'SENT' }
      });
    }

    res.json({
      success: true,
      message: 'Preventivo inviato con successo',
      data: { quote, clientAccess }
    });
  } catch (error) {
    console.error('Errore invio preventivo:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante l\'invio del preventivo'
    });
  }
};
```

#### 2. ACCESSI CLIENTI (Client Access)

```typescript
// routes/clientAccess.ts

// Admin endpoints
POST   /api/client-access                    // Crea accesso cliente
GET    /api/client-access                    // Lista accessi clienti
GET    /api/client-access/:id                // Dettaglio accesso
PUT    /api/client-access/:id                // Aggiorna accesso
DELETE /api/client-access/:id                // Elimina accesso
POST   /api/client-access/:id/block          // Blocca accesso
POST   /api/client-access/:id/unblock        // Sblocca accesso
GET    /api/client-access/:id/activity       // Storico attività
POST   /api/client-access/:id/resend-activation // Reinvia email attivazione

// Auth endpoints
POST   /api/client/activate                  // Attiva account (imposta password)
POST   /api/client/login                     // Login cliente
POST   /api/client/forgot-password           // Richiedi reset password
POST   /api/client/reset-password            // Reset password con token
POST   /api/client/logout                    // Logout

// Client endpoints
GET    /api/client/me                        // Info cliente loggato
PUT    /api/client/me                        // Aggiorna profilo
```

**Controller Example**:
```typescript
// controllers/clientAccess.controller.ts

export const activateAccount = async (req: Request, res: Response) => {
  try {
    const { token, password } = req.body;

    // Trova accesso con token valido
    const clientAccess = await prisma.clientAccess.findUnique({
      where: { activationToken: token },
      include: { contact: true }
    });

    if (!clientAccess) {
      return res.status(404).json({
        success: false,
        message: 'Token di attivazione non valido'
      });
    }

    // Verifica scadenza
    if (new Date() > clientAccess.activationExpires!) {
      return res.status(400).json({
        success: false,
        message: 'Token di attivazione scaduto. Richiedi un nuovo link.'
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Aggiorna account
    const updated = await prisma.clientAccess.update({
      where: { id: clientAccess.id },
      data: {
        passwordHash,
        emailVerified: true,
        activationToken: null,
        activationExpires: null,
        isActive: true
      }
    });

    // Log attività
    await logClientActivity(clientAccess.id, clientAccess.username, 'account_activated', req);

    res.json({
      success: true,
      message: 'Account attivato con successo. Puoi effettuare il login.',
      data: {
        username: updated.username,
        accessType: updated.accessType
      }
    });
  } catch (error) {
    console.error('Errore attivazione account:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante l\'attivazione dell\'account'
    });
  }
};

export const clientLogin = async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    // Trova cliente
    const clientAccess = await prisma.clientAccess.findUnique({
      where: { username },
      include: { contact: true }
    });

    if (!clientAccess) {
      return res.status(401).json({
        success: false,
        message: 'Credenziali non valide'
      });
    }

    // Verifica blocco temporaneo
    if (clientAccess.lockedUntil && new Date() < clientAccess.lockedUntil) {
      const minutesLeft = Math.ceil((clientAccess.lockedUntil.getTime() - Date.now()) / 60000);
      return res.status(403).json({
        success: false,
        message: `Account bloccato per troppi tentativi. Riprova tra ${minutesLeft} minuti.`
      });
    }

    // Verifica account attivo
    if (!clientAccess.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account disabilitato. Contatta l\'amministratore.'
      });
    }

    // Verifica password
    const isValidPassword = await bcrypt.compare(password, clientAccess.passwordHash!);

    if (!isValidPassword) {
      // Incrementa tentativi falliti
      const newAttempts = clientAccess.loginAttempts + 1;
      const updateData: any = { loginAttempts: newAttempts };

      // Blocco dopo 5 tentativi
      if (newAttempts >= 5) {
        updateData.lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minuti
      }

      await prisma.clientAccess.update({
        where: { id: clientAccess.id },
        data: updateData
      });

      await logClientActivity(clientAccess.id, username, 'login_failed', req);

      return res.status(401).json({
        success: false,
        message: 'Credenziali non valide'
      });
    }

    // Login riuscito: reset tentativi
    await prisma.clientAccess.update({
      where: { id: clientAccess.id },
      data: {
        loginAttempts: 0,
        lockedUntil: null,
        lastLogin: new Date()
      }
    });

    // Genera JWT
    const token = jwt.sign(
      {
        userId: clientAccess.id,
        email: clientAccess.contact.email,
        role: 'CLIENT',
        clientAccessId: clientAccess.id,
        accessType: clientAccess.accessType,
        contactId: clientAccess.contactId
      },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    // Log login
    await logClientActivity(clientAccess.id, username, 'login_success', req);

    res.json({
      success: true,
      message: 'Login effettuato con successo',
      data: {
        token,
        user: {
          id: clientAccess.id,
          username: clientAccess.username,
          accessType: clientAccess.accessType,
          contact: {
            name: clientAccess.contact.name,
            email: clientAccess.contact.email
          }
        }
      }
    });
  } catch (error) {
    console.error('Errore login cliente:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante il login'
    });
  }
};
```

#### 3. TICKET ASSISTENZA

```typescript
// routes/tickets.ts

// Admin endpoints
GET    /api/tickets                      // Lista tutti i ticket
GET    /api/tickets/:id                  // Dettaglio ticket
PUT    /api/tickets/:id                  // Aggiorna ticket (status, assegnazione, etc.)
POST   /api/tickets/:id/assign           // Assegna ticket a admin
POST   /api/tickets/:id/messages         // Invia messaggio (admin)
POST   /api/tickets/:id/internal-note    // Aggiungi nota interna
PUT    /api/tickets/:id/hours            // Aggiorna ore lavorate

// Client endpoints
POST   /api/client/tickets               // Crea nuovo ticket
GET    /api/client/tickets               // Lista ticket del cliente
GET    /api/client/tickets/:id           // Dettaglio ticket
POST   /api/client/tickets/:id/messages  // Invia messaggio
PUT    /api/client/tickets/:id/read      // Marca messaggi come letti
```

**Controller Example**:
```typescript
// controllers/ticket.controller.ts

export const createTicket = async (req: Request, res: Response) => {
  try {
    const {
      supportType,
      subject,
      description,
      priority = 'NORMALE'
    } = req.body;

    const clientAccessId = req.user.clientAccessId; // Da JWT
    const contactId = req.user.contactId;

    // Verifica ore supporto disponibili
    const clientAccess = await prisma.clientAccess.findUnique({
      where: { id: clientAccessId }
    });

    if (clientAccess!.supportHoursIncluded > 0) {
      if (clientAccess!.supportHoursUsed >= clientAccess!.supportHoursIncluded) {
        return res.status(403).json({
          success: false,
          message: 'Hai esaurito le ore di supporto incluse. Contatta l\'amministratore per acquistare ore aggiuntive.'
        });
      }
    }

    // Genera numero ticket
    const year = new Date().getFullYear();
    const count = await prisma.ticket.count({
      where: {
        createdAt: {
          gte: new Date(`${year}-01-01`)
        }
      }
    });
    const ticketNumber = `T${year}-${String(count + 1).padStart(4, '0')}`;

    // Crea ticket
    const ticket = await prisma.ticket.create({
      data: {
        ticketNumber,
        clientAccessId,
        contactId,
        supportType,
        subject,
        description,
        priority,
        status: 'OPEN'
      },
      include: {
        contact: true,
        clientAccess: {
          include: {
            contact: true
          }
        }
      }
    });

    // Crea messaggio iniziale
    await prisma.ticketMessage.create({
      data: {
        ticketId: ticket.id,
        clientAccessId,
        message: description,
        isInternal: false
      }
    });

    // Log attività
    await logClientActivity(clientAccessId, clientAccess!.username, 'create_ticket', req,
      `Creato ticket ${ticketNumber}`);

    // Notifica admin
    await notifyAdminsNewTicket(ticket);

    res.json({
      success: true,
      message: 'Ticket creato con successo. Riceverai una risposta al più presto.',
      data: ticket
    });
  } catch (error) {
    console.error('Errore creazione ticket:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante la creazione del ticket'
    });
  }
};

export const sendMessage = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { message } = req.body;
    const isClient = req.user.role === 'CLIENT';

    const ticket = await prisma.ticket.findUnique({
      where: { id: parseInt(id) },
      include: {
        clientAccess: {
          include: { contact: true }
        }
      }
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket non trovato'
      });
    }

    // Verifica permessi
    if (isClient && ticket.clientAccessId !== req.user.clientAccessId) {
      return res.status(403).json({
        success: false,
        message: 'Non hai i permessi per accedere a questo ticket'
      });
    }

    // Crea messaggio
    const ticketMessage = await prisma.ticketMessage.create({
      data: {
        ticketId: ticket.id,
        clientAccessId: isClient ? req.user.clientAccessId : null,
        userId: isClient ? null : req.user.userId,
        message,
        isInternal: false
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    });

    // Aggiorna timestamp ticket
    await prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        updatedAt: new Date()
      }
    });

    // Notifica destinatario
    if (isClient) {
      // Cliente ha risposto → notifica admin assegnato
      if (ticket.assignedToId) {
        await notifyAdminTicketMessage(ticket.assignedToId, ticket, message);
      }
    } else {
      // Admin ha risposto → notifica cliente
      await notifyClientTicketMessage(ticket.clientAccessId, ticket, message);
    }

    res.json({
      success: true,
      message: 'Messaggio inviato con successo',
      data: ticketMessage
    });
  } catch (error) {
    console.error('Errore invio messaggio:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante l\'invio del messaggio'
    });
  }
};
```

#### 4. SERVIZI COMUNI

**Email Service**:
```typescript
// services/email.service.ts
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

export async function sendQuoteActivationEmail(to: string, data: any) {
  const html = `
    <h2>Nuovo Preventivo da Studio Mismo</h2>
    <p>Ciao ${data.contactName},</p>
    <p>Abbiamo preparato un preventivo per te: <strong>${data.quoteNumber}</strong></p>
    <p>Per visualizzarlo e accettarlo, attiva il tuo account cliente:</p>
    <p>
      <a href="${data.activationLink}"
         style="display: inline-block; padding: 12px 24px; background: #0ea5e9; color: white; text-decoration: none; border-radius: 6px;">
        Attiva Account e Visualizza Preventivo
      </a>
    </p>
    <p><small>Il link scadrà tra ${data.expiresIn}.</small></p>
  `;

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject: `Nuovo Preventivo ${data.quoteNumber} - Studio Mismo`,
    html
  });
}

export async function sendTicketNotificationEmail(to: string, ticket: any) {
  // Implementa invio email per notifiche ticket
}

// ... altri metodi email
```

**PDF Service**:
```typescript
// services/pdf.service.ts
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

export async function generateQuotePDF(quote: any): Promise<string> {
  const doc = new PDFDocument({ margin: 50 });
  const filename = `Preventivo_${quote.quoteNumber}.pdf`;
  const filepath = path.join(__dirname, '../../uploads/quotes', filename);

  // Stream to file
  doc.pipe(fs.createWriteStream(filepath));

  // Header
  doc.fontSize(20).text('STUDIO MISMO', { align: 'center' });
  doc.fontSize(10).text('Via Example, 123 - Milano', { align: 'center' });
  doc.moveDown();

  // Numero preventivo
  doc.fontSize(16).text(`Preventivo N. ${quote.quoteNumber}`);
  doc.fontSize(10).text(`Data: ${new Date(quote.createdAt).toLocaleDateString('it-IT')}`);
  doc.text(`Valido fino al: ${new Date(quote.validUntil).toLocaleDateString('it-IT')}`);
  doc.moveDown();

  // Cliente
  doc.fontSize(12).text('Cliente:');
  doc.fontSize(10).text(quote.contact.name);
  if (quote.contact.partitaIva) doc.text(`P.IVA: ${quote.contact.partitaIva}`);
  if (quote.contact.address) doc.text(quote.contact.address);
  doc.moveDown();

  // Titolo progetto
  doc.fontSize(14).text(quote.title);
  doc.fontSize(10).text(quote.description || '');
  doc.moveDown();

  // Pacchetti (se presenti)
  if (quote.bespokeOptions) {
    const packages = JSON.parse(quote.bespokeOptions);
    doc.fontSize(12).text('Pacchetti Disponibili:');
    packages.forEach((pkg: any) => {
      doc.fontSize(11).text(`• ${pkg.title} - €${pkg.price}`);
      pkg.features.forEach((feat: string) => {
        doc.fontSize(9).text(`  - ${feat}`);
      });
      doc.moveDown(0.5);
    });
    doc.moveDown();
  }

  // Totali
  doc.fontSize(12).text(`Subtotale: €${quote.subtotal.toFixed(2)}`);
  if (quote.discountPercentage > 0) {
    doc.text(`Sconto (${quote.discountPercentage}%): -€${quote.discountAmount.toFixed(2)}`);
  }
  doc.text(`IVA (${quote.taxRate}%): €${((quote.total - quote.subtotal + quote.discountAmount) / (1 + quote.taxRate / 100) * (quote.taxRate / 100)).toFixed(2)}`);
  doc.fontSize(14).text(`TOTALE: €${quote.total.toFixed(2)}`);
  doc.moveDown();

  // Termini e condizioni
  if (quote.termsConditions) {
    doc.fontSize(10).text('Termini e Condizioni:', { underline: true });
    doc.fontSize(9).text(quote.termsConditions);
  }

  doc.end();

  return filepath;
}

export async function generateInvoicePDF(invoice: any): Promise<string> {
  // Implementa generazione PDF fattura (simile a preventivo)
}
```

---

## FRONTEND COMPONENTS

### 1. Dashboard Cliente

```tsx
// app/client-portal/dashboard/page.tsx

'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { clientAPI } from '@/lib/client-api'
import { QuoteCard } from '../components/quote-card'
import { TicketWidget } from '../components/ticket-widget'
import { NotificationBell } from '../components/notification-bell'
import { FileBrowser } from '../components/file-browser'

export default function ClientDashboard() {
  const [clientInfo, setClientInfo] = useState<any>(null)
  const [quotes, setQuotes] = useState<any[]>([])
  const [tickets, setTickets] = useState<any[]>([])
  const [notifications, setNotifications] = useState<any[]>([])

  useEffect(() => {
    loadDashboardData()
  }, [])

  async function loadDashboardData() {
    try {
      const [infoRes, quotesRes, ticketsRes, notifRes] = await Promise.all([
        clientAPI.getMe(),
        clientAPI.getQuotes(),
        clientAPI.getTickets({ status: ['OPEN', 'IN_PROGRESS', 'WAITING_CLIENT'] }),
        clientAPI.getNotifications({ unreadOnly: true })
      ])

      setClientInfo(infoRes.data)
      setQuotes(quotesRes.data)
      setTickets(ticketsRes.data)
      setNotifications(notifRes.data)
    } catch (error) {
      console.error('Errore caricamento dashboard:', error)
    }
  }

  if (!clientInfo) return <div>Caricamento...</div>

  const supportPercentage = clientInfo.supportHoursIncluded > 0
    ? (clientInfo.supportHoursUsed / clientInfo.supportHoursIncluded) * 100
    : 0

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Benvenuto, {clientInfo.contact.name}</h1>
          {clientInfo.projectName && (
            <p className="text-muted-foreground">Progetto: {clientInfo.projectName}</p>
          )}
        </div>
        <NotificationBell notifications={notifications} />
      </div>

      {/* Ore Supporto */}
      {clientInfo.supportHoursIncluded > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Ore Supporto</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Utilizzate: {clientInfo.supportHoursUsed}h</span>
                <span>Disponibili: {clientInfo.supportHoursIncluded - clientInfo.supportHoursUsed}h / {clientInfo.supportHoursIncluded}h</span>
              </div>
              <Progress value={supportPercentage} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Preventivi Accettati */}
      <div>
        <h2 className="text-2xl font-bold mb-4">I Tuoi Preventivi</h2>
        <div className="grid gap-4">
          {quotes.length === 0 ? (
            <p className="text-muted-foreground">Nessun preventivo disponibile.</p>
          ) : (
            quotes.map(quote => (
              <QuoteCard key={quote.id} quote={quote} />
            ))
          )}
        </div>
      </div>

      {/* Ticket Attivi */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Ticket Assistenza</h2>
        <TicketWidget
          tickets={tickets}
          onTicketUpdated={loadDashboardData}
        />
      </div>

      {/* File e Documenti */}
      {(clientInfo.driveFolderLink || clientInfo.documentsFolder) && (
        <div>
          <h2 className="text-2xl font-bold mb-4">File e Documenti</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {clientInfo.driveFolderLink && (
              <Card>
                <CardContent className="pt-6">
                  <Button
                    className="w-full"
                    onClick={() => window.open(clientInfo.driveFolderLink, '_blank')}
                  >
                    📂 Apri Drive Condiviso
                  </Button>
                </CardContent>
              </Card>
            )}
            {clientInfo.documentsFolder && (
              <Card>
                <CardContent className="pt-6">
                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={() => window.open(clientInfo.documentsFolder, '_blank')}
                  >
                    📄 Documenti Progetto
                  </Button>
                </CardContent>
              </Card>
            )}
            {clientInfo.assetsFolder && (
              <Card>
                <CardContent className="pt-6">
                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={() => window.open(clientInfo.assetsFolder, '_blank')}
                  >
                    🎨 Asset e Materiali
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Fatture */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Fatture</h2>
        <FileBrowser category="INVOICE" />
      </div>
    </div>
  )
}
```

### 2. Visualizzazione Preventivo (Cliente)

```tsx
// app/client-portal/quote/[id]/page.tsx

'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { clientAPI } from '@/lib/client-api'
import { toast } from 'sonner'

export default function QuoteViewer() {
  const params = useParams()
  const router = useRouter()
  const [quote, setQuote] = useState<any>(null)
  const [selectedPackageId, setSelectedPackageId] = useState<number | null>(null)
  const [selectedPayment, setSelectedPayment] = useState<string>('one_time')
  const [calculatedTotal, setCalculatedTotal] = useState<number>(0)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')

  useEffect(() => {
    loadQuote()
  }, [params.id])

  useEffect(() => {
    if (quote) {
      recalculateTotal()
    }
  }, [selectedPackageId, selectedPayment, quote])

  async function loadQuote() {
    try {
      const res = await clientAPI.getQuote(params.id as string)
      setQuote(res.data)

      // Imposta selezioni salvate
      if (res.data.selectedPackageId) {
        setSelectedPackageId(res.data.selectedPackageId)
      }
      if (res.data.selectedPaymentOption) {
        setSelectedPayment(res.data.selectedPaymentOption)
      }
    } catch (error) {
      console.error('Errore caricamento preventivo:', error)
      toast.error('Errore durante il caricamento del preventivo')
    }
  }

  function recalculateTotal() {
    let subtotal = quote.subtotal

    // Se ci sono pacchetti bespoke e uno è selezionato
    if (quote.bespokeOptions && selectedPackageId) {
      const packages = JSON.parse(quote.bespokeOptions)
      const selectedPkg = packages.find((p: any) => p.id === selectedPackageId)
      if (selectedPkg) {
        subtotal = selectedPkg.price
      }
    }

    // Applica sconto pagamento
    let discount = 0
    if (quote.enablePaymentDiscount) {
      const discountMap: any = {
        one_time: quote.oneTimeDiscount,
        payment_2: quote.payment2Discount,
        payment_3: quote.payment3Discount,
        payment_4: quote.payment4Discount
      }
      discount = (subtotal * (discountMap[selectedPayment] || 0)) / 100
    }

    const subtotalAfterDiscount = subtotal - discount
    const tax = (subtotalAfterDiscount * quote.taxRate) / 100
    const total = subtotalAfterDiscount + tax

    setCalculatedTotal(total)
  }

  async function handleSelectPackage(packageId: number) {
    setSelectedPackageId(packageId)
    try {
      await clientAPI.selectPackage(quote.id, packageId)
      toast.success('Pacchetto selezionato')
    } catch (error) {
      toast.error('Errore durante la selezione del pacchetto')
    }
  }

  async function handleSelectPayment(option: string) {
    setSelectedPayment(option)
    try {
      await clientAPI.selectPayment(quote.id, option)
      toast.success('Modalità di pagamento selezionata')
    } catch (error) {
      toast.error('Errore durante la selezione del pagamento')
    }
  }

  async function handleAccept() {
    try {
      await clientAPI.acceptQuote(quote.id)
      toast.success('Preventivo accettato! Verrai reindirizzato al form di onboarding.')

      // Redirect a Google Form (come nel sistema attuale)
      window.location.href = 'https://forms.gle/gtRCMzVcXgHhFRfY8'
    } catch (error) {
      toast.error('Errore durante l\'accettazione del preventivo')
    }
  }

  async function handleReject() {
    try {
      await clientAPI.rejectQuote(quote.id, rejectionReason)
      toast.success('Preventivo rifiutato. Grazie per il tuo feedback.')
      setShowRejectDialog(false)
      loadQuote() // Ricarica per vedere status aggiornato
    } catch (error) {
      toast.error('Errore durante il rifiuto del preventivo')
    }
  }

  if (!quote) return <div>Caricamento...</div>

  const packages = quote.bespokeOptions ? JSON.parse(quote.bespokeOptions) : []
  const isExpired = new Date(quote.validUntil) < new Date()
  const canInteract = !['ACCEPTED', 'REJECTED', 'EXPIRED'].includes(quote.status) && !isExpired

  return (
    <div className="container max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">{quote.title}</h1>
          <p className="text-muted-foreground">Preventivo N. {quote.quoteNumber}</p>
        </div>
        <Badge variant={
          quote.status === 'ACCEPTED' ? 'default' :
          quote.status === 'REJECTED' ? 'destructive' :
          isExpired ? 'secondary' : 'outline'
        }>
          {quote.status === 'ACCEPTED' && 'Accettato'}
          {quote.status === 'REJECTED' && 'Rifiutato'}
          {quote.status === 'VIEWED' && 'Visualizzato'}
          {isExpired && 'Scaduto'}
        </Badge>
      </div>

      {/* Info Cliente */}
      <Card>
        <CardHeader>
          <CardTitle>Dati Cliente</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Ragione Sociale</p>
              <p className="font-medium">{quote.contact.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium">{quote.contact.email}</p>
            </div>
            {quote.contact.partitaIva && (
              <div>
                <p className="text-sm text-muted-foreground">P.IVA</p>
                <p className="font-medium">{quote.contact.partitaIva}</p>
              </div>
            )}
            {quote.contact.codiceFiscale && (
              <div>
                <p className="text-sm text-muted-foreground">Codice Fiscale</p>
                <p className="font-medium">{quote.contact.codiceFiscale}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Descrizione */}
      {quote.description && (
        <Card>
          <CardHeader>
            <CardTitle>Descrizione Progetto</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{quote.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Obiettivi */}
      {quote.objectives && (
        <Card>
          <CardHeader>
            <CardTitle>Obiettivi</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {JSON.parse(quote.objectives).map((obj: any, idx: number) => (
                <li key={idx}>
                  <p className="font-medium">{obj.title}</p>
                  <p className="text-sm text-muted-foreground">{obj.description}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Pacchetti Bespoke */}
      {packages.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Scegli il Pacchetto</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {packages.map((pkg: any) => (
                <Card
                  key={pkg.id}
                  className={`cursor-pointer transition-all ${
                    selectedPackageId === pkg.id
                      ? 'border-primary ring-2 ring-primary'
                      : 'hover:border-primary/50'
                  } ${!canInteract && 'opacity-50 cursor-not-allowed'}`}
                  onClick={() => canInteract && handleSelectPackage(pkg.id)}
                >
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle>{pkg.title}</CardTitle>
                      <Badge variant="secondary">€{pkg.price}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-1">
                      {pkg.features.map((feat: string, idx: number) => (
                        <li key={idx} className="text-sm flex items-start gap-2">
                          <span className="text-primary">✓</span>
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modalità Pagamento */}
      {quote.enablePaymentDiscount && (
        <Card>
          <CardHeader>
            <CardTitle>Modalità di Pagamento</CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup value={selectedPayment} onValueChange={canInteract ? handleSelectPayment : undefined}>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { value: 'one_time', label: 'Pagamento Unico', discount: quote.oneTimeDiscount },
                  { value: 'payment_2', label: '2 Rate', discount: quote.payment2Discount },
                  { value: 'payment_3', label: '3 Rate', discount: quote.payment3Discount },
                  { value: 'payment_4', label: '4 Rate', discount: quote.payment4Discount }
                ].map(option => (
                  <Card
                    key={option.value}
                    className={`cursor-pointer ${
                      selectedPayment === option.value
                        ? 'border-primary ring-2 ring-primary'
                        : 'hover:border-primary/50'
                    } ${!canInteract && 'opacity-50 cursor-not-allowed'}`}
                    onClick={() => canInteract && handleSelectPayment(option.value)}
                  >
                    <CardContent className="pt-6">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value={option.value} id={option.value} />
                        <Label htmlFor={option.value} className="cursor-pointer">
                          <div>
                            <p className="font-medium">{option.label}</p>
                            {option.discount > 0 && (
                              <p className="text-sm text-green-600">Sconto {option.discount}%</p>
                            )}
                          </div>
                        </Label>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </RadioGroup>
          </CardContent>
        </Card>
      )}

      {/* Riepilogo Investimento */}
      <Card>
        <CardHeader>
          <CardTitle>Riepilogo Investimento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between">
            <span>Subtotale</span>
            <span>€{quote.subtotal.toFixed(2)}</span>
          </div>
          {quote.discountPercentage > 0 && (
            <div className="flex justify-between text-green-600">
              <span>Sconto ({quote.discountPercentage}%)</span>
              <span>-€{quote.discountAmount.toFixed(2)}</span>
            </div>
          )}
          {quote.enablePaymentDiscount && (
            <div className="flex justify-between text-green-600">
              <span>Sconto pagamento</span>
              <span>-€{((calculatedTotal - quote.subtotal) * -1).toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span>IVA ({quote.taxRate}%)</span>
            <span>€{((calculatedTotal / (1 + quote.taxRate / 100)) * (quote.taxRate / 100)).toFixed(2)}</span>
          </div>
          <Separator />
          <div className="flex justify-between text-lg font-bold">
            <span>TOTALE</span>
            <span>€{calculatedTotal.toFixed(2)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Termini e Condizioni */}
      {quote.termsConditions && (
        <Card>
          <CardHeader>
            <CardTitle>Termini e Condizioni</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{quote.termsConditions}</p>
          </CardContent>
        </Card>
      )}

      {/* Azioni */}
      {canInteract && (
        <div className="flex gap-4">
          <Button
            size="lg"
            className="flex-1"
            onClick={handleAccept}
          >
            ✓ Accetta Preventivo
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => setShowRejectDialog(true)}
          >
            ✗ Rifiuta
          </Button>
        </div>
      )}

      {/* Dialog Rifiuto */}
      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rifiuta Preventivo</AlertDialogTitle>
            <AlertDialogDescription>
              Ci dispiace che il preventivo non soddisfi le tue aspettative.
              Puoi indicarci il motivo? (opzionale)
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder="Motivo del rifiuto..."
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleReject}>
              Conferma Rifiuto
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
```

### 3. Sistema Ticket con Chat

```tsx
// app/client-portal/components/ticket-widget.tsx

'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { clientAPI } from '@/lib/client-api'
import { toast } from 'sonner'
import { MessageCircle, Plus, Send } from 'lucide-react'

export function TicketWidget({ tickets, onTicketUpdated }: any) {
  const [selectedTicket, setSelectedTicket] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Form creazione ticket
  const [newTicket, setNewTicket] = useState({
    supportType: 'TECNICO',
    subject: '',
    description: '',
    priority: 'NORMALE'
  })

  useEffect(() => {
    if (selectedTicket) {
      loadMessages()
      // Polling per nuovi messaggi ogni 10 secondi
      const interval = setInterval(loadMessages, 10000)
      return () => clearInterval(interval)
    }
  }, [selectedTicket])

  useEffect(() => {
    // Scroll to bottom quando arrivano nuovi messaggi
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  async function loadMessages() {
    if (!selectedTicket) return
    try {
      const res = await clientAPI.getTicketMessages(selectedTicket.id)
      setMessages(res.data)

      // Marca messaggi come letti
      await clientAPI.markTicketMessagesAsRead(selectedTicket.id)
    } catch (error) {
      console.error('Errore caricamento messaggi:', error)
    }
  }

  async function handleCreateTicket() {
    try {
      const res = await clientAPI.createTicket(newTicket)
      toast.success('Ticket creato con successo!')
      setCreateDialogOpen(false)
      setNewTicket({
        supportType: 'TECNICO',
        subject: '',
        description: '',
        priority: 'NORMALE'
      })
      onTicketUpdated()
    } catch (error: any) {
      toast.error(error.message || 'Errore durante la creazione del ticket')
    }
  }

  async function handleSendMessage() {
    if (!newMessage.trim() || !selectedTicket) return

    try {
      await clientAPI.sendTicketMessage(selectedTicket.id, newMessage)
      setNewMessage('')
      loadMessages()
    } catch (error) {
      toast.error('Errore durante l\'invio del messaggio')
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[600px]">
      {/* Lista Ticket */}
      <Card className="md:col-span-1">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Ticket</CardTitle>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nuovo Ticket Assistenza</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Tipo Supporto</label>
                  <Select
                    value={newTicket.supportType}
                    onValueChange={(v) => setNewTicket({...newTicket, supportType: v})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TECNICO">Supporto Tecnico</SelectItem>
                      <SelectItem value="DESIGN">Modifica Design</SelectItem>
                      <SelectItem value="CONTENUTI">Gestione Contenuti</SelectItem>
                      <SelectItem value="FATTURAZIONE">Fatturazione</SelectItem>
                      <SelectItem value="ALTRO">Altro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium">Priorità</label>
                  <Select
                    value={newTicket.priority}
                    onValueChange={(v) => setNewTicket({...newTicket, priority: v})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BASSA">Bassa</SelectItem>
                      <SelectItem value="NORMALE">Normale</SelectItem>
                      <SelectItem value="ALTA">Alta</SelectItem>
                      <SelectItem value="URGENTE">Urgente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium">Oggetto</label>
                  <Input
                    value={newTicket.subject}
                    onChange={(e) => setNewTicket({...newTicket, subject: e.target.value})}
                    placeholder="Breve descrizione del problema"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Descrizione</label>
                  <Textarea
                    value={newTicket.description}
                    onChange={(e) => setNewTicket({...newTicket, description: e.target.value})}
                    placeholder="Descrivi dettagliatamente il problema o la richiesta"
                    rows={5}
                  />
                </div>

                <Button
                  className="w-full"
                  onClick={handleCreateTicket}
                  disabled={!newTicket.subject || !newTicket.description}
                >
                  Crea Ticket
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[500px]">
            {tickets.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground text-center">
                Nessun ticket attivo
              </p>
            ) : (
              <div className="space-y-1 p-2">
                {tickets.map((ticket: any) => (
                  <Card
                    key={ticket.id}
                    className={`cursor-pointer transition-all hover:bg-accent ${
                      selectedTicket?.id === ticket.id ? 'border-primary' : ''
                    }`}
                    onClick={() => setSelectedTicket(ticket)}
                  >
                    <CardContent className="p-3">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-sm font-medium">{ticket.ticketNumber}</span>
                        <Badge variant={
                          ticket.priority === 'URGENTE' ? 'destructive' :
                          ticket.priority === 'ALTA' ? 'default' : 'secondary'
                        } className="text-xs">
                          {ticket.priority}
                        </Badge>
                      </div>
                      <p className="text-sm line-clamp-2">{ticket.subject}</p>
                      <div className="flex justify-between items-center mt-2">
                        <Badge variant="outline" className="text-xs">
                          {ticket.status}
                        </Badge>
                        {ticket.unread_messages > 0 && (
                          <Badge className="text-xs">
                            {ticket.unread_messages} nuovi
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Chat */}
      <Card className="md:col-span-2">
        {!selectedTicket ? (
          <CardContent className="flex items-center justify-center h-full">
            <div className="text-center text-muted-foreground">
              <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Seleziona un ticket per visualizzare la chat</p>
            </div>
          </CardContent>
        ) : (
          <>
            <CardHeader className="border-b">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{selectedTicket.subject}</CardTitle>
                  <p className="text-sm text-muted-foreground">{selectedTicket.ticketNumber}</p>
                </div>
                <Badge variant={
                  selectedTicket.status === 'RESOLVED' ? 'default' : 'outline'
                }>
                  {selectedTicket.status}
                </Badge>
              </div>
            </CardHeader>

            <ScrollArea className="h-[400px] p-4" ref={scrollRef}>
              <div className="space-y-4">
                {messages.map((msg: any) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.clientAccessId ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[80%] ${
                      msg.clientAccessId
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    } rounded-lg p-3`}>
                      {!msg.clientAccessId && (
                        <p className="text-xs font-medium mb-1">
                          {msg.user?.firstName} {msg.user?.lastName}
                        </p>
                      )}
                      <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                      <p className={`text-xs mt-1 ${
                        msg.clientAccessId ? 'text-primary-foreground/70' : 'text-muted-foreground'
                      }`}>
                        {new Date(msg.createdAt).toLocaleString('it-IT')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <CardContent className="border-t p-4">
              <div className="flex gap-2">
                <Textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Scrivi un messaggio..."
                  rows={2}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSendMessage()
                    }
                  }}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim()}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  )
}
```

---

## FLUSSI DI LAVORO

### 1. Flusso Preventivo Completo

```
ADMIN SIDE:
1. Admin accede a /quotes
2. Click "Nuovo Preventivo"
3. Form creazione:
   - Seleziona cliente da anagrafica
   - Compila dettagli progetto
   - Configura pacchetti bespoke (opzionale)
   - Imposta sconti pagamento (opzionale)
   - Calcolo automatico totali
4. Salva preventivo (status: DRAFT)
5. Anteprima preventivo
6. Click "Invia a Cliente":
   - Sistema genera username cliente
   - Crea token attivazione (7 giorni)
   - Crea record client_access (tipo: QUOTE_ONLY)
   - Invia email con link attivazione
   - Status preventivo: SENT

CLIENT SIDE:
7. Cliente riceve email con link attivazione
8. Click link → redirect a /client-activation?token=XXX
9. Form attivazione:
   - Visualizza username generato
   - Input password (+ conferma)
   - Valida password sicura
10. Submit → account attivato:
    - Password hashata e salvata
    - Token cancellato
    - is_active = true
    - Redirect automatico a preventivo
11. Visualizzazione preventivo:
    - Dati cliente
    - Descrizione progetto
    - Obiettivi
    - Pacchetti bespoke (se presenti) → selezione
    - Modalità pagamento (se abilitate) → selezione
    - Riepilogo investimento (calcolo real-time)
    - Status preventivo: VIEWED (primo accesso)
12. Cliente seleziona pacchetto:
    - Click card → API call
    - Salva selected_package_id
    - Ricalcola totale
13. Cliente seleziona modalità pagamento:
    - Click opzione → API call
    - Salva selected_payment_option
    - Applica sconto
    - Ricalcola totale
14. Cliente accetta:
    - Click "Accetta Preventivo"
    - Status: ACCEPTED
    - accepted_date = NOW()
    - Log attività
    - Email a tutti gli admin
    - Redirect a Google Form onboarding
15. (Alternativa) Cliente rifiuta:
    - Click "Rifiuta"
    - Modal con textarea motivo
    - Status: REJECTED
    - rejected_date = NOW()
    - rejection_reason salvato
    - Email a admin

ADMIN SIDE (post-azione):
16. Admin riceve email accettazione/rifiuto
17. Admin vede status aggiornato in lista preventivi
18. Se accettato:
    - Admin può creare fattura da preventivo
    - Admin può trasformare accesso in FULL_PORTAL
```

### 2. Flusso Ticket Assistenza

```
CLIENT SIDE:
1. Cliente loggato accede a dashboard
2. Widget ticket sempre visibile
3. Click "Nuovo Ticket":
   - Form: tipo supporto, priorità, oggetto, descrizione
   - Validazione ore supporto (se limitate)
4. Submit ticket:
   - Sistema genera ticket number (T2024-XXXX)
   - Crea ticket (status: OPEN)
   - Crea primo messaggio con descrizione
   - Log attività cliente
   - Email a tutti gli admin
   - Notifica in-app admin

ADMIN SIDE:
5. Admin riceve email + notifica
6. Admin accede a /tickets
7. Vede lista ticket (filtrabili)
8. Click ticket per aprire dettaglio:
   - Info cliente
   - Storico messaggi
   - Activity log
   - Form risposta
9. Admin assegna ticket a sé stesso:
   - Status: IN_PROGRESS
   - assigned_to = admin_id
   - assigned_at = NOW()
   - Log attività
10. Admin risponde:
    - Scrivi messaggio
    - (Opzionale) Aggiungi nota interna
    - Submit → email + notifica a cliente
11. Admin aggiorna status:
    - IN_PROGRESS → WAITING_CLIENT
    - Log attività

CLIENT SIDE:
12. Cliente riceve email + notifica
13. Cliente apre chat ticket
14. Vede risposta admin
15. Messaggi marcati come letti automaticamente
16. Cliente risponde:
    - Scrivi messaggio
    - Submit → email + notifica a admin assegnato
17. Ticket status aggiornato a IN_PROGRESS

ADMIN SIDE:
18. Admin riceve notifica risposta cliente
19. Admin risolve problema:
    - Invia messaggio finale
    - Status: RESOLVED
    - resolved_at = NOW()
    - Log attività
20. (Dopo 3 giorni senza risposte) Admin chiude:
    - Status: CLOSED
    - closed_at = NOW()

TRACKING ORE:
21. Admin traccia ore lavorate:
    - Input ore in ticket detail
    - actual_hours += ore
    - support_hours_used += ore (in client_access)
22. Sistema verifica ore disponibili:
    - Se support_hours_used >= support_hours_included
    - Blocca creazione nuovi ticket
    - Mostra alert a cliente
```

---

## MIGLIORAMENTI vs SISTEMA ATTUALE

### Architettura
- ✅ **API RESTful** separata dal frontend
- ✅ **TypeScript** end-to-end per type safety
- ✅ **ORM Prisma** con migrations strutturate
- ✅ **JWT auth** invece di session PHP
- ✅ **React** per UI reattiva e performante
- ✅ **Zod validation** per sicurezza input

### Sicurezza
- ✅ **Password hashing** con bcrypt (già presente)
- ✅ **JWT con expiration** configurabile
- ✅ **CSRF protection** via SameSite cookies
- ✅ **Rate limiting** su login endpoints
- ✅ **Input sanitization** con Zod
- ✅ **Blocco automatico** tentativi falliti (già presente)
- ✅ **Token scadenza** per attivazione/reset (già presente)

### User Experience
- ✅ **Real-time updates** via polling ottimizzato
- ✅ **Notifiche in-app** + email
- ✅ **UI responsive** mobile-first
- ✅ **Dark mode** support (già nel sistema)
- ✅ **Loading states** e skeleton screens
- ✅ **Toast notifications** per feedback immediato
- ✅ **Optimistic UI updates** dove possibile

### Funzionalità Aggiuntive
- ✅ **WebSockets** (opzionale) per chat real-time
- ✅ **File upload drag & drop**
- ✅ **Ricerca full-text** preventivi/ticket
- ✅ **Export PDF** preventivi migliorato
- ✅ **Dashboard analytics** per admin
- ✅ **Email templates** personalizzabili
- ✅ **Multi-lingua** support (i18n)
- ✅ **Audit log completo** tutte le azioni

### Performance
- ✅ **Code splitting** automatico (Vite)
- ✅ **Lazy loading** componenti
- ✅ **Image optimization** (se necessario)
- ✅ **Database indexing** ottimizzato
- ✅ **Query pagination** per liste grandi
- ✅ **Caching** (opzionale: Redis)

---

## TIMELINE IMPLEMENTAZIONE

### FASE 1: Database & Backend Core (Settimana 1-2)
- [ ] Aggiornare schema Prisma con tutti i nuovi modelli
- [ ] Creare migrations
- [ ] Implementare controllers preventivi
- [ ] Implementare controllers client access
- [ ] Implementare controllers ticket
- [ ] Implementare servizi email
- [ ] Implementare servizio PDF
- [ ] Testing API con Postman/Insomnia

### FASE 2: Auth & Client Portal Base (Settimana 3)
- [ ] Estendere sistema JWT per ruolo CLIENT
- [ ] Implementare endpoint attivazione account
- [ ] Implementare endpoint login cliente
- [ ] Implementare endpoint reset password
- [ ] Creare layout client portal
- [ ] Implementare dashboard cliente base
- [ ] Testing autenticazione

### FASE 3: Preventivi (Settimana 4-5)
- [ ] Pagina lista preventivi (admin)
- [ ] Form creazione preventivo (admin)
- [ ] Configuratore pacchetti bespoke
- [ ] Anteprima preventivo (admin)
- [ ] Invio preventivo con generazione accesso
- [ ] Pagina visualizzazione preventivo (cliente)
- [ ] Selezione pacchetto e pagamento (cliente)
- [ ] Accettazione/rifiuto preventivo
- [ ] Testing flusso completo

### FASE 4: Ticket Assistenza (Settimana 6-7)
- [ ] Pagina lista ticket (admin)
- [ ] Dettaglio ticket con chat (admin)
- [ ] Assegnazione ticket
- [ ] Note interne admin
- [ ] Widget ticket dashboard cliente
- [ ] Form creazione ticket (cliente)
- [ ] Chat interfaccia (cliente)
- [ ] Tracking ore lavorate
- [ ] Email notifications
- [ ] Testing flusso completo

### FASE 5: Gestione File (Settimana 8)
- [ ] Upload file (admin)
- [ ] Browser file (cliente)
- [ ] Download protetto
- [ ] Integrazione Google Drive links
- [ ] Download fatture PDF
- [ ] Testing

### FASE 6: Notifiche & Polishing (Settimana 9)
- [ ] Sistema notifiche in-app
- [ ] Badge contatori non letti
- [ ] Polling ottimizzato
- [ ] (Opzionale) WebSockets
- [ ] Activity logging completo
- [ ] Testing end-to-end

### FASE 7: Testing & Deploy (Settimana 10)
- [ ] Testing completo tutti i flussi
- [ ] Fix bug
- [ ] Performance optimization
- [ ] Security audit
- [ ] Documentazione API
- [ ] Deploy staging
- [ ] User acceptance testing
- [ ] Deploy produzione

---

## PRIORITÀ IMPLEMENTAZIONE

### P0 - Critiche (Must Have)
1. Auth clienti (login, attivazione, reset password)
2. Preventivi CRUD (admin)
3. Visualizzazione e accettazione preventivo (cliente)
4. Dashboard cliente base
5. Ticket creazione e chat

### P1 - Importanti (Should Have)
6. Storico accessi e activity logs
7. Blocco accessi automatico
8. Email notifications
9. Download fatture
10. Tracking ore supporto

### P2 - Desiderabili (Nice to Have)
11. Notifiche in-app real-time
12. Export PDF preventivi
13. Gestione file upload/download
14. Ricerca e filtri avanzati
15. Analytics dashboard admin

### P3 - Future (Could Have)
16. WebSockets per chat real-time
17. Multi-lingua
18. Firma digitale contratti
19. API pubblica
20. Mobile app

---

## NOTE FINALI

Questo piano fornisce una roadmap completa per implementare il modulo clienti nel nuovo CRM. L'architettura proposta è:

- **Scalabile**: può gestire migliaia di clienti
- **Manutenibile**: codice pulito e ben strutturato
- **Sicura**: best practices per auth e validazione
- **Performante**: ottimizzazioni database e frontend
- **User-friendly**: UX moderna e intuitiva

Il sistema attuale PHP ha una base solida che viene migliorata e modernizzata con le tecnologie del nuovo stack. Ogni funzionalità è stata analizzata e riprogettata per massimizzare efficienza e usabilità.

**Prossimi Passi**:
1. Revisione e approvazione del piano
2. Creazione dettagliata task nel project manager
3. Inizio implementazione dalla Fase 1
4. Review periodiche ogni fase completata
