import { Text, View, ViewStyle } from 'react-native';
import { useTheme } from '@/components/hooks/useTheme';
import { spacing, typography } from '@/lib/design/tokens';
import { Button } from './Button';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: { label: string; onPress: () => void };
  style?: ViewStyle;
}

export function EmptyState({ icon, title, description, action, style }: EmptyStateProps) {
  const { colors } = useTheme();

  return (
    <View style={[{ alignItems: 'center', paddingVertical: spacing['4xl'], paddingHorizontal: spacing['3xl'] }, style]}>
      <View style={{ marginBottom: spacing.xl, opacity: 0.6 }}>{icon}</View>
      <Text style={{
        fontSize: typography.sizes.lg,
        fontWeight: typography.weights.semibold,
        color: colors.text,
        textAlign: 'center',
        marginBottom: spacing.sm,
      }}>
        {title}
      </Text>
      {description && (
        <Text style={{
          fontSize: typography.sizes.sm,
          color: colors.secondaryText,
          textAlign: 'center',
          lineHeight: typography.sizes.sm * typography.lineHeights.relaxed,
          marginBottom: action ? spacing.xl : 0,
        }}>
          {description}
        </Text>
      )}
      {action && (
        <Button label={action.label} onPress={action.onPress} variant="secondary" fullWidth={false} />
      )}
    </View>
  );
}
