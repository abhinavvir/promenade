"use client";

import { useEffect } from "react";

function MainComponent() {
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.location.href = "/account/signin";
    }
  }, []);

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl text-center">
        <h1 className="mb-4 text-2xl font-bold text-gray-800">
          Account Creation Disabled
        </h1>
        <p className="mb-6 text-sm text-gray-600">
          Account creation is managed by your administrator. Please contact your
          administrator to get your login credentials.
        </p>
        <a
          href="/account/signin"
          className="inline-block rounded-lg bg-[#357AFF] px-6 py-3 text-base font-medium text-white transition-colors hover:bg-[#2E69DE]"
        >
          Go to Sign In
        </a>
      </div>
    </div>
  );
}

export default MainComponent;
