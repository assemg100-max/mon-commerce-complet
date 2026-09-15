import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import {
  getShopByOwner,
  creerCodePromo,
  listerCodesPromo,
  changerActivationCodePromo,
  supprimerCodePromo,
} from "../../data/api";

import "./MerchantCoupons.css";

function MerchantCoupons() {
  const navigate = useNavigate();

  const [shopId, setShopId] = useState(null);
  const [coupons, setCoupons] = useState([]);
  const [chargement, setChargement] = useState(true);

  const [form, setForm] = useState({
    code: "",
    type: "percent",
    value: "",
  });

  const [erreur, setErreur] = useState("");

  useEffect(() => {
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

    if (currentUser.role !== "merchant") {
      navigate("/");
      return;
    }

    getShopByOwner(currentUser).then(function (shop) {
      if (!shop) {
        setChargement(false);
        return;
      }

      setShopId(shop.id);
      chargerCoupons(shop.id);
    });
  }, [navigate]);

  function chargerCoupons(id) {
    listerCodesPromo(id)
      .then(setCoupons)
      .catch(function (error) {
        console.error(
          "Erreur chargement codes promo :",
          error
        );
      })
      .finally(function () {
        setChargement(false);
      });
  }

  function handleChange(event) {
    const { name, value } = event.target;

    setForm(function (previous) {
      return { ...previous, [name]: value };
    });
  }

  function handleSubmit(event) {
    event.preventDefault();

    setErreur("");

    if (!form.code.trim() || !form.value) {
      setErreur(
        "Le code et la valeur de réduction sont obligatoires."
      );
      return;
    }

    creerCodePromo({
      code: form.code.trim(),
      type: form.type,
      value: Number(form.value),
      shopId,
    })
      .then(function () {
        setForm({ code: "", type: "percent", value: "" });
        chargerCoupons(shopId);
      })
      .catch(function (error) {
        setErreur(
          error.message ||
            "Impossible de créer ce code promo."
        );
      });
  }

  function toggleActive(coupon) {
    changerActivationCodePromo(
      coupon.id,
      !coupon.active
    ).then(function () {
      chargerCoupons(shopId);
    });
  }

  function handleDelete(coupon) {
    const confirme = window.confirm(
      "Supprimer définitivement le code \"" +
        coupon.code +
        "\" ?"
    );

    if (!confirme) {
      return;
    }

    supprimerCodePromo(coupon.id).then(function () {
      chargerCoupons(shopId);
    });
  }

  if (chargement) {
    return (
      <main className="merchant-coupons-page">
        <div className="merchant-coupons-container">
          <p>Chargement...</p>
        </div>
      </main>
    );
  }

  if (!shopId) {
    return (
      <main className="merchant-coupons-page">
        <div className="merchant-coupons-container">
          <p>
            Vous devez d'abord{" "}
            <Link to="/creer-boutique">
              créer votre boutique
            </Link>{" "}
            avant de configurer des codes promo.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="merchant-coupons-page">
      <div className="merchant-coupons-container">

        <h1>Codes promo</h1>

        <p className="merchant-coupons-intro">
          Créez des codes de réduction que vos clients
          pourront utiliser dans leur panier. Ils ne
          s'appliquent qu'à votre boutique.
        </p>

        <form
          className="merchant-coupon-form"
          onSubmit={handleSubmit}
        >

          <div>
            <label htmlFor="code">Code</label>
            <input
              id="code"
              name="code"
              type="text"
              placeholder="Ex : BIENVENUE10"
              value={form.code}
              onChange={handleChange}
            />
          </div>

          <div>
            <label htmlFor="type">Type de réduction</label>
            <select
              id="type"
              name="type"
              value={form.type}
              onChange={handleChange}
            >
              <option value="percent">Pourcentage (%)</option>
              <option value="fixed">Montant fixe (F CFA)</option>
            </select>
          </div>

          <div>
            <label htmlFor="value">
              {form.type === "percent"
                ? "Pourcentage"
                : "Montant (F CFA)"}
            </label>
            <input
              id="value"
              name="value"
              type="number"
              min="1"
              max={
                form.type === "percent" ? "100" : undefined
              }
              value={form.value}
              onChange={handleChange}
            />
          </div>

          <button type="submit">Créer le code</button>

        </form>

        {erreur && (
          <p className="merchant-coupon-error">{erreur}</p>
        )}

        <div className="merchant-coupons-list">

          {coupons.length === 0 && (
            <p>Aucun code promo pour l'instant.</p>
          )}

          {coupons.map(function (coupon) {
            return (
              <div
                className={
                  "merchant-coupon-card" +
                  (coupon.active ? "" : " inactive")
                }
                key={coupon.id}
              >

                <div>
                  <strong>{coupon.code}</strong>
                  <span>
                    {coupon.type === "percent"
                      ? "-" + coupon.value + "%"
                      : "-" +
                        coupon.value.toLocaleString(
                          "fr-FR"
                        ) +
                        " F CFA"}
                  </span>
                  <span className="merchant-coupon-status">
                    {coupon.active ? "Actif" : "Désactivé"}
                  </span>
                </div>

                <div className="merchant-coupon-actions">
                  <button
                    type="button"
                    onClick={function () {
                      toggleActive(coupon);
                    }}
                  >
                    {coupon.active
                      ? "Désactiver"
                      : "Activer"}
                  </button>

                  <button
                    type="button"
                    className="delete"
                    onClick={function () {
                      handleDelete(coupon);
                    }}
                  >
                    Supprimer
                  </button>
                </div>

              </div>
            );
          })}

        </div>

      </div>
    </main>
  );
}

export default MerchantCoupons;
