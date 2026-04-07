"use client";

import { useState, useEffect } from "react";

export default function ManageUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddUser, setShowAddUser] = useState(false);
  const [showSuccess, setShowSuccess] = useState(null);
  const [resetSuccess, setResetSuccess] = useState(null);
  const [resetLoadingId, setResetLoadingId] = useState(null);
  const [addError, setAddError] = useState(null);
  const [addLoading, setAddLoading] = useState(false);
  const [copied, setCopied] = useState("");
  const [newUser, setNewUser] = useState({
    name: "",
    phoneNumber: "",
    email: "",
  });

  // Manage user modal state
  const [manageUser, setManageUser] = useState(null);
  const [allProperties, setAllProperties] = useState([]);
  const [loadingProperties, setLoadingProperties] = useState(false);
  const [manageAction, setManageAction] = useState(null); // 'remove' | 'assign-existing' | 'assign-new' | null
  const [selectedPropertyId, setSelectedPropertyId] = useState("");
  const [manageLoading, setManageLoading] = useState(false);
  const [manageError, setManageError] = useState(null);
  const [manageSuccess, setManageSuccess] = useState(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(({ user: me }) => {
        if (me?.role !== "admin") window.location.href = "/account/signin";
        else fetchData();
      })
      .catch(() => { window.location.href = "/account/signin"; });
  }, []);

  const fetchData = async () => {
    try {
      const usersRes = await fetch("/api/admin/users");
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(usersData.users || []);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllProperties = async () => {
    setLoadingProperties(true);
    try {
      const res = await fetch("/api/properties?all=true");
      if (res.ok) {
        const data = await res.json();
        setAllProperties(data.properties || []);
      }
    } catch (err) {
      console.error("Error fetching properties:", err);
    } finally {
      setLoadingProperties(false);
    }
  };

  const handleOpenManage = async (user) => {
    setManageUser(user);
    setManageAction(null);
    setManageError(null);
    setManageSuccess(null);
    setSelectedPropertyId("");
    await fetchAllProperties();
  };

  const handleCloseManage = () => {
    setManageUser(null);
    setManageAction(null);
    setManageError(null);
    setManageSuccess(null);
    setSelectedPropertyId("");
  };

  const handleRemoveProperty = async (propertyId, propertyName) => {
    const confirmed = window.confirm(
      `Remove "${propertyName}" from ${manageUser.name}?`,
    );
    if (!confirmed) return;

    setManageLoading(true);
    setManageError(null);
    try {
      const res = await fetch(
        `/api/properties?propertyId=${propertyId}&userId=${manageUser.id}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to remove property");
      }
      setManageSuccess(`"${propertyName}" removed from ${manageUser.name}`);
      await fetchData();
      setManageUser((prev) => ({
        ...prev,
        properties: (prev.properties || []).filter((p) => p.id !== propertyId),
      }));
    } catch (err) {
      setManageError(err.message);
    } finally {
      setManageLoading(false);
    }
  };

  const handleAssignExisting = async () => {
    if (!selectedPropertyId || !manageUser) return;
    setManageLoading(true);
    setManageError(null);
    try {
      const res = await fetch("/api/properties", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId: parseInt(selectedPropertyId),
          managerId: manageUser.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to assign property");

      setManageSuccess(`Property assigned to ${manageUser.name} successfully!`);
      setManageAction(null);
      setSelectedPropertyId("");
      await fetchData();
      const prop = allProperties.find(
        (p) => p.id === parseInt(selectedPropertyId),
      );
      if (prop) {
        setManageUser((prev) => ({
          ...prev,
          properties: [
            ...(prev.properties || []).filter((p) => p.id !== prop.id),
            { id: prop.id, name: prop.name, address: prop.address },
          ],
        }));
      }
    } catch (err) {
      setManageError(err.message);
    } finally {
      setManageLoading(false);
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    setAddError(null);
    setAddLoading(true);
    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUser),
      });
      const data = await response.json();
      if (response.ok) {
        setShowAddUser(false);
        setShowSuccess({
          name: data.user.name,
          phoneNumber: data.user.phone_number,
          loginEmail: data.loginEmail,
          tempPassword: data.tempPassword,
        });
        setNewUser({ name: "", phoneNumber: "", email: "" });
        fetchData();
      } else {
        setAddError(data.error || "Failed to add user");
      }
    } catch (error) {
      console.error("Error adding user:", error);
      setAddError("Failed to add user. Please try again.");
    } finally {
      setAddLoading(false);
    }
  };

  const handleDeleteUser = async (userId, userName) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete ${userName}? This will remove all their data including audit logs.`,
    );
    if (!confirmed) return;
    try {
      const response = await fetch(`/api/admin/users?userId=${userId}`, {
        method: "DELETE",
      });
      if (response.ok) {
        fetchData();
        if (manageUser?.id === userId) handleCloseManage();
      } else {
        const data = await response.json();
        alert(data.error || "Failed to delete user");
      }
    } catch (error) {
      console.error("Error deleting user:", error);
      alert("Failed to delete user");
    }
  };

  const handleResetPassword = async (userId, userName, phoneNumber) => {
    const confirmed = window.confirm(
      `Reset the password for ${userName}? A new temporary password will be generated.`,
    );
    if (!confirmed) return;
    setResetLoadingId(userId);
    try {
      const response = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await response.json();
      if (response.ok) {
        setResetSuccess({
          name: userName,
          phoneNumber,
          tempPassword: data.tempPassword,
        });
        fetchData();
      } else {
        alert(data.error || "Failed to reset password");
      }
    } catch (error) {
      console.error("Error resetting password:", error);
      alert("Failed to reset password. Please try again.");
    } finally {
      setResetLoadingId(null);
    }
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(label);
      setTimeout(() => setCopied(""), 2000);
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Manage Property Managers
            </h1>
            <p className="mt-2 text-gray-600">
              Add managers, assign properties, and manage credentials.
            </p>
          </div>
          <button
            onClick={() => {
              setShowAddUser(true);
              setAddError(null);
            }}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            + Add Manager
          </button>
        </div>

        {/* Add User Modal */}
        {showAddUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="w-full max-w-md rounded-lg bg-white p-6">
              <h2 className="mb-2 text-xl font-bold text-gray-900">
                Add New Manager
              </h2>
              <p className="mb-4 text-sm text-gray-500">
                A temporary password will be generated. The manager will use
                their phone number and this password to sign in.
              </p>
              <form onSubmit={handleAddUser} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newUser.name}
                    onChange={(e) =>
                      setNewUser({ ...newUser, name: e.target.value })
                    }
                    required
                    placeholder="John Doe"
                    className="mt-1 w-full rounded-lg border px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={newUser.phoneNumber}
                    onChange={(e) =>
                      setNewUser({ ...newUser, phoneNumber: e.target.value })
                    }
                    required
                    placeholder="+1234567890"
                    className="mt-1 w-full rounded-lg border px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Email{" "}
                    <span className="text-gray-400 text-xs">(optional)</span>
                  </label>
                  <input
                    type="email"
                    value={newUser.email}
                    onChange={(e) =>
                      setNewUser({ ...newUser, email: e.target.value })
                    }
                    placeholder="john@example.com"
                    className="mt-1 w-full rounded-lg border px-3 py-2"
                  />
                  <p className="mt-1 text-xs text-gray-400">
                    If no email is provided, a login email will be
                    auto-generated from their phone number.
                  </p>
                </div>
                {addError && (
                  <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
                    {addError}
                  </div>
                )}
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={addLoading}
                    className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {addLoading ? "Creating..." : "Create Manager"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddUser(false)}
                    className="flex-1 rounded-lg bg-gray-200 px-4 py-2 text-gray-800 hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Success Modal */}
        {showSuccess && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="w-full max-w-md rounded-lg bg-white p-6">
              <div className="mb-4 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                  <span className="text-2xl">✅</span>
                </div>
                <h2 className="text-xl font-bold text-gray-900">
                  Manager Created Successfully
                </h2>
              </div>
              <div className="space-y-3 rounded-lg bg-gray-50 p-4">
                <div>
                  <div className="text-xs font-medium text-gray-500">Name</div>
                  <div className="text-sm font-semibold text-gray-900">
                    {showSuccess.name}
                  </div>
                </div>
                <div className="border-t border-gray-200 pt-3">
                  <div className="text-xs font-medium text-gray-500 mb-1">
                    Login Phone Number
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2">
                    <code className="text-sm font-mono text-blue-700 break-all">
                      {showSuccess.phoneNumber}
                    </code>
                    <button
                      onClick={() =>
                        copyToClipboard(showSuccess.phoneNumber, "phone")
                      }
                      className="ml-2 flex-shrink-0 rounded bg-blue-50 px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-100"
                    >
                      {copied === "phone" ? "Copied!" : "Copy"}
                    </button>
                  </div>
                </div>
                <div>
                  <div className="text-xs font-medium text-gray-500 mb-1">
                    Temporary Password
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-orange-200 bg-orange-50 px-3 py-2">
                    <code className="text-sm font-mono font-bold text-orange-700">
                      {showSuccess.tempPassword}
                    </code>
                    <button
                      onClick={() =>
                        copyToClipboard(showSuccess.tempPassword, "password")
                      }
                      className="ml-2 flex-shrink-0 rounded bg-orange-100 px-2 py-1 text-xs font-medium text-orange-700 hover:bg-orange-200"
                    >
                      {copied === "password" ? "Copied!" : "Copy"}
                    </button>
                  </div>
                </div>
              </div>
              <div className="mt-4 rounded-lg bg-blue-50 border border-blue-200 p-3">
                <p className="text-xs font-semibold text-blue-800 mb-1">
                  📋 Share these credentials with the manager:
                </p>
                <p className="text-xs text-blue-700">
                  "Sign in with your phone number: {showSuccess.phoneNumber}"
                  <br />
                  "Your temporary password: {showSuccess.tempPassword}"
                </p>
                <button
                  onClick={() =>
                    copyToClipboard(
                      `Sign in with your phone number: ${showSuccess.phoneNumber}\nYour temporary password: ${showSuccess.tempPassword}`,
                      "all",
                    )
                  }
                  className="mt-2 rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700"
                >
                  {copied === "all" ? "Copied!" : "Copy All Credentials"}
                </button>
              </div>
              <button
                onClick={() => setShowSuccess(null)}
                className="mt-4 w-full rounded-lg bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-900"
              >
                Done
              </button>
            </div>
          </div>
        )}

        {/* Reset Password Success Modal */}
        {resetSuccess && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="w-full max-w-md rounded-lg bg-white p-6">
              <div className="mb-4 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                  <span className="text-2xl">🔑</span>
                </div>
                <h2 className="text-xl font-bold text-gray-900">
                  Password Reset Successfully
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Share these new credentials with {resetSuccess.name}
                </p>
              </div>
              <div className="space-y-3 rounded-lg bg-gray-50 p-4">
                <div>
                  <div className="text-xs font-medium text-gray-500 mb-1">
                    Login Phone Number
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2">
                    <code className="text-sm font-mono text-blue-700 break-all">
                      {resetSuccess.phoneNumber}
                    </code>
                    <button
                      onClick={() =>
                        copyToClipboard(resetSuccess.phoneNumber, "reset-phone")
                      }
                      className="ml-2 flex-shrink-0 rounded bg-blue-50 px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-100"
                    >
                      {copied === "reset-phone" ? "Copied!" : "Copy"}
                    </button>
                  </div>
                </div>
                <div>
                  <div className="text-xs font-medium text-gray-500 mb-1">
                    New Temporary Password
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-orange-200 bg-orange-50 px-3 py-2">
                    <code className="text-sm font-mono font-bold text-orange-700">
                      {resetSuccess.tempPassword}
                    </code>
                    <button
                      onClick={() =>
                        copyToClipboard(
                          resetSuccess.tempPassword,
                          "reset-password",
                        )
                      }
                      className="ml-2 flex-shrink-0 rounded bg-orange-100 px-2 py-1 text-xs font-medium text-orange-700 hover:bg-orange-200"
                    >
                      {copied === "reset-password" ? "Copied!" : "Copy"}
                    </button>
                  </div>
                </div>
              </div>
              <div className="mt-4 rounded-lg bg-blue-50 border border-blue-200 p-3">
                <button
                  onClick={() =>
                    copyToClipboard(
                      `Sign in with your phone number: ${resetSuccess.phoneNumber}\nYour new temporary password: ${resetSuccess.tempPassword}`,
                      "reset-all",
                    )
                  }
                  className="w-full rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  {copied === "reset-all" ? "Copied!" : "Copy All Credentials"}
                </button>
              </div>
              <button
                onClick={() => setResetSuccess(null)}
                className="mt-4 w-full rounded-lg bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-900"
              >
                Done
              </button>
            </div>
          </div>
        )}

        {/* ======================= */}
        {/* MANAGE USER MODAL       */}
        {/* ======================= */}
        {manageUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl overflow-hidden">
              {/* Modal Header */}
              <div className="bg-gray-50 border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    Manage {manageUser.name}
                  </h2>
                  <p className="text-sm text-gray-500">
                    📱 {manageUser.phone_number}
                    {manageUser.email ? ` · ✉️ ${manageUser.email}` : ""}
                  </p>
                </div>
                <button
                  onClick={handleCloseManage}
                  className="text-gray-400 hover:text-gray-600 text-xl font-bold leading-none p-1"
                >
                  ✕
                </button>
              </div>

              <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">
                {/* Success banner */}
                {manageSuccess && (
                  <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-700 font-medium">
                    ✅ {manageSuccess}
                  </div>
                )}

                {/* Error banner */}
                {manageError && (
                  <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-600">
                    {manageError}
                  </div>
                )}

                {/* Current Properties Section */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
                    Assigned Properties
                  </h3>
                  {(manageUser.properties || []).length > 0 ? (
                    <div className="space-y-2">
                      {(manageUser.properties || []).map((prop) => (
                        <div key={prop.id} className="rounded-lg border border-gray-200 bg-white p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="text-sm font-semibold text-gray-900">
                                {prop.name}
                              </div>
                              <div className="text-xs text-gray-500 mt-0.5">
                                {prop.address}
                              </div>
                            </div>
                            <button
                              onClick={() => handleRemoveProperty(prop.id, prop.name)}
                              disabled={manageLoading}
                              className="flex-shrink-0 ml-4 rounded-lg bg-red-50 border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 disabled:opacity-50 transition-colors"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 p-4 text-center">
                      <span className="text-sm text-gray-400">
                        No properties assigned
                      </span>
                    </div>
                  )}
                </div>

                {/* Assign Property Section */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
                    Assign Property
                  </h3>
                  <div className="space-y-3">
                    {/* Option 1: Choose existing property */}
                    <button
                      onClick={() => {
                        setManageAction(
                          manageAction === "assign-existing"
                            ? null
                            : "assign-existing",
                        );
                        setManageError(null);
                        setManageSuccess(null);
                      }}
                      className={`w-full text-left rounded-lg border p-4 transition-colors ${
                        manageAction === "assign-existing"
                          ? "border-blue-400 bg-blue-50"
                          : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-semibold text-gray-900">
                            Choose an existing property
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            Pick from properties already added to the system
                          </div>
                        </div>
                        <span className="text-gray-400 text-lg">
                          {manageAction === "assign-existing" ? "▾" : "▸"}
                        </span>
                      </div>
                    </button>

                    {/* Existing property dropdown */}
                    {manageAction === "assign-existing" && (
                      <div className="ml-2 border-l-2 border-blue-200 pl-4 space-y-3">
                        {loadingProperties ? (
                          <div className="text-sm text-gray-500 py-2">
                            Loading properties...
                          </div>
                        ) : allProperties.length === 0 ? (
                          <div className="text-sm text-gray-400 py-2">
                            No properties found. Create one first.
                          </div>
                        ) : (
                          <>
                            <select
                              value={selectedPropertyId}
                              onChange={(e) =>
                                setSelectedPropertyId(e.target.value)
                              }
                              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            >
                              <option value="">Select a property...</option>
                              {allProperties.map((p) => {
                                const managerNames = (p.managers || []).map((m) => m.name).join(", ");
                                const assignedTo = managerNames ? ` (${managerNames})` : " (unassigned)";
                                return (
                                  <option key={p.id} value={p.id}>
                                    {p.name} — {p.address}
                                    {assignedTo}
                                  </option>
                                );
                              })}
                            </select>

                            {selectedPropertyId && (
                              <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
                                {(() => {
                                  const sel = allProperties.find(
                                    (p) =>
                                      p.id === parseInt(selectedPropertyId),
                                  );
                                  if (!sel) return null;
                                  const alreadyAssigned = (sel.managers || []).some((m) => m.id === manageUser.id);
                                  const otherManagers = (sel.managers || []).filter((m) => m.id !== manageUser.id);
                                  return (
                                    <div className="text-xs text-amber-800">
                                      {alreadyAssigned ? (
                                        <>
                                          ✓ Already assigned to {manageUser.name}
                                        </>
                                      ) : otherManagers.length > 0 ? (
                                        <>
                                          📍 <strong>{sel.name}</strong> — also assigned to{" "}
                                          {otherManagers.map((m) => m.name).join(", ")}. Will add {manageUser.name} as additional manager.
                                        </>
                                      ) : (
                                        <>
                                          📍 <strong>{sel.name}</strong> —{" "}
                                          {sel.address}
                                        </>
                                      )}
                                    </div>
                                  );
                                })()}
                              </div>
                            )}

                            <button
                              onClick={handleAssignExisting}
                              disabled={!selectedPropertyId || manageLoading}
                              className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                            >
                              {manageLoading
                                ? "Assigning..."
                                : "Assign This Property"}
                            </button>
                          </>
                        )}
                      </div>
                    )}

                    {/* Option 2: Create new property */}
                    <a
                      href={`/admin/assign-property?userId=${manageUser.id}`}
                      className="w-full text-left rounded-lg border border-gray-200 p-4 hover:border-gray-300 hover:bg-gray-50 transition-colors block"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-semibold text-gray-900">
                            Search & create a new property
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            Search for an address on the map and create a new
                            property
                          </div>
                        </div>
                        <span className="text-gray-400 text-lg">→</span>
                      </div>
                    </a>
                  </div>
                </div>

                {/* Quick Actions Section */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
                    Account Actions
                  </h3>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() =>
                        handleResetPassword(
                          manageUser.id,
                          manageUser.name,
                          manageUser.phone_number,
                        )
                      }
                      disabled={resetLoadingId === manageUser.id}
                      className="w-full flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3 text-sm hover:bg-yellow-50 hover:border-yellow-200 transition-colors disabled:opacity-50"
                    >
                      <span className="font-medium text-gray-700">
                        🔑 Reset Password
                      </span>
                      <span className="text-xs text-gray-400">
                        {resetLoadingId === manageUser.id
                          ? "Resetting..."
                          : "Generate new temporary password"}
                      </span>
                    </button>

                    <button
                      onClick={() =>
                        handleDeleteUser(manageUser.id, manageUser.name)
                      }
                      className="w-full flex items-center justify-between rounded-lg border border-red-100 px-4 py-3 text-sm hover:bg-red-50 hover:border-red-200 transition-colors"
                    >
                      <span className="font-medium text-red-600">
                        🗑️ Delete User
                      </span>
                      <span className="text-xs text-gray-400">
                        Remove permanently
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="bg-gray-50 border-t border-gray-200 px-6 py-3 flex justify-end">
                <button
                  onClick={handleCloseManage}
                  className="rounded-lg bg-gray-200 px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Users Table */}
        <div className="overflow-hidden rounded-lg bg-white shadow">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Manager
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Assigned Properties
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Password
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {users.length === 0 ? (
                <tr>
                  <td
                    colSpan="5"
                    className="px-6 py-8 text-center text-gray-500"
                  >
                    No managers yet. Click "+ Add Manager" to create one.
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const isResetting = resetLoadingId === u.id;
                  return (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {u.name}
                        </div>
                        <div className="text-xs text-gray-400">
                          Created{" "}
                          {u.created_at
                            ? new Date(u.created_at).toLocaleDateString()
                            : "N/A"}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          📱 {u.phone_number}
                        </div>
                        {u.email && (
                          <div className="text-xs text-gray-500">
                            ✉️ {u.email}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {(u.properties || []).length > 0 ? (
                          <div className="space-y-1">
                            {(u.properties || []).map((p) => (
                              <div key={p.id}>
                                <div className="text-sm font-medium text-gray-900">{p.name}</div>
                                <div className="text-xs text-gray-400">{p.address}</div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500">
                            No properties
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        {u.is_temporary_password ? (
                          <span className="inline-flex rounded-full bg-orange-100 px-2 py-1 text-xs font-semibold text-orange-800">
                            ⏳ Temp Password
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-800">
                            ✓ Password Set
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <button
                          onClick={() => handleOpenManage(u)}
                          className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
                        >
                          Manage
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-6">
          <a
            href="/admin/dashboard"
            className="text-blue-600 hover:text-blue-700"
          >
            ← Back to Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
