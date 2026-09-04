import { useState } from "react";
import { useNavigate } from "react-router-dom";

const API_URL = "https://mon-commerce-backend.onrender.com/api";

function BecomeAdmin() {
  const navigate = useNavigate();

  const [setupKey, setSetupKey] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");

    const savedUser = localStorage.getItem(
      "mon-commerce-current-user"
    );

    const token = localStorage.getItem(
      "mon-commerce-token"
    );

    if (!savedUser || !token) {
      setError(
        "Connecte-toi d'abord à ton compte normal, puis reviens ici."
      );
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        API_URL + "/admin/promote",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + token,
          },
          body: JSON.stringify({ setupKey }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Une erreur est survenue."
        );
      }

      localStorage.setItem(
        "mon-commerce-current-user",
        JSON.stringify(data.user)
      );

      localStorage.setItem(
        "mon-commerce-token",
        data.token
      );

      window.dispatchEvent(new Event("userUpdated"));

      alert(
        "Bravo, ton compte est maintenant administrateur !"
      );

      navigate("/admin");
    } catch (apiError) {
      setError(apiError.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "70vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 20px",
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          maxWidth: "380px",
          width: "100%",
          background: "white",
          border: "1px solid #e8ddc9",
          borderRadius: "14px",
          padding: "28px",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        <h1 style={{ fontSize: "20px", margin: 0 }}>
          Devenir administrateur
        </h1>

        <p
          style={{
            fontSize: "14px",
            color: "#4a5468",
            margin: 0,
          }}
        >
          Connecte-toi d'abord à ton compte normal. Entre
          ensuite la clé secrète configurée sur Render
          (variable ADMIN_SETUP_KEY).
        </p>

        {error && (
          <p style={{ color: "#b42318", fontSize: "14px" }}>
            ⚠️ {error}
          </p>
        )}

        <input
          type="password"
          placeholder="Clé secrète"
          value={setupKey}
          onChange={function (event) {
            setSetupKey(event.target.value);
          }}
          style={{
            padding: "10px 12px",
            border: "1px solid #e8ddc9",
            borderRadius: "8px",
          }}
        />

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: "10px",
            border: "none",
            borderRadius: "8px",
            background: "#e8890c",
            color: "white",
            fontWeight: "600",
          }}
        >
          {loading ? "Vérification..." : "Valider"}
        </button>
      </form>
    </main>
  );
}

export default BecomeAdmin;
