import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import {
  getProductById,
  updateProduct,
  getShopByOwner,
} from "../../data/api";
import { fileToResizedBase64 } from "../../data/imageUpload";

import "./EditProduct.css";

function EditProduct() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    price: "",
    category: "Téléphones",
    description: "",
    stock: "",
    image: "",
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
        "Erreur chargement produit :",
        error
      );

      navigate("/connexion");
      return;
    }

    if (currentUser.role !== "merchant") {
      navigate("/");
      return;
    }

    setUser(currentUser);

    Promise.all([
      getProductById(id),
      getShopByOwner(currentUser),
    ])
      .then(function ([product, shop]) {
        if (!product) {
          alert("Produit introuvable.");
          navigate("/commercant/produits");
          return;
        }

        if (!shop) {
          alert(
            "Vous devez créer votre boutique avant de modifier un produit."
          );
          navigate("/commercant");
          return;
        }

        const userShopId = Number(shop.id);
        const productShopId = Number(product.shopId);

        if (productShopId !== userShopId) {
          alert(
            "Vous ne pouvez pas modifier ce produit."
          );

          navigate("/commercant/produits");
          return;
        }

        setForm({
          name: product.name || "",
          price: product.price ?? "",
          category:
            product.category || "Téléphones",
          description:
            product.description || "",
          stock: product.stock ?? "",
          image: product.image || "",
        });
      })
      .catch(function (error) {
        console.error(
          "Erreur chargement produit :",
          error
        );

        alert("Impossible de charger ce produit.");
        navigate("/commercant/produits");
      });
  }, [id, navigate]);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previousForm) => ({
      ...previousForm,
      [name]: value,
    }));
  }

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

  function handleSubmit(event) {
    event.preventDefault();

    setError("");

    if (!form.name.trim()) {
      alert(
        "Veuillez entrer le nom du produit."
      );
      return;
    }

    if (
      form.price === "" ||
      Number(form.price) <= 0
    ) {
      alert(
        "Veuillez entrer un prix valide."
      );
      return;
    }

    if (
      form.stock === "" ||
      Number(form.stock) < 0
    ) {
      alert(
        "Veuillez entrer un stock valide."
      );
      return;
    }

    const updatedProduct = {
      name: form.name.trim(),

      price: Number(form.price),

      category: form.category,

      categoryId: getCategoryId(
        form.category
      ),

      description:
        form.description.trim() ||
        "Produit disponible dans notre boutique.",

      stock: Number(form.stock),

      image: form.image.trim(),
    };

    setSubmitting(true);

    updateProduct(id, updatedProduct)
      .then(function () {
        alert(
          "Produit modifié avec succès !"
        );

        navigate("/commercant/produits");
      })
      .catch(function (apiError) {
        setError(apiError.message);
      })
      .finally(function () {
        setSubmitting(false);
      });
  }

  if (!user) {
    return (
      <main className="edit-product-page">
        <div className="edit-product-container">
          <p>Chargement...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="edit-product-page">

      <div className="edit-product-container">

        <div className="edit-product-header">

          <div>
            <span className="edit-product-label">
              ESPACE COMMERÇANT
            </span>

            <h1>
              Modifier le produit
            </h1>

            <p>
              Modifiez les informations de
              votre produit.
            </p>
          </div>

          <Link
            to="/commercant/produits"
            className="edit-product-back-button"
          >
            ← Retour aux produits
          </Link>

        </div>

        <form
          className="edit-product-form"
          onSubmit={handleSubmit}
        >

          <div className="edit-product-card">

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
                placeholder="Nom du produit"
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
                Description
              </label>

              <textarea
                id="description"
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="Décrivez votre produit..."
                rows="5"
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
                  className="edit-product-image-preview"
                />
              )}

              <small>
                Laisse vide si tu ne veux pas changer
                la photo actuelle.
              </small>

            </div>

          </div>

          {error && (
            <div className="edit-product-error">
              ⚠️ {error}
            </div>
          )}

          <div className="edit-product-actions">

            <Link
              to="/commercant/produits"
              className="cancel-edit-button"
            >
              Annuler
            </Link>

            <button
              type="submit"
              className="save-edit-button"
              disabled={submitting}
            >
              {submitting
                ? "Enregistrement..."
                : "Enregistrer les modifications →"}
            </button>

          </div>

        </form>

      </div>

    </main>
  );
}

export default EditProduct;

