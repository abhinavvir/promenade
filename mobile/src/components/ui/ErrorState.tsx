import { Text, View, ViewStyle } from 'react-native';
import { AlertCircle } from 'lucide-react-native';
import { useTheme } from '@/components/hooks/useTheme';
import { radius, spacing, typography } from '@/lib/design/tokens';
import { Button } from './Button';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
  style?: ViewStyle;
}

export function ErrorState({ message = 'Something went wrong.', onRetry, style }: ErrorStateProps) {
  const { colors, brand } = useTheme();

  return (
    <View style={[{
      backgroundColor: colors.errorBg,
      borderRadius: radius.xl,
      padding: spacing['2xl'],
      alignItems: 'center',
      gap: spacing.md,
    }, style]}>
      <AlertCircle size={32} color={brand.error} strokeWidth={1.5} />
      <Text style={{ fontSize: typography.sizes.md, fontWeight: typography.weights.semibold, color: brand.error, textAlign: 'center' }}>
        Error
      </Text>
      <Text style={{ fontSize: typography.sizes.sm, color: colors.secondaryText, textAlign: 'center', lineHeight: 20 }}>
        {message}
      </Text>
      {onRetry && (
        <Button label="Try Again" onPress={onRetry} variant="danger" fullWidth={false} size="sm" />
      )}
    </View>
  );
}
