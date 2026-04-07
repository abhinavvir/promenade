import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft, Lock, ShieldCheck } from 'lucide-react-native';
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

export default function VerifyOtpPage() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const phone = (params.phone as string) || '';

  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [otpFocused, setOtpFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [confirmFocused, setConfirmFocused] = useState(false);

  // Entrance animations
  const cardAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(cardAnim, { toValue: 1, useNativeDriver: true, tension: 60, friction: 9 }).start();
  }, []);

  const animStyle = (anim: Animated.Value) => ({
    opacity: anim,
    transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }],
  });

  const handleResetPassword = async () => {
    if (!otp.trim()) {
      setError('OTP is required');
      return;
    }
    if (!newPassword || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setError('');
    setLoading(true);

    try {
      await api.post('/api/auth/verify-otp-reset', {
        phone: phone.trim(),
        otp: otp.trim(),
        newPassword,
      });

      setSuccess(true);
    } catch (e: any) {
      setError(e?.response?.data?.error ?? e?.message ?? 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToSignin = () => {
    router.replace('/signin');
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
          <View style={{ marginBottom: 20, alignSelf: 'flex-start' }}>
            <TouchableOpacity
              onPress={() => router.back()}
              hitSlop={8}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
            >
              <ArrowLeft size={20} color="#F0EDE8" strokeWidth={2} />
              <Text style={{ fontSize: 16, color: '#F0EDE8', fontWeight: '500' }}>Back</Text>
            </TouchableOpacity>
          </View>

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
                      backgroundColor: success
                        ? 'rgba(34,197,94,0.15)'
                        : 'rgba(196,149,106,0.15)',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: 16,
                    }}
                  >
                    {success ? (
                      <ShieldCheck size={24} color="#22c55e" strokeWidth={2} />
                    ) : (
                      <Lock size={24} color={brandColors.accentStart} strokeWidth={2} />
                    )}
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
                    {success ? 'Password Reset!' : 'Verify & Reset'}
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
                      ? 'Your password has been successfully reset.'
                      : 'Enter the OTP sent to your phone and create a new password.'}
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
                  <TouchableOpacity
                    onPress={handleBackToSignin}
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
                        Back to Sign In
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                ) : (
                  <View style={{ gap: 16 }}>
                    {/* OTP input */}
                    <Text style={styles.label}>OTP Code</Text>
                    <View
                      style={[
                        styles.inputWrapper,
                        otpFocused && styles.inputFocused,
                      ]}
                    >
                      <ShieldCheck size={16} color={otpFocused ? brandColors.accentStart : 'rgba(240,237,232,0.35)'} strokeWidth={2} />
                      <TextInput
                        style={[styles.input, { textAlign: 'center', fontSize: 20, letterSpacing: 8, fontFamily: 'monospace' }]}
                        placeholder="000000"
                        placeholderTextColor="rgba(240,237,232,0.3)"
                        value={otp}
                        onChangeText={setOtp}
                        keyboardType="number-pad"
                        autoComplete="one-time-code"
                        maxLength={6}
                        onFocus={() => setOtpFocused(true)}
                        onBlur={() => setOtpFocused(false)}
                        returnKeyType="next"
                        editable={!loading}
                      />
                    </View>

                    {/* New Password */}
                    <Text style={styles.label}>New Password</Text>
                    <View
                      style={[
                        styles.inputWrapper,
                        passwordFocused && styles.inputFocused,
                      ]}
                    >
                      <Lock size={16} color={passwordFocused ? brandColors.accentStart : 'rgba(240,237,232,0.35)'} strokeWidth={2} />
                      <TextInput
                        style={styles.input}
                        placeholder="Enter new password"
                        placeholderTextColor="rgba(240,237,232,0.3)"
                        value={newPassword}
                        onChangeText={setNewPassword}
                        secureTextEntry
                        autoCapitalize="none"
                        onFocus={() => setPasswordFocused(true)}
                        onBlur={() => setPasswordFocused(false)}
                        returnKeyType="next"
                        editable={!loading}
                      />
                    </View>

                    {/* Confirm Password */}
                    <Text style={styles.label}>Confirm Password</Text>
                    <View
                      style={[
                        styles.inputWrapper,
                        confirmFocused && styles.inputFocused,
                      ]}
                    >
                      <Lock size={16} color={confirmFocused ? brandColors.accentStart : 'rgba(240,237,232,0.35)'} strokeWidth={2} />
                      <TextInput
                        style={styles.input}
                        placeholder="Confirm new password"
                        placeholderTextColor="rgba(240,237,232,0.3)"
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        secureTextEntry
                        autoCapitalize="none"
                        onFocus={() => setConfirmFocused(true)}
                        onBlur={() => setConfirmFocused(false)}
                        returnKeyType="done"
                        onSubmitEditing={handleResetPassword}
                        editable={!loading}
                      />
                    </View>

                    {/* Submit */}
                    <TouchableOpacity
                      onPress={handleResetPassword}
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
                            Reset Password
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
