import { Link } from "react-router-dom";

import PageTitle from "../components/PageTitle";

import "./CategoriesPage.css";

const categories = [
  {
    id: 1,
    icon: "📱",
    name: "Téléphones",
    description: "Smartphones, accessoires et appareils mobiles",
  },
  {
    id: 2,
    icon: "👕",
    name: "Mode",
    description: "Vêtements, chaussures et accessoires",
  },
  {
    id: 3,
    icon: "💻",
    name: "Informatique",
    description: "Ordinateurs, accessoires et matériel informatique",
  },
  {
    id: 4,
    icon: "⚽",
    name: "Sport",
    description: "Équipements et vêtements de sport",
  },
  {
    id: 5,
    icon: "🏠",
    name: "Maison",
    description: "Meubles, décoration et équipements",
  },
  {
    id: 6,
    icon: "🍎",
    name: "Alimentation",
    description: "Produits alimentaires et commerces locaux",
  },
];

function CategoriesPage() {
  return (
    <main className="categories-page">
      <PageTitle title="Catégories" />

      <div className="categories-page-container">

        <div className="categories-page-title">
          <h1>Catégories</h1>

          <p>
            Trouvez facilement les produits qui vous
            intéressent.
          </p>
        </div>

        <div className="categories-page-grid">

          {categories.map((category) => (
            <Link
              to={`/categorie/${category.id}`}
              className="categories-page-card"
              key={category.id}
            >

              <div className="categories-page-icon">
                {category.icon}
              </div>

              <h2>{category.name}</h2>

              <p>{category.description}</p>

              <span className="categories-page-explore">
                Explorer →
              </span>

            </Link>
          ))}

        </div>

      </div>
    </main>
  );
}

export default CategoriesPage;
