/*
 * =========================================================
 * VALIDATION DES NUMÉROS DE TÉLÉPHONE SÉNÉGALAIS
 * =========================================================
 *
 * Accepte les formats courants :
 *   77 123 45 67
 *   771234567
 *   +221 77 123 45 67
 *   00221771234567
 *
 * Les numéros sénégalais commencent par 7 (mobile) et
 * comptent 9 chiffres après l'indicatif +221.
 */
export function telephoneEstValide(valeur) {
  if (!valeur) {
    return false;
  }

  const chiffres = valeur
    .replace(/^\+?221/, "")
    .replace(/^00221/, "")
    .replace(/\D/g, "");

  return /^7[0-9]{8}$/.test(chiffres);
}

export function formaterMessageErreurTelephone() {
  return (
    "Merci d'indiquer un numéro de téléphone sénégalais " +
    "valide (ex : 77 123 45 67)."
  );
}
