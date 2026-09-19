import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { getVentesFlash } from "../data/api";
import { prixApresPromo } from "../utils/prix";

import "./FlashSales.css";

/*
 * Transforme un nombre de millisecondes restantes en texte
 * lisible du style "2j 04:12:45".
 */
function formaterCompteARebours(msRestantes) {
  if (msRestantes <= 0) {
    return "Terminée";
  }

  const secondesTotales = Math.floor(msRestantes / 1000);
  const jours = Math.floor(secondesTotales / 86400);
  const heures = Math.floor(
    (secondesTotales % 86400) / 3600
  );
  const minutes = Math.floor(
    (secondesTotales % 3600) / 60
  );
  const secondes = secondesTotales % 60;

  function deuxChiffres(nombre) {
    return String(nombre).padStart(2, "0");
  }

  return (
    (jours > 0 ? jours + "j " : "") +
    deuxChiffres(heures) +
    ":" +
    deuxChiffres(minutes) +
    ":" +
    deuxChiffres(secondes)
  );
}

function FlashSales() {
  const [produits, setProduits] = useState([]);
  const [maintenant, setMaintenant] = useState(Date.now());

  useEffect(function () {
    getVentesFlash()
      .then(setProduits)
      .catch(function (error) {
        console.error(
          "Erreur lors du chargement des ventes flash :",
          error
        );
      });
  }, []);

  /*
   * On met à jour l'affichage chaque seconde pour que le
   * compte à rebours bouge réellement.
   */
  useEffect(function () {
    const intervalle = setInterval(function () {
      setMaintenant(Date.now());
    }, 1000);

    return function () {
      clearInterval(intervalle);
    };
  }, []);

  if (produits.length === 0) {
    return null;
  }

  return (
    <section className="flash-sales">
      <div className="flash-sales-container">

        <div className="flash-sales-header">
          <span className="flash-sales-badge">
            ⚡ Ventes flash
          </span>

          <h2>Offres à durée limitée</h2>

          <p>
            Ces prix ne dureront pas — profitez-en avant
            la fin du compte à rebours.
          </p>
        </div>

        <div className="flash-sales-grid">

          {produits.map(function (produit) {
            const msRestantes =
              new Date(produit.discountEndsAt).getTime() -
              maintenant;

            return (
              <article
                className="flash-sale-card"
                key={produit.id}
              >

                <div className="flash-sale-image">
                  <img
                    src={produit.image}
                    alt={produit.name}
                  />
                  <span className="flash-sale-percent">
                    -{produit.discountPercent}%
                  </span>
                </div>

                <div className="flash-sale-content">

                  <h3>{produit.name}</h3>

                  <div className="flash-sale-prices">
                    <span className="flash-sale-price-old">
                      {Number(
                        produit.price
                      ).toLocaleString("fr-FR")}{" "}
                      F CFA
                    </span>
                    <strong className="flash-sale-price-new">
                      {prixApresPromo(
                        produit
                      ).toLocaleString("fr-FR")}{" "}
                      F CFA
                    </strong>
                  </div>

                  <div className="flash-sale-countdown">
                    ⏱️{" "}
                    {formaterCompteARebours(msRestantes)}
                  </div>

                  <Link
                    to={"/produit/" + produit.id}
                    className="flash-sale-button"
                  >
                    Voir l'offre →
                  </Link>

                </div>

              </article>
            );
          })}

        </div>

      </div>
    </section>
  );
}

export default FlashSales;
