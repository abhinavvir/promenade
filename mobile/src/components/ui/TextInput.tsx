import { useState, useRef } from 'react';
import { Animated, Pressable, Text, TextInput as RNTextInput, TextInputProps, View, ViewStyle } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { useTheme } from '@/components/hooks/useTheme';
import { radius, spacing, typography } from '@/lib/design/tokens';

interface ThemedInputProps extends TextInputProps {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  containerStyle?: ViewStyle;
}

export function TextInput({ label, error, icon, containerStyle, secureTextEntry, ...props }: ThemedInputProps) {
  const { colors, brand, isDark } = useTheme();
  const [focused, setFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const borderAnim = useRef(new Animated.Value(0)).current;

  const handleFocus = () => {
    setFocused(true);
    Animated.timing(borderAnim, { toValue: 1, duration: 150, useNativeDriver: false }).start();
    props.onFocus?.({} as any);
  };

  const handleBlur = () => {
    setFocused(false);
    Animated.timing(borderAnim, { toValue: 0, duration: 150, useNativeDriver: false }).start();
    props.onBlur?.({} as any);
  };

  const borderColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [error ? brand.error : colors.border, error ? brand.error : brand.accentStart],
  });

  const isPassword = secureTextEntry !== undefined;

  return (
    <View style={[{ marginBottom: spacing.md }, containerStyle]}>
      {label && (
        <Text style={{
          fontSize: typography.sizes.xs,
          fontWeight: typography.weights.semibold,
          color: error ? brand.error : colors.secondaryText,
          marginBottom: spacing.sm,
          letterSpacing: 0.5,
          textTransform: 'uppercase',
        }}>
          {label}
        </Text>
      )}
      <Animated.View style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)',
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        gap: spacing.sm,
      }}>
        {icon && <View>{icon}</View>}
        <RNTextInput
          {...props}
          secureTextEntry={isPassword ? !showPassword : undefined}
          onFocus={handleFocus}
          onBlur={handleBlur}
          style={[{
            flex: 1,
            fontSize: typography.sizes.md,
            color: colors.text,
          }, props.style]}
          placeholderTextColor={colors.placeholderText}
        />
        {isPassword && (
          <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={8}>
            {showPassword
              ? <EyeOff size={16} color={colors.secondaryText} strokeWidth={2} />
              : <Eye size={16} color={colors.secondaryText} strokeWidth={2} />
            }
          </Pressable>
        )}
      </Animated.View>
      {error && (
        <Text style={{ fontSize: typography.sizes.xs, color: brand.error, marginTop: 4 }}>
          {error}
        </Text>
      )}
    </View>
  );
}
