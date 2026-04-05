import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  AlertCircle,
  ChevronLeft,
  KeyRound,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  User,
  X,
} from "lucide-react-native";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
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

export default function ManageUsersScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [addName, setAddName] = useState("");
  const [addPhone, setAddPhone] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addError, setAddError] = useState("");

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["admin-users-manage"],
    queryFn: () => api.get("/api/admin/users"),
  });

  const users = (data?.users || []).filter((u) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      u.name?.toLowerCase().includes(q) ||
      u.phone_number?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q)
    );
  });

  const addMutation = useMutation({
    mutationFn: () =>
      api.post("/api/admin/users", {
        name: addName,
        phoneNumber: addPhone,
        email: addEmail || undefined,
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-users-manage"] });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setShowAddModal(false);
      setAddName("");
      setAddPhone("");
      setAddEmail("");
      Alert.alert(
        "User Created",
        `Temporary password: ${data.tempPassword}\nLogin email: ${data.loginEmail}`,
        [{ text: "OK" }]
      );
    },
    onError: (e) => setAddError(e?.message || "Failed to create user"),
  });

  const resetMutation = useMutation({
    mutationFn: (userId) => api.patch("/api/admin/users", { userId }),
    onSuccess: (data) => {
      Alert.alert(
        "Password Reset",
        `New temporary password: ${data.tempPassword}\nLogin email: ${data.loginEmail}`,
        [{ text: "OK" }]
      );
    },
    onError: (e) => Alert.alert("Error", e?.message || "Failed to reset password"),
  });

  const deleteMutation = useMutation({
    mutationFn: (userId) => api.delete(`/api/admin/users?userId=${userId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users-manage"] });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e) => Alert.alert("Error", e?.message || "Failed to delete user"),
  });

  const confirmDelete = (user) => {
    Alert.alert(
      "Delete User",
      `Are you sure you want to delete ${user.name}? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteMutation.mutate(user.id),
        },
      ]
    );
  };

  const handleAdd = () => {
    setAddError("");
    if (!addName.trim()) { setAddError("Name is required"); return; }
    if (!addPhone.trim()) { setAddError("Phone number is required"); return; }
    addMutation.mutate();
  };

  const renderUser = ({ item: user }) => (
    <View style={{
      backgroundColor: colors.cardBackground,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: spacing.md,
      overflow: "hidden",
    }}>
      <View style={{ padding: spacing.xl }}>
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: spacing.sm }}>
          <LinearGradient
            colors={[brandColors.gradientStart, brandColors.gradientEnd]}
            style={{ width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", marginRight: spacing.md }}
          >
            <User size={16} color="#FFFFFF" strokeWidth={2} />
          </LinearGradient>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: typography.sizes.md, fontWeight: typography.weights.semibold, color: colors.text }}>
              {user.name}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs, marginTop: 2 }}>
              <Phone size={11} color={colors.secondaryText} strokeWidth={2} />
              <Text style={{ fontSize: typography.sizes.xs, color: colors.secondaryText }}>{user.phone_number}</Text>
            </View>
          </View>
          <Badge
            label={user.is_temporary_password ? "Temp PW" : "Active"}
            variant={user.is_temporary_password ? "warning" : "success"}
            size="sm"
          />
        </View>

        {user.property_name && (
          <View style={{
            backgroundColor: colors.primaryLight,
            borderRadius: radius.md,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.xs,
            alignSelf: "flex-start",
            marginBottom: spacing.md,
          }}>
            <Text style={{ fontSize: typography.sizes.xs, color: colors.accentText, fontWeight: typography.weights.medium }}>
              {user.property_name}
            </Text>
          </View>
        )}

        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          <TouchableOpacity
            onPress={() => resetMutation.mutate(user.id)}
            disabled={resetMutation.isPending}
            activeOpacity={0.8}
            style={{
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: spacing.xs,
              paddingVertical: spacing.sm,
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <KeyRound size={14} color={colors.text} strokeWidth={2} />
            <Text style={{ fontSize: typography.sizes.xs, fontWeight: typography.weights.medium, color: colors.text }}>
              Reset PW
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => confirmDelete(user)}
            activeOpacity={0.8}
            style={{
              paddingHorizontal: spacing.lg,
              paddingVertical: spacing.sm,
              borderRadius: radius.md,
              backgroundColor: colors.errorBg,
              borderWidth: 1,
              borderColor: `${brandColors.error}30`,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Trash2 size={14} color={brandColors.error} strokeWidth={2} />
          </TouchableOpacity>
        </View>
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
          paddingBottom: spacing['2xl'],
          paddingHorizontal: spacing['2xl'],
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: spacing.xl }}>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.8} style={{ marginRight: spacing.md }}>
            <ChevronLeft size={24} color="#F0EDE8" strokeWidth={2} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: typography.sizes['2xl'], fontWeight: typography.weights.bold, color: "#F0EDE8", letterSpacing: -0.5 }}>
              Manage Users
            </Text>
            <Text style={{ fontSize: typography.sizes.sm, color: "rgba(240,237,232,0.55)", marginTop: 2 }}>
              {data?.users?.length ?? 0} managers registered
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => { setShowAddModal(true); setAddError(""); }}
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

        {/* Search */}
        <View style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: "rgba(255,255,255,0.1)",
          borderRadius: radius.lg,
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.md,
          gap: spacing.sm,
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.12)",
        }}>
          <Search size={16} color="rgba(240,237,232,0.5)" strokeWidth={2} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search by name or phone…"
            placeholderTextColor="rgba(240,237,232,0.35)"
            style={{ flex: 1, fontSize: typography.sizes.md, color: "#F0EDE8" }}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")} hitSlop={8}>
              <X size={14} color="rgba(240,237,232,0.5)" strokeWidth={2} />
            </Pressable>
          )}
        </View>
      </LinearGradient>

      {/* List */}
      {isLoading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color={brandColors.gradientStart} />
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(u) => String(u.id)}
          renderItem={renderUser}
          contentContainerStyle={{ padding: spacing.xl, paddingBottom: insets.bottom + spacing['4xl'] }}
          refreshing={isRefetching}
          onRefresh={refetch}
          ListEmptyComponent={() => (
            <View style={{ alignItems: "center", paddingTop: spacing['5xl'] }}>
              <User size={48} color={colors.emptyStateIcon} strokeWidth={1} />
              <Text style={{ fontSize: typography.sizes.lg, fontWeight: typography.weights.semibold, color: colors.text, marginTop: spacing.xl, marginBottom: spacing.sm }}>
                {search ? "No results found" : "No users yet"}
              </Text>
              <Text style={{ fontSize: typography.sizes.sm, color: colors.secondaryText, textAlign: "center" }}>
                {search ? "Try a different search term" : "Tap + to add the first manager"}
              </Text>
            </View>
          )}
        />
      )}

      {/* Add User Modal */}
      <Modal visible={showAddModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowAddModal(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <View style={{ flex: 1, backgroundColor: colors.background }}>
            <View style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              padding: spacing['2xl'],
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
            }}>
              <Text style={{ fontSize: typography.sizes.xl, fontWeight: typography.weights.bold, color: colors.text }}>
                Add Manager
              </Text>
              <Pressable onPress={() => setShowAddModal(false)} hitSlop={8}>
                <X size={22} color={colors.secondaryText} strokeWidth={2} />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={{ padding: spacing['2xl'] }} keyboardShouldPersistTaps="handled">
              {addError ? (
                <View style={{
                  backgroundColor: colors.errorBg,
                  borderRadius: radius.md,
                  padding: spacing.lg,
                  marginBottom: spacing.xl,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: spacing.sm,
                }}>
                  <AlertCircle size={16} color={brandColors.error} strokeWidth={2} />
                  <Text style={{ fontSize: typography.sizes.sm, color: brandColors.error, flex: 1 }}>{addError}</Text>
                </View>
              ) : null}

              <Text style={labelStyle}>Full Name *</Text>
              <TextInput
                value={addName}
                onChangeText={setAddName}
                placeholder="e.g. John Smith"
                placeholderTextColor={colors.placeholderText}
                style={[inputStyle, { color: colors.text, backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.03)", borderColor: colors.border }]}
              />

              <Text style={[labelStyle, { marginTop: spacing.lg }]}>Phone Number *</Text>
              <TextInput
                value={addPhone}
                onChangeText={setAddPhone}
                placeholder="+1 (555) 000-0000"
                placeholderTextColor={colors.placeholderText}
                keyboardType="phone-pad"
                style={[inputStyle, { color: colors.text, backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.03)", borderColor: colors.border }]}
              />

              <Text style={[labelStyle, { marginTop: spacing.lg }]}>Email (optional)</Text>
              <TextInput
                value={addEmail}
                onChangeText={setAddEmail}
                placeholder="manager@example.com"
                placeholderTextColor={colors.placeholderText}
                keyboardType="email-address"
                autoCapitalize="none"
                style={[inputStyle, { color: colors.text, backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.03)", borderColor: colors.border }]}
              />

              <View style={{ backgroundColor: colors.warningBg, borderRadius: radius.md, padding: spacing.lg, marginTop: spacing.xl, marginBottom: spacing['3xl'] }}>
                <Text style={{ fontSize: typography.sizes.sm, color: brandColors.warning, lineHeight: 20 }}>
                  A temporary password will be generated automatically. Share it securely with the new manager.
                </Text>
              </View>

              <TouchableOpacity onPress={handleAdd} disabled={addMutation.isPending} activeOpacity={0.85}>
                <LinearGradient
                  colors={[brandColors.accentStart, brandColors.accentEnd]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ paddingVertical: 17, borderRadius: radius.lg, alignItems: "center", opacity: addMutation.isPending ? 0.7 : 1 }}
                >
                  {addMutation.isPending ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={{ fontSize: typography.sizes.lg, fontWeight: typography.weights.semibold, color: "#FFFFFF" }}>
                      Create Manager
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
  color: "rgba(139,149,163,1)",
  letterSpacing: 0.5,
  textTransform: "uppercase",
  marginBottom: spacing.sm,
};

const inputStyle = {
  borderRadius: radius.md,
  borderWidth: 1,
  paddingHorizontal: spacing.lg,
  paddingVertical: spacing.md,
  fontSize: typography.sizes.md,
};
