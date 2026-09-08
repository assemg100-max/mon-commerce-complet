import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import {
  getShopByOwner,
  getOrdersByShop,
  updateOrderStatus as updateOrderStatusApi,
} from "../../data/api";

import "./MerchantOrders.css";

function MerchantOrders() {
const navigate = useNavigate();

const [user, setUser] = useState(null);
const [shopId, setShopId] = useState(null);
const [orders, setOrders] = useState([]);

useEffect(() => {
const savedUser = localStorage.getItem(
"mon-commerce-current-user"
);

if (!savedUser) {
  navigate("/connexion");
  return;
}

try {
  const currentUser = JSON.parse(savedUser);

  if (currentUser.role !== "merchant") {
    navigate("/");
    return;
  }

  setUser(currentUser);

  getShopByOwner(currentUser).then(function (merchantShop) {
    if (!merchantShop) {
      setOrders([]);
      return;
    }

    setShopId(merchantShop.id);
    loadOrders(merchantShop.id);
  });
} catch (error) {
  console.error(
    "Erreur utilisateur :",
    error
  );

  navigate("/connexion");
}

}, [navigate]);

function loadOrders(shopIdToLoad) {
  getOrdersByShop(shopIdToLoad)
    .then(function (rawOrders) {
      /*
       * Le backend renvoie la commande complète
       * (avec les produits de toutes les boutiques
       * concernées). On ne garde ici que les
       * produits qui appartiennent à CETTE boutique.
       */
      const merchantOrders = rawOrders
        .map(function (order) {
          const merchantProducts =
            order.products.filter(function (product) {
              return (
                Number(product.shopId) ===
                Number(shopIdToLoad)
              );
            });

          if (merchantProducts.length === 0) {
            return null;
          }

          const merchantTotal =
            merchantProducts.reduce(
              function (sum, product) {
                const price =
                  Number(product.price) || 0;

                const quantity =
                  Number(product.quantity) || 0;

                return sum + price * quantity;
              },
              0
            );

          const merchantTotalProducts =
            merchantProducts.reduce(
              function (sum, product) {
                return (
                  sum +
                  (Number(product.quantity) || 0)
                );
              },
              0
            );

          return {
            ...order,
            products: merchantProducts,
            merchantTotal: merchantTotal,
            merchantTotalProducts:
              merchantTotalProducts,
          };
        })
        .filter(function (order) {
          return order !== null;
        });

      setOrders(merchantOrders);
    })
    .catch(function (error) {
      console.error(
        "Erreur commandes :",
        error
      );

      setOrders([]);
    });
}

function updateOrderStatus(orderNumber, newStatus) {
  updateOrderStatusApi(orderNumber, newStatus)
    .then(function () {
      if (shopId) {
        loadOrders(shopId);
      }
    })
    .catch(function (error) {
      console.error(
        "Erreur statut commande :",
        error
      );
    });
}

if (!user) {
return (
<main className="merchant-orders-page">
<div className="merchant-orders-container">
<p>
Chargement...
</p>
</div>
</main>
);
}

return (
<main className="merchant-orders-page">
<div className="merchant-orders-container">

    <div className="merchant-orders-header">

      <div>
        <span className="merchant-orders-label">
          ESPACE COMMERÇANT
        </span>

        <h1>
          Mes commandes
        </h1>

        <p>
          Consultez et gérez les commandes
          de votre boutique.
        </p>
      </div>

      <Link
        to="/commercant"
        className="merchant-back-button"
      >
        ← Retour au dashboard
      </Link>

    </div>

    {orders.length === 0 ? (
      <section className="merchant-orders-empty">

        <div className="merchant-orders-empty-icon">
          📦
        </div>

        <h2>
          Aucune commande
        </h2>

        <p>
          Vous n'avez pas encore reçu
          de commande.
        </p>

        <Link
          to="/boutiques"
          className="merchant-orders-shop-button"
        >
          Voir les boutiques
        </Link>

      </section>
    ) : (
      <section className="merchant-orders-list">

        <div className="merchant-orders-count">

          <strong>
            {orders.length}
          </strong>

          <span>
            commande
            {orders.length > 1
              ? "s"
              : ""}
          </span>

        </div>

        {orders.map(function (order) {

          const total =
            Number(
              order.merchantTotal
            ) || 0;

          const totalProducts =
            Number(
              order.merchantTotalProducts
            ) || 0;

          return (
            <article
              className="merchant-order-card"
              key={order.orderNumber}
            >

              <div className="merchant-order-header">

                <div>
                  <span>
                    Commande
                  </span>

                  <h2>
                    {order.orderNumber}
                  </h2>
                </div>

                <span
                  className={
                    "merchant-order-status status-" +
                    String(
                      order.status ||
                        "En attente"
                    )
                      .toLowerCase()
                      .replace(
                        /\s+/g,
                        "-"
                      )
                  }
                >
                  {order.status ||
                    "En attente"}
                </span>

              </div>

              <div className="merchant-order-customer">

                <h3>
                  👤 Client
                </h3>

                <p>
                  <strong>
                    Nom :
                  </strong>{" "}
                  {order.customer?.name ||
                    "Non renseigné"}
                </p>

                <p>
                  <strong>
                    Téléphone :
                  </strong>{" "}
                  {order.customer?.phone ||
                    "Non renseigné"}
                </p>

                <p>
                  <strong>
                    Ville :
                  </strong>{" "}
                  {order.customer?.city ||
                    "Non renseignée"}
                </p>

                <p>
                  <strong>
                    Adresse :
                  </strong>{" "}
                  {order.customer?.address ||
                    "Non renseignée"}
                </p>

                {order.customer?.notes && (
                  <p>
                    <strong>
                      Notes :
                    </strong>{" "}
                    {order.customer.notes}
                  </p>
                )}

              </div>

              <div className="merchant-order-products">

                <h3>
                  🛍️ Produits commandés
                </h3>

                {order.products.map(
                  function (product) {

                    const quantity =
                      Number(
                        product.quantity
                      ) || 0;

                    const price =
                      Number(
                        product.price
                      ) || 0;

                    const productTotal =
                      price * quantity;

                    return (
                      <div
                        className="merchant-order-product"
                        key={product.id}
                      >

                        <div>

                          <strong>
                            {product.name}
                          </strong>

                          <span>
                            Quantité :{" "}
                            {quantity}
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
                  }
                )}

              </div>

              {order.paymentMethod &&
                order.paymentMethod !== "cod" && (
                  <div className="merchant-order-payment">

                    <span>
                      💳 Paiement :{" "}
                      {order.paymentMethod ===
                      "orange_money"
                        ? "Orange Money"
                        : "Wave"}
                    </span>

                    <small>
                      Vérifie dans ton historique{" "}
                      {order.paymentMethod ===
                      "orange_money"
                        ? "Orange Money"
                        : "Wave"}{" "}
                      qu'un paiement de{" "}
                      {Number(order.total).toLocaleString(
                        "fr-FR"
                      )}{" "}
                      F CFA est bien arrivé, en te basant
                      sur le numéro de téléphone du client
                      ({order.customer?.phone}) et l'heure
                      de la commande, avant de préparer la
                      commande.
                    </small>

                  </div>
                )}

              <div className="merchant-order-total">

                <span>
                  {totalProducts} article
                  {totalProducts > 1
                    ? "s"
                    : ""}
                </span>

                <strong>
                  {total.toLocaleString(
                    "fr-FR"
                  )}{" "}
                  F CFA
                </strong>

              </div>

              <div className="merchant-order-commission">

                <span>
                  Commission plateforme (
                  {Math.round(
                    (order.commissionRate || 0.1) * 100
                  )}
                  %)
                </span>

                <span>
                  −
                  {Math.round(
                    total *
                      (order.commissionRate || 0.1)
                  ).toLocaleString("fr-FR")}{" "}
                  F CFA
                </span>

                <strong>
                  Vous recevez :{" "}
                  {Math.round(
                    total *
                      (1 -
                        (order.commissionRate || 0.1))
                  ).toLocaleString("fr-FR")}{" "}
                  F CFA
                </strong>

              </div>

              <div className="merchant-order-actions">

                <label
                  htmlFor={
                    "status-" +
                    order.orderNumber
                  }
                >
                  Modifier le statut
                </label>

                <select
                  id={
                    "status-" +
                    order.orderNumber
                  }
                  value={
                    order.status ||
                    "En attente"
                  }
                  onChange={function (
                    event
                  ) {
                    updateOrderStatus(
                      order.orderNumber,
                      event.target.value
                    );
                  }}
                >

                  <option value="En attente">
                    En attente
                  </option>

                  <option value="Confirmée">
                    Confirmée
                  </option>

                  <option value="En préparation">
                    En préparation
                  </option>

                  <option value="Expédiée">
                    Expédiée
                  </option>

                  <option value="Livrée">
                    Livrée
                  </option>

                  <option value="Annulée">
                    Annulée
                  </option>

                </select>

              </div>

            </article>
          );
        })}

      </section>
    )}

  </div>
</main>

);
}

export default MerchantOrders;