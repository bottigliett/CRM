import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface InvoicePDFData {
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  clientName: string;
  clientAddress?: string;
  clientPIva?: string;
  clientCF?: string;
  subject: string;
  description: string;
  quantity: string;
  unitPrice: string;
  subtotal: string;
  vatPercentage: string;
  vatAmount: string;
  total: string;
  fiscalNotes?: string;
  isVatZero: boolean;
  services?: Array<{
    description: string;
    quantity: string;
    unitPrice: string;
  }>;
}

export async function generateInvoicePDF(invoiceId: number, data: InvoicePDFData): Promise<void> {
  // Create an isolated iframe to avoid CSS conflicts
  const iframe = document.createElement('iframe');
  iframe.style.position = 'absolute';
  iframe.style.left = '-9999px';
  iframe.style.width = '210mm';
  iframe.style.height = '297mm';
  document.body.appendChild(iframe);

  try {
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) throw new Error('Could not access iframe document');

    // Write the complete HTML to the iframe
    iframeDoc.open();
    iframeDoc.write(getInvoiceHTML(data));
    iframeDoc.close();

    // Wait for fonts and images to load
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Get the content element
    const content = iframeDoc.querySelector('.page-wrapper') as HTMLElement;
    if (!content) throw new Error('PDF content not found');

    // Generate PDF from the isolated HTML
    const canvas = await html2canvas(content, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: content.scrollWidth,
      windowHeight: content.scrollHeight,
    });

    // Calculate PDF dimensions (A4: 210mm x 297mm)
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = 210;
    const pdfHeight = 297;

    const imgData = canvas.toDataURL('image/png');
    const imgWidth = pdfWidth;
    const imgHeight = (canvas.height * pdfWidth) / canvas.width;

    // Add the invoice to a single page
    // If content is taller than one page, scale it to fit
    if (imgHeight > pdfHeight) {
      // Scale down to fit one page
      const scaledWidth = (pdfHeight * canvas.width) / canvas.height;
      const xOffset = (pdfWidth - scaledWidth) / 2;
      pdf.addImage(imgData, 'PNG', xOffset, 0, scaledWidth, pdfHeight);
    } else {
      // Content fits on one page, add normally
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
    }

    // Download the PDF
    pdf.save(`Fattura_${data.invoiceNumber.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
  } finally {
    // Clean up
    document.body.removeChild(iframe);
  }
}

function getInvoiceHTML(data: InvoicePDFData): string {
  return `
<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Fattura ${data.invoiceNumber}</title>

    <!--ADOBE FONTS-->
    <link rel="stylesheet" href="https://use.typekit.net/ekm2csm.css">

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
            width: 180px;
            height: auto;
        }

        .logo svg {
            width: 100%;
            height: auto;
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
            margin-bottom: auto;
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
            position: absolute;
            bottom: 2em;
            left: 2em;
            right: 2em;
        }

        .footer-disclaimer p {
            font-size: 11px;
            font-weight: 400;
            text-transform: uppercase;
            line-height: 1.4;
        }
    </style>
</head>
<body>
    <div class="page-wrapper">
        <div class="invoice-container">
            <!--HEADER-->
            <div class="header">
                <div class="logo-section">
                   <div class="logo">
                       <svg width="1408" height="373" viewBox="0 0 1408 373" fill="none" xmlns="http://www.w3.org/2000/svg">
                           <g clip-path="url(#clip0_1_11)">
                               <path d="M198.262 186.743C185.744 231.795 176.217 283.383 176.217 283.383H175.244C175.244 283.383 165.23 231.795 152.712 186.743L102.156 7.02199H0V364.935H66.6204V159.698C66.6204 130.637 63.6302 85.5849 63.6302 85.5849H64.6037C64.6037 85.5849 72.601 127.647 80.1114 153.65L140.195 364.935H209.806L271.419 153.65C278.93 127.647 286.927 85.5849 286.927 85.5849H287.9C287.9 85.5849 284.91 130.637 284.91 159.698V364.935H352.504V7.02199H248.818L198.262 186.743Z" fill="black"/>
                               <path d="M1235.75 0C1175.87 0 1128.38 25.5851 1098.47 67.2304L1110.09 7.02199H1006.96L920.864 192.722C900.35 237.288 884.286 285.329 884.286 285.329H883.799C883.799 285.329 883.312 233.742 879.279 183.684L865.788 6.95247H766.135L721.837 236.384C710.502 178.887 655.843 163.383 590.405 149.13C537.345 137.589 512.31 129.107 512.31 100.046C512.31 74.5305 537.831 57.9836 576.914 57.9836C615.996 57.9836 642.004 75.9905 646.037 112.074H715.648C710.015 40.0462 657.929 0.486673 577.331 0.486673C496.733 0.486673 440.126 37.0567 440.126 107.624C440.126 182.224 498.68 199.258 562.797 213.788C617.387 226.303 651.462 233.325 651.462 268.365C651.462 301.39 618.916 314.391 581.851 314.391C530.808 314.391 506.26 297.357 501.253 254.321H435.675V7.02199H363.074V364.935H435.675V288.527C451.879 342.687 503.617 372.93 584.911 372.93C638.318 372.93 681.921 355.063 705.356 321.969L697.081 364.935H762.658L802.227 159.698C807.721 130.637 813.771 84.6115 813.771 84.6115H814.744C814.744 84.6115 815.231 127.161 817.248 153.719L834.285 365.005H902.366L1000.98 153.232C1015.02 123.198 1030.53 84.6811 1030.53 84.6811H1031.5C1031.5 84.6811 1019.96 128.76 1013.98 159.768L974.411 365.005H1041.03L1067.04 230.405C1082.83 314.738 1145.06 373.069 1235.82 373.069C1341.45 373.069 1408.07 293.95 1408.07 186.813C1408.07 79.6753 1341.38 0 1235.75 0ZM1236.23 313.417C1170.66 313.417 1137.07 257.867 1137.07 186.743C1137.07 115.62 1170.59 59.5827 1236.23 59.5827C1301.88 59.5827 1333.87 115.133 1333.87 186.743C1333.87 258.354 1301.81 313.417 1236.23 313.417Z" fill="black"/>
                           </g>
                           <defs>
                               <clipPath id="clip0_1_11">
                                   <rect width="1408" height="373" fill="white"/>
                               </clipPath>
                           </defs>
                       </svg>
                   </div>
                </div>
                <div class="company-info">
                    <div class="company-column">
                        <p>MISMO | STUDIO GRAFICO & CREATIVO<br>DI STEFANO COSTATO E DAVIDE MARANGONI</p>
                        <p>VIA DELL'ARTIGIANATO 23<br>37135 VERONA - IT</p>
                    </div>
                    <div class="company-column">
                        <p>HI@MISMO.STUDIO<br>(+39) 375 620 9885</p>
                        <p>PI (S) IT04904900232<br>PI (D) IT05052740239</p>
                    </div>
                </div>
            </div>

            <!--META INFO-->
            <div class="meta-info">
                <h1 class="fattura-title">Fattura</h1>
                <h2 class="invoice-number">${data.invoiceNumber}</h2>
            </div>
            <h2 class="invoice-date">${data.invoiceDate}</h2>

            <!--DESTINATARIO-->
            <div class="client-section">
                <div class="client-info">
                    <div class="client-column">
                        <h3>${data.clientName}</h3>
                    </div>
                    ${data.clientAddress ? `
                    <div class="client-column">
                        <h3>${data.clientAddress}</h3>
                    </div>
                    ` : ''}
                    ${data.clientPIva ? `
                    <div class="client-column">
                        <h3>P.IVA ${data.clientPIva}</h3>
                    </div>
                    ` : ''}
                </div>
            </div>

            <!--OGGETTO-->
            <div class="object-section">
                <div class="invoice-object">Oggetto: ${data.subject}</div>
                <div class="divider"></div>
            </div>

            <!--SERVIZI-->
            <div class="services-table">
                ${data.services && data.services.length > 0 ?
                    data.services.map(service => `
                        <div class="services-header">
                            <div class="service-description">${service.description}</div>
                            <div class="service-quantity">${service.quantity}</div>
                            <div class="service-price">${service.unitPrice} EUR</div>
                            <div class="service-vat">IVA 0%</div>
                        </div>
                    `).join('')
                : `
                    <div class="services-header">
                        <div class="service-description">${data.description}</div>
                        <div class="service-quantity">${data.quantity}</div>
                        <div class="service-price">${data.unitPrice} EUR</div>
                        <div class="service-vat">IVA ${data.vatPercentage}%</div>
                    </div>
                `}
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
                    <div>${data.subtotal} EUR</div>
                    <div>${data.vatAmount} EUR</div>
                    <div class="total-invoice">${data.total} EUR</div>
                </div>
            </div>

            <!--INFORMAZIONI PAGAMENTO-->
            <div class="divider"></div>
            <div class="payment-section">
                <h3 class="payment-title">Informazioni sul pagamento</h3>
                <div class="payment-info">
                    <span class="payment-label">[Scadenze]</span><span class="payment-value date">${data.dueDate}:</span>&nbsp;<span class="payment-value subtotal">${data.total} EUR</span><br>
                    <span class="payment-label">[Banca]</span><span class="payment-value">REVOLUT BANK UAB</span><br>
                    <span class="payment-label">[IBAN]</span><span class="payment-value">LT95 3250 0482 6617 5203</span><br>
                    <span class="payment-label">[Beneficiario]</span><span class="payment-value">STEFANO COSTATO E DAVIDE MARANGONI</span><br>
                    <span class="payment-label">[BIC/Swift]</span><span class="payment-value">REVOLT21</span><br>
                    <span class="payment-label">[TAX ID]</span><span class="payment-value">JI3TXCE</span>
                </div>
            </div>

            <!--DISCLAIMER-->
            <div class="footer-disclaimer">
                <h4>Note importanti</h4>
                ${data.fiscalNotes ? `
                <p>${data.fiscalNotes}</p>
                ` : `
                <p>QUESTO DOCUMENTO NON COSTITUISCE FATTURA A FINI FISCALI, CHE SARÀ EMESSA AL MOMENTO DEL PAGAMENTO.</p>
                ${data.isVatZero ? `
                <p>IVA 0% - OPERAZIONE NON SOGGETTA A IVA AI SENSI DELL'ART. 1, COMMI 54-89, LEGGE N. 190/2014 E SUCC. MODIFICHE/INTEGRAZIONI.</p>
                ` : ''}
                `}
            </div>
        </div>
    </div>
</body>
</html>
  `;
}
