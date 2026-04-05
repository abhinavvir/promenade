import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "./hooks/useTheme";
import TriangleLogo from "./TriangleLogo";
import {
  useFonts,
  InstrumentSans_500Medium,
  InstrumentSans_600SemiBold,
} from "@expo-google-fonts/instrument-sans";

export default function ScreenHeader({
  title,
  rightIcon: RightIcon,
  onRightPress,
  showNotificationBadge = false,
  showLogo = true,
}) {
  const insets = useSafeAreaInsets();
  const { colors, brand } = useTheme();

  const [fontsLoaded] = useFonts({
    InstrumentSans_500Medium,
    InstrumentSans_600SemiBold,
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <View
      style={{
        paddingTop: insets.top + 16,
        paddingHorizontal: 20,
        paddingBottom: 16,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        {showLogo && (
          <View style={{ marginRight: 10 }}>
            <TriangleLogo
              size={22}
              gradientColors={[brand.gradientStart, brand.gradientEnd]}
            />
          </View>
        )}
        <Text
          style={{
            fontSize: 26,
            color: colors.text,
            fontFamily: "InstrumentSans_600SemiBold",
            letterSpacing: -0.5,
          }}
        >
          {title}
        </Text>
      </View>

      {RightIcon && (
        <TouchableOpacity
          onPress={onRightPress}
          style={{
            width: 36,
            height: 36,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.cardBackground,
            justifyContent: "center",
            alignItems: "center",
            position: "relative",
          }}
        >
          <RightIcon size={20} color={colors.text} strokeWidth={1.5} />
          {showNotificationBadge && (
            <View
              style={{
                position: "absolute",
                top: -2,
                right: -2,
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: brand.error,
              }}
            />
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}
