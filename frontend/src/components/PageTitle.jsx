import { useEffect } from "react";

/*
 * =========================================================
 * TITRE DE PAGE — BON POUR LE SEO
 * =========================================================
 *
 * Change le titre affiché dans l'onglet du navigateur
 * (et donc dans Google) selon la page visitée, au lieu
 * d'avoir toujours "Mon Commerce Sénégal" partout.
 *
 * Utilisation : <PageTitle title="Boutiques" />
 */
function PageTitle({ title }) {
  useEffect(
    function () {
      const previousTitle = document.title;

      document.title = title
        ? title + " — Mon Commerce Sénégal"
        : "Mon Commerce Sénégal";

      return function () {
        document.title = previousTitle;
      };
    },
    [title]
  );

  return null;
}

export default PageTitle;
