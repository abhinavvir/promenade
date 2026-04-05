import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import {
  BarChart2,
  Calendar,
  CheckCircle,
  Clock,
  Download,
  TrendingUp,
  User,
  XCircle,
} from "lucide-react-native";
import { useState, useCallback } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  Share,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useTheme, brandColors } from "@/components/hooks/useTheme";
import { Badge } from "@/components/ui";
import { radius, shadows, spacing, typography } from "@/lib/design/tokens";

// ─── Date helpers ────────────────────────────────────────────────────────────
function toISO(date) {
  return date.toISOString().split("T")[0];
}

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function startOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sunday
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

const PRESETS = [
  { label: "Today", key: "today" },
  { label: "This Week", key: "week" },
  { label: "This Month", key: "month" },
  { label: "Last 30 Days", key: "30d" },
];

function getPresetDates(key) {
  const today = startOfDay(new Date());
  switch (key) {
    case "today":
      return { start: today, end: today };
    case "week":
      return { start: startOfWeek(today), end: today };
    case "month":
      return { start: startOfMonth(today), end: today };
    case "30d":
      return { start: addDays(today, -29), end: today };
    default:
      return { start: today, end: today };
  }
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDuration(mins) {
  if (mins === null || mins === undefined) return "—";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function ReportsScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const [activePreset, setActivePreset] = useState("week");
  const [dates, setDates] = useState(() => getPresetDates("week"));
  const [expandedManager, setExpandedManager] = useState(null);

  const selectPreset = (key) => {
    setActivePreset(key);
    setDates(getPresetDates(key));
    setExpandedManager(null);
  };

  const startISO = toISO(dates.start);
  const endISO = toISO(dates.end);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["admin-reports", startISO, endISO],
    queryFn: () =>
      api.get(`/api/admin/reports?startDate=${startISO}&endDate=${endISO}`),
  });

  const summary = data?.summary || [];
  const sessions = data?.sessions || [];

  // Aggregate totals
  const totalSessions = summary.reduce((acc, m) => acc + m.totalSessions, 0);
  const totalHours = summary.reduce((acc, m) => acc + m.totalHours, 0);
  const totalComplete = summary.reduce((acc, m) => acc + m.completedSessions, 0);
  const compliance =
    totalSessions > 0 ? Math.round((totalComplete / totalSessions) * 100) : 0;

  // Build CSV content on device for sharing
  const buildCsv = useCallback(() => {
    const header = [
      "Session ID",
      "Manager",
      "Phone",
      "Property",
      "Check-In",
      "Check-Out",
      "Duration (mins)",
      "Status",
    ].join(",");
    const rows = sessions.map((s) =>
      [
        s.id,
        `"${s.manager_name ?? ""}"`,
        s.phone_number ?? "",
        `"${s.property_name ?? ""}"`,
        s.check_in_time ? new Date(s.check_in_time).toISOString() : "",
        s.check_out_time ? new Date(s.check_out_time).toISOString() : "",
        s.durationMinutes ?? "",
        s.check_in_status ?? "",
      ].join(",")
    );
    return [header, ...rows].join("\n");
  }, [sessions]);

  const handleExport = async () => {
    if (sessions.length === 0) {
      Alert.alert("No Data", "There are no sessions in this date range to export.");
      return;
    }
    try {
      const csv = buildCsv();
      await Share.share({
        title: `Promenade Report ${startISO} to ${endISO}`,
        message: csv,
      });
    } catch (e) {
      Alert.alert("Export Failed", e?.message || "Could not share report.");
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style={isDark ? "light" : "dark"} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        refreshing={isRefetching}
      >
        {/* ── Header ── */}
        <LinearGradient
          colors={[brandColors.gradientStart, brandColors.gradientMid, brandColors.gradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            paddingTop: insets.top + spacing.xl,
            paddingBottom: spacing["3xl"],
            paddingHorizontal: spacing["2xl"],
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.xl }}>
            <View>
              <Text style={{ fontSize: typography.sizes["2xl"], fontWeight: typography.weights.bold, color: "#F0EDE8", letterSpacing: -0.5 }}>
                Reports
              </Text>
              <Text style={{ fontSize: typography.sizes.sm, color: "rgba(240,237,232,0.55)", marginTop: 2 }}>
                {startISO === endISO ? startISO : `${startISO} → ${endISO}`}
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleExport}
              activeOpacity={0.85}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: spacing.xs,
                backgroundColor: "rgba(255,255,255,0.12)",
                borderRadius: radius.lg,
                paddingHorizontal: spacing.lg,
                paddingVertical: spacing.md,
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.15)",
              }}
            >
              <Download size={15} color="#F0EDE8" strokeWidth={2} />
              <Text style={{ fontSize: typography.sizes.sm, fontWeight: typography.weights.semibold, color: "#F0EDE8" }}>
                Export CSV
              </Text>
            </TouchableOpacity>
          </View>

          {/* Date presets */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
            {PRESETS.map((p) => (
              <TouchableOpacity
                key={p.key}
                onPress={() => selectPreset(p.key)}
                activeOpacity={0.8}
                style={{
                  paddingHorizontal: spacing.lg,
                  paddingVertical: spacing.sm,
                  borderRadius: radius.full,
                  backgroundColor: activePreset === p.key ? brandColors.accentStart : "rgba(255,255,255,0.1)",
                  borderWidth: 1,
                  borderColor: activePreset === p.key ? brandColors.accentStart : "rgba(255,255,255,0.15)",
                }}
              >
                <Text style={{
                  fontSize: typography.sizes.sm,
                  fontWeight: typography.weights.semibold,
                  color: activePreset === p.key ? "#FFFFFF" : "rgba(240,237,232,0.7)",
                }}>
                  {p.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </LinearGradient>

        {isLoading ? (
          <View style={{ alignItems: "center", paddingTop: spacing["5xl"] }}>
            <ActivityIndicator size="large" color={brandColors.gradientStart} />
          </View>
        ) : (
          <View style={{ paddingHorizontal: spacing.xl, paddingTop: spacing.xl }}>

            {/* ── Summary stat cards ── */}
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.md, marginBottom: spacing.xl }}>
              {[
                { label: "Total Sessions", value: totalSessions, icon: <BarChart2 size={18} color={brandColors.gradientEnd} strokeWidth={1.5} />, color: brandColors.gradientEnd },
                { label: "Total Hours", value: `${totalHours.toFixed(1)}h`, icon: <Clock size={18} color={brandColors.accentStart} strokeWidth={1.5} />, color: brandColors.accentStart },
                { label: "Completed", value: totalComplete, icon: <CheckCircle size={18} color={brandColors.success} strokeWidth={1.5} />, color: brandColors.success },
                { label: "Compliance", value: `${compliance}%`, icon: <TrendingUp size={18} color={compliance >= 80 ? brandColors.success : brandColors.warning} strokeWidth={1.5} />, color: compliance >= 80 ? brandColors.success : brandColors.warning },
              ].map(({ label, value, icon, color }) => (
                <View
                  key={label}
                  style={{
                    flex: 1,
                    minWidth: "45%",
                    backgroundColor: colors.cardBackground,
                    borderRadius: radius.xl,
                    borderWidth: 1,
                    borderColor: colors.border,
                    padding: spacing.xl,
                    ...shadows.sm,
                  }}
                >
                  <View style={{ marginBottom: spacing.sm }}>{icon}</View>
                  <Text style={{ fontSize: typography.sizes["2xl"], fontWeight: typography.weights.bold, color: colors.text, marginBottom: 2 }}>
                    {value}
                  </Text>
                  <Text style={{ fontSize: typography.sizes.xs, fontWeight: typography.weights.medium, color: colors.secondaryText, textTransform: "uppercase", letterSpacing: 0.4 }}>
                    {label}
                  </Text>
                </View>
              ))}
            </View>

            {/* ── Per-manager breakdown ── */}
            <Text style={{
              fontSize: typography.sizes.xs,
              fontWeight: typography.weights.semibold,
              color: colors.secondaryText,
              textTransform: "uppercase",
              letterSpacing: 0.5,
              marginBottom: spacing.md,
            }}>
              Manager Breakdown
            </Text>

            {summary.length === 0 ? (
              <View style={{
                backgroundColor: colors.cardBackground,
                borderRadius: radius.xl,
                borderWidth: 1,
                borderColor: colors.border,
                padding: spacing["3xl"],
                alignItems: "center",
                marginBottom: spacing.xl,
              }}>
                <BarChart2 size={40} color={colors.emptyStateIcon} strokeWidth={1} />
                <Text style={{ fontSize: typography.sizes.lg, fontWeight: typography.weights.semibold, color: colors.text, marginTop: spacing.xl, marginBottom: spacing.sm }}>
                  No activity in this period
                </Text>
                <Text style={{ fontSize: typography.sizes.sm, color: colors.secondaryText, textAlign: "center" }}>
                  There are no check-ins recorded in the selected date range.
                </Text>
              </View>
            ) : (
              summary.map((m) => {
                const isExpanded = expandedManager === m.userId;
                const managerSessions = sessions.filter((s) => s.user_id === m.userId);
                const completeRate =
                  m.totalSessions > 0
                    ? Math.round((m.completedSessions / m.totalSessions) * 100)
                    : 0;

                return (
                  <View
                    key={m.userId}
                    style={{
                      backgroundColor: colors.cardBackground,
                      borderRadius: radius.xl,
                      borderWidth: 1,
                      borderColor: isExpanded ? `${brandColors.accentStart}50` : colors.border,
                      marginBottom: spacing.md,
                      overflow: "hidden",
                    }}
                  >
                    {/* Manager header row */}
                    <Pressable
                      onPress={() => setExpandedManager(isExpanded ? null : m.userId)}
                      style={{ padding: spacing.xl }}
                    >
                      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: spacing.lg }}>
                        <LinearGradient
                          colors={[brandColors.gradientStart, brandColors.gradientEnd]}
                          style={{ width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", marginRight: spacing.md }}
                        >
                          <User size={18} color="#FFFFFF" strokeWidth={2} />
                        </LinearGradient>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: typography.sizes.md, fontWeight: typography.weights.semibold, color: colors.text }}>
                            {m.managerName}
                          </Text>
                          <Text style={{ fontSize: typography.sizes.xs, color: colors.secondaryText, marginTop: 1 }}>
                            {m.propertyName ?? "No property"} · {m.phoneNumber}
                          </Text>
                        </View>
                        <Badge
                          label={`${completeRate}%`}
                          variant={completeRate >= 80 ? "success" : completeRate >= 50 ? "warning" : "error"}
                          size="sm"
                        />
                      </View>

                      {/* Stats row */}
                      <View style={{ flexDirection: "row", gap: spacing.md }}>
                        {[
                          { label: "Sessions", value: m.totalSessions },
                          { label: "Hours", value: `${m.totalHours}h` },
                          { label: "Avg/Session", value: `${m.avgHoursPerSession}h` },
                          { label: "Incomplete", value: m.incompleteSessions },
                        ].map(({ label, value }) => (
                          <View key={label} style={{ flex: 1, alignItems: "center" }}>
                            <Text style={{ fontSize: typography.sizes.lg, fontWeight: typography.weights.bold, color: colors.text }}>
                              {value}
                            </Text>
                            <Text style={{ fontSize: 10, color: colors.tertiaryText, textTransform: "uppercase", letterSpacing: 0.3, marginTop: 1 }}>
                              {label}
                            </Text>
                          </View>
                        ))}
                      </View>

                      <Text style={{ fontSize: typography.sizes.xs, color: brandColors.accentStart, fontWeight: typography.weights.medium, marginTop: spacing.md, textAlign: "center" }}>
                        {isExpanded ? "▲ Collapse sessions" : "▼ View sessions"}
                      </Text>
                    </Pressable>

                    {/* Individual sessions */}
                    {isExpanded && (
                      <View style={{ borderTopWidth: 1, borderTopColor: colors.divider }}>
                        {managerSessions.length === 0 ? (
                          <Text style={{ padding: spacing.xl, textAlign: "center", color: colors.secondaryText, fontSize: typography.sizes.sm }}>
                            No sessions found.
                          </Text>
                        ) : (
                          managerSessions.map((s, i) => (
                            <View
                              key={s.id}
                              style={{
                                padding: spacing.xl,
                                borderBottomWidth: i < managerSessions.length - 1 ? 1 : 0,
                                borderBottomColor: colors.divider,
                              }}
                            >
                              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.sm }}>
                                <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }}>
                                  {s.check_in_status === "checked_out" ? (
                                    <CheckCircle size={13} color={brandColors.success} strokeWidth={2} />
                                  ) : (
                                    <XCircle size={13} color={brandColors.error} strokeWidth={2} />
                                  )}
                                  <Text style={{ fontSize: typography.sizes.sm, fontWeight: typography.weights.semibold, color: colors.text }}>
                                    {s.check_in_status === "checked_out" ? "Complete" : "Incomplete"}
                                  </Text>
                                </View>
                                <Text style={{ fontSize: typography.sizes.sm, fontWeight: typography.weights.bold, color: s.durationMinutes !== null ? brandColors.accentStart : colors.secondaryText }}>
                                  {formatDuration(s.durationMinutes)}
                                </Text>
                              </View>

                              <View style={{ gap: 3 }}>
                                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                                  <Text style={{ fontSize: typography.sizes.xs, color: colors.secondaryText }}>Check-in</Text>
                                  <Text style={{ fontSize: typography.sizes.xs, color: colors.text, fontWeight: typography.weights.medium }}>
                                    {formatDate(s.check_in_time)}
                                  </Text>
                                </View>
                                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                                  <Text style={{ fontSize: typography.sizes.xs, color: colors.secondaryText }}>Check-out</Text>
                                  <Text style={{ fontSize: typography.sizes.xs, color: colors.text, fontWeight: typography.weights.medium }}>
                                    {s.check_out_time ? formatDate(s.check_out_time) : "Still checked in"}
                                  </Text>
                                </View>
                              </View>
                            </View>
                          ))
                        )}
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
