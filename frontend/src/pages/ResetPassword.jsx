import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { resetPassword } from "../data/api";

import "./Login.css";

function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const email = searchParams.get("email") || "";
  const token = searchParams.get("token") || "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleSubmit(event) {
    event.preventDefault();

    setError("");

    if (!email || !token) {
      setError(
        "Ce lien est invalide. Refaites une demande de réinitialisation."
      );
      return;
    }

    if (newPassword.length < 6) {
      setError(
        "Le mot de passe doit contenir au moins 6 caractères."
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(
        "Les deux mots de passe ne correspondent pas."
      );
      return;
    }

    setLoading(true);

    resetPassword(email, token, newPassword)
      .then(function () {
        alert(
          "Votre mot de passe a été réinitialisé avec succès ! Connectez-vous."
        );

        navigate("/connexion");
      })
      .catch(function (apiError) {
        setError(apiError.message);
      })
      .finally(function () {
        setLoading(false);
      });
  }

  return (
    <main className="login-page">
      <div className="login-container">

        <div className="login-card">

          <h1>Nouveau mot de passe</h1>

          <p className="login-description">
            Choisissez un nouveau mot de passe pour{" "}
            {email || "votre compte"}.
          </p>

          {error && (
            <p className="login-error">⚠️ {error}</p>
          )}

          <form className="login-form" onSubmit={handleSubmit}>

            <div className="login-group">
              <label htmlFor="newPassword">
                Nouveau mot de passe
              </label>

              <input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={function (event) {
                  setNewPassword(event.target.value);
                }}
              />
            </div>

            <div className="login-group">
              <label htmlFor="confirmPassword">
                Confirmer le mot de passe
              </label>

              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={function (event) {
                  setConfirmPassword(event.target.value);
                }}
              />
            </div>

            <button
              type="submit"
              className="login-submit"
              disabled={loading}
            >
              {loading
                ? "Enregistrement..."
                : "Réinitialiser le mot de passe"}
            </button>

          </form>

          <p className="login-register">
            <Link to="/connexion">
              ← Retour à la connexion
            </Link>
          </p>

        </div>

      </div>
    </main>
  );
}

export default ResetPassword;
