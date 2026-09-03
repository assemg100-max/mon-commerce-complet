import { Link } from "react-router-dom";

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
    <div>
      <h1>Catégories 🛍️</h1>

      <p>
        Trouvez facilement les produits qui vous intéressent.
      </p>

      <div>
        {categories.map((category) => (
          <div key={category.id}>
            <div>{category.icon}</div>

            <h2>{category.name}</h2>

            <p>{category.description}</p>

            <Link to={`/categorie/${category.id}`}>
              Explorer
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}

export default CategoriesPage;