const nodemailer = require('nodemailer');
const axios = require('axios');
const config = require('../config');

/**
 * Envoie un email via Resend API ou SMTP fallback
 */
async function sendEmail({ to, subject, html }) {
  // 1. Essai Resend API
  if (config.RESEND_API_KEY && config.RESEND_API_KEY !== 're_CONFIGURE_ME') {
    try {
      await axios.post('https://api.resend.com/emails', {
        from: 'Cépage <noreply@resend.dev>',
        to, subject, html,
      }, {
        headers: { Authorization: `Bearer ${config.RESEND_API_KEY}` },
        timeout: 10000,
      });
      return true;
    } catch (err) {
      console.warn('Resend API failed:', err.message);
    }
  }

  // 2. Fallback SMTP (Gmail)
  if (config.SMTP_USER && config.SMTP_PASSWORD) {
    try {
      const transporter = nodemailer.createTransporter({
        service: 'gmail',
        auth: { user: config.SMTP_USER, pass: config.SMTP_PASSWORD },
      });
      await transporter.sendMail({ from: config.SMTP_USER, to, subject, html });
      return true;
    } catch (err) {
      console.warn('SMTP failed:', err.message);
    }
  }

  // 3. Dev mode log
  console.log(`[EMAIL DEV] To: ${to} | Subject: ${subject}`);
  return false;
}

/**
 * Email de réinitialisation de mot de passe
 */
function sendResetEmail(to, resetLink) {
  return sendEmail({
    to,
    subject: 'Réinitialisation de votre mot de passe Cépage',
    html: `
      <h2>Réinitialisation de mot de passe</h2>
      <p>Cliquez sur le lien ci-dessous pour réinitialiser votre mot de passe :</p>
      <a href="${resetLink}" style="background:#6366F1;color:white;padding:12px 24px;border-radius:8px;text-decoration:none">
        Réinitialiser mon mot de passe
      </a>
      <p>Ce lien expire dans 1 heure.</p>
      <p>Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</p>
    `,
  });
}

/**
 * Email de vérification d'adresse email
 */
function sendVerifyEmail(to, verifyLink) {
  return sendEmail({
    to,
    subject: 'Vérifiez votre adresse email Cépage',
    html: `
      <h2>Vérification de votre email</h2>
      <p>Cliquez sur le lien ci-dessous pour vérifier votre adresse email :</p>
      <a href="${verifyLink}" style="background:#6366F1;color:white;padding:12px 24px;border-radius:8px;text-decoration:none">
        Vérifier mon email
      </a>
      <p>Ce lien expire dans 24 heures.</p>
    `,
  });
}

module.exports = { sendEmail, sendResetEmail, sendVerifyEmail };
