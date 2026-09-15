import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { getAdminStats, updateAdminSettings } from "../data/api";

import "./Admin.css";

function Admin() {
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rateInput, setRateInput] = useState("10");
  const [saving, setSaving] = useState(false);

  const [villes, setVilles] = useState([]);
  const [nouvelleVille, setNouvelleVille] = useState({
    ville: "",
    frais: "",
    delai: "",
  });
  const [parDefaut, setParDefaut] = useState({
    frais: "",
    delai: "",
  });
  const [savingLivraison, setSavingLivraison] =
    useState(false);

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
        setVilles(data.livraison || []);
        setParDefaut({
          frais: String(
            (data.livraisonParDefaut &&
              data.livraisonParDefaut.frais) ||
              ""
          ),
          delai:
            (data.livraisonParDefaut &&
              data.livraisonParDefaut.delai) ||
            "",
        });
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

  function handleAjouterVille(event) {
    event.preventDefault();

    if (
      !nouvelleVille.ville.trim() ||
      !nouvelleVille.frais ||
      !nouvelleVille.delai.trim()
    ) {
      alert(
        "Renseigne la ville, les frais et le délai."
      );
      return;
    }

    const nouvellesVilles = [
      ...villes,
      {
        ville: nouvelleVille.ville.trim(),
        frais: Number(nouvelleVille.frais),
        delai: nouvelleVille.delai.trim(),
      },
    ];

    setVilles(nouvellesVilles);
    setNouvelleVille({ ville: "", frais: "", delai: "" });

    enregistrerLivraison(nouvellesVilles);
  }

  function handleSupprimerVille(index) {
    const nouvellesVilles = villes.filter(function (
      item,
      i
    ) {
      return i !== index;
    });

    setVilles(nouvellesVilles);
    enregistrerLivraison(nouvellesVilles);
  }

  function enregistrerLivraison(nouvellesVilles) {
    setSavingLivraison(true);

    updateAdminSettings({
      livraison: nouvellesVilles,
    })
      .catch(function (error) {
        alert(error.message);
      })
      .finally(function () {
        setSavingLivraison(false);
      });
  }

  function handleSaveParDefaut(event) {
    event.preventDefault();

    setSavingLivraison(true);

    updateAdminSettings({
      livraisonParDefaut: {
        frais: Number(parDefaut.frais) || 0,
        delai: parDefaut.delai.trim(),
      },
    })
      .catch(function (error) {
        alert(error.message);
      })
      .finally(function () {
        setSavingLivraison(false);
      });
  }


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

            <button type="submit" disabled={saving}>
              {saving
                ? "Enregistrement..."
                : "Mettre à jour"}
            </button>

          </form>

        </section>

        <section className="admin-settings-card">

          <h2>Livraison : frais et délais par ville</h2>

          <p>
            Ces frais s'ajoutent automatiquement au total
            de la commande selon la ville indiquée par le
            client. Une ville non listée utilise le tarif
            par défaut.
          </p>

          <div className="admin-livraison-list">

            {villes.map(function (item, index) {
              return (
                <div
                  className="admin-livraison-row"
                  key={index}
                >
                  <span>{item.ville}</span>
                  <span>
                    {Number(item.frais).toLocaleString(
                      "fr-FR"
                    )}{" "}
                    F CFA
                  </span>
                  <span>{item.delai}</span>
                  <button
                    type="button"
                    onClick={function () {
                      handleSupprimerVille(index);
                    }}
                  >
                    Supprimer
                  </button>
                </div>
              );
            })}

          </div>

          <form
            className="admin-livraison-form"
            onSubmit={handleAjouterVille}
          >

            <input
              type="text"
              placeholder="Ville (ex : Kaolack)"
              value={nouvelleVille.ville}
              onChange={function (event) {
                setNouvelleVille(function (previous) {
                  return {
                    ...previous,
                    ville: event.target.value,
                  };
                });
              }}
            />

            <input
              type="number"
              min="0"
              placeholder="Frais (F CFA)"
              value={nouvelleVille.frais}
              onChange={function (event) {
                setNouvelleVille(function (previous) {
                  return {
                    ...previous,
                    frais: event.target.value,
                  };
                });
              }}
            />

            <input
              type="text"
              placeholder="Délai (ex : 2-3 jours)"
              value={nouvelleVille.delai}
              onChange={function (event) {
                setNouvelleVille(function (previous) {
                  return {
                    ...previous,
                    delai: event.target.value,
                  };
                });
              }}
            />

            <button type="submit" disabled={savingLivraison}>
              Ajouter
            </button>

          </form>

          <h3>Tarif par défaut (autres villes)</h3>

          <form
            className="admin-livraison-form"
            onSubmit={handleSaveParDefaut}
          >

            <input
              type="number"
              min="0"
              placeholder="Frais (F CFA)"
              value={parDefaut.frais}
              onChange={function (event) {
                setParDefaut(function (previous) {
                  return {
                    ...previous,
                    frais: event.target.value,
                  };
                });
              }}
            />

            <input
              type="text"
              placeholder="Délai (ex : 3-5 jours)"
              value={parDefaut.delai}
              onChange={function (event) {
                setParDefaut(function (previous) {
                  return {
                    ...previous,
                    delai: event.target.value,
                  };
                });
              }}
            />

            <button type="submit" disabled={savingLivraison}>
              Enregistrer
            </button>

          </form>

        </section>

      </div>
    </main>
  );
}

export default Admin;
