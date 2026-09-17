import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import {
  getShops,
  getProducts,
  createOrder,
  initierPaiementPaytech,
  getTarifsLivraison,
} from "../data/api";

import PageTitle from "../components/PageTitle";

import "./Checkout.css";

function normaliserTexte(texte) {
  return texte
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function Checkout() {
  const navigate = useNavigate();

  const [cart, setCart] = useState([]);
  const [shops, setShops] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [tarifsLivraison, setTarifsLivraison] = useState({
    villes: [],
    parDefaut: { frais: 0, delai: "" },
  });

  const [form, setForm] = useState({
    name: "",
    phone: "",
    city: "",
    address: "",
    notes: "",
    paymentMethod: "paytech",
  });

  useEffect(() => {
    getTarifsLivraison()
      .then(setTarifsLivraison)
      .catch(function (error) {
        console.error(
          "Erreur chargement tarifs de livraison :",
          error
        );
      });
  }, []);

  useEffect(() => {
    const savedCart = localStorage.getItem(
      "mon-commerce-cart"
    );

    if (savedCart) {
      try {
        const parsedCart = JSON.parse(savedCart);

        if (Array.isArray(parsedCart)) {
          setCart(parsedCart);
        }
      } catch (error) {
        console.error(
          "Erreur lors du chargement du panier :",
          error
        );
      }
    }

    getShops()
      .then(setShops)
      .catch(function (error) {
        console.error(
          "Erreur lors du chargement des boutiques :",
          error
        );
      });
  }, []);

  function getShopById(id) {
    return (
      shops.find(function (shop) {
        return Number(shop.id) === Number(id);
      }) || null
    );
  }

  /*
   * =========================================================
   * BOUTIQUES DU PANIER
   * =========================================================
   *
   * Un panier peut contenir des produits de plusieurs
   * boutiques différentes. Comme chez Jumia, chaque
   * boutique livre son propre colis et a donc ses propres
   * frais de livraison.
   */
  const shopIdsInCart = [
    ...new Set(
      cart.map(function (product) {
        return Number(product.shopId);
      })
    ),
  ];

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previousForm) => ({
      ...previousForm,
      [name]: value,
    }));
  }

  const totalProducts = cart.reduce(function (sum, product) {
    return sum + (Number(product.quantity) || 0);
  }, 0);

  const total = cart.reduce(function (sum, product) {
    const price = Number(product.price) || 0;
    const quantity = Number(product.quantity) || 0;

    return sum + price * quantity;
  }, 0);

  const [appliedCoupon] = useState(function () {
    const saved = localStorage.getItem(
      "mon-commerce-coupon"
    );

    if (!saved) {
      return null;
    }

    try {
      return JSON.parse(saved);
    } catch (error) {
      return null;
    }
  });

  const reduction = !appliedCoupon
    ? 0
    : appliedCoupon.type === "percent"
    ? Math.round((total * appliedCoupon.value) / 100)
    : Math.min(appliedCoupon.value, total);

  const totalFinal = total - reduction;

  /*
   * =========================================================
   * LIVRAISON PAR BOUTIQUE (façon Jumia)
   * =========================================================
   *
   * Chaque boutique du panier a son propre tarif de
   * livraison par ville. Si elle n'a rien configuré, on
   * retombe sur le tarif par défaut de la plateforme
   * (réglé par l'admin) pour ne pas bloquer les boutiques
   * qui n'ont pas encore réglé leurs tarifs.
   */
  function trouverTarifVille(livraisonListe, ville) {
    return (livraisonListe || []).find(function (item) {
      return (
        normaliserTexte(item.ville) ===
        normaliserTexte(ville || "")
      );
    });
  }

  const livraisonParBoutique = shopIdsInCart.map(
    function (shopId) {
      const shop = getShopById(shopId);

      const tarifBoutiqueVille = trouverTarifVille(
        shop && shop.livraison,
        form.city
      );

      const tarifParDefautBoutique =
        shop &&
        shop.livraisonParDefaut &&
        Number(shop.livraisonParDefaut.frais) > 0
          ? shop.livraisonParDefaut
          : tarifsLivraison.parDefaut;

      const infos = form.city.trim()
        ? tarifBoutiqueVille || tarifParDefautBoutique
        : null;

      return {
        shopId,
        shopName: shop ? shop.name : "Boutique",
        frais: infos ? Number(infos.frais) || 0 : 0,
        delai: infos ? infos.delai || "" : "",
      };
    }
  );

  const fraisLivraison = livraisonParBoutique.reduce(
    function (sum, item) {
      return sum + item.frais;
    },
    0
  );

  const totalAvecLivraison = totalFinal + fraisLivraison;

  async function handleSubmit(event) {
    event.preventDefault();

    setSubmitError("");

    if (cart.length === 0) {
      alert("Votre panier est vide.");
      return;
    }

    if (
      !form.name.trim() ||
      !form.phone.trim() ||
      !form.city.trim() ||
      !form.address.trim()
    ) {
      alert(
        "Veuillez remplir tous les champs obligatoires."
      );
      return;
    }

    setSubmitting(true);

    try {
      /*
       * On récupère l'email du compte connecté
       * (si l'utilisateur est connecté) pour pouvoir
       * relier cette commande à son historique.
       */
      let customerEmail = "";

      const savedUser = localStorage.getItem(
        "mon-commerce-current-user"
      );

      if (savedUser) {
        try {
          const currentUser = JSON.parse(savedUser);

          if (currentUser && currentUser.email) {
            customerEmail = currentUser.email;
          }
        } catch (error) {
          console.error(
            "Erreur lors de la récupération du compte :",
            error
          );
        }
      }

      const orderProducts = cart.map(function (product) {
        const shop = getShopById(product.shopId);

        return {
          ...product,
          shopId: product.shopId,
          shopName: shop ? shop.name : "Boutique inconnue",
          shopCity: shop ? shop.city : "",
          shopCategory: shop ? shop.category : "",
        };
      });

      const order = await createOrder({
        customer: {
          name: form.name.trim(),
          phone: form.phone.trim(),
          city: form.city.trim(),
          address: form.address.trim(),
          notes: form.notes.trim(),
          email: customerEmail,
        },
        products: orderProducts,
        total: totalAvecLivraison,
        merchandiseTotal: totalFinal,
        totalProducts,
        paymentMethod: "paytech",
        couponCode: appliedCoupon
          ? appliedCoupon.code
          : "",
        discount: reduction,
        deliveryFee: fraisLivraison,
        deliveryEstimate: livraisonParBoutique
          .map(function (item) {
            return item.delai;
          })
          .filter(Boolean)
          .join(" / "),
        deliveryBreakdown: livraisonParBoutique,
      });

      localStorage.removeItem("mon-commerce-cart");
      localStorage.removeItem("mon-commerce-coupon");
      window.dispatchEvent(new Event("cartUpdated"));
      window.dispatchEvent(new Event("productsUpdated"));

      /*
       * Pour PayTech, on ne va pas directement à la page
       * de confirmation : on redirige d'abord le client
       * vers PayTech pour qu'il paie réellement. C'est
       * PayTech qui le renverra ensuite sur la page de
       * confirmation (via success_url) une fois payé.
       */
      if (form.paymentMethod === "paytech") {
        const { redirectUrl } = await initierPaiementPaytech(
          order.orderNumber,
          totalAvecLivraison,
          "Commande " + order.orderNumber
        );

        window.location.href = redirectUrl;
        return;
      }

      navigate(
        "/commande/confirmation/" + order.orderNumber
      );
    } catch (error) {
      setSubmitError(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (cart.length === 0) {
    return (
      <main className="checkout-page">
<PageTitle title="Finaliser ma commande" />
        <div className="checkout-container">
          <section className="checkout-empty">

            <div className="checkout-empty-icon">
              🛒
            </div>

            <h1>
              Votre panier est vide
            </h1>

            <p>
              Ajoutez des produits avant de
              passer une commande.
            </p>

            <Link
              to="/boutiques"
              className="checkout-back-button"
            >
              Découvrir les boutiques
            </Link>

          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="checkout-page">
<PageTitle title="Finaliser ma commande" />
      <div className="checkout-container">

        <div className="checkout-title">

          <span>
            COMMANDE
          </span>

          <h1>
            Finaliser ma commande
          </h1>

          <p>
            Remplissez vos informations pour
            recevoir votre commande.
          </p>

        </div>

        {submitError && (
          <div className="checkout-error">
            ⚠️ {submitError}
          </div>
        )}

        <div className="checkout-layout">

          <form
            className="checkout-form"
            onSubmit={handleSubmit}
          >

            <section className="checkout-card">

              <h2>
                Informations client
              </h2>

              <div className="form-group">

                <label htmlFor="name">
                  Nom complet *
                </label>

                <input
                  id="name"
                  name="name"
                  type="text"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Votre nom complet"
                  required
                />

              </div>

              <div className="form-group">

                <label htmlFor="phone">
                  Téléphone *
                </label>

                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="77 123 45 67"
                  required
                />

              </div>

              <div className="form-group">

                <label htmlFor="city">
                  Ville *
                </label>

                <input
                  id="city"
                  name="city"
                  type="text"
                  value={form.city}
                  onChange={handleChange}
                  placeholder="Dakar, Thiès..."
                  required
                />

              </div>

              <div className="form-group">

                <label htmlFor="address">
                  Adresse de livraison *
                </label>

                <textarea
                  id="address"
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                  placeholder="Quartier, rue, repère..."
                  rows="4"
                  required
                />

              </div>

              <div className="form-group">

                <label htmlFor="notes">
                  Notes supplémentaires
                </label>

                <textarea
                  id="notes"
                  name="notes"
                  value={form.notes}
                  onChange={handleChange}
                  placeholder="Instructions pour le commerçant..."
                  rows="3"
                />

              </div>

            </section>

            <section className="checkout-card">

              <h2>
                Mode de paiement
              </h2>

              <div className="payment-methods">

                <label className="payment-method-option selected">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="paytech"
                    checked
                    readOnly
                  />
                  <span className="payment-method-icon">
                    💳
                  </span>
                  <span>
                    <strong>Payer en ligne avec PayTech</strong>
                    <small>
                      Orange Money, Wave, Free Money ou carte
                      bancaire — paiement sécurisé et
                      confirmé automatiquement.
                    </small>
                  </span>
                </label>

              </div>

            </section>

            <button
              type="submit"
              className="place-order-button"
              disabled={submitting}
            >
              {submitting
                ? "Envoi en cours..."
                : "Confirmer la commande →"}
            </button>

          </form>

          <aside className="checkout-summary">

            <h2>
              Votre commande
            </h2>

            <div className="checkout-items">

              {cart.map((product) => {
                const price = Number(product.price) || 0;
                const quantity =
                  Number(product.quantity) || 0;
                const productTotal = price * quantity;

                const shop = getShopById(product.shopId);

                return (
                  <div
                    className="checkout-item"
                    key={product.id}
                  >

                    <div>

                      <strong>
                        {product.name}
                      </strong>

                      {shop && (
                        <span>
                          Boutique :{" "}
                          {shop.name}
                        </span>
                      )}

                      <span>
                        Quantité : {quantity}
                      </span>

                    </div>

                    <strong>
                      {productTotal.toLocaleString(
                        "fr-FR"
                      )}{" "}
                      F CFA
                    </strong>

                  </div>
                );
              })}

            </div>

            <div className="checkout-summary-line">

              <span>
                Articles
              </span>

              <span>
                {totalProducts}
              </span>

            </div>

            {reduction > 0 && (
              <div className="checkout-summary-line">

                <span>
                  Réduction ({appliedCoupon.code})
                </span>

                <span>
                  − {reduction.toLocaleString("fr-FR")}{" "}
                  F CFA
                </span>

              </div>
            )}

            {form.city.trim() &&
              livraisonParBoutique.map(function (item) {
                return (
                  <div
                    className="checkout-summary-line"
                    key={item.shopId}
                  >

                    <span>
                      Livraison — {item.shopName}
                      {item.delai
                        ? " (" + item.delai + ")"
                        : ""}
                    </span>

                    <span>
                      {item.frais > 0
                        ? "+ " +
                          item.frais.toLocaleString(
                            "fr-FR"
                          ) +
                          " F CFA"
                        : "Gratuite"}
                    </span>

                  </div>
                );
              })}

            <div className="checkout-summary-total">

              <span>
                Total
              </span>

              <strong>
                {totalAvecLivraison.toLocaleString(
                  "fr-FR"
                )}{" "}
                F CFA
              </strong>

            </div>

          </aside>

        </div>

      </div>
    </main>
  );
}

export default Checkout;
