import { Animated, Pressable, Text, View, ViewStyle } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { useRef } from 'react';
import { useTheme } from '@/components/hooks/useTheme';
import { radius, spacing, typography } from '@/lib/design/tokens';

interface ListItemProps {
  title: string;
  subtitle?: string;
  left?: React.ReactNode;
  right?: React.ReactNode;
  showChevron?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
  divider?: boolean;
}

export function ListItem({ title, subtitle, left, right, showChevron, onPress, style, divider }: ListItemProps) {
  const { colors } = useTheme();
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => onPress && Animated.spring(scale, { toValue: 0.98, useNativeDriver: true, tension: 200, friction: 10 }).start();
  const handlePressOut = () => onPress && Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 200, friction: 10 }).start();

  const inner = (
    <View style={[{
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.lg,
      paddingHorizontal: spacing.xl,
      gap: spacing.md,
      borderBottomWidth: divider ? 1 : 0,
      borderBottomColor: colors.divider,
    }, style]}>
      {left && <View>{left}</View>}
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: typography.sizes.md, fontWeight: typography.weights.medium, color: colors.text, marginBottom: subtitle ? 2 : 0 }}>
          {title}
        </Text>
        {subtitle && (
          <Text style={{ fontSize: typography.sizes.sm, color: colors.secondaryText }}>
            {subtitle}
          </Text>
        )}
      </View>
      {right && <View>{right}</View>}
      {showChevron && <ChevronRight size={16} color={colors.secondaryText} strokeWidth={2} />}
    </View>
  );

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
