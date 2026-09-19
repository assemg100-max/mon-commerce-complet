/*
 * =========================================================
 * LECTURE D'UN FICHIER CSV (SANS DÉPENDANCE EXTERNE)
 * =========================================================
 *
 * Format attendu (en-têtes en première ligne) :
 * nom,prix,categorie,description,stock,image,reduction
 *
 * Gère les champs entre guillemets contenant des virgules
 * (ex : "Chaise, bois clair"), ce qu'un simple split(",")
 * ne saurait pas faire correctement.
 */

export function lireCsv(texte) {
  const lignes = texte
    .split(/\r\n|\n/)
    .filter(function (ligne) {
      return ligne.trim().length > 0;
    });

  if (lignes.length < 2) {
    return { entetes: [], donnees: [] };
  }

  function parserLigne(ligne) {
    const valeurs = [];
    let valeurActuelle = "";
    let dansGuillemets = false;

    for (let i = 0; i < ligne.length; i++) {
      const caractere = ligne[i];

      if (caractere === '"') {
        dansGuillemets = !dansGuillemets;
      } else if (caractere === "," && !dansGuillemets) {
        valeurs.push(valeurActuelle.trim());
        valeurActuelle = "";
      } else {
        valeurActuelle += caractere;
      }
    }

    valeurs.push(valeurActuelle.trim());

    return valeurs;
  }

  const entetes = parserLigne(lignes[0]).map(function (
    entete
  ) {
    return entete.toLowerCase().trim();
  });

  const donnees = lignes.slice(1).map(function (ligne) {
    const valeurs = parserLigne(ligne);
    const objet = {};

    entetes.forEach(function (entete, index) {
      objet[entete] = valeurs[index] || "";
    });

    return objet;
  });

  return { entetes, donnees };
}

/*
 * Génère le contenu d'un modèle CSV vide, à télécharger
 * pour que le commerçant sache quel format respecter.
 */
export function genererModeleCsv() {
  const entetes =
    "nom,prix,categorie,description,stock,image,reduction";

  const exemple =
    'Chemise en wax,15000,Mode,"Chemise colorée, coupe moderne",20,,0';

  return entetes + "\n" + exemple + "\n";
}
