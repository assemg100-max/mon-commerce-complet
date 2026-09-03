import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { getFavorites, removeFavorite } from "../data/api";

import "./Favorites.css";

function Favorites() {
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(function () {
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

    setUser(currentUser);

    getFavorites(currentUser.email)
      .then(setProducts)
      .catch(function (error) {
        console.error(
          "Erreur lors du chargement des favoris :",
          error
        );
      })
      .finally(function () {
        setLoading(false);
      });
  }, [navigate]);

  function handleRemove(productId) {
    if (!user) {
      return;
    }

    removeFavorite(user.email, productId)
      .then(function () {
        setProducts(function (previousProducts) {
          return previousProducts.filter(
            function (product) {
              return (
                Number(product.id) !==
                Number(productId)
              );
            }
          );
        });
      })
      .catch(function (error) {
        alert(error.message);
      });
  }

  return (
    <main className="favorites-page">
      <div className="favorites-container">

        <div className="favorites-title">
          <h1>Mes favoris</h1>
          <p>
            Retrouvez ici tous les produits que vous
            avez enregistrés.
          </p>
        </div>

        {loading ? (

          <div className="favorites-empty">
            <p>Chargement...</p>
          </div>

        ) : products.length === 0 ? (

          <div className="favorites-empty">

            <div className="favorites-empty-icon">
              ♡
            </div>

            <h2>Aucun favori pour l'instant</h2>

            <p>
              Cliquez sur le cœur d'un produit pour
              l'enregistrer ici.
            </p>

            <Link
              to="/boutiques"
              className="favorites-browse-button"
            >
              Découvrir les boutiques
            </Link>

          </div>

        ) : (

          <div className="favorites-grid">

            {products.map(function (product) {
              const price = Number(product.price) || 0;

              return (
                <article
                  className="favorites-card"
                  key={product.id}
                >

                  <Link to={"/produit/" + product.id}>
                    <img
                      src={product.image}
                      alt={product.name}
                    />
                  </Link>

                  <div className="favorites-card-content">

                    <Link to={"/produit/" + product.id}>
                      <h3>{product.name}</h3>
                    </Link>

                    <strong>
                      {price.toLocaleString("fr-FR")}{" "}
                      F CFA
                    </strong>

                    <button
                      type="button"
                      onClick={function () {
                        handleRemove(product.id);
                      }}
                    >
                      Retirer des favoris
                    </button>

                  </div>

                </article>
              );
            })}

          </div>

        )}

      </div>
    </main>
  );
}

export default Favorites;
