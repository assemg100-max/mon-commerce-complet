
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getProducts } from "../data/api";
import "./PopularProducts.css";

function PopularProducts() {
  const [popularProducts, setPopularProducts] = useState([]);

  useEffect(function () {
    function loadProducts() {
      getProducts()
        .then(function (allProducts) {
          setPopularProducts(allProducts.slice(0, 4));
        })
        .catch(function (error) {
          console.error(
            "Erreur lors du chargement des produits :",
            error
          );
        });
    }

    loadProducts();

    window.addEventListener("productsUpdated", loadProducts);

    return function () {
      window.removeEventListener(
        "productsUpdated",
        loadProducts
      );
    };
  }, []);

  return (
    <section className="popular-products">
      <div className="popular-products-container">

        <div className="popular-products-header">
          <div>
            <span className="popular-products-badge">
              Sélection du moment
            </span>

            <h2>
              Les produits du moment
            </h2>

            <p>
              Découvrez une sélection de produits
              proposés par les commerçants sénégalais.
            </p>
          </div>

          <Link
            to="/boutiques"
            className="popular-products-link"
          >
            Voir tous les produits →
          </Link>
        </div>

        <div className="popular-products-grid">

          {popularProducts.map(function (product) {
            return (
              <article
                className="popular-product-card"
                key={product.id}
              >

                <div className="popular-product-image">
                  <img
                    src={product.image}
                    alt={product.name}
                  />
                </div>

                <div className="popular-product-content">

                  <span className="popular-product-category">
                    Produit
                  </span>

                  <h3>
                    {product.name}
                  </h3>

                  <p className="popular-product-description">
                    {product.description}
                  </p>

                  <strong className="popular-product-price">
                    {product.price.toLocaleString("fr-FR")} F CFA
                  </strong>

                  <p className="popular-product-stock">
                    Stock : {product.stock}
                  </p>

                  <Link
                    to={"/produit/" + product.id}
                    className="popular-product-button"
                  >
                    Voir le produit →
                  </Link>

                </div>

              </article>
            );
          })}

        </div>

      </div>
    </section>
  );
}

export default PopularProducts;

