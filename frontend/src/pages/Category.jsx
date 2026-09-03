import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { searchProducts } from "../data/api";

import "./Category.css";

const categories = {
  1: { name: "Téléphones", icon: "📱" },
  2: { name: "Mode", icon: "👕" },
  3: { name: "Informatique", icon: "💻" },
  4: { name: "Sport", icon: "⚽" },
  5: { name: "Maison", icon: "🏠" },
  6: { name: "Alimentation", icon: "🍎" },
};

function Category() {
  const { id } = useParams();

  const category = categories[id];

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({
    minPrice: "",
    maxPrice: "",
    minRating: "",
  });

  useEffect(
    function () {
      if (!category) {
        return;
      }

      loadProducts();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [id]
  );

  function loadProducts() {
    setLoading(true);

    searchProducts({
      category: category.name,
      minPrice: filters.minPrice,
      maxPrice: filters.maxPrice,
      minRating: filters.minRating,
    })
      .then(setProducts)
      .catch(function (error) {
        console.error(
          "Erreur lors du chargement des produits :",
          error
        );
      })
      .finally(function () {
        setLoading(false);
      });
  }

  function handleFilterChange(event) {
    const { name, value } = event.target;

    setFilters(function (previousFilters) {
      return { ...previousFilters, [name]: value };
    });
  }

  function handleFilterSubmit(event) {
    event.preventDefault();
    loadProducts();
  }

  function resetFilters() {
    setFilters({ minPrice: "", maxPrice: "", minRating: "" });

    searchProducts({ category: category.name })
      .then(setProducts)
      .catch(function () {});
  }

  if (!category) {
    return (
      <main className="category-page">
        <div className="category-container">
          <h1>Catégorie introuvable ❌</h1>

          <Link to="/categories">
            ← Retour aux catégories
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="category-page">
      <div className="category-container">

        <div className="category-title">
          <h1>
            {category.icon} {category.name}
          </h1>

          <p>
            Découvrez les produits disponibles dans
            cette catégorie.
          </p>
        </div>

        <form
          className="category-filters"
          onSubmit={handleFilterSubmit}
        >

          <div className="category-filter-group">
            <label htmlFor="minPrice">Prix min.</label>
            <input
              id="minPrice"
              name="minPrice"
              type="number"
              min="0"
              placeholder="0"
              value={filters.minPrice}
              onChange={handleFilterChange}
            />
          </div>

          <div className="category-filter-group">
            <label htmlFor="maxPrice">Prix max.</label>
            <input
              id="maxPrice"
              name="maxPrice"
              type="number"
              min="0"
              placeholder="Sans limite"
              value={filters.maxPrice}
              onChange={handleFilterChange}
            />
          </div>

          <div className="category-filter-group">
            <label htmlFor="minRating">Note minimum</label>
            <select
              id="minRating"
              name="minRating"
              value={filters.minRating}
              onChange={handleFilterChange}
            >
              <option value="">Toutes les notes</option>
              <option value="4">4 étoiles et plus</option>
              <option value="3">3 étoiles et plus</option>
              <option value="2">2 étoiles et plus</option>
            </select>
          </div>

          <button type="submit">Filtrer</button>

          <button
            type="button"
            className="category-filter-reset"
            onClick={resetFilters}
          >
            Réinitialiser
          </button>

        </form>

        {loading ? (

          <p className="category-empty">
            Chargement des produits...
          </p>

        ) : products.length === 0 ? (

          <p className="category-empty">
            Aucun produit ne correspond à ces critères
            pour l'instant.
          </p>

        ) : (

          <div className="category-products-grid">

            {products.map(function (product) {
              const price = Number(product.price) || 0;

              return (
                <Link
                  to={"/produit/" + product.id}
                  className="category-product-card"
                  key={product.id}
                >

                  <img
                    src={product.image}
                    alt={product.name}
                  />

                  <div className="category-product-info">

                    <h3>{product.name}</h3>

                    {product.reviewCount > 0 && (
                      <span className="category-product-rating">
                        ★ {product.averageRating} (
                        {product.reviewCount})
                      </span>
                    )}

                    <strong>
                      {price.toLocaleString("fr-FR")}{" "}
                      F CFA
                    </strong>

                  </div>

                </Link>
              );
            })}

          </div>

        )}

      </div>
    </main>
  );
}

export default Category;
