import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import "./Header.css";

function Header() {
  const location = useLocation();
  const navigate = useNavigate();

  const [cartCount, setCartCount] = useState(0);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    updateCartCount();
    loadCurrentUser();

    window.addEventListener("cartUpdated", updateCartCount);
    window.addEventListener("storage", updateCartCount);
    window.addEventListener("userUpdated", loadCurrentUser);

    return () => {
      window.removeEventListener("cartUpdated", updateCartCount);
      window.removeEventListener("storage", updateCartCount);
      window.removeEventListener("userUpdated", loadCurrentUser);
    };
  }, [location]);

  function loadCurrentUser() {
    const savedUser = localStorage.getItem(
      "mon-commerce-current-user"
    );

    if (!savedUser) {
      setCurrentUser(null);
      return;
    }

    try {
      const user = JSON.parse(savedUser);

      if (user && typeof user === "object") {
        setCurrentUser(user);
      } else {
        setCurrentUser(null);
      }
    } catch {
      setCurrentUser(null);
    }
  }

  function updateCartCount() {
    const savedCart = localStorage.getItem(
      "mon-commerce-cart"
    );

    if (!savedCart) {
      setCartCount(0);
      return;
    }

    try {
      const cart = JSON.parse(savedCart);

      if (!Array.isArray(cart)) {
        setCartCount(0);
        return;
      }

      const count = cart.reduce(
        (total, product) =>
          total + Number(product.quantity || 0),
        0
      );

      setCartCount(count);
    } catch {
      setCartCount(0);
    }
  }

  function handleLogout() {
    localStorage.removeItem(
      "mon-commerce-current-user"
    );

    setCurrentUser(null);

    window.dispatchEvent(
      new Event("userUpdated")
    );

    navigate("/");

  }

  const isMerchant =
    currentUser?.role === "merchant";

  return (
    <header className="site-header">

      <div className="header-container">

        {/* =========================
            LOGO
        ========================= */}

        <Link
          to="/"
          className="header-logo"
        >
          <span className="header-logo-icon">
            🇸🇳
          </span>

          <span>
            Mon Commerce Sénégal
          </span>
        </Link>


        {/* =========================
            NAVIGATION
        ========================= */}

        <nav className="header-nav">

          <Link
            to="/"
            className={
              location.pathname === "/"
                ? "active"
                : ""
            }
          >
            Accueil
          </Link>


          <Link
            to="/boutiques"
            className={
              location.pathname.startsWith("/boutiques") ||
              location.pathname.startsWith("/boutique/")
                ? "active"
                : ""
            }
          >
            Boutiques
          </Link>


          <Link
            to="/categories"
            className={
              location.pathname.startsWith(
                "/categories"
              )
                ? "active"
                : ""
            }
          >
            Catégories
          </Link>

        </nav>


        {/* =========================
            ACTIONS
        ========================= */}

        <div className="header-actions">

          {/* =========================
              ESPACE COMMERÇANT
          ========================= */}

          {isMerchant && (
            <Link
              to="/commercant"
              className={
                location.pathname.startsWith(
                  "/commercant"
                )
                  ? "header-merchant-button active"
                  : "header-merchant-button"
              }
            >
              🏪 Mon espace commerçant
            </Link>
          )}

          {currentUser?.role === "admin" && (
            <Link
              to="/admin"
              className={
                location.pathname.startsWith("/admin")
                  ? "header-merchant-button active"
                  : "header-merchant-button"
              }
            >
              📊 Administration
            </Link>
          )}


          {/* =========================
              FAVORIS
          ========================= */}

          {currentUser && !isMerchant && (
            <Link
              to="/favoris"
              className="header-cart"
            >
              ♡
              <span>Favoris</span>
            </Link>
          )}


          {/* =========================
              PANIER
          ========================= */}

          <Link
            to="/panier"
            className="header-cart"
          >
            🛒

            <span>
              Panier
            </span>

            {cartCount > 0 && (
              <span className="cart-badge">
                {cartCount}
              </span>
            )}

          </Link>


          {/* =========================
              UTILISATEUR CONNECTÉ
          ========================= */}

          {currentUser && (
            <div className="header-user">

              <Link
                to={
                  isMerchant
                    ? "/commercant/profil"
                    : "/compte"
                }
                className="header-user-button"
              >
                👤{" "}
                {currentUser.name ||
                  currentUser.email ||
                  "Mon compte"}
              </Link>

              <button
                type="button"
                className="header-logout-button"
                onClick={handleLogout}
              >
                Déconnexion
              </button>

            </div>
          )}


          {/* =========================
              UTILISATEUR NON CONNECTÉ
          ========================= */}

          {!currentUser && (
            <>
              <Link
                to="/connexion"
                className="header-login"
              >
                Connexion
              </Link>

              <Link
                to="/inscription"
                className="header-register"
              >
                Créer une boutique
              </Link>
            </>
          )}

        </div>

      </div>

    </header>
  );
}

export default Header;