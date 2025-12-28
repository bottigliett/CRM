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
