import { useState } from "react";
import { useNavigate } from "react-router-dom";

import "./Hero.css";

function Hero() {
  const navigate = useNavigate();

  const [search, setSearch] = useState("");

  function handleSearch(event) {
    event.preventDefault();

    const query = search.trim();

    navigate(
      query
        ? `/boutiques?q=${encodeURIComponent(query)}`
        : "/boutiques"
    );
  }

  return (
    <section className="hero">
      <div className="hero-pattern" aria-hidden="true" />

      <div className="hero-content">
        <h1>
          Le marché sénégalais,
          <br />
          <span>à portée de main.</span>
        </h1>

        <p className="hero-text">
          Des commerçants de Dakar à Thiès en passant par
          Saint-Louis vendent déjà leurs produits ici.
          Trouvez ce qu'il vous faut, ou ouvrez votre
          propre boutique en quelques minutes.
        </p>

        <form className="search-box" onSubmit={handleSearch}>
          <input
            type="text"
            placeholder="Un téléphone, une robe, une boutique..."
            value={search}
            onChange={function (event) {
              setSearch(event.target.value);
            }}
          />
          <button type="submit">Rechercher</button>
        </form>

        <div className="hero-buttons">
          <button
            type="button"
            className="primary-button"
            onClick={function () {
              navigate("/creer-boutique");
            }}
          >
            Ouvrir ma boutique
          </button>

          <button
            type="button"
            className="secondary-button"
            onClick={function () {
              navigate("/boutiques");
            }}
          >
            Parcourir les boutiques
          </button>
        </div>
      </div>
    </section>
  );
}

export default Hero;