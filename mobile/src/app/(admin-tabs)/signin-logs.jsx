import React from "react";
import {
  View,
  Text,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from "react-native";
import { MapPin, CheckCircle, XCircle, Clock } from "lucide-react-native";
import ScreenContainer from "@/components/ScreenContainer";
import ScreenHeader from "@/components/ScreenHeader";
import { useTheme, brandColors } from "@/components/hooks/useTheme";
import { api } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/utils/auth/useAuth";

export default function SignInLogsScreen() {
  const { colors, brand } = useTheme();
  const { isReady, auth } = useAuth();

  const {
    data: logsData,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["signin-logs"],
    queryFn: () => api.get("/api/admin/signin-logs"),
    enabled: isReady && !!auth,
  });

  const logs = logsData?.logs || [];

  const getStatusColor = (status, action) => {
    if (action === "check_in") return brand.success;
    if (action === "check_out") return brand.gradientEnd;
    if (status === "success") return brand.success;
    if (status?.includes("failed")) return brand.error;
    return brand.slate;
  };

  const getStatusBg = (status, action) => {
    if (action === "check_in") return colors.successBg;
    if (action === "check_out") return colors.primaryLight;
    if (status === "success") return colors.successBg;
    if (status?.includes("failed")) return colors.errorBg;
    return colors.emptyStateBg;
  };

  const getStatusLabel = (status, action) => {
    if (action === "check_in") return "Checked In";
    if (action === "check_out") return "Checked Out";
    if (status === "success") return "Verified";
    if (status?.includes("failed")) return "Failed";
    return status || "Pending";
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

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

  return (
    <ScreenContainer scrollable={false}>
      <ScreenHeader title="Sign-In Logs" />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
      >
        {isLoading ? (
          <View style={{ paddingTop: 100, alignItems: "center" }}>
            <ActivityIndicator size="large" color={brand.gradientStart} />
          </View>
        ) : logs.length === 0 ? (
          <View
            style={{
              paddingTop: 100,
              alignItems: "center",
              paddingHorizontal: 40,
            }}
          >
            <Clock size={56} color={colors.emptyStateIcon} strokeWidth={1} />
            <Text
              style={{
                fontSize: 18,
                fontFamily: "Inter_600SemiBold",
                color: colors.text,
                textAlign: "center",
                marginTop: 16,
                marginBottom: 8,
              }}
            >
              No Sign-In Logs
            </Text>
            <Text
              style={{
                fontSize: 14,
                fontFamily: "Inter_400Regular",
                color: colors.secondaryText,
                textAlign: "center",
                lineHeight: 20,
              }}
            >
              There are no sign-in attempts recorded yet.
            </Text>
          </View>
        ) : (
          logs.map((log) => {
            const statusColor = getStatusColor(log.sign_in_status, log.action);
            const statusBg = getStatusBg(log.sign_in_status, log.action);

            return (
              <View
                key={log.id}
                style={{
                  backgroundColor: colors.cardBackground,
                  borderRadius: 18,
                  borderWidth: 1,
                  borderColor: colors.border,
                  padding: 18,
                  marginBottom: 10,
                }}
              >
                {/* Header row */}
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: 12,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 16,
                        fontFamily: "Inter_600SemiBold",
                        color: colors.text,
                        marginBottom: 3,
                      }}
                    >
                      {log.user_name || "Unknown User"}
                    </Text>
                    <Text
                      style={{
                        fontSize: 13,
                        fontFamily: "Inter_400Regular",
                        color: colors.secondaryText,
                      }}
                    >
                      {log.email || log.phone_number}
                    </Text>
                  </View>

                  <View
                    style={{
                      backgroundColor: statusBg,
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                      borderRadius: 10,
                      flexDirection: "row",
                      alignItems: "center",
                    }}
                  >
                    {log.sign_in_status === "success" ||
                    log.action === "check_in" ||
                    log.action === "check_out" ? (
                      <CheckCircle
                        size={13}
                        color={statusColor}
                        strokeWidth={2}
                      />
                    ) : (
                      <XCircle size={13} color={statusColor} strokeWidth={2} />
                    )}
                    <Text
                      style={{
                        fontSize: 12,
                        fontFamily: "Inter_500Medium",
                        color: statusColor,
                        marginLeft: 5,
                      }}
                    >
                      {getStatusLabel(log.sign_in_status, log.action)}
                    </Text>
                  </View>
                </View>

                {/* Property */}
                {log.property_name && (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginBottom: 6,
                    }}
                  >
                    <MapPin
                      size={13}
                      color={colors.secondaryText}
                      strokeWidth={1.5}
                    />
                    <Text
                      style={{
                        fontSize: 13,
                        fontFamily: "Inter_400Regular",
                        color: colors.secondaryText,
                        marginLeft: 6,
                      }}
                    >
                      {log.property_name}
                    </Text>
                  </View>
                )}

                {/* Footer */}
                <View
                  style={{
                    marginTop: 8,
                    paddingTop: 10,
                    borderTopWidth: 1,
                    borderTopColor: colors.divider,
                    flexDirection: "row",
                    justifyContent: "space-between",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontFamily: "Inter_400Regular",
                      color: colors.tertiaryText,
                    }}
                  >
                    {formatDate(log.created_at)}
                  </Text>
                  {log.distance_from_property !== null &&
                    log.distance_from_property !== undefined && (
                      <Text
                        style={{
                          fontSize: 12,
                          fontFamily: "Inter_400Regular",
                          color: colors.tertiaryText,
                        }}
                      >
                        {Math.round(log.distance_from_property)}m away
                      </Text>
                    )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
