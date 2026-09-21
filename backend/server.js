import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";

import { readDB, writeDB, getNextId } from "./db.js";
import { sendEmail } from "./mailer.js";
import {
  creerPaiementPaytech,
  verifierIpnPaytech,
} from "./paytech.js";

/*
 * =========================================================
 * VALIDATION DU NUMÉRO DE TÉLÉPHONE SÉNÉGALAIS
 * =========================================================
 *
 * Même logique que côté frontend (utils/validation.js) :
 * on retire l'indicatif (+221, 00221) et les espaces, puis
 * on vérifie que ce qui reste est un numéro mobile
 * sénégalais valide (9 chiffres commençant par 7).
 *
 * Vérifier aussi côté serveur est important : un client
 * pourrait contourner la validation du navigateur (via
 * l'outil "developer tools" ou un appel direct à l'API).
 */
function telephoneEstValide(valeur) {
  if (!valeur) {
    return false;
  }

  const chiffres = String(valeur)
    .replace(/^\+?221/, "")
    .replace(/^00221/, "")
    .replace(/\D/g, "");

  return /^7[0-9]{8}$/.test(chiffres);
}

/*
 * =========================================================
 * SERVEUR "MON COMMERCE SÉNÉGAL"
 * =========================================================
 *
 * Ce serveur remplace le localStorage du navigateur.
 * Toutes les données (comptes, boutiques, produits,
 * commandes) sont maintenant stockées ici, sur le serveur,
 * et partagées par tous les visiteurs du site.
 */

const app = express();

const PORT = process.env.PORT || 4000;

/*
 * =========================================================
 * SÉCURITÉ — CLÉ SECRÈTE POUR SIGNER LES JETONS (JWT)
 * =========================================================
 *
 * Cette clé sert à signer et vérifier les jetons de
 * connexion. Sur Render, définis une variable
 * d'environnement JWT_SECRET avec une valeur longue et
 * aléatoire (Settings > Environment sur Render).
 *
 * Une valeur par défaut est fournie pour que le site
 * fonctionne quand même en local, mais elle ne doit
 * JAMAIS être utilisée telle quelle en production.
 */
const JWT_SECRET =
  process.env.JWT_SECRET ||
  "changez-cette-cle-en-production-mon-commerce-senegal";

if (!process.env.JWT_SECRET) {
  console.warn(
    "⚠️  JWT_SECRET n'est pas défini. Utilisation d'une clé par défaut, à changer en production (variable d'environnement sur Render)."
  );
}

function createToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      shopId: user.shopId || null,
    },
    JWT_SECRET,
    { expiresIn: "30d" }
  );
}

/*
 * Middleware : vérifie que la requête contient un jeton
 * valide. Si oui, place les infos du compte dans req.user.
 * Si non, bloque la requête avec une erreur 401.
 */
function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ")
    ? header.slice(7)
    : null;

  if (!token) {
    return res.status(401).json({
      error: "Connexion requise pour cette action.",
    });
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (error) {
    return res.status(401).json({
      error: "Session invalide ou expirée, reconnecte-toi.",
    });
  }
}

/*
 * Middleware : comme requireAuth, mais exige en plus
 * que le compte ait le rôle "admin".
 */
function requireAdmin(req, res, next) {
  requireAuth(req, res, function () {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        error: "Accès réservé aux administrateurs.",
      });
    }

    next();
  });
}

app.use(cors());
app.use(express.json({ limit: "10mb" }));


/*
 * Petit "log" pour voir dans le terminal chaque
 * requête reçue, utile pour comprendre ce qu'il se passe.
 */
app.use(function (req, res, next) {
  console.log(req.method + " " + req.url);
  next();
});


/* =========================================================
   ROUTE DE TEST
   ========================================================= */

app.get("/api", async function (req, res) {
  res.json({
    message:
      "Bienvenue sur l'API de Mon Commerce Sénégal 🇸🇳",
  });
});


app.get("/api/payment-info", async function (req, res) {
  const db = await readDB();

  res.json({
    orangeMoneyNumber:
      (db.settings && db.settings.orangeMoneyNumber) || "",
    waveNumber:
      (db.settings && db.settings.waveNumber) || "",
  });
});


/*
 * Tarifs de livraison par ville — route publique, lue par
 * le panier/checkout pour calculer les frais et le délai
 * estimé selon la ville du client.
 */
app.get("/api/livraison-tarifs", async function (req, res) {
  const db = await readDB();

  res.json({
    villes:
      (db.settings && db.settings.livraison) || [],
    parDefaut:
      (db.settings && db.settings.livraisonParDefaut) || {
        frais: 3000,
        delai: "3-5 jours",
      },
  });
});


/* =========================================================
   AUTHENTIFICATION
   ========================================================= */

app.post("/api/auth/register", async function (req, res) {
  const {
    name,
    email,
    password,
    phone,
    role,
    codeParrainage,
  } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({
      error: "Nom, email et mot de passe sont obligatoires.",
    });
  }

  if (phone && !telephoneEstValide(phone)) {
    return res.status(400).json({
      error:
        "Le numéro de téléphone indiqué n'est pas un numéro sénégalais valide (ex : 77 123 45 67).",
    });
  }

  const db = await readDB();

  const emailExists = db.users.some(function (user) {
    return (
      user.email.toLowerCase() ===
      String(email).toLowerCase()
    );
  });

  if (emailExists) {
    return res.status(409).json({
      error: "Un compte existe déjà avec cet email.",
    });
  }

  const passwordHash = bcrypt.hashSync(password, 10);

  /*
   * =========================================================
   * PARRAINAGE
   * =========================================================
   *
   * Si un code de parrainage valide est fourni, on retrouve
   * le parrain et on garde son id. Le nouveau compte recevra
   * automatiquement une réduction sur sa première commande
   * (voir la création de commande plus bas).
   */
  let parrainId = null;

  if (codeParrainage && codeParrainage.trim()) {
    const parrain = db.users.find(function (user) {
      return (
        user.referralCode &&
        user.referralCode.toUpperCase() ===
          codeParrainage.trim().toUpperCase()
      );
    });

    if (parrain) {
      parrainId = parrain.id;
    }
  }

  const nextUserId = getNextId(db, "users");

  const newUser = {
    id: nextUserId,
    name,
    email,
    password: passwordHash,
    phone: phone || "",
    role: role === "merchant" ? "merchant" : "client",
    shopId: null,
    referralCode:
      "MCS" + (nextUserId + 1000).toString(36).toUpperCase(),
    parrainId,
  };

  db.users.push(newUser);
  await writeDB(db);

  const { password: _removed, ...safeUser } = newUser;

  const token = createToken(newUser);

  res.status(201).json({ user: safeUser, token });
});


/*
 * Renvoie le code de parrainage de l'utilisateur connecté
 * et le nombre de personnes qu'il a déjà parrainées.
 */
app.get(
  "/api/parrainage",
  requireAuth,
  async function (req, res) {
    const db = await readDB();

    const user = db.users.find(function (item) {
      return Number(item.id) === Number(req.user.id);
    });

    if (!user) {
      return res
        .status(404)
        .json({ error: "Utilisateur introuvable." });
    }

    const filleuls = db.users.filter(function (item) {
      return Number(item.parrainId) === Number(user.id);
    });

    res.json({
      referralCode: user.referralCode || "",
      totalFilleuls: filleuls.length,
    });
  }
);


app.post("/api/auth/login", async function (req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      error: "Email et mot de passe sont obligatoires.",
    });
  }

  const db = await readDB();

  const user = db.users.find(function (item) {
    return (
      item.email.toLowerCase() ===
      String(email).toLowerCase()
    );
  });

  if (!user) {
    return res.status(401).json({
      error: "Email ou mot de passe incorrect.",
    });
  }

  const passwordMatches = bcrypt.compareSync(
    password,
    user.password
  );

  if (!passwordMatches) {
    return res.status(401).json({
      error: "Email ou mot de passe incorrect.",
    });
  }

  const { password: _removed, ...safeUser } = user;

  const token = createToken(user);

  res.json({ user: safeUser, token });
});


/*
 * Modifier son nom / téléphone. On ne permet jamais de
 * changer l'email ou le rôle par cette route.
 */
app.put(
  "/api/auth/profile",
  requireAuth,
  async function (req, res) {
    const { name, phone } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        error: "Le nom est obligatoire.",
      });
    }

    const db = await readDB();

    let updatedUser = null;

    db.users = db.users.map(function (user) {
      if (Number(user.id) !== Number(req.user.id)) {
        return user;
      }

      updatedUser = {
        ...user,
        name: name.trim(),
        phone: phone ? phone.trim() : user.phone,
      };

      return updatedUser;
    });

    if (!updatedUser) {
      return res
        .status(404)
        .json({ error: "Compte introuvable." });
    }

    await writeDB(db);

    const { password: _removed, ...safeUser } =
      updatedUser;

    const token = createToken(updatedUser);

    res.json({ user: safeUser, token });
  }
);


/*
 * Changer son mot de passe. Il faut prouver qu'on
 * connaît l'ancien mot de passe avant de le changer.
 */
app.put(
  "/api/auth/password",
  requireAuth,
  async function (req, res) {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error:
          "L'ancien et le nouveau mot de passe sont obligatoires.",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        error:
          "Le nouveau mot de passe doit contenir au moins 6 caractères.",
      });
    }

    const db = await readDB();

    const user = db.users.find(function (item) {
      return Number(item.id) === Number(req.user.id);
    });

    if (!user) {
      return res
        .status(404)
        .json({ error: "Compte introuvable." });
    }

    const passwordMatches = bcrypt.compareSync(
      currentPassword,
      user.password
    );

    if (!passwordMatches) {
      return res.status(401).json({
        error: "Votre mot de passe actuel est incorrect.",
      });
    }

    const newPasswordHash = bcrypt.hashSync(
      newPassword,
      10
    );

    db.users = db.users.map(function (item) {
      if (Number(item.id) !== Number(req.user.id)) {
        return item;
      }

      return { ...item, password: newPasswordHash };
    });

    await writeDB(db);

    res.json({ success: true });
  }
);


/*
 * Demande de réinitialisation de mot de passe.
 * On répond toujours pareil (succès), même si l'email
 * n'existe pas, pour ne pas révéler quels emails sont
 * inscrits sur le site (bonne pratique de sécurité).
 */
app.post(
  "/api/auth/forgot-password",
  async function (req, res) {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        error: "L'email est obligatoire.",
      });
    }

    const db = await readDB();

    const user = db.users.find(function (item) {
      return (
        item.email.toLowerCase() ===
        String(email).toLowerCase()
      );
    });

    if (user) {
      const resetToken = crypto
        .randomBytes(32)
        .toString("hex");

      const resetTokenExpiry =
        Date.now() + 60 * 60 * 1000; // 1 heure

      db.users = db.users.map(function (item) {
        if (Number(item.id) !== Number(user.id)) {
          return item;
        }

        return {
          ...item,
          resetToken,
          resetTokenExpiry,
        };
      });

      await writeDB(db);

      const frontendUrl =
        process.env.FRONTEND_URL ||
        "http://localhost:5173";

      const resetLink =
        frontendUrl +
        "/reinitialiser-mot-de-passe?email=" +
        encodeURIComponent(user.email) +
        "&token=" +
        resetToken;

      try {
        await sendEmail({
          to: user.email,
          subject:
            "Réinitialisation de votre mot de passe — Mon Commerce Sénégal",
          html:
            "<p>Bonjour " +
            user.name +
            ",</p>" +
            "<p>Vous avez demandé à réinitialiser votre mot de passe. Cliquez sur le lien ci-dessous (valable 1 heure) :</p>" +
            '<p><a href="' +
            resetLink +
            '">' +
            resetLink +
            "</a></p>" +
            "<p>Si vous n'êtes pas à l'origine de cette demande, ignorez simplement cet email.</p>",
        });
      } catch (error) {
        console.error(
          "Erreur lors de l'envoi de l'email :",
          error
        );
      }
    }

    res.json({
      message:
        "Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.",
    });
  }
);


/*
 * Réinitialisation effective du mot de passe grâce
 * au jeton reçu par email.
 */
app.post(
  "/api/auth/reset-password",
  async function (req, res) {
    const { email, token, newPassword } = req.body;

    if (!email || !token || !newPassword) {
      return res.status(400).json({
        error: "Tous les champs sont obligatoires.",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        error:
          "Le nouveau mot de passe doit contenir au moins 6 caractères.",
      });
    }

    const db = await readDB();

    const user = db.users.find(function (item) {
      return (
        item.email.toLowerCase() ===
        String(email).toLowerCase()
      );
    });

    if (
      !user ||
      !user.resetToken ||
      user.resetToken !== token
    ) {
      return res.status(400).json({
        error: "Lien invalide ou déjà utilisé.",
      });
    }

    if (
      !user.resetTokenExpiry ||
      Date.now() > user.resetTokenExpiry
    ) {
      return res.status(400).json({
        error:
          "Ce lien a expiré, merci de refaire une demande.",
      });
    }

    const newPasswordHash = bcrypt.hashSync(
      newPassword,
      10
    );

    db.users = db.users.map(function (item) {
      if (Number(item.id) !== Number(user.id)) {
        return item;
      }

      const {
        resetToken: _removedToken,
        resetTokenExpiry: _removedExpiry,
        ...rest
      } = item;

      return { ...rest, password: newPasswordHash };
    });

    await writeDB(db);

    res.json({ success: true });
  }
);

app.get("/api/shops", async function (req, res) {
  const db = await readDB();

  const shopsWithCounts = db.shops.map(function (shop) {
    const productCount = db.products.filter(
      function (product) {
        return (
          Number(product.shopId) === Number(shop.id)
        );
      }
    ).length;

    return { ...shop, products: productCount };
  });

  res.json({ shops: shopsWithCounts });
});


app.get("/api/shops/:id", async function (req, res) {
  const db = await readDB();

  const shop = db.shops.find(function (item) {
    return Number(item.id) === Number(req.params.id);
  });

  if (!shop) {
    return res
      .status(404)
      .json({ error: "Boutique introuvable." });
  }

  const productCount = db.products.filter(
    function (product) {
      return (
        Number(product.shopId) === Number(shop.id)
      );
    }
  ).length;

  res.json({ shop: { ...shop, products: productCount } });
});


app.post("/api/shops", requireAuth, async function (req, res) {
  const {
    name,
    city,
    category,
    description,
    logo,
    phone,
    orangeMoneyNumber,
    waveNumber,
  } = req.body;

  if (!name || !city || !category) {
    return res.status(400).json({
      error:
        "Le nom, la ville et la catégorie sont obligatoires.",
    });
  }

  if (!telephoneEstValide(phone)) {
    return res.status(400).json({
      error:
        "Merci d'indiquer un numéro de téléphone sénégalais valide pour votre boutique (ex : 77 123 45 67).",
    });
  }

  const db = await readDB();

  /*
   * SÉCURITÉ : on utilise l'id du compte connecté
   * (issu du jeton), jamais une valeur envoyée par
   * le client, pour éviter qu'on crée une boutique
   * au nom de quelqu'un d'autre.
   */
  const ownerId = req.user.id;

  const newShop = {
    id: getNextId(db, "shops"),
    name,
    city,
    category,
    description: description || "",
    ownerId,
    logo: logo || null,
    phone: phone || "",
    orangeMoneyNumber: orangeMoneyNumber || "",
    waveNumber: waveNumber || "",
  };

  db.shops.push(newShop);

  db.users = db.users.map(function (user) {
    if (Number(user.id) !== Number(ownerId)) {
      return user;
    }

    return { ...user, shopId: newShop.id, role: "merchant" };
  });

  await writeDB(db);

  /*
   * Le rôle du compte vient de changer (client -> merchant),
   * on renvoie un nouveau jeton à jour pour que le site
   * n'ait pas besoin de se déconnecter/reconnecter.
   */
  const updatedUser = db.users.find(function (user) {
    return Number(user.id) === Number(ownerId);
  });

  const token = createToken(updatedUser);

  res.status(201).json({ shop: newShop, token });
});


function getShopOwnerCheck(req, res, db) {
  const shop = db.shops.find(function (item) {
    return Number(item.id) === Number(req.params.id);
  });

  if (!shop) {
    res.status(404).json({ error: "Boutique introuvable." });
    return null;
  }

  const isOwner =
    shop.ownerId &&
    Number(shop.ownerId) === Number(req.user.id);

  if (!isOwner && req.user.role !== "admin") {
    res.status(403).json({
      error: "Cette boutique ne vous appartient pas.",
    });
    return null;
  }

  return shop;
}


app.put("/api/shops/:id", requireAuth, async function (req, res) {
  const db = await readDB();

  const shop = getShopOwnerCheck(req, res, db);

  if (!shop) {
    return;
  }

  const forbiddenFields = ["id", "ownerId"];

  const safeUpdates = { ...req.body };

  forbiddenFields.forEach(function (field) {
    delete safeUpdates[field];
  });

  let updatedShop = null;

  db.shops = db.shops.map(function (item) {
    if (Number(item.id) !== Number(req.params.id)) {
      return item;
    }

    updatedShop = { ...item, ...safeUpdates, id: item.id };

    return updatedShop;
  });

  await writeDB(db);

  res.json({ shop: updatedShop });
});


app.delete("/api/shops/:id", requireAuth, async function (req, res) {
  const db = await readDB();

  const shop = getShopOwnerCheck(req, res, db);

  if (!shop) {
    return;
  }

  const shopId = Number(req.params.id);

  db.shops = db.shops.filter(function (item) {
    return Number(item.id) !== shopId;
  });

  /*
   * On retire aussi tous les produits de cette boutique,
   * sinon ils resteraient "orphelins" dans la base et
   * pourraient encore apparaître dans des recherches.
   */
  db.products = db.products.filter(function (product) {
    return Number(product.shopId) !== shopId;
  });

  /*
   * On réinitialise le shopId du compte propriétaire, pour
   * qu'il puisse créer une nouvelle boutique par la suite
   * sans que le tableau de bord reste bloqué sur l'ancienne.
   */
  db.users = db.users.map(function (user) {
    if (Number(user.shopId) === shopId) {
      return { ...user, shopId: null };
    }

    return user;
  });

  await writeDB(db);

  res.json({ success: true });
});


/* =========================================================
   PRODUITS
   ========================================================= */

app.get("/api/products", async function (req, res) {
  const db = await readDB();

  let products = db.products;

  if (req.query.shopId) {
    products = products.filter(function (product) {
      return (
        Number(product.shopId) ===
        Number(req.query.shopId)
      );
    });
  }

  if (req.query.category) {
    products = products.filter(function (product) {
      return product.category === req.query.category;
    });
  }

  if (req.query.q) {
    const search = String(req.query.q)
      .trim()
      .toLowerCase();

    products = products.filter(function (product) {
      const name = (product.name || "").toLowerCase();
      const description = (
        product.description || ""
      ).toLowerCase();
      const category = (
        product.category || ""
      ).toLowerCase();

      return (
        name.includes(search) ||
        description.includes(search) ||
        category.includes(search)
      );
    });
  }

  if (req.query.minPrice) {
    products = products.filter(function (product) {
      return (
        Number(product.price) >=
        Number(req.query.minPrice)
      );
    });
  }

  if (req.query.maxPrice) {
    products = products.filter(function (product) {
      return (
        Number(product.price) <=
        Number(req.query.maxPrice)
      );
    });
  }

  /*
   * On ajoute la note moyenne de chaque produit,
   * calculée à partir des avis clients.
   */

  products = products.map(function (product) {
    const productReviews = db.reviews.filter(
      function (review) {
        return (
          Number(review.productId) ===
          Number(product.id)
        );
      }
    );

    const averageRating =
      productReviews.length === 0
        ? 0
        : productReviews.reduce(function (sum, review) {
            return sum + Number(review.rating);
          }, 0) / productReviews.length;

    return {
      ...product,
      averageRating:
        Math.round(averageRating * 10) / 10,
      reviewCount: productReviews.length,
    };
  });

  if (req.query.minRating) {
    products = products.filter(function (product) {
      return (
        product.averageRating >=
        Number(req.query.minRating)
      );
    });
  }

  /*
   * VENTES FLASH : ne renvoie que les produits qui ont
   * une réduction ET une date de fin non dépassée.
   */
  if (req.query.flashSale === "true") {
    const maintenant = Date.now();

    products = products.filter(function (product) {
      return (
        Number(product.discountPercent) > 0 &&
        product.discountEndsAt &&
        new Date(product.discountEndsAt).getTime() >
          maintenant
      );
    });
  }

  res.json({ products });
});


app.get("/api/products/:id", async function (req, res) {
  const db = await readDB();

  const product = db.products.find(function (item) {
    return Number(item.id) === Number(req.params.id);
  });

  if (!product) {
    return res
      .status(404)
      .json({ error: "Produit introuvable." });
  }

  const productReviews = db.reviews.filter(
    function (review) {
      return (
        Number(review.productId) === Number(product.id)
      );
    }
  );

  const averageRating =
    productReviews.length === 0
      ? 0
      : productReviews.reduce(function (sum, review) {
          return sum + Number(review.rating);
        }, 0) / productReviews.length;

  res.json({
    product: {
      ...product,
      averageRating:
        Math.round(averageRating * 10) / 10,
      reviewCount: productReviews.length,
    },
  });
});


app.post("/api/products", requireAuth, async function (req, res) {
  const {
    name,
    price,
    shopId,
    categoryId,
    category,
    description,
    stock,
    image,
    discountPercent,
    discountEndsAt,
  } = req.body;

  if (!name || !price || !shopId) {
    return res.status(400).json({
      error:
        "Le nom, le prix et la boutique sont obligatoires.",
    });
  }

  const db = await readDB();

  const shop = db.shops.find(function (item) {
    return Number(item.id) === Number(shopId);
  });

  if (!shop) {
    return res
      .status(404)
      .json({ error: "Boutique introuvable." });
  }

  const isOwner =
    shop.ownerId &&
    Number(shop.ownerId) === Number(req.user.id);

  if (!isOwner && req.user.role !== "admin") {
    return res.status(403).json({
      error:
        "Vous ne pouvez ajouter un produit que dans votre propre boutique.",
    });
  }

  const newProduct = {
    id: getNextId(db, "products"),
    name,
    price: Number(price),
    shopId: Number(shopId),
    categoryId: categoryId || null,
    category: category || "",
    description: description || "",
    stock: Number(stock) || 0,
    image: image || "",
    discountPercent:
      Math.min(90, Math.max(0, Number(discountPercent) || 0)),
    /*
     * VENTE FLASH : si une date de fin est fournie, la
     * réduction n'est affichée aux clients que jusqu'à
     * cette date/heure (voir la fonction utilitaire
     * "promoEstActive" utilisée à l'affichage).
     */
    discountEndsAt: discountEndsAt || null,
  };

  db.products.push(newProduct);
  await writeDB(db);

  res.status(201).json({ product: newProduct });
});


/*
 * =========================================================
 * IMPORT DE PRODUITS EN MASSE (CSV)
 * =========================================================
 *
 * Le fichier CSV est lu et transformé en tableau côté
 * navigateur (voir utils/csv.js), et c'est ce tableau déjà
 * prêt que cette route reçoit. On revalide quand même
 * chaque ligne ici, car on ne fait jamais confiance à ce
 * qui vient du client.
 */
app.post(
  "/api/products/import",
  requireAuth,
  async function (req, res) {
    const { shopId, produits } = req.body;

    if (!shopId || !Array.isArray(produits)) {
      return res.status(400).json({
        error: "shopId et une liste de produits sont obligatoires.",
      });
    }

    const db = await readDB();

    const shop = db.shops.find(function (item) {
      return Number(item.id) === Number(shopId);
    });

    if (!shop) {
      return res
        .status(404)
        .json({ error: "Boutique introuvable." });
    }

    const isOwner =
      shop.ownerId &&
      Number(shop.ownerId) === Number(req.user.id);

    if (!isOwner && req.user.role !== "admin") {
      return res.status(403).json({
        error:
          "Vous ne pouvez importer des produits que dans votre propre boutique.",
      });
    }

    const erreurs = [];
    const produitsCrees = [];

    produits.forEach(function (ligne, index) {
      const numeroLigne = index + 2; // +2 : ligne 1 = en-têtes

      const nom = (ligne.nom || "").trim();
      const prix = Number(ligne.prix);

      if (!nom || !prix || prix <= 0) {
        erreurs.push(
          "Ligne " +
            numeroLigne +
            " : nom et prix valides obligatoires."
        );
        return;
      }

      const nouveauProduit = {
        id: getNextId(db, "products"),
        name: nom,
        price: prix,
        shopId: Number(shopId),
        categoryId: null,
        category: (ligne.categorie || "").trim(),
        description: (ligne.description || "").trim(),
        stock: Number(ligne.stock) || 0,
        image: (ligne.image || "").trim(),
        discountPercent: Math.min(
          90,
          Math.max(0, Number(ligne.reduction) || 0)
        ),
        discountEndsAt: null,
      };

      db.products.push(nouveauProduit);
      produitsCrees.push(nouveauProduit);
    });

    await writeDB(db);

    res.status(201).json({
      importes: produitsCrees.length,
      erreurs,
    });
  }
);


function getProductOwnerCheck(req, res, db) {
  const product = db.products.find(function (item) {
    return Number(item.id) === Number(req.params.id);
  });

  if (!product) {
    res.status(404).json({ error: "Produit introuvable." });
    return null;
  }

  const shop = db.shops.find(function (item) {
    return Number(item.id) === Number(product.shopId);
  });

  const isOwner =
    shop &&
    shop.ownerId &&
    Number(shop.ownerId) === Number(req.user.id);

  if (!isOwner && req.user.role !== "admin") {
    res.status(403).json({
      error: "Ce produit ne vous appartient pas.",
    });
    return null;
  }

  return product;
}


app.put("/api/products/:id", requireAuth, async function (req, res) {
  const db = await readDB();

  const product = getProductOwnerCheck(req, res, db);

  if (!product) {
    return;
  }

  const forbiddenFields = ["id", "shopId"];

  const safeUpdates = { ...req.body };

  forbiddenFields.forEach(function (field) {
    delete safeUpdates[field];
  });

  let updatedProduct = null;

  db.products = db.products.map(function (item) {
    if (Number(item.id) !== Number(req.params.id)) {
      return item;
    }

    updatedProduct = { ...item, ...safeUpdates, id: item.id };

    return updatedProduct;
  });

  await writeDB(db);

  res.json({ product: updatedProduct });
});


app.delete(
  "/api/products/:id",
  requireAuth,
  async function (req, res) {
    const db = await readDB();

    const product = getProductOwnerCheck(req, res, db);

    if (!product) {
      return;
    }

    db.products = db.products.filter(function (item) {
      return Number(item.id) !== Number(req.params.id);
    });

    await writeDB(db);

    res.json({ success: true });
  }
);


/* =========================================================
   CODES PROMO
   ========================================================= */

/*
 * Le commerçant crée un code promo pour SA boutique.
 * type: "percent" (ex: 10 = -10%) ou "fixed" (ex: 2000 = -2000 FCFA)
 */
app.post(
  "/api/coupons",
  requireAuth,
  async function (req, res) {
    const { code, type, value, shopId } = req.body;

    if (!code || !type || !value || !shopId) {
      return res.status(400).json({
        error:
          "code, type, value et shopId sont obligatoires.",
      });
    }

    if (type !== "percent" && type !== "fixed") {
      return res.status(400).json({
        error:
          "Le type doit être \"percent\" ou \"fixed\".",
      });
    }

    const db = await readDB();

    const shop = db.shops.find(function (item) {
      return Number(item.id) === Number(shopId);
    });

    const estProprietaire =
      shop &&
      shop.ownerId &&
      Number(shop.ownerId) === Number(req.user.id);

    if (!estProprietaire) {
      return res.status(403).json({
        error:
          "Cette boutique ne vous appartient pas.",
      });
    }

    const codeNormalise = code.trim().toUpperCase();

    const codeExisteDeja = db.coupons.some(function (item) {
      return (
        item.code === codeNormalise &&
        Number(item.shopId) === Number(shopId)
      );
    });

    if (codeExisteDeja) {
      return res.status(409).json({
        error:
          "Ce code existe déjà pour cette boutique.",
      });
    }

    const newCoupon = {
      id: getNextId(db, "coupons"),
      code: codeNormalise,
      type,
      value: Number(value),
      shopId: Number(shopId),
      active: true,
      createdAt: new Date().toISOString(),
    };

    db.coupons.push(newCoupon);
    await writeDB(db);

    res.status(201).json({ coupon: newCoupon });
  }
);

/*
 * Liste les codes promo d'une boutique (espace commerçant).
 */
app.get("/api/coupons", async function (req, res) {
  const db = await readDB();

  let coupons = db.coupons;

  if (req.query.shopId) {
    const shopId = Number(req.query.shopId);

    coupons = coupons.filter(function (item) {
      return Number(item.shopId) === shopId;
    });
  }

  res.json({ coupons });
});

/*
 * Active/désactive un code promo (le commerçant peut le
 * couper sans le supprimer).
 */
app.put(
  "/api/coupons/:id",
  requireAuth,
  async function (req, res) {
    const db = await readDB();

    const coupon = db.coupons.find(function (item) {
      return Number(item.id) === Number(req.params.id);
    });

    if (!coupon) {
      return res.status(404).json({
        error: "Code promo introuvable.",
      });
    }

    const shop = db.shops.find(function (item) {
      return Number(item.id) === Number(coupon.shopId);
    });

    const estProprietaire =
      shop &&
      shop.ownerId &&
      Number(shop.ownerId) === Number(req.user.id);

    if (!estProprietaire) {
      return res.status(403).json({
        error:
          "Cette boutique ne vous appartient pas.",
      });
    }

    if (req.body.active !== undefined) {
      coupon.active = Boolean(req.body.active);
    }

    await writeDB(db);

    res.json({ coupon });
  }
);

app.delete(
  "/api/coupons/:id",
  requireAuth,
  async function (req, res) {
    const db = await readDB();

    const coupon = db.coupons.find(function (item) {
      return Number(item.id) === Number(req.params.id);
    });

    if (!coupon) {
      return res.status(404).json({
        error: "Code promo introuvable.",
      });
    }

    const shop = db.shops.find(function (item) {
      return Number(item.id) === Number(coupon.shopId);
    });

    const estProprietaire =
      shop &&
      shop.ownerId &&
      Number(shop.ownerId) === Number(req.user.id);

    if (!estProprietaire) {
      return res.status(403).json({
        error:
          "Cette boutique ne vous appartient pas.",
      });
    }

    db.coupons = db.coupons.filter(function (item) {
      return Number(item.id) !== Number(req.params.id);
    });

    await writeDB(db);

    res.json({ success: true });
  }
);

/*
 * Le client tape un code dans son panier : on vérifie
 * qu'il existe, qu'il est actif, et qu'il correspond bien
 * à la boutique concernée, puis on renvoie la réduction.
 */
app.post(
  "/api/coupons/verifier",
  async function (req, res) {
    const { code, shopId } = req.body;

    if (!code || !shopId) {
      return res.status(400).json({
        error: "code et shopId sont obligatoires.",
      });
    }

    const db = await readDB();

    const codeNormalise = code.trim().toUpperCase();

    const coupon = db.coupons.find(function (item) {
      return (
        item.code === codeNormalise &&
        Number(item.shopId) === Number(shopId)
      );
    });

    if (!coupon || !coupon.active) {
      return res.status(404).json({
        error: "Code promo invalide ou expiré.",
      });
    }

    res.json({ coupon });
  }
);


/* =========================================================
   COMMANDES
   ========================================================= */

app.get("/api/orders", async function (req, res) {
  const db = await readDB();

  let orders = db.orders;

  if (req.query.email) {
    const email = String(req.query.email).toLowerCase();

    orders = orders.filter(function (order) {
      return (
        order.customer.email &&
        order.customer.email.toLowerCase() === email
      );
    });
  }

  if (req.query.shopId) {
    const shopId = Number(req.query.shopId);

    orders = orders.filter(function (order) {
      return order.products.some(function (product) {
        return Number(product.shopId) === shopId;
      });
    });
  }

  res.json({ orders });
});


app.post("/api/orders", async function (req, res) {
  const {
    customer,
    products,
    total,
    merchandiseTotal,
    paymentMethod,
    paymentReference,
    couponCode,
    discount,
    deliveryFee,
    deliveryEstimate,
    deliveryBreakdown,
  } = req.body;

  if (
    !customer ||
    !Array.isArray(products) ||
    products.length === 0
  ) {
    return res.status(400).json({
      error:
        "Les informations du client et les produits sont obligatoires.",
    });
  }

  if (!telephoneEstValide(customer.phone)) {
    return res.status(400).json({
      error:
        "Merci d'indiquer un numéro de téléphone sénégalais valide (ex : 77 123 45 67).",
    });
  }

  const allowedMethods = [
    "cod",
    "orange_money",
    "wave",
    "paytech",
  ];

  const method = allowedMethods.includes(paymentMethod)
    ? paymentMethod
    : "cod";

  const db = await readDB();

  /*
   * Vérifie que le stock est suffisant avant de
   * valider la commande.
   */
  for (const item of products) {
    const productInDb = db.products.find(function (p) {
      return Number(p.id) === Number(item.id);
    });

    if (!productInDb) {
      return res.status(404).json({
        error: `Produit introuvable : ${item.name || item.id}`,
      });
    }

    if (productInDb.stock < item.quantity) {
      return res.status(409).json({
        error: `Stock insuffisant pour "${productInDb.name}".`,
      });
    }
  }

  /*
   * Diminue le stock de chaque produit commandé.
   */
  db.products = db.products.map(function (product) {
    const orderedItem = products.find(function (item) {
      return Number(item.id) === Number(product.id);
    });

    if (!orderedItem) {
      return product;
    }

    return {
      ...product,
      stock: product.stock - orderedItem.quantity,
    };
  });

  const orderNumber = "MC-" + Date.now();

  /*
   * =========================================================
   * RÉDUCTION DE PARRAINAGE
   * =========================================================
   *
   * Si le client a été parrainé (compte créé avec un code de
   * parrainage) ET que c'est sa toute première commande, on
   * lui applique automatiquement 1000 F CFA de réduction.
   */
  const REDUCTION_PARRAINAGE = 1000;
  let referralDiscount = 0;

  if (customer.email) {
    const compteClient = db.users.find(function (user) {
      return (
        user.email.toLowerCase() ===
        String(customer.email).toLowerCase()
      );
    });

    if (compteClient && compteClient.parrainId) {
      const dejaCommande = db.orders.some(function (
        order
      ) {
        return (
          order.customer.email &&
          order.customer.email.toLowerCase() ===
            String(customer.email).toLowerCase()
        );
      });

      if (!dejaCommande) {
        referralDiscount = REDUCTION_PARRAINAGE;
      }
    }
  }

  const commissionRate =
    (db.settings && db.settings.commissionRate) || 0.1;

  const orderTotal =
    (Number(total) || 0) - referralDiscount;

  /*
   * La commission de la plateforme ne porte que sur la
   * valeur des produits, jamais sur les frais de
   * livraison (qui ne sont pas une vente du commerçant).
   */
  const baseCommission =
    merchandiseTotal !== undefined
      ? Number(merchandiseTotal) || 0
      : orderTotal;

  const platformFee =
    Math.round(baseCommission * commissionRate);
  const merchantPayout = baseCommission - platformFee;

  const newOrder = {
    orderNumber,
    customer,
    products,
    total: orderTotal,
    couponCode: couponCode || "",
    discount: Number(discount) || 0,
    referralDiscount,
    deliveryFee: Number(deliveryFee) || 0,
    deliveryEstimate: deliveryEstimate || "",
    /*
     * Détail des frais de livraison par boutique (façon
     * Jumia) — utile pour que chaque commerçant voie ce
     * qui lui revient sur une commande multi-boutiques.
     */
    deliveryBreakdown: Array.isArray(deliveryBreakdown)
      ? deliveryBreakdown.map(function (item) {
          return {
            shopId: Number(item.shopId) || null,
            shopName: item.shopName || "",
            frais: Number(item.frais) || 0,
            delai: item.delai || "",
          };
        })
      : [],
    status: "En attente",
    createdAt: new Date().toISOString(),
    commissionRate,
    platformFee,
    merchantPayout,
    paymentMethod: method,
    paymentReference: paymentReference || "",
    paymentStatus:
      method === "cod"
        ? "À encaisser à la livraison"
        : method === "paytech"
        ? "En attente de paiement en ligne"
        : "À vérifier",
  };

  db.orders.push(newOrder);
  await writeDB(db);

  /*
   * L'envoi de l'email ne doit jamais empêcher la
   * commande de réussir, même si Gmail est indisponible.
   */
  if (newOrder.customer.email) {
    const productsListHtml = newOrder.products
      .map(function (product) {
        return (
          "<li>" +
          product.name +
          " × " +
          product.quantity +
          "</li>"
        );
      })
      .join("");

    sendEmail({
      to: newOrder.customer.email,
      subject:
        "Confirmation de votre commande " +
        newOrder.orderNumber +
        " — Mon Commerce Sénégal",
      html:
        "<p>Bonjour " +
        newOrder.customer.name +
        ",</p>" +
        "<p>Merci pour votre commande ! Voici le récapitulatif :</p>" +
        "<p><strong>Numéro de commande :</strong> " +
        newOrder.orderNumber +
        "</p>" +
        "<ul>" +
        productsListHtml +
        "</ul>" +
        "<p><strong>Total :</strong> " +
        newOrder.total.toLocaleString("fr-FR") +
        " F CFA</p>" +
        "<p>Nous vous préviendrons par email dès que votre commande sera confirmée par le vendeur.</p>",
    }).catch(function (error) {
      console.error(
        "Erreur lors de l'envoi de l'email de confirmation :",
        error
      );
    });
  }

  /*
   * Notifie chaque commerçant concerné par cette commande
   * (un client peut acheter des produits de plusieurs
   * boutiques en une seule commande). Chaque commerçant ne
   * voit que SES produits et SA part du total, jamais ceux
   * des autres vendeurs.
   */
  const shopIdsDansLaCommande = [
    ...new Set(
      products
        .map(function (item) {
          return item.shopId;
        })
        .filter(function (shopId) {
          return shopId !== undefined && shopId !== null;
        })
    ),
  ];

  shopIdsDansLaCommande.forEach(function (shopId) {
    const shop = db.shops.find(function (item) {
      return Number(item.id) === Number(shopId);
    });

    if (!shop || !shop.ownerId) {
      return;
    }

    const owner = db.users.find(function (item) {
      return Number(item.id) === Number(shop.ownerId);
    });

    if (!owner || !owner.email) {
      return;
    }

    const produitsDuCommercant = products.filter(
      function (item) {
        return Number(item.shopId) === Number(shopId);
      }
    );

    const totalDuCommercant = produitsDuCommercant.reduce(
      function (sum, item) {
        return (
          sum +
          (Number(item.price) || 0) *
            (Number(item.quantity) || 0)
        );
      },
      0
    );

    const listeProduitsHtml = produitsDuCommercant
      .map(function (item) {
        return (
          "<li>" +
          item.name +
          " × " +
          item.quantity +
          "</li>"
        );
      })
      .join("");

    sendEmail({
      to: owner.email,
      subject:
        "Nouvelle commande reçue ! (" +
        orderNumber +
        ") — " +
        shop.name,
      html:
        "<p>Bonjour,</p>" +
        "<p>Vous avez reçu une nouvelle commande sur <strong>" +
        shop.name +
        "</strong> !</p>" +
        "<p><strong>Numéro de commande :</strong> " +
        orderNumber +
        "</p>" +
        "<ul>" +
        listeProduitsHtml +
        "</ul>" +
        "<p><strong>Votre part :</strong> " +
        totalDuCommercant.toLocaleString("fr-FR") +
        " F CFA (avant commission de la plateforme)</p>" +
        "<p>Connectez-vous à votre espace commerçant pour confirmer et préparer cette commande.</p>",
    }).catch(function (error) {
      console.error(
        "Erreur lors de l'envoi de l'email au commerçant :",
        error
      );
    });
  });

  res.status(201).json({ order: newOrder });
});


/* =========================================================
   PAIEMENT EN LIGNE — PAYTECH
   ========================================================= */

/*
 * Le frontend appelle cette route juste après avoir créé
 * une commande avec paymentMethod = "paytech". On demande
 * à PayTech un lien de paiement, et on le renvoie au
 * frontend qui redirige le client dessus.
 */
app.post(
  "/api/paiement/initier",
  async function (req, res) {
    const { orderNumber, montant, description } = req.body;

    if (!orderNumber || !montant) {
      return res.status(400).json({
        error:
          "orderNumber et montant sont obligatoires.",
      });
    }

    try {
      const paiement = await creerPaiementPaytech({
        itemName:
          description || "Commande " + orderNumber,
        montant,
        refCommande: orderNumber,
        customField: { orderNumber },
      });

      res.json({ redirectUrl: paiement.redirect_url });
    } catch (error) {
      console.error(
        "Erreur lors de la création du paiement PayTech :",
        error.message
      );

      res.status(500).json({ error: error.message });
    }
  }
);

/*
 * PayTech appelle cette route TOUT SEUL (le client ne la
 * voit jamais) dès qu'un paiement est confirmé ou annulé.
 * C'est ça qui remplace la saisie manuelle de référence.
 */
app.post(
  "/api/paiement/ipn",
  async function (req, res) {
    const estAuthentique = verifierIpnPaytech(req.body);

    if (!estAuthentique) {
      console.error(
        "IPN PayTech refusée : signature invalide.",
        req.body
      );

      return res
        .status(403)
        .send("Signature invalide.");
    }

    const { type_event, ref_command } = req.body;

    const db = await readDB();

    const order = db.orders.find(function (item) {
      return item.orderNumber === ref_command;
    });

    if (order) {
      if (type_event === "sale_complete") {
        order.paymentStatus = "Payé";
      } else if (type_event === "sale_canceled") {
        order.paymentStatus = "Annulé";
      }

      await writeDB(db);
    } else {
      console.error(
        "IPN PayTech reçue pour une commande inconnue :",
        ref_command
      );
    }

    res.status(200).send("IPN OK");
  }
);


app.get("/api/orders/:orderNumber", async function (req, res) {
  const db = await readDB();

  const order = db.orders.find(function (item) {
    return item.orderNumber === req.params.orderNumber;
  });

  if (!order) {
    return res
      .status(404)
      .json({ error: "Commande introuvable." });
  }

  res.json({ order });
});


app.put(
  "/api/orders/:orderNumber",
  requireAuth,
  async function (req, res) {
    const db = await readDB();

    const order = db.orders.find(function (item) {
      return item.orderNumber === req.params.orderNumber;
    });

    if (!order) {
      return res
        .status(404)
        .json({ error: "Commande introuvable." });
    }

    /*
     * Seul un commerçant concerné par au moins un des
     * produits de la commande (ou un admin) peut la
     * modifier.
     */
    const userShop = db.shops.find(function (shop) {
      return (
        shop.ownerId &&
        Number(shop.ownerId) === Number(req.user.id)
      );
    });

    const isConcernedMerchant =
      userShop &&
      order.products.some(function (product) {
        return (
          Number(product.shopId) === Number(userShop.id)
        );
      });

    if (!isConcernedMerchant && req.user.role !== "admin") {
      return res.status(403).json({
        error:
          "Vous ne pouvez pas modifier cette commande.",
      });
    }

    /*
     * On ne permet de modifier que le statut, jamais le
     * montant, les produits ou les infos client.
     */
    const allowedFields = ["status", "refundStatus"];

    const safeUpdates = {};

    allowedFields.forEach(function (field) {
      if (req.body[field] !== undefined) {
        safeUpdates[field] = req.body[field];
      }
    });

    /*
     * Si une commande DÉJÀ PAYÉE en ligne (PayTech) est
     * annulée, PayTech ne propose pas d'API de remboursement
     * automatique : il faut renvoyer l'argent nous-mêmes au
     * client (Orange Money/Wave) ou contacter le support
     * PayTech pour une carte bancaire. On marque donc la
     * commande "À rembourser" pour ne pas l'oublier.
     */
    const passeEnAnnulee =
      safeUpdates.status === "Annulée" &&
      order.status !== "Annulée";

    if (
      passeEnAnnulee &&
      order.paymentMethod === "paytech" &&
      order.paymentStatus === "Payé"
    ) {
      safeUpdates.refundStatus = "À rembourser";
    }

    const updatedOrder = { ...order, ...safeUpdates };

    db.orders = db.orders.map(function (item) {
      return item.orderNumber === req.params.orderNumber
        ? updatedOrder
        : item;
    });

    await writeDB(db);

    /*
     * Message personnalisé envoyé au client selon la
     * nouvelle étape de sa commande — plus clair qu'un
     * simple mot affiché tout seul.
     */
    const messagesParStatut = {
      "Confirmée":
        "Bonne nouvelle : votre commande a été confirmée par le vendeur ! Elle va bientôt être préparée.",
      "En préparation":
        "Votre commande est en cours de préparation. Elle sera bientôt expédiée.",
      "Expédiée":
        "Votre commande a été expédiée ! Elle est en route vers le livreur.",
      "En livraison":
        "Votre commande est en cours de livraison. Le livreur devrait vous contacter très bientôt.",
      "Livrée":
        "Votre commande a été livrée. Merci pour votre confiance, et à bientôt sur Mon Commerce Sénégal !",
      "Annulée":
        "Votre commande a malheureusement été annulée. Si vous aviez déjà payé, vous serez remboursé rapidement.",
    };

    /*
     * Si le statut a réellement changé, on prévient
     * le client par email (sans jamais bloquer la
     * réponse si l'envoi échoue).
     */
    if (
      safeUpdates.status &&
      safeUpdates.status !== order.status &&
      updatedOrder.customer &&
      updatedOrder.customer.email
    ) {
      const messagePersonnalise =
        messagesParStatut[safeUpdates.status] ||
        "Le statut de votre commande a été mis à jour.";

      sendEmail({
        to: updatedOrder.customer.email,
        subject:
          "Mise à jour de votre commande " +
          updatedOrder.orderNumber +
          " — Mon Commerce Sénégal",
        html:
          "<p>Bonjour " +
          updatedOrder.customer.name +
          ",</p>" +
          "<p style=\"font-size: 18px;\"><strong>" +
          safeUpdates.status +
          "</strong></p>" +
          "<p>" +
          messagePersonnalise +
          "</p>" +
          "<p>Numéro de commande : <strong>" +
          updatedOrder.orderNumber +
          "</strong></p>" +
          "<p>Merci de votre confiance !</p>",
      }).catch(function (error) {
        console.error(
          "Erreur lors de l'envoi de l'email de statut :",
          error
        );
      });
    }

    res.json({ order: updatedOrder });
  }
);


/* =========================================================
   AVIS CLIENTS
   ========================================================= */

app.get("/api/reviews", async function (req, res) {
  const db = await readDB();

  let reviews = db.reviews;

  if (req.query.productId) {
    reviews = reviews.filter(function (review) {
      return (
        Number(review.productId) ===
        Number(req.query.productId)
      );
    });
  }

  res.json({ reviews });
});


app.post("/api/reviews", requireAuth, async function (req, res) {
  const { productId, customerName, rating, comment } =
    req.body;

  /*
   * SÉCURITÉ : l'email vient du jeton de connexion,
   * jamais du corps de la requête, pour empêcher de
   * publier un avis au nom de quelqu'un d'autre.
   */
  const customerEmail = req.user.email;

  if (!productId || !rating) {
    return res.status(400).json({
      error:
        "Le produit et la note sont obligatoires.",
    });
  }

  const numericRating = Number(rating);

  if (
    Number.isNaN(numericRating) ||
    numericRating < 1 ||
    numericRating > 5
  ) {
    return res.status(400).json({
      error: "La note doit être comprise entre 1 et 5.",
    });
  }

  const db = await readDB();

  const productExists = db.products.some(function (product) {
    return Number(product.id) === Number(productId);
  });

  if (!productExists) {
    return res
      .status(404)
      .json({ error: "Produit introuvable." });
  }

  /*
   * Un client ne peut laisser qu'un seul avis par produit.
   */

  const alreadyReviewed = db.reviews.some(function (review) {
    return (
      Number(review.productId) === Number(productId) &&
      review.customerEmail &&
      customerEmail &&
      review.customerEmail.toLowerCase() ===
        String(customerEmail).toLowerCase()
    );
  });

  if (alreadyReviewed) {
    return res.status(409).json({
      error: "Vous avez déjà laissé un avis sur ce produit.",
    });
  }

  const newReview = {
    id: getNextId(db, "reviews"),
    productId: Number(productId),
    customerEmail: customerEmail || "",
    customerName: customerName || "Client",
    rating: numericRating,
    comment: comment || "",
    createdAt: new Date().toISOString(),
  };

  db.reviews.push(newReview);
  await writeDB(db);

  res.status(201).json({ review: newReview });
});


/* =========================================================
   FAVORIS
   ========================================================= */

app.get("/api/favorites", async function (req, res) {
  const db = await readDB();

  if (!req.query.email) {
    return res.status(400).json({
      error: "L'email est obligatoire.",
    });
  }

  const email = String(req.query.email).toLowerCase();

  const favorites = db.favorites.filter(function (favorite) {
    return (
      favorite.customerEmail &&
      favorite.customerEmail.toLowerCase() === email
    );
  });

  const favoriteProducts = favorites
    .map(function (favorite) {
      return db.products.find(function (product) {
        return (
          Number(product.id) ===
          Number(favorite.productId)
        );
      });
    })
    .filter(function (product) {
      return Boolean(product);
    });

  res.json({ products: favoriteProducts });
});


app.post("/api/favorites", requireAuth, async function (req, res) {
  const { productId } = req.body;
  const customerEmail = req.user.email;

  if (!customerEmail || !productId) {
    return res.status(400).json({
      error:
        "L'email et le produit sont obligatoires.",
    });
  }

  const db = await readDB();

  const alreadyExists = db.favorites.some(function (favorite) {
    return (
      favorite.customerEmail.toLowerCase() ===
        String(customerEmail).toLowerCase() &&
      Number(favorite.productId) === Number(productId)
    );
  });

  if (alreadyExists) {
    return res.status(200).json({ success: true });
  }

  db.favorites.push({
    id: getNextId(db, "favorites"),
    customerEmail,
    productId: Number(productId),
  });

  await writeDB(db);

  res.status(201).json({ success: true });
});


app.delete("/api/favorites", requireAuth, async function (req, res) {
  const { productId } = req.body;
  const customerEmail = req.user.email;

  if (!customerEmail || !productId) {
    return res.status(400).json({
      error:
        "L'email et le produit sont obligatoires.",
    });
  }

  const db = await readDB();

  db.favorites = db.favorites.filter(function (favorite) {
    return !(
      favorite.customerEmail.toLowerCase() ===
        String(customerEmail).toLowerCase() &&
      Number(favorite.productId) === Number(productId)
    );
  });

  await writeDB(db);

  res.json({ success: true });
});


/* =========================================================
   ADMINISTRATION (PLATEFORME)
   ========================================================= */

/*
 * Route spéciale pour devenir administrateur sur un
 * serveur en ligne (où on n'a pas accès au fichier
 * db.json directement). Protégée par une clé secrète
 * définie dans la variable d'environnement
 * ADMIN_SETUP_KEY sur Render — sans cette clé, personne
 * ne peut devenir admin.
 */
app.post("/api/admin/promote", requireAuth, async function (req, res) {
  const { setupKey } = req.body;

  const expectedKey = process.env.ADMIN_SETUP_KEY;

  if (!expectedKey) {
    return res.status(403).json({
      error:
        "La promotion admin n'est pas configurée sur ce serveur (ADMIN_SETUP_KEY manquante).",
    });
  }

  if (setupKey !== expectedKey) {
    return res.status(403).json({
      error: "Clé secrète incorrecte.",
    });
  }

  const db = await readDB();

  let updatedUser = null;

  db.users = db.users.map(function (user) {
    if (Number(user.id) !== Number(req.user.id)) {
      return user;
    }

    updatedUser = { ...user, role: "admin" };
    return updatedUser;
  });

  if (!updatedUser) {
    return res
      .status(404)
      .json({ error: "Compte introuvable." });
  }

  await writeDB(db);

  const { password: _removed, ...safeUser } = updatedUser;

  const token = createToken(updatedUser);

  res.json({ user: safeUser, token });
});


app.get("/api/admin/stats", requireAdmin, async function (req, res) {
  const db = await readDB();

  const totalOrders = db.orders.length;

  const totalRevenue = db.orders.reduce(
    function (sum, order) {
      return sum + (Number(order.total) || 0);
    },
    0
  );

  const totalCommission = db.orders.reduce(
    function (sum, order) {
      return sum + (Number(order.platformFee) || 0);
    },
    0
  );

  /*
   * =========================================================
   * CLASSEMENT DES BOUTIQUES
   * =========================================================
   *
   * Pour chaque boutique, on additionne le chiffre d'affaires
   * et le nombre de commandes qui la concernent (une commande
   * peut contenir des produits de plusieurs boutiques, donc
   * on regarde ligne par ligne dans chaque commande).
   */
  const statsParBoutique = {};

  db.orders.forEach(function (order) {
    const produitsParBoutique = {};

    (order.products || []).forEach(function (product) {
      const shopId = Number(product.shopId);

      if (!shopId) {
        return;
      }

      const prix = Number(product.price) || 0;
      const quantite = Number(product.quantity) || 0;

      produitsParBoutique[shopId] =
        (produitsParBoutique[shopId] || 0) +
        prix * quantite;
    });

    Object.keys(produitsParBoutique).forEach(function (
      shopId
    ) {
      if (!statsParBoutique[shopId]) {
        statsParBoutique[shopId] = {
          revenue: 0,
          orders: 0,
        };
      }

      statsParBoutique[shopId].revenue +=
        produitsParBoutique[shopId];
      statsParBoutique[shopId].orders += 1;
    });
  });

  const classementBoutiques = db.shops
    .map(function (shop) {
      const donnees = statsParBoutique[shop.id] || {
        revenue: 0,
        orders: 0,
      };

      return {
        shopId: shop.id,
        shopName: shop.name,
        city: shop.city || "",
        revenue: donnees.revenue,
        orders: donnees.orders,
      };
    })
    .sort(function (a, b) {
      return b.revenue - a.revenue;
    });

  res.json({
    totalOrders,
    totalRevenue,
    totalCommission,
    totalShops: db.shops.length,
    totalProducts: db.products.length,
    totalUsers: db.users.length,
    classementBoutiques,
    commissionRate:
      (db.settings && db.settings.commissionRate) || 0.1,
    orangeMoneyNumber:
      (db.settings && db.settings.orangeMoneyNumber) || "",
    waveNumber:
      (db.settings && db.settings.waveNumber) || "",
    livraison:
      (db.settings && db.settings.livraison) || [],
    livraisonParDefaut:
      (db.settings && db.settings.livraisonParDefaut) || {
        frais: 3000,
        delai: "3-5 jours",
      },
  });
});


/*
 * =========================================================
 * NETTOYAGE DES BOUTIQUES SANS PROPRIÉTAIRE
 * =========================================================
 *
 * Repère les boutiques dont le "ownerId" est vide OU ne
 * correspond à aucun compte existant (boutiques de test
 * créées à la main, ou dont le compte a été supprimé).
 */
function trouverBoutiquesOrphelines(db) {
  return db.shops.filter(function (shop) {
    if (!shop.ownerId) {
      return true;
    }

    const proprietaireExiste = db.users.some(function (
      user
    ) {
      return Number(user.id) === Number(shop.ownerId);
    });

    return !proprietaireExiste;
  });
}

app.get(
  "/api/admin/boutiques-orphelines",
  requireAdmin,
  async function (req, res) {
    const db = await readDB();

    const orphelines = trouverBoutiquesOrphelines(db);

    res.json({
      boutiques: orphelines.map(function (shop) {
        return { id: shop.id, name: shop.name };
      }),
    });
  }
);

app.delete(
  "/api/admin/boutiques-orphelines",
  requireAdmin,
  async function (req, res) {
    const db = await readDB();

    const orphelines = trouverBoutiquesOrphelines(db);
    const idsASupprimer = orphelines.map(function (shop) {
      return Number(shop.id);
    });

    db.shops = db.shops.filter(function (shop) {
      return !idsASupprimer.includes(Number(shop.id));
    });

    db.products = db.products.filter(function (product) {
      return !idsASupprimer.includes(
        Number(product.shopId)
      );
    });

    await writeDB(db);

    res.json({ supprimees: idsASupprimer.length });
  }
);


app.put("/api/admin/settings", requireAdmin, async function (req, res) {
  const {
    commissionRate,
    orangeMoneyNumber,
    waveNumber,
    livraison,
    livraisonParDefaut,
  } = req.body;

  const db = await readDB();

  const updatedSettings = { ...db.settings };

  if (commissionRate !== undefined) {
    const rate = Number(commissionRate);

    if (Number.isNaN(rate) || rate < 0 || rate > 1) {
      return res.status(400).json({
        error:
          "Le taux de commission doit être un nombre entre 0 et 1.",
      });
    }

    updatedSettings.commissionRate = rate;
  }

  if (orangeMoneyNumber !== undefined) {
    updatedSettings.orangeMoneyNumber = orangeMoneyNumber;
  }

  if (waveNumber !== undefined) {
    updatedSettings.waveNumber = waveNumber;
  }

  if (Array.isArray(livraison)) {
    updatedSettings.livraison = livraison.map(function (
      item
    ) {
      return {
        ville: String(item.ville || "").trim(),
        frais: Number(item.frais) || 0,
        delai: String(item.delai || "").trim(),
      };
    });
  }

  if (
    livraisonParDefaut &&
    typeof livraisonParDefaut === "object"
  ) {
    updatedSettings.livraisonParDefaut = {
      frais: Number(livraisonParDefaut.frais) || 0,
      delai: String(
        livraisonParDefaut.delai || ""
      ).trim(),
    };
  }

  db.settings = updatedSettings;
  await writeDB(db);

  res.json({ settings: db.settings });
});


/* =========================================================
   DÉMARRAGE DU SERVEUR
   ========================================================= */

app.listen(PORT, function () {
  console.log(
    "✅ Serveur Mon Commerce Sénégal lancé sur http://localhost:" +
      PORT
  );
});
