"use client";

import { useState, useEffect } from "react";
import useUser from "@/utils/useUser";

export default function AdminDashboard() {
  const { data: user, loading: userLoading } = useUser();
  const [logs, setLogs] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [stats, setStats] = useState({
    totalSignIns: 0,
    successfulSignIns: 0,
    failedSignIns: 0,
    activeManagers: 0,
  });

  // Export date range - default last 30 days
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    return d.toISOString().split("T")[0];
  });
  const [toDate, setToDate] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });

  useEffect(() => {
    if (userLoading) return;
    if (!user) {
      window.location.href = "/account/signin";
      return;
    }
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(({ user: me }) => {
        if (me?.role !== "admin") window.location.href = "/account/signin";
        else fetchData();
      })
      .catch(() => { window.location.href = "/account/signin"; });
  }, [user, userLoading]);

  const fetchData = async () => {
    try {
      setLoading(true);

      const [logsRes, usersRes] = await Promise.all([
        fetch("/api/admin/signin-logs?limit=100"),
        fetch("/api/admin/users"),
      ]);

      if (!logsRes.ok || !usersRes.ok) {
        throw new Error("Failed to fetch data");
      }

      const logsData = await logsRes.json();
      const usersData = await usersRes.json();

      setLogs(logsData.logs || []);
      setUsers(usersData.users || []);

      // Calculate stats
      const totalSignIns = logsData.logs.length;
      const successfulSignIns = logsData.logs.filter(
        (log) => log.sign_in_status === "success",
      ).length;
      const failedSignIns = totalSignIns - successfulSignIns;
      const activeManagers = usersData.users.filter(
        (u) => u.property_id,
      ).length;

      setStats({
        totalSignIns,
        successfulSignIns,
        failedSignIns,
        activeManagers,
      });
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "success":
        return "bg-green-100 text-green-800";
      case "failed_location_verification":
        return "bg-red-100 text-red-800";
      case "failed_user_not_found":
        return "bg-orange-100 text-orange-800";
      case "failed_no_property":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case "success":
        return "✓ Success";
      case "failed_location_verification":
        return "✗ Wrong Location";
      case "failed_user_not_found":
        return "✗ User Not Found";
      case "failed_no_property":
        return "✗ No Property";
      default:
        return status;
    }
  };

  const filteredLogs =
    selectedFilter === "all"
      ? logs
      : logs.filter((log) => log.sign_in_status === selectedFilter);

  // --- Export logic ---
  const getFilteredByDate = () => {
    return logs.filter((log) => {
      const logDate = new Date(log.created_at).toISOString().split("T")[0];
      return logDate >= fromDate && logDate <= toDate;
    });
  };

  const generateCSV = (data) => {
    const headers = [
      "Property Manager",
      "Email",
      "Date",
      "Time",
      "Property",
      "Status",
      "Distance (m)",
      "Latitude",
      "Longitude",
    ].join(",");

    const rows = data.map((log) => {
      const date = new Date(log.created_at);
      const dateStr = date.toLocaleDateString("en-US");
      const timeStr = date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });

      return [
        `"${log.user_name || "Unknown"}"`,
        `"${log.email || "N/A"}"`,
        dateStr,
        timeStr,
        `"${log.property_name || "N/A"}"`,
        log.sign_in_status === "success" ? "Success" : "Failed",
        log.distance_from_property
          ? Math.round(log.distance_from_property)
          : "N/A",
        log.latitude || "N/A",
        log.longitude || "N/A",
      ].join(",");
    });

    return [headers, ...rows].join("\n");
  };

  const downloadFile = (content, filename, mimeType) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const generatePDF = (data) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Please allow popups to generate PDF reports.");
      return;
    }
    const tableRows = data
      .map((log) => {
        const date = new Date(log.created_at);
        return `
        <tr>
          <td>${log.user_name || "Unknown"}</td>
          <td>${date.toLocaleDateString("en-US")}</td>
          <td>${date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })}</td>
          <td>${log.property_name || "N/A"}</td>
          <td>${log.sign_in_status === "success" ? "✓ Success" : "✗ Failed"}</td>
          <td>${log.distance_from_property ? Math.round(log.distance_from_property) + "m" : "N/A"}</td>
          <td>${log.latitude && log.longitude ? parseFloat(log.latitude).toFixed(4) + ", " + parseFloat(log.longitude).toFixed(4) : "N/A"}</td>
        </tr>
      `;
      })
      .join("");

    const html = `
      <html>
        <head>
          <title>Audit Logs ${fromDate} to ${toDate}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { text-align: center; color: #1F2937; }
            .meta { text-align: center; color: #6B7280; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 13px; }
            th, td { border: 1px solid #D1D5DB; padding: 8px 10px; text-align: left; }
            th { background-color: #2563EB; color: white; }
            tr:nth-child(even) { background-color: #F9FAFB; }
          </style>
        </head>
        <body>
          <h1>Audit Logs Report</h1>
          <p class="meta"><strong>Date Range:</strong> ${fromDate} to ${toDate} &nbsp;|&nbsp; <strong>Total Records:</strong> ${data.length}</p>
          <table>
            <thead>
              <tr>
                <th>Manager</th>
                <th>Date</th>
                <th>Time</th>
                <th>Property</th>
                <th>Status</th>
                <th>Distance</th>
                <th>Location</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 300);
  };

  const exportLogs = (format) => {
    const data = getFilteredByDate();

    if (data.length === 0) {
      alert("No logs found in the selected date range.");
      return;
    }

    if (format === "csv") {
      const csv = generateCSV(data);
      downloadFile(csv, `audit-logs-${fromDate}-to-${toDate}.csv`, "text/csv");
    } else if (format === "excel") {
      const csv = generateCSV(data);
      downloadFile(
        csv,
        `audit-logs-${fromDate}-to-${toDate}.xls`,
        "application/vnd.ms-excel",
      );
    } else if (format === "pdf") {
      generatePDF(data);
    }
  };

  if (userLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Admin Dashboard
            </h1>
            <p className="mt-2 text-gray-600">
              Property Manager Compliance & Sign-In Monitoring
            </p>
          </div>
          <div className="flex items-center gap-4">
            {user && (
              <div className="text-right">
                <div className="text-sm font-medium text-gray-900">
                  {user.name || user.email}
                </div>
                <div className="text-xs text-gray-500">Admin</div>
              </div>
            )}
            <a
              href="/account/logout"
              className="rounded-lg bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300"
            >
              Sign Out
            </a>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="mb-8 grid gap-4 grid-cols-2 md:grid-cols-4">
          <div className="rounded-lg bg-white p-6 shadow">
            <div className="text-sm font-medium text-gray-600">
              Total Sign-Ins
            </div>
            <div className="mt-2 text-3xl font-bold text-gray-900">
              {stats.totalSignIns}
            </div>
          </div>
          <div className="rounded-lg bg-white p-6 shadow">
            <div className="text-sm font-medium text-gray-600">Successful</div>
            <div className="mt-2 text-3xl font-bold text-green-600">
              {stats.successfulSignIns}
            </div>
          </div>
          <div className="rounded-lg bg-white p-6 shadow">
            <div className="text-sm font-medium text-gray-600">Failed</div>
            <div className="mt-2 text-3xl font-bold text-red-600">
              {stats.failedSignIns}
            </div>
          </div>
          <div className="rounded-lg bg-white p-6 shadow">
            <div className="text-sm font-medium text-gray-600">
              Managers with Properties
            </div>
            <div className="mt-2 text-3xl font-bold text-blue-600">
              {stats.activeManagers}
            </div>
            <div className="mt-1 text-xs text-gray-400">
              out of {users.filter((u) => u.role === "manager").length} total
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-6 flex flex-wrap gap-3">
          <a
            href="/admin/assign-property"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Assign Property
          </a>
          <a
            href="/admin/manage-users"
            className="rounded-lg bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-900"
          >
            Manage Users
          </a>
        </div>

        {/* Export Audit Logs */}
        <div className="mb-6 rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-bold text-gray-900">
            📥 Export Audit Logs
          </h2>

          <div className="flex flex-col gap-4 md:flex-row md:items-end">
            <div className="flex-1 min-w-0">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                From Date
              </label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            <div className="flex-1 min-w-0">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                To Date
              </label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={() => exportLogs("csv")}
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
              >
                📄 CSV
              </button>
              <button
                onClick={() => exportLogs("excel")}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                📊 Excel
              </button>
              <button
                onClick={() => exportLogs("pdf")}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                📑 PDF
              </button>
            </div>
          </div>
        </div>

        {/* Sign-In Logs */}
        <div className="rounded-lg bg-white shadow">
          <div className="border-b border-gray-200 p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                Sign-In Activity Logs
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedFilter("all")}
                  className={`rounded px-3 py-1 text-sm ${
                    selectedFilter === "all"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setSelectedFilter("success")}
                  className={`rounded px-3 py-1 text-sm ${
                    selectedFilter === "success"
                      ? "bg-green-600 text-white"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  Success
                </button>
                <button
                  onClick={() =>
                    setSelectedFilter("failed_location_verification")
                  }
                  className={`rounded px-3 py-1 text-sm ${
                    selectedFilter === "failed_location_verification"
                      ? "bg-red-600 text-white"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  Failed
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Manager
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Property
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Distance
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Location
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td
                      colSpan="6"
                      className="px-6 py-8 text-center text-gray-500"
                    >
                      No sign-in logs found
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="font-medium text-gray-900">
                          {log.user_name || "Unknown"}
                        </div>
                        <div className="text-gray-500">
                          {log.phone_number || log.email || "N/A"}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div className="font-medium">
                          {log.property_name || "N/A"}
                        </div>
                        <div className="text-xs text-gray-500">
                          {log.property_address || ""}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm">
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getStatusColor(
                            log.sign_in_status,
                          )}`}
                        >
                          {getStatusLabel(log.sign_in_status)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                        {log.distance_from_property
                          ? `${Math.round(log.distance_from_property)}m`
                          : "N/A"}
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-500">
                        {log.latitude && log.longitude
                          ? `${parseFloat(log.latitude).toFixed(
                              4,
                            )}, ${parseFloat(log.longitude).toFixed(4)}`
                          : "N/A"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
