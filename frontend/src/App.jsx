import { BrowserRouter, Routes, Route } from "react-router-dom";

import Layout from "./components/Layout";

import Home from "./pages/Home";
import Shops from "./pages/Shops";
import Shop from "./pages/Shop";
import Product from "./pages/Product";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import OrderConfirmation from "./pages/OrderConfirmation";

import CategoriesPage from "./pages/CategoriesPage";
import Category from "./pages/Category";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Account from "./pages/Account";
import Favorites from "./pages/Favorites";

import Admin from "./pages/Admin";

import MerchantDashboard from "./pages/merchant/MerchantDashboard";
import MerchantOrders from "./pages/merchant/MerchantOrders";
import MerchantProducts from "./pages/merchant/MerchantProducts";
import AddProduct from "./pages/merchant/AddProduct";
import EditProduct from "./pages/merchant/EditProduct";
import MerchantProfile from "./pages/merchant/MerchantProfile";
import CreateShop from "./pages/merchant/CreateShop";


function App() {
  return (
    <BrowserRouter>

      <Routes>

        <Route element={<Layout />}>

          {/* =========================
              ACCUEIL
          ========================= */}

          <Route
            path="/"
            element={<Home />}
          />


          {/* =========================
              BOUTIQUES
          ========================= */}

          <Route
            path="/boutiques"
            element={<Shops />}
          />

          <Route
            path="/boutique/:id"
            element={<Shop />}
          />


          {/* =========================
              PRODUITS
          ========================= */}

          <Route
            path="/produit/:id"
            element={<Product />}
          />


          {/* =========================
              CATÉGORIES
          ========================= */}

          <Route
            path="/categories"
            element={<CategoriesPage />}
          />

          <Route
            path="/categorie/:id"
            element={<Category />}
          />


          {/* =========================
              PANIER
          ========================= */}

          <Route
            path="/panier"
            element={<Cart />}
          />


          {/* =========================
              COMMANDE
          ========================= */}

          <Route
            path="/commande"
            element={<Checkout />}
          />

          <Route
            path="/commande/confirmation/:orderNumber"
            element={<OrderConfirmation />}
          />


          {/* =========================
              AUTHENTIFICATION
          ========================= */}

          <Route
            path="/connexion"
            element={<Login />}
          />

          <Route
            path="/inscription"
            element={<Register />}
          />

          <Route
            path="/compte"
            element={<Account />}
          />

          <Route
            path="/favoris"
            element={<Favorites />}
          />


          {/* =========================
              ADMINISTRATION
          ========================= */}

          <Route
            path="/admin"
            element={<Admin />}
          />


          {/* =========================
              CRÉATION DE BOUTIQUE
          ========================= */}

          <Route
            path="/creer-boutique"
            element={<CreateShop />}
          />


          {/* =========================
              ESPACE COMMERÇANT
          ========================= */}

          <Route
            path="/commercant"
            element={<MerchantDashboard />}
          />


          {/* =========================
              PROFIL / MA BOUTIQUE
          ========================= */}

          <Route
            path="/commercant/profil"
            element={<MerchantProfile />}
          />


          {/* =========================
              COMMANDES COMMERÇANT
          ========================= */}

          <Route
            path="/commercant/commandes"
            element={<MerchantOrders />}
          />


          {/* =========================
              PRODUITS COMMERÇANT
          ========================= */}

          <Route
            path="/commercant/produits"
            element={<MerchantProducts />}
          />


          {/* =========================
              AJOUTER UN PRODUIT
          ========================= */}

          <Route
            path="/commercant/produits/ajouter"
            element={<AddProduct />}
          />


          {/* =========================
              MODIFIER UN PRODUIT
          ========================= */}

          <Route
            path="/commercant/produits/modifier/:id"
            element={<EditProduct />}
          />

        </Route>

      </Routes>

    </BrowserRouter>
  );
}

export default App;