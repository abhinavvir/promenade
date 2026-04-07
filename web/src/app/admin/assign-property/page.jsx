"use client";

import { useState, useEffect, useRef } from "react";
import {
  APIProvider,
  Map,
  Marker,
  useMapsLibrary,
} from "@vis.gl/react-google-maps";

function PlaceAutocomplete({ onPlaceSelect }) {
  const [placeAutocomplete, setPlaceAutocomplete] = useState(null);
  const inputRef = useRef(null);
  const places = useMapsLibrary("places");

  useEffect(() => {
    if (!places || !inputRef.current) return;

    const options = {
      fields: ["geometry", "name", "formatted_address"],
    };

    setPlaceAutocomplete(new places.Autocomplete(inputRef.current, options));
  }, [places]);

  useEffect(() => {
    if (!placeAutocomplete) return;

    placeAutocomplete.addListener("place_changed", () => {
      const place = placeAutocomplete.getPlace();
      onPlaceSelect(place);
    });
  }, [placeAutocomplete, onPlaceSelect]);

  return (
    <input
      ref={inputRef}
      type="text"
      placeholder="Search for an address..."
      className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-lg outline-none focus:border-[#357AFF] focus:ring-1 focus:ring-[#357AFF]"
    />
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
  const [mapCenter, setMapCenter] = useState({ lat: 40.7128, lng: -74.006 });
  const [mapZoom, setMapZoom] = useState(12);

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
      .catch(() => { window.location.href = "/account/signin"; });
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
    setMapCenter({ lat, lng });
    setMapZoom(16);
    setPropertyAddress(place.formatted_address || "");
    setPropertyName(place.name || "");
    setError(null);
  };

  const handleMapClick = (event) => {
    const lat = event.detail.latLng.lat;
    const lng = event.detail.latLng.lng;
    setSelectedLocation({ lat, lng });
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
          `✅ Success! Property "${propertyName}" assigned to manager. <a href="/admin/manage-users">Back to Manage Users</a>`,
        );
        // Reset form
        setPropertyName("");
        setPropertyAddress("");
        setSelectedLocation(null);
        setSelectedUserId("");
        setMapCenter({ lat: 40.7128, lng: -74.006 });
        setMapZoom(12);
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
            Search for an address or select a location on the map
          </p>

          <div className="grid gap-8 md:grid-cols-2">
            {/* Map Section */}
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  🔍 Search Address
                </label>
                <APIProvider
                  apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}
                >
                  <PlaceAutocomplete onPlaceSelect={handlePlaceSelect} />
                </APIProvider>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Or Click on Map
                </label>
                <div className="overflow-hidden rounded-lg border-2 border-gray-200 shadow-lg">
                  <APIProvider
                    apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}
                  >
                    <Map
                      style={{ width: "100%", height: "400px" }}
                      center={mapCenter}
                      zoom={mapZoom}
                      gestureHandling="greedy"
                      onClick={handleMapClick}
                    >
                      {selectedLocation && (
                        <Marker position={selectedLocation} />
                      )}
                    </Map>
                  </APIProvider>
                </div>
                {selectedLocation && (
                  <div className="mt-2 rounded-lg bg-blue-50 p-3 text-xs text-blue-700">
                    📍 Selected: {selectedLocation.lat.toFixed(6)},{" "}
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
                </div>

                {message && (
                  <div className="rounded-lg bg-green-50 p-4 text-sm text-green-600">
                    {message}
                  </div>
                )}

                {error && (
                  <div className="rounded-lg bg-red-50 p-4 text-sm text-red-500">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-lg bg-[#357AFF] px-4 py-3 text-base font-medium text-white transition-colors hover:bg-[#2E69DE] focus:outline-none focus:ring-2 focus:ring-[#357AFF] focus:ring-offset-2 disabled:opacity-50"
                >
                  {loading
                    ? "Creating Property..."
                    : "Create & Assign Property"}
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
