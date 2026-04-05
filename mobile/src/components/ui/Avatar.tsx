import { LinearGradient } from 'expo-linear-gradient';
import { Text, View, ViewStyle } from 'react-native';
import { brandColors } from '@/components/hooks/useTheme';
import { typography } from '@/lib/design/tokens';

interface AvatarProps {
  name?: string;
  size?: number;
  colors?: readonly [string, string];
  style?: ViewStyle;
}

function getInitials(name?: string): string {
  if (!name) return '?';
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Avatar({ name, size = 48, colors: gradColors, style }: AvatarProps) {
  const initials = getInitials(name);
  const fontSize = size * 0.35;

  return (
    <LinearGradient
      colors={gradColors ?? [brandColors.gradientStart, brandColors.gradientEnd]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center' }, style]}
    >
      <Text style={{ fontSize, fontWeight: typography.weights.bold, color: '#FFFFFF', letterSpacing: 0.5 }}>
        {initials}
      </Text>
    </LinearGradient>
  );
}
