import crypto from "crypto";

/*
 * =========================================================
 * INTÉGRATION PAYTECH
 * =========================================================
 *
 * Ce fichier regroupe tout ce qui parle avec l'API PayTech
 * (https://paytech.sn). Il fait deux choses :
 *
 * 1. creerPaiementPaytech(...) → demande à PayTech de créer
 *    une page de paiement, et renvoie le lien vers lequel
 *    rediriger le client.
 *
 * 2. verifierIpnPaytech(...) → vérifie qu'une notification
 *    reçue vient bien de PayTech (et pas d'un imposteur qui
 *    essaierait de faire croire qu'une commande est payée).
 *
 * Variables d'environnement nécessaires (à définir sur
 * Render, jamais dans le code) :
 *
 *   PAYTECH_API_KEY
 *   PAYTECH_API_SECRET
 *   PAYTECH_ENV        → "test" ou "prod"
 *   BACKEND_URL        → ex: https://mon-commerce-backend.onrender.com
 *   FRONTEND_URL       → ex: https://mon-commerce-senegal.netlify.app
 */

const PAYTECH_API_URL =
  "https://paytech.sn/api/payment/request-payment";

export async function creerPaiementPaytech({
  itemName,
  montant,
  refCommande,
  customField,
}) {
  const apiKey = process.env.PAYTECH_API_KEY;
  const apiSecret = process.env.PAYTECH_API_SECRET;
  const env = process.env.PAYTECH_ENV || "test";

  const backendUrl =
    process.env.BACKEND_URL || "http://localhost:4000";
  const frontendUrl =
    process.env.FRONTEND_URL || "http://localhost:5173";

  if (!apiKey || !apiSecret) {
    throw new Error(
      "PAYTECH_API_KEY et PAYTECH_API_SECRET doivent être définies dans les variables d'environnement du backend."
    );
  }

  const body = {
    item_name: itemName,
    item_price: montant,
    currency: "XOF",
    ref_command: refCommande,
    command_name: itemName,
    env,
    ipn_url: backendUrl + "/api/paiement/ipn",
    success_url:
      frontendUrl +
      "/commande/confirmation/" +
      refCommande,
    cancel_url: frontendUrl + "/panier",
    custom_field: JSON.stringify(customField || {}),
  };

  let response;

  try {
    response = await fetch(PAYTECH_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        API_KEY: apiKey,
        API_SECRET: apiSecret,
      },
      body: JSON.stringify(body),
    });
  } catch (networkError) {
    throw new Error(
      "Impossible de contacter PayTech. Vérifie ta connexion internet."
    );
  }

  const data = await response.json().catch(function () {
    return {};
  });

  if (data.success !== 1) {
    throw new Error(
      data.message ||
        "PayTech a refusé la demande de paiement."
    );
  }

  return data; // { success: 1, token, redirect_url }
}

/*
 * Vérifie qu'une notification IPN vient bien de PayTech.
 * Méthode HMAC-SHA256 en priorité (recommandée par PayTech),
 * avec repli sur la comparaison des clés hachées si PayTech
 * n'envoie pas de champ hmac_compute.
 */
export function verifierIpnPaytech(body) {
  const apiKey = process.env.PAYTECH_API_KEY;
  const apiSecret = process.env.PAYTECH_API_SECRET;

  if (!apiKey || !apiSecret) {
    return false;
  }

  const {
    ref_command,
    hmac_compute,
    final_item_price,
    item_price,
    api_key_sha256,
    api_secret_sha256,
  } = body;

  if (hmac_compute) {
    const montant = final_item_price || item_price;
    const message = `${montant}|${ref_command}|${apiKey}`;

    const expectedHmac = crypto
      .createHmac("sha256", apiSecret)
      .update(message)
      .digest("hex");

    return expectedHmac === hmac_compute;
  }

  const expectedKeyHash = crypto
    .createHash("sha256")
    .update(apiKey)
    .digest("hex");

  const expectedSecretHash = crypto
    .createHash("sha256")
    .update(apiSecret)
    .digest("hex");

  return (
    expectedKeyHash === api_key_sha256 &&
    expectedSecretHash === api_secret_sha256
  );
}
