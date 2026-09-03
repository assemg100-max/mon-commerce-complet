import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { getOrderByNumber } from "../data/api";

import "./OrderConfirmation.css";

function OrderConfirmation() {
  const { orderNumber } = useParams();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(function () {
    getOrderByNumber(orderNumber)
      .then(setOrder)
      .catch(function () {
        setNotFound(true);
      })
      .finally(function () {
        setLoading(false);
      });
  }, [orderNumber]);

  if (loading) {
    return (
      <main className="confirmation-page">
        <div className="confirmation-container">
          <section className="confirmation-not-found">
            <p>Chargement de votre commande...</p>
          </section>
        </div>
      </main>
    );
  }

  if (notFound || !order) {
    return (
      <main className="confirmation-page">
        <div className="confirmation-container">
          <section className="confirmation-not-found">

            <div className="confirmation-icon">
              X
            </div>

            <h1>
              Commande introuvable
            </h1>

            <p>
              Nous ne trouvons pas cette commande.
            </p>

            <Link
              to="/boutiques"
              className="confirmation-button"
            >
              Retour aux boutiques
            </Link>

          </section>
        </div>
      </main>
    );
  }

  const total = Number(order.total) || 0;

  const customer = order.customer || {};

  const orderProducts = Array.isArray(order.products)
    ? order.products
    : [];

  const totalProducts = orderProducts.reduce(
    function (sum, product) {
      return sum + (Number(product.quantity) || 0);
    },
    0
  );

  return (
    <main className="confirmation-page">

      <div className="confirmation-container">

        <section className="confirmation-success">

          <div className="confirmation-icon">
            OK
          </div>

          <span className="confirmation-label">
            COMMANDE CONFIRMEE
          </span>

          <h1>
            Merci pour votre commande !
          </h1>

          <p>
            Votre commande a bien ete enregistree.
          </p>

          <div className="order-number">

            <span>
              Numero de commande
            </span>

            <strong>
              {order.orderNumber}
            </strong>

          </div>

        </section>

        <section className="confirmation-card">

          <h2>
            Recapitulatif
          </h2>

          <div className="confirmation-customer">

            <h3>
              Informations de livraison
            </h3>

            <p>
              <strong>
                Nom :
              </strong>{" "}
              {customer.name || "-"}
            </p>

            <p>
              <strong>
                Telephone :
              </strong>{" "}
              {customer.phone || "-"}
            </p>

            <p>
              <strong>
                Ville :
              </strong>{" "}
              {customer.city || "-"}
            </p>

            <p>
              <strong>
                Adresse :
              </strong>{" "}
              {customer.address || "-"}
            </p>

            {customer.notes && (
              <p>
                <strong>
                  Notes :
                </strong>{" "}
                {customer.notes}
              </p>
            )}

          </div>

          <div className="confirmation-products">

            <h3>
              Produits commandes
            </h3>

            {orderProducts.map(function (product) {

              const quantity =
                Number(product.quantity) || 0;

              const price =
                Number(product.price) || 0;

              const productTotal =
                price * quantity;

              return (
                <div
                  className="confirmation-product"
                  key={product.id}
                >

                  <div>

                    <strong>
                      {product.name}
                    </strong>

                    <span>
                      Quantite : {quantity}
                    </span>

                  </div>

                  <strong>
                    {productTotal.toLocaleString("fr-FR")} F CFA
                  </strong>

                </div>
              );
            })}

          </div>

          <div className="confirmation-total">

            <span>
              {totalProducts} article
              {totalProducts > 1 ? "s" : ""}
            </span>

            <strong>
              {total.toLocaleString("fr-FR")} F CFA
            </strong>

          </div>

          <div className="confirmation-status">

            <span>
              Statut
            </span>

            <strong>
              {order.status || "En attente"}
            </strong>

          </div>

          <div className="confirmation-status">

            <span>
              Paiement
            </span>

            <strong>
              {order.paymentMethod === "orange_money"
                ? "Orange Money"
                : order.paymentMethod === "wave"
                ? "Wave"
                : "À la livraison"}
              {order.paymentReference
                ? " — Réf. " + order.paymentReference
                : ""}
            </strong>

          </div>

        </section>

        <div className="confirmation-actions">

          <Link
            to="/boutiques"
            className="confirmation-button"
          >
            Continuer mes achats
          </Link>

          <Link
            to="/"
            className="confirmation-home-button"
          >
            Retour a l'accueil
          </Link>

        </div>

      </div>

    </main>
  );
}

export default OrderConfirmation;
