"use client";

import { useState } from "react";

export default function ForgotPasswordPage() {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [devOtp, setDevOtp] = useState("");

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);
    setOtpSent(false);

    if (!phone) {
      setError("Please enter your phone number");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/request-otp-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send OTP");
      }

      setOtpSent(true);
      if (data.devOtp) {
        setDevOtp(data.devOtp);
      }
    } catch (err) {
      console.error("OTP request error:", err);
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!otp || !newPassword || !confirmPassword) {
      setError("Please fill in all fields");
      setLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters long");
      setLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/verify-otp-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, otp, newPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to reset password");
      }

      setSuccess(true);
    } catch (err) {
      console.error("Password reset error:", err);
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center relative overflow-hidden bg-[#0B141A]">
      {/* Animated background gradient */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute inset-0 bg-gradient-to-br from-[#C9A962]/20 via-transparent to-[#1A2332]/40" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#C9A962]/10 via-transparent to-transparent" />
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }} />
      </div>

      {/* Decorative elements */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-[#C9A962]/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#D4AF37]/5 rounded-full blur-3xl" />

      <div className="relative z-10 w-full max-w-md px-4 py-8">
        <div className="relative overflow-hidden rounded-3xl border border-[#C9A962]/20 bg-[#0B141A]/80 backdrop-blur-xl p-8 shadow-2xl">
          {/* Decorative top line */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A962]/50 to-transparent" />

          <div className="relative">
            {/* Logo section */}
            <div className="mb-8 text-center">
              <div className="mb-6 inline-flex items-center justify-center">
                <div className="relative">
                  <div className="absolute inset-0 bg-[#C9A962]/20 blur-xl rounded-full" />
                  <div className="relative flex h-16 w-16 items-center justify-center rounded-full border-2 border-[#C9A962]/30 bg-[#0B141A]">
                    <svg className="w-8 h-8 text-[#C9A962]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964a6 6 0 116.842-6.838L18 8m2-2h.01M6 20h12" />
                    </svg>
                  </div>
                </div>
              </div>

              <h1 className="mb-3 font-serif text-3xl font-light tracking-tight text-[#F5E6D3]">
                {success ? "Password Reset" : "Reset Password"}
              </h1>
              <p className="text-sm text-[#8B9A8A]">
                {success
                  ? "Your password has been successfully reset."
                  : otpSent
                  ? "Enter the OTP sent to your phone"
                  : "Enter your phone number to receive a verification code"}
              </p>
            </div>

            {success ? (
              <div className="space-y-6">
                <div className="rounded-xl bg-green-500/10 border border-green-500/30 p-6 text-center">
                  <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-green-500/20">
                    <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="mb-2 text-sm font-medium text-green-400">
                    Password Reset Successfully!
                  </p>
                  <p className="text-sm text-[#8B9A8A]">
                    You can now sign in with your new password.
                  </p>
                </div>
                <a
                  href="/account/signin"
                  className="block w-full rounded-xl bg-gradient-to-r from-[#C9A962] to-[#D4AF37] px-6 py-4 text-center font-semibold text-[#0B141A] transition-all hover:shadow-lg hover:shadow-[#C9A962]/20 hover:scale-[1.02] active:scale-[0.98]"
                >
                  Go to Sign In
                </a>
              </div>
            ) : otpSent ? (
              <form onSubmit={handleResetPassword} className="space-y-5">
                {error && (
                  <div className="rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-400">
                    {error}
                  </div>
                )}

                {devOtp && (
                  <div className="rounded-xl border border-[#C9A962]/30 bg-[#C9A962]/10 px-4 py-3 text-sm">
                    <p className="font-medium text-[#C9A962]">Development Mode:</p>
                    <p className="text-[#F5E6D3]">Your OTP is: <span className="font-mono font-bold">{devOtp}</span></p>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-[#D4AF37]/90 uppercase tracking-wider">
                    OTP Code
                  </label>
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="Enter 6-digit code"
                    className="w-full rounded-xl border border-[#1A2332] bg-[#0B141A]/50 px-4 py-3.5 text-[#F5E6D3] placeholder-[#8B9A8A] outline-none focus:border-[#C9A962]/50 focus:bg-[#1A2332]/30 focus:ring-1 focus:ring-[#C9A962]/20 text-center text-2xl tracking-widest font-mono"
                    maxLength={6}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-[#D4AF37]/90 uppercase tracking-wider">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full rounded-xl border border-[#1A2332] bg-[#0B141A]/50 px-4 py-3.5 text-[#F5E6D3] placeholder-[#8B9A8A] outline-none focus:border-[#C9A962]/50 focus:bg-[#1A2332]/30 focus:ring-1 focus:ring-[#C9A962]/20"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-[#D4AF37]/90 uppercase tracking-wider">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="w-full rounded-xl border border-[#1A2332] bg-[#0B141A]/50 px-4 py-3.5 text-[#F5E6D3] placeholder-[#8B9A8A] outline-none focus:border-[#C9A962]/50 focus:bg-[#1A2332]/30 focus:ring-1 focus:ring-[#C9A962]/20"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-[#C9A962] to-[#D4AF37] px-6 py-4 font-semibold text-[#0B141A] shadow-lg shadow-[#C9A962]/20 transition-all duration-300 hover:shadow-xl hover:shadow-[#C9A962]/30 hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {loading ? (
                      <>
                        <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12c0-2.635-.995-5.041-2.628-6.88l-1.137-1.137A6.002 6.002 0 015 12c0-2.635-1.005-5.041-2.637-6.87l1.137-1.138z" />
                        </svg>
                        <span>Resetting...</span>
                      </>
                    ) : (
                      <span>Reset Password</span>
                    )}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setOtpSent(false);
                    setOtp("");
                    setNewPassword("");
                    setConfirmPassword("");
                  }}
                  className="w-full text-sm text-[#C9A962]/80 hover:text-[#D4AF37] transition-colors"
                >
                  Back to Phone Number
                </button>
              </form>
            ) : (
              <form onSubmit={handleRequestOtp} className="space-y-5">
                {error && (
                  <div className="rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-400">
                    {error}
                  </div>
                )}

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-[#D4AF37]/90 uppercase tracking-wider">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    className="w-full rounded-xl border border-[#1A2332] bg-[#0B141A]/50 px-4 py-3.5 text-[#F5E6D3] placeholder-[#8B9A8A] outline-none focus:border-[#C9A962]/50 focus:bg-[#1A2332]/30 focus:ring-1 focus:ring-[#C9A962]/20"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-[#C9A962] to-[#D4AF37] px-6 py-4 font-semibold text-[#0B141A] shadow-lg shadow-[#C9A962]/20 transition-all duration-300 hover:shadow-xl hover:shadow-[#C9A962]/30 hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {loading ? (
                      <>
                        <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12c0-2.635-.995-5.041-2.628-6.88l-1.137-1.137A6.002 6.002 0 015 12c0-2.635-1.005-5.041-2.637-6.87l1.137-1.138z" />
                        </svg>
                        <span>Sending...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                        </svg>
                        <span>Send OTP</span>
                      </>
                    )}
                  </span>
                </button>

                <div className="text-center">
                  <a
                    href="/account/signin"
                    className="text-sm text-[#C9A962]/80 hover:text-[#D4AF37] transition-colors"
                  >
                    Back to Sign In
                  </a>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
