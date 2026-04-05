import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  AppState,
  ScrollView,
} from "react-native";
import {
  MapPin,
  CheckCircle,
  XCircle,
  Navigation,
  Settings,
  Building2,
  MapPinCheck,
  Clock,
} from "lucide-react-native";
import { router } from "expo-router";
import * as Location from "expo-location";
import * as Linking from "expo-linking";
import { LinearGradient } from "expo-linear-gradient";
import ScreenContainer from "@/components/ScreenContainer";
import ScreenHeader from "@/components/ScreenHeader";
import { useTheme } from "@/components/hooks/useTheme";
import { api } from "@/lib/api";
import { useAuth } from "@/utils/auth/useAuth";
import useUser from "@/utils/auth/useUser";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export default function LocationScreen() {
  const { colors, brand } = useTheme();
  const { isReady, auth } = useAuth();
  const { data: user, loading: userLoading } = useUser();
  const queryClient = useQueryClient();
  const [location, setLocation] = useState(null);
  const [permissionStatus, setPermissionStatus] = useState(null);
  const [selectedPropertyId, setSelectedPropertyId] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);

  // Fetch assigned properties
  const { data: propertiesData, isLoading: propertiesLoading } = useQuery({
    queryKey: ["my-properties", user?.id],
    queryFn: () => api.get(`/api/properties/my?userId=${user.id}`),
    enabled: isReady && !!auth && !!user?.id,
  });

  // Fetch check-in status
  const { data: statusData } = useQuery({
    queryKey: ["checkin-status", user?.id],
    queryFn: () => api.get(`/api/checkin/status?userId=${user.id}`),
    enabled: isReady && !!auth && !!user?.id,
    refetchInterval: 30000,
  });

  const properties = propertiesData?.properties || [];
  const isCheckedIn = statusData?.isCheckedIn || false;
  const activeCheckIn = statusData?.checkIn || null;
  const hasMultipleProperties = properties.length > 1;

  // Auto-select single property
  useEffect(() => {
    if (properties.length === 1 && !selectedPropertyId) {
      setSelectedPropertyId(properties[0].id);
    }
  }, [properties, selectedPropertyId]);

  const checkPermissions = useCallback(async () => {
    const { status } = await Location.getForegroundPermissionsAsync();
    setPermissionStatus(status);
  }, []);

  useEffect(() => {
    checkPermissions();
  }, [checkPermissions]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active") checkPermissions();
    });
    return () => subscription.remove();
  }, [checkPermissions]);

  const showSettingsAlert = () => {
    Alert.alert(
      "Location Access Required",
      "Location permission was denied. Please enable Location Services in your device settings.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Open Settings", onPress: () => Linking.openSettings() },
      ],
    );
  };

  const getLocation = async () => {
    const { status, canAskAgain } =
      await Location.requestForegroundPermissionsAsync();
    setPermissionStatus(status);
    if (status !== "granted") {
      if (!canAskAgain) showSettingsAlert();
      else Alert.alert("Permission Denied", "Location permission is required.");
      return null;
    }
    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });
    return loc.coords;
  };

  const handleVerify = async () => {
    try {
      setVerifying(true);
      setVerificationResult(null);

      const coords = await getLocation();
      if (!coords) {
        setVerifying(false);
        return;
      }

      setLocation(coords);

      let data;
      try {
        data = await api.post("/api/location/verify", {
          latitude: coords.latitude,
          longitude: coords.longitude,
          userId: user?.id,
        });
      } catch (e) {
        data = { verified: false, message: e?.message || "Location verification failed." };
      }

      if (data.verified) {
        setVerificationResult({
          verified: true,
          property: data.property,
          distance: data.distance,
        });
      } else {
        setVerificationResult({
          verified: false,
          message: data.message,
          distance: data.distance,
          nearestProperty: data.nearestProperty,
        });
      }
    } catch (error) {
      console.error("Error verifying location:", error);
      Alert.alert("Error", "Failed to verify your location.");
    } finally {
      setVerifying(false);
    }
  };

  const handleCheckInForProperty = async (property) => {
    try {
      setCheckingIn(true);

      const coords = await getLocation();
      if (!coords) {
        setCheckingIn(false);
        return;
      }

      // Verify location
      let verifyData;
      try {
        verifyData = await api.post("/api/location/verify", {
          latitude: coords.latitude,
          longitude: coords.longitude,
          userId: user?.id,
        });
      } catch (e) {
        verifyData = { verified: false, message: e?.message || "You are not within 200 meters of this property." };
      }

      if (!verifyData.verified) {
        Alert.alert("Cannot Check In", verifyData.message || "You are not within 200 meters of this property.");
        setCheckingIn(false);
        return;
      }

      // Check in
      let checkinData;
      let checkinOk = false;
      try {
        checkinData = await api.post("/api/checkin", {
          userId: user?.id,
          propertyId: property.id,
          latitude: coords.latitude,
          longitude: coords.longitude,
        });
        checkinOk = true;
      } catch (e) {
        checkinData = { error: e?.message || "Failed to check in." };
      }

      if (checkinOk) {
        Alert.alert(
          "Checked In",
          `Successfully checked in at ${property.name}`,
        );
        queryClient.invalidateQueries({ queryKey: ["checkin-status"] });
      } else {
        Alert.alert("Error", checkinData?.error || "Failed to check in.");
      }
    } catch (error) {
      console.error("Check-in error:", error);
      Alert.alert("Error", "Failed to check in. Please try again.");
    } finally {
      setCheckingIn(false);
    }
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  if (!isReady || userLoading) {
    return (
      <ScreenContainer>
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <ActivityIndicator size="large" color={brand.gradientStart} />
        </View>
      </ScreenContainer>
    );
  }

  if (!auth || !user) {
    return (
      <ScreenContainer>
        <ScreenHeader title="Location" />
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: 40,
          }}
        >
          <Text
            style={{
              fontSize: 18,
              fontFamily: "Inter_600SemiBold",
              color: colors.text,
              textAlign: "center",
              marginBottom: 8,
            }}
          >
            Please Sign In
          </Text>
          <Text
            style={{
              fontSize: 14,
              fontFamily: "Inter_400Regular",
              color: colors.secondaryText,
              textAlign: "center",
              marginBottom: 24,
            }}
          >
            Sign in to view your assigned properties and verify your location.
          </Text>
          <TouchableOpacity onPress={() => router.replace('/signin')} activeOpacity={0.85}>
            <LinearGradient
              colors={[brand.gradientStart, brand.gradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{
                borderRadius: 14,
                paddingHorizontal: 36,
                paddingVertical: 14,
              }}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontFamily: "Inter_600SemiBold",
                  color: "#FFFFFF",
                }}
              >
                Sign In
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScreenContainer>
    );
  }

  const permissionDenied = permissionStatus === "denied";

  return (
    <ScreenContainer scrollable={false}>
      <ScreenHeader title="Location" />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 12,
          paddingBottom: 40,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Active Check-In Banner */}
        {isCheckedIn && activeCheckIn && (
          <View
            style={{
              backgroundColor: colors.successBg,
              borderRadius: 18,
              borderWidth: 1,
              borderColor: brand.success + "40",
              padding: 16,
              marginBottom: 20,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 6,
              }}
            >
              <CheckCircle size={16} color={brand.success} strokeWidth={2} />
              <Text
                style={{
                  fontSize: 13,
                  fontFamily: "Inter_600SemiBold",
                  color: brand.success,
                  marginLeft: 6,
                }}
              >
                Currently Checked In
              </Text>
            </View>
            <Text
              style={{
                fontSize: 14,
                fontFamily: "Inter_500Medium",
                color: colors.text,
              }}
            >
              {activeCheckIn.property_name}
            </Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginTop: 4,
              }}
            >
              <Clock size={12} color={colors.secondaryText} strokeWidth={1.5} />
              <Text
                style={{
                  fontSize: 12,
                  fontFamily: "Inter_400Regular",
                  color: colors.secondaryText,
                  marginLeft: 4,
                }}
              >
                Since {formatTime(activeCheckIn.check_in_time)}
              </Text>
            </View>
          </View>
        )}

        {/* Permission Denied */}
        {permissionDenied && (
          <View
            style={{
              backgroundColor: colors.errorBg,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: brand.error + "30",
              padding: 16,
              marginBottom: 20,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              <Settings size={18} color={brand.error} strokeWidth={1.5} />
              <Text
                style={{
                  fontSize: 15,
                  fontFamily: "Inter_600SemiBold",
                  color: brand.error,
                  marginLeft: 8,
                }}
              >
                Location Access Denied
              </Text>
            </View>
            <Text
              style={{
                fontSize: 13,
                fontFamily: "Inter_400Regular",
                color: brand.error,
                lineHeight: 20,
                marginBottom: 12,
                opacity: 0.8,
              }}
            >
              Enable Location Services for this app in your device settings.
            </Text>
            <TouchableOpacity
              onPress={() => Linking.openSettings()}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={[brand.error, "#A85858"]}
                style={{
                  borderRadius: 10,
                  paddingVertical: 11,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontFamily: "Inter_600SemiBold",
                    color: "#FFFFFF",
                  }}
                >
                  Open Settings
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {/* Assigned Properties Section */}
        <View style={{ marginBottom: 20 }}>
          <Text
            style={{
              fontSize: 14,
              fontFamily: "Inter_600SemiBold",
              color: colors.secondaryText,
              letterSpacing: 0.5,
              textTransform: "uppercase",
              marginBottom: 12,
            }}
          >
            Your Properties
          </Text>

          {propertiesLoading ? (
            <View
              style={{
                backgroundColor: colors.cardBackground,
                borderRadius: 18,
                borderWidth: 1,
                borderColor: colors.border,
                padding: 24,
                alignItems: "center",
              }}
            >
              <ActivityIndicator size="small" color={brand.gradientStart} />
            </View>
          ) : properties.length === 0 ? (
            <View
              style={{
                backgroundColor: colors.cardBackground,
                borderRadius: 18,
                borderWidth: 1,
                borderColor: colors.border,
                padding: 24,
                alignItems: "center",
              }}
            >
              <Building2
                size={40}
                color={colors.emptyStateIcon}
                strokeWidth={1}
              />
              <Text
                style={{
                  fontSize: 16,
                  fontFamily: "Inter_600SemiBold",
                  color: colors.text,
                  marginTop: 12,
                  marginBottom: 6,
                }}
              >
                No Properties Assigned
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  fontFamily: "Inter_400Regular",
                  color: colors.secondaryText,
                  textAlign: "center",
                }}
              >
                Contact your administrator to be assigned to a property.
              </Text>
            </View>
          ) : (
            properties.map((property) => {
              const isSelected = selectedPropertyId === property.id;
              const isCheckedInHere =
                isCheckedIn && activeCheckIn?.property_id === property.id;

              return (
                <TouchableOpacity
                  key={property.id}
                  onPress={() => {
                    setSelectedPropertyId(property.id);
                    setVerificationResult(null);
                  }}
                  activeOpacity={0.8}
                  style={{
                    backgroundColor: isSelected
                      ? colors.primaryLight
                      : colors.cardBackground,
                    borderRadius: 18,
                    borderWidth: 1,
                    borderColor: isSelected
                      ? brand.gradientEnd + "40"
                      : colors.border,
                    padding: 18,
                    marginBottom: 10,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          marginBottom: 6,
                        }}
                      >
                        <MapPin
                          size={16}
                          color={
                            isSelected
                              ? brand.gradientEnd
                              : colors.secondaryText
                          }
                          strokeWidth={1.5}
                        />
                        <Text
                          style={{
                            fontSize: 16,
                            fontFamily: "Inter_600SemiBold",
                            color: colors.text,
                            marginLeft: 8,
                          }}
                        >
                          {property.name}
                        </Text>
                      </View>
                      <Text
                        style={{
                          fontSize: 13,
                          fontFamily: "Inter_400Regular",
                          color: colors.secondaryText,
                          marginLeft: 24,
                        }}
                      >
                        {property.address}
                      </Text>
                    </View>

                    {isCheckedInHere && (
                      <View
                        style={{
                          backgroundColor: colors.successBg,
                          paddingHorizontal: 8,
                          paddingVertical: 4,
                          borderRadius: 8,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 11,
                            fontFamily: "Inter_600SemiBold",
                            color: brand.success,
                          }}
                        >
                          Active
                        </Text>
                      </View>
                    )}

                    {hasMultipleProperties && !isCheckedInHere && (
                      <View
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: 10,
                          borderWidth: 2,
                          borderColor: isSelected
                            ? brand.gradientEnd
                            : colors.border,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {isSelected && (
                          <View
                            style={{
                              width: 10,
                              height: 10,
                              borderRadius: 5,
                              backgroundColor: brand.gradientEnd,
                            }}
                          />
                        )}
                      </View>
                    )}
                  </View>

                  {/* Check-In Button for this property (when selected, multiple props, and not already checked in) */}
                  {isSelected && hasMultipleProperties && !isCheckedIn && (
                    <TouchableOpacity
                      onPress={() => handleCheckInForProperty(property)}
                      disabled={checkingIn}
                      activeOpacity={0.85}
                      style={{ marginTop: 14 }}
                    >
                      <LinearGradient
                        colors={
                          checkingIn
                            ? [brand.slate, brand.slate]
                            : [brand.gradientStart, brand.gradientEnd]
                        }
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={{
                          borderRadius: 12,
                          paddingVertical: 13,
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {checkingIn ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <>
                            <MapPinCheck
                              size={16}
                              color="#FFFFFF"
                              strokeWidth={2}
                            />
                            <Text
                              style={{
                                fontSize: 14,
                                fontFamily: "Inter_600SemiBold",
                                color: "#FFFFFF",
                                marginLeft: 8,
                              }}
                            >
                              Check In Here
                            </Text>
                          </>
                        )}
                      </LinearGradient>
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              );
            })
          )}
        </View>

        {/* Verify Location Section */}
        {properties.length > 0 && (
          <View style={{ marginBottom: 20 }}>
            <Text
              style={{
                fontSize: 14,
                fontFamily: "Inter_600SemiBold",
                color: colors.secondaryText,
                letterSpacing: 0.5,
                textTransform: "uppercase",
                marginBottom: 12,
              }}
            >
              Verify Location
            </Text>

            {/* Enable Location */}
            {permissionStatus !== "granted" && !permissionDenied && (
              <TouchableOpacity
                onPress={async () => {
                  const { status } =
                    await Location.requestForegroundPermissionsAsync();
                  setPermissionStatus(status);
                }}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={[brand.gradientStart, brand.gradientEnd]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{
                    borderRadius: 14,
                    padding: 16,
                    alignItems: "center",
                    marginBottom: 16,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 16,
                      fontFamily: "Inter_600SemiBold",
                      color: "#FFFFFF",
                    }}
                  >
                    Enable Location Access
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            )}

            {/* Verify Button */}
            {permissionStatus === "granted" && (
              <TouchableOpacity
                onPress={handleVerify}
                disabled={verifying}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={
                    verifying
                      ? [brand.slate, brand.slate]
                      : [brand.gradientStart, brand.gradientEnd]
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{
                    borderRadius: 14,
                    padding: 16,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 16,
                  }}
                >
                  {verifying ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Navigation size={18} color="#FFFFFF" strokeWidth={2} />
                      <Text
                        style={{
                          fontSize: 16,
                          fontFamily: "Inter_600SemiBold",
                          color: "#FFFFFF",
                          marginLeft: 8,
                        }}
                      >
                        Verify My Location
                      </Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            )}

            {/* Verification Result */}
            {verificationResult && (
              <View
                style={{
                  backgroundColor: verificationResult.verified
                    ? colors.successBg
                    : colors.warningBg,
                  borderRadius: 18,
                  padding: 20,
                  borderWidth: 1,
                  borderColor: verificationResult.verified
                    ? brand.success + "40"
                    : brand.warning + "40",
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: 12,
                  }}
                >
                  {verificationResult.verified ? (
                    <CheckCircle
                      size={28}
                      color={brand.success}
                      strokeWidth={1.5}
                    />
                  ) : (
                    <XCircle
                      size={28}
                      color={brand.warning}
                      strokeWidth={1.5}
                    />
                  )}
                  <Text
                    style={{
                      fontSize: 17,
                      fontFamily: "Inter_600SemiBold",
                      color: verificationResult.verified
                        ? brand.success
                        : brand.warning,
                      marginLeft: 12,
                    }}
                  >
                    {verificationResult.verified ? "Verified" : "Not Verified"}
                  </Text>
                </View>

                {verificationResult.verified ? (
                  <>
                    <Text
                      style={{
                        fontSize: 14,
                        fontFamily: "Inter_500Medium",
                        color: colors.text,
                        marginBottom: 4,
                      }}
                    >
                      {verificationResult.property.name}
                    </Text>
                    <Text
                      style={{
                        fontSize: 13,
                        fontFamily: "Inter_400Regular",
                        color: colors.secondaryText,
                        marginBottom: 4,
                      }}
                    >
                      {verificationResult.property.address}
                    </Text>
                    <Text
                      style={{
                        fontSize: 12,
                        fontFamily: "Inter_400Regular",
                        color: colors.secondaryText,
                      }}
                    >
                      Distance: {verificationResult.distance}m away
                    </Text>
                  </>
                ) : (
                  <>
                    <Text
                      style={{
                        fontSize: 14,
                        fontFamily: "Inter_400Regular",
                        color: colors.text,
                        lineHeight: 20,
                        marginBottom: 8,
                      }}
                    >
                      {verificationResult.message}
                    </Text>
                    {verificationResult.nearestProperty && (
                      <Text
                        style={{
                          fontSize: 12,
                          fontFamily: "Inter_400Regular",
                          color: colors.secondaryText,
                        }}
                      >
                        Nearest: {verificationResult.nearestProperty} (
                        {verificationResult.distance}m)
                      </Text>
                    )}
                  </>
                )}
              </View>
            )}
          </View>
        )}

        {/* Current Location */}
        {location && (
          <View
            style={{
              backgroundColor: colors.cardBackground,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: colors.border,
              padding: 16,
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontFamily: "Inter_500Medium",
                color: colors.secondaryText,
                marginBottom: 8,
              }}
            >
              Current Coordinates
            </Text>
            <Text
              style={{
                fontSize: 12,
                fontFamily: "Inter_400Regular",
                color: colors.tertiaryText,
              }}
            >
              Lat: {location.latitude.toFixed(6)}
            </Text>
            <Text
              style={{
                fontSize: 12,
                fontFamily: "Inter_400Regular",
                color: colors.tertiaryText,
              }}
            >
              Lng: {location.longitude.toFixed(6)}
            </Text>
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
