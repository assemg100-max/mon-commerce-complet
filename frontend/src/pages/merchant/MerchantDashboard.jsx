import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { getShops, getProducts, getOrdersByShop } from "../../data/api";

import "./MerchantDashboard.css";

function MerchantDashboard() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [shop, setShop] = useState(null);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);

  useEffect(() => {
    loadCurrentUser();

    function handleUserUpdated() {
      loadCurrentUser();
    }

    function handleShopsUpdated() {
      loadCurrentUser();
    }

    window.addEventListener(
      "userUpdated",
      handleUserUpdated
    );

    window.addEventListener(
      "shopsUpdated",
      handleShopsUpdated
    );

    window.addEventListener(
      "productsUpdated",
      handleShopsUpdated
    );

    window.addEventListener(
      "storage",
      handleShopsUpdated
    );

    return () => {
      window.removeEventListener(
        "userUpdated",
        handleUserUpdated
      );

      window.removeEventListener(
        "shopsUpdated",
        handleShopsUpdated
      );

      window.removeEventListener(
        "productsUpdated",
        handleShopsUpdated
      );

      window.removeEventListener(
        "storage",
        handleShopsUpdated
      );
    };
  }, [navigate]);

  function loadCurrentUser() {
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
      console.error(
        "Erreur utilisateur :",
        error
      );

      navigate("/connexion");
      return;
    }

    if (
      !currentUser ||
      typeof currentUser !== "object"
    ) {
      navigate("/connexion");
      return;
    }

    if (currentUser.role !== "merchant") {
      navigate("/");
      return;
    }

    setUser(currentUser);

    /*
     * =====================================================
     * RÉCUPÉRER LA VRAIE BOUTIQUE DU COMMERÇANT
     * =====================================================
     *
     * IMPORTANT :
     * On ne prend JAMAIS shops[0].
     *
     * La boutique est trouvée grâce au shopId
     * enregistré dans le compte du commerçant.
     */

    getShops()
      .then(function (allShops) {
        const currentShop = allShops.find(
          function (item) {
            return (
              Number(item.id) ===
              Number(currentUser.shopId)
            );
          }
        );

        /*
         * Le commerçant possède une boutique
         */

        if (currentShop) {
          setShop(currentShop);

          loadProducts(Number(currentShop.id));
          loadOrders(Number(currentShop.id));
        }

        /*
         * Le commerçant n'a pas encore de boutique
         */

        else {
          setShop(null);
          setOrders([]);
          setProducts([]);
        }
      })
      .catch(function (error) {
        console.error(
          "Erreur lors du chargement de la boutique :",
          error
        );
      });
  }

  /*
   * =========================================================
   * PRODUITS
   * =========================================================
   */

  function loadProducts(shopId) {
    getProducts(shopId)
      .then(setProducts)
      .catch(function (error) {
        console.error(
          "Erreur produits :",
          error
        );

        setProducts([]);
      });
  }

  /*
   * =========================================================
   * COMMANDES
   * =========================================================
   */

  function loadOrders(shopId) {
    getOrdersByShop(shopId)
      .then(setOrders)
      .catch(function (error) {
        console.error(
          "Erreur commandes :",
          error
        );

        setOrders([]);
      });
  }

  /*
   * =========================================================
   * CHARGEMENT
   * =========================================================
   */

  if (!user) {
    return (
      <main className="merchant-dashboard-page">
        <div className="merchant-dashboard-container">
          <p>Chargement...</p>
        </div>
      </main>
    );
  }

  /*
   * =========================================================
   * AUCUNE BOUTIQUE
   * =========================================================
   */

  if (!shop) {
    return (
      <main className="merchant-dashboard-page">

        <div className="merchant-dashboard-container">

          <section className="merchant-dashboard-header">

            <div>

              <span className="merchant-dashboard-label">
                ESPACE COMMERÇANT
              </span>

              <h1>
                Bonjour{" "}
                {user.name || "Commerçant"} 👋
              </h1>

              <p>
                Vous n'avez pas encore créé
                votre boutique.
              </p>

            </div>

          </section>

          <section className="merchant-dashboard-card">

            <div className="merchant-dashboard-card-icon">
              🏪
            </div>

            <h2>
              Créez votre boutique
            </h2>

            <p>
              Commencez par créer votre boutique
              afin de pouvoir ajouter vos produits
              et les présenter aux clients.
            </p>

            <Link
              to="/creer-boutique"
              className="merchant-dashboard-button"
            >
              🏪 Créer ma boutique →
            </Link>

          </section>

        </div>

      </main>
    );
  }

  /*
   * =========================================================
   * ID DE LA BOUTIQUE
   * =========================================================
   */

  const shopId = Number(shop.id);

  /*
   * =========================================================
   * PRODUITS DE LA BOUTIQUE
   * =========================================================
   */

  const shopProducts = products;

  const totalProducts =
    shopProducts.length;

  const totalStock =
    shopProducts.reduce(
      function (sum, product) {
        return (
          sum +
          (Number(product.stock) || 0)
        );
      },
      0
    );

  /*
   * =========================================================
   * COMMANDES
   * =========================================================
   */

  const totalOrders =
    orders.length;

  const totalRevenue =
    orders.reduce(
      function (sum, order) {

        if (
          !Array.isArray(
            order.products
          )
        ) {
          return sum;
        }

        const merchantTotal =
          order.products.reduce(
            function (
              productSum,
              product
            ) {

              if (
                Number(product.shopId) !==
                Number(shopId)
              ) {
                return productSum;
              }

              const price =
                Number(product.price) || 0;

              const quantity =
                Number(product.quantity) || 0;

              return (
                productSum +
                price * quantity
              );
            },
            0
          );

        return (
          sum +
          merchantTotal
        );
      },
      0
    );

  const pendingOrders =
    orders.filter(
      function (order) {
        return (
          !order.status ||
          order.status === "En attente"
        );
      }
    ).length;

  /*
   * =========================================================
   * STATISTIQUES PAR CATÉGORIE
   * =========================================================
   */

  const categoryStats = {
    Téléphones: 0,
    Mode: 0,
    Informatique: 0,
    Sport: 0,
    Maison: 0,
    Alimentation: 0,
  };

  shopProducts.forEach(
    function (product) {

      const category =
        product.category;

      if (
        Object.prototype.hasOwnProperty.call(
          categoryStats,
          category
        )
      ) {
        categoryStats[category] +=
          Number(product.stock) || 0;
      }
    }
  );

  const maxCategoryStock =
    Math.max(
      ...Object.values(
        categoryStats
      ),
      1
    );

  /*
   * =========================================================
   * DONNÉES DU GRAPHIQUE DES VENTES
   * =========================================================
   */

  const orderChartData =
    orders.map(
      function (order, index) {

        let amount = 0;

        if (
          Array.isArray(
            order.products
          )
        ) {

          order.products.forEach(
            function (product) {

              if (
                Number(product.shopId) ===
                Number(shopId)
              ) {

                amount +=
                  (Number(product.price) || 0) *
                  (Number(product.quantity) || 0);
              }
            }
          );
        }

        return {
          label:
            order.orderNumber ||
            `Commande ${index + 1}`,

          amount,
        };
      }
    );

  /*
   * Les 7 dernières commandes
   */

  const lastOrders =
    orderChartData.slice(-7);

  const maxOrderAmount =
    Math.max(
      ...lastOrders.map(
        function (item) {
          return item.amount;
        }
      ),
      1
    );

  /*
   * =========================================================
   * FORMAT PRIX
   * =========================================================
   */

  function formatPrice(price) {
    return Number(
      price || 0
    ).toLocaleString("fr-FR");
  }

  /*
   * =========================================================
   * AFFICHAGE
   * =========================================================
   */

  return (
    <main className="merchant-dashboard-page">

      <div className="merchant-dashboard-container">

        {/* ==================================================
            HEADER
        ================================================== */}

        <section className="merchant-dashboard-header">

          <div>

            <span className="merchant-dashboard-label">
              ESPACE COMMERÇANT
            </span>

            <h1>
              Bonjour{" "}
              {user.name || "Commerçant"} 👋
            </h1>

            <p>
              Bienvenue dans votre
              espace de gestion.
            </p>

          </div>

          <div className="merchant-dashboard-header-actions">

            <Link
              to="/commercant/profil"
              className="merchant-edit-shop-button"
            >
              ⚙️ Modifier ma boutique
            </Link>

            <Link
              to="/boutiques"
              className="merchant-view-shop-button"
            >
              Voir les boutiques
            </Link>

          </div>

        </section>

        {/* ==================================================
            MA BOUTIQUE
        ================================================== */}

        <section className="merchant-shop-card">

          <div className="merchant-shop-logo">

            {shop.logo ? (

              <img
                src={shop.logo}
                alt={shop.name}
              />

            ) : (

              shop.name
                ? shop.name
                    .charAt(0)
                    .toUpperCase()
                : "M"

            )}

          </div>

          <div className="merchant-shop-info">

            <span>
              MA BOUTIQUE
            </span>

            <h2>
              {shop.name}
            </h2>

            <p>
              📍{" "}
              {shop.city ||
                "Ville non renseignée"}

              {" • "}

              🏷️{" "}
              {shop.category ||
                "Non catégorisée"}
            </p>

          </div>

          <Link
            to={`/boutique/${shop.id}`}
            className="merchant-shop-link"
          >
            Voir ma boutique →
          </Link>

        </section>

        {/* ==================================================
            STATISTIQUES
        ================================================== */}

        <section className="merchant-stats">

          <article className="merchant-stat-card">

            <div className="merchant-stat-icon">
              📦
            </div>

            <div>

              <span>
                Produits
              </span>

              <strong>
                {totalProducts}
              </strong>

            </div>

          </article>

          <article className="merchant-stat-card">

            <div className="merchant-stat-icon">
              🛒
            </div>

            <div>

              <span>
                Commandes
              </span>

              <strong>
                {totalOrders}
              </strong>

            </div>

          </article>

          <article className="merchant-stat-card">

            <div className="merchant-stat-icon">
              ⏳
            </div>

            <div>

              <span>
                En attente
              </span>

              <strong>
                {pendingOrders}
              </strong>

            </div>

          </article>

          <article className="merchant-stat-card">

            <div className="merchant-stat-icon">
              💰
            </div>

            <div>

              <span>
                Chiffre d'affaires
              </span>

              <strong>
                {formatPrice(
                  totalRevenue
                )}{" "}
                F CFA
              </strong>

            </div>

          </article>

        </section>

        {/* ==================================================
            GRAPHIQUES
        ================================================== */}

        <section className="merchant-charts-grid">

          {/* =========================
              VENTES
          ========================= */}

          <article className="merchant-chart-card">

            <div className="merchant-chart-header">

              <div>

                <span>
                  ANALYSE
                </span>

                <h2>
                  Ventes
                </h2>

              </div>

              <div className="merchant-chart-icon">
                📈
              </div>

            </div>

            {lastOrders.length === 0 ? (

              <div className="merchant-chart-empty">

                <span>
                  📊
                </span>

                <p>
                  Pas encore de commandes
                  pour afficher les ventes.
                </p>

              </div>

            ) : (

              <div className="merchant-bar-chart">

                {lastOrders.map(
                  function (
                    item,
                    index
                  ) {

                    const height =
                      Math.max(
                        (
                          item.amount /
                          maxOrderAmount
                        ) * 100,
                        5
                      );

                    return (
                      <div
                        className="merchant-bar-item"
                        key={index}
                      >

                        <div className="merchant-bar-value">
                          {formatPrice(
                            item.amount
                          )}
                        </div>

                        <div className="merchant-bar-container">

                          <div
                            className="merchant-bar"
                            style={{
                              height:
                                `${height}%`,
                            }}
                          />

                        </div>

                        <span>
                          {item.label}
                        </span>

                      </div>
                    );
                  }
                )}

              </div>
            )}

          </article>

          {/* =========================
              STOCK PAR CATÉGORIE
          ========================= */}

          <article className="merchant-chart-card">

            <div className="merchant-chart-header">

              <div>

                <span>
                  STOCK
                </span>

                <h2>
                  Stock par catégorie
                </h2>

              </div>

              <div className="merchant-chart-icon">
                📦
              </div>

            </div>

            <div className="merchant-category-chart">

              {Object.entries(
                categoryStats
              ).map(
                function ([
                  category,
                  stock,
                ]) {

                  const width =
                    (
                      stock /
                      maxCategoryStock
                    ) * 100;

                  return (
                    <div
                      className="merchant-category-row"
                      key={category}
                    >

                      <div className="merchant-category-top">

                        <span>
                          {category}
                        </span>

                        <strong>
                          {stock}
                        </strong>

                      </div>

                      <div className="merchant-category-track">

                        <div
                          className="merchant-category-progress"
                          style={{
                            width:
                              `${width}%`,
                          }}
                        />

                      </div>

                    </div>
                  );
                }
              )}

            </div>

          </article>

        </section>

        {/* ==================================================
            CARTES PRINCIPALES
        ================================================== */}

        <section className="merchant-dashboard-grid">

          <article className="merchant-dashboard-card">

            <div className="merchant-dashboard-card-icon">
              🛍️
            </div>

            <h2>
              Mes produits
            </h2>

            <p>
              {totalProducts} produit
              {totalProducts > 1
                ? "s"
                : ""}{" "}
              dans votre boutique.
            </p>

            <p>
              Stock total :{" "}
              <strong>
                {totalStock}
              </strong>{" "}
              article
              {totalStock > 1
                ? "s"
                : ""}
            </p>

            <Link
              to="/commercant/produits"
              className="merchant-dashboard-button"
            >
              Gérer mes produits →
            </Link>

          </article>

          <article className="merchant-dashboard-card">

            <div className="merchant-dashboard-card-icon">
              📦
            </div>

            <h2>
              Mes commandes
            </h2>

            <p>
              {totalOrders} commande
              {totalOrders > 1
                ? "s"
                : ""}{" "}
              reçue
              {totalOrders > 1
                ? "s"
                : ""}.
            </p>

            <p>
              {pendingOrders} en attente.
            </p>

            <Link
              to="/commercant/commandes"
              className="merchant-dashboard-button"
            >
              Gérer mes commandes →
            </Link>

          </article>

        </section>

        {/* ==================================================
            INFORMATIONS BOUTIQUE
        ================================================== */}

        <section className="merchant-dashboard-info">

          <h2>
            Informations de ma boutique
          </h2>

          <div className="merchant-info-grid">

            <div>

              <span>
                Nom
              </span>

              <strong>
                {shop.name}
              </strong>

            </div>

            <div>

              <span>
                Téléphone
              </span>

              <strong>
                {shop.phone ||
                  "Non renseigné"}
              </strong>

            </div>

            <div>

              <span>
                Ville
              </span>

              <strong>
                {shop.city ||
                  "Non renseignée"}
              </strong>

            </div>

            <div>

              <span>
                Catégorie
              </span>

              <strong>
                {shop.category ||
                  "Non renseignée"}
              </strong>

            </div>

          </div>

        </section>

      </div>

    </main>
  );
}

export default MerchantDashboard;