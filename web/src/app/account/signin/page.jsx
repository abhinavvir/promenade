"use client";

import { useState, useEffect } from "react";
import useAuth from "@/utils/useAuth";

function MainComponent() {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const { signInWithCredentials } = useAuth();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const errorParam = params.get("error");

      if (errorParam) {
        const errorMessages = {
          CredentialsSignin: "Incorrect email or password. Please try again.",
          OAuthAccountNotLinked:
            "This account is linked to a different sign-in method.",
          Configuration:
            "There is a problem with the authentication configuration.",
          AccessDenied: "You don't have permission to sign in.",
          Verification: "The sign-in link is no longer valid.",
          Default: "An error occurred during sign-in. Please try again.",
        };

        setError(errorMessages[errorParam] || errorMessages.Default);
        window.history.replaceState({}, "", window.location.pathname);
      }
    }
  }, []);

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!email || !password) {
      setError("Please fill in all fields");
      setLoading(false);
      return;
    }

    try {
      const result = await signInWithCredentials({
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        throw new Error(result.error);
      }

      // Check role and redirect accordingly
      const meRes = await fetch("/api/auth/me");
      if (meRes.ok) {
        const { user: me } = await meRes.json();
        if (me?.role === "admin") {
          window.location.href = "/admin/dashboard";
        } else {
          setError("This portal is for administrators only. Please use the mobile app.");
          setLoading(false);
          return;
        }
      } else {
        window.location.href = "/admin/dashboard";
      }
    } catch (err) {
      console.error("Sign-in error:", err);

      const errorMessages = {
        CredentialsSignin:
          "Incorrect email or password. Please check your credentials and try again.",
        AccessDenied: "You don't have permission to sign in.",
        Configuration:
          "Sign-in isn't working right now. Please try again later.",
      };

      setError(
        errorMessages[err.message] ||
          err.message ||
          "Something went wrong. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
      <form
        noValidate
        onSubmit={onSubmit}
        className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl"
      >
        {/* Admin badge */}
        <div className="mb-6 flex justify-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
            <span>🔒</span> Admin Portal
          </span>
        </div>

        <h1 className="mb-2 text-center text-3xl font-bold text-gray-800">
          Property Manager
        </h1>
        <p className="mb-8 text-center text-sm text-gray-500">
          This portal is for administrators only. Property managers use the
          mobile app.
        </p>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Email or Phone
            </label>
            <div className="overflow-hidden rounded-lg border border-gray-200 bg-white px-4 py-3 focus-within:border-[#357AFF] focus-within:ring-1 focus-within:ring-[#357AFF]">
              <input
                required
                name="email"
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com or +1 555 000 1234"
                className="w-full bg-transparent text-lg outline-none"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <a
                href="/account/forgot-password"
                className="text-sm text-[#357AFF] hover:text-[#2E69DE]"
              >
                Forgot Password?
              </a>
            </div>
            <div className="overflow-hidden rounded-lg border border-gray-200 bg-white px-4 py-3 focus-within:border-[#357AFF] focus-within:ring-1 focus-within:ring-[#357AFF]">
              <input
                required
                name="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg bg-transparent text-lg outline-none"
                placeholder="Enter your password"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-500">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-[#357AFF] px-4 py-3 text-base font-medium text-white transition-colors hover:bg-[#2E69DE] focus:outline-none focus:ring-2 focus:ring-[#357AFF] focus:ring-offset-2 disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>

          <div className="rounded-lg bg-gray-50 border border-gray-200 p-4 text-center">
            <p className="text-xs text-gray-500">
              <span className="font-semibold text-gray-700">
                Property Manager?
              </span>
              <br />
              Please use the mobile app to sign in. Contact your administrator
              if you need help.
            </p>
          </div>
        </div>
      </form>
    </div>
  );
}

export default MainComponent;
