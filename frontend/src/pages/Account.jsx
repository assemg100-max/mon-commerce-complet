import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import {
  getOrdersByEmail,
  updateProfile,
  changePassword,
  clearToken,
} from "../data/api";

import PageTitle from "../components/PageTitle";

import "./Account.css";

function Account() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  const [profileForm, setProfileForm] = useState({
    name: "",
    phone: "",
  });
  const [profileMessage, setProfileMessage] = useState("");
  const [profileError, setProfileError] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordMessage, setPasswordMessage] =
    useState("");
  const [passwordError, setPasswordError] = useState("");
  const [savingPassword, setSavingPassword] =
    useState(false);

  useEffect(() => {
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
      console.error("Erreur utilisateur :", error);
      navigate("/connexion");
      return;
    }

    setUser(currentUser);

    setProfileForm({
      name: currentUser.name || "",
      phone: currentUser.phone || "",
    });

    if (!currentUser.email) {
      setLoadingOrders(false);
      return;
    }

    getOrdersByEmail(currentUser.email)
      .then(setOrders)
      .catch(function (error) {
        console.error(
          "Erreur lors du chargement des commandes :",
          error
        );
        setOrders([]);
      })
      .finally(function () {
        setLoadingOrders(false);
      });
  }, [navigate]);

  function handleLogout() {
    localStorage.removeItem(
      "mon-commerce-current-user"
    );

    clearToken();

    navigate("/");
  }

  function handleProfileChange(event) {
    const { name, value } = event.target;

    setProfileForm(function (previous) {
      return { ...previous, [name]: value };
    });
  }

  function handleProfileSubmit(event) {
    event.preventDefault();

    setProfileMessage("");
    setProfileError("");

    if (!profileForm.name.trim()) {
      setProfileError("Le nom est obligatoire.");
      return;
    }

    setSavingProfile(true);

    updateProfile({
      name: profileForm.name.trim(),
      phone: profileForm.phone.trim(),
    })
      .then(function (updatedUser) {
        localStorage.setItem(
          "mon-commerce-current-user",
          JSON.stringify(updatedUser)
        );

        setUser(updatedUser);

        window.dispatchEvent(new Event("userUpdated"));

        setProfileMessage(
          "Profil mis à jour avec succès ✅"
        );
      })
      .catch(function (error) {
        setProfileError(error.message);
      })
      .finally(function () {
        setSavingProfile(false);
      });
  }

  function handlePasswordChange(event) {
    const { name, value } = event.target;

    setPasswordForm(function (previous) {
      return { ...previous, [name]: value };
    });
  }

  function handlePasswordSubmit(event) {
    event.preventDefault();

    setPasswordMessage("");
    setPasswordError("");

    if (
      !passwordForm.currentPassword ||
      !passwordForm.newPassword
    ) {
      setPasswordError(
        "Tous les champs sont obligatoires."
      );
      return;
    }

    if (
      passwordForm.newPassword !==
      passwordForm.confirmPassword
    ) {
      setPasswordError(
        "Les deux nouveaux mots de passe ne correspondent pas."
      );
      return;
    }

    setSavingPassword(true);

    changePassword(
      passwordForm.currentPassword,
      passwordForm.newPassword
    )
      .then(function () {
        setPasswordMessage(
          "Mot de passe modifié avec succès ✅"
        );

        setPasswordForm({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
      })
      .catch(function (error) {
        setPasswordError(error.message);
      })
      .finally(function () {
        setSavingPassword(false);
      });
  }

  if (!user) {
    return null;
  }

  return (
    <main className="account-page">
<PageTitle title="Mon compte" />

      <div className="account-container">

        <section className="account-welcome">

          <div className="account-avatar">
            {user.name.charAt(0).toUpperCase()}
          </div>

          <div>
            <span>MON COMPTE</span>

            <h1>
              Bonjour {user.name} 👋
            </h1>

            <p>
              Bienvenue sur Mon Commerce Sénégal.
            </p>
          </div>

        </section>

        <section className="account-info">

          <div className="account-section-header">
            <div>
              <h2>Mes informations</h2>

              <p>
                Les informations de votre compte.
              </p>
            </div>
          </div>

          <div className="account-info-grid">

            <div className="account-info-item">
              <span>Nom complet</span>
              <strong>{user.name}</strong>
            </div>

            <div className="account-info-item">
              <span>Adresse email</span>
              <strong>{user.email}</strong>
            </div>

            <div className="account-info-item">
              <span>Type de compte</span>
              <strong>
                {user.role === "merchant"
                  ? "🏪 Commerçant"
                  : "👤 Client"}
              </strong>
            </div>

          </div>

        </section>

        <section className="account-info">

          <div className="account-section-header">
            <div>
              <h2>Modifier mon profil</h2>

              <p>
                Mets à jour ton nom et ton téléphone.
              </p>
            </div>
          </div>

          {profileMessage && (
            <p className="account-form-success">
              {profileMessage}
            </p>
          )}

          {profileError && (
            <p className="account-form-error">
              ⚠️ {profileError}
            </p>
          )}

          <form
            className="account-form"
            onSubmit={handleProfileSubmit}
          >

            <div className="account-form-group">
              <label htmlFor="name">Nom complet</label>
              <input
                id="name"
                name="name"
                type="text"
                value={profileForm.name}
                onChange={handleProfileChange}
              />
            </div>

            <div className="account-form-group">
              <label htmlFor="phone">Téléphone</label>
              <input
                id="phone"
                name="phone"
                type="tel"
                value={profileForm.phone}
                onChange={handleProfileChange}
                placeholder="Ex : 77 123 45 67"
              />
            </div>

            <button type="submit" disabled={savingProfile}>
              {savingProfile
                ? "Enregistrement..."
                : "Enregistrer"}
            </button>

          </form>

        </section>

        <section className="account-info">

          <div className="account-section-header">
            <div>
              <h2>Changer mon mot de passe</h2>

              <p>
                Choisis un nouveau mot de passe pour
                ton compte.
              </p>
            </div>
          </div>

          {passwordMessage && (
            <p className="account-form-success">
              {passwordMessage}
            </p>
          )}

          {passwordError && (
            <p className="account-form-error">
              ⚠️ {passwordError}
            </p>
          )}

          <form
            className="account-form"
            onSubmit={handlePasswordSubmit}
          >

            <div className="account-form-group">
              <label htmlFor="currentPassword">
                Mot de passe actuel
              </label>
              <input
                id="currentPassword"
                name="currentPassword"
                type="password"
                value={passwordForm.currentPassword}
                onChange={handlePasswordChange}
              />
            </div>

            <div className="account-form-group">
              <label htmlFor="newPassword">
                Nouveau mot de passe
              </label>
              <input
                id="newPassword"
                name="newPassword"
                type="password"
                value={passwordForm.newPassword}
                onChange={handlePasswordChange}
              />
            </div>

            <div className="account-form-group">
              <label htmlFor="confirmPassword">
                Confirmer le nouveau mot de passe
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={passwordForm.confirmPassword}
                onChange={handlePasswordChange}
              />
            </div>

            <button
              type="submit"
              disabled={savingPassword}
            >
              {savingPassword
                ? "Enregistrement..."
                : "Changer le mot de passe"}
            </button>

          </form>

        </section>

        <section className="account-orders">

          <div className="account-section-header">

            <div>
              <h2>Mes commandes</h2>

              <p>
                Retrouvez ici vos commandes passées.
              </p>
            </div>

            <span className="account-order-count">
              {orders.length} commande
              {orders.length > 1 ? "s" : ""}
            </span>

          </div>

          {loadingOrders ? (

            <div className="account-empty">
              <p>Chargement de vos commandes...</p>
            </div>

          ) : orders.length === 0 ? (

            <div className="account-empty">

              <div className="account-empty-icon">
                📦
              </div>

              <h3>
                Vous n'avez pas encore de commande
              </h3>

              <p>
                Découvrez nos boutiques et trouvez
                les produits qui vous intéressent.
              </p>

              <Link
                to="/boutiques"
                className="account-shop-button"
              >
                Découvrir les boutiques
              </Link>

            </div>

          ) : (

            <div className="account-orders-list">

              {orders
                .slice()
                .reverse()
                .map((order) => (

                  <article
                    className="account-order-card"
                    key={order.orderNumber}
                  >

                    <div className="account-order-top">

                      <div>
                        <span>
                          Commande
                        </span>

                        <strong>
                          {order.orderNumber}
                        </strong>
                      </div>

                      <span className="account-status">
                        {order.status}
                      </span>

                    </div>

                    <div className="account-order-products">

                      {order.products.map(
                        (product) => (

                          <div
                            className="account-product"
                            key={product.id}
                          >

                            <span>
                              {product.name}
                              {" × "}
                              {product.quantity}
                            </span>

                            <strong>
                              {(
                                product.price *
                                product.quantity
                              ).toLocaleString(
                                "fr-FR"
                              )}{" "}
                              F CFA
                            </strong>

                          </div>

                        )
                      )}

                    </div>

                    <div className="account-order-total">

                      <span>
                        Total
                      </span>

                      <strong>
                        {order.total.toLocaleString(
                          "fr-FR"
                        )}{" "}
                        F CFA
                      </strong>

                    </div>

                  </article>

                ))}

            </div>

          )}

        </section>

        <button
          type="button"
          className="account-logout"
          onClick={handleLogout}
        >
          🚪 Se déconnecter
        </button>

      </div>

    </main>
  );
}

export default Account;