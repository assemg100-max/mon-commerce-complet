/*
 * =========================================================
 * UTILITAIRE : CONVERTIR UNE IMAGE UPLOADÉE EN BASE64
 * =========================================================
 *
 * Comme notre backend est une simple base de données JSON
 * (pas de vrai service de stockage de fichiers), on convertit
 * l'image choisie par l'utilisateur en texte (base64) et on
 * la stocke directement avec le produit ou la boutique.
 *
 * On redimensionne l'image avant conversion pour éviter
 * de créer des fichiers énormes.
 */

const MAX_WIDTH = 900;
const MAX_HEIGHT = 900;
const JPEG_QUALITY = 0.8;

export function fileToResizedBase64(file) {
  return new Promise(function (resolve, reject) {
    if (!file) {
      reject(new Error("Aucun fichier fourni."));
      return;
    }

    if (!file.type.startsWith("image/")) {
      reject(
        new Error("Le fichier doit être une image.")
      );
      return;
    }

    const reader = new FileReader();

    reader.onerror = function () {
      reject(
        new Error("Impossible de lire ce fichier.")
      );
    };

    reader.onload = function () {
      const image = new Image();

      image.onerror = function () {
        reject(
          new Error("Impossible de lire cette image.")
        );
      };

      image.onload = function () {
        let width = image.width;
        let height = image.height;

        if (width > MAX_WIDTH) {
          height = Math.round(
            (height * MAX_WIDTH) / width
          );
          width = MAX_WIDTH;
        }

        if (height > MAX_HEIGHT) {
          width = Math.round(
            (width * MAX_HEIGHT) / height
          );
          height = MAX_HEIGHT;
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const context = canvas.getContext("2d");
        context.drawImage(image, 0, 0, width, height);

        const dataUrl = canvas.toDataURL(
          "image/jpeg",
          JPEG_QUALITY
        );

        resolve(dataUrl);
      };

      image.src = reader.result;
    };

    reader.readAsDataURL(file);
  });
}
