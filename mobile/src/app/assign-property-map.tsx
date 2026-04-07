import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  AlertCircle,
  Building2,
  ChevronLeft,
  MapPin,
  Plus,
  Search,
  X,
} from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Use react-native-maps with OpenStreetMap (no API key needed)
import MapView, { Marker, PROVIDER_DEFAULT } from "react-native-maps";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useTheme, brandColors } from "@/components/hooks/useTheme";
import { Badge } from "@/components/ui";
import { radius, spacing, typography } from "@/lib/design/tokens";

// Initial region
const INITIAL_REGION = {
  latitude: 40.7128,
  longitude: -74.006,
  latitudeDelta: 0.0922,
  longitudeDelta: 0.0421,
};

// Custom OpenStreetMap tile overlay
const OSMTileOverlay = () => null;

export default function AssignPropertyMapScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  // Map and location state
  const [region, setRegion] = useState(INITIAL_REGION);
  const [selectedCoordinate, setSelectedCoordinate] = useState(null);
  const [mapReady, setMapReady] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searching, setSearching] = useState(false);
  const searchTimeoutRef = useRef(null);

  // Property form state
  const [showAddModal, setShowAddModal] = useState(false);
  const [propName, setPropName] = useState("");
  const [propAddress, setPropAddress] = useState("");
  const [propLat, setPropLat] = useState("");
  const [propLng, setPropLng] = useState("");
  const [selectedManagerId, setSelectedManagerId] = useState(null);
  const [addError, setAddError] = useState("");

  const { data: propsData, isLoading: propsLoading, refetch } = useQuery({
    queryKey: ["all-properties"],
    queryFn: () => api.get("/api/properties?all=true"),
  });

  const { data: usersData } = useQuery({
    queryKey: ["admin-users-assign"],
    queryFn: () => api.get("/api/admin/users"),
  });

  const properties = propsData?.properties || [];
  const managers = usersData?.users || [];

  const createMutation = useMutation({
    mutationFn: () => {
      const body = {
        name: propName.trim(),
        address: propAddress.trim(),
        latitude: parseFloat(propLat),
        longitude: parseFloat(propLng),
      };

      if (selectedManagerId) {
        body.managerId = selectedManagerId;
      }

      return api.post("/api/properties", body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-properties"] });
      setShowAddModal(false);
      resetForm();
    },
    onError: (e) => setAddError(e?.message || "Failed to create property"),
  });

  const deleteMutation = useMutation({
    mutationFn: (propertyId) => api.delete(`/api/properties?propertyId=${propertyId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["all-properties"] }),
    onError: (e) => Alert.alert("Error", e?.message || "Failed to delete property"),
  });

  const assignMutation = useMutation({
    mutationFn: ({ propertyId, managerId }) =>
      api.patch("/api/properties", { propertyId, managerId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["all-properties"] }),
    onError: (e) => Alert.alert("Error", e?.message || "Failed to assign manager"),
  });

  // Search address using Nominatim
  const searchAddress = async (query) => {
    if (!query.trim() || query.trim().length < 3) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    setSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          query
        )}&limit=5&addressdetails=1`,
        {
          headers: {
            "User-Agent": "Promenade-Mobile-App",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Search failed");
      }

      const data = await response.json();
      setSearchResults(data);
      setShowSearchResults(true);
    } catch (err) {
      console.error("Nominatim error:", err);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleAddressChange = (text) => {
    setSearchQuery(text);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      searchAddress(text);
    }, 300);
  };

  const selectSearchResult = (place) => {
    const lat = parseFloat(place.lat);
    const lon = parseFloat(place.lon);

    // Update map region
    setRegion({
      latitude: lat,
      longitude: lon,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    });

    // Set selected coordinate
    setSelectedCoordinate({
      latitude: lat,
      longitude: lon,
    });

    // Auto-fill form
    setPropLat(lat.toString());
    setPropLng(lon.toString());
    setPropAddress(place.display_name);

    // Extract property name
    const nameParts = place.display_name.split(",");
    setPropName(nameParts[0]?.trim() || "");

    // Clear search and hide keyboard
    setSearchQuery(place.display_name);
    setShowSearchResults(false);
    setSearchResults([]);
    Keyboard.dismiss();
  };

  const handleMapLongPress = (coordinate) => {
    setSelectedCoordinate(coordinate);
    setPropLat(coordinate.latitude.toString());
    setPropLng(coordinate.longitude.toString());

    // Reverse geocode to get address
    fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coordinate.latitude}&lon=${coordinate.longitude}&addressdetails=1`,
      {
        headers: {
          "User-Agent": "Promenade-Mobile-App",
        },
      }
    )
      .then((res) => res.json())
      .then((data) => {
        if (data.display_name) {
          setPropAddress(data.display_name);
          const nameParts = data.display_name.split(",");
          if (!propName) {
            setPropName(nameParts[0]?.trim() || "");
          }
        }
      })
      .catch((err) => {
        console.error("Reverse geocode error:", err);
      });
  };

  const resetForm = () => {
    setPropName("");
    setPropAddress("");
    setPropLat("");
    setPropLng("");
    setSelectedManagerId(null);
    setAddError("");
    setSelectedCoordinate(null);
  };

  const handleCreate = () => {
    setAddError("");

    if (!propName.trim()) {
      setAddError("Property name is required");
      return;
    }

    if (!propAddress.trim()) {
      setAddError("Address is required");
      return;
    }

    if (!propLat || !propLng) {
      setAddError("Please search for an address or tap on the map to set location");
      return;
    }

    createMutation.mutate();
  };

  const confirmDelete = (property) => {
    Alert.alert(
      "Delete Property",
      `Are you sure you want to delete "${property.name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => deleteMutation.mutate(property.id) },
      ]
    );
  };

  const renderProperty = ({ item: property }) => (
    <View
      style={{
        backgroundColor: colors.cardBackground,
        borderRadius: radius.xl,
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: spacing.md,
        padding: spacing.xl,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
        <LinearGradient
          colors={[brandColors.gradientStart, brandColors.gradientEnd]}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            alignItems: "center",
            justifyContent: "center",
            marginRight: spacing.md,
          }}
        >
          <Building2 size={16} color="#FFFFFF" strokeWidth={2} />
        </LinearGradient>

        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: typography.sizes.md,
              fontWeight: typography.weights.semibold,
              color: colors.text,
              marginBottom: 2,
            }}
          >
            {property.name}
          </Text>
          <View
            style={{ flexDirection: "row", alignItems: "center", gap: 4, marginBottom: spacing.sm }}
          >
            <MapPin size={11} color={colors.secondaryText} strokeWidth={1.5} />
            <Text
              style={{ fontSize: typography.sizes.xs, color: colors.secondaryText, flex: 1 }}
              numberOfLines={1}
            >
              {property.address}
            </Text>
          </View>

          {property.manager_name ? (
            <Badge label={`Manager: ${property.manager_name}`} variant="success" size="sm" />
          ) : (
            <Badge label="Unassigned" variant="neutral" size="sm" />
          )}
        </View>

        <TouchableOpacity
          onPress={() => confirmDelete(property)}
          activeOpacity={0.8}
          style={{ padding: spacing.xs, marginLeft: spacing.sm }}
        >
          <Trash2 size={16} color={brandColors.error} strokeWidth={1.5} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style={isDark ? "light" : "dark"} />

      {/* Map View with OpenStreetMap */}
      <MapView
        style={{ flex: 1 }}
        provider={PROVIDER_DEFAULT}
        region={region}
        onRegionChangeComplete={setRegion}
        onMapReady={() => setMapReady(true)}
        onLongPress={(e) => handleMapLongPress(e.nativeEvent.coordinate)}
        initialRegion={INITIAL_REGION}
        mapType="standard"
      >
        {/* Selected location marker */}
        {selectedCoordinate && (
          <Marker
            coordinate={selectedCoordinate}
            title={propName || "Selected Location"}
            description={propAddress || ""}
            pinColor={brandColors.accentStart}
          />
        )}

        {/* Property markers */}
        {properties.map((property) => (
          <Marker
            key={property.id}
            coordinate={{
              latitude: property.latitude,
              longitude: property.longitude,
            }}
            title={property.name}
            description={property.address}
          />
        ))}
      </MapView>

      {/* Search Bar Overlay - Floating on Top of Map */}
      <View
        style={{
          position: "absolute",
          top: insets.top + spacing.md,
          left: spacing.md,
          right: spacing.md,
          zIndex: 1000,
        }}
      >
        {/* Back button */}
        <TouchableOpacity
          onPress={() => router.back()}
          activeOpacity={0.8}
          style={{
            backgroundColor: isDark ? "rgba(0,0,0,0.7)" : "rgba(255,255,255,0.9)",
            borderRadius: 20,
            width: 40,
            height: 40,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: spacing.sm,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 4,
            elevation: 5,
          }}
          hitSlop={8}
        >
          <ChevronLeft size={24} color={brandColors.accentStart} strokeWidth={2} />
        </TouchableOpacity>

        {/* Search Input Container */}
        <View style={{ position: "relative", zIndex: 1001 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: isDark ? "rgba(0,0,0,0.8)" : "rgba(255,255,255,0.95)",
              borderRadius: radius.lg,
              borderWidth: 1,
              borderColor: colors.border,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 4,
              elevation: 5,
            }}
          >
            <Search size={18} color={colors.secondaryText} strokeWidth={2} />
            <TextInput
              style={{
                flex: 1,
                marginLeft: spacing.sm,
                fontSize: typography.sizes.md,
                color: colors.text,
              }}
              value={searchQuery}
              onChangeText={handleAddressChange}
              onFocus={() => {
                if (searchResults.length > 0) setShowSearchResults(true);
              }}
              placeholder="Search for an address..."
              placeholderTextColor={colors.placeholderText}
              autoCorrect={false}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  setSearchQuery("");
                  setSearchResults([]);
                  setShowSearchResults(false);
                }}
                hitSlop={8}
              >
                <X size={16} color={colors.secondaryText} strokeWidth={2} />
              </TouchableOpacity>
            )}
          </View>

          {/* Searching indicator */}
          {searching && (
            <View
              style={{
                position: "absolute",
                right: spacing.lg,
                top: "50%",
                marginTop: -10,
              }}
            >
              <ActivityIndicator size="small" color={brandColors.accentStart} />
            </View>
          )}

          {/* Search Results Dropdown */}
          {showSearchResults && searchResults.length > 0 && (
            <View
              style={{
                backgroundColor: isDark ? "rgba(0,0,0,0.95)" : "rgba(255,255,255,0.98)",
                borderRadius: radius.lg,
                borderWidth: 1,
                borderColor: colors.border,
                maxHeight: 300,
                marginTop: spacing.xs,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 10,
              }}
            >
              <FlatList
                data={searchResults}
                keyExtractor={(item, index) => `result-${index}`}
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() => selectSearchResult(item)}
                    style={{
                      paddingVertical: spacing.md,
                      paddingHorizontal: spacing.lg,
                      borderBottomWidth: 1,
                      borderBottomColor: colors.border,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: typography.sizes.sm,
                        fontWeight: typography.weights.semibold,
                        color: colors.text,
                        marginBottom: 2,
                      }}
                    >
                      {item.display_name.split(",")[0]}
                    </Text>
                    <Text
                      style={{
                        fontSize: typography.sizes.xs,
                        color: colors.secondaryText,
                      }}
                      numberOfLines={2}
                    >
                      {item.display_name}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          )}
        </View>

        {/* Instructions */}
        <View
          style={{
            backgroundColor: isDark ? "rgba(0,0,0,0.7)" : "rgba(255,255,255,0.9)",
            borderRadius: radius.md,
            padding: spacing.md,
            marginTop: spacing.sm,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Text style={{ fontSize: typography.sizes.xs, color: colors.text }}>
            💡 <Text style={{ fontWeight: typography.weights.semibold }}>Search</Text> for address or <Text style={{ fontWeight: typography.weights.semibold }}>long-press</Text> map to set location
          </Text>
        </View>
      </View>

      {/* Add Property Floating Button */}
      {selectedCoordinate && (
        <TouchableOpacity
          onPress={() => setShowAddModal(true)}
          activeOpacity={0.85}
          style={{
            position: "absolute",
            bottom: insets.bottom + spacing.xl,
            right: spacing.xl,
            backgroundColor: brandColors.accentStart,
            borderRadius: 30,
            width: 60,
            height: 60,
            alignItems: "center",
            justifyContent: "center",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 10,
            zIndex: 999,
          }}
        >
          <Plus size={24} color="#FFFFFF" strokeWidth={2.5} />
        </TouchableOpacity>
      )}

      {/* Properties List (Bottom Sheet) */}
      {!selectedCoordinate && properties.length > 0 && (
        <View
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            maxHeight: "35%",
            backgroundColor: colors.cardBackground,
            borderTopLeftRadius: radius.xl,
            borderTopRightRadius: radius.xl,
            borderWidth: 1,
            borderTopWidth: 1,
            borderColor: colors.border,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 10,
            zIndex: 999,
          }}
        >
          <View
            style={{
              padding: spacing.md,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
            }}
          >
            <Text
              style={{
                fontSize: typography.sizes.lg,
                fontWeight: typography.weights.bold,
                color: colors.text,
              }}
            >
              Properties ({properties.length})
            </Text>
          </View>
          <FlatList
            data={properties}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderProperty}
            contentContainerStyle={{ padding: spacing.md, paddingBottom: insets.bottom + spacing.xl }}
          />
        </View>
      )}

      {/* Empty State */}
      {!selectedCoordinate && properties.length === 0 && (
        <View
          style={{
            position: "absolute",
            bottom: insets.bottom + spacing.xl,
            left: spacing.xl,
            right: spacing.xl,
            alignItems: "center",
          }}
        >
          <Text style={{ fontSize: typography.sizes.md, color: colors.text, textAlign: "center" }}>
            Search for an address or long-press on the map to add your first property
          </Text>
        </View>
      )}

      {/* Add Property Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddModal(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: colors.background,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                padding: spacing["2xl"],
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
              }}
            >
              <Text
                style={{
                  fontSize: typography.sizes.xl,
                  fontWeight: typography.weights.bold,
                  color: colors.text,
                }}
              >
                Add Property
              </Text>
              <TouchableOpacity
                onPress={() => setShowAddModal(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={22} color={colors.secondaryText} strokeWidth={2} />
              </TouchableOpacity>
            </View>

            <ScrollView
              contentContainerStyle={{ padding: spacing["2xl"] }}
              keyboardShouldPersistTaps="handled"
            >
              {addError ? (
                <View
                  style={{
                    backgroundColor: colors.errorBg,
                    borderRadius: radius.md,
                    padding: spacing.lg,
                    marginBottom: spacing.xl,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: spacing.sm,
                  }}
                >
                  <AlertCircle size={16} color={brandColors.error} strokeWidth={2} />
                  <Text style={{ fontSize: typography.sizes.sm, color: brandColors.error, flex: 1 }}>
                    {addError}
                  </Text>
                </View>
              ) : null}

              {/* Property Name */}
              <View style={{ marginBottom: spacing.lg }}>
                <Text style={labelStyle}>Property Name *</Text>
                <TextInput
                  value={propName}
                  onChangeText={setPropName}
                  placeholder="e.g. Sunrise Apartments"
                  placeholderTextColor={colors.placeholderText}
                  style={[
                    inputStyle,
                    {
                      color: colors.text,
                      backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.03)",
                      borderColor: colors.border,
                    },
                  ]}
                />
              </View>

              {/* Address (Read-only, set from map) */}
              <View style={{ marginBottom: spacing.lg }}>
                <Text style={labelStyle}>Address *</Text>
                <TextInput
                  value={propAddress}
                  editable={false}
                  placeholder="Search or long-press on map"
                  placeholderTextColor={colors.placeholderText}
                  style={[
                    inputStyle,
                    {
                      color: colors.secondaryText,
                      backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
                      borderColor: colors.border,
                    },
                  ]}
                />
                <Text style={{ fontSize: typography.sizes.xs, color: colors.secondaryText, marginTop: 4 }}>
                  Auto-filled from map search or long-press
                </Text>
              </View>

              {/* Coordinates (Read-only, for reference) */}
              <View style={{ marginBottom: spacing.lg }}>
                <Text style={labelStyle}>Location</Text>
                <View
                  style={{
                    flexDirection: "row",
                    gap: spacing.md,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: typography.sizes.xs, color: colors.secondaryText, marginBottom: 4 }}>
                      Latitude
                    </Text>
                    <TextInput
                      value={propLat}
                      editable={false}
                      style={[
                        inputStyle,
                        {
                          color: colors.secondaryText,
                          backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
                          borderColor: colors.border,
                        },
                      ]}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: typography.sizes.xs, color: colors.secondaryText, marginBottom: 4 }}>
                      Longitude
                    </Text>
                    <TextInput
                      value={propLng}
                      editable={false}
                      style={[
                        inputStyle,
                        {
                          color: colors.secondaryText,
                          backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
                          borderColor: colors.border,
                        },
                      ]}
                    />
                  </View>
                </View>
              </View>

              {/* Manager Selection */}
              <Text style={[labelStyle, { marginBottom: spacing.sm }]}>
                Assign to Manager (optional)
              </Text>

              {managers.length === 0 ? (
                <View
                  style={{
                    backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
                    borderRadius: radius.md,
                    padding: spacing.lg,
                    marginBottom: spacing.xl,
                  }}
                >
                  <Text style={{ fontSize: typography.sizes.sm, color: colors.secondaryText }}>
                    No managers available. Property will be created unassigned.
                  </Text>
                </View>
              ) : (
                <>
                  <TouchableOpacity
                    onPress={() => setSelectedManagerId(null)}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      padding: spacing.lg,
                      borderRadius: radius.md,
                      borderWidth: 1,
                      borderColor: colors.border,
                      marginBottom: spacing.sm,
                    }}
                  >
                    <View
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 10,
                        borderWidth: 2,
                        borderColor: colors.border,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    />
                    <Text style={{ fontSize: typography.sizes.md, color: colors.text, marginLeft: spacing.md }}>
                      Skip (unassigned)
                    </Text>
                  </TouchableOpacity>

                  {managers.map((m) => (
                    <TouchableOpacity
                      key={m.id}
                      onPress={() => setSelectedManagerId(m.id)}
                      activeOpacity={0.8}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        padding: spacing.lg,
                        borderRadius: radius.md,
                        borderWidth: 1,
                        borderColor: selectedManagerId === m.id ? brandColors.accentStart : colors.border,
                        backgroundColor:
                          selectedManagerId === m.id ? `${brandColors.accentStart}12` : "transparent",
                        marginBottom: spacing.sm,
                        gap: spacing.md,
                      }}
                    >
                      <View
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: 10,
                          borderWidth: 2,
                          borderColor: selectedManagerId === m.id ? brandColors.accentStart : colors.border,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {selectedManagerId === m.id && (
                          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: brandColors.accentStart }} />
                        )}
                      </View>
                      <View>
                        <Text
                          style={{ fontSize: typography.sizes.md, fontWeight: typography.weights.medium, color: colors.text }}
                        >
                          {m.name}
                        </Text>
                        <Text style={{ fontSize: typography.sizes.xs, color: colors.secondaryText }}>
                          {m.phone_number}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </>
              )}

              <TouchableOpacity
                onPress={handleCreate}
                disabled={createMutation.isPending}
                activeOpacity={0.85}
                style={{ marginTop: spacing.xl }}
              >
                <LinearGradient
                  colors={[brandColors.accentStart, brandColors.accentEnd]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{
                    paddingVertical: 17,
                    borderRadius: radius.lg,
                    alignItems: "center",
                    opacity: createMutation.isPending ? 0.5 : 1,
                  }}
                >
                  {createMutation.isPending ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text
                      style={{ fontSize: typography.sizes.lg, fontWeight: typography.weights.semibold, color: "#FFFFFF" }}
                    >
                      Create Property
                    </Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const labelStyle = {
  fontSize: typography.sizes.xs,
  fontWeight: typography.weights.semibold,
  letterSpacing: 0.5,
  textTransform: "uppercase",
  color: "rgba(139,149,163,1)",
  marginBottom: 6,
};

const inputStyle = {
  borderRadius: radius.md,
  borderWidth: 1,
  paddingHorizontal: spacing.lg,
  paddingVertical: spacing.md,
  fontSize: typography.sizes.md,
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
});
