import { Link } from "react-router-dom";

import "./Categories.css";

const categories = [
  { id: 1, icon: "📱", name: "Téléphones" },
  { id: 2, icon: "👕", name: "Mode" },
  { id: 3, icon: "💻", name: "Informatique" },
  { id: 4, icon: "⚽", name: "Sport" },
  { id: 5, icon: "🏠", name: "Maison" },
  { id: 6, icon: "🍎", name: "Alimentation" },
];

function Categories() {
  return (
    <section className="categories">
      <div className="categories-container">
        <h2>Explorer par catégorie</h2>

        <p className="categories-description">
          Découvrez les commerces et produits qui vous intéressent.
        </p>

        <div className="categories-grid">
          {categories.map((category) => (
            <Link
              className="category-card"
              key={category.id}
              to={`/categorie/${category.id}`}
            >
              <div className="category-icon">
                {category.icon}
              </div>

              <h3>{category.name}</h3>

              <span className="category-explore">Explorer</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Categories;