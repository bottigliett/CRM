import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

// Email configuration from Hostinger
function getEmailConfig() {
  const password = process.env.MAIL_PASSWORD;

  if (!password) {
    console.warn('⚠️ MAIL_PASSWORD non configurata nel file .env');
  }

  return {
    host: 'smtp.hostinger.com',
    port: 587,
    secure: false, // TLS
    auth: {
      user: 'noreply@studiomismo.it',
      pass: password || '',
    },
  };
}

const FROM_EMAIL = {
  name: 'Studio Mismo CRM',
  address: 'noreply@studiomismo.it',
};

// Create reusable transporter
let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport(getEmailConfig());
  }
  return transporter;
}

// Email templates
interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

function getEventReminderTemplate(
  eventTitle: string,
  eventStart: Date,
  reminderTime: string,
  eventLink?: string
): EmailTemplate {
  const formattedDate = new Intl.DateTimeFormat('it-IT', {
    dateStyle: 'full',
    timeStyle: 'short',
  }).format(eventStart);

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #1a1a1a;
          margin: 0;
          padding: 0;
          background-color: #f5f5f5;
        }
        .container {
          max-width: 600px;
          margin: 40px auto;
          background: white;
          border: 1px solid #e0e0e0;
        }
        .header {
          background: #000000;
          color: white;
          padding: 30px;
          border-bottom: 3px solid #333333;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
          font-weight: 600;
          letter-spacing: -0.5px;
        }
        .content {
          padding: 40px 30px;
          background: white;
        }
        .content p {
          margin: 0 0 16px 0;
          color: #333333;
        }
        .event-details {
          background: #fafafa;
          padding: 24px;
          margin: 24px 0;
          border: 1px solid #e0e0e0;
          border-left: 4px solid #000000;
        }
        .event-details h2 {
          margin: 0 0 16px 0;
          color: #000000;
          font-size: 20px;
          font-weight: 600;
        }
        .event-details p {
          margin: 8px 0;
          color: #333333;
        }
        .button {
          display: inline-block;
          padding: 14px 28px;
          background: #000000;
          color: white;
          text-decoration: none;
          margin: 20px 0;
          font-weight: 500;
          border: 2px solid #000000;
          transition: all 0.2s;
        }
        .button:hover {
          background: #333333;
          border-color: #333333;
        }
        .footer {
          text-align: center;
          padding: 24px 30px;
          background: #fafafa;
          border-top: 1px solid #e0e0e0;
          color: #666666;
          font-size: 13px;
        }
        .footer p {
          margin: 4px 0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Promemoria Evento</h1>
        </div>
        <div class="content">
          <p>Gentile utente,</p>
          <p>Questo è un promemoria per il seguente evento ${reminderTime}:</p>

          <div class="event-details">
            <h2>${eventTitle}</h2>
            <p><strong>Data e ora:</strong> ${formattedDate}</p>
          </div>

          ${eventLink ? `<a href="${eventLink}" class="button">Visualizza Evento</a>` : ''}

          <p>Cordiali saluti,<br>Il team di Studio Mismo</p>
        </div>
        <div class="footer">
          <p><strong>Studio Mismo CRM</strong></p>
          <p>Questa è una email automatica, si prega di non rispondere a questo messaggio.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
Promemoria Evento

Gentile utente,

Questo è un promemoria per il seguente evento ${reminderTime}:

Evento: ${eventTitle}
Data e ora: ${formattedDate}

${eventLink ? `Visualizza evento: ${eventLink}` : ''}

Cordiali saluti,
Il team di Studio Mismo

--
Studio Mismo CRM
Questa è una email automatica, si prega di non rispondere a questo messaggio.
  `.trim();

  return {
    subject: `Promemoria: ${eventTitle}`,
    html,
    text,
  };
}

function getEventAssignedTemplate(
  eventTitle: string,
  eventStart: Date,
  assignedBy: string,
  eventLink?: string
): EmailTemplate {
  const formattedDate = new Intl.DateTimeFormat('it-IT', {
    dateStyle: 'full',
    timeStyle: 'short',
  }).format(eventStart);

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #1a1a1a;
          margin: 0;
          padding: 0;
          background-color: #f5f5f5;
        }
        .container {
          max-width: 600px;
          margin: 40px auto;
          background: white;
          border: 1px solid #e0e0e0;
        }
        .header {
          background: #000000;
          color: white;
          padding: 30px;
          border-bottom: 3px solid #333333;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
          font-weight: 600;
          letter-spacing: -0.5px;
        }
        .content {
          padding: 40px 30px;
          background: white;
        }
        .content p {
          margin: 0 0 16px 0;
          color: #333333;
        }
        .event-details {
          background: #fafafa;
          padding: 24px;
          margin: 24px 0;
          border: 1px solid #e0e0e0;
          border-left: 4px solid #000000;
        }
        .event-details h2 {
          margin: 0 0 16px 0;
          color: #000000;
          font-size: 20px;
          font-weight: 600;
        }
        .event-details p {
          margin: 8px 0;
          color: #333333;
        }
        .button {
          display: inline-block;
          padding: 14px 28px;
          background: #000000;
          color: white;
          text-decoration: none;
          margin: 20px 0;
          font-weight: 500;
          border: 2px solid #000000;
        }
        .footer {
          text-align: center;
          padding: 24px 30px;
          background: #fafafa;
          border-top: 1px solid #e0e0e0;
          color: #666666;
          font-size: 13px;
        }
        .footer p {
          margin: 4px 0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Nuovo Evento Assegnato</h1>
        </div>
        <div class="content">
          <p>Gentile utente,</p>
          <p>Le è stato assegnato un nuovo evento da <strong>${assignedBy}</strong>:</p>

          <div class="event-details">
            <h2>${eventTitle}</h2>
            <p><strong>Data e ora:</strong> ${formattedDate}</p>
            <p><strong>Assegnato da:</strong> ${assignedBy}</p>
          </div>

          ${eventLink ? `<a href="${eventLink}" class="button">Visualizza Evento</a>` : ''}

          <p>Cordiali saluti,<br>Il team di Studio Mismo</p>
        </div>
        <div class="footer">
          <p><strong>Studio Mismo CRM</strong></p>
          <p>Questa è una email automatica, si prega di non rispondere a questo messaggio.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
Nuovo Evento Assegnato

Gentile utente,

Le è stato assegnato un nuovo evento da ${assignedBy}:

Evento: ${eventTitle}
Data e ora: ${formattedDate}
Assegnato da: ${assignedBy}

${eventLink ? `Visualizza evento: ${eventLink}` : ''}

Cordiali saluti,
Il team di Studio Mismo

--
Studio Mismo CRM
Questa è una email automatica, si prega di non rispondere a questo messaggio.
  `.trim();

  return {
    subject: `Nuovo evento assegnato: ${eventTitle}`,
    html,
    text,
  };
}

function getTaskAssignedTemplate(
  taskTitle: string,
  taskDueDate: Date | null,
  assignedBy: string,
  taskLink?: string
): EmailTemplate {
  const formattedDueDate = taskDueDate
    ? new Intl.DateTimeFormat('it-IT', {
        dateStyle: 'full',
      }).format(taskDueDate)
    : 'Nessuna scadenza';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #1a1a1a;
          margin: 0;
          padding: 0;
          background-color: #f5f5f5;
        }
        .container {
          max-width: 600px;
          margin: 40px auto;
          background: white;
          border: 1px solid #e0e0e0;
        }
        .header {
          background: #000000;
          color: white;
          padding: 30px;
          border-bottom: 3px solid #333333;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
          font-weight: 600;
          letter-spacing: -0.5px;
        }
        .content {
          padding: 40px 30px;
          background: white;
        }
        .content p {
          margin: 0 0 16px 0;
          color: #333333;
        }
        .task-details {
          background: #fafafa;
          padding: 24px;
          margin: 24px 0;
          border: 1px solid #e0e0e0;
          border-left: 4px solid #000000;
        }
        .task-details h2 {
          margin: 0 0 16px 0;
          color: #000000;
          font-size: 20px;
          font-weight: 600;
        }
        .task-details p {
          margin: 8px 0;
          color: #333333;
        }
        .button {
          display: inline-block;
          padding: 14px 28px;
          background: #000000;
          color: white;
          text-decoration: none;
          margin: 20px 0;
          font-weight: 500;
          border: 2px solid #000000;
        }
        .footer {
          text-align: center;
          padding: 24px 30px;
          background: #fafafa;
          border-top: 1px solid #e0e0e0;
          color: #666666;
          font-size: 13px;
        }
        .footer p {
          margin: 4px 0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Nuova Task Assegnata</h1>
        </div>
        <div class="content">
          <p>Gentile utente,</p>
          <p>Le è stata assegnata una nuova task da <strong>${assignedBy}</strong>:</p>

          <div class="task-details">
            <h2>${taskTitle}</h2>
            <p><strong>Scadenza:</strong> ${formattedDueDate}</p>
            <p><strong>Assegnato da:</strong> ${assignedBy}</p>
          </div>

          ${taskLink ? `<a href="${taskLink}" class="button">Visualizza Task</a>` : ''}

          <p>Cordiali saluti,<br>Il team di Studio Mismo</p>
        </div>
        <div class="footer">
          <p><strong>Studio Mismo CRM</strong></p>
          <p>Questa è una email automatica, si prega di non rispondere a questo messaggio.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
Nuova Task Assegnata

Gentile utente,

Le è stata assegnata una nuova task da ${assignedBy}:

Task: ${taskTitle}
Scadenza: ${formattedDueDate}
Assegnato da: ${assignedBy}

${taskLink ? `Visualizza task: ${taskLink}` : ''}

Cordiali saluti,
Il team di Studio Mismo

--
Studio Mismo CRM
Questa è una email automatica, si prega di non rispondere a questo messaggio.
  `.trim();

  return {
    subject: `Nuova task assegnata: ${taskTitle}`,
    html,
    text,
  };
}

function getTaskDueSoonTemplate(
  taskTitle: string,
  taskDueDate: Date,
  taskLink?: string
): EmailTemplate {
  const formattedDueDate = new Intl.DateTimeFormat('it-IT', {
    dateStyle: 'full',
    timeStyle: 'short',
  }).format(taskDueDate);

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #1a1a1a;
          margin: 0;
          padding: 0;
          background-color: #f5f5f5;
        }
        .container {
          max-width: 600px;
          margin: 40px auto;
          background: white;
          border: 1px solid #e0e0e0;
        }
        .header {
          background: #000000;
          color: white;
          padding: 30px;
          border-bottom: 3px solid #333333;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
          font-weight: 600;
          letter-spacing: -0.5px;
        }
        .content {
          padding: 40px 30px;
          background: white;
        }
        .content p {
          margin: 0 0 16px 0;
          color: #333333;
        }
        .task-details {
          background: #fafafa;
          padding: 24px;
          margin: 24px 0;
          border: 1px solid #e0e0e0;
          border-left: 4px solid #000000;
        }
        .task-details h2 {
          margin: 0 0 16px 0;
          color: #000000;
          font-size: 20px;
          font-weight: 600;
        }
        .task-details p {
          margin: 8px 0;
          color: #333333;
        }
        .button {
          display: inline-block;
          padding: 14px 28px;
          background: #000000;
          color: white;
          text-decoration: none;
          margin: 20px 0;
          font-weight: 500;
          border: 2px solid #000000;
        }
        .footer {
          text-align: center;
          padding: 24px 30px;
          background: #fafafa;
          border-top: 1px solid #e0e0e0;
          color: #666666;
          font-size: 13px;
        }
        .footer p {
          margin: 4px 0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Scadenza Task Imminente</h1>
        </div>
        <div class="content">
          <p>Gentile utente,</p>
          <p>La seguente task è in scadenza a breve:</p>

          <div class="task-details">
            <h2>${taskTitle}</h2>
            <p><strong>Scadenza:</strong> ${formattedDueDate}</p>
          </div>

          ${taskLink ? `<a href="${taskLink}" class="button">Visualizza Task</a>` : ''}

          <p>La preghiamo di completarla in tempo.</p>
          <p>Cordiali saluti,<br>Il team di Studio Mismo</p>
        </div>
        <div class="footer">
          <p><strong>Studio Mismo CRM</strong></p>
          <p>Questa è una email automatica, si prega di non rispondere a questo messaggio.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
Scadenza Task Imminente

Gentile utente,

La seguente task è in scadenza a breve:

Task: ${taskTitle}
Scadenza: ${formattedDueDate}

${taskLink ? `Visualizza task: ${taskLink}` : ''}

La preghiamo di completarla in tempo.

Cordiali saluti,
Il team di Studio Mismo

--
Studio Mismo CRM
Questa è una email automatica, si prega di non rispondere a questo messaggio.
  `.trim();

  return {
    subject: `Scadenza imminente: ${taskTitle}`,
    html,
    text,
  };
}

function getClientActivationCodeTemplate(
  clientName: string,
  verificationCode: string
): EmailTemplate {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #1a1a1a;
          margin: 0;
          padding: 0;
          background-color: #f5f5f5;
        }
        .container {
          max-width: 600px;
          margin: 40px auto;
          background: white;
          border: 1px solid #e0e0e0;
        }
        .header {
          background: #000000;
          color: white;
          padding: 30px;
          border-bottom: 3px solid #333333;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
          font-weight: 600;
          letter-spacing: -0.5px;
        }
        .content {
          padding: 40px 30px;
          background: white;
        }
        .content p {
          margin: 0 0 16px 0;
          color: #333333;
        }
        .code-box {
          background: #fafafa;
          padding: 30px;
          margin: 24px 0;
          border: 1px solid #e0e0e0;
          border-left: 4px solid #000000;
          text-align: center;
        }
        .code {
          font-size: 32px;
          font-weight: 700;
          letter-spacing: 8px;
          color: #000000;
          font-family: 'Courier New', monospace;
          margin: 16px 0;
        }
        .footer {
          text-align: center;
          padding: 24px 30px;
          background: #fafafa;
          border-top: 1px solid #e0e0e0;
          color: #666666;
          font-size: 13px;
        }
        .footer p {
          margin: 4px 0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Codice di Verifica</h1>
        </div>
        <div class="content">
          <p>Gentile ${clientName},</p>
          <p>Ecco il tuo codice di verifica per attivare il tuo account cliente:</p>

          <div class="code-box">
            <p style="margin: 0; color: #666; font-size: 14px;">Il tuo codice è:</p>
            <div class="code">${verificationCode}</div>
            <p style="margin: 0; color: #666; font-size: 13px;">Inserisci questo codice nella pagina di attivazione</p>
          </div>

          <p>Il codice è valido per 15 minuti.</p>
          <p>Se non hai richiesto questo codice, ignora questa email.</p>

          <p>Cordiali saluti,<br>Il team di Studio Mismo</p>
        </div>
        <div class="footer">
          <p><strong>Studio Mismo CRM</strong></p>
          <p>Questa è una email automatica, si prega di non rispondere a questo messaggio.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
Codice di Verifica

Gentile ${clientName},

Ecco il tuo codice di verifica per attivare il tuo account cliente:

${verificationCode}

Il codice è valido per 15 minuti.
Se non hai richiesto questo codice, ignora questa email.

Cordiali saluti,
Il team di Studio Mismo

--
Studio Mismo CRM
Questa è una email automatica, si prega di non rispondere a questo messaggio.
  `.trim();

  return {
    subject: 'Codice di Verifica - Studio Mismo',
    html,
    text,
  };
}

function getTaskOverdueTemplate(
  taskTitle: string,
  taskDueDate: Date,
  taskLink?: string
): EmailTemplate {
  const formattedDueDate = new Intl.DateTimeFormat('it-IT', {
    dateStyle: 'full',
    timeStyle: 'short',
  }).format(taskDueDate);

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #1a1a1a;
          margin: 0;
          padding: 0;
          background-color: #f5f5f5;
        }
        .container {
          max-width: 600px;
          margin: 40px auto;
          background: white;
          border: 1px solid #e0e0e0;
        }
        .header {
          background: #000000;
          color: white;
          padding: 30px;
          border-bottom: 3px solid #333333;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
          font-weight: 600;
          letter-spacing: -0.5px;
        }
        .content {
          padding: 40px 30px;
          background: white;
        }
        .content p {
          margin: 0 0 16px 0;
          color: #333333;
        }
        .task-details {
          background: #fafafa;
          padding: 24px;
          margin: 24px 0;
          border: 1px solid #e0e0e0;
          border-left: 4px solid #000000;
        }
        .task-details h2 {
          margin: 0 0 16px 0;
          color: #000000;
          font-size: 20px;
          font-weight: 600;
        }
        .task-details p {
          margin: 8px 0;
          color: #333333;
        }
        .button {
          display: inline-block;
          padding: 14px 28px;
          background: #000000;
          color: white;
          text-decoration: none;
          margin: 20px 0;
          font-weight: 500;
          border: 2px solid #000000;
        }
        .footer {
          text-align: center;
          padding: 24px 30px;
          background: #fafafa;
          border-top: 1px solid #e0e0e0;
          color: #666666;
          font-size: 13px;
        }
        .footer p {
          margin: 4px 0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Task in Ritardo</h1>
        </div>
        <div class="content">
          <p>Gentile utente,</p>
          <p>La seguente task è in ritardo:</p>

          <div class="task-details">
            <h2>${taskTitle}</h2>
            <p><strong>Scadenza:</strong> ${formattedDueDate}</p>
          </div>

          ${taskLink ? `<a href="${taskLink}" class="button">Visualizza Task</a>` : ''}

          <p>La preghiamo di completarla il prima possibile.</p>
          <p>Cordiali saluti,<br>Il team di Studio Mismo</p>
        </div>
        <div class="footer">
          <p><strong>Studio Mismo CRM</strong></p>
          <p>Questa è una email automatica, si prega di non rispondere a questo messaggio.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
Task in Ritardo

Gentile utente,

La seguente task è in ritardo:

Task: ${taskTitle}
Scadenza: ${formattedDueDate}

${taskLink ? `Visualizza task: ${taskLink}` : ''}

La preghiamo di completarla il prima possibile.

Cordiali saluti,
Il team di Studio Mismo

--
Studio Mismo CRM
Questa è una email automatica, si prega di non rispondere a questo messaggio.
  `.trim();

  return {
    subject: `Task in ritardo: ${taskTitle}`,
    html,
    text,
  };
}

// Main send email function
export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  text: string
): Promise<boolean> {
  try {
    const mailOptions = {
      from: {
        name: FROM_EMAIL.name,
        address: FROM_EMAIL.address,
      },
      to,
      subject,
      html,
      text,
    };

    const info = await getTransporter().sendMail(mailOptions);
    console.log(`Email inviata a ${to}: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error('Errore nell\'invio dell\'email:', error);
    return false;
  }
}

// Convenience functions for specific notification types
export async function sendEventReminderEmail(
  to: string,
  eventTitle: string,
  eventStart: Date,
  reminderTime: string,
  eventLink?: string
): Promise<boolean> {
  const template = getEventReminderTemplate(eventTitle, eventStart, reminderTime, eventLink);
  return sendEmail(to, template.subject, template.html, template.text);
}

export async function sendEventAssignedEmail(
  to: string,
  eventTitle: string,
  eventStart: Date,
  assignedBy: string,
  eventLink?: string
): Promise<boolean> {
  const template = getEventAssignedTemplate(eventTitle, eventStart, assignedBy, eventLink);
  return sendEmail(to, template.subject, template.html, template.text);
}

export async function sendTaskAssignedEmail(
  to: string,
  taskTitle: string,
  taskDueDate: Date | null,
  assignedBy: string,
  taskLink?: string
): Promise<boolean> {
  const template = getTaskAssignedTemplate(taskTitle, taskDueDate, assignedBy, taskLink);
  return sendEmail(to, template.subject, template.html, template.text);
}

export async function sendTaskDueSoonEmail(
  to: string,
  taskTitle: string,
  taskDueDate: Date,
  taskLink?: string
): Promise<boolean> {
  const template = getTaskDueSoonTemplate(taskTitle, taskDueDate, taskLink);
  return sendEmail(to, template.subject, template.html, template.text);
}

export async function sendTaskOverdueEmail(
  to: string,
  taskTitle: string,
  taskDueDate: Date,
  taskLink?: string
): Promise<boolean> {
  const template = getTaskOverdueTemplate(taskTitle, taskDueDate, taskLink);
  return sendEmail(to, template.subject, template.html, template.text);
}

export async function sendClientActivationCodeEmail(
  to: string,
  clientName: string,
  verificationCode: string
): Promise<boolean> {
  const template = getClientActivationCodeTemplate(clientName, verificationCode);
  return sendEmail(to, template.subject, template.html, template.text);
}

/**
 * Send email to client when a task is assigned
 */
export async function sendClientTaskAssignedEmail(
  to: string,
  clientName: string,
  taskTitle: string,
  taskDeadline: Date,
  taskDescription?: string
): Promise<boolean> {
  const subject = `Nuovo Task Assegnato: ${taskTitle}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">Nuovo Task Assegnato</h2>
      <p>Gentile ${clientName},</p>
      <p>Ti è stato assegnato un nuovo task:</p>
      <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #1f2937;">${taskTitle}</h3>
        ${taskDescription ? `<p style="color: #4b5563;">${taskDescription}</p>` : ''}
        <p style="margin-bottom: 0;"><strong>Scadenza:</strong> ${taskDeadline.toLocaleDateString('it-IT')}</p>
      </div>
      <p>Accedi al tuo portale cliente per visualizzare i dettagli e seguire i progressi.</p>
      <p>Cordiali saluti,<br>Il Team di MismoStudio</p>
    </div>
  `;
  const text = `Nuovo Task Assegnato: ${taskTitle}\n\nScadenza: ${taskDeadline.toLocaleDateString('it-IT')}\n${taskDescription || ''}`;
  return sendEmail(to, subject, html, text);
}

/**
 * Send email to client when an event/appointment is created
 */
export async function sendClientEventCreatedEmail(
  to: string,
  clientName: string,
  eventTitle: string,
  eventStart: Date,
  eventLocation?: string
): Promise<boolean> {
  const subject = `Nuovo Appuntamento: ${eventTitle}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">Nuovo Appuntamento</h2>
      <p>Gentile ${clientName},</p>
      <p>È stato creato un nuovo appuntamento:</p>
      <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #1f2937;">${eventTitle}</h3>
        <p><strong>Data e Ora:</strong> ${eventStart.toLocaleString('it-IT')}</p>
        ${eventLocation ? `<p><strong>Luogo:</strong> ${eventLocation}</p>` : ''}
      </div>
      <p>Accedi al tuo portale cliente per visualizzare tutti i dettagli.</p>
      <p>Cordiali saluti,<br>Il Team di MismoStudio</p>
    </div>
  `;
  const text = `Nuovo Appuntamento: ${eventTitle}\n\nData: ${eventStart.toLocaleString('it-IT')}\n${eventLocation ? `Luogo: ${eventLocation}` : ''}`;
  return sendEmail(to, subject, html, text);
}

/**
 * Send email to client when a new invoice is created
 */
export async function sendClientInvoiceCreatedEmail(
  to: string,
  clientName: string,
  invoiceNumber: string,
  invoiceTotal: number,
  invoiceDueDate: Date
): Promise<boolean> {
  const subject = `Nuova Fattura: ${invoiceNumber}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">Nuova Fattura Emessa</h2>
      <p>Gentile ${clientName},</p>
      <p>È stata emessa una nuova fattura:</p>
      <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #1f2937;">Fattura ${invoiceNumber}</h3>
        <p><strong>Importo:</strong> €${invoiceTotal.toFixed(2)}</p>
        <p style="margin-bottom: 0;"><strong>Scadenza:</strong> ${invoiceDueDate.toLocaleDateString('it-IT')}</p>
      </div>
      <p>Accedi al tuo portale cliente per visualizzare e scaricare la fattura.</p>
      <p>Cordiali saluti,<br>Il Team di MismoStudio</p>
    </div>
  `;
  const text = `Nuova Fattura: ${invoiceNumber}\n\nImporto: €${invoiceTotal.toFixed(2)}\nScadenza: ${invoiceDueDate.toLocaleDateString('it-IT')}`;
  return sendEmail(to, subject, html, text);
}

/**
 * Send email to client when a new quote is shared
 */
export async function sendClientQuoteSharedEmail(
  to: string,
  clientName: string,
  quoteNumber: string,
  quoteTotal: number
): Promise<boolean> {
  const subject = `Nuovo Preventivo: ${quoteNumber}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">Nuovo Preventivo Disponibile</h2>
      <p>Gentile ${clientName},</p>
      <p>È stato preparato un nuovo preventivo per te:</p>
      <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #1f2937;">Preventivo ${quoteNumber}</h3>
        <p style="margin-bottom: 0;"><strong>Importo Totale:</strong> €${quoteTotal.toFixed(2)}</p>
      </div>
      <p>Accedi al tuo portale cliente per visualizzare tutti i dettagli del preventivo.</p>
      <p>Cordiali saluti,<br>Il Team di MismoStudio</p>
    </div>
  `;
  const text = `Nuovo Preventivo: ${quoteNumber}\n\nImporto: €${quoteTotal.toFixed(2)}`;
  return sendEmail(to, subject, html, text);
}

/**
 * Send email to client when admin replies to their ticket
 */
export async function sendClientTicketReplyEmail(
  to: string,
  clientName: string,
  ticketNumber: string,
  ticketSubject: string
): Promise<boolean> {
  const subject = `Risposta al Ticket ${ticketNumber}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">Nuova Risposta al Tuo Ticket</h2>
      <p>Gentile ${clientName},</p>
      <p>Il nostro team ha risposto al tuo ticket di supporto:</p>
      <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #1f2937;">Ticket ${ticketNumber}</h3>
        <p style="margin-bottom: 0;"><strong>Oggetto:</strong> ${ticketSubject}</p>
      </div>
      <p>Accedi al tuo portale cliente per visualizzare la risposta completa.</p>
      <p>Cordiali saluti,<br>Il Team di MismoStudio</p>
    </div>
  `;
  const text = `Risposta al Ticket ${ticketNumber}: ${ticketSubject}`;
  return sendEmail(to, subject, html, text);
}

/**
 * Send email to client when a ticket is closed
 */
export async function sendClientTicketClosedEmail(
  to: string,
  clientName: string,
  ticketNumber: string,
  ticketSubject: string,
  closingNotes?: string
): Promise<boolean> {
  const subject = `Ticket ${ticketNumber} Risolto`;
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #1a1a1a;
          margin: 0;
          padding: 0;
          background-color: #f5f5f5;
        }
        .container {
          max-width: 600px;
          margin: 40px auto;
          background: white;
          border: 1px solid #e0e0e0;
        }
        .header {
          background: #16a34a;
          color: white;
          padding: 30px;
          border-bottom: 3px solid #15803d;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
          font-weight: 600;
          letter-spacing: -0.5px;
        }
        .content {
          padding: 40px 30px;
          background: white;
        }
        .content p {
          margin: 0 0 16px 0;
          color: #333333;
        }
        .ticket-details {
          background: #f0fdf4;
          padding: 24px;
          margin: 24px 0;
          border: 1px solid #bbf7d0;
          border-left: 4px solid #16a34a;
        }
        .ticket-details h2 {
          margin: 0 0 16px 0;
          color: #16a34a;
          font-size: 20px;
          font-weight: 600;
        }
        .ticket-details p {
          margin: 8px 0;
          color: #333333;
        }
        .closing-notes {
          background: #fafafa;
          padding: 20px;
          margin: 20px 0;
          border-left: 4px solid #000000;
          font-style: italic;
        }
        .footer {
          text-align: center;
          padding: 24px 30px;
          background: #fafafa;
          border-top: 1px solid #e0e0e0;
          color: #666666;
          font-size: 13px;
        }
        .footer p {
          margin: 4px 0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Ticket Risolto</h1>
        </div>
        <div class="content">
          <p>Gentile ${clientName},</p>
          <p>Il tuo ticket di supporto è stato risolto dal nostro team:</p>

          <div class="ticket-details">
            <h2>Ticket ${ticketNumber}</h2>
            <p><strong>Oggetto:</strong> ${ticketSubject}</p>
          </div>

          ${closingNotes ? `
            <p><strong>Note di chiusura:</strong></p>
            <div class="closing-notes">
              ${closingNotes}
            </div>
          ` : ''}

          <p>Se hai ulteriori domande o il problema persiste, non esitare ad aprire un nuovo ticket.</p>
          <p>Grazie per averci contattato!</p>

          <p>Cordiali saluti,<br>Il Team di Studio Mismo</p>
        </div>
        <div class="footer">
          <p><strong>Studio Mismo CRM</strong></p>
          <p>Questa è una email automatica, si prega di non rispondere a questo messaggio.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
Ticket Risolto

Gentile ${clientName},

Il tuo ticket di supporto è stato risolto dal nostro team:

Ticket: ${ticketNumber}
Oggetto: ${ticketSubject}

${closingNotes ? `Note di chiusura:\n${closingNotes}\n\n` : ''}

Se hai ulteriori domande o il problema persiste, non esitare ad aprire un nuovo ticket.

Grazie per averci contattato!

Cordiali saluti,
Il Team di Studio Mismo

--
Studio Mismo CRM
Questa è una email automatica, si prega di non rispondere a questo messaggio.
  `.trim();

  return sendEmail(to, subject, html, text);
}

/**
 * Send email to admin when a quote is accepted by a client
 */
export async function sendAdminQuoteAcceptedEmail(
  to: string,
  clientName: string,
  quoteNumber: string,
  quoteTitle: string,
  selectedPackage: string,
  selectedPaymentOption: string,
  totalAmount: number
): Promise<boolean> {
  const paymentLabels: { [key: string]: string } = {
    oneTime: 'Pagamento Unico',
    payment2: '2 Rate',
    payment3: '3 Rate',
    payment4: '4 Rate',
  };

  const paymentLabel = paymentLabels[selectedPaymentOption] || selectedPaymentOption;

  const subject = `Preventivo Accettato: ${quoteNumber}`;
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #1a1a1a;
          margin: 0;
          padding: 0;
          background-color: #f5f5f5;
        }
        .container {
          max-width: 600px;
          margin: 40px auto;
          background: white;
          border: 1px solid #e0e0e0;
        }
        .header {
          background: #16a34a;
          color: white;
          padding: 30px;
          border-bottom: 3px solid #15803d;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
          font-weight: 600;
          letter-spacing: -0.5px;
        }
        .content {
          padding: 40px 30px;
          background: white;
        }
        .content p {
          margin: 0 0 16px 0;
          color: #333333;
        }
        .quote-details {
          background: #f0fdf4;
          padding: 24px;
          margin: 24px 0;
          border: 1px solid #bbf7d0;
          border-left: 4px solid #16a34a;
        }
        .quote-details h2 {
          margin: 0 0 16px 0;
          color: #16a34a;
          font-size: 20px;
          font-weight: 600;
        }
        .quote-details p {
          margin: 8px 0;
          color: #333333;
        }
        .highlight {
          background: #dcfce7;
          padding: 16px;
          margin: 16px 0;
          border-radius: 6px;
          text-align: center;
          font-size: 24px;
          font-weight: 700;
          color: #16a34a;
        }
        .footer {
          text-align: center;
          padding: 24px 30px;
          background: #fafafa;
          border-top: 1px solid #e0e0e0;
          color: #666666;
          font-size: 13px;
        }
        .footer p {
          margin: 4px 0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Preventivo Accettato!</h1>
        </div>
        <div class="content">
          <p><strong>Buone notizie!</strong></p>
          <p>Il cliente <strong>${clientName}</strong> ha accettato il preventivo:</p>

          <div class="quote-details">
            <h2>${quoteTitle}</h2>
            <p><strong>Numero Preventivo:</strong> ${quoteNumber}</p>
            <p><strong>Cliente:</strong> ${clientName}</p>
            <p><strong>Pacchetto Selezionato:</strong> ${selectedPackage}</p>
            <p><strong>Modalità di Pagamento:</strong> ${paymentLabel}</p>
          </div>

          <div class="highlight">
            €${totalAmount.toFixed(2)}
          </div>

          <p>Accedi al CRM per visualizzare tutti i dettagli e organizzare i prossimi passi con il cliente.</p>

          <p>Cordiali saluti,<br>Il Sistema CRM Studio Mismo</p>
        </div>
        <div class="footer">
          <p><strong>Studio Mismo CRM</strong></p>
          <p>Questa è una email automatica, si prega di non rispondere a questo messaggio.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
Preventivo Accettato!

Il cliente ${clientName} ha accettato il preventivo:

Preventivo: ${quoteNumber}
Titolo: ${quoteTitle}
Cliente: ${clientName}
Pacchetto: ${selectedPackage}
Modalità di Pagamento: ${paymentLabel}
Importo: €${totalAmount.toFixed(2)}

Accedi al CRM per visualizzare tutti i dettagli.

--
Studio Mismo CRM
Questa è una email automatica, si prega di non rispondere a questo messaggio.
  `.trim();

  return sendEmail(to, subject, html, text);
}

/**
 * Send thank you email to client after accepting a quote
 */
export async function sendClientQuoteAcceptedEmail(
  to: string,
  clientName: string,
  quoteNumber: string,
  quoteTitle: string
): Promise<boolean> {
  const subject = `Grazie per aver accettato la nostra proposta!`;
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #1a1a1a;
          margin: 0;
          padding: 0;
          background-color: #f5f5f5;
        }
        .container {
          max-width: 600px;
          margin: 40px auto;
          background: white;
          border: 1px solid #e0e0e0;
        }
        .header {
          background: #000000;
          color: white;
          padding: 30px;
          border-bottom: 3px solid #333333;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
          font-weight: 600;
          letter-spacing: -0.5px;
        }
        .content {
          padding: 40px 30px;
          background: white;
        }
        .content p {
          margin: 0 0 16px 0;
          color: #333333;
        }
        .highlight-box {
          background: #fafafa;
          padding: 24px;
          margin: 24px 0;
          border: 1px solid #e0e0e0;
          border-left: 4px solid #000000;
          text-align: center;
        }
        .highlight-box h2 {
          margin: 0 0 8px 0;
          color: #000000;
          font-size: 20px;
          font-weight: 600;
        }
        .highlight-box p {
          margin: 4px 0;
          color: #666666;
          font-size: 14px;
        }
        .social-links {
          text-align: center;
          margin: 24px 0;
          padding: 20px;
          background: #fafafa;
          border-radius: 8px;
        }
        .social-links p {
          margin: 8px 0;
          font-size: 14px;
        }
        .social-links a {
          color: #000000;
          text-decoration: none;
          font-weight: 500;
        }
        .footer {
          text-align: center;
          padding: 24px 30px;
          background: #fafafa;
          border-top: 1px solid #e0e0e0;
          color: #666666;
          font-size: 13px;
        }
        .footer p {
          margin: 4px 0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Grazie per la fiducia!</h1>
        </div>
        <div class="content">
          <p>Gentile ${clientName},</p>
          <p><strong>Grazie per aver accettato la nostra proposta!</strong></p>
          <p>Siamo entusiasti di iniziare questa collaborazione con te.</p>

          <div class="highlight-box">
            <h2>${quoteTitle}</h2>
            <p>Preventivo ${quoteNumber}</p>
          </div>

          <p>Ti contatteremo entro <strong>2 giorni lavorativi</strong> per discutere i prossimi passi e organizzare tutto nel dettaglio.</p>

          <p>Nel frattempo, se hai domande o necessiti di ulteriori informazioni, non esitare a contattarci.</p>

          <div class="social-links">
            <p><strong>Seguici sui nostri canali:</strong></p>
            <p>
              <a href="https://www.instagram.com/studiomismo/" target="_blank">Instagram</a> •
              <a href="https://studiomismo.com" target="_blank">Sito Web</a>
            </p>
          </div>

          <p>A presto!<br><strong>Il Team di Studio Mismo</strong></p>
        </div>
        <div class="footer">
          <p><strong>Studio Mismo</strong></p>
          <p>Questa è una email automatica, si prega di non rispondere a questo messaggio.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
Grazie per aver accettato la nostra proposta!

Gentile ${clientName},

Grazie per aver accettato la nostra proposta di collaborazione!

Preventivo: ${quoteNumber}
Progetto: ${quoteTitle}

Ti contatteremo entro 2 giorni lavorativi per organizzare i prossimi passi.

Nel frattempo, seguici sui nostri canali:
• Instagram: https://www.instagram.com/studiomismo/
• Sito Web: https://studiomismo.com

A presto!
Il Team di Studio Mismo

--
Studio Mismo
Questa è una email automatica, si prega di non rispondere a questo messaggio.
  `.trim();

  return sendEmail(to, subject, html, text);
}

/**
 * Send email to admins when a client creates a new ticket
 */
export async function sendAdminNewTicketEmail(
  adminEmails: string[],
  clientName: string,
  ticketNumber: string,
  ticketSubject: string,
  ticketPriority: string,
  ticketType: string
): Promise<boolean> {
  const priorityLabels: { [key: string]: string } = {
    LOW: 'Bassa',
    NORMAL: 'Normale',
    HIGH: 'Alta',
    URGENT: 'Urgente',
  };

  const typeLabels: { [key: string]: string } = {
    TECHNICAL: 'Tecnico',
    DESIGN: 'Design',
    CONTENT: 'Contenuti',
    BILLING: 'Fatturazione',
    OTHER: 'Altro',
  };

  const priorityLabel = priorityLabels[ticketPriority] || ticketPriority;
  const typeLabel = typeLabels[ticketType] || ticketType;

  const subject = `Nuovo Ticket: ${ticketNumber} da ${clientName}`;
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #1a1a1a;
          margin: 0;
          padding: 0;
          background-color: #f5f5f5;
        }
        .container {
          max-width: 600px;
          margin: 40px auto;
          background: white;
          border: 1px solid #e0e0e0;
        }
        .header {
          background: #2563eb;
          color: white;
          padding: 30px;
          border-bottom: 3px solid #1e40af;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
          font-weight: 600;
          letter-spacing: -0.5px;
        }
        .content {
          padding: 40px 30px;
          background: white;
        }
        .content p {
          margin: 0 0 16px 0;
          color: #333333;
        }
        .ticket-details {
          background: #eff6ff;
          padding: 24px;
          margin: 24px 0;
          border: 1px solid #bfdbfe;
          border-left: 4px solid #2563eb;
        }
        .ticket-details h2 {
          margin: 0 0 16px 0;
          color: #2563eb;
          font-size: 20px;
          font-weight: 600;
        }
        .ticket-details p {
          margin: 8px 0;
          color: #333333;
        }
        .badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
          margin-right: 8px;
        }
        .badge-priority-high, .badge-priority-urgent {
          background: #fee2e2;
          color: #991b1b;
        }
        .badge-priority-normal {
          background: #fef3c7;
          color: #92400e;
        }
        .badge-priority-low {
          background: #dbeafe;
          color: #1e40af;
        }
        .footer {
          text-align: center;
          padding: 24px 30px;
          background: #fafafa;
          border-top: 1px solid #e0e0e0;
          color: #666666;
          font-size: 13px;
        }
        .footer p {
          margin: 4px 0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Nuovo Ticket di Supporto</h1>
        </div>
        <div class="content">
          <p><strong>Un cliente ha aperto un nuovo ticket di supporto:</strong></p>

          <div class="ticket-details">
            <h2>${ticketSubject}</h2>
            <p><strong>Ticket:</strong> ${ticketNumber}</p>
            <p><strong>Cliente:</strong> ${clientName}</p>
            <p><strong>Tipo:</strong> ${typeLabel}</p>
            <p>
              <span class="badge badge-priority-${ticketPriority.toLowerCase()}">${priorityLabel}</span>
            </p>
          </div>

          <p>Accedi al CRM per visualizzare tutti i dettagli e rispondere al cliente.</p>

          <p>Cordiali saluti,<br>Il Sistema CRM Studio Mismo</p>
        </div>
        <div class="footer">
          <p><strong>Studio Mismo CRM</strong></p>
          <p>Questa è una email automatica, si prega di non rispondere a questo messaggio.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
Nuovo Ticket di Supporto

Un cliente ha aperto un nuovo ticket di supporto:

Ticket: ${ticketNumber}
Oggetto: ${ticketSubject}
Cliente: ${clientName}
Tipo: ${typeLabel}
Priorità: ${priorityLabel}

Accedi al CRM per visualizzare tutti i dettagli e rispondere al cliente.

--
Studio Mismo CRM
Questa è una email automatica, si prega di non rispondere a questo messaggio.
  `.trim();

  // Send email to all admins
  try {
    for (const adminEmail of adminEmails) {
      await sendEmail(adminEmail, subject, html, text);
    }
    return true;
  } catch (error) {
    console.error('Error sending admin notification emails:', error);
    return false;
  }
}

/**
 * Send email notification to admins when a client replies to a ticket
 */
export async function sendAdminTicketReplyEmail(
  adminEmails: string[],
  clientName: string,
  ticketNumber: string,
  ticketSubject: string,
  messagePreview: string
): Promise<boolean> {
  // Truncate message preview
  const preview = messagePreview.length > 200 ? messagePreview.substring(0, 200) + '...' : messagePreview;

  const subject = `Nuova Risposta - Ticket ${ticketNumber}`;
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #1a1a1a;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background: #ffffff;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .header {
          background: linear-gradient(135deg, #2563eb, #1d4ed8);
          color: white;
          padding: 24px 30px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
          font-weight: 600;
        }
        .content {
          padding: 30px;
        }
        .message-box {
          background: #f3f4f6;
          border-radius: 8px;
          padding: 20px;
          margin: 20px 0;
          border-left: 4px solid #2563eb;
        }
        .message-box p {
          margin: 0;
          color: #333333;
          white-space: pre-wrap;
        }
        .footer {
          text-align: center;
          padding: 24px 30px;
          background: #fafafa;
          border-top: 1px solid #e0e0e0;
          color: #666666;
          font-size: 13px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Nuova Risposta al Ticket</h1>
        </div>
        <div class="content">
          <p><strong>${clientName}</strong> ha risposto al ticket:</p>

          <p><strong>Ticket:</strong> ${ticketNumber}<br>
          <strong>Oggetto:</strong> ${ticketSubject}</p>

          <div class="message-box">
            <p>${preview}</p>
          </div>

          <p>Accedi al CRM per visualizzare il messaggio completo e rispondere.</p>

          <p>Cordiali saluti,<br>Il Sistema CRM Studio Mismo</p>
        </div>
        <div class="footer">
          <p><strong>Studio Mismo CRM</strong></p>
          <p>Questa è una email automatica, si prega di non rispondere a questo messaggio.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
Nuova Risposta al Ticket

${clientName} ha risposto al ticket:

Ticket: ${ticketNumber}
Oggetto: ${ticketSubject}

Messaggio:
${preview}

Accedi al CRM per visualizzare il messaggio completo e rispondere.

--
Studio Mismo CRM
Questa è una email automatica, si prega di non rispondere a questo messaggio.
  `.trim();

  try {
    for (const adminEmail of adminEmails) {
      await sendEmail(adminEmail, subject, html, text);
    }
    return true;
  } catch (error) {
    console.error('Error sending admin ticket reply notification emails:', error);
    return false;
  }
}

/**
 * Send email to admins when a quote is rejected by a client
 */
export async function sendAdminQuoteRejectedEmail(
  adminEmails: string[],
  clientName: string,
  quoteNumber: string,
  quoteTitle: string,
  rejectionReason: string
): Promise<boolean> {
  const subject = `Preventivo Rifiutato: ${quoteNumber}`;
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #1a1a1a;
          margin: 0;
          padding: 0;
          background-color: #f5f5f5;
        }
        .container {
          max-width: 600px;
          margin: 40px auto;
          background: white;
          border: 1px solid #e0e0e0;
        }
        .header {
          background: #dc2626;
          color: white;
          padding: 30px;
          border-bottom: 3px solid #b91c1c;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
          font-weight: 600;
          letter-spacing: -0.5px;
        }
        .content {
          padding: 40px 30px;
          background: white;
        }
        .content p {
          margin: 0 0 16px 0;
          color: #333333;
        }
        .quote-details {
          background: #fef2f2;
          padding: 24px;
          margin: 24px 0;
          border: 1px solid #fecaca;
          border-left: 4px solid #dc2626;
        }
        .quote-details h2 {
          margin: 0 0 16px 0;
          color: #dc2626;
          font-size: 20px;
          font-weight: 600;
        }
        .quote-details p {
          margin: 8px 0;
          color: #333333;
        }
        .reason-box {
          background: #fafafa;
          padding: 20px;
          margin: 20px 0;
          border-left: 4px solid #666666;
          font-style: italic;
        }
        .footer {
          text-align: center;
          padding: 24px 30px;
          background: #fafafa;
          border-top: 1px solid #e0e0e0;
          color: #666666;
          font-size: 13px;
        }
        .footer p {
          margin: 4px 0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Preventivo Rifiutato</h1>
        </div>
        <div class="content">
          <p>Il cliente <strong>${clientName}</strong> ha rifiutato il preventivo:</p>

          <div class="quote-details">
            <h2>${quoteTitle}</h2>
            <p><strong>Numero Preventivo:</strong> ${quoteNumber}</p>
            <p><strong>Cliente:</strong> ${clientName}</p>
          </div>

          <p><strong>Motivo del rifiuto:</strong></p>
          <div class="reason-box">
            ${rejectionReason || 'Nessun motivo specificato'}
          </div>

          <p>Accedi al CRM per visualizzare tutti i dettagli.</p>

          <p>Cordiali saluti,<br>Il Sistema CRM Studio Mismo</p>
        </div>
        <div class="footer">
          <p><strong>Studio Mismo CRM</strong></p>
          <p>Questa è una email automatica, si prega di non rispondere a questo messaggio.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
Preventivo Rifiutato

Il cliente ${clientName} ha rifiutato il preventivo:

Preventivo: ${quoteNumber}
Titolo: ${quoteTitle}
Cliente: ${clientName}

Motivo del rifiuto:
${rejectionReason || 'Nessun motivo specificato'}

Accedi al CRM per visualizzare tutti i dettagli.

--
Studio Mismo CRM
Questa è una email automatica, si prega di non rispondere a questo messaggio.
  `.trim();

  try {
    for (const adminEmail of adminEmails) {
      await sendEmail(adminEmail, subject, html, text);
    }
    return true;
  } catch (error) {
    console.error('Error sending admin quote rejected emails:', error);
    return false;
  }
}

/**
 * Send "sorry" email to client when they reject a quote
 */
export async function sendClientQuoteRejectedEmail(
  to: string,
  clientName: string,
  quoteNumber: string,
  quoteTitle: string
): Promise<boolean> {
  const whatsappNumber = '+39 375 620 9885';
  const whatsappLink = 'https://wa.me/393756209885';

  const subject = `Ci dispiace vederti andare - ${quoteTitle}`;
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #1a1a1a;
          margin: 0;
          padding: 0;
          background-color: #f5f5f5;
        }
        .container {
          max-width: 600px;
          margin: 40px auto;
          background: white;
          border: 1px solid #e0e0e0;
        }
        .header {
          background: #000000;
          color: white;
          padding: 30px;
          border-bottom: 3px solid #333333;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
          font-weight: 600;
          letter-spacing: -0.5px;
        }
        .content {
          padding: 40px 30px;
          background: white;
        }
        .content p {
          margin: 0 0 16px 0;
          color: #333333;
        }
        .highlight-box {
          background: #fafafa;
          padding: 24px;
          margin: 24px 0;
          border: 1px solid #e0e0e0;
          border-left: 4px solid #000000;
          text-align: center;
        }
        .highlight-box h2 {
          margin: 0 0 8px 0;
          color: #000000;
          font-size: 20px;
          font-weight: 600;
        }
        .highlight-box p {
          margin: 4px 0;
          color: #666666;
          font-size: 14px;
        }
        .whatsapp-box {
          background: #dcfce7;
          border: 2px solid #22c55e;
          border-radius: 12px;
          padding: 24px;
          margin: 24px 0;
          text-align: center;
        }
        .whatsapp-box p {
          margin: 8px 0;
        }
        .whatsapp-button {
          display: inline-block;
          padding: 14px 28px;
          background: #22c55e;
          color: white !important;
          text-decoration: none;
          margin: 16px 0;
          font-weight: 600;
          border-radius: 8px;
          font-size: 16px;
        }
        .phone-number {
          font-size: 20px;
          font-weight: 700;
          color: #000000;
          margin: 12px 0;
        }
        .footer {
          text-align: center;
          padding: 24px 30px;
          background: #fafafa;
          border-top: 1px solid #e0e0e0;
          color: #666666;
          font-size: 13px;
        }
        .footer p {
          margin: 4px 0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Ci dispiace vederti andare</h1>
        </div>
        <div class="content">
          <p>Gentile ${clientName},</p>
          <p>Abbiamo ricevuto la tua decisione di non procedere con la nostra proposta.</p>

          <p><strong>Ci dispiace molto!</strong> Sappiamo che ogni progetto è unico e che le esigenze possono cambiare.</p>

          <div class="highlight-box">
            <h2>${quoteTitle}</h2>
            <p>Preventivo ${quoteNumber}</p>
          </div>

          <p>Se hai cambiato idea, se vuoi discutere di modifiche alla proposta, o semplicemente se hai domande, <strong>siamo sempre qui per te</strong>.</p>

          <div class="whatsapp-box">
            <p><strong>Contattaci direttamente su WhatsApp:</strong></p>
            <p class="phone-number">${whatsappNumber}</p>
            <a href="${whatsappLink}" class="whatsapp-button" target="_blank">💬 Scrivici su WhatsApp</a>
            <p style="font-size: 13px; color: #666;">Risponderemo il prima possibile!</p>
          </div>

          <p>Ti auguriamo il meglio per i tuoi progetti futuri e speriamo di poterti aiutare in un'altra occasione.</p>

          <p>Un caro saluto,<br><strong>Il Team di Studio Mismo</strong></p>
        </div>
        <div class="footer">
          <p><strong>Studio Mismo</strong></p>
          <p>Questa è una email automatica, si prega di non rispondere a questo messaggio.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
Ci dispiace vederti andare

Gentile ${clientName},

Abbiamo ricevuto la tua decisione di non procedere con la nostra proposta.

Ci dispiace molto! Sappiamo che ogni progetto è unico e che le esigenze possono cambiare.

Preventivo: ${quoteNumber}
Progetto: ${quoteTitle}

Se hai cambiato idea, se vuoi discutere di modifiche alla proposta, o semplicemente se hai domande, siamo sempre qui per te.

Contattaci su WhatsApp: ${whatsappNumber}
${whatsappLink}

Ti auguriamo il meglio per i tuoi progetti futuri e speriamo di poterti aiutare in un'altra occasione.

Un caro saluto,
Il Team di Studio Mismo

--
Studio Mismo
Questa è una email automatica, si prega di non rispondere a questo messaggio.
  `.trim();

  return sendEmail(to, subject, html, text);
}

// Verify transporter configuration
export async function verifyEmailConfig(): Promise<boolean> {
  try {
    await getTransporter().verify();
    console.log('Configurazione email verificata con successo');
    return true;
  } catch (error) {
    console.error('Errore nella configurazione email:', error);
    return false;
  }
}
