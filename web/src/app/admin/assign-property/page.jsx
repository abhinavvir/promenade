"use client";

import { useState, useEffect, useRef, lazy, Suspense } from "react";

// Lazy load the map component
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
  const searchTimeoutRef = useRef(null);

  // Close results when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (resultsRef.current && !resultsRef.current.contains(e.target) && !inputRef.current.contains(e.target)) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const searchAddress = async (searchQuery) => {
    if (!searchQuery.trim() || searchQuery.trim().length < 3) {
      setResults([]);
      setShowResults(false);
      return;
    }

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    setSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5&addressdetails=1`,
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
      console.error("Nominatim error:", err);
      // Don't show error for autocomplete, just silently fail
      setResults([]);
      setShowResults(false);
    } finally {
      setSearching(false);
    }
  };

  // Debounced search
  const handleChange = (text) => {
    setQuery(text);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      searchAddress(text);
    }, 300);
  };

  const handleSelectPlace = (place) => {
    const lat = parseFloat(place.lat);
    const lon = parseFloat(place.lon);

    onPlaceSelect({
      lat,
      lon,
      address: place.display_name,
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
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => {
          if (results.length > 0) setShowResults(true);
        }}
        placeholder="Start typing address..."
        autoComplete="off"
        className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-lg outline-none focus:border-[#357AFF] focus:ring-1 focus:ring-[#357AFF]"
      />
      {searching && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">
          Searching...
        </span>
      )}

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
              <div className="font-medium text-gray-900">
                {place.display_name.split(",")[0]}
              </div>
              <div className="truncate text-xs text-gray-500">{place.display_name}</div>
              <div className="mt-1 flex gap-2 text-xs text-gray-400">
                {place.address?.state && (
                  <span className="rounded bg-gray-100 px-1.5 py-0.5">
                    {place.address.state}
                  </span>
                )}
                {place.address?.country && (
                  <span className="rounded bg-gray-100 px-1.5 py-0.5">
                    {place.address.country}
                  </span>
                )}
              </div>
            </button>
          ))}
          {results.length === 0 && query.length >= 3 && !searching && (
            <div className="px-4 py-3 text-sm text-gray-500 text-center">
              No results found. Try a different search term.
            </div>
          )}
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
  const [gettingLocation, setGettingLocation] = useState(false);

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
    } catch (err) {
      console.error("Error fetching users:", err);
      // Don't show error for user fetch, just log it
      setUsers([]);
    } finally {
      setFetchingUsers(false);
    }
  };

  const handlePlaceSelect = (place) => {
    const { lat, lon, address } = place;

    setSelectedLocation({ lat, lon });
    setMapCenter([lat, lon]);
    setMapZoom(16);
    setPropertyAddress(address);
    setError(null);
    setMapKey((prev) => prev + 1);
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      return;
    }

    setGettingLocation(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;

        setSelectedLocation({ lat: latitude, lng: longitude });
        setMapCenter([latitude, longitude]);
        setMapZoom(16);

        // Only update lat/lon - don't touch address or name
        setError(null);
        setGettingLocation(false);
      },
      (err) => {
        console.error("Geolocation error:", err);
        setError(
          "Unable to get your location. Please enable location permissions or search for an address manually."
        );
        setGettingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const handleMapClick = (event) => {
    const lat = event.detail.latLng.lat;
    const lng = event.detail.latLng.lng;
    setSelectedLocation({ lat, lng });

    // Don't auto-fill address from map click - only get lat/lon
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);

    if (!selectedLocation) {
      setError("Please select a location using 'Get My Location', map click, or address search.");
      setLoading(false);
      return;
    }

    if (!propertyName.trim()) {
      setError("Please enter a property name.");
      setLoading(false);
      return;
    }

    if (!propertyAddress.trim()) {
      setError("Please enter an address.");
      setLoading(false);
      return;
    }

    // Manager is now optional
    if (selectedUserId) {
      // Has manager - assign property
      try {
        const response = await fetch("/api/properties", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: propertyName.trim(),
            address: propertyAddress.trim(),
            latitude: selectedLocation.lat,
            longitude: selectedLocation.lng,
            managerId: parseInt(selectedUserId),
          }),
        });

        const data = await response.json();

        if (response.ok) {
          setMessage(
            `✅ Success! Property "${propertyName}" created and assigned to manager. <a href="/admin/manage-users" class="underline">Back to Manage Users</a>`
          );
          resetForm();
        } else {
          setError(data.error || "Failed to create property");
        }
      } catch (err) {
        console.error("Error creating property:", err);
        setError("Failed to create property. Please try again.");
      }
    } else {
      // No manager - create property without assignment
      try {
        const response = await fetch("/api/properties", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: propertyName.trim(),
            address: propertyAddress.trim(),
            latitude: selectedLocation.lat,
            longitude: selectedLocation.lng,
            // No managerId - property will be unassigned
          }),
        });

        const data = await response.json();

        if (response.ok) {
          setMessage(
            `✅ Success! Property "${propertyName}" created (no manager assigned). <a href="/admin/manage-users" class="underline">Manage Users</a> to assign managers.`
          );
          resetForm();
        } else {
          setError(data.error || "Failed to create property");
        }
      } catch (err) {
        console.error("Error creating property:", err);
        setError("Failed to create property. Please try again.");
      }
    }

    setLoading(false);
  };

  const resetForm = () => {
    setPropertyName("");
    setPropertyAddress("");
    setSelectedLocation(null);
    setSelectedUserId("");
    setMapCenter([40.7128, -74.006]);
    setMapZoom(12);
    setMapKey((prev) => prev + 1);
    setMessage(null);
    setError(null);
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
            Add New Property
          </h1>
          <p className="mb-8 text-center text-sm text-gray-600">
            Add a property to your portfolio. Assign to a manager now or later.
          </p>

          <div className="grid gap-8 md:grid-cols-2">
            {/* Map Section */}
            <div className="space-y-4">
              <div className="space-y-3">
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  📍 Get My Location
                </label>
                <button
                  type="button"
                  onClick={handleGetCurrentLocation}
                  disabled={gettingLocation}
                  className="w-full rounded-lg border-2 border-dashed border-blue-300 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-600 hover:bg-blue-100 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {gettingLocation ? (
                    <>
                      <span className="inline-block animate-spin mr-2">🔄</span>
                      Getting location...
                    </>
                  ) : (
                    <>
                      <span className="mr-2">📍</span>
                      Update my location (latitude & longitude only)
                    </>
                  )}
                </button>
                <p className="text-xs text-gray-500">
                  Uses your browser's geolocation • Auto-fills coordinates only
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  🔍 Search Address (auto-fills all fields)
                </label>
                <AddressSearch onPlaceSelect={handlePlaceSelect} onError={setError} />
                <p className="mt-1 text-xs text-gray-500">
                  Powered by OpenStreetMap • Start typing to see suggestions
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Or Click on Map (sets coordinates only)
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
                    📍 Coordinates: {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
                  </div>
                )}
              </div>
            </div>

            {/* Form Section */}
            <div>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Property Name <span className="text-red-500">*</span>
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
                    Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={propertyAddress}
                    onChange={(e) => setPropertyAddress(e.target.value)}
                    required
                    className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-lg outline-none focus:border-[#357AFF] focus:ring-1 focus:ring-[#357AFF]"
                    placeholder="e.g. 123 Ocean Drive, Miami Beach, FL"
                  />
                  <p className="text-xs text-gray-500">
                    Type to search, use "Get My Location", or click on map
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Assign to Manager <span className="text-gray-400">(optional)</span>
                  </label>
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-lg outline-none focus:border-[#357AFF] focus:ring-1 focus:ring-[#357AFF]"
                  >
                    <option value="">Skip for now (unassigned property)</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name || user.email}{" "}
                        {user.phone_number && `(${user.phone_number})`}
                      </option>
                    ))}
                  </select>
                  {users.length === 0 && (
                    <p className="text-xs text-amber-600">
                      No managers available. Property will be unassigned.
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
                  disabled={loading || !selectedLocation}
                  className="w-full rounded-lg bg-[#357AFF] px-4 py-3 text-base font-medium text-white transition-colors hover:bg-[#2E69DE] focus:outline-none focus:ring-2 focus:ring-[#357AFF] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Creating Property..." : "Create Property"}
                </button>
              </form>

              <div className="mt-6 rounded-lg bg-gray-50 p-4">
                <h3 className="mb-2 text-sm font-semibold text-gray-700">
                  💡 Instructions
                </h3>
                <ul className="space-y-1 text-xs text-gray-600">
                  <li>1. "Get My Location" - auto-fills coordinates only</li>
                  <li>2. Search address - auto-fills all fields including name</li>
                  <li>3. Click on map - sets coordinates only</li>
                  <li>4. Enter property name manually (required)</li>
                  <li>5. Optionally assign to a manager</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
