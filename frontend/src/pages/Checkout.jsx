import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import {
  getShops,
  getProducts,
  createOrder,
} from "../data/api";

import PageTitle from "../components/PageTitle";

import "./Checkout.css";

function Checkout() {
  const navigate = useNavigate();

  const [cart, setCart] = useState([]);
  const [shops, setShops] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const [form, setForm] = useState({
    name: "",
    phone: "",
    city: "",
    address: "",
    notes: "",
    paymentMethod: "cod",
    paymentReference: "",
  });

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
   * Comme chaque boutique a maintenant son propre numéro
   * Mobile Money, le paiement direct par Orange Money/Wave
   * n'est proposé que si TOUS les produits du panier
   * viennent de la MÊME boutique (sinon, il faudrait payer
   * plusieurs commerçants différents en une seule commande).
   */
  const shopIdsInCart = [
    ...new Set(
      cart.map(function (product) {
        return Number(product.shopId);
      })
    ),
  ];

  const singleShop =
    shopIdsInCart.length === 1
      ? getShopById(shopIdsInCart[0])
      : null;

  const canPayByMobileMoney = Boolean(singleShop);

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

    if (
      form.paymentMethod !== "cod" &&
      !canPayByMobileMoney
    ) {
      alert(
        "Le paiement Mobile Money n'est disponible que pour une commande d'une seule boutique à la fois."
      );
      return;
    }

    if (
      form.paymentMethod !== "cod" &&
      !form.paymentReference.trim()
    ) {
      alert(
        "Veuillez indiquer la référence de votre transaction Mobile Money."
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
        total,
        totalProducts,
        paymentMethod: form.paymentMethod,
        paymentReference: form.paymentReference.trim(),
      });

      localStorage.removeItem("mon-commerce-cart");
      window.dispatchEvent(new Event("cartUpdated"));
      window.dispatchEvent(new Event("productsUpdated"));

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

                <label
                  className={
                    "payment-method-option" +
                    (form.paymentMethod === "cod"
                      ? " selected"
                      : "")
                  }
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="cod"
                    checked={form.paymentMethod === "cod"}
                    onChange={handleChange}
                  />
                  <span className="payment-method-icon">
                    💵
                  </span>
                  <span>
                    <strong>Paiement à la livraison</strong>
                    <small>
                      Vous payez en espèces quand vous
                      recevez votre commande.
                    </small>
                  </span>
                </label>

                <label
                  className={
                    "payment-method-option" +
                    (!canPayByMobileMoney
                      ? " disabled"
                      : "") +
                    (form.paymentMethod === "orange_money"
                      ? " selected"
                      : "")
                  }
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="orange_money"
                    disabled={!canPayByMobileMoney}
                    checked={
                      form.paymentMethod === "orange_money"
                    }
                    onChange={handleChange}
                  />
                  <span className="payment-method-icon">
                    🟠
                  </span>
                  <span>
                    <strong>Orange Money</strong>
                    <small>
                      {canPayByMobileMoney
                        ? "Envoyez le montant, puis indiquez la référence de la transaction."
                        : "Disponible uniquement pour une commande d'une seule boutique."}
                    </small>
                  </span>
                </label>

                <label
                  className={
                    "payment-method-option" +
                    (!canPayByMobileMoney
                      ? " disabled"
                      : "") +
                    (form.paymentMethod === "wave"
                      ? " selected"
                      : "")
                  }
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="wave"
                    disabled={!canPayByMobileMoney}
                    checked={form.paymentMethod === "wave"}
                    onChange={handleChange}
                  />
                  <span className="payment-method-icon">
                    🔵
                  </span>
                  <span>
                    <strong>Wave</strong>
                    <small>
                      {canPayByMobileMoney
                        ? "Envoyez le montant, puis indiquez la référence de la transaction."
                        : "Disponible uniquement pour une commande d'une seule boutique."}
                    </small>
                  </span>
                </label>

              </div>

              {form.paymentMethod === "orange_money" && (
                <div className="payment-instructions">

                  <p>
                    Envoyez{" "}
                    <strong>
                      {total.toLocaleString("fr-FR")}{" "}
                      F CFA
                    </strong>{" "}
                    via Orange Money directement à{" "}
                    <strong>
                      {singleShop
                        ? singleShop.name
                        : "la boutique"}
                    </strong>{" "}
                    au numéro :
                  </p>

                  <strong className="payment-number">
                    {(singleShop &&
                      singleShop.orangeMoneyNumber) ||
                      "Ce commerçant n'a pas encore configuré son numéro Orange Money"}
                  </strong>

                  <label htmlFor="paymentReference">
                    Référence de la transaction *
                  </label>

                  <input
                    id="paymentReference"
                    name="paymentReference"
                    type="text"
                    value={form.paymentReference}
                    onChange={handleChange}
                    placeholder="Ex : OM240912.1234.A56789"
                    required
                  />

                </div>
              )}

              {form.paymentMethod === "wave" && (
                <div className="payment-instructions">

                  <p>
                    Envoyez{" "}
                    <strong>
                      {total.toLocaleString("fr-FR")}{" "}
                      F CFA
                    </strong>{" "}
                    via Wave directement à{" "}
                    <strong>
                      {singleShop
                        ? singleShop.name
                        : "la boutique"}
                    </strong>{" "}
                    au numéro :
                  </p>

                  <strong className="payment-number">
                    {(singleShop && singleShop.waveNumber) ||
                      "Ce commerçant n'a pas encore configuré son numéro Wave"}
                  </strong>

                  <label htmlFor="paymentReference">
                    Référence de la transaction *
                  </label>

                  <input
                    id="paymentReference"
                    name="paymentReference"
                    type="text"
                    value={form.paymentReference}
                    onChange={handleChange}
                    placeholder="Référence reçue par SMS"
                    required
                  />

                </div>
              )}

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

            <div className="checkout-summary-total">

              <span>
                Total
              </span>

              <strong>
                {total.toLocaleString("fr-FR")}{" "}
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
