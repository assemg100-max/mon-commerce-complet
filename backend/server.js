import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";

import { readDB, writeDB, getNextId } from "./db.js";
import { sendEmail } from "./mailer.js";

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


/* =========================================================
   AUTHENTIFICATION
   ========================================================= */

app.post("/api/auth/register", async function (req, res) {
  const { name, email, password, phone, role } =
    req.body;

  if (!name || !email || !password) {
    return res.status(400).json({
      error: "Nom, email et mot de passe sont obligatoires.",
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

  const newUser = {
    id: getNextId(db.users),
    name,
    email,
    password: passwordHash,
    phone: phone || "",
    role: role === "merchant" ? "merchant" : "client",
    shopId: null,
  };

  db.users.push(newUser);
  await writeDB(db);

  const { password: _removed, ...safeUser } = newUser;

  const token = createToken(newUser);

  res.status(201).json({ user: safeUser, token });
});


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

  const db = await readDB();

  /*
   * SÉCURITÉ : on utilise l'id du compte connecté
   * (issu du jeton), jamais une valeur envoyée par
   * le client, pour éviter qu'on crée une boutique
   * au nom de quelqu'un d'autre.
   */
  const ownerId = req.user.id;

  const newShop = {
    id: getNextId(db.shops),
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

  db.shops = db.shops.filter(function (item) {
    return Number(item.id) !== Number(req.params.id);
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
    id: getNextId(db.products),
    name,
    price: Number(price),
    shopId: Number(shopId),
    categoryId: categoryId || null,
    category: category || "",
    description: description || "",
    stock: Number(stock) || 0,
    image: image || "",
  };

  db.products.push(newProduct);
  await writeDB(db);

  res.status(201).json({ product: newProduct });
});


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
    paymentMethod,
    paymentReference,
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

  const allowedMethods = [
    "cod",
    "orange_money",
    "wave",
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

  const commissionRate =
    (db.settings && db.settings.commissionRate) || 0.1;

  const orderTotal = Number(total) || 0;
  const platformFee =
    Math.round(orderTotal * commissionRate);
  const merchantPayout = orderTotal - platformFee;

  const newOrder = {
    orderNumber,
    customer,
    products,
    total: orderTotal,
    status: "En attente",
    createdAt: new Date().toISOString(),
    commissionRate,
    platformFee,
    merchantPayout,
    paymentMethod: method,
    paymentReference: paymentReference || "",
    paymentStatus:
      method === "cod" ? "À encaisser à la livraison" : "À vérifier",
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

  res.status(201).json({ order: newOrder });
});


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
    const allowedFields = ["status"];

    const safeUpdates = {};

    allowedFields.forEach(function (field) {
      if (req.body[field] !== undefined) {
        safeUpdates[field] = req.body[field];
      }
    });

    const updatedOrder = { ...order, ...safeUpdates };

    db.orders = db.orders.map(function (item) {
      return item.orderNumber === req.params.orderNumber
        ? updatedOrder
        : item;
    });

    await writeDB(db);

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
          "<p>Le statut de votre commande <strong>" +
          updatedOrder.orderNumber +
          "</strong> a changé :</p>" +
          "<p style=\"font-size: 18px;\"><strong>" +
          safeUpdates.status +
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
    id: getNextId(db.reviews),
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
    id: getNextId(db.favorites),
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

  res.json({
    totalOrders,
    totalRevenue,
    totalCommission,
    totalShops: db.shops.length,
    totalProducts: db.products.length,
    totalUsers: db.users.length,
    commissionRate:
      (db.settings && db.settings.commissionRate) || 0.1,
    orangeMoneyNumber:
      (db.settings && db.settings.orangeMoneyNumber) || "",
    waveNumber:
      (db.settings && db.settings.waveNumber) || "",
  });
});


app.put("/api/admin/settings", requireAdmin, async function (req, res) {
  const {
    commissionRate,
    orangeMoneyNumber,
    waveNumber,
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
