import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { loginUser } from "../data/api";

import PageTitle from "../components/PageTitle";

import "./Login.css";

function Login() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    password: "",
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
      const user = await loginUser(
        form.email,
        form.password
      );

      localStorage.setItem(
        "mon-commerce-current-user",
        JSON.stringify(user)
      );

      window.dispatchEvent(new Event("userUpdated"));

      if (user.role === "merchant") {
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
    <main className="login-page">
      <PageTitle title="Connexion" />
      <div className="login-container">

        <section className="login-card">

          <div className="login-logo">
            🇸🇳
          </div>

          <h1>Connexion</h1>

          <p className="login-description">
            Connectez-vous à votre compte
            Mon Commerce Sénégal.
          </p>

          {error && (
            <div className="login-error">
              ⚠️ {error}
            </div>
          )}

          <form
            className="login-form"
            onSubmit={handleSubmit}
          >

            <div className="login-group">

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

            <div className="login-group">

              <label htmlFor="password">
                Mot de passe
              </label>

              <input
                id="password"
                name="password"
                type="password"
                value={form.password}
                onChange={handleChange}
                placeholder="Votre mot de passe"
                required
              />

            </div>

            <button
              type="submit"
              className="login-submit"
              disabled={loading}
            >
              {loading ? "Connexion..." : "Se connecter"}
            </button>

          </form>

          <p className="login-forgot">
            <Link to="/mot-de-passe-oublie">
              Mot de passe oublié ?
            </Link>
          </p>

          <p className="login-register">
            Vous n'avez pas encore de compte ?
            {" "}
            <Link to="/inscription">
              Créer un compte
            </Link>
          </p>

        </section>

      </div>
    </main>
  );
}

export default Login;