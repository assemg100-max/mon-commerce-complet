import { Link } from "react-router-dom";
import { useEffect, useState } from "react";

import "./Cart.css";

function Cart() {
const [cart, setCart] = useState([]);

useEffect(() => {
loadCart();

function handleCartUpdated() {
  loadCart();
}

window.addEventListener(
  "cartUpdated",
  handleCartUpdated
);

window.addEventListener(
  "storage",
  handleCartUpdated
);

return () => {
  window.removeEventListener(
    "cartUpdated",
    handleCartUpdated
  );

  window.removeEventListener(
    "storage",
    handleCartUpdated
  );
};

}, []);

function loadCart() {
const savedCart =
localStorage.getItem(
"mon-commerce-cart"
);

if (!savedCart) {
  setCart([]);
  return;
}

try {
  const parsedCart =
    JSON.parse(savedCart);

  if (Array.isArray(parsedCart)) {
    setCart(parsedCart);
  } else {
    setCart([]);
  }
} catch (error) {
  console.error(
    "Erreur panier :",
    error
  );

  setCart([]);
}

}

function saveCart(newCart) {
setCart(newCart);

localStorage.setItem(
  "mon-commerce-cart",
  JSON.stringify(newCart)
);

window.dispatchEvent(
  new Event("cartUpdated")
);

}

function increaseQuantity(productId) {
const newCart = cart.map(
(product) => {
if (product.id !== productId) {
return product;
}

    const quantity =
      Number(product.quantity) || 0;

    const stock =
      Number(product.stock) || 0;

    if (
      stock > 0 &&
      quantity >= stock
    ) {
      return product;
    }

    return {
      ...product,
      quantity: quantity + 1,
    };
  }
);

saveCart(newCart);

}

function decreaseQuantity(productId) {
const newCart = cart
.map((product) => {
if (product.id !== productId) {
return product;
}

    const quantity =
      Number(product.quantity) || 0;

    if (quantity <= 1) {
      return null;
    }

    return {
      ...product,
      quantity: quantity - 1,
    };
  })
  .filter(
    (product) =>
      product !== null
  );

saveCart(newCart);

}

function removeProduct(productId) {
const newCart = cart.filter(
(product) =>
product.id !== productId
);

saveCart(newCart);

}

function clearCart() {
const confirmed =
window.confirm(
"Voulez-vous vraiment vider votre panier ?"
);

if (!confirmed) {
  return;
}

saveCart([]);

}

const totalProducts =
cart.reduce(
(sum, product) => {
return (
sum +
(Number(
product.quantity
) || 0)
);
},
0
);

const total =
cart.reduce(
(sum, product) => {
const price =
Number(product.price) || 0;

    const quantity =
      Number(product.quantity) || 0;

    return (
      sum +
      price * quantity
    );
  },
  0
);

if (cart.length === 0) {
return (
<main className="cart-page">

    <div className="cart-container">

      <section className="cart-empty">

        <div className="cart-empty-icon">
          🛒
        </div>

        <h1>
          Votre panier est vide
        </h1>

        <p>
          Vous n'avez encore
          ajouté aucun produit
          à votre panier.
        </p>

        <Link
          to="/boutiques"
          className="cart-shopping-button"
        >
          Découvrir les boutiques
        </Link>

      </section>

    </div>

  </main>
);

}

return (
<main className="cart-page">

  <div className="cart-container">

    <div className="cart-header">

      <div>

        <span className="cart-label">
          MON COMMERCE SÉNÉGAL
        </span>

        <h1>
          Mon panier
        </h1>

        <p>
          {totalProducts} article
          {totalProducts > 1
            ? "s"
            : ""}{" "}
          dans votre panier
        </p>

      </div>

      <button
        type="button"
        className="clear-cart-button"
        onClick={clearCart}
      >
        Vider le panier
      </button>

    </div>

    <div className="cart-layout">

      <section className="cart-products">

        {cart.map(
          (product) => {
            const price =
              Number(
                product.price
              ) || 0;

            const quantity =
              Number(
                product.quantity
              ) || 0;

            const stock =
              Number(
                product.stock
              ) || 0;

            const productTotal =
              price * quantity;

            return (
              <article
                className="cart-product"
                key={product.id}
              >

                <div className="cart-product-image">

                  {product.image ? (
                    <img
                      src={
                        product.image
                      }
                      alt={
                        product.name
                      }
                    />
                  ) : (
                    <span>
                      🛍️
                    </span>
                  )}

                </div>

                <div className="cart-product-info">

                  <h2>
                    {product.name}
                  </h2>

                  <p>
                    {product.description ||
                      "Produit disponible."}
                  </p>

                  <strong>
                    {price.toLocaleString(
                      "fr-FR"
                    )}{" "}
                    F CFA
                  </strong>

                </div>

                <div className="cart-product-actions">

                  <div className="quantity-selector">

                    <button
                      type="button"
                      onClick={() =>
                        decreaseQuantity(
                          product.id
                        )
                      }
                      disabled={
                        quantity <= 1
                      }
                    >
                      −
                    </button>

                    <span>
                      {quantity}
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        increaseQuantity(
                          product.id
                        )
                      }
                      disabled={
                        stock > 0 &&
                        quantity >= stock
                      }
                    >
                      +
                    </button>

                  </div>

                  <strong className="cart-product-total">
                    {productTotal.toLocaleString(
                      "fr-FR"
                    )}{" "}
                    F CFA
                  </strong>

                  <button
                    type="button"
                    className="remove-product-button"
                    onClick={() =>
                      removeProduct(
                        product.id
                      )
                    }
                  >
                    Supprimer
                  </button>

                </div>

              </article>
            );
          }
        )}

      </section>

      <aside className="cart-summary">

        <h2>
          Résumé de la commande
        </h2>

        <div className="cart-summary-line">

          <span>
            Produits
          </span>

          <span>
            {totalProducts}
          </span>

        </div>

        <div className="cart-summary-total">

          <span>
            Total
          </span>

          <strong>
            {total.toLocaleString(
              "fr-FR"
            )}{" "}
            F CFA
          </strong>

        </div>

        <Link
          to="/commande"
          className="checkout-button"
        >
          Passer la commande →
        </Link>

        <Link
          to="/boutiques"
          className="continue-shopping-link"
        >
          ← Continuer mes achats
        </Link>

      </aside>

    </div>

  </div>

</main>

);
}

export default Cart;