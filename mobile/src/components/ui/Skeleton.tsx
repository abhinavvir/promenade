import { useEffect, useRef } from 'react';
import { Animated, View, ViewStyle } from 'react-native';
import { useTheme } from '@/components/hooks/useTheme';
import { radius } from '@/lib/design/tokens';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

function SkeletonBase({ width = '100%', height = 16, borderRadius = radius.sm, style }: SkeletonProps) {
  const { isDark } = useTheme();
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0.8] });
  const base = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';

  return (
    <Animated.View style={[{ width, height, borderRadius, backgroundColor: base, opacity }, style]} />
  );
}

export const Skeleton = {
  Text: ({ lines = 1, style }: { lines?: number; style?: ViewStyle }) => (
    <View style={[{ gap: 8 }, style]}>
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonBase key={i} height={14} width={i === lines - 1 && lines > 1 ? '70%' : '100%'} />
      ))}
    </View>
  ),
  Circle: ({ size = 48, style }: { size?: number; style?: ViewStyle }) => (
    <SkeletonBase width={size} height={size} borderRadius={size / 2} style={style} />
  ),
  Rect: ({ width, height, style }: SkeletonProps) => (
    <SkeletonBase width={width} height={height} style={style} />
  ),
  Card: ({ style }: { style?: ViewStyle }) => (
    <View style={[{ gap: 12 }, style]}>
      <SkeletonBase height={20} width="60%" />
      <SkeletonBase height={14} />
      <SkeletonBase height={14} width="80%" />
      <SkeletonBase height={40} borderRadius={radius.md} style={{ marginTop: 4 }} />
    </View>
  ),
};
