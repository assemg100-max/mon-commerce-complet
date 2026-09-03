import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { getShops } from "../data/api";

import "./PopularShops.css";

function PopularShops() {
  const [shops, setShops] = useState([]);

  useEffect(() => {
    function loadShops() {
      getShops()
        .then(function (allShops) {
          setShops(allShops.slice(0, 3));
        })
        .catch(function (error) {
          console.error(
            "Erreur lors du chargement des boutiques :",
            error
          );
        });
    }

    loadShops();

    window.addEventListener("shopsUpdated", loadShops);

    return () => {
      window.removeEventListener("shopsUpdated", loadShops);
    };
  }, []);

  return (
    <section className="shops">
      <div className="shops-container">

        <div className="shops-heading">
          <span className="shops-label">
            Nos boutiques
          </span>

          <h2>
            Boutiques populaires
          </h2>

          <p className="shops-description">
            Découvrez des boutiques sénégalaises
            et leurs produits.
          </p>
        </div>

        <div className="shops-grid">

          {shops.map(function (shop) {
            return (
              <article
                className="shop-card"
                key={shop.id}
              >

                <div className="shop-image-wrapper">

                  {shop.logo ? (
                    <img
                      src={shop.logo}
                      alt={shop.name}
                      className="shop-image"
                    />
                  ) : (
                    <div className="shop-image shop-image-placeholder">
                      {shop.name ? shop.name.charAt(0) : "M"}
                    </div>
                  )}

                  <span className="shop-category">
                    {shop.category}
                  </span>

                </div>

                <div className="shop-info">

                  <h3>
                    {shop.name}
                  </h3>

                  <p className="shop-city">
                    📍 {shop.city}
                  </p>

                  <p className="shop-products-count">
                    🛍️ {Number(shop.products) || 0} produits
                  </p>

                  <Link
                    to={"/boutique/" + shop.id}
                    className="shop-button"
                  >
                    Voir la boutique →
                  </Link>

                </div>

              </article>
            );
          })}

        </div>

        <div className="shops-more">
          <Link
            to="/boutiques"
            className="all-shops-button"
          >
            Voir toutes les boutiques
          </Link>
        </div>

      </div>
    </section>
  );
}

export default PopularShops;
