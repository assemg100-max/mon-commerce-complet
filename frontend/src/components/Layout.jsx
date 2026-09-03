import { Outlet } from "react-router-dom";
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

          <span>
            © 2026 Mon Commerce Sénégal
          </span>
        </div>
      </footer>
    </div>
  );
}

export default Layout;