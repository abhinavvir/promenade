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
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-[#0B141A]">
      {/* Animated background gradient */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute inset-0 bg-gradient-to-br from-[#C9A962]/20 via-transparent to-[#1A2332]/40" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#C9A962]/10 via-transparent to-transparent" />
        {/* Subtle grain texture */}
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }} />
      </div>

      {/* Decorative elements */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-[#C9A962]/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#D4AF37]/5 rounded-full blur-3xl" />

      <div className="relative z-10 w-full max-w-md px-4 py-8">
        <form
          noValidate
          onSubmit={onSubmit}
          className="relative"
        >
          {/* Glass card */}
          <div className="relative overflow-hidden rounded-3xl border border-[#C9A962]/20 bg-[#0B141A]/80 backdrop-blur-xl p-8 shadow-2xl">
            {/* Shimmer effect on border */}
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-transparent via-[#C9A962]/10 to-transparent opacity-0"
                 style={{ animation: 'shimmer 3s infinite' }} />

            {/* Decorative top line */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A962]/50 to-transparent" />

            <div className="relative">
              {/* Logo/Brand section */}
              <div className="mb-8 text-center">
                <div className="mb-6 inline-flex items-center justify-center">
                  <div className="relative">
                    <div className="absolute inset-0 bg-[#C9A962]/20 blur-xl rounded-full" />
                    <div className="relative flex h-16 w-16 items-center justify-center rounded-full border-2 border-[#C9A962]/30 bg-[#0B141A]" aria-hidden="true">
                      <svg className="w-8 h-8 text-[#C9A962]" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.25 21v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21m0 0h4.5V3.545c0-3.006-2.086-5.545-5-5.545S6.75 4.562 6.75 7.545V21m0 0h4.5" />
                      </svg>
                    </div>
                  </div>
                </div>

                <h1 className="mb-3 font-serif text-4xl font-light tracking-tight text-[#F5E6D3]">
                  Promenade
                </h1>

                <p className="text-sm font-medium tracking-wide text-[#C9A962]/80 uppercase">
                  Property Management
                </p>

                <div className="mt-4 flex items-center justify-center gap-3" aria-hidden="true">
                  <div className="h-px w-12 bg-gradient-to-r from-transparent to-[#C9A962]/30" />
                  <div className="flex h-2 w-2 rounded-full bg-[#C9A962]/40" />
                  <div className="h-px w-12 bg-gradient-to-l from-transparent to-[#C9A962]/30" />
                </div>

                <p className="mt-6 text-center text-sm text-[#8B9A8A]">
                  Secure administrator access
                </p>
              </div>

              {error && (
                <div
                  className="mb-6 rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-400"
                  role="alert"
                  aria-live="polite"
                >
                  {error}
                </div>
              )}

              <div className="space-y-5">
                <div className="space-y-2">
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-[#D4AF37]/90 uppercase tracking-wider"
                  >
                    Email or Phone
                  </label>
                  <div className="group relative">
                    <input
                      required
                      id="email"
                      name="email"
                      type="text"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@example.com or +1 555 000 1234"
                      className="w-full cursor-pointer rounded-xl border border-[#1A2332] bg-[#0B141A]/50 px-4 py-3.5 text-[#F5E6D3] placeholder-[#8B9A8A] outline-none transition-all duration-300 focus:border-[#C9A962]/50 focus:bg-[#1A2332]/30 focus:ring-1 focus:ring-[#C9A962]/20 focus-visible:ring-2 focus:ring-offset-2 focus:ring-offset-[#0B141A]"
                    />
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#C9A962]/10 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-focus-within:opacity-100 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="password"
                      className="block text-sm font-medium text-[#D4AF37]/90 uppercase tracking-wider"
                    >
                      Password
                    </label>
                    <a
                      href="/account/forgot-password"
                      className="text-sm text-[#C9A962]/80 hover:text-[#D4AF37] transition-colors duration-300 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A962]"
                    >
                      Forgot?
                    </a>
                  </div>
                  <div className="group relative">
                    <input
                      required
                      id="password"
                      name="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="•••••••••"
                      className="w-full cursor-pointer rounded-xl border border-[#1A2332] bg-[#0B141A]/50 px-4 py-3.5 text-[#F5E6D3] placeholder-[#8B9A8A] outline-none transition-all duration-300 focus:border-[#C9A962]/50 focus:bg-[#1A2332]/30 focus:ring-1 focus:ring-[#C9A962]/20 focus-visible:ring-2 focus:ring-offset-2 focus:ring-offset-[#0B141A]"
                    />
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#C9A962]/10 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-focus-within:opacity-100 pointer-events-none" />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="group relative w-full cursor-pointer overflow-hidden rounded-xl bg-gradient-to-r from-[#C9A962] to-[#D4AF37] px-6 py-4 font-semibold text-[#0B141A] shadow-lg shadow-[#C9A962]/20 transition-all duration-300 hover:shadow-xl hover:shadow-[#C9A962]/30 hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A962] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B141A]"
                  aria-describedby={loading ? "signing-in-status" : undefined}
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {loading ? (
                      <>
                        <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12c0 2.635-.995 5.041-2.628 6.88l-1.137-1.137A6.002 6.002 0 015 12c0-2.635-1.005-5.041-2.637-6.87l1.137-1.138z" />
                        </svg>
                        <span>Signing in...</span>
                      </>
                    ) : (
                      <>
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                        </svg>
                        <span>Sign In</span>
                      </>
                    )}
                  </span>
                  {/* Button shimmer effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shimmer" />
                </button>
                {loading && (
                  <span id="signing-in-status" className="sr-only">
                    Signing in, please wait...
                  </span>
                )}
              </div>

              {/* Bottom decoration */}
              <div className="mt-8 flex items-center justify-center gap-3">
                <div className="h-px w-12 bg-gradient-to-r from-transparent to-[#C9A962]/20" aria-hidden="true" />
                <p className="text-xs text-[#8B9A8A]">
                  Admin Portal
                </p>
                <div className="h-px w-12 bg-gradient-to-l from-transparent to-[#C9A962]/20" aria-hidden="true" />
              </div>
            </div>
          </div>

          {/* Floating accent */}
          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2" aria-hidden="true">
            <div className="relative flex h-4 w-4">
              <div className="absolute inset-0 animate-ping rounded-full bg-[#C9A962]/30" />
              <div className="relative rounded-full bg-[#C9A962]/40 ring-4 ring-[#0B141A]" />
            </div>
          </div>
        </form>
      </div>

      <style jsx>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes animate-shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }

        /* Focus visible for keyboard navigation */
        .focus-visible\\:ring-2 {
          --tw-ring-offset-shadow: 0 0 0 2px rgb(11, 20, 26);
        }

        /* Reduced motion support */
        @media (prefers-reduced-motion: reduce) {
          .animate-ping,
          .animate-spin {
            animation-duration: 0.01ms !important;
          }
        }
      `}</style>
    </div>
  );
}

export default function Page() {
  return (
    <div className="min-h-screen">
      <MainComponent />
    </div>
  );
}
