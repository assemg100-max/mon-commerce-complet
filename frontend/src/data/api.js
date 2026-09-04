/*
 * =========================================================
 * CLIENT API — MON COMMERCE SÉNÉGAL
 * =========================================================
 *
 * Ce fichier centralise tous les appels vers le backend
 * (le serveur Node/Express que tu lances séparément avec
 * `npm run dev` dans le dossier mon-commerce-backend).
 *
 * Adresse du serveur backend en local :
 */
const API_URL = "https://mon-commerce-backend.onrender.com/api";


/*
 * Fonction générique pour appeler l'API et gérer
 * les erreurs de façon centralisée.
 */
const TOKEN_KEY = "mon-commerce-token";

function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY) || null;
}

function storeToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  }
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function apiRequest(path, options = {}) {
  let response;

  const token = getStoredToken();

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = "Bearer " + token;
  }

  try {
    response = await fetch(API_URL + path, {
      ...options,
      headers,
    });
  } catch (networkError) {
    throw new Error(
      "Impossible de contacter le serveur. Vérifie que le backend tourne bien (npm run dev dans mon-commerce-backend)."
    );
  }

  const data = await response.json().catch(function () {
    return {};
  });

  if (!response.ok) {
    throw new Error(
      data.error || "Une erreur est survenue."
    );
  }

  return data;
}


/* =========================================================
   AUTHENTIFICATION
   ========================================================= */

export function registerUser(userData) {
  return apiRequest("/auth/register", {
    method: "POST",
    body: JSON.stringify(userData),
  }).then(function (data) {
    storeToken(data.token);
    return data.user;
  });
}

export function loginUser(email, password) {
  return apiRequest("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  }).then(function (data) {
    storeToken(data.token);
    return data.user;
  });
}


/* =========================================================
   BOUTIQUES
   ========================================================= */

export function getShops() {
  return apiRequest("/shops").then(function (data) {
    return data.shops;
  });
}

export function getShopById(id) {
  return apiRequest("/shops/" + id).then(function (data) {
    return data.shop;
  });
}

export function getShopByOwner(user) {
  if (!user) {
    return Promise.resolve(null);
  }

  return getShops().then(function (allShops) {
    if (user.shopId) {
      const shopById = allShops.find(function (shop) {
        return Number(shop.id) === Number(user.shopId);
      });

      if (shopById) {
        return shopById;
      }
    }

    const ownerId = user.id || user.email;

    if (!ownerId) {
      return null;
    }

    return (
      allShops.find(function (shop) {
        return String(shop.ownerId) === String(ownerId);
      }) || null
    );
  });
}

export function createShop(shopData) {
  return apiRequest("/shops", {
    method: "POST",
    body: JSON.stringify(shopData),
  }).then(function (data) {
    storeToken(data.token);
    return data.shop;
  });
}

export function updateShop(id, updates) {
  return apiRequest("/shops/" + id, {
    method: "PUT",
    body: JSON.stringify(updates),
  }).then(function (data) {
    return data.shop;
  });
}


/* =========================================================
   PRODUITS
   ========================================================= */

export function getProducts(shopId) {
  const query = shopId ? "?shopId=" + shopId : "";

  return apiRequest("/products" + query).then(
    function (data) {
      return data.products;
    }
  );
}

export function getProductById(id) {
  return apiRequest("/products/" + id).then(
    function (data) {
      return data.product;
    }
  );
}

export function createProduct(productData) {
  return apiRequest("/products", {
    method: "POST",
    body: JSON.stringify(productData),
  }).then(function (data) {
    return data.product;
  });
}

export function updateProduct(id, updates) {
  return apiRequest("/products/" + id, {
    method: "PUT",
    body: JSON.stringify(updates),
  }).then(function (data) {
    return data.product;
  });
}

export function deleteProduct(id) {
  return apiRequest("/products/" + id, {
    method: "DELETE",
  });
}


/* =========================================================
   COMMANDES
   ========================================================= */

export function getOrderByNumber(orderNumber) {
  return apiRequest("/orders/" + orderNumber).then(
    function (data) {
      return data.order;
    }
  );
}

export function getPaymentInfo() {
  return apiRequest("/payment-info");
}

export function createOrder(orderData) {
  return apiRequest("/orders", {
    method: "POST",
    body: JSON.stringify(orderData),
  }).then(function (data) {
    return data.order;
  });
}

export function getOrdersByEmail(email) {
  return apiRequest(
    "/orders?email=" + encodeURIComponent(email)
  ).then(function (data) {
    return data.orders;
  });
}

export function getOrdersByShop(shopId) {
  return apiRequest("/orders?shopId=" + shopId).then(
    function (data) {
      return data.orders;
    }
  );
}

export function updateOrderStatus(orderNumber, status) {
  return apiRequest("/orders/" + orderNumber, {
    method: "PUT",
    body: JSON.stringify({ status }),
  }).then(function (data) {
    return data.order;
  });
}


/* =========================================================
   FILTRES PRODUITS
   ========================================================= */

export function searchProducts(filters) {
  const params = new URLSearchParams();

  if (filters.shopId) params.set("shopId", filters.shopId);
  if (filters.category) params.set("category", filters.category);
  if (filters.minPrice) params.set("minPrice", filters.minPrice);
  if (filters.maxPrice) params.set("maxPrice", filters.maxPrice);
  if (filters.minRating) params.set("minRating", filters.minRating);
  if (filters.q) params.set("q", filters.q);

  const query = params.toString();

  return apiRequest(
    "/products" + (query ? "?" + query : "")
  ).then(function (data) {
    return data.products;
  });
}


/* =========================================================
   AVIS CLIENTS
   ========================================================= */

export function getReviews(productId) {
  return apiRequest(
    "/reviews?productId=" + productId
  ).then(function (data) {
    return data.reviews;
  });
}

export function createReview(reviewData) {
  return apiRequest("/reviews", {
    method: "POST",
    body: JSON.stringify(reviewData),
  }).then(function (data) {
    return data.review;
  });
}


/* =========================================================
   FAVORIS
   ========================================================= */

export function getFavorites(email) {
  return apiRequest(
    "/favorites?email=" + encodeURIComponent(email)
  ).then(function (data) {
    return data.products;
  });
}

export function addFavorite(customerEmail, productId) {
  return apiRequest("/favorites", {
    method: "POST",
    body: JSON.stringify({ customerEmail, productId }),
  });
}

export function removeFavorite(customerEmail, productId) {
  return apiRequest("/favorites", {
    method: "DELETE",
    body: JSON.stringify({ customerEmail, productId }),
  });
}


/* =========================================================
   ADMINISTRATION (PLATEFORME)
   ========================================================= */

export function getAdminStats() {
  return apiRequest("/admin/stats");
}

export function updateAdminSettings(settings) {
  return apiRequest("/admin/settings", {
    method: "PUT",
    body: JSON.stringify(settings),
  }).then(function (data) {
    return data.settings;
  });
}

export function updateCommissionRate(commissionRate) {
  return updateAdminSettings({ commissionRate });
}
