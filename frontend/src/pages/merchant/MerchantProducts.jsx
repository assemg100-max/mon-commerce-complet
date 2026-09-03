import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import {
  getProducts,
  deleteProduct as deleteStoredProduct,
  getShopByOwner,
} from "../../data/api";

import "./MerchantProducts.css";

function MerchantProducts() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [products, setProducts] = useState([]);

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

      getShopByOwner(currentUser).then(function (shop) {
        if (!shop) {
          setProducts([]);
          return;
        }

        loadProducts(shop.id);
      });
    } catch (error) {
      console.error("Erreur utilisateur :", error);
      navigate("/connexion");
    }
  }, [navigate]);

  function loadProducts(shopId) {
    getProducts(shopId)
      .then(setProducts)
      .catch(function (error) {
        console.error(
          "Erreur lors du chargement des produits :",
          error
        );
      });
  }

  function deleteProduct(productId) {
    const confirmed = window.confirm(
      "Voulez-vous vraiment supprimer ce produit ?"
    );

    if (!confirmed) {
      return;
    }

    getShopByOwner(user).then(function (shop) {
      if (!shop) {
        return;
      }

      const product = products.find(
        (item) => Number(item.id) === Number(productId)
      );

      if (
        !product ||
        Number(product.shopId) !== Number(shop.id)
      ) {
        alert("Vous ne pouvez pas supprimer ce produit.");
        return;
      }

      deleteStoredProduct(productId).then(function () {
        loadProducts(shop.id);
      });
    });
  }

  if (!user) {
    return (
      <main className="merchant-products-page">
        <div className="merchant-products-container">
          <p>Chargement...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="merchant-products-page">

      <div className="merchant-products-container">

        <div className="merchant-products-header">

          <div>
            <span className="merchant-products-label">
              ESPACE COMMERÇANT
            </span>

            <h1>
              Mes produits
            </h1>

            <p>
              Gérez les produits de votre boutique.
            </p>
          </div>

          <div className="merchant-products-header-actions">

            <Link
              to="/commercant"
              className="merchant-products-back-button"
            >
              ← Dashboard
            </Link>

            <Link
              to="/commercant/produits/ajouter"
              className="merchant-add-product-button"
            >
              + Ajouter un produit
            </Link>

          </div>

        </div>

        <div className="merchant-products-count">

          <strong>
            {products.length}
          </strong>

          <span>
            produit
            {products.length > 1 ? "s" : ""}
          </span>

        </div>

        {products.length === 0 ? (

          <section className="merchant-products-empty">

            <div className="merchant-products-empty-icon">
              📦
            </div>

            <h2>
              Aucun produit
            </h2>

            <p>
              Votre boutique ne possède pas encore
              de produit.
            </p>

            <Link
              to="/commercant/produits/ajouter"
              className="merchant-add-product-button"
            >
              + Ajouter mon premier produit
            </Link>

          </section>

        ) : (

          <section className="merchant-products-grid">

            {products.map((product) => {

              const price =
                Number(product.price) || 0;

              const stock =
                Number(product.stock) || 0;

              return (
                <article
                  className="merchant-product-card"
                  key={product.id}
                >

                  <div className="merchant-product-image">

                    {product.image ? (
                      <img
                        src={product.image}
                        alt={product.name}
                      />
                    ) : (
                      <span>
                        🛍️
                      </span>
                    )}

                  </div>

                  <div className="merchant-product-content">

                    <span className="merchant-product-category">
                      {product.category}
                    </span>

                    <h2>
                      {product.name}
                    </h2>

                    <p>
                      {product.description}
                    </p>

                    <strong className="merchant-product-price">
                      {price.toLocaleString("fr-FR")} F CFA
                    </strong>

                    <span
                      className={
                        stock > 0
                          ? "merchant-product-stock available"
                          : "merchant-product-stock unavailable"
                      }
                    >
                      {stock > 0
                        ? `Stock : ${stock}`
                        : "Rupture de stock"}
                    </span>

                    <div className="merchant-product-actions">

                      <Link
                        to={`/commercant/produits/modifier/${product.id}`}
                        className="merchant-edit-product-button"
                      >
                        ✏️ Modifier
                      </Link>

                      <button
                        type="button"
                        className="merchant-delete-product-button"
                        onClick={() =>
                          deleteProduct(product.id)
                        }
                      >
                        🗑️ Supprimer
                      </button>

                    </div>

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

export default MerchantProducts;