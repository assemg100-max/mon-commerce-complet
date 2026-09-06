import { useState } from "react";
import { Link } from "react-router-dom";

import { forgotPassword } from "../data/api";

import "./Login.css";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setMessage("");

    if (!email.trim()) {
      setError("Veuillez entrer votre email.");
      return;
    }

    setLoading(true);

    forgotPassword(email.trim())
      .then(function (data) {
        setMessage(data.message);
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

          <h1>Mot de passe oublié</h1>

          <p className="login-description">
            Entrez votre email, nous vous enverrons un
            lien pour créer un nouveau mot de passe.
          </p>

          {message && (
            <p className="account-form-success">
              {message}
            </p>
          )}

          {error && (
            <p className="login-error">⚠️ {error}</p>
          )}

          <form className="login-form" onSubmit={handleSubmit}>

            <div className="login-group">
              <label htmlFor="email">
                Adresse email
              </label>

              <input
                id="email"
                type="email"
                value={email}
                onChange={function (event) {
                  setEmail(event.target.value);
                }}
                placeholder="votre@email.com"
              />
            </div>

            <button
              type="submit"
              className="login-submit"
              disabled={loading}
            >
              {loading
                ? "Envoi..."
                : "Envoyer le lien"}
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

export default ForgotPassword;
