import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import {
  LogOut,
  User as UserIcon,
  Mail,
  Shield,
  AlertTriangle,
  CheckCircle,
  KeyRound,
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import ScreenContainer from "@/components/ScreenContainer";
import ScreenHeader from "@/components/ScreenHeader";
import { useTheme } from "@/components/hooks/useTheme";
import TriangleLogo from "@/components/TriangleLogo";
import { api } from "@/lib/api";
import { useAuth } from "@/utils/auth/useAuth";
import useUser from "@/utils/auth/useUser";
import { useQuery } from "@tanstack/react-query";

export default function ProfileScreen() {
  const { colors, brand } = useTheme();
  const router = useRouter();
  const { signOut, isReady, auth } = useAuth();
  const { data: user, loading: userLoading } = useUser();

  // Fetch fresh profile from backend to get accurate name/role
  const { data: profileData } = useQuery({
    queryKey: ["user-profile", user?.id],
    queryFn: () => api.get("/api/auth/me"),
    enabled: !!user?.id,
  });

  const freshUser = profileData?.user || user;

  const [isTemporaryPassword, setIsTemporaryPassword] = useState(null);
  const [passwordStatusLoading, setPasswordStatusLoading] = useState(true);

  const fetchPasswordStatus = useCallback(async () => {
    try {
      setPasswordStatusLoading(true);
      const data = await api.get("/api/auth/change-password");
      setIsTemporaryPassword(data.isTemporary);
    } catch (err) {
      console.error("Error fetching password status:", err);
    } finally {
      setPasswordStatusLoading(false);
    }
  }, []);

  useEffect(() => {
    if (auth && user) fetchPasswordStatus();
  }, [auth, user, fetchPasswordStatus]);

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await signOut();
        },
      },
    ]);
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
        <ScreenHeader title="Profile" />
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
            Not Signed In
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
            Sign in to access your profile.
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

  return (
    <ScreenContainer>
      <ScreenHeader title="Profile" />

      <View style={{ paddingHorizontal: 20, paddingVertical: 8 }}>
        {/* User Card */}
        <View
          style={{
            backgroundColor: colors.cardBackground,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: colors.border,
            padding: 24,
            marginBottom: 16,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <LinearGradient
              colors={[brand.gradientStart, brand.gradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                width: 52,
                height: 52,
                borderRadius: 26,
                alignItems: "center",
                justifyContent: "center",
                marginRight: 14,
              }}
            >
              <TriangleLogo size={22} color="#FFFFFF" />
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 20,
                  fontFamily: "Inter_600SemiBold",
                  color: colors.text,
                  marginBottom: 4,
                }}
              >
                {freshUser?.name || "Property Manager"}
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Shield size={13} color={brand.success} strokeWidth={2} />
                <Text
                  style={{
                    fontSize: 13,
                    fontFamily: "Inter_500Medium",
                    color: brand.success,
                    marginLeft: 5,
                  }}
                >
                  {freshUser?.role === "admin"
                    ? "Administrator"
                    : "Property Manager"}
                </Text>
              </View>
            </View>
          </View>

          {freshUser?.email && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingTop: 14,
                borderTopWidth: 1,
                borderTopColor: colors.divider,
              }}
            >
              <Mail size={14} color={colors.secondaryText} strokeWidth={1.5} />
              <Text
                style={{
                  fontSize: 14,
                  fontFamily: "Inter_400Regular",
                  color: colors.secondaryText,
                  marginLeft: 8,
                }}
              >
                {freshUser.email}
              </Text>
            </View>
          )}
        </View>

        {/* Password Status */}
        {passwordStatusLoading ? (
          <View
            style={{
              backgroundColor: colors.cardBackground,
              borderRadius: 18,
              borderWidth: 1,
              borderColor: colors.border,
              padding: 20,
              marginBottom: 16,
              alignItems: "center",
            }}
          >
            <ActivityIndicator size="small" color={brand.gradientStart} />
          </View>
        ) : (
          <View
            style={{
              backgroundColor: colors.cardBackground,
              borderRadius: 18,
              borderWidth: 1,
              borderColor: isTemporaryPassword
                ? brand.warning + "40"
                : colors.border,
              padding: 20,
              marginBottom: 16,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 14,
              }}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: isTemporaryPassword
                    ? colors.warningBg
                    : colors.successBg,
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 12,
                }}
              >
                {isTemporaryPassword ? (
                  <AlertTriangle
                    size={18}
                    color={brand.warning}
                    strokeWidth={2}
                  />
                ) : (
                  <CheckCircle
                    size={18}
                    color={brand.success}
                    strokeWidth={2}
                  />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 15,
                    fontFamily: "Inter_600SemiBold",
                    color: colors.text,
                  }}
                >
                  Password
                </Text>
                <Text
                  style={{
                    fontSize: 13,
                    fontFamily: "Inter_500Medium",
                    color: isTemporaryPassword ? brand.warning : brand.success,
                    marginTop: 2,
                  }}
                >
                  {isTemporaryPassword
                    ? "Using temporary password"
                    : "Password set ✓"}
                </Text>
              </View>
            </View>

            {isTemporaryPassword && (
              <View
                style={{
                  backgroundColor: colors.warningBg,
                  borderRadius: 12,
                  padding: 14,
                  marginBottom: 14,
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontFamily: "Inter_500Medium",
                    color: brand.warning,
                    lineHeight: 19,
                    marginBottom: 6,
                  }}
                >
                  For your security, we recommend setting a new password.
                </Text>
                <Text
                  style={{
                    fontSize: 13,
                    fontFamily: "Inter_400Regular",
                    color: colors.secondaryText,
                    lineHeight: 20,
                  }}
                >
                  Check the original message from your administrator for your
                  current password.
                </Text>
              </View>
            )}

            <TouchableOpacity
              onPress={() => router.push("/change-password")}
              activeOpacity={0.85}
            >
              {isTemporaryPassword ? (
                <LinearGradient
                  colors={[brand.gradientStart, brand.gradientEnd]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{
                    borderRadius: 12,
                    paddingVertical: 14,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <KeyRound size={16} color="#FFFFFF" strokeWidth={2} />
                  <Text
                    style={{
                      fontSize: 15,
                      fontFamily: "Inter_600SemiBold",
                      color: "#FFFFFF",
                      marginLeft: 8,
                    }}
                  >
                    Set New Password
                  </Text>
                </LinearGradient>
              ) : (
                <View
                  style={{
                    borderRadius: 12,
                    paddingVertical: 14,
                    borderWidth: 1,
                    borderColor: colors.border,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <KeyRound size={16} color={colors.text} strokeWidth={1.5} />
                  <Text
                    style={{
                      fontSize: 15,
                      fontFamily: "Inter_600SemiBold",
                      color: colors.text,
                      marginLeft: 8,
                    }}
                  >
                    Change Password
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* About */}
        <View
          style={{
            backgroundColor: colors.cardBackground,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: colors.border,
            padding: 20,
            marginBottom: 20,
          }}
        >
          <Text
            style={{
              fontSize: 15,
              fontFamily: "Inter_600SemiBold",
              color: colors.text,
              marginBottom: 10,
            }}
          >
            About Your Account
          </Text>
          <Text
            style={{
              fontSize: 14,
              fontFamily: "Inter_400Regular",
              color: colors.secondaryText,
              lineHeight: 21,
            }}
          >
            As a property manager, you can view and manage tenant requests for
            your assigned properties. Contact your administrator for assistance.
          </Text>
        </View>

        {/* Sign Out */}
        <TouchableOpacity onPress={handleSignOut} activeOpacity={0.85}>
          <LinearGradient
            colors={[brand.error, "#A85858"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{
              paddingVertical: 16,
              borderRadius: 14,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <LogOut size={18} color="#FFFFFF" strokeWidth={2} />
            <Text
              style={{
                fontSize: 16,
                fontFamily: "Inter_600SemiBold",
                color: "#FFFFFF",
                marginLeft: 8,
              }}
            >
              Sign Out
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </ScreenContainer>
  );
}
