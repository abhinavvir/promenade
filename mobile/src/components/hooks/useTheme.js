import { useColorScheme } from "react-native";

// Promenade brand palette — inspired by the architectural triangle logo
// Dark, sophisticated base with warm accent gradients
export const brandColors = {
  // Primary gradient endpoints
  gradientStart: "#1B2838", // deep navy slate
  gradientMid: "#2A3F55", // mid slate blue
  gradientEnd: "#3D5A73", // steel blue

  // Accent gradient (warm)
  accentStart: "#C4956A", // warm sand
  accentEnd: "#D4A574", // light caramel

  // Functional accents
  success: "#5BAB8B", // sage green
  successLight: "#E8F4ED",
  warning: "#D4A574", // warm caramel
  warningLight: "#FDF4EB",
  error: "#C47070", // muted rose
  errorLight: "#FAEDED",

  // Neutrals
  ivory: "#F7F5F2", // warm off-white
  cream: "#EDE9E3", // cream
  stone: "#D1CBC2", // warm stone
  slate: "#8B95A3", // cool slate
  charcoal: "#2C3340", // dark charcoal
  midnight: "#1A1F2B", // near black

  // Card tints
  cardTint: "rgba(255,255,255,0.06)",
  cardTintLight: "rgba(27,40,56,0.04)",
};

export const useTheme = () => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const colors = {
    // Backgrounds
    background: isDark ? "#0F1419" : brandColors.ivory,
    headerBackground: isDark ? "#1A1F2B" : brandColors.ivory,
    cardBackground: isDark ? "#1A2332" : "#FFFFFF",
    elevatedCard: isDark ? "#1F2B3D" : "#FFFFFF",

    // Text
    text: isDark ? "#F0EDE8" : brandColors.charcoal,
    secondaryText: isDark ? "#8B95A3" : "#6B7280",
    tertiaryText: isDark ? "#5E6B7A" : "#9CA3AF",
    accentText: isDark ? brandColors.accentStart : brandColors.gradientStart,

    // Borders
    border: isDark ? "rgba(255,255,255,0.08)" : "rgba(44,51,64,0.08)",
    borderSubtle: isDark ? "rgba(255,255,255,0.04)" : "rgba(44,51,64,0.04)",
    divider: isDark ? "rgba(255,255,255,0.06)" : brandColors.cream,

    // Interactive
    primary: brandColors.gradientStart,
    primaryLight: isDark ? "#2A3F55" : "#E8EDF3",

    // Status
    success: brandColors.success,
    successBg: isDark ? "rgba(91,171,139,0.15)" : brandColors.successLight,
    warning: brandColors.warning,
    warningBg: isDark ? "rgba(212,165,116,0.15)" : brandColors.warningLight,
    error: brandColors.error,
    errorBg: isDark ? "rgba(196,112,112,0.15)" : brandColors.errorLight,

    // UI elements
    searchBackground: isDark ? "#1A2332" : "#FFFFFF",
    searchBorder: isDark ? "rgba(255,255,255,0.1)" : brandColors.cream,
    separatorColor: isDark ? "rgba(255,255,255,0.06)" : brandColors.cream,
    emptyStateBg: isDark ? "#1A2332" : brandColors.ivory,
    emptyStateIcon: isDark ? "#5E6B7A" : brandColors.slate,
    placeholderText: isDark ? "#5E6B7A" : brandColors.slate,

    // Profile
    profileBadge: isDark ? "#1A2332" : "#EDE9E3",
    badgeBackground: isDark
      ? brandColors.gradientStart
      : brandColors.gradientStart,

    // Tab bar
    tabActiveColor: isDark ? "#F0EDE8" : brandColors.charcoal,
    tabInactiveColor: isDark ? "#5E6B7A" : brandColors.slate,
    tabBarBg: isDark ? "#0F1419" : "#FFFFFF",
    tabBarBorder: isDark ? "rgba(255,255,255,0.06)" : brandColors.cream,
  };

  return {
    colors,
    isDark,
    colorScheme,
    brand: brandColors,
  };
};
