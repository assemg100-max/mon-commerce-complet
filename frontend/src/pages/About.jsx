import PageTitle from "../components/PageTitle";

import "./Legal.css";

function About() {
  return (
    <main className="legal-page">
      <PageTitle title="À propos" />

      <div className="legal-container">

        <h1>À propos de Mon Commerce Sénégal</h1>

        <p>
          Mon Commerce Sénégal est une plateforme qui permet
          à n'importe quel commerçant sénégalais de créer sa
          boutique en ligne gratuitement, et à n'importe quel
          client de découvrir et acheter des produits locaux,
          où qu'il se trouve dans le pays.
        </p>

        <h2>Notre mission</h2>

        <p>
          Faciliter le commerce entre Sénégalais : donner aux
          petits commerçants, artisans et entrepreneurs les
          outils numériques pour vendre en ligne, sans
          connaissances techniques ni frais de départ.
        </p>

        <h2>Comment ça marche</h2>

        <ul>
          <li>
            Un commerçant crée un compte et sa boutique en
            quelques minutes.
          </li>
          <li>
            Il ajoute ses produits avec photos, prix et
            description.
          </li>
          <li>
            Les clients parcourent les boutiques, ajoutent
            des produits au panier et passent commande.
          </li>
          <li>
            Le commerçant reçoit la commande et livre le
            client, avec paiement à la livraison ou par
            Mobile Money.
          </li>
        </ul>

        <h2>Une plateforme en développement</h2>

        <p>
          Mon Commerce Sénégal est un projet en constante
          évolution. Nous ajoutons régulièrement de nouvelles
          fonctionnalités pour améliorer l'expérience des
          commerçants et des clients.
        </p>

      </div>
    </main>
  );
}

export default About;
