"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState } from "react";

const WAITLIST_STORAGE_KEY = "studio.waitlist.optin";

type GenerationState = "idle" | "loading" | "complete" | "error";
type WaitlistState = "idle" | "loading" | "success" | "error";

interface StatusMessage {
  type: "info" | "error" | "success";
  text: string;
}

export default function Page() {
  const [registered, setRegistered] = useState(false);
  const [email, setEmail] = useState("");
  const [waitlistStatus, setWaitlistStatus] =
    useState<WaitlistState>("idle");
  const [waitlistFeedback, setWaitlistFeedback] =
    useState<StatusMessage | null>(null);
  const [prompt, setPrompt] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<GenerationState>("idle");
  const [statusMessage, setStatusMessage] = useState<StatusMessage | null>(null);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(WAITLIST_STORAGE_KEY);
      if (stored === "true") {
        setRegistered(true);
        setWaitlistStatus("success");
        setWaitlistFeedback({
          type: "success",
          text: "Tu es déjà inscrit·e, le studio est accessible.",
        });
      }
    } catch {
      // ignore read errors (private mode etc.)
    }
  }, []);

  useEffect(() => {
    if (status === "loading") {
      setStatusMessage({
        type: "info",
        text: "La génération est en cours…",
      });
    } else if (status === "complete") {
      setStatusMessage({
        type: "success",
        text: "Image générée avec succès.",
      });
    }
  }, [status]);

  const previewUrl = useMemo(() => {
    if (!file) return null;
    const url = URL.createObjectURL(file);
    return url;
  }, [file]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleWaitlistSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    if (registered) return;

    const trimmed = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      setWaitlistStatus("error");
      setWaitlistFeedback({
        type: "error",
        text: "Entre une adresse email valide pour continuer.",
      });
      return;
    }

    setWaitlistStatus("loading");
    setWaitlistFeedback({
      type: "info",
      text: "Inscription en cours…",
    });

    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || "Inscription impossible.");
      }

      setRegistered(true);
      setWaitlistStatus("success");
      setWaitlistFeedback({
        type: "success",
        text: "Merci ! Le studio est déverrouillé 🎉",
      });
      setEmail("");
      try {
        window.localStorage.setItem(WAITLIST_STORAGE_KEY, "true");
      } catch {
        // ignore storage failures
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Oups, l'inscription a échoué.";
      setWaitlistStatus("error");
      setWaitlistFeedback({ type: "error", text: message });
    }
  };

  const handleSignOut = () => {
    setRegistered(false);
    setWaitlistStatus("idle");
    setWaitlistFeedback(null);
    setEmail("");
    setFile(null);
    setPrompt("");
    setGeneratedUrl(null);
    setStatus("idle");
    setStatusMessage(null);
    try {
      window.localStorage.removeItem(WAITLIST_STORAGE_KEY);
    } catch {
      // ignore storage failures
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0] ?? null;
    setFile(nextFile);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!registered) {
      setStatus("error");
      setStatusMessage({
        type: "error",
        text: "Inscris-toi à la waiting list pour activer la génération.",
      });
      return;
    }
    if (!file) {
      setStatus("error");
      setStatusMessage({
        type: "error",
        text: "Ajoute une image avant de lancer la génération.",
      });
      return;
    }
    if (!prompt.trim()) {
      setStatus("error");
      setStatusMessage({
        type: "error",
        text: "Décris ta transformation avec un prompt.",
      });
      return;
    }

    setStatus("loading");
    setGeneratedUrl(null);

    const formData = new FormData();
    formData.append("prompt", prompt);
    formData.append("image", file);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        body: formData,
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.error || "La génération a échoué.");
      }

      setGeneratedUrl(payload?.imageUrl ?? null);
      setStatus("complete");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Une erreur inattendue est survenue.";
      setStatus("error");
      setStatusMessage({ type: "error", text: message });
    }
  };

  return (
    <main style={styles.page}>
      <div style={styles.stack}>
        <section style={styles.waitlistCard}>
          <p style={styles.pill}>Accès anticipé</p>
          <h2 style={styles.waitlistTitle}>Rejoins la waiting list</h2>
          <p style={styles.waitlistSubtitle}>
            Inscris-toi pour recevoir les nouveautés et débloquer immédiatement
            le studio IA.
          </p>
          <form style={styles.waitlistForm} onSubmit={handleWaitlistSubmit}>
            <input
              type="email"
              required
              placeholder="ton@email.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              style={styles.waitlistInput}
              disabled={registered || waitlistStatus === "loading"}
            />
            <button
              type="submit"
              style={{
                ...styles.waitlistButton,
                opacity: registered || waitlistStatus === "loading" ? 0.7 : 1,
                cursor:
                  registered || waitlistStatus === "loading"
                    ? "not-allowed"
                    : "pointer",
              }}
              disabled={registered || waitlistStatus === "loading"}
            >
              {registered
                ? "Accès confirmé"
                : waitlistStatus === "loading"
                ? "Inscription…"
                : "Je m'inscris"}
            </button>
          </form>
          {waitlistFeedback && (
            <p
              style={{
                ...styles.waitlistFeedback,
                color:
                  waitlistFeedback.type === "error"
                    ? "#b91c1c"
                    : waitlistFeedback.type === "success"
                    ? "#047857"
                    : "#2563eb",
              }}
            >
              {waitlistFeedback.text}
            </p>
          )}
          {registered && (
            <button
              type="button"
              onClick={handleSignOut}
              style={styles.waitlistSignOut}
            >
              Déconnexion
            </button>
          )}
          <p style={styles.waitlistDisclaimer}>
            Aucun spam. Tu peux te désinscrire en un clic.
          </p>
        </section>

        <section
          style={{
            ...styles.card,
            ...(registered ? {} : styles.cardLocked),
          }}
        >
          {!registered && (
            <div style={styles.lockedOverlay}>
              <p style={styles.lockedTitle}>Studio verrouillé</p>
              <p style={styles.lockedSubtitle}>
                Inscris-toi à la waiting list pour activer la génération.
              </p>
            </div>
          )}

          <div
            style={{
              ...styles.cardInner,
              opacity: registered ? 1 : 0.35,
              pointerEvents: registered ? "auto" : "none",
            }}
          >
            <header style={styles.header}>
              <div>
                <p style={styles.pill}>Studio</p>
                <h1 style={styles.title}>
                  Éditeur d&apos;images propulsé par l&apos;IA
                </h1>
                <p style={styles.subtitle}>
                  Téléverse ton image, décris la transformation souhaitée et
                  laisse l&apos;IA créer le résultat parfait.
                </p>
              </div>
            </header>

            <form style={styles.form} onSubmit={handleSubmit}>
              <label style={styles.dropzone}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  style={styles.fileInput}
                />
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Aperçu de l'image sélectionnée"
                    style={styles.preview}
                  />
                ) : (
                  <div>
                    <p style={styles.dropzoneTitle}>Dépose une image</p>
                    <p style={styles.dropzoneHint}>
                      PNG, JPG ou WebP — 6 Mo max.
                    </p>
                  </div>
                )}
              </label>

              <div>
                <label htmlFor="prompt" style={styles.label}>
                  Prompt de transformation
                </label>
                <textarea
                  id="prompt"
                  required
                  rows={4}
                  value={prompt}
                  placeholder="Ex. Remplacer le ciel par un coucher de soleil pastel"
                  onChange={(event) => setPrompt(event.target.value)}
                  style={styles.textarea}
                />
              </div>

              <button
                type="submit"
                style={{
                  ...styles.button,
                  opacity: status === "loading" ? 0.7 : 1,
                  cursor: status === "loading" ? "wait" : "pointer",
                }}
                disabled={status === "loading"}
              >
                {status === "loading" ? "Génération en cours…" : "Générer"}
              </button>
            </form>

            {statusMessage && (
              <p
                style={{
                  ...styles.statusMessage,
                  color:
                    statusMessage.type === "error"
                      ? "#b91c1c"
                      : statusMessage.type === "success"
                      ? "#047857"
                      : "#2563eb",
                }}
              >
                {statusMessage.text}
              </p>
            )}

            {generatedUrl && (
              <div style={styles.result}>
                <h2 style={styles.resultTitle}>Résultat</h2>
                <img
                  src={generatedUrl}
                  alt="Image générée par l'IA"
                  style={styles.resultImage}
                />
                <a
                  href={generatedUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={styles.downloadLink}
                >
                  Ouvrir l&apos;image
                </a>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "48px 16px",
    background:
      "radial-gradient(circle at top, rgba(92,111,255,0.15), transparent 55%), #0f172a",
    color: "#0f172a",
    fontFamily:
      "-apple-system, BlinkMacSystemFont, Segoe UI, Helvetica Neue, sans-serif",
  },
  stack: {
    width: "100%",
    maxWidth: 960,
    display: "grid",
    gap: 28,
  },
  waitlistCard: {
    width: "100%",
    maxWidth: 620,
    margin: "0 auto",
    background: "rgba(15, 23, 42, 0.94)",
    color: "#e2e8f0",
    borderRadius: 24,
    boxShadow: "0 24px 60px rgba(15, 23, 42, 0.35)",
    padding: "32px 32px 28px",
    display: "grid",
    gap: 16,
  },
  waitlistTitle: {
    margin: "8px 0 0",
    fontSize: 26,
    fontWeight: 700,
  },
  waitlistSubtitle: {
    margin: 0,
    color: "rgba(226, 232, 240, 0.75)",
    fontSize: 16,
    lineHeight: 1.5,
  },
  waitlistForm: {
    display: "grid",
    gap: 12,
  },
  waitlistInput: {
    borderRadius: 999,
    border: "1px solid rgba(148, 163, 184, 0.4)",
    background: "rgba(15, 23, 42, 0.55)",
    color: "#f8fafc",
    padding: "12px 18px",
    fontSize: 16,
  },
  waitlistButton: {
    border: "none",
    borderRadius: 999,
    padding: "12px 20px",
    fontSize: 15,
    fontWeight: 600,
    background: "linear-gradient(135deg, #6366f1, #a855f7)",
    color: "#ffffff",
    transition: "transform 0.2s ease, box-shadow 0.2s ease",
    boxShadow: "0 12px 24px rgba(99, 102, 241, 0.35)",
  },
  waitlistFeedback: {
    fontSize: 14,
    fontWeight: 500,
  },
  waitlistSignOut: {
    marginTop: 4,
    alignSelf: "flex-start",
    border: "none",
    background: "transparent",
    color: "rgba(226, 232, 240, 0.85)",
    textDecoration: "underline",
    fontSize: 13,
    cursor: "pointer",
    padding: 0,
  },
  waitlistDisclaimer: {
    margin: 0,
    fontSize: 12,
    color: "rgba(226, 232, 240, 0.6)",
  },
  card: {
    width: "100%",
    maxWidth: 880,
    margin: "0 auto",
    background: "#ffffff",
    borderRadius: 28,
    boxShadow:
      "0 24px 60px rgba(15, 23, 42, 0.18), inset 0 1px 0 rgba(255,255,255,0.6)",
    padding: 40,
    display: "grid",
    gap: 0,
    position: "relative",
    overflow: "hidden",
  },
  cardLocked: {
    position: "relative",
  },
  cardInner: {
    display: "grid",
    gap: 28,
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 24,
  },
  pill: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "6px 12px",
    borderRadius: 999,
    background: "#eef2ff",
    color: "#4338ca",
    fontSize: 13,
    fontWeight: 600,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 32,
    margin: "14px 0 8px",
    color: "#0f172a",
    fontWeight: 700,
  },
  subtitle: {
    margin: 0,
    color: "#475569",
    fontSize: 16,
    lineHeight: 1.5,
  },
  lockedOverlay: {
    position: "absolute",
    inset: 0,
    background: "rgba(15, 23, 42, 0.78)",
    display: "grid",
    placeItems: "center",
    textAlign: "center",
    padding: "40px 24px",
    color: "#f8fafc",
    zIndex: 2,
  },
  lockedTitle: {
    fontSize: 20,
    fontWeight: 700,
    marginBottom: 8,
  },
  lockedSubtitle: {
    margin: 0,
    fontSize: 14,
    lineHeight: 1.5,
    color: "#e2e8f0",
  },
  form: {
    display: "grid",
    gap: 20,
  },
  dropzone: {
    position: "relative",
    borderRadius: 20,
    border: "1.5px dashed #cbd5f5",
    background: "#f8f9ff",
    minHeight: 220,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    cursor: "pointer",
    transition: "border-color 0.2s ease, transform 0.2s ease",
  },
  dropzoneTitle: {
    fontSize: 18,
    fontWeight: 600,
    color: "#4338ca",
    textAlign: "center",
  },
  dropzoneHint: {
    marginTop: 8,
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
  },
  fileInput: {
    position: "absolute",
    inset: 0,
    opacity: 0,
    cursor: "pointer",
  },
  preview: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  label: {
    display: "block",
    fontWeight: 600,
    marginBottom: 8,
    color: "#1e293b",
  },
  textarea: {
    width: "100%",
    borderRadius: 16,
    border: "1px solid #dbe2f1",
    padding: "14px 16px",
    fontSize: 16,
    lineHeight: 1.5,
    resize: "vertical",
  },
  button: {
    border: "none",
    borderRadius: 999,
    padding: "14px 24px",
    fontSize: 16,
    fontWeight: 600,
    background: "linear-gradient(135deg, #4338ca, #7c3aed)",
    color: "#ffffff",
    transition: "transform 0.2s ease, box-shadow 0.2s ease",
    boxShadow: "0 16px 30px rgba(76, 29, 149, 0.25)",
  },
  statusMessage: {
    fontSize: 14,
    fontWeight: 500,
  },
  result: {
    borderTop: "1px solid #e2e8f0",
    paddingTop: 24,
    display: "grid",
    gap: 12,
  },
  resultTitle: {
    margin: 0,
    color: "#0f172a",
    fontSize: 20,
    fontWeight: 600,
  },
  resultImage: {
    width: "100%",
    borderRadius: 20,
    border: "1px solid #e2e8f0",
  },
  downloadLink: {
    justifySelf: "flex-start",
    fontWeight: 600,
    color: "#4338ca",
    textDecoration: "none",
  },
};
