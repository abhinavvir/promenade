import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
import { MapPinCheck, MapPin, User } from "lucide-react-native";
import { Platform, View } from "react-native";
import { useTheme, brandColors } from "@/components/hooks/useTheme";

export default function TabLayout() {
  const { colors, isDark } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: brandColors.accentStart,
        tabBarInactiveTintColor: colors.tabInactiveColor,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
          letterSpacing: 0.2,
          marginBottom: Platform.OS === "ios" ? 0 : 4,
        },
        tabBarStyle: {
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: isDark ? "rgba(15,20,25,0.85)" : "rgba(255,255,255,0.9)",
          borderTopWidth: 1,
          borderTopColor: colors.tabBarBorder,
          elevation: 0,
        },
        tabBarBackground: () =>
          Platform.OS === "ios" ? (
            <BlurView
              intensity={60}
              tint={isDark ? "dark" : "light"}
              style={{ position: "absolute", inset: 0 }}
            />
          ) : (
            <View style={{ position: "absolute", inset: 0, backgroundColor: isDark ? "#0F1419" : "#FFFFFF" }} />
          ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Check In",
          tabBarIcon: ({ color, focused }) => (
            <MapPinCheck color={focused ? brandColors.accentStart : color} size={22} strokeWidth={focused ? 2 : 1.5} />
          ),
        }}
      />
      <Tabs.Screen
        name="location"
        options={{
          title: "Location",
          tabBarIcon: ({ color, focused }) => (
            <MapPin color={focused ? brandColors.accentStart : color} size={22} strokeWidth={focused ? 2 : 1.5} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, focused }) => (
            <User color={focused ? brandColors.accentStart : color} size={22} strokeWidth={focused ? 2 : 1.5} />
          ),
        }}
      />
    </Tabs>
  );
}
