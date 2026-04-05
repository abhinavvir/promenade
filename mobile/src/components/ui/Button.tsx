import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, Animated, Pressable, Text, View } from 'react-native';
import { useRef } from 'react';
import { brandColors } from '@/components/hooks/useTheme';
import { radius, spacing, typography } from '@/lib/design/tokens';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'accent';

interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const variantGradients: Record<Variant, readonly [string, string]> = {
  primary: [brandColors.gradientStart, brandColors.gradientEnd],
  accent: [brandColors.accentStart, brandColors.accentEnd],
  secondary: ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.04)'],
  danger: [brandColors.error, '#A85858'],
  ghost: ['transparent', 'transparent'],
};

const variantTextColor: Record<Variant, string> = {
  primary: '#FFFFFF',
  accent: '#FFFFFF',
  secondary: brandColors.ivory,
  danger: '#FFFFFF',
  ghost: brandColors.accentStart,
};

const sizeStyles = {
  sm: { paddingVertical: spacing.sm, paddingHorizontal: spacing.lg, fontSize: typography.sizes.sm, borderRadius: radius.md },
  md: { paddingVertical: 14, paddingHorizontal: spacing['2xl'], fontSize: typography.sizes.md, borderRadius: radius.lg },
  lg: { paddingVertical: 18, paddingHorizontal: spacing['3xl'], fontSize: typography.sizes.lg, borderRadius: radius.xl },
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  icon,
  fullWidth = true,
  size = 'md',
}: ButtonProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const s = sizeStyles[size];

  const handlePressIn = () => {
    Animated.spring(scale, { toValue: 0.96, useNativeDriver: true, ...{ tension: 200, friction: 10 } }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, ...{ tension: 200, friction: 10 } }).start();
  };

  const handlePress = () => {
    if (disabled || loading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.();
  };

  const isOutlined = variant === 'secondary';

  return (
    <Animated.View style={[{ transform: [{ scale }] }, fullWidth && { width: '100%' }]}>
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        style={{ opacity: disabled ? 0.5 : 1 }}
      >
        <LinearGradient
          colors={variantGradients[variant]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{
            paddingVertical: s.paddingVertical,
            paddingHorizontal: s.paddingHorizontal,
            borderRadius: s.borderRadius,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: spacing.sm,
            borderWidth: isOutlined ? 1 : 0,
            borderColor: isOutlined ? 'rgba(255,255,255,0.12)' : 'transparent',
          }}
        >
          {loading ? (
            <ActivityIndicator color={variantTextColor[variant]} size="small" />
          ) : (
            <>
              {icon && <View>{icon}</View>}
              <Text style={{ fontSize: s.fontSize, fontWeight: typography.weights.semibold, color: variantTextColor[variant], letterSpacing: 0.1 }}>
                {label}
              </Text>
            </>
          )}
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}
