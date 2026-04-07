import { useEffect } from "react";
import { useNavigate } from "react-router";

export default function Page() {
  const navigate = useNavigate();

  useEffect(() => {
    // Small delay to ensure client-side hydration is complete
    const timer = setTimeout(() => {
      fetch("/api/auth/me")
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then(({ user: me }) => {
          if (me?.role === "admin") {
            navigate("/admin/dashboard", { replace: true });
          } else {
            navigate("/account/signin", { replace: true });
          }
        })
        .catch(() => {
          navigate("/account/signin", { replace: true });
        });
    }, 100);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="text-lg text-gray-600">Loading...</div>
    </div>
  );
}
