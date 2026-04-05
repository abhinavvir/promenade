import React, { useState, useEffect, useCallback } from "react";
import { router } from "expo-router";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  AppState,
} from "react-native";
import {
  MapPinCheck,
  CheckCircle,
  XCircle,
  Navigation,
  Settings,
  LogOut as LogOutIcon,
  Clock,
} from "lucide-react-native";
import * as Location from "expo-location";
import * as Linking from "expo-linking";
import { LinearGradient } from "expo-linear-gradient";
import ScreenContainer from "@/components/ScreenContainer";
import ScreenHeader from "@/components/ScreenHeader";
import { useTheme } from "@/components/hooks/useTheme";
import TriangleLogo from "@/components/TriangleLogo";
import { api } from "@/lib/api";
import { useAuth } from "@/utils/auth/useAuth";
import useUser from "@/utils/auth/useUser";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export default function CheckInScreen() {
  const { colors, brand } = useTheme();
  const { isReady, auth } = useAuth();
  const { data: user, loading: userLoading } = useUser();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [actionResult, setActionResult] = useState(null);
  const [permissionStatus, setPermissionStatus] = useState(null);

  // Fetch check-in status
  const { data: statusData, isLoading: statusLoading } = useQuery({
    queryKey: ["checkin-status", user?.id],
    queryFn: () => api.get(`/api/checkin/status?userId=${user.id}`),
    enabled: isReady && !!auth && !!user?.id,
    refetchInterval: 30000,
  });

  const isCheckedIn = statusData?.isCheckedIn || false;
  const activeCheckIn = statusData?.checkIn || null;

  const checkPermissions = useCallback(async () => {
    const { status } = await Location.getForegroundPermissionsAsync();
    setPermissionStatus(status);
  }, []);

  useEffect(() => {
    if (isReady && auth) checkPermissions();
  }, [isReady, auth, checkPermissions]);

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
      else Alert.alert("Permission Required", "Location permission is needed.");
      return null;
    }
    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });
    return loc.coords;
  };

  const handleCheckIn = async () => {
    try {
      setLoading(true);
      setActionResult(null);

      const coords = await getLocation();
      if (!coords) {
        setLoading(false);
        return;
      }

      // Verify location first
      let verifyData;
      try {
        verifyData = await api.post("/api/location/verify", {
          latitude: coords.latitude,
          longitude: coords.longitude,
          userId: user?.id,
        });
      } catch (e) {
        verifyData = { verified: false, message: e?.message || "Location verification failed." };
      }

      if (!verifyData.verified) {
        setActionResult({
          success: false,
          type: "checkin",
          message: verifyData.message || "Location verification failed.",
          distance: verifyData.distance,
          nearestProperty: verifyData.nearestProperty,
          coords,
        });
        setLoading(false);
        return;
      }

      // Create check-in record
      let checkinData;
      let checkinOk = false;
      try {
        checkinData = await api.post("/api/checkin", {
          userId: user?.id,
          propertyId: verifyData.property.id,
          latitude: coords.latitude,
          longitude: coords.longitude,
        });
        checkinOk = true;
      } catch (e) {
        checkinData = { error: e?.message || "Failed to check in." };
      }

      if (checkinOk) {
        setActionResult({
          success: true,
          type: "checkin",
          propertyName: verifyData.property.name,
          propertyAddress: verifyData.property.address,
          distance: verifyData.distance,
          timestamp: checkinData.checkIn.check_in_time,
          coords,
        });
        queryClient.invalidateQueries({ queryKey: ["checkin-status"] });
      } else {
        setActionResult({
          success: false,
          type: "checkin",
          message: checkinData?.error || "Failed to check in.",
          coords,
        });
      }
    } catch (error) {
      console.error("Check-in error:", error);
      Alert.alert("Error", "Failed to check in. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOut = async () => {
    try {
      setLoading(true);
      setActionResult(null);

      let coords = null;
      try {
        coords = await getLocation();
      } catch (e) {
        // Location is optional for checkout
      }

      let data;
      let checkoutOk = false;
      try {
        data = await api.post("/api/checkout", {
          userId: user?.id,
          latitude: coords?.latitude || null,
          longitude: coords?.longitude || null,
        });
        checkoutOk = true;
      } catch (e) {
        data = { error: e?.message || "Failed to check out." };
      }

      if (checkoutOk) {
        setActionResult({
          success: true,
          type: "checkout",
          checkInTime: data.checkOut.check_in_time,
          checkOutTime: data.checkOut.check_out_time,
          propertyName: activeCheckIn?.property_name,
        });
        queryClient.invalidateQueries({ queryKey: ["checkin-status"] });
      } else {
        setActionResult({
          success: false,
          type: "checkout",
          message: data.error || "Failed to check out.",
        });
      }
    } catch (error) {
      console.error("Checkout error:", error);
      Alert.alert("Error", "Failed to check out. Please try again.");
    } finally {
      setLoading(false);
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

  const formatDuration = (start, end) => {
    const startD = new Date(start);
    const endD = new Date(end);
    const diffMs = endD - startD;
    const mins = Math.floor(diffMs / 60000);
    const hrs = Math.floor(mins / 60);
    const remainMins = mins % 60;
    if (hrs > 0) return `${hrs}h ${remainMins}m`;
    return `${mins}m`;
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
        <ScreenHeader title="Check In" />
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: 40,
          }}
        >
          <TriangleLogo
            size={56}
            gradientColors={[brand.gradientStart, brand.gradientEnd]}
          />
          <Text
            style={{
              fontSize: 18,
              fontFamily: "Inter_600SemiBold",
              color: colors.text,
              textAlign: "center",
              marginTop: 20,
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
            Sign in to check in at your assigned property.
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
    <ScreenContainer>
      <ScreenHeader title="Check In" />

      <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 12 }}>
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

        {/* Active Check-In Status Banner */}
        {isCheckedIn && activeCheckIn && !statusLoading && (
          <View
            style={{
              backgroundColor: colors.successBg,
              borderRadius: 18,
              borderWidth: 1,
              borderColor: brand.success + "40",
              padding: 18,
              marginBottom: 20,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 10,
              }}
            >
              <CheckCircle size={20} color={brand.success} strokeWidth={2} />
              <Text
                style={{
                  fontSize: 15,
                  fontFamily: "Inter_600SemiBold",
                  color: brand.success,
                  marginLeft: 8,
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
                marginBottom: 4,
              }}
            >
              {activeCheckIn.property_name}
            </Text>
            <Text
              style={{
                fontSize: 13,
                fontFamily: "Inter_400Regular",
                color: colors.secondaryText,
                marginBottom: 2,
              }}
            >
              {activeCheckIn.property_address}
            </Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginTop: 8,
              }}
            >
              <Clock size={13} color={colors.secondaryText} strokeWidth={1.5} />
              <Text
                style={{
                  fontSize: 12,
                  fontFamily: "Inter_400Regular",
                  color: colors.secondaryText,
                  marginLeft: 5,
                }}
              >
                Since {formatTime(activeCheckIn.check_in_time)}
              </Text>
            </View>
          </View>
        )}

        {/* Info Card — only when not checked in */}
        {!isCheckedIn && !statusLoading && (
          <View
            style={{
              backgroundColor: colors.cardBackground,
              borderRadius: 18,
              borderWidth: 1,
              borderColor: colors.border,
              padding: 20,
              marginBottom: 24,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <Navigation
                size={22}
                color={brand.gradientEnd}
                strokeWidth={1.5}
              />
              <Text
                style={{
                  fontSize: 17,
                  fontFamily: "Inter_600SemiBold",
                  color: colors.text,
                  marginLeft: 12,
                }}
              >
                Ready to Check In?
              </Text>
            </View>
            <Text
              style={{
                fontSize: 14,
                fontFamily: "Inter_400Regular",
                color: colors.secondaryText,
                lineHeight: 21,
              }}
            >
              Tap the button below to verify your location and check in at your
              assigned property. You must be within 200 meters.
            </Text>
          </View>
        )}

        {/* Main Action Button — Check In or Check Out */}
        {!statusLoading && (
          <TouchableOpacity
            onPress={isCheckedIn ? handleCheckOut : handleCheckIn}
            disabled={loading}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={
                loading
                  ? [brand.slate, brand.slate]
                  : isCheckedIn
                    ? [brand.error, "#A85858"]
                    : [brand.gradientStart, brand.gradientEnd]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                borderRadius: 20,
                paddingVertical: 24,
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 24,
              }}
            >
              {loading ? (
                <ActivityIndicator size="large" color="#FFFFFF" />
              ) : isCheckedIn ? (
                <>
                  <LogOutIcon size={38} color="#FFFFFF" strokeWidth={1.5} />
                  <Text
                    style={{
                      fontSize: 19,
                      fontFamily: "Inter_600SemiBold",
                      color: "#FFFFFF",
                      marginTop: 12,
                    }}
                  >
                    Check Out
                  </Text>
                </>
              ) : (
                <>
                  <MapPinCheck size={38} color="#FFFFFF" strokeWidth={1.5} />
                  <Text
                    style={{
                      fontSize: 19,
                      fontFamily: "Inter_600SemiBold",
                      color: "#FFFFFF",
                      marginTop: 12,
                    }}
                  >
                    Check In Now
                  </Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        )}

        {statusLoading && (
          <View style={{ paddingTop: 40, alignItems: "center" }}>
            <ActivityIndicator size="large" color={brand.gradientStart} />
          </View>
        )}

        {/* Action Result */}
        {actionResult && (
          <View
            style={{
              backgroundColor: actionResult.success
                ? actionResult.type === "checkout"
                  ? colors.cardBackground
                  : colors.successBg
                : colors.warningBg,
              borderRadius: 18,
              padding: 20,
              borderWidth: 1,
              borderColor: actionResult.success
                ? actionResult.type === "checkout"
                  ? colors.border
                  : brand.success + "40"
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
              {actionResult.success ? (
                <CheckCircle
                  size={28}
                  color={
                    actionResult.type === "checkout"
                      ? brand.gradientEnd
                      : brand.success
                  }
                  strokeWidth={1.5}
                />
              ) : (
                <XCircle size={28} color={brand.warning} strokeWidth={1.5} />
              )}
              <Text
                style={{
                  fontSize: 17,
                  fontFamily: "Inter_600SemiBold",
                  color: actionResult.success
                    ? actionResult.type === "checkout"
                      ? brand.gradientEnd
                      : brand.success
                    : brand.warning,
                  marginLeft: 12,
                }}
              >
                {actionResult.success
                  ? actionResult.type === "checkout"
                    ? "Checked Out Successfully"
                    : "Check-In Successful!"
                  : actionResult.type === "checkout"
                    ? "Check-Out Failed"
                    : "Check-In Failed"}
              </Text>
            </View>

            {actionResult.success && actionResult.type === "checkin" && (
              <>
                <Text
                  style={{
                    fontSize: 14,
                    fontFamily: "Inter_500Medium",
                    color: colors.text,
                    marginBottom: 4,
                  }}
                >
                  {actionResult.propertyName}
                </Text>
                <Text
                  style={{
                    fontSize: 13,
                    fontFamily: "Inter_400Regular",
                    color: colors.secondaryText,
                    marginBottom: 4,
                  }}
                >
                  {actionResult.propertyAddress}
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    fontFamily: "Inter_400Regular",
                    color: colors.secondaryText,
                  }}
                >
                  Checked in at {formatTime(actionResult.timestamp)} ·{" "}
                  {actionResult.distance}m from property
                </Text>
              </>
            )}

            {actionResult.success && actionResult.type === "checkout" && (
              <>
                {actionResult.propertyName && (
                  <Text
                    style={{
                      fontSize: 14,
                      fontFamily: "Inter_500Medium",
                      color: colors.text,
                      marginBottom: 8,
                    }}
                  >
                    {actionResult.propertyName}
                  </Text>
                )}
                <Text
                  style={{
                    fontSize: 13,
                    fontFamily: "Inter_400Regular",
                    color: colors.secondaryText,
                    marginBottom: 4,
                  }}
                >
                  Checked in at {formatTime(actionResult.checkInTime)}
                </Text>
                <Text
                  style={{
                    fontSize: 13,
                    fontFamily: "Inter_400Regular",
                    color: colors.secondaryText,
                    marginBottom: 4,
                  }}
                >
                  Checked out at {formatTime(actionResult.checkOutTime)}
                </Text>
                <Text
                  style={{
                    fontSize: 13,
                    fontFamily: "Inter_500Medium",
                    color: brand.gradientEnd,
                  }}
                >
                  Duration:{" "}
                  {formatDuration(
                    actionResult.checkInTime,
                    actionResult.checkOutTime,
                  )}
                </Text>
              </>
            )}

            {!actionResult.success && (
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
                  {actionResult.message}
                </Text>
                {actionResult.nearestProperty && (
                  <Text
                    style={{
                      fontSize: 12,
                      fontFamily: "Inter_400Regular",
                      color: colors.secondaryText,
                    }}
                  >
                    Nearest: {actionResult.nearestProperty} (
                    {actionResult.distance}m)
                  </Text>
                )}
              </>
            )}
          </View>
        )}

        {/* Signed in as */}
        <View style={{ marginTop: 24, alignItems: "center" }}>
          <Text
            style={{
              fontSize: 13,
              fontFamily: "Inter_400Regular",
              color: colors.tertiaryText,
            }}
          >
            Signed in as {user?.name || user?.email || "Property Manager"}
          </Text>
        </View>
      </View>
    </ScreenContainer>
  );
}
