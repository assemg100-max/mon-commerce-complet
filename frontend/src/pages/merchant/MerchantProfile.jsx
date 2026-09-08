import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import {
  getShopById,
  updateShop,
} from "../../data/api";
import { fileToResizedBase64 } from "../../data/imageUpload";

import "./MerchantProfile.css";

function MerchantProfile() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [shop, setShop] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const [form, setForm] = useState({
    name: "",
    logo: "",
    phone: "",
    city: "",
    category: "Téléphones",
    description: "",
    themeColor: "#e8890c",
    orangeMoneyNumber: "",
    waveNumber: "",
  });

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
      console.error(
        "Erreur lors du chargement du profil :",
        error
      );

      navigate("/connexion");
      return;
    }

    if (currentUser.role !== "merchant") {
      navigate("/");
      return;
    }

    if (!currentUser.shopId) {
      navigate("/creer-boutique");
      return;
    }

    getShopById(currentUser.shopId)
      .then(function (currentShop) {
        setUser(currentUser);
        setShop(currentShop);

        setForm({
          name: currentShop.name || "",
          logo: currentShop.logo || "",
          phone: currentShop.phone || "",
          city: currentShop.city || "",
          category:
            currentShop.category || "Téléphones",
          description:
            currentShop.description || "",
          themeColor:
            currentShop.themeColor || "#e8890c",
          orangeMoneyNumber:
            currentShop.orangeMoneyNumber || "",
          waveNumber: currentShop.waveNumber || "",
        });
      })
      .catch(function () {
        alert("Boutique introuvable.");
        navigate("/creer-boutique");
      });
  }, [navigate]);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm(function (previousForm) {
      return {
        ...previousForm,
        [name]: value,
      };
    });
  }

  function handleLogoUpload(event) {
    const file = event.target.files[0];

    if (!file) {
      return;
    }

    setUploadingLogo(true);

    fileToResizedBase64(file)
      .then(function (dataUrl) {
        setForm((previousForm) => ({
          ...previousForm,
          logo: dataUrl,
        }));
      })
      .catch(function (uploadError) {
        alert(uploadError.message);
      })
      .finally(function () {
        setUploadingLogo(false);
      });
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!user || !shop) {
      return;
    }

    if (!form.name.trim()) {
      alert(
        "Veuillez entrer le nom de votre boutique."
      );
      return;
    }

    if (!form.phone.trim()) {
      alert(
        "Veuillez entrer le téléphone de la boutique."
      );
      return;
    }

    if (!form.city.trim()) {
      alert(
        "Veuillez entrer la ville de la boutique."
      );
      return;
    }

    const updates = {
      name: form.name.trim(),

      logo: form.logo.trim(),

      phone: form.phone.trim(),

      city: form.city.trim(),

      category: form.category,

      themeColor: form.themeColor,

      orangeMoneyNumber: form.orangeMoneyNumber.trim(),

      waveNumber: form.waveNumber.trim(),

      description:
        form.description.trim() ||
        "Bienvenue dans notre boutique.",
    };

    setSubmitting(true);

    try {
      const updatedShop = await updateShop(
        shop.id,
        updates
      );

      const updatedUser = {
        ...user,
        shopName: updatedShop.name,
      };

      localStorage.setItem(
        "mon-commerce-current-user",
        JSON.stringify(updatedUser)
      );

      setUser(updatedUser);
      setShop(updatedShop);

      window.dispatchEvent(
        new Event("userUpdated")
      );

      alert(
        "Votre boutique a été modifiée avec succès ! ✅"
      );

      navigate("/commercant");
    } catch (error) {
      alert(
        "Impossible de modifier la boutique : " +
          error.message
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (!user || !shop) {
    return (
      <main className="merchant-profile-page">
        <div className="merchant-profile-container">
          <p>Chargement...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="merchant-profile-page">

      <div className="merchant-profile-container">

        {/* =========================
            HEADER
        ========================= */}

        <section className="merchant-profile-header">

          <div>

            <span className="merchant-profile-label">
              ESPACE COMMERÇANT
            </span>

            <h1>
              Modifier ma boutique
            </h1>

            <p>
              Gérez les informations visibles
              par vos clients.
            </p>

          </div>

          <Link
            to="/commercant"
            className="merchant-profile-back"
          >
            ← Retour au dashboard
          </Link>

        </section>


        {/* =========================
            APERÇU
        ========================= */}

        <section className="merchant-profile-preview">

          <div className="merchant-profile-preview-logo">

            {form.logo ? (
              <img
                src={form.logo}
                alt="Logo de la boutique"
              />
            ) : (
              form.name
                ? form.name.charAt(0).toUpperCase()
                : "🏪"
            )}

          </div>

          <div>

            <span>
              APERÇU DE LA BOUTIQUE
            </span>

            <h2>
              {form.name || "Nom de votre boutique"}
            </h2>

            <p>
              📍 {form.city || "Ville"}
              {" • "}
              🏷️ {form.category}
            </p>

          </div>

        </section>


        {/* =========================
            FORMULAIRE
        ========================= */}

        <form
          className="merchant-profile-form"
          onSubmit={handleSubmit}
        >

          <section className="merchant-profile-card">

            <h2>
              Informations de la boutique
            </h2>

            <p className="merchant-profile-description">
              Ces informations seront visibles
              sur votre boutique publique.
            </p>


            {/* NOM */}

            <div className="merchant-profile-group">

              <label htmlFor="name">
                Nom de la boutique *
              </label>

              <input
                id="name"
                name="name"
                type="text"
                value={form.name}
                onChange={handleChange}
                placeholder="Ex : Boutique Ass"
                required
              />

            </div>


            {/* LOGO */}

            <div className="merchant-profile-group">

              <label htmlFor="logoFile">
                Logo de la boutique
              </label>

              <input
                id="logoFile"
                name="logoFile"
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
              />

              {uploadingLogo && (
                <small>Traitement de l'image...</small>
              )}

              <small>
                Choisis une image depuis ton appareil
                pour le logo de ta boutique.
              </small>

            </div>

            {/* COULEUR DU THÈME */}

            <div className="merchant-profile-group">

              <label htmlFor="themeColor">
                Couleur de la boutique
              </label>

              <div className="merchant-profile-theme-picker">

                <input
                  id="themeColor"
                  name="themeColor"
                  type="color"
                  value={form.themeColor}
                  onChange={handleChange}
                />

                <span>{form.themeColor}</span>

              </div>

              <small>
                Cette couleur sera utilisée sur la page
                publique de ta boutique.
              </small>

            </div>


            {/* PAIEMENT MOBILE MONEY */}

            <div className="merchant-profile-group">

              <label htmlFor="orangeMoneyNumber">
                Numéro Orange Money (facultatif)
              </label>

              <input
                id="orangeMoneyNumber"
                name="orangeMoneyNumber"
                type="tel"
                value={form.orangeMoneyNumber}
                onChange={handleChange}
                placeholder="Ex : 77 123 45 67"
              />

            </div>

            <div className="merchant-profile-group">

              <label htmlFor="waveNumber">
                Numéro Wave (facultatif)
              </label>

              <input
                id="waveNumber"
                name="waveNumber"
                type="tel"
                value={form.waveNumber}
                onChange={handleChange}
                placeholder="Ex : 70 123 45 67"
              />

              <small>
                Si tu renseignes ces numéros, tes clients
                pourront te payer directement par Mobile
                Money lors de leur commande.
              </small>

            </div>


            {/* TELEPHONE + VILLE */}

            <div className="merchant-profile-row">

              <div className="merchant-profile-group">

                <label htmlFor="phone">
                  Téléphone *
                </label>

                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="77 000 00 00"
                  required
                />

              </div>


              <div className="merchant-profile-group">

                <label htmlFor="city">
                  Ville *
                </label>

                <input
                  id="city"
                  name="city"
                  type="text"
                  value={form.city}
                  onChange={handleChange}
                  placeholder="Dakar"
                  required
                />

              </div>

            </div>


            {/* CATEGORIE */}

            <div className="merchant-profile-group">

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

            <div className="merchant-profile-group">

              <label htmlFor="description">
                Description
              </label>

              <textarea
                id="description"
                name="description"
                rows="6"
                value={form.description}
                onChange={handleChange}
                placeholder="Présentez votre boutique..."
              />

            </div>

          </section>


          {/* =========================
              ACTIONS
          ========================= */}

          <div className="merchant-profile-actions">

            <Link
              to="/commercant"
              className="merchant-profile-cancel"
            >
              Annuler
            </Link>

            <button
              type="submit"
              className="merchant-profile-save"
              disabled={submitting}
            >
              {submitting
                ? "Enregistrement..."
                : "💾 Enregistrer les modifications"}
            </button>

          </div>

        </form>

      </div>

    </main>
  );
}

export default MerchantProfile;