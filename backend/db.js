import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { MongoClient } from "mongodb";

/*
 * =========================================================
 * BASE DE DONNÉES "MON COMMERCE SÉNÉGAL"
 * =========================================================
 *
 * Deux modes possibles :
 *
 * 1) MONGODB_URI est définie (cas du site en ligne, sur
 *    Render) -> on utilise une vraie base de données
 *    MongoDB Atlas, qui garde les données en permanence,
 *    même si le serveur redémarre.
 *
 * 2) MONGODB_URI n'est pas définie (cas du développement
 *    en local, sur ton PC) -> on utilise un simple fichier
 *    JSON (data/db.json), plus simple à utiliser sans
 *    créer de compte MongoDB juste pour tester en local.
 *
 * Dans les deux cas, le reste du code (server.js) utilise
 * exactement les mêmes fonctions readDB() / writeDB(),
 * sans se soucier de savoir laquelle des deux est utilisée.
 */

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB_NAME = "mon_commerce_senegal";
const MONGODB_COLLECTION = "app_data";
const MONGODB_DOC_ID = "singleton";

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


/* =========================================================
   MODE MONGODB (site en ligne, sur Render)
   ========================================================= */

let mongoClientPromise = null;

function getMongoCollection() {
  if (!mongoClientPromise) {
    const client = new MongoClient(MONGODB_URI);
    mongoClientPromise = client
      .connect()
      .then(function () {
        console.log(
          "✅ Connecté à MongoDB Atlas (données permanentes)"
        );
        return client;
      });
  }

  return mongoClientPromise.then(function (client) {
    return client
      .db(MONGODB_DB_NAME)
      .collection(MONGODB_COLLECTION);
  });
}

function applyMigrations(data) {
  let changed = false;

  if (!Array.isArray(data.reviews)) {
    data.reviews = [];
    changed = true;
  }

  if (!Array.isArray(data.favorites)) {
    data.favorites = [];
    changed = true;
  }

  if (!data.settings || typeof data.settings !== "object") {
    data.settings = {
      commissionRate: 0.1,
      orangeMoneyNumber: "",
      waveNumber: "",
    };
    changed = true;
  } else {
    if (data.settings.orangeMoneyNumber === undefined) {
      data.settings.orangeMoneyNumber = "";
      changed = true;
    }

    if (data.settings.waveNumber === undefined) {
      data.settings.waveNumber = "";
      changed = true;
    }
  }

  return changed;
}

async function readDBFromMongo() {
  const collection = await getMongoCollection();

  let doc = await collection.findOne({
    _id: MONGODB_DOC_ID,
  });

  if (!doc) {
    doc = {
      _id: MONGODB_DOC_ID,
      ...JSON.parse(JSON.stringify(initialData)),
    };

    await collection.insertOne(doc);
  }

  const changed = applyMigrations(doc);

  if (changed) {
    await collection.replaceOne(
      { _id: MONGODB_DOC_ID },
      doc
    );
  }

  const { _id, ...data } = doc;

  return data;
}

async function writeDBToMongo(db) {
  const collection = await getMongoCollection();

  await collection.replaceOne(
    { _id: MONGODB_DOC_ID },
    { _id: MONGODB_DOC_ID, ...db },
    { upsert: true }
  );
}


/* =========================================================
   MODE FICHIER LOCAL (développement sur ton PC)
   ========================================================= */

function ensureLocalDbFile() {
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

function readDBFromFile() {
  ensureLocalDbFile();

  const raw = fs.readFileSync(DB_PATH, "utf-8");

  let data;

  try {
    data = JSON.parse(raw);
  } catch (error) {
    console.error(
      "Erreur de lecture de la base de données, réinitialisation :",
      error
    );

    data = JSON.parse(JSON.stringify(initialData));
  }

  const changed = applyMigrations(data);

  if (changed) {
    fs.writeFileSync(
      DB_PATH,
      JSON.stringify(data, null, 2),
      "utf-8"
    );
  }

  return data;
}

function writeDBToFile(db) {
  fs.writeFileSync(
    DB_PATH,
    JSON.stringify(db, null, 2),
    "utf-8"
  );
}


/* =========================================================
   FONCTIONS UTILISÉES PAR LE RESTE DU SERVEUR
   ========================================================= */

export async function readDB() {
  if (MONGODB_URI) {
    return readDBFromMongo();
  }

  return readDBFromFile();
}

export async function writeDB(db) {
  if (MONGODB_URI) {
    return writeDBToMongo(db);
  }

  return writeDBToFile(db);
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
