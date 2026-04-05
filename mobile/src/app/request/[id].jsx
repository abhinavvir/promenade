import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  User,
  Mail,
  MapPin,
} from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useTheme } from "@/components/hooks/useTheme";
import { api } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/utils/auth/useAuth";

export default function RequestDetailScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { isReady, auth } = useAuth();

  // Fetch request details
  const { data: requestData, isLoading } = useQuery({
    queryKey: ["request", id],
    queryFn: () => api.get(`/api/requests/${id}`),
    enabled: isReady && !!auth && !!id,
  });

  const request = requestData?.request;

  // Update request mutation
  const updateMutation = useMutation({
    mutationFn: (status) => api.put(`/api/requests/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["requests"] });
      queryClient.invalidateQueries({ queryKey: ["request", id] });
      Alert.alert("Success", "Request status updated successfully");
    },
    onError: () => {
      Alert.alert("Error", "Failed to update request status");
    },
  });

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "high":
        return "#FF4D4F";
      case "medium":
        return "#FFA500";
      case "low":
        return "#52C41A";
      default:
        return colors.secondaryText;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "pending":
        return Clock;
      case "in_progress":
        return AlertCircle;
      case "completed":
        return CheckCircle2;
      case "cancelled":
        return XCircle;
      default:
        return Clock;
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleStatusUpdate = (newStatus) => {
    Alert.alert(
      "Update Status",
      `Are you sure you want to mark this request as ${newStatus.replace("_", " ")}?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Confirm", onPress: () => updateMutation.mutate(newStatus) },
      ],
    );
  };

  if (!isReady || isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <StatusBar style={isDark ? "light" : "dark"} />
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      </View>
    );
  }

  if (!request) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <StatusBar style={isDark ? "light" : "dark"} />
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
            }}
          >
            Request Not Found
          </Text>
        </View>
      </View>
    );
  }

  const StatusIcon = getStatusIcon(request.status);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style={isDark ? "light" : "dark"} />

      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 16,
          paddingHorizontal: 20,
          paddingBottom: 16,
          flexDirection: "row",
          alignItems: "center",
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            width: 36,
            height: 36,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.cardBackground,
            justifyContent: "center",
            alignItems: "center",
            marginRight: 12,
          }}
        >
          <ArrowLeft size={20} color={colors.text} strokeWidth={1.5} />
        </TouchableOpacity>
        <Text
          style={{
            fontSize: 18,
            fontFamily: "Inter_600SemiBold",
            color: colors.text,
            flex: 1,
          }}
        >
          Request Details
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
      >
        {/* Priority & Status */}
        <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
          <View style={{ flexDirection: "row", marginBottom: 20 }}>
            <View
              style={{
                backgroundColor: getPriorityColor(request.priority) + "20",
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 8,
                marginRight: 12,
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontFamily: "Inter_600SemiBold",
                  color: getPriorityColor(request.priority),
                  textTransform: "uppercase",
                }}
              >
                {request.priority} Priority
              </Text>
            </View>

            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <StatusIcon
                size={16}
                color={colors.secondaryText}
                strokeWidth={1.5}
              />
              <Text
                style={{
                  fontSize: 14,
                  fontFamily: "Inter_500Medium",
                  color: colors.secondaryText,
                  marginLeft: 6,
                  textTransform: "capitalize",
                }}
              >
                {request.status.replace("_", " ")}
              </Text>
            </View>
          </View>

          {/* Title */}
          <Text
            style={{
              fontSize: 24,
              fontFamily: "Inter_600SemiBold",
              color: colors.text,
              marginBottom: 8,
              lineHeight: 32,
            }}
          >
            {request.title}
          </Text>

          {/* Property Info */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 20,
            }}
          >
            <MapPin size={16} color={colors.secondaryText} strokeWidth={1.5} />
            <Text
              style={{
                fontSize: 14,
                fontFamily: "Inter_400Regular",
                color: colors.secondaryText,
                marginLeft: 6,
              }}
            >
              {request.property_name}
            </Text>
          </View>

          {/* Description */}
          <View
            style={{
              backgroundColor: colors.cardBackground,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: colors.border,
              padding: 20,
              marginBottom: 20,
            }}
          >
            <Text
              style={{
                fontSize: 14,
                fontFamily: "Inter_500Medium",
                color: colors.text,
                marginBottom: 12,
              }}
            >
              Description
            </Text>
            <Text
              style={{
                fontSize: 14,
                fontFamily: "Inter_400Regular",
                color: colors.secondaryText,
                lineHeight: 22,
              }}
            >
              {request.description}
            </Text>
          </View>

          {/* Tenant Info */}
          <View
            style={{
              backgroundColor: colors.cardBackground,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: colors.border,
              padding: 20,
              marginBottom: 20,
            }}
          >
            <Text
              style={{
                fontSize: 14,
                fontFamily: "Inter_500Medium",
                color: colors.text,
                marginBottom: 16,
              }}
            >
              Tenant Information
            </Text>

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <User size={16} color={colors.secondaryText} strokeWidth={1.5} />
              <Text
                style={{
                  fontSize: 14,
                  fontFamily: "Inter_400Regular",
                  color: colors.secondaryText,
                  marginLeft: 8,
                }}
              >
                {request.tenant_name}
              </Text>
            </View>

            {request.tenant_email && (
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Mail
                  size={16}
                  color={colors.secondaryText}
                  strokeWidth={1.5}
                />
                <Text
                  style={{
                    fontSize: 14,
                    fontFamily: "Inter_400Regular",
                    color: colors.secondaryText,
                    marginLeft: 8,
                  }}
                >
                  {request.tenant_email}
                </Text>
              </View>
            )}
          </View>

          {/* Timestamps */}
          <View
            style={{
              backgroundColor: colors.cardBackground,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: colors.border,
              padding: 20,
              marginBottom: 20,
            }}
          >
            <View style={{ marginBottom: 12 }}>
              <Text
                style={{
                  fontSize: 12,
                  fontFamily: "Inter_500Medium",
                  color: colors.tertiaryText,
                  marginBottom: 4,
                }}
              >
                Created
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  fontFamily: "Inter_400Regular",
                  color: colors.secondaryText,
                }}
              >
                {formatDate(request.created_at)}
              </Text>
            </View>

            <View>
              <Text
                style={{
                  fontSize: 12,
                  fontFamily: "Inter_500Medium",
                  color: colors.tertiaryText,
                  marginBottom: 4,
                }}
              >
                Last Updated
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  fontFamily: "Inter_400Regular",
                  color: colors.secondaryText,
                }}
              >
                {formatDate(request.updated_at)}
              </Text>
            </View>
          </View>

          {/* Action Buttons */}
          {request.status === "pending" && (
            <View style={{ marginBottom: 20 }}>
              <TouchableOpacity
                onPress={() => handleStatusUpdate("in_progress")}
                disabled={updateMutation.isLoading}
                style={{
                  backgroundColor: "#2563EB",
                  borderRadius: 12,
                  padding: 16,
                  alignItems: "center",
                  marginBottom: 12,
                }}
              >
                <Text
                  style={{
                    fontSize: 16,
                    fontFamily: "Inter_600SemiBold",
                    color: "#FFFFFF",
                  }}
                >
                  Start Working
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleStatusUpdate("completed")}
                disabled={updateMutation.isLoading}
                style={{
                  backgroundColor: "#52C41A",
                  borderRadius: 12,
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
                  Mark as Completed
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {request.status === "in_progress" && (
            <TouchableOpacity
              onPress={() => handleStatusUpdate("completed")}
              disabled={updateMutation.isLoading}
              style={{
                backgroundColor: "#52C41A",
                borderRadius: 12,
                padding: 16,
                alignItems: "center",
                marginBottom: 20,
              }}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontFamily: "Inter_600SemiBold",
                  color: "#FFFFFF",
                }}
              >
                Mark as Completed
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
