import { Text, View, ViewStyle } from 'react-native';
import { useTheme } from '@/components/hooks/useTheme';
import { radius, spacing, typography } from '@/lib/design/tokens';

type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  style?: ViewStyle;
}

export function Badge({ label, variant = 'neutral', size = 'md', style }: BadgeProps) {
  const { colors, brand } = useTheme();

  const variantStyles: Record<BadgeVariant, { bg: string; text: string }> = {
    success: { bg: colors.successBg, text: brand.success },
    warning: { bg: colors.warningBg, text: brand.warning },
    error: { bg: colors.errorBg, text: brand.error },
    info: { bg: colors.primaryLight, text: brand.gradientEnd },
    neutral: { bg: colors.profileBadge, text: colors.secondaryText },
  };

  const { bg, text } = variantStyles[variant];

  return (
    <View style={[{
      backgroundColor: bg,
      paddingHorizontal: size === 'sm' ? spacing.sm : spacing.md,
      paddingVertical: size === 'sm' ? 2 : 4,
      borderRadius: radius.full,
      alignSelf: 'flex-start',
    }, style]}>
      <Text style={{
        fontSize: size === 'sm' ? typography.sizes.xs : typography.sizes.sm,
        fontWeight: typography.weights.semibold,
        color: text,
      }}>
        {label}
      </Text>
    </View>
  );
}
