<?php
// File: /ajax/client_generate_pdf.php
// Generatore PDF per fatture - Versione CLIENT-ONLY

session_start();

// Verifica autenticazione cliente
if (!isset($_SESSION['logged_in']) || !$_SESSION['logged_in'] || 
    !isset($_SESSION['user_type']) || $_SESSION['user_type'] !== 'client') {
    http_response_code(401);
    echo 'Accesso non autorizzato';
    exit;
}

// Verifica che sia un accesso tipo cliente 
$accessType = $_SESSION['client_access_type'] ?? '';
if ($accessType !== 'cliente') {
    http_response_code(403);
    echo 'Accesso non consentito per questo tipo di utente';
    exit;
}

try {
    // Connessione database
    $dsn = "mysql:host=127.0.0.1;dbname=u706045794_crm_mismo;charset=utf8mb4";
    $pdo = new PDO($dsn, 'u706045794_mismo_crm_new', 'BLQ$>:;*9+h', [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);

    // Ottieni informazioni cliente dalla sessione
    $clientId = $_SESSION['client_id'];
    
    // Carica informazioni client per sicurezza
    $stmt = $pdo->prepare("
        SELECT ca.contact_id
        FROM client_access ca
        WHERE ca.id = ?
    ");
    $stmt->execute([$clientId]);
    $clientInfo = $stmt->fetch();
    
    if (!$clientInfo) {
        http_response_code(404);
        echo 'Cliente non trovato';
        exit;
    }

    // Validazione ID fattura
    $invoiceId = intval($_GET['id'] ?? 0);
    
    if ($invoiceId <= 0) {
        http_response_code(400);
        echo 'ID fattura non valido';
        exit;
    }

    // Ottieni fattura - SOLO se appartiene al cliente corrente
    $stmt = $pdo->prepare("
        SELECT 
            f.*,
            DATE_FORMAT(f.data_fattura, '%W %d %M %Y') as data_fattura_formatted,
            DATE_FORMAT(f.data_scadenza, '%d/%m/%Y') as data_scadenza_formatted
        FROM fatture f
        WHERE f.id = ? 
        AND f.client_id = ? 
        AND f.visible_to_client = 1
        AND f.status != 'bozza'
    ");
    
    $stmt->execute([$invoiceId, $clientInfo['contact_id']]);
    $fattura = $stmt->fetch();
    
    if (!$fattura) {
        http_response_code(404);
        echo 'Fattura non trovata o non accessibile';
        exit;
    }

    // Includi configurazione fatture
    require_once $_SERVER['DOCUMENT_ROOT'] . '/modules/fatture/config/fatture_config.php';

    // Traduci data in italiano
    $giorni = [
        'Monday' => 'Lunedì',
        'Tuesday' => 'Martedì', 
        'Wednesday' => 'Mercoledì',
        'Thursday' => 'Giovedì',
        'Friday' => 'Venerdì',
        'Saturday' => 'Sabato',
        'Sunday' => 'Domenica'
    ];

    $mesi = [
        'January' => 'gennaio',
        'February' => 'febbraio',
        'March' => 'marzo',
        'April' => 'aprile',
        'May' => 'maggio',
        'June' => 'giugno',
        'July' => 'luglio',
        'August' => 'agosto',
        'September' => 'settembre',
        'October' => 'ottobre',
        'November' => 'novembre',
        'December' => 'dicembre'
    ];

    $dataFormattata = $fattura['data_fattura_formatted'];
    foreach ($giorni as $en => $it) {
        $dataFormattata = str_replace($en, $it, $dataFormattata);
    }
    foreach ($mesi as $en => $it) {
        $dataFormattata = str_replace($en, $it, $dataFormattata);
    }

    // Calcola IVA
    $importo_iva = $fattura['totale'] - $fattura['subtotale'];

    // Log accesso (opzionale)
    error_log("Client PDF access: Client {$clientId} accessed invoice {$invoiceId}");

    // Header per visualizzazione HTML
    header('Content-Type: text/html; charset=utf-8');

?>
<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Fattura <?= htmlspecialchars($fattura['numero_fattura']) ?></title>
    
    <!--ADOBE FONTS-->
    <link rel="stylesheet" href="https://use.typekit.net/ekm2csm.css">
    
    <!-- Librerie CDN per cattura screenshot e conversione PDF -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>

    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
        }

        body {
            font-family: "Elza", -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
            color: #000;
            background-color: #ffffff;
            margin: 0;
            padding: 0;
        }
        
        /* Container wrapper per centrare */
        .page-wrapper {
            width: 210mm;
            height: 297mm;
            margin: 0 auto;
            background: white;
        }

        .invoice-container {
            background-color: white;
            padding: 2em;
            width: 100%;
            position: relative;
        }

        .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 2em;
        }

        .logo {
            width: 250px;
        }

        .company-info {
            display: flex;
            gap: 2em;
        }

        .company-column {
            font-size: 12px;
            text-transform: uppercase;
            line-height: 1.4;
        }

        .meta-info {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            margin-bottom: -1em;
        }

        .fattura-title {
            font-size: 48px;
            text-transform: uppercase;
            font-weight: 500;
            margin: 0;
        }

        .invoice-number {
            font-size: 48px;
            text-transform: uppercase;
            font-weight: 500;
            margin: 0;
        }

        .invoice-date {
            font-size: 48px;
            text-transform: uppercase;
            font-weight: 500;
            margin-bottom: 0.5em;
            text-align-last: justify;
        }

        .client-section {
            margin-bottom: 2em;
        }

        .client-info {
            display: flex;
            gap: 2em;
            font-size: 14px;
            font-weight: 400;
            text-transform: uppercase;
            line-height: 1.4;
        }

        h3{
            font-size: 12px;
            font-weight: 500;
        }

        .client-column {
            flex: 1;
        }

        .object-section {
            margin-bottom: 0.75em;
        }

        .invoice-object {
            font-size: 16px;
            font-weight: 500;
            text-transform: uppercase;
            margin-bottom: 1em;
        }

        .divider {
            border-top: 1px solid #000;
            border-bottom: 1px solid #000;
            margin: 0.5em 0;
        }

        .services-table {
            width: 100%;
            margin-bottom: 1em;
        }

        .services-header {
            display: flex;
            align-items: center;
            font-size: 14px;
            font-weight: 400;
            text-transform: uppercase;
            padding: 0.5em 0;
        }

        .service-description {
            flex: 6;
        }

        .service-quantity {
            flex: 1;
            text-align: center;
        }

        .service-price {
            flex: 2;
            text-align: right;
        }

        .service-vat {
            flex: 1.5;
            text-align: right;
        }

        .totals {
            display: grid;
            grid-template-columns: 1fr auto;
            width: 100%;
            margin-top: 20px;
        }

        .totals-labels {
            text-align: left;
            font-size: 24px;
            font-weight: 500;
            text-transform: uppercase;
        }

        .totals-values {
            text-align: right;
            font-size: 24px;
            font-weight: 500;
            text-transform: uppercase;
        }

        .total-invoice{
            padding-top: 1.5em;
        }

        .notes-section {
            margin-bottom: 3em;
        }

        .notes-section p {
            font-size: 11px;
            font-weight: 400;
            text-transform: uppercase;
            line-height: 1.4;
        }

        .payment-section {
            margin-bottom: 3em;
        }

        .payment-title {
            font-size: 36px;
            font-weight: 500;
            text-transform: uppercase;
            margin-bottom: 0.15em;
        }

        .payment-label {
            font-size: 14px;
            font-weight: 500;
            text-transform: uppercase;
            margin-bottom: 0.1em;
            width: 120px;
            display: inline-block;
        }

        .payment-value {
            font-size: 14px;
            font-weight: 400;
            text-transform: uppercase;
        }

        h4{
            font-size: 12px;
            font-weight: 500;
            text-transform: uppercase;
        }
        
        .footer-disclaimer {
            position: relative;
            bottom: -15em;
        }

        .footer-disclaimer p {
            font-size: 11px;
            font-weight: 400;
            text-transform: uppercase;
        }
        
        /* Controlli PDF */
        .pdf-controls {
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 1000;
            display: flex;
            gap: 10px;
            background: white;
            padding: 15px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        
        .pdf-controls button {
            padding: 10px 20px;
            border: none;
            border-radius: 4px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        
        .btn-download-pdf {
            background: #37352f;
            color: white;
        }
        
        .btn-download-pdf:hover {
            background: #2a2a2a;
        }
        
        .btn-print {
            background: #f7f7f5;
            color: #37352f;
            border: 1px solid #e9e9e7;
        }
        
        .btn-print:hover {
            background: #e9e9e7;
        }
        
        .btn-back {
            background: #3b82f6;
            color: white;
        }
        
        .btn-back:hover {
            background: #2563eb;
        }
        
        .loading-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(255,255,255,0.95);
            display: none;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            flex-direction: column;
            gap: 20px;
        }
        
        .loading-overlay.active {
            display: flex;
        }
        
        .spinner {
            width: 50px;
            height: 50px;
            border: 4px solid #f3f3f3;
            border-top: 4px solid #37352f;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        /* Print styles */
        @media print {
            * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                color-adjust: exact !important;
            }
            
            body {
                margin: 0;
                padding: 0;
            }
            
            .page-wrapper {
                width: 100%;
                margin: 0;
            }
            
            .invoice-container {
                padding: 20mm;
                page-break-inside: avoid;
            }
            
            .pdf-controls,
            .loading-overlay {
                display: none !important;
            }
            
            .divider {
                border-color: #000 !important;
                -webkit-print-color-adjust: exact;
            }
        }

        /* Fix per Safari */
        @media print and (-webkit-min-device-pixel-ratio:0) {
            .invoice-container {
                -webkit-print-color-adjust: exact;
            }
        }
    </style>
</head>
<body>
    <!-- Controlli PDF -->
    <div class="pdf-controls">
        <button class="btn-back" onclick="goBackToDashboard()">
            ← Torna alla Dashboard
        </button>
        <button class="btn-download-pdf" onclick="generatePDF()">
            Scarica PDF
        </button>
        <button class="btn-print" onclick="window.print()">
            Stampa
        </button>
    </div>
    
    <!-- Loading overlay -->
    <div class="loading-overlay" id="loadingOverlay">
        <div class="spinner"></div>
        <p>Generazione PDF in corso...</p>
    </div>

    <div class="page-wrapper">
        <div class="invoice-container" id="invoiceContent">
            <!--HEADER-->
            <div class="header">
                <div class="logo-section">
                     <img src="../assets/logo_mismo_black.svg" class="logo" alt="Mismo Studio Logo">
                </div>
                <div class="company-info">
                    <div class="company-column">
                        <p><?= FATTURE_COMPANY_NAME ?><br><?= FATTURE_COMPANY_OWNERS ?></p>
                        <p><?= FATTURE_COMPANY_ADDRESS ?><br><?= FATTURE_COMPANY_CITY ?></p>
                    </div>
                    <div class="company-column">
                        <p><?= FATTURE_COMPANY_EMAIL ?><br><?= FATTURE_COMPANY_PHONE ?></p>
                        <p>PI (S) <?= FATTURE_PIVA_STEFANO ?><br>PI (D) <?= FATTURE_PIVA_DAVIDE ?></p>
                    </div>
                </div>
            </div>

            <!--META INFO-->
            <div class="meta-info">
                <h1 class="fattura-title">Fattura</h1>
                <h2 class="invoice-number"><?= htmlspecialchars($fattura['numero_fattura']) ?></h2>
            </div>
            <h2 class="invoice-date"><?= $dataFormattata ?></h2>

            <!--DESTINATARIO-->
            <div class="client-section">
                <div class="client-info">
                    <div class="client-column">
                        <h3><?= htmlspecialchars($fattura['client_name']) ?></h3>
                    </div>
                    <?php if ($fattura['client_address']): ?>
                    <div class="client-column">
                        <h3><?= nl2br(htmlspecialchars($fattura['client_address'])) ?></h3>
                    </div>
                    <?php endif; ?>
                    <?php if ($fattura['client_piva'] ?? false): ?>
                    <div class="client-column">
                        <h3>P.IVA <?= htmlspecialchars($fattura['client_piva']) ?></h3>
                    </div>
                    <?php endif; ?>
                </div>
            </div>

            <!--OGGETTO-->
            <div class="object-section">
                <div class="invoice-object">Oggetto: <?= htmlspecialchars($fattura['oggetto']) ?></div>
                <div class="divider"></div>
            </div>

            <!--SERVIZI-->
            <div class="services-table">
                <div class="services-header">
                    <div class="service-description"><?= htmlspecialchars($fattura['descrizione'] ?: $fattura['oggetto']) ?></div>
                    <div class="service-quantity"><?= number_format($fattura['quantita'], 0) ?></div>
                    <div class="service-price"><?= number_format($fattura['prezzo_unitario'], 2, ',', '.') ?> EUR</div>
                    <div class="service-vat">IVA <?= number_format($fattura['iva_percentuale'], 0) ?>%</div>
                </div>
                <div class="divider"></div>
            </div>

            <!--TOTALI-->
            <div class="totals">
                <div class="totals-labels">
                    <div>Subtotale</div>
                    <div>IVA</div>
                    <div class="total-invoice">Totale da pagare</div>
                </div>
                <div class="totals-values">
                    <div><?= number_format($fattura['subtotale'], 2, ',', '.') ?> EUR</div>
                    <div><?= number_format($importo_iva, 2, ',', '.') ?> EUR</div>
                    <div class="total-invoice"><?= number_format($fattura['totale'], 2, ',', '.') ?> EUR</div>
                </div>
            </div>

            <!--INFORMAZIONI PAGAMENTO-->
            <div class="divider"></div>
            <div class="payment-section">
                <h3 class="payment-title">Informazioni sul pagamento</h3>
                <div class="payment-info">
                    <span class="payment-label">[Scadenze]</span><span class="payment-value date"><?= htmlspecialchars($fattura['data_scadenza_formatted']) ?>:</span>&nbsp;<span class="payment-value subtotal"><?= number_format($fattura['totale'], 2, ',', '.') ?> EUR</span><br>
                    <span class="payment-label">[Banca]</span><span class="payment-value"><?= FATTURE_BANK_NAME ?></span><br>
                    <span class="payment-label">[IBAN]</span><span class="payment-value"><?= FATTURE_BANK_IBAN ?></span><br>
                    <span class="payment-label">[Beneficiario]</span><span class="payment-value"><?= FATTURE_BANK_BENEFICIARY ?></span><br>
                    <span class="payment-label">[BIC/Swift]</span><span class="payment-value"><?= FATTURE_BANK_BIC ?></span><br>
                    <span class="payment-label">[TAX ID]</span><span class="payment-value"><?= FATTURE_BANK_TAX_ID ?></span>
                </div>
            </div>

            <!--DISCLAIMER-->
            <?php if ($fattura['note_fiscali']): ?>
            <div class="footer-disclaimer">
                <h4>Note importanti</h4>
                <p><?= nl2br(htmlspecialchars($fattura['note_fiscali'])) ?></p>
            </div>
            <?php else: ?>
            <div class="footer-disclaimer">
                <h4>Note importanti</h4>
                <p>Questo documento costituisce fattura regolare ai fini fiscali.</p>
            </div>
            <?php endif; ?>
        </div>
    </div>

    <script>
        function goBackToDashboard() {
            // Torna alla dashboard principale del cliente
            window.location.href = '/client.php';
        }

        // Funzione per generare PDF con screenshot
        async function generatePDF() {
            const loadingOverlay = document.getElementById('loadingOverlay');
            const element = document.getElementById('invoiceContent');
            
            try {
                // Mostra loading
                loadingOverlay.classList.add('active');
                
                // Nascondi i controlli temporaneamente
                const controls = document.querySelector('.pdf-controls');
                controls.style.display = 'none';
                
                // Configura html2canvas con alta qualità
                const canvas = await html2canvas(element, {
                    scale: 3,
                    useCORS: true,
                    logging: false,
                    backgroundColor: '#ffffff',
                    windowWidth: element.scrollWidth,
                    windowHeight: element.scrollHeight
                });
                
                // Ripristina i controlli
                controls.style.display = 'flex';
                
                // Inizializza jsPDF
                const { jsPDF } = window.jspdf;
                
                // Calcola dimensioni per A4
                const imgWidth = 210; // A4 width in mm
                const pageHeight = 297; // A4 height in mm
                const imgHeight = (canvas.height * imgWidth) / canvas.width;
                
                // Crea PDF
                const pdf = new jsPDF({
                    orientation: 'portrait',
                    unit: 'mm',
                    format: 'a4',
                    compress: true
                });
                
                // Aggiungi immagine al PDF
                const imgData = canvas.toDataURL('image/jpeg', 1.0);
                
                let heightLeft = imgHeight;
                let position = 0;
                
                // Prima pagina
                pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
                heightLeft -= pageHeight;
                
                // Aggiungi pagine extra se necessario
                while (heightLeft > 0) {
                    position = heightLeft - imgHeight;
                    pdf.addPage();
                    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
                    heightLeft -= pageHeight;
                }
                
                // Genera nome file
                const fileName = 'Fattura_<?= str_replace(['#', '/', ' '], ['', '_', '_'], $fattura['numero_fattura']) ?>.pdf';
                
                // Salva il PDF
                pdf.save(fileName);
                
                // Nascondi loading
                loadingOverlay.classList.remove('active');
                
                // Notifica successo
                showNotification('PDF scaricato con successo!', 'success');
                
            } catch (error) {
                console.error('Errore nella generazione del PDF:', error);
                loadingOverlay.classList.remove('active');
                showNotification('Errore nella generazione del PDF. Riprova.', 'error');
            }
        }
        
        // Funzione per mostrare notifiche
        function showNotification(message, type = 'info') {
            const notification = document.createElement('div');
            notification.style.cssText = `
                position: fixed;
                bottom: 20px;
                right: 20px;
                padding: 15px 20px;
                background: ${type === 'success' ? '#4caf50' : '#f44336'};
                color: white;
                border-radius: 4px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                z-index: 10000;
                animation: slideIn 0.3s ease;
            `;
            notification.textContent = message;
            document.body.appendChild(notification);
            
            setTimeout(() => {
                notification.style.animation = 'slideOut 0.3s ease';
                setTimeout(() => notification.remove(), 300);
            }, 3000);
        }
        
        // Aggiungi animazioni
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    </script>
</body>
</html>

<?php

} catch (PDOException $e) {
    error_log("Database error in client_generate_pdf.php: " . $e->getMessage());
    http_response_code(500);
    echo 'Errore del database: ' . $e->getMessage();
} catch (Exception $e) {
    error_log("General error in client_generate_pdf.php: " . $e->getMessage());
    http_response_code(500);
    echo 'Errore interno del server: ' . $e->getMessage();
}
?>