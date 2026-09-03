import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import {
  getProductById,
  getReviews,
  createReview,
  getFavorites,
  addFavorite,
  removeFavorite,
} from "../data/api";

import "./Product.css";

function getCurrentUser() {
  const savedUser = localStorage.getItem(
    "mon-commerce-current-user"
  );

  if (!savedUser) {
    return null;
  }

  try {
    return JSON.parse(savedUser);
  } catch (error) {
    return null;
  }
}

function Product() {
  const { id } = useParams();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [quantity, setQuantity] = useState(1);

  const [reviews, setReviews] = useState([]);
  const [isFavorite, setIsFavorite] = useState(false);

  const [reviewForm, setReviewForm] = useState({
    rating: 5,
    comment: "",
  });
  const [reviewError, setReviewError] = useState("");
  const [submittingReview, setSubmittingReview] =
    useState(false);

  const currentUser = getCurrentUser();

  useEffect(function () {
    setLoading(true);
    setNotFound(false);
    setQuantity(1);

    getProductById(id)
      .then(setProduct)
      .catch(function () {
        setNotFound(true);
      })
      .finally(function () {
        setLoading(false);
      });

    getReviews(id)
      .then(setReviews)
      .catch(function (error) {
        console.error(
          "Erreur lors du chargement des avis :",
          error
        );
      });

    if (currentUser && currentUser.email) {
      getFavorites(currentUser.email)
        .then(function (favoriteProducts) {
          const found = favoriteProducts.some(
            function (favoriteProduct) {
              return (
                Number(favoriteProduct.id) ===
                Number(id)
              );
            }
          );

          setIsFavorite(found);
        })
        .catch(function (error) {
          console.error(
            "Erreur lors du chargement des favoris :",
            error
          );
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function toggleFavorite() {
    if (!currentUser || !currentUser.email) {
      alert(
        "Connectez-vous pour enregistrer ce produit dans vos favoris."
      );
      return;
    }

    if (isFavorite) {
      removeFavorite(currentUser.email, id)
        .then(function () {
          setIsFavorite(false);
        })
        .catch(function (error) {
          alert(error.message);
        });
    } else {
      addFavorite(currentUser.email, id)
        .then(function () {
          setIsFavorite(true);
        })
        .catch(function (error) {
          alert(error.message);
        });
    }
  }

  function handleReviewSubmit(event) {
    event.preventDefault();

    setReviewError("");

    if (!currentUser || !currentUser.email) {
      setReviewError(
        "Connectez-vous pour laisser un avis."
      );
      return;
    }

    setSubmittingReview(true);

    createReview({
      productId: id,
      customerEmail: currentUser.email,
      customerName: currentUser.name || "Client",
      rating: reviewForm.rating,
      comment: reviewForm.comment.trim(),
    })
      .then(function (newReview) {
        setReviews(function (previousReviews) {
          return [newReview, ...previousReviews];
        });

        setReviewForm({ rating: 5, comment: "" });

        /*
         * On rafraîchit le produit pour mettre à
         * jour sa note moyenne affichée.
         */
        getProductById(id).then(setProduct);
      })
      .catch(function (error) {
        setReviewError(error.message);
      })
      .finally(function () {
        setSubmittingReview(false);
      });
  }

  if (loading) {
    return (
      <main className="product-page">
        <div className="product-container">
          <section className="product-not-found">
            <p>Chargement du produit...</p>
          </section>
        </div>
      </main>
    );
  }

  if (notFound || !product) {
    return (
      <main className="product-page">
        <div className="product-container">

          <section className="product-not-found">
            <div className="product-not-found-icon">
              ❌
            </div>

            <h1>
              Produit introuvable
            </h1>

            <p>
              Ce produit n'existe pas ou
              n'est plus disponible.
            </p>

            <Link
              to="/boutiques"
              className="product-back-button"
            >
              ← Retour aux boutiques
            </Link>
          </section>

        </div>
      </main>
    );
  }

  function decreaseQuantity() {
    setQuantity(function (currentQuantity) {
      if (currentQuantity <= 1) {
        return 1;
      }

      return currentQuantity - 1;
    });
  }

  function increaseQuantity() {
    setQuantity(function (currentQuantity) {
      const stock = Number(product.stock) || 0;

      if (currentQuantity >= stock) {
        return currentQuantity;
      }

      return currentQuantity + 1;
    });
  }

  function addToCart() {
    const savedCart = localStorage.getItem(
      "mon-commerce-cart"
    );

    let cart = [];

    if (savedCart) {
      try {
        const parsedCart = JSON.parse(savedCart);

        if (Array.isArray(parsedCart)) {
          cart = parsedCart;
        }
      } catch {
        cart = [];
      }
    }

    const existingProductIndex = cart.findIndex(
      function (item) {
        return item.id === product.id;
      }
    );

    const stock = Number(product.stock) || 0;

    if (existingProductIndex !== -1) {
      const existingProduct =
        cart[existingProductIndex];

      const currentQuantity =
        Number(existingProduct.quantity) || 0;

      if (currentQuantity + quantity > stock) {
        alert(
          "La quantité demandée dépasse le stock disponible."
        );
        return;
      }

      cart[existingProductIndex] = {
        ...existingProduct,
        quantity: currentQuantity + quantity,
      };
    } else {
      cart.push({
        ...product,
        quantity: quantity,
      });
    }

    localStorage.setItem(
      "mon-commerce-cart",
      JSON.stringify(cart)
    );

    window.dispatchEvent(new Event("cartUpdated"));

    alert(
      quantity +
        " × " +
        product.name +
        " ajouté au panier 🛒"
    );
  }

  const price = Number(product.price) || 0;
  const stock = Number(product.stock) || 0;
  const averageRating = Number(product.averageRating) || 0;
  const reviewCount = Number(product.reviewCount) || 0;

  const hasAlreadyReviewed =
    currentUser &&
    currentUser.email &&
    reviews.some(function (review) {
      return (
        review.customerEmail &&
        review.customerEmail.toLowerCase() ===
          currentUser.email.toLowerCase()
      );
    });

  return (
    <main className="product-page">

      <div className="product-container">

        <Link
          to={"/boutique/" + product.shopId}
          className="product-back-link"
        >
          ← Retour à la boutique
        </Link>

        <section className="product-detail">

          <div className="product-image-container">

            <img
              src={product.image}
              alt={product.name}
              className="product-main-image"
            />

            <button
              type="button"
              className={
                "product-favorite-button" +
                (isFavorite ? " is-favorite" : "")
              }
              onClick={toggleFavorite}
              aria-label={
                isFavorite
                  ? "Retirer des favoris"
                  : "Ajouter aux favoris"
              }
            >
              {isFavorite ? "♥" : "♡"}
            </button>

          </div>

          <div className="product-detail-info">

            <span className="product-category">
              {product.category}
            </span>

            <h1>
              {product.name}
            </h1>

            {reviewCount > 0 && (
              <div className="product-rating-summary">
                <span className="product-rating-stars">
                  {"★".repeat(Math.round(averageRating))}
                  {"☆".repeat(
                    5 - Math.round(averageRating)
                  )}
                </span>

                <span>
                  {averageRating} / 5 ({reviewCount} avis)
                </span>
              </div>
            )}

            <strong className="product-detail-price">
              {price.toLocaleString("fr-FR")}{" "}
              F CFA
            </strong>

            <p className="product-detail-description">
              {product.description}
            </p>

            <div className="product-stock-info">

              <span>
                Stock disponible
              </span>

              <strong>
                {stock} unité
                {stock > 1 ? "s" : ""}
              </strong>

            </div>

            {stock > 0 ? (
              <>
                <div className="product-quantity">

                  <span>
                    Quantité
                  </span>

                  <div className="quantity-selector">

                    <button
                      type="button"
                      onClick={decreaseQuantity}
                      disabled={quantity <= 1}
                    >
                      −
                    </button>

                    <span>
                      {quantity}
                    </span>

                    <button
                      type="button"
                      onClick={increaseQuantity}
                      disabled={quantity >= stock}
                    >
                      +
                    </button>

                  </div>

                </div>

                <div className="product-purchase">

                  <button
                    type="button"
                    className="product-add-button"
                    onClick={addToCart}
                  >
                    🛒 Ajouter au panier
                  </button>

                  <Link
                    to="/panier"
                    className="product-cart-button"
                  >
                    Voir mon panier
                  </Link>

                </div>
              </>
            ) : (
              <div className="product-out-of-stock">
                Rupture de stock
              </div>
            )}

          </div>

        </section>

        {/* =========================================================
            AVIS CLIENTS
        ========================================================= */}

        <section className="product-reviews">

          <h2>
            Avis clients
            {reviewCount > 0 ? " (" + reviewCount + ")" : ""}
          </h2>

          {reviews.length === 0 ? (
            <p className="product-reviews-empty">
              Aucun avis pour l'instant. Soyez le premier
              à donner votre avis sur ce produit.
            </p>
          ) : (
            <div className="product-reviews-list">

              {reviews.map(function (review) {
                return (
                  <article
                    className="product-review-card"
                    key={review.id}
                  >

                    <div className="product-review-top">

                      <strong>
                        {review.customerName}
                      </strong>

                      <span className="product-review-stars">
                        {"★".repeat(review.rating)}
                        {"☆".repeat(5 - review.rating)}
                      </span>

                    </div>

                    {review.comment && (
                      <p>{review.comment}</p>
                    )}

                  </article>
                );
              })}

            </div>
          )}

          {currentUser ? (
            hasAlreadyReviewed ? (
              <p className="product-reviews-thanks">
                Merci, vous avez déjà laissé un avis sur
                ce produit.
              </p>
            ) : (
              <form
                className="product-review-form"
                onSubmit={handleReviewSubmit}
              >

                <h3>
                  Laisser un avis
                </h3>

                {reviewError && (
                  <p className="product-review-error">
                    ⚠️ {reviewError}
                  </p>
                )}

                <label htmlFor="rating">
                  Votre note
                </label>

                <select
                  id="rating"
                  value={reviewForm.rating}
                  onChange={function (event) {
                    setReviewForm(function (previous) {
                      return {
                        ...previous,
                        rating: Number(
                          event.target.value
                        ),
                      };
                    });
                  }}
                >
                  <option value={5}>★★★★★ — Excellent</option>
                  <option value={4}>★★★★☆ — Très bien</option>
                  <option value={3}>★★★☆☆ — Correct</option>
                  <option value={2}>★★☆☆☆ — Décevant</option>
                  <option value={1}>★☆☆☆☆ — Mauvais</option>
                </select>

                <label htmlFor="comment">
                  Votre commentaire (facultatif)
                </label>

                <textarea
                  id="comment"
                  rows="3"
                  value={reviewForm.comment}
                  onChange={function (event) {
                    setReviewForm(function (previous) {
                      return {
                        ...previous,
                        comment: event.target.value,
                      };
                    });
                  }}
                  placeholder="Qu'avez-vous pensé de ce produit ?"
                />

                <button
                  type="submit"
                  disabled={submittingReview}
                >
                  {submittingReview
                    ? "Envoi..."
                    : "Publier mon avis"}
                </button>

              </form>
            )
          ) : (
            <p className="product-reviews-login">
              <Link to="/connexion">Connectez-vous</Link>{" "}
              pour laisser un avis sur ce produit.
            </p>
          )}

        </section>

      </div>

    </main>
  );
}

export default Product;
