import nodemailer from "nodemailer";

/*
 * =========================================================
 * ENVOI D'EMAILS — MON COMMERCE SÉNÉGAL
 * =========================================================
 *
 * Utilise un compte Gmail existant pour envoyer les emails
 * (réinitialisation de mot de passe, etc.). Deux variables
 * d'environnement sont nécessaires sur Render :
 *
 * - GMAIL_USER : l'adresse Gmail complète
 *   (ex: assemg100@gmail.com)
 * - GMAIL_APP_PASSWORD : un "mot de passe d'application"
 *   généré depuis les paramètres de sécurité Google
 *   (PAS le mot de passe normal du compte Gmail).
 */

let transporter = null;

function getTransporter() {
  if (transporter) {
    return transporter;
  }

  if (
    !process.env.GMAIL_USER ||
    !process.env.GMAIL_APP_PASSWORD
  ) {
    return null;
  }

  transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    requireTLS: true,
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 15000,
  });

  return transporter;
}

export async function sendEmail({ to, subject, html }) {
  const activeTransporter = getTransporter();

  if (!activeTransporter) {
    console.warn(
      "⚠️  Envoi d'email désactivé : GMAIL_USER / GMAIL_APP_PASSWORD manquants."
    );
    return { sent: false };
  }

  await activeTransporter.sendMail({
    from:
      "Mon Commerce Sénégal <" +
      process.env.GMAIL_USER +
      ">",
    to,
    subject,
    html,
  });

  return { sent: true };
}
