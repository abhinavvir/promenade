import { LinearGradient } from 'expo-linear-gradient';
import { Text, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { brandColors } from '@/components/hooks/useTheme';
import { spacing, typography } from '@/lib/design/tokens';

interface GradientHeaderProps {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  style?: ViewStyle;
  compact?: boolean;
}

export function GradientHeader({ title, subtitle, right, style, compact }: GradientHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <LinearGradient
      colors={[brandColors.gradientStart, brandColors.gradientMid, brandColors.gradientEnd]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[{
        paddingTop: insets.top + (compact ? spacing.lg : spacing['2xl']),
        paddingBottom: compact ? spacing.xl : spacing['3xl'],
        paddingHorizontal: spacing['2xl'],
      }, style]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <Text style={{
            fontSize: compact ? typography.sizes.xl : typography.sizes['2xl'],
            fontWeight: typography.weights.bold,
            color: '#F0EDE8',
            letterSpacing: -0.5,
          }}>
            {title}
          </Text>
          {subtitle && (
            <Text style={{
              fontSize: typography.sizes.sm,
              color: 'rgba(240,237,232,0.55)',
              marginTop: 4,
            }}>
              {subtitle}
            </Text>
          )}
        </View>
        {right && <View style={{ marginLeft: spacing.lg }}>{right}</View>}
      </View>
    </LinearGradient>
  );
}
