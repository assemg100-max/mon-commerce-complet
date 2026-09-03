import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";

import { readDB, writeDB, getNextId } from "./db.js";

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

const PORT = 4000;

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

app.get("/api", function (req, res) {
  res.json({
    message:
      "Bienvenue sur l'API de Mon Commerce Sénégal 🇸🇳",
  });
});


app.get("/api/payment-info", function (req, res) {
  const db = readDB();

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

app.post("/api/auth/register", function (req, res) {
  const { name, email, password, phone, role } =
    req.body;

  if (!name || !email || !password) {
    return res.status(400).json({
      error: "Nom, email et mot de passe sont obligatoires.",
    });
  }

  const db = readDB();

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
  writeDB(db);

  const { password: _removed, ...safeUser } = newUser;

  res.status(201).json({ user: safeUser });
});


app.post("/api/auth/login", function (req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      error: "Email et mot de passe sont obligatoires.",
    });
  }

  const db = readDB();

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

  res.json({ user: safeUser });
});


/* =========================================================
   BOUTIQUES
   ========================================================= */

app.get("/api/shops", function (req, res) {
  const db = readDB();

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


app.get("/api/shops/:id", function (req, res) {
  const db = readDB();

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


app.post("/api/shops", function (req, res) {
  const {
    name,
    city,
    category,
    description,
    ownerId,
    logo,
    phone,
  } = req.body;

  if (!name || !city || !category) {
    return res.status(400).json({
      error:
        "Le nom, la ville et la catégorie sont obligatoires.",
    });
  }

  const db = readDB();

  const newShop = {
    id: getNextId(db.shops),
    name,
    city,
    category,
    description: description || "",
    ownerId: ownerId || null,
    logo: logo || null,
    phone: phone || "",
  };

  db.shops.push(newShop);

  /*
   * Si la boutique appartient à un commerçant enregistré,
   * on relie son compte à cette boutique.
   */
  if (ownerId) {
    db.users = db.users.map(function (user) {
      if (Number(user.id) !== Number(ownerId)) {
        return user;
      }

      return { ...user, shopId: newShop.id, role: "merchant" };
    });
  }

  writeDB(db);

  res.status(201).json({ shop: newShop });
});


app.put("/api/shops/:id", function (req, res) {
  const db = readDB();

  let updatedShop = null;

  db.shops = db.shops.map(function (shop) {
    if (Number(shop.id) !== Number(req.params.id)) {
      return shop;
    }

    updatedShop = { ...shop, ...req.body, id: shop.id };

    return updatedShop;
  });

  if (!updatedShop) {
    return res
      .status(404)
      .json({ error: "Boutique introuvable." });
  }

  writeDB(db);

  res.json({ shop: updatedShop });
});


app.delete("/api/shops/:id", function (req, res) {
  const db = readDB();

  const before = db.shops.length;

  db.shops = db.shops.filter(function (shop) {
    return Number(shop.id) !== Number(req.params.id);
  });

  if (db.shops.length === before) {
    return res
      .status(404)
      .json({ error: "Boutique introuvable." });
  }

  writeDB(db);

  res.json({ success: true });
});


/* =========================================================
   PRODUITS
   ========================================================= */

app.get("/api/products", function (req, res) {
  const db = readDB();

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


app.get("/api/products/:id", function (req, res) {
  const db = readDB();

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


app.post("/api/products", function (req, res) {
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

  const db = readDB();

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
  writeDB(db);

  res.status(201).json({ product: newProduct });
});


app.put("/api/products/:id", function (req, res) {
  const db = readDB();

  let updatedProduct = null;

  db.products = db.products.map(function (product) {
    if (Number(product.id) !== Number(req.params.id)) {
      return product;
    }

    updatedProduct = {
      ...product,
      ...req.body,
      id: product.id,
    };

    return updatedProduct;
  });

  if (!updatedProduct) {
    return res
      .status(404)
      .json({ error: "Produit introuvable." });
  }

  writeDB(db);

  res.json({ product: updatedProduct });
});


app.delete("/api/products/:id", function (req, res) {
  const db = readDB();

  const before = db.products.length;

  db.products = db.products.filter(function (product) {
    return Number(product.id) !== Number(req.params.id);
  });

  if (db.products.length === before) {
    return res
      .status(404)
      .json({ error: "Produit introuvable." });
  }

  writeDB(db);

  res.json({ success: true });
});


/* =========================================================
   COMMANDES
   ========================================================= */

app.get("/api/orders", function (req, res) {
  const db = readDB();

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


app.post("/api/orders", function (req, res) {
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

  if (
    method !== "cod" &&
    (!paymentReference || !paymentReference.trim())
  ) {
    return res.status(400).json({
      error:
        "Merci d'indiquer la référence de votre transaction Mobile Money.",
    });
  }

  const db = readDB();

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
  writeDB(db);

  res.status(201).json({ order: newOrder });
});


app.get("/api/orders/:orderNumber", function (req, res) {
  const db = readDB();

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


app.put("/api/orders/:orderNumber", function (req, res) {
  const db = readDB();

  let updatedOrder = null;

  db.orders = db.orders.map(function (order) {
    if (order.orderNumber !== req.params.orderNumber) {
      return order;
    }

    updatedOrder = { ...order, ...req.body };

    return updatedOrder;
  });

  if (!updatedOrder) {
    return res
      .status(404)
      .json({ error: "Commande introuvable." });
  }

  writeDB(db);

  res.json({ order: updatedOrder });
});


/* =========================================================
   AVIS CLIENTS
   ========================================================= */

app.get("/api/reviews", function (req, res) {
  const db = readDB();

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


app.post("/api/reviews", function (req, res) {
  const {
    productId,
    customerEmail,
    customerName,
    rating,
    comment,
  } = req.body;

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

  const db = readDB();

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
  writeDB(db);

  res.status(201).json({ review: newReview });
});


/* =========================================================
   FAVORIS
   ========================================================= */

app.get("/api/favorites", function (req, res) {
  const db = readDB();

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


app.post("/api/favorites", function (req, res) {
  const { customerEmail, productId } = req.body;

  if (!customerEmail || !productId) {
    return res.status(400).json({
      error:
        "L'email et le produit sont obligatoires.",
    });
  }

  const db = readDB();

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

  writeDB(db);

  res.status(201).json({ success: true });
});


app.delete("/api/favorites", function (req, res) {
  const { customerEmail, productId } = req.body;

  if (!customerEmail || !productId) {
    return res.status(400).json({
      error:
        "L'email et le produit sont obligatoires.",
    });
  }

  const db = readDB();

  db.favorites = db.favorites.filter(function (favorite) {
    return !(
      favorite.customerEmail.toLowerCase() ===
        String(customerEmail).toLowerCase() &&
      Number(favorite.productId) === Number(productId)
    );
  });

  writeDB(db);

  res.json({ success: true });
});


/* =========================================================
   ADMINISTRATION (PLATEFORME)
   ========================================================= */

app.get("/api/admin/stats", function (req, res) {
  const db = readDB();

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


app.put("/api/admin/settings", function (req, res) {
  const {
    commissionRate,
    orangeMoneyNumber,
    waveNumber,
  } = req.body;

  const db = readDB();

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
  writeDB(db);

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
