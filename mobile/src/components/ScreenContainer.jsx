import React from "react";
import { View, ScrollView } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "./hooks/useTheme";

export default function ScreenContainer({
  children,
  scrollable = true,
  contentContainerStyle = {},
  style = {},
  showsVerticalScrollIndicator = false,
}) {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();

  const defaultContentStyle = {
    paddingBottom: insets.bottom + 100,
    ...contentContainerStyle,
  };

  const containerStyle = {
    flex: 1,
    backgroundColor: colors.background,
    ...style,
  };

  if (scrollable) {
    return (
      <View style={containerStyle}>
        <StatusBar style={isDark ? "light" : "dark"} />
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={defaultContentStyle}
          showsVerticalScrollIndicator={showsVerticalScrollIndicator}
        >
          {children}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={containerStyle}>
      <StatusBar style={isDark ? "light" : "dark"} />
      {children}
    </View>
  );
}
