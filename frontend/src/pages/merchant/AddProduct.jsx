import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { createProduct, getShopByOwner } from "../../data/api";
import { fileToResizedBase64 } from "../../data/imageUpload";

import "./AddProduct.css";

function AddProduct() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    price: "",
    category: "Téléphones",
    description: "",
    stock: "",
    image: "",
  });

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  function handleImageUpload(event) {
    const file = event.target.files[0];

    if (!file) {
      return;
    }

    setUploadingImage(true);
    setError("");

    fileToResizedBase64(file)
      .then(function (dataUrl) {
        setForm((previousForm) => ({
          ...previousForm,
          image: dataUrl,
        }));
      })
      .catch(function (uploadError) {
        setError(uploadError.message);
      })
      .finally(function () {
        setUploadingImage(false);
      });
  }

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previousForm) => ({
      ...previousForm,
      [name]: value,
    }));
  }

  function getCategoryId(category) {
    const categories = {
      Téléphones: 1,
      Mode: 2,
      Informatique: 3,
      Sport: 4,
      Maison: 5,
      Alimentation: 6,
    };

    return categories[category] || 1;
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");

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
        "Erreur utilisateur :",
        error
      );

      navigate("/connexion");
      return;
    }

    if (currentUser.role !== "merchant") {
      navigate("/");
      return;
    }

    if (!form.name.trim()) {
      setError(
        "Veuillez entrer le nom du produit."
      );
      return;
    }

    if (
      form.price === "" ||
      Number(form.price) <= 0
    ) {
      setError(
        "Veuillez entrer un prix valide."
      );
      return;
    }

    if (
      form.stock === "" ||
      Number(form.stock) < 0
    ) {
      setError(
        "Veuillez entrer un stock valide."
      );
      return;
    }

    if (!form.description.trim()) {
      setError(
        "Veuillez entrer une description."
      );
      return;
    }

    setSubmitting(true);

    try {
      const shop = await getShopByOwner(currentUser);

      if (!shop) {
        setError(
          "Vous devez créer votre boutique avant d'ajouter un produit."
        );
        setSubmitting(false);
        return;
      }

      await createProduct({
        name: form.name.trim(),
        price: Number(form.price),
        shopId: Number(shop.id),
        categoryId: getCategoryId(form.category),
        category: form.category,
        description: form.description.trim(),
        stock: Number(form.stock),
        image: form.image.trim(),
      });

      alert("Produit ajouté avec succès !");

      navigate("/commercant/produits");
    } catch (apiError) {
      setError(apiError.message);
      setSubmitting(false);
    }
  }

  return (
    <main className="add-product-page">

      <div className="add-product-container">

        <div className="add-product-header">

          <div>

            <span className="add-product-label">
              ESPACE COMMERÇANT
            </span>

            <h1>
              Ajouter un produit
            </h1>

            <p>
              Ajoutez un nouveau produit à
              votre boutique.
            </p>

          </div>

          <Link
            to="/commercant/produits"
            className="add-product-back-button"
          >
            ← Mes produits
          </Link>

        </div>

        <form
          className="add-product-form"
          onSubmit={handleSubmit}
        >

          {error && (
            <div className="add-product-error">
              {error}
            </div>
          )}

          <section className="add-product-card">

            <h2>
              Informations du produit
            </h2>

            <div className="form-group">

              <label htmlFor="name">
                Nom du produit *
              </label>

              <input
                id="name"
                name="name"
                type="text"
                value={form.name}
                onChange={handleChange}
                placeholder="Ex : iPhone 15"
                required
              />

            </div>

            <div className="form-row">

              <div className="form-group">

                <label htmlFor="price">
                  Prix (F CFA) *
                </label>

                <input
                  id="price"
                  name="price"
                  type="number"
                  min="1"
                  value={form.price}
                  onChange={handleChange}
                  placeholder="85000"
                  required
                />

              </div>

              <div className="form-group">

                <label htmlFor="stock">
                  Stock *
                </label>

                <input
                  id="stock"
                  name="stock"
                  type="number"
                  min="0"
                  value={form.stock}
                  onChange={handleChange}
                  placeholder="10"
                  required
                />

              </div>

            </div>

            <div className="form-group">

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

            <div className="form-group">

              <label htmlFor="description">
                Description *
              </label>

              <textarea
                id="description"
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="Décrivez votre produit..."
                rows="5"
                required
              />

            </div>

            <div className="form-group">

              <label htmlFor="imageFile">
                Photo du produit
              </label>

              <input
                id="imageFile"
                name="imageFile"
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
              />

              {uploadingImage && (
                <small>Traitement de l'image...</small>
              )}

              {form.image && !uploadingImage && (
                <img
                  src={form.image}
                  alt="Aperçu du produit"
                  className="add-product-image-preview"
                />
              )}

              <small>
                Vous pouvez laisser ce champ vide, une
                image par défaut sera utilisée.
              </small>

            </div>

          </section>

          <div className="add-product-actions">

            <Link
              to="/commercant/produits"
              className="cancel-product-button"
            >
              Annuler
            </Link>

            <button
              type="submit"
              className="save-product-button"
              disabled={submitting}
            >
              {submitting
                ? "Ajout en cours..."
                : "Ajouter le produit →"}
            </button>

          </div>

        </form>

      </div>

    </main>
  );
}

export default AddProduct;

