import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { getShopById, getProducts } from "../data/api";

import PageTitle from "../components/PageTitle";

import "./Shop.css";

function Shop() {
  const { id } = useParams();

  const [shop, setShop] = useState(null);
  const [shopProducts, setShopProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(function () {
    setLoading(true);
    setNotFound(false);

    Promise.all([
      getShopById(id),
      getProducts(id),
    ])
      .then(function ([shopData, productsData]) {
        setShop(shopData);
        setShopProducts(productsData);
      })
      .catch(function () {
        setNotFound(true);
      })
      .finally(function () {
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <main className="shop-page">
        <div className="shop-container">
          <section className="empty-products">
            <p>Chargement de la boutique...</p>
          </section>
        </div>
      </main>
    );
  }

  if (notFound || !shop) {
    return (
      <main className="shop-page">

        <div className="shop-container">

          <section className="empty-products">

            <h1>
              Boutique introuvable ❌
            </h1>

            <p>
              Cette boutique n'existe pas ou
              n'est plus disponible.
            </p>

            <Link
              className="back-link"
              to="/boutiques"
            >
              ← Retour aux boutiques
            </Link>

          </section>

        </div>

      </main>
    );
  }

  function addToCart(product) {
    const savedCart =
      localStorage.getItem(
        "mon-commerce-cart"
      );

    let cart = [];

    if (savedCart) {
      try {
        const parsedCart =
          JSON.parse(savedCart);

        if (Array.isArray(parsedCart)) {
          cart = parsedCart;
        }
      } catch {
        cart = [];
      }
    }

    const existingProductIndex =
      cart.findIndex(
        function (item) {
          return (
            Number(item.id) ===
            Number(product.id)
          );
        }
      );

    const stock =
      Number(product.stock) || 0;

    if (stock <= 0) {
      alert(
        "Ce produit est en rupture de stock."
      );
      return;
    }

    if (
      existingProductIndex !== -1
    ) {
      const existingProduct =
        cart[existingProductIndex];

      const currentQuantity =
        Number(
          existingProduct.quantity
        ) || 0;

      if (currentQuantity >= stock) {
        alert(
          "Vous avez atteint la quantité maximale disponible."
        );
        return;
      }

      cart[existingProductIndex] = {
        ...existingProduct,
        quantity:
          currentQuantity + 1,
      };

    } else {

      cart.push({
        ...product,
        quantity: 1,
      });

    }

    localStorage.setItem(
      "mon-commerce-cart",
      JSON.stringify(cart)
    );

    window.dispatchEvent(
      new Event("cartUpdated")
    );

    alert(
      product.name +
        " a été ajouté au panier 🛒"
    );
  }

  return (
    <main
      className="shop-page"
      style={{
        "--shop-accent": shop.themeColor || "#0f766e",
      }}
    >

      <PageTitle title={shop.name} />

      <section className="shop-header">

        <div className="shop-container">

          <div className="shop-header-content">

            <div className="shop-logo-large">

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

            <div>

              <div className="shop-meta">

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
                  {shopProducts.length} produit
                  {shopProducts.length > 1
                    ? "s"
                    : ""}
                </span>

              </div>

              <h1>
                {shop.name}
              </h1>

              <p className="shop-description">
                {shop.description ||
                  "Bienvenue dans notre boutique."}
              </p>

            </div>

          </div>

        </div>

      </section>

      <section className="shop-products">

        <div className="shop-container">

          <div className="shop-products-header">

            <h2>
              Produits de la boutique
            </h2>

            <p>
              {shopProducts.length} produit
              {shopProducts.length > 1
                ? "s"
                : ""}{" "}
              disponible
              {shopProducts.length > 1
                ? "s"
                : ""}
            </p>

          </div>

          {shopProducts.length === 0 ? (

            <div className="empty-products">

              Cette boutique n'a pas encore
              ajouté de produits.

            </div>

          ) : (

            <div className="products-grid">

              {shopProducts.map(
                function (product) {

                  const stock =
                    Number(product.stock) || 0;

                  return (
                    <article
                      className="product-card"
                      key={product.id}
                    >

                      <div className="product-image">

                        {product.image ? (

                          <img
                            src={product.image}
                            alt={product.name}
                          />

                        ) : (

                          "🛍️"

                        )}

                      </div>

                      <div className="product-content">

                        <h3>
                          {product.name}
                        </h3>

                        <p className="product-description">
                          {product.description}
                        </p>

                        <strong className="product-price">
                          {Number(
                            product.price
                          ).toLocaleString(
                            "fr-FR"
                          )}{" "}
                          F CFA
                        </strong>

                        <p className="product-stock">
                          Stock : {stock}
                        </p>

                        <div className="product-actions">

                          <Link
                            to={
                              `/produit/` +
                              product.id
                            }
                            className="product-view-button"
                          >
                            Voir le produit →
                          </Link>

                          <button
                            type="button"
                            className="add-to-cart-button"
                            onClick={
                              function () {
                                addToCart(
                                  product
                                );
                              }
                            }
                            disabled={stock <= 0}
                          >
                            {stock <= 0
                              ? "Rupture de stock"
                              : "🛒 Ajouter au panier"}
                          </button>

                        </div>

                      </div>

                    </article>
                  );
                }
              )}

            </div>

          )}

          <Link
            className="back-link"
            to="/boutiques"
          >
            ← Retour aux boutiques
          </Link>

        </div>

      </section>

    </main>
  );
}

export default Shop;