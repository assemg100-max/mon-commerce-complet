import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import {
  getShopById,
  updateShop,
  deleteShop,
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
    waveLink: "",
  });

  /*
   * =========================================================
   * LIVRAISON DE CETTE BOUTIQUE (façon Jumia)
   * =========================================================
   *
   * Chaque boutique fixe ses propres frais de livraison par
   * ville, indépendamment des autres boutiques. Cette section
   * s'enregistre immédiatement (comme sur l'espace admin),
   * sans passer par le bouton "Enregistrer" du formulaire
   * principal.
   */
  const [villes, setVilles] = useState([]);
  const [nouvelleVille, setNouvelleVille] = useState({
    ville: "",
    frais: "",
    delai: "",
  });
  const [parDefaut, setParDefaut] = useState({
    frais: "",
    delai: "",
  });
  const [savingLivraison, setSavingLivraison] =
    useState(false);

  const [deletingShop, setDeletingShop] = useState(false);

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
          waveLink: currentShop.waveLink || "",
        });

        setVilles(currentShop.livraison || []);
        setParDefaut({
          frais: String(
            (currentShop.livraisonParDefaut &&
              currentShop.livraisonParDefaut.frais) ||
              ""
          ),
          delai:
            (currentShop.livraisonParDefaut &&
              currentShop.livraisonParDefaut.delai) ||
            "",
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

  function handleAjouterVille(event) {
    event.preventDefault();

    if (
      !nouvelleVille.ville.trim() ||
      !nouvelleVille.frais ||
      !nouvelleVille.delai.trim()
    ) {
      alert("Renseigne la ville, les frais et le délai.");
      return;
    }

    const nouvellesVilles = [
      ...villes,
      {
        ville: nouvelleVille.ville.trim(),
        frais: Number(nouvelleVille.frais),
        delai: nouvelleVille.delai.trim(),
      },
    ];

    setVilles(nouvellesVilles);
    setNouvelleVille({ ville: "", frais: "", delai: "" });

    enregistrerLivraison(nouvellesVilles);
  }

  function handleSupprimerVille(index) {
    const nouvellesVilles = villes.filter(function (
      item,
      i
    ) {
      return i !== index;
    });

    setVilles(nouvellesVilles);
    enregistrerLivraison(nouvellesVilles);
  }

  function enregistrerLivraison(nouvellesVilles) {
    if (!shop) {
      return;
    }

    setSavingLivraison(true);

    updateShop(shop.id, { livraison: nouvellesVilles })
      .catch(function (error) {
        alert(error.message);
      })
      .finally(function () {
        setSavingLivraison(false);
      });
  }

  function handleSaveParDefaut(event) {
    event.preventDefault();

    if (!shop) {
      return;
    }

    setSavingLivraison(true);

    updateShop(shop.id, {
      livraisonParDefaut: {
        frais: Number(parDefaut.frais) || 0,
        delai: parDefaut.delai.trim(),
      },
    })
      .catch(function (error) {
        alert(error.message);
      })
      .finally(function () {
        setSavingLivraison(false);
      });
  }

  function handleDeleteShop() {
    if (!shop) {
      return;
    }

    const premiereConfirmation = window.confirm(
      "Es-tu sûr de vouloir supprimer définitivement ta boutique « " +
        shop.name +
        " » ? Tous ses produits seront aussi supprimés."
    );

    if (!premiereConfirmation) {
      return;
    }

    const texteAttendu = shop.name.trim().toUpperCase();

    const saisie = window.prompt(
      'Pour confirmer, tape exactement le nom de ta boutique : "' +
        shop.name +
        '"'
    );

    if (
      !saisie ||
      saisie.trim().toUpperCase() !== texteAttendu
    ) {
      alert(
        "Le nom saisi ne correspond pas — suppression annulée."
      );
      return;
    }

    setDeletingShop(true);

    deleteShop(shop.id)
      .then(function () {
        /*
         * On met à jour le compte en mémoire pour que le
         * reste du site (menu, tableau de bord) sache
         * immédiatement que la boutique n'existe plus.
         */
        const savedUser = localStorage.getItem(
          "mon-commerce-current-user"
        );

        if (savedUser) {
          try {
            const parsedUser = JSON.parse(savedUser);
            parsedUser.shopId = null;

            localStorage.setItem(
              "mon-commerce-current-user",
              JSON.stringify(parsedUser)
            );

            window.dispatchEvent(new Event("userUpdated"));
          } catch (error) {
            console.error(
              "Erreur mise à jour utilisateur :",
              error
            );
          }
        }

        alert("Ta boutique a bien été supprimée.");
        navigate("/");
      })
      .catch(function (error) {
        alert(error.message);
        setDeletingShop(false);
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
      waveLink: form.waveLink.trim(),

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

              <label>
                Logo de la boutique
              </label>

              <div className="image-upload-buttons">

                <label
                  htmlFor="logoFileCamera"
                  className="image-upload-button"
                >
                  📷 Prendre une photo
                </label>
                <input
                  id="logoFileCamera"
                  name="logoFileCamera"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleLogoUpload}
                  style={{ display: "none" }}
                />

                <label
                  htmlFor="logoFileGalerie"
                  className="image-upload-button"
                >
                  🖼️ Choisir depuis la galerie
                </label>
                <input
                  id="logoFileGalerie"
                  name="logoFileGalerie"
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  style={{ display: "none" }}
                />

              </div>

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

            <div className="merchant-profile-group">

              <label htmlFor="waveLink">
                Lien de paiement Wave (facultatif, avancé)
              </label>

              <input
                id="waveLink"
                name="waveLink"
                type="text"
                value={form.waveLink}
                onChange={handleChange}
                placeholder="Ex : https://pay.wave.com/m/M_sn_XXXXXXXX/c/sn/"
              />

              <small>
                Si tu as créé un lien de paiement "montant
                libre" dans l'app Wave, colle-le ici : tes
                clients seront redirigés directement vers
                Wave avec le montant déjà rempli, au lieu
                de devoir taper ton numéro à la main.
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

        {/* =========================
            LIVRAISON DE LA BOUTIQUE
        ========================= */}

        <section className="merchant-profile-section">

          <h2>
            Livraison : mes frais par ville
          </h2>

          <p>
            Comme chez Jumia, chaque boutique fixe ses
            propres frais de livraison. Si un client
            commande chez plusieurs boutiques en même
            temps, chacune facture son propre frais de
            livraison.
          </p>

          <div className="merchant-livraison-list">

            {villes.length === 0 && (
              <p className="merchant-livraison-empty">
                Aucune ville configurée pour l'instant —
                le tarif par défaut ci-dessous s'applique
                à toutes vos livraisons.
              </p>
            )}

            {villes.map(function (item, index) {
              return (
                <div
                  className="merchant-livraison-row"
                  key={index}
                >
                  <span>{item.ville}</span>
                  <span>
                    {Number(item.frais).toLocaleString(
                      "fr-FR"
                    )}{" "}
                    F CFA
                  </span>
                  <span>{item.delai}</span>
                  <button
                    type="button"
                    onClick={function () {
                      handleSupprimerVille(index);
                    }}
                  >
                    Supprimer
                  </button>
                </div>
              );
            })}

          </div>

          <form
            className="merchant-livraison-form"
            onSubmit={handleAjouterVille}
          >

            <input
              type="text"
              placeholder="Ville (ex : Mbour)"
              value={nouvelleVille.ville}
              onChange={function (event) {
                setNouvelleVille(function (previous) {
                  return {
                    ...previous,
                    ville: event.target.value,
                  };
                });
              }}
            />

            <input
              type="number"
              min="0"
              placeholder="Frais (F CFA)"
              value={nouvelleVille.frais}
              onChange={function (event) {
                setNouvelleVille(function (previous) {
                  return {
                    ...previous,
                    frais: event.target.value,
                  };
                });
              }}
            />

            <input
              type="text"
              placeholder="Délai (ex : 1-2 jours)"
              value={nouvelleVille.delai}
              onChange={function (event) {
                setNouvelleVille(function (previous) {
                  return {
                    ...previous,
                    delai: event.target.value,
                  };
                });
              }}
            />

            <button type="submit" disabled={savingLivraison}>
              Ajouter
            </button>

          </form>

          <h3>Tarif par défaut (autres villes)</h3>

          <form
            className="merchant-livraison-form"
            onSubmit={handleSaveParDefaut}
          >

            <input
              type="number"
              min="0"
              placeholder="Frais (F CFA)"
              value={parDefaut.frais}
              onChange={function (event) {
                setParDefaut(function (previous) {
                  return {
                    ...previous,
                    frais: event.target.value,
                  };
                });
              }}
            />

            <input
              type="text"
              placeholder="Délai (ex : 3-5 jours)"
              value={parDefaut.delai}
              onChange={function (event) {
                setParDefaut(function (previous) {
                  return {
                    ...previous,
                    delai: event.target.value,
                  };
                });
              }}
            />

            <button type="submit" disabled={savingLivraison}>
              Enregistrer
            </button>

          </form>

        </section>

        <section className="merchant-profile-section merchant-danger-zone">

          <h2>⚠️ Zone dangereuse</h2>

          <p>
            Supprimer ta boutique effacera aussi tous ses
            produits. Tes commandes passées resteront dans
            l'historique, mais ta boutique ne sera plus
            visible sur le site. Cette action est
            définitive.
          </p>

          <button
            type="button"
            className="merchant-delete-shop-button"
            disabled={deletingShop}
            onClick={handleDeleteShop}
          >
            {deletingShop
              ? "Suppression en cours..."
              : "Supprimer définitivement ma boutique"}
          </button>

        </section>

      </div>

    </main>
  );
}

export default MerchantProfile;