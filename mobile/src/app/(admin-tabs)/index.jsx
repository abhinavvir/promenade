import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import {
  Users,
  Building2,
  ClipboardList,
  TrendingUp,
  ChevronRight,
  ArrowUpRight,
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import ScreenContainer from "@/components/ScreenContainer";
import ScreenHeader from "@/components/ScreenHeader";
import { useTheme, brandColors } from "@/components/hooks/useTheme";
import TriangleLogo from "@/components/TriangleLogo";
import { api } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/utils/auth/useAuth";

export default function AdminDashboard() {
  const { colors, brand, isDark } = useTheme();
  const router = useRouter();
  const { isReady, auth } = useAuth();

  // Fetch users
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => api.get("/api/admin/users"),
    enabled: isReady && !!auth,
  });

  // Fetch sign-in logs
  const { data: logsData, isLoading: logsLoading } = useQuery({
    queryKey: ["admin-signin-logs"],
    queryFn: () => api.get("/api/admin/signin-logs?limit=100"),
    enabled: isReady && !!auth,
  });

  const isLoading = usersLoading || logsLoading;

  const usersList = usersData?.users || [];
  const totalUsers = usersList.length;
  const logsList = logsData?.logs || [];
  const totalProperties = usersList.filter((u) => u.property_id).length;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const signInsToday = logsList.filter(
    (log) => new Date(log.created_at) >= today,
  ).length;
  const successfulSignIns = logsList.filter(
    (log) => log.sign_in_status === "success",
  ).length;

  if (!isReady) {
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

  const statCards = [
    {
      icon: Users,
      title: "Total Users",
      value: totalUsers,
      gradient: [brand.gradientStart, brand.gradientEnd],
      onPress: () => router.push("/manage-users"),
    },
    {
      icon: Building2,
      title: "Properties",
      value: totalProperties,
      gradient: ["#3D6B5E", "#5BAB8B"],
      onPress: () => router.push("/assign-property"),
    },
    {
      icon: ClipboardList,
      title: "Successful",
      value: successfulSignIns,
      gradient: ["#8B6B3D", "#C4956A"],
      onPress: null,
    },
    {
      icon: TrendingUp,
      title: "Today",
      value: signInsToday,
      gradient: ["#5A3D6B", "#8B6BAB"],
      onPress: () => router.push("/(admin-tabs)/signin-logs"),
    },
  ];

  return (
    <ScreenContainer scrollable={false}>
      <ScreenHeader title="Dashboard" />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <View style={{ paddingTop: 100, alignItems: "center" }}>
            <ActivityIndicator size="large" color={brand.gradientStart} />
          </View>
        ) : (
          <>
            {/* Stat Cards Grid */}
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                marginHorizontal: -6,
              }}
            >
              {statCards.map((card, index) => {
                const IconComp = card.icon;
                return (
                  <TouchableOpacity
                    key={index}
                    onPress={card.onPress}
                    activeOpacity={card.onPress ? 0.8 : 1}
                    style={{
                      width: "50%",
                      paddingHorizontal: 6,
                      marginBottom: 12,
                    }}
                  >
                    <LinearGradient
                      colors={card.gradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={{
                        borderRadius: 20,
                        padding: 20,
                        minHeight: 130,
                        justifyContent: "space-between",
                      }}
                    >
                      <View
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                        }}
                      >
                        <View
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: 12,
                            backgroundColor: "rgba(255,255,255,0.18)",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <IconComp
                            size={20}
                            color="#FFFFFF"
                            strokeWidth={1.5}
                          />
                        </View>
                        {card.onPress && (
                          <ArrowUpRight
                            size={16}
                            color="rgba(255,255,255,0.5)"
                            strokeWidth={2}
                          />
                        )}
                      </View>
                      <View style={{ marginTop: 16 }}>
                        <Text
                          style={{
                            fontSize: 28,
                            fontFamily: "Inter_700Bold",
                            color: "#FFFFFF",
                            marginBottom: 2,
                          }}
                        >
                          {card.value}
                        </Text>
                        <Text
                          style={{
                            fontSize: 12,
                            fontFamily: "Inter_500Medium",
                            color: "rgba(255,255,255,0.7)",
                            letterSpacing: 0.3,
                          }}
                        >
                          {card.title}
                        </Text>
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Quick Actions */}
            <View style={{ marginTop: 20 }}>
              <Text
                style={{
                  fontSize: 14,
                  fontFamily: "Inter_600SemiBold",
                  color: colors.secondaryText,
                  letterSpacing: 0.5,
                  textTransform: "uppercase",
                  marginBottom: 14,
                }}
              >
                Quick Actions
              </Text>

              {[
                {
                  title: "Manage Users",
                  subtitle: "Add or remove property managers",
                  onPress: () => router.push("/manage-users"),
                },
                {
                  title: "Assign Properties",
                  subtitle: "Link managers to buildings",
                  onPress: () => router.push("/assign-property"),
                },
                {
                  title: "View Sign-In Logs",
                  subtitle: "Full activity audit trail",
                  onPress: () => router.push("/(admin-tabs)/signin-logs"),
                },
              ].map((action, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={action.onPress}
                  activeOpacity={0.7}
                  style={{
                    backgroundColor: colors.cardBackground,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: colors.border,
                    padding: 18,
                    marginBottom: 10,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 15,
                        fontFamily: "Inter_600SemiBold",
                        color: colors.text,
                        marginBottom: 3,
                      }}
                    >
                      {action.title}
                    </Text>
                    <Text
                      style={{
                        fontSize: 13,
                        fontFamily: "Inter_400Regular",
                        color: colors.secondaryText,
                      }}
                    >
                      {action.subtitle}
                    </Text>
                  </View>
                  <ChevronRight
                    size={18}
                    color={colors.secondaryText}
                    strokeWidth={1.5}
                  />
                </TouchableOpacity>
              ))}
            </View>

            {/* Brand footer */}
            <View style={{ marginTop: 28, alignItems: "center", opacity: 0.3 }}>
              <TriangleLogo size={18} color={colors.secondaryText} />
              <Text
                style={{
                  fontSize: 10,
                  fontFamily: "Inter_500Medium",
                  color: colors.secondaryText,
                  marginTop: 6,
                  letterSpacing: 1.5,
                  textTransform: "uppercase",
                }}
              >
                Promenade
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
