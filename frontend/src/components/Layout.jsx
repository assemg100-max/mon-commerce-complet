import { Outlet, Link } from "react-router-dom";
import Header from "./Header";

import "./Layout.css";

function Layout() {
  return (
    <div className="app-layout">
      <Header />

      <main className="app-main">
        <Outlet />
      </main>

      <footer className="site-footer">
        <div className="site-footer-container">
          <strong>🇸🇳 Mon Commerce Sénégal</strong>

          <p>
            La plateforme sénégalaise pour découvrir,
            vendre et acheter localement.
          </p>

          <nav className="site-footer-links">
            <Link to="/a-propos">À propos</Link>
            <Link to="/conditions">
              Conditions d'utilisation
            </Link>
            <Link to="/confidentialite">
              Confidentialité
            </Link>
            <Link to="/contact">Contact</Link>
          </nav>

          <span>
            © 2026 Mon Commerce Sénégal
          </span>
        </div>
      </footer>
    </div>
  );
}

export default Layout;