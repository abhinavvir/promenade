"use client";

import { useState, useEffect } from "react";
import useAuth from "@/utils/useAuth";

function MainComponent() {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  const { signInWithCredentials } = useAuth();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const errorParam = params.get("error");
      if (errorParam) {
        setError("Incorrect phone number or password. Please try again.");
        // Clean up the error param from the URL but keep callbackUrl
        params.delete("error");
        const remaining = params.toString();
        const newUrl =
          window.location.pathname + (remaining ? "?" + remaining : "");
        window.history.replaceState({}, "", newUrl);
      }
    }
  }, []);

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!phone || !password) {
      setError("Please fill in all fields");
      setLoading(false);
      return;
    }

    try {
      // Step 1: Look up the user's login email by phone number
      const lookupRes = await fetch(
        `/api/auth/phone-signin?phone=${encodeURIComponent(phone.trim())}`,
      );
      const lookupData = await lookupRes.json();

      if (!lookupRes.ok || !lookupData.loginEmail) {
        setError(
          "No account found for this phone number. Please contact your administrator.",
        );
        setLoading(false);
        return;
      }

      const loginEmail = lookupData.loginEmail;

      // Step 2: Sign in using the platform's auth system.
      // redirect: true triggers a full page navigation which:
      // - On success: redirects to callbackUrl (/api/auth/token)
      // - On failure: redirects back here with ?error=CredentialsSignin
      // The useEffect above catches the error param and shows a message.
      await signInWithCredentials({
        email: loginEmail,
        password,
        callbackUrl: "/api/auth/token",
        redirect: true,
      });
    } catch (err) {
      console.error("Sign-in error:", err);
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        width: "100%",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #EFF6FF 0%, #EEF2FF 100%)",
        padding: "16px",
        boxSizing: "border-box",
      }}
    >
      <form
        noValidate
        onSubmit={onSubmit}
        style={{
          width: "100%",
          maxWidth: "400px",
          backgroundColor: "#FFFFFF",
          borderRadius: "20px",
          padding: "32px 24px",
          boxShadow: "0 10px 40px rgba(0,0,0,0.1)",
        }}
      >
        {/* Icon */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: "20px",
          }}
        >
          <div
            style={{
              width: "60px",
              height: "60px",
              borderRadius: "30px",
              backgroundColor: "#2563EB",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "28px",
            }}
          >
            🏢
          </div>
        </div>

        <h1
          style={{
            margin: "0 0 8px 0",
            textAlign: "center",
            fontSize: "24px",
            fontWeight: "700",
            color: "#111827",
          }}
        >
          Property Manager
        </h1>
        <p
          style={{
            margin: "0 0 28px 0",
            textAlign: "center",
            fontSize: "14px",
            color: "#6B7280",
            lineHeight: "1.5",
          }}
        >
          Sign in with your phone number and the password provided by your
          administrator.
        </p>

        {/* Phone field */}
        <div style={{ marginBottom: "16px" }}>
          <label
            style={{
              display: "block",
              fontSize: "14px",
              fontWeight: "500",
              color: "#374151",
              marginBottom: "6px",
            }}
          >
            Phone Number
          </label>
          <input
            required
            name="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+1234567890"
            style={{
              width: "100%",
              padding: "14px 16px",
              fontSize: "16px",
              border: "1.5px solid #E5E7EB",
              borderRadius: "10px",
              outline: "none",
              boxSizing: "border-box",
              color: "#111827",
              backgroundColor: "#FAFAFA",
            }}
          />
        </div>

        {/* Password field */}
        <div style={{ marginBottom: "20px" }}>
          <label
            style={{
              display: "block",
              fontSize: "14px",
              fontWeight: "500",
              color: "#374151",
              marginBottom: "6px",
            }}
          >
            Password
          </label>
          <input
            required
            name="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            style={{
              width: "100%",
              padding: "14px 16px",
              fontSize: "16px",
              border: "1.5px solid #E5E7EB",
              borderRadius: "10px",
              outline: "none",
              boxSizing: "border-box",
              color: "#111827",
              backgroundColor: "#FAFAFA",
            }}
          />
        </div>

        {error && (
          <div
            style={{
              backgroundColor: "#FEF2F2",
              border: "1px solid #FECACA",
              borderRadius: "10px",
              padding: "12px 14px",
              marginBottom: "16px",
              fontSize: "14px",
              color: "#DC2626",
            }}
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            padding: "15px",
            fontSize: "16px",
            fontWeight: "600",
            color: "#FFFFFF",
            backgroundColor: loading ? "#93C5FD" : "#2563EB",
            border: "none",
            borderRadius: "10px",
            cursor: loading ? "not-allowed" : "pointer",
            marginBottom: "20px",
          }}
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>

        <div
          style={{
            backgroundColor: "#F9FAFB",
            border: "1px solid #E5E7EB",
            borderRadius: "10px",
            padding: "14px",
            textAlign: "center",
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: "13px",
              color: "#6B7280",
              lineHeight: "1.5",
            }}
          >
            Don't have an account? Contact your administrator to get your login
            credentials.
          </p>
        </div>
      </form>
    </div>
  );
}

export default MainComponent;
