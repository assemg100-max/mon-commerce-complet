import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { getShopByOwner, getOrdersByShop } from "../../data/api";

import "./MerchantStats.css";

function debutDeJournee(date) {
  const copie = new Date(date);
  copie.setHours(0, 0, 0, 0);
  return copie;
}

function MerchantStats() {
  const navigate = useNavigate();

  const [shopId, setShopId] = useState(null);
  const [merchantOrders, setMerchantOrders] = useState([]);
  const [chargement, setChargement] = useState(true);

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
      navigate("/connexion");
      return;
    }

    if (currentUser.role !== "merchant") {
      navigate("/");
      return;
    }

    getShopByOwner(currentUser).then(function (shop) {
      if (!shop) {
        setChargement(false);
        return;
      }

      setShopId(shop.id);

      getOrdersByShop(shop.id)
        .then(function (rawOrders) {
          /*
           * On ne garde, pour chaque commande, que les
           * produits qui appartiennent à CETTE boutique
           * (une commande peut mélanger plusieurs
           * vendeurs).
           */
          const orders = rawOrders
            .filter(function (order) {
              return order.status !== "Annulée";
            })
            .map(function (order) {
              const produits = order.products.filter(
                function (product) {
                  return (
                    Number(product.shopId) ===
                    Number(shop.id)
                  );
                }
              );

              const total = produits.reduce(function (
                sum,
                item
              ) {
                return (
                  sum +
                  (Number(item.price) || 0) *
                    (Number(item.quantity) || 0)
                );
              },
              0);

              return {
                ...order,
                merchantProducts: produits,
                merchantTotal: total,
              };
            });

          setMerchantOrders(orders);
        })
        .finally(function () {
          setChargement(false);
        });
    });
  }, [navigate]);

  if (chargement) {
    return (
      <main className="merchant-stats-page">
        <div className="merchant-stats-container">
          <p>Chargement...</p>
        </div>
      </main>
    );
  }

  const maintenant = new Date();
  const debutAujourdhui = debutDeJournee(maintenant);

  const debutSemaine = new Date(debutAujourdhui);
  debutSemaine.setDate(
    debutSemaine.getDate() - debutSemaine.getDay()
  );

  const debutMois = new Date(
    maintenant.getFullYear(),
    maintenant.getMonth(),
    1
  );

  function totalDepuis(date) {
    return merchantOrders
      .filter(function (order) {
        return new Date(order.createdAt) >= date;
      })
      .reduce(function (sum, order) {
        return sum + order.merchantTotal;
      }, 0);
  }

  const totalToujours = totalDepuis(new Date(0));
  const totalAujourdhui = totalDepuis(debutAujourdhui);
  const totalSemaine = totalDepuis(debutSemaine);
  const totalMois = totalDepuis(debutMois);

  /*
   * Chiffre d'affaires des 7 derniers jours, pour le petit
   * graphique en barres.
   */
  const septDerniersJours = [];

  for (let i = 6; i >= 0; i -= 1) {
    const jour = new Date(debutAujourdhui);
    jour.setDate(jour.getDate() - i);

    const lendemain = new Date(jour);
    lendemain.setDate(lendemain.getDate() + 1);

    const totalJour = merchantOrders
      .filter(function (order) {
        const date = new Date(order.createdAt);
        return date >= jour && date < lendemain;
      })
      .reduce(function (sum, order) {
        return sum + order.merchantTotal;
      }, 0);

    septDerniersJours.push({
      label: jour.toLocaleDateString("fr-FR", {
        weekday: "short",
      }),
      total: totalJour,
    });
  }

  const maxJour = Math.max(
    1,
    ...septDerniersJours.map(function (jour) {
      return jour.total;
    })
  );

  /*
   * Produits les plus vendus (par quantité).
   */
  const quantitesParProduit = {};

  merchantOrders.forEach(function (order) {
    order.merchantProducts.forEach(function (produit) {
      const nom = produit.name || "Produit";
      quantitesParProduit[nom] =
        (quantitesParProduit[nom] || 0) +
        (Number(produit.quantity) || 0);
    });
  });

  const topProduits = Object.entries(quantitesParProduit)
    .sort(function (a, b) {
      return b[1] - a[1];
    })
    .slice(0, 5);

  return (
    <main className="merchant-stats-page">
      <div className="merchant-stats-container">

        <h1>Statistiques de vente</h1>

        <div className="merchant-stats-cards">

          <div className="merchant-stats-card">
            <span>Aujourd'hui</span>
            <strong>
              {totalAujourdhui.toLocaleString("fr-FR")} F CFA
            </strong>
          </div>

          <div className="merchant-stats-card">
            <span>Cette semaine</span>
            <strong>
              {totalSemaine.toLocaleString("fr-FR")} F CFA
            </strong>
          </div>

          <div className="merchant-stats-card">
            <span>Ce mois-ci</span>
            <strong>
              {totalMois.toLocaleString("fr-FR")} F CFA
            </strong>
          </div>

          <div className="merchant-stats-card highlight">
            <span>Depuis le début</span>
            <strong>
              {totalToujours.toLocaleString("fr-FR")} F CFA
            </strong>
          </div>

        </div>

        <section className="merchant-stats-section">

          <h2>Chiffre d'affaires des 7 derniers jours</h2>

          <div className="merchant-stats-chart">

            {septDerniersJours.map(function (jour, index) {
              const hauteur =
                Math.round(
                  (jour.total / maxJour) * 100
                ) || 2;

              return (
                <div
                  className="merchant-stats-bar-wrapper"
                  key={index}
                >
                  <div className="merchant-stats-bar-value">
                    {jour.total > 0
                      ? jour.total.toLocaleString("fr-FR")
                      : ""}
                  </div>

                  <div
                    className="merchant-stats-bar"
                    style={{ height: hauteur + "%" }}
                  />

                  <div className="merchant-stats-bar-label">
                    {jour.label}
                  </div>
                </div>
              );
            })}

          </div>

        </section>

        <section className="merchant-stats-section">

          <h2>Produits les plus vendus</h2>

          {topProduits.length === 0 && (
            <p>Pas encore assez de ventes.</p>
          )}

          <ol className="merchant-stats-top-products">
            {topProduits.map(function ([nom, quantite]) {
              return (
                <li key={nom}>
                  <span>{nom}</span>
                  <strong>{quantite} vendu(s)</strong>
                </li>
              );
            })}
          </ol>

        </section>

      </div>
    </main>
  );
}

export default MerchantStats;
