import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { getOrdersByEmail } from "../data/api";

import "./Account.css";

function Account() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem(
      "mon-commerce-current-user"
    );

    if (!savedUser) {
      navigate("/connexion");
      return;
    }

    let currentUser;

    try {
      currentUser = JSON.parse(savedUser);
    } catch (error) {
      console.error("Erreur utilisateur :", error);
      navigate("/connexion");
      return;
    }

    setUser(currentUser);

    if (!currentUser.email) {
      setLoadingOrders(false);
      return;
    }

    getOrdersByEmail(currentUser.email)
      .then(setOrders)
      .catch(function (error) {
        console.error(
          "Erreur lors du chargement des commandes :",
          error
        );
        setOrders([]);
      })
      .finally(function () {
        setLoadingOrders(false);
      });
  }, [navigate]);

  function handleLogout() {
    localStorage.removeItem(
      "mon-commerce-current-user"
    );

    navigate("/");
  }

  if (!user) {
    return null;
  }

  return (
    <main className="account-page">

      <div className="account-container">

        <section className="account-welcome">

          <div className="account-avatar">
            {user.name.charAt(0).toUpperCase()}
          </div>

          <div>
            <span>MON COMPTE</span>

            <h1>
              Bonjour {user.name} 👋
            </h1>

            <p>
              Bienvenue sur Mon Commerce Sénégal.
            </p>
          </div>

        </section>

        <section className="account-info">

          <div className="account-section-header">
            <div>
              <h2>Mes informations</h2>

              <p>
                Les informations de votre compte.
              </p>
            </div>
          </div>

          <div className="account-info-grid">

            <div className="account-info-item">
              <span>Nom complet</span>
              <strong>{user.name}</strong>
            </div>

            <div className="account-info-item">
              <span>Adresse email</span>
              <strong>{user.email}</strong>
            </div>

            <div className="account-info-item">
              <span>Type de compte</span>
              <strong>
                {user.role === "merchant"
                  ? "🏪 Commerçant"
                  : "👤 Client"}
              </strong>
            </div>

          </div>

        </section>

        <section className="account-orders">

          <div className="account-section-header">

            <div>
              <h2>Mes commandes</h2>

              <p>
                Retrouvez ici vos commandes passées.
              </p>
            </div>

            <span className="account-order-count">
              {orders.length} commande
              {orders.length > 1 ? "s" : ""}
            </span>

          </div>

          {loadingOrders ? (

            <div className="account-empty">
              <p>Chargement de vos commandes...</p>
            </div>

          ) : orders.length === 0 ? (

            <div className="account-empty">

              <div className="account-empty-icon">
                📦
              </div>

              <h3>
                Vous n'avez pas encore de commande
              </h3>

              <p>
                Découvrez nos boutiques et trouvez
                les produits qui vous intéressent.
              </p>

              <Link
                to="/boutiques"
                className="account-shop-button"
              >
                Découvrir les boutiques
              </Link>

            </div>

          ) : (

            <div className="account-orders-list">

              {orders
                .slice()
                .reverse()
                .map((order) => (

                  <article
                    className="account-order-card"
                    key={order.orderNumber}
                  >

                    <div className="account-order-top">

                      <div>
                        <span>
                          Commande
                        </span>

                        <strong>
                          {order.orderNumber}
                        </strong>
                      </div>

                      <span className="account-status">
                        {order.status}
                      </span>

                    </div>

                    <div className="account-order-products">

                      {order.products.map(
                        (product) => (

                          <div
                            className="account-product"
                            key={product.id}
                          >

                            <span>
                              {product.name}
                              {" × "}
                              {product.quantity}
                            </span>

                            <strong>
                              {(
                                product.price *
                                product.quantity
                              ).toLocaleString(
                                "fr-FR"
                              )}{" "}
                              F CFA
                            </strong>

                          </div>

                        )
                      )}

                    </div>

                    <div className="account-order-total">

                      <span>
                        Total
                      </span>

                      <strong>
                        {order.total.toLocaleString(
                          "fr-FR"
                        )}{" "}
                        F CFA
                      </strong>

                    </div>

                  </article>

                ))}

            </div>

          )}

        </section>

        <button
          type="button"
          className="account-logout"
          onClick={handleLogout}
        >
          🚪 Se déconnecter
        </button>

      </div>

    </main>
  );
}

export default Account;