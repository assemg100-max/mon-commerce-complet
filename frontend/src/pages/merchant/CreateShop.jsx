import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { createShop } from "../../data/api";

import "./CreateShop.css";

function CreateShop() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    name: "",
    logo: "",
    phone: "",
    city: "",
    category: "Téléphones",
    description: "",
  });

  /*
   * =========================================================
   * CHARGER L'UTILISATEUR
   * =========================================================
   */

  useEffect(() => {
    const savedUser = localStorage.getItem(
      "mon-commerce-current-user"
    );

    /*
     * Aucun utilisateur connecté
     */

    if (!savedUser) {
      navigate("/connexion");
      return;
    }

    try {
      const currentUser = JSON.parse(
        savedUser
      );

      if (
        !currentUser ||
        typeof currentUser !== "object"
      ) {
        navigate("/connexion");
        return;
      }

      /*
       * IMPORTANT :
       *
       * Si l'utilisateur possède déjà
       * une boutique, il ne doit pas
       * pouvoir en créer une deuxième.
       */

      if (
        currentUser.role === "merchant" &&
        currentUser.shopId
      ) {
        navigate("/commercant");
        return;
      }

      setUser(currentUser);
    } catch (error) {
      console.error(
        "Erreur utilisateur :",
        error
      );

      navigate("/connexion");
    }
  }, [navigate]);

  /*
   * =========================================================
   * MODIFICATION DU FORMULAIRE
   * =========================================================
   */

  function handleChange(event) {
    const { name, value } = event.target;

    setForm(function (previousForm) {
      return {
        ...previousForm,
        [name]: value,
      };
    });
  }

  /*
   * =========================================================
   * CRÉATION DE LA BOUTIQUE
   * =========================================================
   */

  function handleSubmit(event) {
    event.preventDefault();

    if (!user) {
      return;
    }

    /*
     * Vérification du nom
     */

    if (!form.name.trim()) {
      alert(
        "Veuillez entrer le nom de votre boutique."
      );

      return;
    }

    /*
     * Vérification du téléphone
     */

    if (!form.phone.trim()) {
      alert(
        "Veuillez entrer le téléphone de la boutique."
      );

      return;
    }

    /*
     * Vérification de la ville
     */

    if (!form.city.trim()) {
      alert(
        "Veuillez entrer la ville de la boutique."
      );

      return;
    }

    /*
     * Vérification de la catégorie
     */

    if (!form.category) {
      alert(
        "Veuillez choisir une catégorie."
      );

      return;
    }

    /*
     * =====================================================
     * IDENTIFIANT DU PROPRIÉTAIRE
     *
     * On garde une référence vers le compte
     * qui possède cette boutique.
     * =====================================================
     */

    const ownerId =
      user.id ||
      user.email ||
      user.phone ||
      user.name;

    setSubmitting(true);

    createShop({
      name: form.name.trim(),
      logo: form.logo.trim(),
      phone: form.phone.trim(),
      city: form.city.trim(),
      category: form.category,
      description:
        form.description.trim() ||
        "Bienvenue dans notre boutique.",
      ownerId: ownerId,
    })
      .then(function (newShop) {
        /*
         * =====================================================
         * TRANSFORMER LE COMPTE EN COMMERÇANT
         * =====================================================
         */

        const updatedUser = {
          ...user,
          role: "merchant",
          shopId: newShop.id,
          shopName: newShop.name,
        };

        localStorage.setItem(
          "mon-commerce-current-user",
          JSON.stringify(updatedUser)
        );

        /*
         * Informe le Header
         */

        window.dispatchEvent(
          new Event("userUpdated")
        );

        window.dispatchEvent(
          new Event("shopsUpdated")
        );

        alert(
          "Votre boutique a été créée avec succès ! 🎉"
        );

        navigate("/commercant");
      })
      .catch(function (error) {
        alert(
          "Impossible de créer la boutique : " +
            error.message
        );
      })
      .finally(function () {
        setSubmitting(false);
      });
  }

  /*
   * =========================================================
   * CHARGEMENT
   * =========================================================
   */

  if (!user) {
    return (
      <main className="create-shop-page">
        <div className="create-shop-container">
          <p>
            Chargement...
          </p>
        </div>
      </main>
    );
  }

  /*
   * =========================================================
   * PAGE
   * =========================================================
   */

  return (
    <main className="create-shop-page">

      <div className="create-shop-container">

        <section className="create-shop-header">

          <span className="create-shop-label">
            MON COMMERCE SÉNÉGAL
          </span>

          <h1>
            Créez votre boutique
          </h1>

          <p>
            Présentez votre boutique aux
            clients sénégalais.
          </p>

        </section>

        <form
          className="create-shop-form"
          onSubmit={handleSubmit}
        >

          <section className="create-shop-card">

            <h2>
              Informations de la boutique
            </h2>

            <p className="create-shop-card-description">
              Ces informations seront visibles
              par les visiteurs de votre boutique.
            </p>

            {/* NOM */}

            <div className="create-shop-form-group">

              <label htmlFor="name">
                Nom de la boutique *
              </label>

              <input
                id="name"
                name="name"
                type="text"
                placeholder="Ex : Boutique Ass"
                value={form.name}
                onChange={handleChange}
                required
              />

            </div>

            {/* LOGO */}

            <div className="create-shop-form-group">

              <label htmlFor="logo">
                Logo de la boutique
              </label>

              <input
                id="logo"
                name="logo"
                type="url"
                placeholder="https://..."
                value={form.logo}
                onChange={handleChange}
              />

              <small>
                Tu peux ajouter une URL
                d'image pour ton logo.
              </small>

            </div>

            {/* TELEPHONE + VILLE */}

            <div className="create-shop-form-row">

              <div className="create-shop-form-group">

                <label htmlFor="phone">
                  Téléphone *
                </label>

                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="77 000 00 00"
                  value={form.phone}
                  onChange={handleChange}
                  required
                />

              </div>

              <div className="create-shop-form-group">

                <label htmlFor="city">
                  Ville *
                </label>

                <input
                  id="city"
                  name="city"
                  type="text"
                  placeholder="Dakar"
                  value={form.city}
                  onChange={handleChange}
                  required
                />

              </div>

            </div>

            {/* CATEGORIE */}

            <div className="create-shop-form-group">

              <label htmlFor="category">
                Catégorie *
              </label>

              <select
                id="category"
                name="category"
                value={form.category}
                onChange={handleChange}
              >

                <option value="Téléphones">
                  Téléphones
                </option>

                <option value="Mode">
                  Mode
                </option>

                <option value="Informatique">
                  Informatique
                </option>

                <option value="Sport">
                  Sport
                </option>

                <option value="Maison">
                  Maison
                </option>

                <option value="Alimentation">
                  Alimentation
                </option>

              </select>

            </div>

            {/* DESCRIPTION */}

            <div className="create-shop-form-group">

              <label htmlFor="description">
                Description
              </label>

              <textarea
                id="description"
                name="description"
                rows="6"
                placeholder="Présentez votre boutique..."
                value={form.description}
                onChange={handleChange}
              />

            </div>

          </section>

          {/* ACTIONS */}

          <div className="create-shop-actions">

            <Link
              to="/"
              className="create-shop-cancel"
            >
              Annuler
            </Link>

            <button
              type="submit"
              className="create-shop-submit"
              disabled={submitting}
            >
              {submitting
                ? "Création en cours..."
                : "🏪 Créer ma boutique"}
            </button>

          </div>

        </form>

      </div>

    </main>
  );
}

export default CreateShop;