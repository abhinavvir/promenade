"use client";

import { useState, useEffect } from "react";

export default function SetupPage() {
  const [status, setStatus] = useState("checking"); // checking | ready | done | locked
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/setup")
      .then((r) => r.json())
      .then((d) => setStatus(d.needsSetup ? "ready" : "locked"))
      .catch(() => setStatus("error"));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, password }),
      });
      let data;
      try {
        data = await res.json();
      } catch {
        const text = await res.text().catch(() => "");
        setError(`Server error (${res.status}). Check Vercel logs. ${text.slice(0, 100)}`);
        return;
      }
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
      } else {
        setStatus("done");
      }
    } catch (e) {
      setError("Network error: " + (e.message || "Please try again."));
    } finally {
      setLoading(false);
    }
  }

  if (status === "checking") {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <p style={styles.muted}>Checking setup status…</p>
        </div>
      </div>
    );
  }

  if (status === "locked") {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <h1 style={styles.title}>Setup complete</h1>
          <p style={styles.muted}>
            An admin account already exists.{" "}
            <a href="/account/signin" style={styles.link}>
              Sign in
            </a>
          </p>
        </div>
      </div>
    );
  }

  if (status === "done") {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <h1 style={styles.title}>✓ Admin account created</h1>
          <p style={styles.muted}>
            You can now{" "}
            <a href="/account/signin" style={styles.link}>
              sign in
            </a>{" "}
            with your phone number and password.
          </p>
          <p style={styles.note}>This page is now permanently locked.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>Promenade Setup</h1>
        <p style={styles.muted}>Create your admin account to get started.</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.label}>
            Your name
            <input
              style={styles.input}
              type="text"
              placeholder="e.g. Abhinav"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </label>

          <label style={styles.label}>
            Phone number
            <input
              style={styles.input}
              type="tel"
              placeholder="+1 555 000 1234"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </label>

          <label style={styles.label}>
            Password
            <input
              style={styles.input}
              type="password"
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
          </label>

          {error && <p style={styles.error}>{error}</p>}

          <button style={styles.button} type="submit" disabled={loading}>
            {loading ? "Creating…" : "Create admin account"}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#f5f5f5",
    fontFamily: "system-ui, sans-serif",
  },
  card: {
    background: "#fff",
    borderRadius: 12,
    padding: "2.5rem",
    width: "100%",
    maxWidth: 420,
    boxShadow: "0 2px 16px rgba(0,0,0,0.08)",
  },
  title: {
    fontSize: "1.5rem",
    fontWeight: 700,
    marginBottom: "0.5rem",
    color: "#111",
  },
  muted: { color: "#555", marginBottom: "1.5rem", fontSize: "0.95rem" },
  note: {
    marginTop: "1rem",
    fontSize: "0.8rem",
    color: "#999",
  },
  form: { display: "flex", flexDirection: "column", gap: "1.25rem" },
  label: {
    display: "flex",
    flexDirection: "column",
    gap: "0.4rem",
    fontSize: "0.9rem",
    fontWeight: 500,
    color: "#333",
  },
  input: {
    padding: "0.65rem 0.9rem",
    borderRadius: 8,
    border: "1px solid #ddd",
    fontSize: "1rem",
    outline: "none",
  },
  button: {
    marginTop: "0.5rem",
    padding: "0.75rem",
    borderRadius: 8,
    background: "#111",
    color: "#fff",
    fontWeight: 600,
    fontSize: "1rem",
    border: "none",
    cursor: "pointer",
  },
  error: {
    color: "#c00",
    fontSize: "0.875rem",
    margin: 0,
  },
  link: { color: "#111", fontWeight: 600 },
};
