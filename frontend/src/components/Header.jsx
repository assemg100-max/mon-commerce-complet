import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { clearToken } from "../data/api";

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

    clearToken();

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
            <svg
              width="32"
              height="32"
              viewBox="0 0 48 48"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <defs>
                <clipPath id="panierForme">
                  <path d="M12 10 L40 10 L35 32 L16 32 Z" />
                </clipPath>
              </defs>

              {/* Panier rempli des 3 couleurs du drapeau */}
              <g clipPath="url(#panierForme)">
                <rect x="10" y="8" width="10" height="26" fill="#00853F" />
                <rect x="20" y="8" width="10" height="26" fill="#FDEF42" />
                <rect x="30" y="8" width="10" height="26" fill="#E31B23" />
              </g>

              {/* Étoile au centre, dans la bande jaune */}
              <text
                x="26"
                y="24"
                fontSize="9"
                textAnchor="middle"
                fill="#00853F"
              >
                ★
              </text>

              {/* Contour du panier */}
              <path
                d="M12 10 L40 10 L35 32 L16 32 Z"
                fill="none"
                stroke="#1a1a1a"
                strokeWidth="2"
                strokeLinejoin="round"
              />

              {/* Manche */}
              <path
                d="M4 6 H10 L12 10"
                fill="none"
                stroke="#1a1a1a"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Roues */}
              <circle cx="20" cy="40" r="3" fill="#1a1a1a" />
              <circle cx="32" cy="40" r="3" fill="#1a1a1a" />
            </svg>
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
                to="/compte"
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