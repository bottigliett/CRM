import { verifyEmailConfig, sendEmail } from '../services/email.service';
import dotenv from 'dotenv';

dotenv.config();

async function testEmail() {
  console.log('🔍 Verificando configurazione email...');

  const isValid = await verifyEmailConfig();

  if (isValid) {
    console.log('✅ Configurazione email verificata con successo!');
    console.log('\n📧 Invio email di test...');

    // Invia email di test
    const success = await sendEmail(
      'davide@mismostudio.com', // Email di test
      '🎉 Test Sistema Notifiche CRM',
      `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #2563eb; color: white; padding: 20px; border-radius: 8px; text-align: center; }
            .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">✅ Sistema Email Configurato!</h1>
            </div>
            <div class="content">
              <p>Ciao!</p>
              <p>Questa è un'email di test per confermare che il sistema di notifiche del CRM è stato configurato correttamente.</p>
              <p><strong>Configurazione:</strong></p>
              <ul>
                <li>Server SMTP: smtp.hostinger.com</li>
                <li>Porta: 587 (TLS)</li>
                <li>Email: noreply@studiomismo.it</li>
              </ul>
              <p>Il sistema di notifiche è ora pronto per inviare:</p>
              <ul>
                <li>📅 Promemoria eventi</li>
                <li>✅ Notifiche assegnazione task</li>
                <li>📧 Eventi assegnati</li>
                <li>⚠️ Scadenze imminenti</li>
                <li>🚨 Task in ritardo</li>
              </ul>
            </div>
            <div class="footer">
              <p>Studio Mismo CRM - Sistema di notifiche automatico</p>
              <p>Questa è una email di test del sistema di notifiche.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      'Sistema Email Configurato! Il CRM è pronto per inviare notifiche via email.'
    );

    if (success) {
      console.log('✅ Email di test inviata con successo!');
      console.log('📬 Controlla la casella di davide@mismostudio.com');
    } else {
      console.log('❌ Errore nell\'invio dell\'email di test');
    }
  } else {
    console.log('❌ Configurazione email non valida');
    console.log('Verifica che la password sia corretta nel file .env');
  }
}

testEmail().catch(console.error);
