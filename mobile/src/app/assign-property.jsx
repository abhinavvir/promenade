import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as Location from "expo-location";
import {
  AlertCircle,
  Building2,
  ChevronLeft,
  Locate,
  MapPin,
  Plus,
  Trash2,
  User,
  X,
} from "lucide-react-native";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useTheme, brandColors } from "@/components/hooks/useTheme";
import { Badge } from "@/components/ui";
import { radius, spacing, typography } from "@/lib/design/tokens";

export default function AssignPropertyScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [showAddModal, setShowAddModal] = useState(false);
  const [propName, setPropName] = useState("");
  const [propAddress, setPropAddress] = useState("");
  const [propLat, setPropLat] = useState("");
  const [propLng, setPropLng] = useState("");
  const [selectedManagerId, setSelectedManagerId] = useState(null);
  const [addError, setAddError] = useState("");
  const [gettingLocation, setGettingLocation] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const { data: propsData, isLoading: propsLoading, refetch, isRefetching } = useQuery({
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
    mutationFn: () =>
      api.post("/api/properties", {
        name: propName,
        address: propAddress,
        latitude: parseFloat(propLat),
        longitude: parseFloat(propLng),
        managerId: selectedManagerId,
      }),
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

  const resetForm = () => {
    setPropName("");
    setPropAddress("");
    setPropLat("");
    setPropLng("");
    setSelectedManagerId(null);
    setAddError("");
    setShowAdvanced(false);
  };

  const getCurrentLocation = async () => {
    setGettingLocation(true);
    setAddError("");

    try {
      // Request location permission
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        setAddError("Location permission is required to get your current position.");
        setGettingLocation(false);
        return;
      }

      // Get current location
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const lat = location.coords.latitude;
      const lng = location.coords.longitude;

      setPropLat(lat.toString());
      setPropLng(lng.toString());

      // Reverse geocode to get address
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
          {
            headers: {
              "User-Agent": "Promenade-Mobile-App",
            },
          }
        );
        const data = await response.json();

        if (data.display_name) {
          setPropAddress(data.display_name);
        } else {
          setPropAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
        }

        if (!propName.trim()) {
          setPropName(data.display_name?.split(",")?.[0]?.trim() || "New Property");
        }
      } catch (geocodeError) {
        // Geocode failed, but we have coordinates
        setPropAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
        console.warn("Geocoding failed:", geocodeError);
      }

      setAddError("");
    } catch (error) {
      console.error("Location error:", error);
      setAddError("Failed to get location. Please check your GPS settings.");
    } finally {
      setGettingLocation(false);
    }
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

    if (!propLat || !propLng || isNaN(parseFloat(propLat)) || isNaN(parseFloat(propLng))) {
      setAddError("Please use 'Get My Location' or enter coordinates in Advanced");
      return;
    }

    if (!selectedManagerId) {
      setAddError("Please select a manager");
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

      {/* Header */}
      <LinearGradient
        colors={[brandColors.gradientStart, brandColors.gradientMid]}
        style={{
          paddingTop: insets.top + spacing.md,
          paddingBottom: spacing["2xl"],
          paddingHorizontal: spacing["2xl"],
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.8}
            style={{ marginRight: spacing.md }}
          >
            <ChevronLeft size={24} color="#F0EDE8" strokeWidth={2} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: typography.sizes["2xl"],
                fontWeight: typography.weights.bold,
                color: "#F0EDE8",
                letterSpacing: -0.5,
              }}
            >
              Properties
            </Text>
            <Text
              style={{ fontSize: typography.sizes.sm, color: "rgba(240,237,232,0.55)", marginTop: 2 }}
            >
              {properties.length} properties
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              resetForm();
              setShowAddModal(true);
            }}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={[brandColors.accentStart, brandColors.accentEnd]}
              style={{ width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" }}
            >
              <Plus size={20} color="#FFFFFF" strokeWidth={2.5} />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {propsLoading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color={brandColors.gradientStart} />
        </View>
      ) : (
        <FlatList
          data={properties}
          keyExtractor={(p) => String(p.id)}
          renderItem={renderProperty}
          contentContainerStyle={{ padding: spacing.xl, paddingBottom: insets.bottom + spacing["4xl"] }}
          refreshing={isRefetching}
          onRefresh={refetch}
          ListEmptyComponent={() => (
            <View style={{ alignItems: "center", paddingTop: spacing["5xl"] }}>
              <Building2 size={48} color={colors.emptyStateIcon} strokeWidth={1} />
              <Text
                style={{
                  fontSize: typography.sizes.lg,
                  fontWeight: typography.weights.semibold,
                  color: colors.text,
                  marginTop: spacing.xl,
                  marginBottom: spacing.sm,
                }}
              >
                No Properties Yet
              </Text>
              <Text
                style={{ fontSize: typography.sizes.sm, color: colors.secondaryText, textAlign: "center" }}
              >
                Tap + to add the first property
              </Text>
            </View>
          )}
        />
      )}

      {/* Add Property Modal */}
      <Modal visible={showAddModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowAddModal(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <View style={{ flex: 1, backgroundColor: colors.background }}>
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

            <ScrollView contentContainerStyle={{ padding: spacing["2xl"] }} keyboardShouldPersistTaps="handled">
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

              {/* Get Location Button */}
              <TouchableOpacity
                onPress={getCurrentLocation}
                disabled={gettingLocation}
                activeOpacity={0.8}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: spacing.sm,
                  backgroundColor: gettingLocation ? `${brandColors.accentStart}40` : brandColors.accentStart,
                  paddingVertical: spacing.lg,
                  borderRadius: radius.lg,
                  marginBottom: spacing.xl,
                }}
              >
                {gettingLocation ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Locate size={20} color="#FFFFFF" strokeWidth={2} />
                    <Text
                      style={{
                        fontSize: typography.sizes.md,
                        fontWeight: typography.weights.semibold,
                        color: "#FFFFFF",
                      }}
                    >
                      {propLat && propLng ? "📍 Update My Location" : "📍 Get My Current Location"}
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              {propLat && propLng && (
                <View
                  style={{
                    backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)",
                    borderRadius: radius.md,
                    padding: spacing.md,
                    marginBottom: spacing.xl,
                  }}
                >
                  <Text style={{ fontSize: typography.sizes.xs, color: colors.secondaryText, marginBottom: 2 }}>
                    Coordinates captured:
                  </Text>
                  <Text style={{ fontSize: typography.sizes.sm, color: colors.text }}>
                    {parseFloat(propLat).toFixed(6)}, {parseFloat(propLng).toFixed(6)}
                  </Text>
                </View>
              )}

              {[
                { label: "Property Name *", value: propName, setter: setPropName, placeholder: "e.g. Sunrise Apartments" },
                { label: "Address *", value: propAddress, setter: setPropAddress, placeholder: "123 Main St, City, State" },
              ].map(({ label, value, setter, placeholder }) => (
                <View key={label} style={{ marginBottom: spacing.lg }}>
                  <Text style={labelStyle}>{label}</Text>
                  <TextInput
                    value={value}
                    onChangeText={setter}
                    placeholder={placeholder}
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
              ))}

              {/* Advanced: Manual coordinates */}
              <TouchableOpacity
                onPress={() => setShowAdvanced(!showAdvanced)}
                style={{ marginBottom: spacing.md }}
              >
                <Text style={{ fontSize: typography.sizes.sm, color: brandColors.accentStart }}>
                  {showAdvanced ? "▼" : "▶"} Advanced: Enter coordinates manually
                </Text>
              </TouchableOpacity>

              {showAdvanced && (
                <View
                  style={{
                    backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
                    borderRadius: radius.md,
                    padding: spacing.md,
                    marginBottom: spacing.lg,
                  }}
                >
                  {[
                    { label: "Latitude", value: propLat, setter: setPropLat, placeholder: "e.g. 40.7128", keyboard: "numeric" },
                    { label: "Longitude", value: propLng, setter: setPropLng, placeholder: "e.g. -74.0060", keyboard: "numeric" },
                  ].map(({ label, value, setter, placeholder, keyboard }) => (
                    <View key={label} style={{ marginBottom: spacing.sm }}>
                      <Text style={[labelStyle, { fontSize: typography.sizes.xs }]}>{label}</Text>
                      <TextInput
                        value={value}
                        onChangeText={setter}
                        placeholder={placeholder}
                        placeholderTextColor={colors.placeholderText}
                        keyboardType={keyboard ?? "default"}
                        style={[
                          inputStyle,
                          {
                            color: colors.text,
                            backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.03)",
                            borderColor: colors.border,
                            paddingVertical: spacing.sm,
                          },
                        ]}
                      />
                    </View>
                  ))}
                </View>
              )}

              <Text style={[labelStyle, { marginBottom: spacing.sm }]}>Assign Manager *</Text>
              {managers.length === 0 ? (
                <View
                  style={{
                    backgroundColor: colors.errorBg || "rgba(196,112,112,0.15)",
                    borderRadius: radius.md,
                    padding: spacing.lg,
                    marginBottom: spacing.xl,
                  }}
                >
                  <Text style={{ fontSize: typography.sizes.sm, color: brandColors.error }}>
                    No managers available. Please create a manager account first via the web admin panel.
                  </Text>
                </View>
              ) : (
                managers.map((m) => (
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
                      backgroundColor: selectedManagerId === m.id ? `${brandColors.accentStart}12` : "transparent",
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
                ))
              )}

              <TouchableOpacity
                onPress={handleCreate}
                disabled={createMutation.isPending || managers.length === 0}
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
                    opacity: createMutation.isPending || managers.length === 0 ? 0.5 : 1,
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
