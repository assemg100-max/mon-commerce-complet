import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

/*
 * =========================================================
 * BASE DE DONNÉES "MON COMMERCE SÉNÉGAL"
 * =========================================================
 *
 * Pour rester simple et accessible à un débutant, on stocke
 * toutes les données dans un seul fichier JSON
 * (data/db.json) sur le serveur.
 *
 * C'est une vraie base de données partagée par TOUS les
 * visiteurs du site (contrairement au localStorage du
 * navigateur, qui est propre à chaque personne).
 *
 * Pour un site avec beaucoup de trafic, on utiliserait
 * plutôt une vraie base de données comme MongoDB ou
 * PostgreSQL — mais le principe (lire/écrire des données
 * partagées) reste le même.
 */

const __dirname = path.dirname(
  fileURLToPath(import.meta.url)
);

const DB_PATH = path.join(
  __dirname,
  "data",
  "db.json"
);

const initialData = {
  users: [],

  settings: {
    commissionRate: 0.1,
    orangeMoneyNumber: "",
    waveNumber: "",
  },

  shops: [
    {
      id: 1,
      name: "Dakar Tech",
      city: "Dakar",
      category: "Informatique",
      description:
        "Boutique spécialisée dans l'informatique, les accessoires et les équipements numériques.",
      ownerId: null,
      logo: null,
      themeColor: "#e8890c",
    },
    {
      id: 2,
      name: "Sunu Fashion",
      city: "Thiès",
      category: "Mode",
      description:
        "Découvrez des vêtements, chaussures et accessoires pour tous les styles.",
      ownerId: null,
      logo: null,
      themeColor: "#0e7c74",
    },
    {
      id: 3,
      name: "Teranga Mobile",
      city: "Dakar",
      category: "Téléphones",
      description:
        "Téléphones, accessoires et équipements mobiles au meilleur prix.",
      ownerId: null,
      logo: null,
      themeColor: "#c24914",
    },
  ],

  products: [
    {
      id: 1,
      name: "Smartphone Android",
      price: 85000,
      shopId: 3,
      categoryId: 1,
      category: "Téléphones",
      description:
        "Smartphone Android avec écran haute définition et bonne autonomie.",
      stock: 12,
      image:
        "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=800&q=80",
    },
    {
      id: 2,
      name: "Écouteurs Bluetooth",
      price: 15000,
      shopId: 3,
      categoryId: 1,
      category: "Téléphones",
      description:
        "Écouteurs sans fil avec connexion Bluetooth et boîtier de recharge.",
      stock: 25,
      image:
        "https://images.unsplash.com/photo-1606220945770-b5b6c2c55bf1?auto=format&fit=crop&w=800&q=80",
    },
    {
      id: 3,
      name: "Ordinateur portable",
      price: 350000,
      shopId: 1,
      categoryId: 3,
      category: "Informatique",
      description:
        "Ordinateur portable adapté au travail, aux études et à la navigation.",
      stock: 7,
      image:
        "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=800&q=80",
    },
    {
      id: 4,
      name: "T-shirt",
      price: 10000,
      shopId: 2,
      categoryId: 2,
      category: "Mode",
      description:
        "T-shirt confortable disponible en plusieurs tailles.",
      stock: 30,
      image:
        "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=800&q=80",
    },
  ],

  orders: [],

  reviews: [],

  favorites: [],
};

/*
 * Crée le fichier db.json au premier démarrage
 * s'il n'existe pas encore.
 */
function ensureDbFile() {
  const dataDir = path.join(__dirname, "data");

  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(
      DB_PATH,
      JSON.stringify(initialData, null, 2),
      "utf-8"
    );
  }
}

export function readDB() {
  ensureDbFile();

  const raw = fs.readFileSync(DB_PATH, "utf-8");

  let db;

  try {
    db = JSON.parse(raw);
  } catch (error) {
    console.error(
      "Erreur de lecture de la base de données, réinitialisation :",
      error
    );

    fs.writeFileSync(
      DB_PATH,
      JSON.stringify(initialData, null, 2),
      "utf-8"
    );

    return JSON.parse(
      JSON.stringify(initialData)
    );
  }

  /*
   * Migration douce : si la base de données existait déjà
   * avant l'ajout des avis / favoris / réglages, on complète
   * simplement les champs manquants sans rien effacer.
   */

  let needsSave = false;

  if (!Array.isArray(db.reviews)) {
    db.reviews = [];
    needsSave = true;
  }

  if (!Array.isArray(db.favorites)) {
    db.favorites = [];
    needsSave = true;
  }

  if (!db.settings || typeof db.settings !== "object") {
    db.settings = {
      commissionRate: 0.1,
      orangeMoneyNumber: "",
      waveNumber: "",
    };
    needsSave = true;
  } else {
    if (db.settings.orangeMoneyNumber === undefined) {
      db.settings.orangeMoneyNumber = "";
      needsSave = true;
    }

    if (db.settings.waveNumber === undefined) {
      db.settings.waveNumber = "";
      needsSave = true;
    }
  }

  if (needsSave) {
    writeDB(db);
  }

  return db;
}

export function writeDB(db) {
  fs.writeFileSync(
    DB_PATH,
    JSON.stringify(db, null, 2),
    "utf-8"
  );
}

/*
 * Génère le prochain ID disponible pour
 * une collection donnée (users, shops, products...).
 */
export function getNextId(collection) {
  if (collection.length === 0) {
    return 1;
  }

  const ids = collection
    .map(function (item) {
      return Number(item.id);
    })
    .filter(function (id) {
      return !Number.isNaN(id);
    });

  if (ids.length === 0) {
    return 1;
  }

  return Math.max(...ids) + 1;
}
