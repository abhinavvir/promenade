import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft, Phone } from 'lucide-react-native';
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
import { api } from '@/lib/api';

export default function ForgotPasswordPage() {
  const insets = useSafeAreaInsets();

  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [phoneFocused, setPhoneFocused] = useState(false);
  const [devOtp, setDevOtp] = useState('');

  // Entrance animations
  const logoAnim = useRef(new Animated.Value(0)).current;
  const cardAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(120, [
      Animated.spring(logoAnim, { toValue: 1, useNativeDriver: true, tension: 60, friction: 9 }),
      Animated.spring(cardAnim, { toValue: 1, useNativeDriver: true, tension: 60, friction: 9 }),
    ]).start();
  }, []);

  const animStyle = (anim: Animated.Value) => ({
    opacity: anim,
    transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }],
  });

  const handleRequestOtp = async () => {
    if (!phone.trim()) {
      setError('Phone number is required');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const response = await api.post('/api/auth/request-otp-reset', { phone: phone.trim() });

      // Check if dev OTP is in response
      if ((response.data as any).devOtp) {
        setDevOtp((response.data as any).devOtp);
      }

      setSuccess(true);
    } catch (e: any) {
      setError(e?.response?.data?.error ?? e?.message ?? 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Back button */}
          <Animated.View style={[{ marginBottom: 20, alignSelf: 'flex-start' }, animStyle(logoAnim)]}>
            <TouchableOpacity
              onPress={() => router.back()}
              hitSlop={8}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
            >
              <ArrowLeft size={20} color="#F0EDE8" strokeWidth={2} />
              <Text style={{ fontSize: 16, color: '#F0EDE8', fontWeight: '500' }}>Back</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Card */}
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
                {/* Header */}
                <View style={{ alignItems: 'center', marginBottom: 24 }}>
                  <View
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 28,
                      backgroundColor: 'rgba(196,149,106,0.15)',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: 16,
                    }}
                  >
                    <Phone size={24} color={brandColors.accentStart} strokeWidth={2} />
                  </View>
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
                    {success ? 'OTP Sent!' : 'Forgot Password?'}
                  </Text>
                  <Text
                    style={{
                      fontSize: 14,
                      color: 'rgba(240,237,232,0.45)',
                      textAlign: 'center',
                      lineHeight: 21,
                    }}
                  >
                    {success
                      ? "We've sent a 6-digit code to your phone number."
                      : 'Enter your phone number to receive a verification code.'}
                  </Text>
                </View>

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

                {success ? (
                  <View style={{ gap: 16 }}>
                    {/* Dev OTP notice */}
                    {devOtp ? (
                      <View
                        style={{
                          backgroundColor: 'rgba(196,149,106,0.15)',
                          borderRadius: 12,
                          padding: 16,
                          borderWidth: 1,
                          borderColor: 'rgba(196,149,106,0.3)',
                        }}
                      >
                        <Text style={{ color: brandColors.accentStart, fontSize: 12, fontWeight: '600', marginBottom: 4, textTransform: 'uppercase' }}>
                          Development Mode
                        </Text>
                        <Text style={{ color: '#F0EDE8', fontSize: 13 }}>
                          Your OTP is:{' '}
                          <Text style={{ fontFamily: 'monospace', fontWeight: '700', fontSize: 18 }}>
                            {devOtp}
                          </Text>
                        </Text>
                      </View>
                    ) : null}

                    <TouchableOpacity
                      onPress={() => router.push({
                        pathname: '/verify-otp',
                        params: { phone: phone }
                      })}
                      activeOpacity={0.85}
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
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 16,
                            fontWeight: '600',
                            color: '#FFFFFF',
                            letterSpacing: 0.2,
                          }}
                        >
                          Continue to Verify OTP
                        </Text>
                      </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => {
                        setSuccess(false);
                        setPhone('');
                        setDevOtp('');
                      }}
                      style={{ padding: 12 }}
                    >
                      <Text style={{ fontSize: 14, color: 'rgba(240,237,232,0.5)', textAlign: 'center' }}>
                        Change phone number
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={{ gap: 16 }}>
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
                        returnKeyType="done"
                        onSubmitEditing={handleRequestOtp}
                        editable={!loading}
                      />
                    </View>

                    {/* Submit */}
                    <TouchableOpacity
                      onPress={handleRequestOtp}
                      activeOpacity={0.85}
                      disabled={loading}
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
                            Send OTP
                          </Text>
                        )}
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </BlurView>
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
