import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { getAdminStats, updateAdminSettings } from "../data/api";

import "./Admin.css";

function Admin() {
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rateInput, setRateInput] = useState("10");
  const [orangeMoneyNumber, setOrangeMoneyNumber] =
    useState("");
  const [waveNumber, setWaveNumber] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(function () {
    const savedUser = localStorage.getItem(
      "mon-commerce-current-user"
    );

    if (!savedUser) {
      navigate("/connexion");
      return;
    }

    let currentUser;

    try {
      currentUser = JSON.parse(savedUser);
    } catch (error) {
      navigate("/connexion");
      return;
    }

    if (currentUser.role !== "admin") {
      navigate("/");
      return;
    }

    loadStats();
  }, [navigate]);

  function loadStats() {
    setLoading(true);

    getAdminStats()
      .then(function (data) {
        setStats(data);
        setRateInput(
          String(Math.round(data.commissionRate * 100))
        );
        setOrangeMoneyNumber(
          data.orangeMoneyNumber || ""
        );
        setWaveNumber(data.waveNumber || "");
      })
      .catch(function (error) {
        console.error(
          "Erreur lors du chargement des statistiques :",
          error
        );
      })
      .finally(function () {
        setLoading(false);
      });
  }

  function handleSaveRate(event) {
    event.preventDefault();

    const percent = Number(rateInput);

    if (
      Number.isNaN(percent) ||
      percent < 0 ||
      percent > 100
    ) {
      alert(
        "Le taux de commission doit être entre 0 et 100."
      );
      return;
    }

    setSaving(true);

    updateAdminSettings({
      commissionRate: percent / 100,
      orangeMoneyNumber: orangeMoneyNumber.trim(),
      waveNumber: waveNumber.trim(),
    })
      .then(function () {
        loadStats();
      })
      .catch(function (error) {
        alert(error.message);
      })
      .finally(function () {
        setSaving(false);
      });
  }

  if (loading || !stats) {
    return (
      <main className="admin-page">
        <div className="admin-container">
          <p>Chargement des statistiques...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="admin-page">
      <div className="admin-container">

        <div className="admin-title">
          <h1>Tableau de bord — Plateforme</h1>
          <p>
            Vue d'ensemble de Mon Commerce Sénégal, visible
            uniquement par toi.
          </p>
        </div>

        <div className="admin-stats-grid">

          <div className="admin-stat-card admin-stat-highlight">
            <span>Commission gagnée</span>
            <strong>
              {stats.totalCommission.toLocaleString(
                "fr-FR"
              )}{" "}
              F CFA
            </strong>
          </div>

          <div className="admin-stat-card">
            <span>Chiffre d'affaires total</span>
            <strong>
              {stats.totalRevenue.toLocaleString(
                "fr-FR"
              )}{" "}
              F CFA
            </strong>
          </div>

          <div className="admin-stat-card">
            <span>Commandes</span>
            <strong>{stats.totalOrders}</strong>
          </div>

          <div className="admin-stat-card">
            <span>Boutiques</span>
            <strong>{stats.totalShops}</strong>
          </div>

          <div className="admin-stat-card">
            <span>Produits</span>
            <strong>{stats.totalProducts}</strong>
          </div>

          <div className="admin-stat-card">
            <span>Comptes créés</span>
            <strong>{stats.totalUsers}</strong>
          </div>

        </div>

        <section className="admin-settings-card">

          <h2>Taux de commission</h2>

          <p>
            Ce pourcentage est prélevé automatiquement sur
            chaque nouvelle commande. Il ne s'applique pas
            aux commandes déjà passées.
          </p>

          <form onSubmit={handleSaveRate}>

            <div className="admin-rate-input">
              <input
                type="number"
                min="0"
                max="100"
                value={rateInput}
                onChange={function (event) {
                  setRateInput(event.target.value);
                }}
              />
              <span>%</span>
            </div>

            <div className="admin-payment-numbers">

              <div>
                <label>Numéro Orange Money</label>
                <input
                  type="text"
                  value={orangeMoneyNumber}
                  onChange={function (event) {
                    setOrangeMoneyNumber(
                      event.target.value
                    );
                  }}
                  placeholder="Ex : 77 123 45 67"
                />
              </div>

              <div>
                <label>Numéro Wave</label>
                <input
                  type="text"
                  value={waveNumber}
                  onChange={function (event) {
                    setWaveNumber(event.target.value);
                  }}
                  placeholder="Ex : 70 123 45 67"
                />
              </div>

            </div>

            <button type="submit" disabled={saving}>
              {saving
                ? "Enregistrement..."
                : "Mettre à jour"}
            </button>

          </form>

        </section>

      </div>
    </main>
  );
}

export default Admin;
