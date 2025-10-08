"use client";
import { useState } from "react";

export default function Page() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    const res = await fetch("/api/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setMsg("Merci ! Tu es sur la liste ✨");
      setEmail("");
    } else {
      setMsg(data?.error || "Oups, réessaie.");
    }
    setLoading(false);
  }

  const box: React.CSSProperties = {
    maxWidth: 480,
    width: "100%",
    padding: 24,
    border: "1px solid #e5e5e5",
    borderRadius: 12,
  };
  const inputS: React.CSSProperties = {
    flex: 1,
    padding: "12px 14px",
    border: "1px solid #d1d5db",
    borderRadius: 10,
    fontSize: 16,
  };
  const btnS: React.CSSProperties = {
    padding: "12px 16px",
    border: "1px solid #111",
    borderRadius: 10,
    background: "#111",
    color: "#fff",
    fontWeight: 600,
    cursor: "pointer",
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
        fontFamily:
          "-apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif",
      }}
    >
      <div style={box}>
        <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>Mon produit</h1>
        <p style={{ marginTop: 8, color: "#555" }}>
          Rejoins la waiting list pour être prévenue du lancement.
        </p>

        <form onSubmit={onSubmit} style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <input
            type="email"
            required
            placeholder="ton@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inputS}
          />
          <button style={btnS} disabled={loading}>
            {loading ? "…" : "Je m’inscris"}
          </button>
        </form>

        {msg && (
          <p
            style={{
              marginTop: 12,
              color: msg.startsWith("Merci") ? "#166534" : "#b91c1c",
              fontWeight: 600,
            }}
          >
            {msg}
          </p>
        )}

        <p style={{ marginTop: 8, fontSize: 12, color: "#6b7280" }}>
          Aucune pub. Désinscription à tout moment.
        </p>
      </div>
    </main>
  );
}
