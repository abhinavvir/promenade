"use client";

import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { useMapEvents } from "react-leaflet";

// We'll lazy load the entire map implementation
const LazyMap = lazy(() =>
  import("./components/PropertyMap").then((m) => ({ default: m.PropertyMap }))
);

function AddressSearch({ onPlaceSelect, onError }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const inputRef = useRef(null);
  const resultsRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (resultsRef.current && !resultsRef.current.contains(e.target) && !inputRef.current.contains(e.target)) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const searchAddress = async () => {
    if (!query.trim()) return;

    setSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`,
        {
          headers: {
            "User-Agent": "Promenade-Property-Manager",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Search failed");
      }

      const data = await response.json();
      setResults(data);
      setShowResults(true);
    } catch (err) {
      onError("Failed to search address. Please try again.");
      console.error("Nominatim error:", err);
    } finally {
      setSearching(false);
    }
  };

  const handleSelectPlace = (place) => {
    const lat = parseFloat(place.lat);
    const lon = parseFloat(place.lon);

    onPlaceSelect({
      geometry: {
        location: {
          lat: () => lat,
          lng: () => lon,
        },
      },
      formatted_address: place.display_name,
      name: place.display_name.split(",")[0],
    });

    setQuery(place.display_name);
    setShowResults(false);
    setResults([]);
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => results.length > 0 && setShowResults(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            searchAddress();
          }
        }}
        placeholder="Search for an address..."
        className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-lg outline-none focus:border-[#357AFF] focus:ring-1 focus:ring-[#357AFF]"
      />
      <button
        type="button"
        onClick={searchAddress}
        disabled={searching || !query.trim()}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg bg-blue-500 px-3 py-1.5 text-sm text-white hover:bg-blue-600 disabled:bg-gray-300"
      >
        {searching ? "..." : "🔍"}
      </button>

      {showResults && results.length > 0 && (
        <div
          ref={resultsRef}
          className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg"
        >
          {results.map((place, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSelectPlace(place)}
              className="w-full border-b border-gray-100 px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 last:border-0"
            >
              <div className="font-medium text-gray-900">{place.display_name.split(",")[0]}</div>
              <div className="truncate text-xs text-gray-500">{place.display_name}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AssignPropertyPage() {
  const [users, setUsers] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [propertyName, setPropertyName] = useState("");
  const [propertyAddress, setPropertyAddress] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchingUsers, setFetchingUsers] = useState(true);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [mapCenter, setMapCenter] = useState([40.7128, -74.006]);
  const [mapZoom, setMapZoom] = useState(12);
  const [mapKey, setMapKey] = useState(0);
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(({ user: me }) => {
        if (me?.role !== "admin") {
          window.location.href = "/account/signin";
        } else {
          fetchUsers();
          if (typeof window !== "undefined") {
            const params = new URLSearchParams(window.location.search);
            const userId = params.get("userId");
            if (userId) setSelectedUserId(userId);
          }
        }
      })
      .catch(() => {
        window.location.href = "/account/signin";
      });
  }, []);

  const fetchUsers = async () => {
    try {
      setFetchingUsers(true);
      const response = await fetch("/api/admin/users");

      if (!response.ok) {
        throw new Error("Failed to fetch users");
      }

      const data = await response.json();
      setUsers(data.users || []);

      if ((data.users || []).length === 0) {
        setError(
          "No managers found. Please create a manager account first via Manage Users.",
        );
      }
    } catch (err) {
      console.error("Error fetching users:", err);
      setError("Failed to load users. Please refresh the page.");
    } finally {
      setFetchingUsers(false);
    }
  };

  const handlePlaceSelect = (place) => {
    if (!place.geometry?.location) {
      setError("Could not find location for this place");
      return;
    }

    const lat = place.geometry.location.lat();
    const lng = place.geometry.location.lng();

    setSelectedLocation({ lat, lng });
    setMapCenter([lat, lng]);
    setMapZoom(16);
    setPropertyAddress(place.formatted_address || "");
    setPropertyName(place.name || "");
    setError(null);
    setMapKey((prev) => prev + 1);
  };

  const handleMapClick = (event) => {
    const lat = event.detail.latLng.lat;
    const lng = event.detail.latLng.lng;
    setSelectedLocation({ lat, lng });

    fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      {
        headers: {
          "User-Agent": "Promenade-Property-Manager",
        },
      }
    )
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setPropertyAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
        } else {
          setPropertyAddress(data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`);
        }
      })
      .catch(() => {
        setPropertyAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
      });

    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);

    if (!selectedLocation) {
      setError("Please select a location on the map");
      setLoading(false);
      return;
    }

    if (!propertyName || !propertyAddress || !selectedUserId) {
      setError("Please fill in all fields");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/properties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: propertyName,
          address: propertyAddress,
          latitude: selectedLocation.lat,
          longitude: selectedLocation.lng,
          managerId: parseInt(selectedUserId),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(
          `✅ Success! Property "${propertyName}" assigned to manager. <a href="/admin/manage-users" class="underline">Back to Manage Users</a>`,
        );
        setPropertyName("");
        setPropertyAddress("");
        setSelectedLocation(null);
        setSelectedUserId("");
        setMapCenter([40.7128, -74.006]);
        setMapZoom(12);
        setMapKey((prev) => prev + 1);
      } else {
        setError(data.error || "Failed to create property");
      }
    } catch (err) {
      console.error("Error creating property:", err);
      setError("Failed to create property. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (fetchingUsers) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="text-lg text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4 md:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6">
          <a
            href="/admin/manage-users"
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
          >
            ← Back to Manage Users
          </a>
        </div>

        <div className="rounded-2xl bg-white p-8 shadow-xl">
          <h1 className="mb-2 text-center text-3xl font-bold text-gray-800">
            Assign New Property
          </h1>
          <p className="mb-8 text-center text-sm text-gray-600">
            Search for an address or select a location on the map (powered by OpenStreetMap)
          </p>

          <div className="grid gap-8 md:grid-cols-2">
            {/* Map Section */}
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  🔍 Search Address
                </label>
                <AddressSearch onPlaceSelect={handlePlaceSelect} onError={setError} />
                <p className="mt-1 text-xs text-gray-500">
                  Powered by OpenStreetMap • Free geocoding
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Or Click on Map
                </label>
                <div className="overflow-hidden rounded-lg border-2 border-gray-200 shadow-lg">
                  {mapLoaded ? (
                    <Suspense
                      fallback={
                        <div
                          style={{ height: "400px", width: "100%" }}
                          className="flex items-center justify-center bg-gray-100"
                        >
                          Loading map...
                        </div>
                      }
                    >
                      <LazyMap
                        key={mapKey}
                        center={mapCenter}
                        zoom={mapZoom}
                        onClick={handleMapClick}
                        selectedLocation={selectedLocation}
                      />
                    </Suspense>
                  ) : (
                    <div
                      style={{ height: "400px", width: "100%" }}
                      className="flex items-center justify-center bg-gray-100"
                    >
                      <button
                        onClick={() => setMapLoaded(true)}
                        className="rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
                      >
                        Load Map
                      </button>
                    </div>
                  )}
                </div>
                {selectedLocation && (
                  <div className="mt-2 rounded-lg bg-blue-50 p-3 text-xs text-blue-700">
                    📍 Location selected: {selectedLocation.lat.toFixed(6)},{" "}
                    {selectedLocation.lng.toFixed(6)}
                  </div>
                )}
              </div>
            </div>

            {/* Form Section */}
            <div>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Property Name
                  </label>
                  <input
                    type="text"
                    value={propertyName}
                    onChange={(e) => setPropertyName(e.target.value)}
                    required
                    className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-lg outline-none focus:border-[#357AFF] focus:ring-1 focus:ring-[#357AFF]"
                    placeholder="e.g. Sunset Apartments"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Address / Label
                  </label>
                  <input
                    type="text"
                    value={propertyAddress}
                    onChange={(e) => setPropertyAddress(e.target.value)}
                    required
                    className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-lg outline-none focus:border-[#357AFF] focus:ring-1 focus:ring-[#357AFF]"
                    placeholder="e.g. 123 Ocean Drive, Miami Beach, FL"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Assign to Manager
                  </label>
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    required
                    className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-lg outline-none focus:border-[#357AFF] focus:ring-1 focus:ring-[#357AFF]"
                  >
                    <option value="">Select a manager...</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name || user.email}{" "}
                        {user.phone_number && `(${user.phone_number})`}
                      </option>
                    ))}
                  </select>
                  {users.length === 0 && (
                    <p className="text-xs text-amber-600">
                      No managers available.{" "}
                      <a href="/admin/manage-users" className="underline">
                        Create one here
                      </a>
                    </p>
                  )}
                </div>

                {message && (
                  <div
                    className="rounded-lg bg-green-50 p-4 text-sm text-green-600"
                    dangerouslySetInnerHTML={{ __html: message }}
                  />
                )}

                {error && (
                  <div className="rounded-lg bg-red-50 p-4 text-sm text-red-500">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || users.length === 0}
                  className="w-full rounded-lg bg-[#357AFF] px-4 py-3 text-base font-medium text-white transition-colors hover:bg-[#2E69DE] focus:outline-none focus:ring-2 focus:ring-[#357AFF] focus:ring-offset-2 disabled:opacity-50"
                >
                  {loading ? "Creating Property..." : "Create & Assign Property"}
                </button>
              </form>

              <div className="mt-6 rounded-lg bg-gray-50 p-4">
                <h3 className="mb-2 text-sm font-semibold text-gray-700">
                  💡 Instructions
                </h3>
                <ul className="space-y-1 text-xs text-gray-600">
                  <li>1. Search for an address or click on the map</li>
                  <li>2. Review and edit the property name and address</li>
                  <li>3. Select the manager to assign this property to</li>
                  <li>4. Click "Create & Assign Property"</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
