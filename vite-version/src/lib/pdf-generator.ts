import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface InvoicePDFData {
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  paymentDays: number;
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
  // Payment entity info
  paymentBeneficiary?: string;
  paymentIban?: string;
  paymentBank?: string;
  paymentBic?: string;
  paymentSdi?: string;
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
    // Using scale 1.5 for good quality while keeping file size reasonable
    const canvas = await html2canvas(content, {
      scale: 1.5,
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

    // Use JPEG format with compression for smaller file size (quality 0.85)
    const imgData = canvas.toDataURL('image/jpeg', 0.85);
    const imgWidth = pdfWidth;
    const imgHeight = (canvas.height * pdfWidth) / canvas.width;

    // Add the invoice to a single page
    // If content is taller than one page, scale it to fit
    if (imgHeight > pdfHeight) {
      // Scale down to fit one page
      const scaledWidth = (pdfHeight * canvas.width) / canvas.height;
      const xOffset = (pdfWidth - scaledWidth) / 2;
      pdf.addImage(imgData, 'JPEG', xOffset, 0, scaledWidth, pdfHeight);
    } else {
      // Content fits on one page, add normally
      pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight);
    }

    // Download the PDF
    pdf.save(`Fattura_${data.invoiceNumber.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
  } finally {
    // Clean up
    document.body.removeChild(iframe);
  }
}

function getInvoiceHTML(data: InvoicePDFData): string {
  const paymentBank = data.paymentBank || 'REVOLUT BANK UAB';
  const paymentIban = data.paymentIban || 'LT95 3250 0482 6617 5203';
  const paymentBeneficiary = data.paymentBeneficiary || 'STEFANO COSTATO E DAVIDE MARANGONI';
  const paymentBic = data.paymentBic || 'REVOLT21';
  const paymentSdi = data.paymentSdi || 'JI3TXCE';
  const isImmediate = data.paymentDays === 0;

  return `
<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Fattura ${data.invoiceNumber}</title>
    <link rel="stylesheet" href="https://use.typekit.net/ekm2csm.css">
    <style>
        @page { size: A4; margin: 10mm; }
        * {
            box-sizing: border-box;
            font-size: 12px;
            font-weight: 500;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
        }
        html, body { height: 100%; margin: 0; }
        body {
            background: #fff;
            color: #000;
            font-family: "Elza", -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
            line-height: 1.35;
        }
        .page-wrapper {
            width: 210mm;
            height: 297mm;
            margin: 0 auto;
            padding: 10mm;
            background: #fff;
            display: flex;
            flex-direction: column;
        }
        .content { flex: 1; }
        .top {
            display: grid;
            grid-template-columns: 1fr 1fr;
            column-gap: 18mm;
        }
        .block { display: block; margin: 0; }
        .meta {
            justify-self: end;
            max-width: 78mm;
            width: 100%;
        }
        .meta-row {
            display: grid;
            grid-template-columns: 1fr auto;
            column-gap: 10mm;
        }
        .meta-value { text-align: right; white-space: nowrap; }
        .section { margin-top: 18mm; }
        .section-title { margin: 0 0 2mm 0; font-size: 12px; font-weight: 500; }
        .client-lines { display: block; margin: 0; }
        .object-lines { margin: 0; }
        .services { margin-top: 10mm; }
        table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
        }
        col:nth-child(1) { width: 58%; }
        col:nth-child(2) { width: 14%; }
        col:nth-child(3) { width: 14%; }
        col:nth-child(4) { width: 14%; }
        thead th {
            border-bottom: 1px solid #000;
            padding-bottom: 1mm;
            font-size: 9px;
            text-align: left;
            font-weight: 500;
        }
        thead th:nth-child(2), thead th:nth-child(3) { text-align: center; }
        thead th:nth-child(4) { text-align: right; }
        tbody td {
            border-bottom: 1px solid #000;
            padding: 2mm 0;
        }
        tbody td:nth-child(2), tbody td:nth-child(3) {
            text-align: center;
            white-space: nowrap;
        }
        tbody td:nth-child(4) {
            text-align: right;
            white-space: nowrap;
        }
        .total-row {
            display: grid;
            grid-template-columns: 1fr auto;
            margin-top: 10mm;
        }
        .total-value { text-align: right; }
        .footer { margin-top: 20mm; }
        .kv {
            display: grid;
            grid-template-columns: 38mm 1fr;
            column-gap: 6mm;
            margin-bottom: 12mm;
        }
        .v { white-space: pre-line; }
        .notes { margin: 0; width: 50%; font-size: 9px; }
    </style>
</head>
<body>
    <div class="page-wrapper">
        <div class="content">
            <header class="top">
                <div>
                    <span class="block">MISMO®STUDIO</span>
                    <span class="block">di Stefano Costato e Davide Marangoni</span>
                    <span class="block">P.IVA IT04904900232 / IT05052740239</span>
                    <span class="block">hi@mismo.studio</span>
                    <span class="block">(+39) 375 620 9885</span>
                    <span class="block">Via Madonna 14 - 37026</span>
                    <span class="block">Pescantina / Verona - IT</span>
                </div>
                <div class="meta">
                    <div class="meta-row">
                        <div>Fattura numero</div>
                        <div class="meta-value">${data.invoiceNumber}</div>
                    </div>
                    <div class="meta-row">
                        <div>Data</div>
                        <div class="meta-value">${data.invoiceDate}</div>
                    </div>
                    <div class="meta-row">
                        <div>Scadenza</div>
                        <div class="meta-value">${isImmediate ? 'Immediato' : data.paymentDays + ' giorni'}</div>
                    </div>
                </div>
            </header>

            <section class="section">
                <h2 class="section-title">Cliente</h2>
                <span class="client-lines">${data.clientName}</span>
                ${data.clientPIva ? `<span class="client-lines">P.IVA ${data.clientPIva}</span>` : ''}
                ${data.clientCF ? `<span class="client-lines">C.F. ${data.clientCF}</span>` : ''}
                ${data.clientAddress ? `<span class="client-lines">${data.clientAddress}</span>` : ''}
            </section>

            <section class="section">
                <h2 class="section-title">Oggetto</h2>
                <p class="object-lines">${data.subject}</p>
            </section>

            <section class="services">
                <table>
                    <colgroup><col><col><col><col></colgroup>
                    <thead>
                        <tr>
                            <th>Servizio</th>
                            <th>Quantità</th>
                            <th>IVA</th>
                            <th>Prezzo cad.</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.services && data.services.length > 0 ?
                            data.services.map(service => `
                                <tr>
                                    <td>${service.description}</td>
                                    <td>${service.quantity}</td>
                                    <td>${data.vatPercentage}%</td>
                                    <td>${service.unitPrice} EUR</td>
                                </tr>
                            `).join('')
                        : ''}
                    </tbody>
                </table>

                <div class="total-row">
                    <div>Totale</div>
                    <div class="total-value">${data.total} EUR</div>
                </div>
            </section>
        </div>

        <footer class="footer">
            <h2 class="section-title">Informazioni per il pagamento</h2>
            <div class="kv">
                <div>Scadenze</div><div class="v">${isImmediate ? 'Immediato' : data.dueDate}: ${data.total} EUR</div>
                <div>Beneficiario</div><div class="v">${paymentBeneficiary}</div>
                <div>IBAN</div><div class="v">${paymentIban}</div>
                <div>Banca</div><div class="v">${paymentBank}</div>
                ${paymentBic ? `<div>BIC</div><div class="v">${paymentBic}</div>` : ''}
                ${paymentSdi ? `<div>SDI</div><div class="v">${paymentSdi}</div>` : ''}
            </div>

            <h2 class="section-title">Annotazioni</h2>
            <p class="notes">
                ${data.fiscalNotes ? data.fiscalNotes : `${data.isVatZero ? 'IVA 0% - Operazione non soggetta a IVA ai sensi della legge 190/2014.\n\n' : ''}Questo documento non costituisce fattura fiscale, che sarà emessa al pagamento.`}
            </p>
        </footer>
    </div>
</body>
</html>
  `;
}
