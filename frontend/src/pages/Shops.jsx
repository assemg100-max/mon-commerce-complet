import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { getShops } from "../data/api";

import "./Shops.css";

function Shops() {
  const [searchParams] = useSearchParams();

  const [shops, setShops] = useState([]);

  const [search, setSearch] = useState(
    searchParams.get("q") || ""
  );

  const [category, setCategory] =
    useState("Toutes");

  const categories = [
    "Toutes",
    "Téléphones",
    "Mode",
    "Informatique",
    "Sport",
    "Maison",
    "Alimentation",
  ];

  /*
   * =========================================================
   * CHARGER LES BOUTIQUES
   * =========================================================
   */

  const [loading, setLoading] = useState(true);

  function loadShops() {
    getShops()
      .then(function (allShops) {
        setShops(allShops);
      })
      .catch(function (error) {
        console.error(
          "Erreur lors du chargement des boutiques :",
          error
        );
      })
      .finally(function () {
        setLoading(false);
      });
  }

  /*
   * =========================================================
   * CHARGEMENT INITIAL
   * =========================================================
   */

  useEffect(() => {
    loadShops();

    function handleShopsUpdated() {
      loadShops();
    }

    window.addEventListener(
      "shopsUpdated",
      handleShopsUpdated
    );

    return () => {
      window.removeEventListener(
        "shopsUpdated",
        handleShopsUpdated
      );
    };
  }, []);

  /*
   * =========================================================
   * FILTRAGE
   * =========================================================
   */

  const filteredShops = shops.filter(
    function (shop) {
      const searchText =
        search.trim().toLowerCase();

      const shopName =
        String(shop.name || "")
          .toLowerCase();

      const shopCity =
        String(shop.city || "")
          .toLowerCase();

      const shopCategory =
        String(shop.category || "")
          .toLowerCase();

      const matchesSearch =
        shopName.includes(searchText) ||
        shopCity.includes(searchText) ||
        shopCategory.includes(searchText);

      const matchesCategory =
        category === "Toutes" ||
        shop.category === category;

      return (
        matchesSearch &&
        matchesCategory
      );
    }
  );

  /*
   * =========================================================
   * AFFICHAGE
   * =========================================================
   */

  return (
    <main className="shops-page">

      <div className="shops-page-container">

        {/* HEADER */}

        <section className="shops-page-header">

          <span className="shops-page-label">
            MON COMMERCE SÉNÉGAL
          </span>

          <h1>
            Toutes les boutiques
          </h1>

          <p>
            Découvrez les boutiques
            sénégalaises et leurs produits.
          </p>

        </section>

        {/* FILTRES */}

        <section className="shops-filters">

          <div className="shops-search">

            <span>
              🔎
            </span>

            <input
              type="text"
              placeholder="Rechercher une boutique..."
              value={search}
              onChange={function (event) {
                setSearch(
                  event.target.value
                );
              }}
            />

          </div>

          <div className="category-filters">

            {categories.map(
              function (item) {
                return (
                  <button
                    type="button"
                    key={item}
                    className={
                      category === item
                        ? "category-filter active"
                        : "category-filter"
                    }
                    onClick={function () {
                      setCategory(item);
                    }}
                  >
                    {item}
                  </button>
                );
              }
            )}

          </div>

        </section>

        {/* RESULTATS */}

        <div className="shops-result">

          <p>
            {filteredShops.length} boutique
            {filteredShops.length > 1
              ? "s"
              : ""}{" "}
            trouvée
            {filteredShops.length > 1
              ? "s"
              : ""}
          </p>

        </div>

        {/* AUCUNE BOUTIQUE */}

        {loading ? (

          <section className="shops-empty">
            <p>Chargement des boutiques...</p>
          </section>

        ) : filteredShops.length === 0 ? (

          <section className="shops-empty">

            <div>
              🔎
            </div>

            <h2>
              Aucune boutique trouvée
            </h2>

            <p>
              Essayez une autre recherche
              ou une autre catégorie.
            </p>

          </section>

        ) : (

          /* LISTE DES BOUTIQUES */

          <section className="shops-list">

            {filteredShops.map(
              function (shop) {

                const productCount =
                  Number(shop.products) || 0;

                return (
                  <article
                    className="shop-list-card"
                    key={shop.id}
                  >

                    {/* LOGO */}

                    <div className="shop-list-logo">

                      {shop.logo ? (

                        <img
                          src={shop.logo}
                          alt={
                            "Logo de " +
                            shop.name
                          }
                        />

                      ) : (

                        shop.name
                          ? shop.name.charAt(0)
                          : "M"

                      )}

                    </div>

                    {/* INFORMATIONS */}

                    <div className="shop-list-info">

                      <h2>
                        {shop.name}
                      </h2>

                      <div className="shop-list-meta">

                        <span>
                          📍{" "}
                          {shop.city ||
                            "Ville non renseignée"}
                        </span>

                        <span>
                          🏷️{" "}
                          {shop.category ||
                            "Non catégorisée"}
                        </span>

                        <span>
                          🛍️{" "}
                          {productCount} produit
                          {productCount > 1
                            ? "s"
                            : ""}
                        </span>

                      </div>

                      <p>
                        {shop.description ||
                          "Bienvenue dans notre boutique."}
                      </p>

                    </div>

                    {/* BOUTON */}

                    <Link
                      to={
                        "/boutique/" +
                        shop.id
                      }
                      className="shop-list-button"
                    >
                      Voir la boutique →
                    </Link>

                  </article>
                );
              }
            )}

          </section>

        )}

      </div>

    </main>
  );
}

export default Shops;