/*
 * =========================================================
 * INTÉGRATION PAYDUNYA — PAIEMENT AUTOMATIQUE
 * =========================================================
 *
 * Ce fichier gère la communication avec PayDunya pour :
 * 1) Créer une "facture" de paiement (invoice) et obtenir
 *    un lien vers lequel rediriger le client.
 * 2) Vérifier, une fois le paiement fait, que c'est bien
 *    vrai en interrogeant PayDunya directement (jamais on
 *    ne fait confiance uniquement à la notification reçue,
 *    pour éviter qu'un fraudeur ne simule un faux paiement).
 *
 * Variables d'environnement nécessaires sur Render :
 * - PAYDUNYA_MASTER_KEY
 * - PAYDUNYA_PRIVATE_KEY
 * - PAYDUNYA_PUBLIC_KEY
 * - PAYDUNYA_TOKEN
 * - PAYDUNYA_MODE = "test" ou "live"
 */

const PAYDUNYA_API_BASE = "https://app.paydunya.com/api/v1";

function getHeaders() {
  return {
    "Content-Type": "application/json",
    "PAYDUNYA-MASTER-KEY": process.env.PAYDUNYA_MASTER_KEY,
    "PAYDUNYA-PRIVATE-KEY":
      process.env.PAYDUNYA_PRIVATE_KEY,
    "PAYDUNYA-PUBLIC-KEY": process.env.PAYDUNYA_PUBLIC_KEY,
    "PAYDUNYA-TOKEN": process.env.PAYDUNYA_TOKEN,
  };
}

export function isPayDunyaConfigured() {
  return Boolean(
    process.env.PAYDUNYA_MASTER_KEY &&
      process.env.PAYDUNYA_PRIVATE_KEY &&
      process.env.PAYDUNYA_PUBLIC_KEY &&
      process.env.PAYDUNYA_TOKEN
  );
}

/*
 * Crée une facture PayDunya pour une commande, et renvoie
 * le lien de paiement vers lequel rediriger le client.
 */
export async function createPayDunyaInvoice({
  orderNumber,
  amount,
  description,
  customerName,
  returnUrl,
  cancelUrl,
  ipnUrl,
}) {
  if (!isPayDunyaConfigured()) {
    throw new Error(
      "PayDunya n'est pas configuré sur ce serveur (clés manquantes)."
    );
  }

  const isTestMode =
    (process.env.PAYDUNYA_MODE || "test") === "test";

  const body = {
    invoice: {
      total_amount: amount,
      description: description,
    },
    store: {
      name: "Mon Commerce Sénégal",
    },
    actions: {
      cancel_url: cancelUrl,
      return_url: returnUrl,
      callback_url: ipnUrl,
    },
    custom_data: {
      order_number: orderNumber,
    },
  };

  const response = await fetch(
    PAYDUNYA_API_BASE +
      "/checkout-invoice/create" +
      (isTestMode ? "?test=1" : ""),
    {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(body),
    }
  );

  const data = await response.json();

  if (data.response_code !== "00") {
    throw new Error(
      data.response_text ||
        "Impossible de créer la facture PayDunya."
    );
  }

  return {
    token: data.token,
    paymentUrl:
      "https://paydunya.com/checkout/invoice/" +
      data.token,
  };
}

/*
 * Vérifie AUPRÈS DE PAYDUNYA (jamais en se fiant
 * uniquement à la notification reçue) qu'un paiement a
 * bien été effectué.
 */
export async function confirmPayDunyaInvoice(token) {
  const response = await fetch(
    PAYDUNYA_API_BASE +
      "/checkout-invoice/confirm/" +
      token,
    {
      method: "GET",
      headers: getHeaders(),
    }
  );

  const data = await response.json();

  return {
    isCompleted: data.status === "completed",
    orderNumber:
      data.custom_data &&
      data.custom_data.order_number,
    raw: data,
  };
}
