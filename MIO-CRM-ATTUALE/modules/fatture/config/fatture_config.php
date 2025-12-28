<?php
// File: /modules/fatture/config/fatture_config.php
// Configurazione del modulo Fatture - CRM Studio Mismo

// ========================================
// CONFIGURAZIONE STUDIO/AZIENDA
// ========================================

// Dati principali dello studio
define('FATTURE_COMPANY_NAME', 'MISMO | STUDIO GRAFICO & CREATIVO');
define('FATTURE_COMPANY_OWNERS', 'DI STEFANO COSTATO E DAVIDE MARANGONI');
define('FATTURE_COMPANY_ADDRESS', 'VIA DELL\'ARTIGIANATO 23');
define('FATTURE_COMPANY_CITY', '37135 VERONA - IT');
define('FATTURE_COMPANY_EMAIL', 'HI@MISMO.STUDIO');
define('FATTURE_COMPANY_PHONE', '(+39) 375 620 9885');
define('FATTURE_COMPANY_LOGO_TEXT', 'MISMO');

// Partite IVA
define('FATTURE_PIVA_STEFANO', 'IT04904900232');
define('FATTURE_PIVA_DAVIDE', 'IT05052740239');

// ========================================
// CONFIGURAZIONE BANCARIA
// ========================================

// Coordinate bancarie per i pagamenti
define('FATTURE_BANK_NAME', 'REVOLUT BANK UAB');
define('FATTURE_BANK_IBAN', 'LT95 3250 0482 6617 5203');
define('FATTURE_BANK_BENEFICIARY', 'STEFANO COSTATO E DAVIDE MARANGONI');
define('FATTURE_BANK_BIC', 'REVOLT21');
define('FATTURE_BANK_TAX_ID', 'JI3TXCE');

// ========================================
// CONFIGURAZIONE FATTURAZIONE
// ========================================

// Note fiscali predefinite
define('FATTURE_NOTE_FISCALI_DEFAULT', 
'IVA 0% - OPERAZIONE NON SOGGETTA A IVA AI SENSI DELL\'ART. 1, COMMI 54-89, LEGGE N. 190/2014 E SUCC. MODIFICHE/INTEGRAZIONI.

QUESTO DOCUMENTO NON COSTITUISCE FATTURA A FINI FISCALI, CHE SARÀ EMESSA AL MOMENTO DEL PAGAMENTO.'
);

// Impostazioni predefinite
define('FATTURE_GIORNI_PAGAMENTO_DEFAULT', 30); // giorni
define('FATTURE_IVA_DEFAULT', 0); // 0%
define('FATTURE_STATUS_DEFAULT', 'bozza');

// Numerazione automatica fatture
define('FATTURE_AUTO_NUMBERING', true); // true per numerazione automatica
define('FATTURE_NUMBER_FORMAT', '#%03d%Y'); // Formato: #001YYYY
define('FATTURE_NUMBER_PREFIX', '#'); // Prefisso numero fattura

// ========================================
// CONFIGURAZIONE PDF
// ========================================

// Impostazioni PDF
define('FATTURE_PDF_MARGIN_TOP', '15mm');
define('FATTURE_PDF_MARGIN_BOTTOM', '15mm');
define('FATTURE_PDF_MARGIN_LEFT', '20mm');
define('FATTURE_PDF_MARGIN_RIGHT', '20mm');

// Colori brand (per PDF)
define('FATTURE_COLOR_PRIMARY', '#37352f');
define('FATTURE_COLOR_ACCENT', '#8B5CF6');
define('FATTURE_COLOR_CLIENT_BG', 'rgba(248, 180, 180, 0.3)');

// Font settings
define('FATTURE_FONT_FAMILY', 'Inter, -apple-system, BlinkMacSystemFont, sans-serif');
define('FATTURE_FONT_SIZE_BASE', '13px');
define('FATTURE_FONT_SIZE_TITLE', '48px');

// ========================================
// CONFIGURAZIONE SISTEMA
// ========================================

// Limiti e validazione
define('FATTURE_MAX_DESCRIPTION_LENGTH', 500);
define('FATTURE_MAX_OGGETTO_LENGTH', 500);
define('FATTURE_MAX_UPLOAD_SIZE', 10 * 1024 * 1024); // 10MB
define('FATTURE_PDF_MAX_AGE_CACHE', 3600); // 1 ora cache PDF

// Formati data
define('FATTURE_DATE_FORMAT_DISPLAY', 'd/m/Y');
define('FATTURE_DATE_FORMAT_DB', 'Y-m-d');
define('FATTURE_DATETIME_FORMAT_DISPLAY', 'd/m/Y H:i');

// Valute supportate
define('FATTURE_CURRENCY_DEFAULT', 'EUR');
define('FATTURE_CURRENCY_SYMBOL', '€');

// ========================================
// CONFIGURAZIONE EMAIL
// ========================================

// Template email per invio fatture (future feature)
define('FATTURE_EMAIL_SUBJECT_TEMPLATE', 'Fattura %s - Studio Mismo');
define('FATTURE_EMAIL_FROM_NAME', FATTURE_COMPANY_NAME);
define('FATTURE_EMAIL_FROM_EMAIL', FATTURE_COMPANY_EMAIL);

// ========================================
// CONFIGURAZIONE AVANZATA
// ========================================

// Log e debug
define('FATTURE_LOG_ENABLED', true);
define('FATTURE_DEBUG_MODE', false); // Solo per development

// Backup automatico
define('FATTURE_AUTO_BACKUP_ENABLED', true);
define('FATTURE_BACKUP_RETENTION_DAYS', 365);

// Performance
define('FATTURE_ITEMS_PER_PAGE', 50);
define('FATTURE_MAX_EXPORT_ITEMS', 5000);
define('FATTURE_CACHE_STATS_SECONDS', 300); // 5 minuti

// ========================================
// UTILITÀ E HELPER
// ========================================

/**
 * Ottieni il prossimo numero fattura automatico
 */
function getNextInvoiceNumber($pdo) {
    if (!FATTURE_AUTO_NUMBERING) {
        return null;
    }
    
    $currentYear = date('Y');
    
    // Trova l'ultimo numero dell'anno corrente
    $stmt = $pdo->prepare("
        SELECT numero_fattura 
        FROM fatture 
        WHERE YEAR(data_fattura) = ? 
        ORDER BY id DESC 
        LIMIT 1
    ");
    $stmt->execute([$currentYear]);
    $lastFattura = $stmt->fetch();
    
    $nextNumber = 1;
    
    if ($lastFattura && preg_match('/(\d+)' . $currentYear . '$/', $lastFattura['numero_fattura'], $matches)) {
        $nextNumber = intval($matches[1]) + 1;
    }
    
    return sprintf(FATTURE_NUMBER_FORMAT, $nextNumber, $currentYear);
}

/**
 * Valida formato numero fattura
 */
function validateInvoiceNumber($number) {
    // Deve iniziare con il prefisso configurato
    if (!str_starts_with($number, FATTURE_NUMBER_PREFIX)) {
        return false;
    }
    
    // Lunghezza minima/massima
    if (strlen($number) < 4 || strlen($number) > 50) {
        return false;
    }
    
    // Caratteri ammessi: lettere, numeri, #, /, _, -
    if (!preg_match('/^[A-Za-z0-9#\/_-]+$/', $number)) {
        return false;
    }
    
    return true;
}

/**
 * Formatta importo per visualizzazione
 */
function formatCurrency($amount, $includeSymbol = true) {
    $formatted = number_format($amount, 2, ',', '.');
    
    if ($includeSymbol) {
        return $formatted . ' ' . FATTURE_CURRENCY_SYMBOL;
    }
    
    return $formatted;
}

/**
 * Calcola data scadenza
 */
function calculateDueDate($invoiceDate, $paymentDays = null) {
    $days = $paymentDays ?? FATTURE_GIORNI_PAGAMENTO_DEFAULT;
    $date = new DateTime($invoiceDate);
    $date->add(new DateInterval('P' . $days . 'D'));
    return $date->format(FATTURE_DATE_FORMAT_DB);
}

/**
 * Ottieni configurazione come array per JavaScript
 */
function getFattureConfigForJS() {
    return [
        'currency' => FATTURE_CURRENCY_DEFAULT,
        'currencySymbol' => FATTURE_CURRENCY_SYMBOL,
        'defaultPaymentDays' => FATTURE_GIORNI_PAGAMENTO_DEFAULT,
        'defaultIVA' => FATTURE_IVA_DEFAULT,
        'dateFormat' => FATTURE_DATE_FORMAT_DISPLAY,
        'autoNumbering' => FATTURE_AUTO_NUMBERING,
        'numberPrefix' => FATTURE_NUMBER_PREFIX,
        'maxDescriptionLength' => FATTURE_MAX_DESCRIPTION_LENGTH,
        'itemsPerPage' => FATTURE_ITEMS_PER_PAGE
    ];
}

/**
 * Ottieni stati fattura possibili
 */
function getFattureStates() {
    return [
        'bozza' => [
            'label' => 'Bozza',
            'icon' => '✏️',
            'color' => '#787774',
            'canEdit' => true,
            'canDelete' => true,
            'generatePDF' => false
        ],
        'emessa' => [
            'label' => 'Emessa',
            'icon' => '📤',
            'color' => '#1976d2',
            'canEdit' => true,
            'canDelete' => false,
            'generatePDF' => true
        ],
        'pagata' => [
            'label' => 'Pagata',
            'icon' => '✅',
            'color' => '#2e7d2e',
            'canEdit' => true,
            'canDelete' => false,
            'generatePDF' => true
        ],
        'scaduta' => [
            'label' => 'Scaduta',
            'icon' => '⚠️',
            'color' => '#c62828',
            'canEdit' => true,
            'canDelete' => false,
            'generatePDF' => true
        ],
        'stornata' => [
            'label' => 'Stornata',
            'icon' => '❌',
            'color' => '#c62828',
            'canEdit' => false,
            'canDelete' => false,
            'generatePDF' => true
        ]
    ];
}

/**
 * Ottieni configurazione IVA predefinite
 */
function getIVAOptions() {
    return [
        0 => 'IVA 0% - Esente',
        4 => 'IVA 4% - Ridotta',
        10 => 'IVA 10% - Ridotta',
        22 => 'IVA 22% - Ordinaria'
    ];
}

// ========================================
// MESSAGGI E TESTI
// ========================================

// Messaggi di sistema
define('FATTURE_MSG_CREATED', 'Fattura creata con successo');
define('FATTURE_MSG_UPDATED', 'Fattura aggiornata con successo');
define('FATTURE_MSG_DELETED', 'Fattura eliminata con successo');
define('FATTURE_MSG_PDF_GENERATED', 'PDF generato con successo');
define('FATTURE_MSG_EXPORTED', 'Export completato con successo');
define('FATTURE_MSG_DUPLICATED', 'Fattura duplicata con successo');

// Errori comuni
define('FATTURE_ERR_NOT_FOUND', 'Fattura non trovata');
define('FATTURE_ERR_PERMISSION_DENIED', 'Permessi insufficienti');
define('FATTURE_ERR_INVALID_DATA', 'Dati non validi');
define('FATTURE_ERR_DATABASE', 'Errore del database');
define('FATTURE_ERR_PDF_GENERATION', 'Errore nella generazione del PDF');

// ========================================
// VERSIONING
// ========================================

define('FATTURE_MODULE_VERSION', '1.0.0');
define('FATTURE_MODULE_BUILD_DATE', '2025-08-07');
define('FATTURE_MODULE_AUTHOR', 'Studio Mismo');

?>