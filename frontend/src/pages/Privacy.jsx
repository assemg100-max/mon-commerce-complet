import PageTitle from "../components/PageTitle";

import "./Legal.css";

function Privacy() {
  return (
    <main className="legal-page">
      <PageTitle title="Politique de confidentialité" />

      <div className="legal-container">

        <h1>Politique de confidentialité</h1>

        <p className="legal-updated">
          Dernière mise à jour : septembre 2026
        </p>

        <h2>Quelles données collectons-nous ?</h2>

        <ul>
          <li>Nom, email et téléphone lors de l'inscription.</li>
          <li>
            Informations de livraison (adresse, ville) lors
            d'une commande.
          </li>
          <li>
            Informations de boutique et de produits pour les
            commerçants.
          </li>
        </ul>

        <h2>Pourquoi collectons-nous ces données ?</h2>

        <p>
          Ces informations servent uniquement à faire
          fonctionner le site : créer votre compte, traiter
          vos commandes, permettre aux commerçants de vendre,
          et vous envoyer des emails liés à votre activité
          sur la plateforme (confirmation de commande,
          réinitialisation de mot de passe).
        </p>

        <h2>Partage des données</h2>

        <p>
          Vos informations de livraison sont partagées avec
          le commerçant concerné par votre commande, afin
          qu'il puisse vous livrer. Elles ne sont jamais
          vendues à des tiers.
        </p>

        <h2>Sécurité</h2>

        <p>
          Les mots de passe sont chiffrés et jamais stockés
          en clair. L'accès aux données sensibles est protégé
          par un système d'authentification sécurisé.
        </p>

        <h2>Vos droits</h2>

        <p>
          Vous pouvez à tout moment modifier vos informations
          de profil ou votre mot de passe depuis votre page
          "Mon compte". Pour supprimer définitivement votre
          compte, contactez-nous via notre{" "}
          <a href="/contact">page Contact</a>.
        </p>

      </div>
    </main>
  );
}

export default Privacy;
