import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  AppState,
  ScrollView,
  Animated,
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
  Lock,
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

const MAX_DISTANCE = 200; // meters

// Haversine formula to calculate distance between two coordinates (client-side)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

export default function LocationScreen() {
  const { colors, brand } = useTheme();
  const { isReady, auth } = useAuth();
  const { data: user, loading: userLoading } = useUser();
  const queryClient = useQueryClient();
  const [location, setLocation] = useState(null);
  const [permissionStatus, setPermissionStatus] = useState(null);
  const [distances, setDistances] = useState({});
  const [refreshingLocation, setRefreshingLocation] = useState(false);
  const propertiesRef = useRef([]);

  // Animated values for each property (for smooth transitions)
  const animatedValues = useRef({}).current;

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
  propertiesRef.current = properties;

  const isCheckedIn = statusData?.isCheckedIn || false;
  const activeCheckIn = statusData?.checkIn || null;

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
      "Location permission is required to check your proximity to properties.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Open Settings", onPress: () => Linking.openSettings() },
      ],
    );
  };

  // Initialize animated values when properties load
  useEffect(() => {
    properties.forEach((property) => {
      if (!animatedValues[property.id]) {
        animatedValues[property.id] = new Animated.Value(0);
      }
    });
  }, [properties, animatedValues]);

  // Update distances based on current location
  const updateDistances = useCallback((coords) => {
    const props = propertiesRef.current;
    const newDistances = {};

    props.forEach((property) => {
      if (property.latitude && property.longitude) {
        const distance = calculateDistance(
          coords.latitude,
          coords.longitude,
          parseFloat(property.latitude),
          parseFloat(property.longitude),
        );
        newDistances[property.id] = distance;

        // Animate to 1 if within range, 0 if outside
        const inRange = distance <= MAX_DISTANCE;
        const currentValue = animatedValues[property.id]?._value || 0;

        // Only animate if state changes
        if ((inRange && currentValue !== 1) || (!inRange && currentValue !== 0)) {
          Animated.spring(animatedValues[property.id], {
            toValue: inRange ? 1 : 0,
            tension: 65,
            friction: 7,
            useNativeDriver: false,
          }).start();
        }
      }
    });

    setDistances(newDistances);
    setLocation(coords);
  }, [animatedValues]);

  // Start GPS tracking when properties are loaded and permission granted
  useEffect(() => {
    if (properties.length === 0 || permissionStatus !== "granted") {
      return;
    }

    let subscription;

    const startTracking = async () => {
      setRefreshingLocation(true);
      try {
        subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            distanceInterval: 5, // Update every 5 meters
          },
          (loc) => {
            setRefreshingLocation(false);
            updateDistances(loc.coords);
          }
        );
      } catch (error) {
        console.error("Error starting location tracking:", error);
        setRefreshingLocation(false);
      }
    };

    startTracking();

    return () => {
      if (subscription) subscription.remove();
    };
  }, [properties.length, permissionStatus, updateDistances]);

  const handleCheckInForProperty = async (property) => {
    try {
      if (!location) {
        Alert.alert("Waiting for Location", "Please wait while we determine your location.");
        return;
      }

      const distance = distances[property.id];
      if (distance > MAX_DISTANCE) {
        Alert.alert(
          "Too Far Away",
          `You must be within 200 meters of ${property.name} to check in. Current distance: ${formatDistance(distance)}`
        );
        return;
      }

      // Check in
      let checkinData;
      let checkinOk = false;
      try {
        checkinData = await api.post("/api/checkin", {
          userId: user?.id,
          propertyId: property.id,
          latitude: location.latitude,
          longitude: location.longitude,
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

  const formatDistance = (meters) => {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    }
    return `${(meters / 1000).toFixed(1)}km`;
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
            Sign in to view your assigned properties and check in.
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
              Enable Location Services to check your proximity to properties.
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

        {/* Location Status */}
        {permissionStatus === "granted" && !permissionDenied && (
          <View
            style={{
              backgroundColor: colors.cardBackground,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: colors.border,
              padding: 14,
              marginBottom: 20,
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            {refreshingLocation ? (
              <ActivityIndicator size="small" color={brand.gradientStart} />
            ) : (
              <MapPin size={16} color={brand.success} strokeWidth={2} />
            )}
            <Text
              style={{
                fontSize: 13,
                fontFamily: "Inter_500Medium",
                color: colors.secondaryText,
                marginLeft: 8,
              }}
            >
              {refreshingLocation ? "Updating location..." : "Location active • Checking proximity"}
            </Text>
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
              const distance = distances[property.id];
              const inRange = distance !== undefined && distance <= MAX_DISTANCE;
              const isCheckedInHere =
                isCheckedIn && activeCheckIn?.property_id === property.id;
              const animValue = animatedValues[property.id] || new Animated.Value(0);

              const backgroundColor = animValue.interpolate({
                inputRange: [0, 1],
                outputRange: [colors.cardBackground, colors.primaryLight],
              });

              const opacity = animValue.interpolate({
                inputRange: [0, 1],
                outputRange: [0.4, 1],
              });

              return (
                <Animated.View
                  key={property.id}
                  style={{
                    backgroundColor,
                    borderRadius: 18,
                    borderWidth: 1,
                    borderColor: inRange ? brand.gradientEnd + "40" : colors.border,
                    padding: 18,
                    marginBottom: 12,
                    opacity,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "flex-start",
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
                          color={inRange ? brand.gradientEnd : colors.secondaryText}
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
                          marginBottom: 4,
                        }}
                      >
                        {property.address}
                      </Text>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          marginLeft: 24,
                        }}
                      >
                        {inRange ? (
                          <>
                            <CheckCircle size={12} color={brand.success} strokeWidth={2} />
                            <Text
                              style={{
                                fontSize: 12,
                                fontFamily: "Inter_500Medium",
                                color: brand.success,
                                marginLeft: 4,
                              }}
                            >
                              Within range • {formatDistance(distance)}
                            </Text>
                          </>
                        ) : distance !== undefined ? (
                          <>
                            <Lock size={12} color={colors.secondaryText} strokeWidth={1.5} />
                            <Text
                              style={{
                                fontSize: 12,
                                fontFamily: "Inter_400Regular",
                                color: colors.secondaryText,
                                marginLeft: 4,
                              }}
                            >
                              {formatDistance(distance)} away
                            </Text>
                          </>
                        ) : (
                          <Text
                            style={{
                              fontSize: 12,
                              fontFamily: "Inter_400Regular",
                              color: colors.tertiaryText,
                              marginLeft: 0,
                            }}
                          >
                            Waiting for location...
                          </Text>
                        )}
                      </View>
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
                  </View>

                  {/* Check In Button - only shows when in range and not checked in */}
                  {inRange && !isCheckedIn && permissionStatus === "granted" && (
                    <Animated.View
                      style={{
                        marginTop: 14,
                        opacity: animValue,
                        transform: [{
                          translateY: animValue.interpolate({
                            inputRange: [0, 1],
                            outputRange: [10, 0],
                          })
                        }]
                      }}
                    >
                      <TouchableOpacity
                        onPress={() => handleCheckInForProperty(property)}
                        activeOpacity={0.85}
                      >
                        <LinearGradient
                          colors={[brand.gradientStart, brand.gradientEnd]}
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
                        </LinearGradient>
                      </TouchableOpacity>
                    </Animated.View>
                  )}
                </Animated.View>
              );
            })
          )}
        </View>

        {/* Enable Location CTA */}
        {permissionStatus !== "granted" && !permissionDenied && (
          <TouchableOpacity
            onPress={async () => {
              const { status } = await Location.requestForegroundPermissionsAsync();
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
      </ScrollView>
    </ScreenContainer>
  );
}
