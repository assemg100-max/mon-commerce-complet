/*
 * Calcule le prix affiché après une promotion directe
 * (fixée par le commerçant sur la fiche produit, pas un
 * code promo tapé par le client).
 */
export function prixApresPromo(product) {
  const prix = Number(product.price) || 0;
  const reduction = Number(product.discountPercent) || 0;

  if (reduction <= 0) {
    return prix;
  }

  return Math.round(prix * (1 - reduction / 100));
}

export function enPromotion(product) {
  return Number(product.discountPercent) > 0;
}
