import PageTitle from "../components/PageTitle";

import "./Legal.css";

function Terms() {
  return (
    <main className="legal-page">
      <PageTitle title="Conditions d'utilisation" />

      <div className="legal-container">

        <h1>Conditions d'utilisation</h1>

        <p className="legal-updated">
          Dernière mise à jour : septembre 2026
        </p>

        <h2>1. Objet</h2>

        <p>
          Ces conditions régissent l'utilisation de Mon
          Commerce Sénégal, une plateforme mettant en
          relation des commerçants et des clients au
          Sénégal.
        </p>

        <h2>2. Comptes utilisateurs</h2>

        <p>
          Chaque utilisateur est responsable de la
          confidentialité de son mot de passe et de
          l'exactitude des informations fournies lors de
          l'inscription.
        </p>

        <h2>3. Responsabilité des commerçants</h2>

        <p>
          Les commerçants sont seuls responsables de
          l'exactitude des descriptions, prix et
          disponibilité de leurs produits, ainsi que de la
          bonne livraison des commandes.
        </p>

        <h2>4. Paiement</h2>

        <p>
          Le paiement à la livraison et le paiement par
          Mobile Money (Orange Money, Wave) sont proposés à
          titre indicatif. La plateforme ne garantit pas la
          transaction financière entre l'acheteur et le
          vendeur pour les paiements Mobile Money, qui
          restent vérifiés manuellement par le commerçant.
        </p>

        <h2>5. Commission de la plateforme</h2>

        <p>
          Une commission peut être prélevée par la
          plateforme sur chaque vente réalisée par un
          commerçant, dont le taux est indiqué dans son
          espace commerçant.
        </p>

        <h2>6. Modification des conditions</h2>

        <p>
          Ces conditions peuvent être modifiées à tout
          moment. La poursuite de l'utilisation de la
          plateforme après modification vaut acceptation
          des nouvelles conditions.
        </p>

        <h2>7. Contact</h2>

        <p>
          Pour toute question, consultez notre{" "}
          <a href="/contact">page Contact</a>.
        </p>

      </div>
    </main>
  );
}

export default Terms;
