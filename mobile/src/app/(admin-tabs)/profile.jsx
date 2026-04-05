import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { LogOut, User as UserIcon, Mail, Shield } from "lucide-react-native";
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
  const { signOut } = useAuth();
  const { data: user, loading } = useUser();

  // Fetch fresh profile from backend to get accurate name/role
  const { data: profileData } = useQuery({
    queryKey: ["admin-profile", user?.id],
    queryFn: () => api.get("/api/auth/me"),
    enabled: !!user?.id,
  });

  const freshUser = profileData?.user || user;

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await signOut();
          router.replace("/");
        },
      },
    ]);
  };


  return (
    <ScreenContainer>
      <ScreenHeader title="Profile" />

      <View style={{ paddingHorizontal: 20 }}>
        {/* Avatar + Info Card */}
        <View
          style={{
            backgroundColor: colors.cardBackground,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: colors.border,
            padding: 24,
            marginBottom: 20,
            alignItems: "center",
          }}
        >
          <LinearGradient
            colors={[brand.gradientStart, brand.gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 16,
            }}
          >
            <TriangleLogo size={32} color="#FFFFFF" />
          </LinearGradient>

          <Text
            style={{
              fontSize: 22,
              fontFamily: "Inter_600SemiBold",
              color: colors.text,
              marginBottom: 6,
            }}
          >
            {freshUser?.name || "Admin User"}
          </Text>

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: colors.successBg,
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 20,
              marginBottom: 16,
            }}
          >
            <Shield size={14} color={brand.success} strokeWidth={2} />
            <Text
              style={{
                fontSize: 13,
                fontFamily: "Inter_500Medium",
                color: brand.success,
                marginLeft: 6,
              }}
            >
              Administrator
            </Text>
          </View>

          {freshUser?.email && (
            <View style={{ flexDirection: "row", alignItems: "center" }}>
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

          {freshUser?.phone_number && (
            <Text
              style={{
                fontSize: 13,
                fontFamily: "Inter_400Regular",
                color: colors.tertiaryText,
                marginTop: 6,
              }}
            >
              {freshUser.phone_number}
            </Text>
          )}
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
