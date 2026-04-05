import { LinearGradient } from 'expo-linear-gradient';
import { Animated, Pressable, View, ViewStyle } from 'react-native';
import { useRef } from 'react';
import { useTheme } from '@/components/hooks/useTheme';
import { radius, shadows, spacing } from '@/lib/design/tokens';

type CardVariant = 'default' | 'elevated' | 'outlined' | 'gradient' | 'glass';

interface CardProps {
  children: React.ReactNode;
  variant?: CardVariant;
  onPress?: () => void;
  style?: ViewStyle;
  padding?: number;
}

export function Card({ children, variant = 'default', onPress, style, padding = spacing['2xl'] }: CardProps) {
  const { colors, brand, isDark } = useTheme();
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (!onPress) return;
    Animated.spring(scale, { toValue: 0.98, useNativeDriver: true, tension: 200, friction: 10 }).start();
  };

  const handlePressOut = () => {
    if (!onPress) return;
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 200, friction: 10 }).start();
  };

  const variantStyle: ViewStyle = (() => {
    switch (variant) {
      case 'elevated':
        return { backgroundColor: colors.elevatedCard, ...shadows.md };
      case 'outlined':
        return { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border };
      case 'glass':
        return { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(27,40,56,0.04)', borderWidth: 1, borderColor: colors.border };
      default:
        return { backgroundColor: colors.cardBackground };
    }
  })();

  const inner = (
    <View style={{ padding, ...variantStyle, borderRadius: radius.xl, ...style }}>
      {children}
    </View>
  );

  if (variant === 'gradient') {
    return (
      <Animated.View style={{ transform: [{ scale }] }}>
        <Pressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut} disabled={!onPress}>
          <LinearGradient
            colors={[brand.gradientStart, brand.gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ borderRadius: radius.xl, padding, ...style }}
          >
            {children}
          </LinearGradient>
        </Pressable>
      </Animated.View>
    );
  }

  if (onPress) {
    return (
      <Animated.View style={{ transform: [{ scale }] }}>
        <Pressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut}>
          {inner}
        </Pressable>
      </Animated.View>
    );
  }

  return inner;
}
