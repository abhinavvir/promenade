import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Eye, EyeOff, Lock, Phone } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { brandColors } from '@/components/hooks/useTheme';
import { useAuth } from '@/utils/auth/useAuth';

const LOGO_URL =
  'https://ucarecdn.com/c943cb40-f1bf-4044-9381-a2f1b5f283d3/-/format/auto/';

export default function SignInPage() {
  const insets = useSafeAreaInsets();
  const { signIn, isReady, isAuthenticated } = useAuth();

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [phoneFocused, setPhoneFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  // Entrance animations
  const logoAnim = useRef(new Animated.Value(0)).current;
  const cardAnim = useRef(new Animated.Value(0)).current;
  const hintAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(120, [
      Animated.spring(logoAnim, { toValue: 1, useNativeDriver: true, tension: 60, friction: 9 }),
      Animated.spring(cardAnim, { toValue: 1, useNativeDriver: true, tension: 60, friction: 9 }),
      Animated.spring(hintAnim, { toValue: 1, useNativeDriver: true, tension: 60, friction: 9 }),
    ]).start();
  }, []);

  useEffect(() => {
    if (isReady && isAuthenticated) {
      router.replace('/');
    }
  }, [isReady, isAuthenticated]);

  const handleSignIn = async () => {
    if (!phone.trim()) {
      setError('Phone number is required');
      return;
    }
    if (!password) {
      setError('Password is required');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await signIn(phone.trim(), password);
    } catch (e: any) {
      setError(e?.message ?? 'Sign in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const animStyle = (anim: Animated.Value) => ({
    opacity: anim,
    transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }],
  });

  return (
    <View style={{ flex: 1, backgroundColor: brandColors.midnight }}>
      <StatusBar style="light" />

      {/* Background gradient */}
      <LinearGradient
        colors={[brandColors.gradientStart, brandColors.midnight, '#0D1117']}
        locations={[0, 0.5, 1]}
        style={{ position: 'absolute', inset: 0 }}
      />

      {/* Subtle accent glow */}
      <View
        style={{
          position: 'absolute',
          top: -80,
          right: -80,
          width: 300,
          height: 300,
          borderRadius: 150,
          backgroundColor: brandColors.accentStart,
          opacity: 0.06,
        }}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingTop: insets.top + 20,
            paddingBottom: insets.bottom + 24,
            paddingHorizontal: 24,
            justifyContent: 'center',
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo */}
          <Animated.View style={[{ alignItems: 'center', marginBottom: 48 }, animStyle(logoAnim)]}>
            <Image
              source={{ uri: LOGO_URL }}
              style={{ width: 200, height: 72 }}
              contentFit="contain"
            />
          </Animated.View>

          {/* Sign-in card */}
          <Animated.View style={animStyle(cardAnim)}>
            <BlurView
              intensity={20}
              tint="dark"
              style={{
                borderRadius: 24,
                overflow: 'hidden',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.09)',
              }}
            >
              <View style={{ padding: 28 }}>
                <Text
                  style={{
                    fontSize: 22,
                    fontWeight: '700',
                    color: '#F0EDE8',
                    textAlign: 'center',
                    marginBottom: 6,
                    letterSpacing: -0.3,
                  }}
                >
                  Welcome Back
                </Text>
                <Text
                  style={{
                    fontSize: 14,
                    color: 'rgba(240,237,232,0.45)',
                    textAlign: 'center',
                    lineHeight: 21,
                    marginBottom: 28,
                  }}
                >
                  Sign in with the credentials provided{'\n'}by your administrator.
                </Text>

                {/* Error */}
                {!!error && (
                  <View
                    style={{
                      backgroundColor: 'rgba(196,112,112,0.15)',
                      borderRadius: 12,
                      padding: 12,
                      marginBottom: 16,
                      borderWidth: 1,
                      borderColor: 'rgba(196,112,112,0.3)',
                    }}
                  >
                    <Text style={{ color: brandColors.error, fontSize: 13, textAlign: 'center', fontWeight: '500' }}>
                      {error}
                    </Text>
                  </View>
                )}

                {/* Phone input */}
                <Text style={styles.label}>Phone Number</Text>
                <View
                  style={[
                    styles.inputWrapper,
                    phoneFocused && styles.inputFocused,
                  ]}
                >
                  <Phone size={16} color={phoneFocused ? brandColors.accentStart : 'rgba(240,237,232,0.35)'} strokeWidth={2} />
                  <TextInput
                    style={styles.input}
                    placeholder="+1 (555) 000-0000"
                    placeholderTextColor="rgba(240,237,232,0.3)"
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                    autoComplete="tel"
                    autoCapitalize="none"
                    onFocus={() => setPhoneFocused(true)}
                    onBlur={() => setPhoneFocused(false)}
                    returnKeyType="next"
                    editable={!loading}
                  />
                </View>

                {/* Password input */}
                <Text style={[styles.label, { marginTop: 14 }]}>Password</Text>
                <View
                  style={[
                    styles.inputWrapper,
                    passwordFocused && styles.inputFocused,
                  ]}
                >
                  <Lock size={16} color={passwordFocused ? brandColors.accentStart : 'rgba(240,237,232,0.35)'} strokeWidth={2} />
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    placeholder="Enter your password"
                    placeholderTextColor="rgba(240,237,232,0.3)"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    onFocus={() => setPasswordFocused(true)}
                    onBlur={() => setPasswordFocused(false)}
                    returnKeyType="done"
                    onSubmitEditing={handleSignIn}
                    editable={!loading}
                  />
                  <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={8}>
                    {showPassword
                      ? <EyeOff size={16} color="rgba(240,237,232,0.4)" strokeWidth={2} />
                      : <Eye size={16} color="rgba(240,237,232,0.4)" strokeWidth={2} />
                    }
                  </Pressable>
                </View>

                {/* Submit */}
                <TouchableOpacity
                  onPress={handleSignIn}
                  activeOpacity={0.85}
                  disabled={loading}
                  style={{ marginTop: 24 }}
                >
                  <LinearGradient
                    colors={[brandColors.accentStart, brandColors.accentEnd, '#B8845A']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{
                      paddingVertical: 17,
                      borderRadius: 14,
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: loading ? 0.7 : 1,
                    }}
                  >
                    {loading ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text
                        style={{
                          fontSize: 16,
                          fontWeight: '600',
                          color: '#FFFFFF',
                          letterSpacing: 0.2,
                        }}
                      >
                        Sign In
                      </Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </BlurView>
          </Animated.View>

          {/* Help hint */}
          <Animated.View
            style={[
              {
                marginTop: 20,
                backgroundColor: 'rgba(255,255,255,0.03)',
                borderRadius: 16,
                padding: 18,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.05)',
              },
              animStyle(hintAnim),
            ]}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: '600',
                color: brandColors.accentStart,
                marginBottom: 4,
              }}
            >
              Need an account?
            </Text>
            <Text
              style={{
                fontSize: 12,
                color: 'rgba(240,237,232,0.35)',
                lineHeight: 19,
              }}
            >
              Contact your administrator to receive your login credentials. Only admins can create new accounts.
            </Text>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = {
  label: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: 'rgba(240,237,232,0.5)',
    marginBottom: 8,
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
  },
  inputWrapper: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 10,
  },
  inputFocused: {
    borderColor: brandColors.accentStart,
    backgroundColor: 'rgba(196,149,106,0.08)',
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#F0EDE8',
  },
} as const;
