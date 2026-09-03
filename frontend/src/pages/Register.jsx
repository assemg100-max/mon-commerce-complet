import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { registerUser } from "../data/api";

import "./Register.css";

function Register() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    role: "client",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previousForm) => ({
      ...previousForm,
      [name]: value,
    }));

    setError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setLoading(true);
    setError("");

    try {
      const newUser = await registerUser(form);

      localStorage.setItem(
        "mon-commerce-current-user",
        JSON.stringify(newUser)
      );

      window.dispatchEvent(new Event("userUpdated"));

      if (newUser.role === "merchant") {
        navigate("/commercant");
      } else {
        navigate("/");
      }
    } catch (apiError) {
      setError(apiError.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="register-page">
      <div className="register-container">

        <section className="register-card">

          <div className="register-logo">
            🇸🇳
          </div>

          <h1>Créer un compte</h1>

          <p className="register-description">
            Rejoignez Mon Commerce Sénégal.
          </p>

          {error && (
            <div className="register-error">
              ⚠️ {error}
            </div>
          )}

          <form
            className="register-form"
            onSubmit={handleSubmit}
          >

            <div className="register-group">

              <label htmlFor="name">
                Nom complet
              </label>

              <input
                id="name"
                name="name"
                type="text"
                value={form.name}
                onChange={handleChange}
                placeholder="Ex : Amadou Ndiaye"
                required
              />

            </div>

            <div className="register-group">

              <label htmlFor="email">
                Adresse email
              </label>

              <input
                id="email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="exemple@email.com"
                required
              />

            </div>

            <div className="register-group">

              <label htmlFor="password">
                Mot de passe
              </label>

              <input
                id="password"
                name="password"
                type="password"
                value={form.password}
                onChange={handleChange}
                placeholder="Choisissez un mot de passe"
                minLength="6"
                required
              />

            </div>

            <div className="register-group">

              <label htmlFor="phone">
                Téléphone
              </label>

              <input
                id="phone"
                name="phone"
                type="tel"
                value={form.phone}
                onChange={handleChange}
                placeholder="Ex : 77 123 45 67"
              />

            </div>

            <div className="register-group">

              <label>
                Type de compte
              </label>

              <div className="account-types">

                <label className="account-type">
                  <input
                    type="radio"
                    name="role"
                    value="client"
                    checked={form.role === "client"}
                    onChange={handleChange}
                  />

                  <span>
                    <strong>👤 Client</strong>
                    <small>
                      Acheter des produits
                    </small>
                  </span>
                </label>

                <label className="account-type">
                  <input
                    type="radio"
                    name="role"
                    value="merchant"
                    checked={form.role === "merchant"}
                    onChange={handleChange}
                  />

                  <span>
                    <strong>🏪 Commerçant</strong>
                    <small>
                      Vendre mes produits
                    </small>
                  </span>
                </label>

              </div>

            </div>

            <button
              type="submit"
              className="register-submit"
              disabled={loading}
            >
              {loading
                ? "Création du compte..."
                : "Créer mon compte →"}
            </button>

          </form>

          <p className="register-login">
            Vous avez déjà un compte ?
            {" "}
            <Link to="/connexion">
              Se connecter
            </Link>
          </p>

        </section>

      </div>
    </main>
  );
}

export default Register;