import { useState, useRef, useEffect } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, SafeAreaView, KeyboardAvoidingView,
  Platform
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

export default function OTPScreen() {
  const { colors } = useTheme();
  const params = useLocalSearchParams();
  const [otp, setOtp] = useState(['', '', '', '']);
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const inputs = useRef<(TextInput | null)[]>([]);
  
  // Get phone number from registration params
  const phoneNumber = params.phone ? params.phone.toString() : '+234 800 *** 1234';

  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => { setTimer(t => t - 1); }, 1000);
      return () => clearInterval(interval);
    } else {
      setCanResend(true);
    }
  }, [timer]);

  const handleChange = (text: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);
    if (text && index < 3) { inputs.current[index + 1]?.focus(); }
  };

  const handleBackspace = (key: string, index: number) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const handleResend = () => {
    setTimer(60);
    setCanResend(false);
    setOtp(['', '', '', '']);
    inputs.current[0]?.focus();
  };

  const handleVerify = () => {
    const code = otp.join('');
    if (code.length === 4) { 
      router.replace('/home'); 
    }
  };

  const isComplete = otp.every(d => d !== '');

  const formatPhoneNumber = (phone: string) => {
    if (phone.length > 8) {
      const last4 = phone.slice(-4);
      const first4 = phone.slice(0, 4);
      return `${first4} *** ${last4}`;
    }
    return phone;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.inner}>
        <View style={[styles.header, { backgroundColor: colors.primary }]}>
          <Text style={styles.appName}>🏍️ Nexride</Text>
          <Text style={styles.title}>Verify Phone 🔐</Text>
          <Text style={styles.subtitle}>Enter the code sent to your number</Text>
        </View>

        <View style={styles.body}>
          <View style={[styles.phoneHint, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={styles.phoneIcon}>📱</Text>
            <Text style={[styles.phoneText, { color: colors.text }]}>{formatPhoneNumber(phoneNumber)}</Text>
          </View>

          <Text style={[styles.instructions, { color: colors.textSecondary }]}>Enter the 4-digit verification code below</Text>

          <View style={styles.otpRow}>
            {otp.map((digit, index) => (
              <TextInput
                key={index}
                ref={ref => { inputs.current[index] = ref; }}
                style={[
                  styles.otpBox,
                  { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text },
                  digit && { borderColor: colors.primary, backgroundColor: colors.surfaceLight }
                ]}
                value={digit}
                onChangeText={text => handleChange(text.slice(-1), index)}
                onKeyPress={({ nativeEvent }) => handleBackspace(nativeEvent.key, index)}
                keyboardType="number-pad"
                maxLength={1}
                selectTextOnFocus
              />
            ))}
          </View>

          <View style={styles.resendRow}>
            {canResend ? (
              <TouchableOpacity onPress={handleResend}>
                <Text style={[styles.resendActive, { color: colors.primary }]}>Resend Code</Text>
              </TouchableOpacity>
            ) : (
              <Text style={[styles.resendTimer, { color: colors.textSecondary }]}>
                Resend code in <Text style={[styles.timerNum, { color: colors.primary }]}>0:{timer < 10 ? `0${timer}` : timer}</Text>
              </Text>
            )}
          </View>

          <TouchableOpacity
            style={[styles.btn, !isComplete && { backgroundColor: colors.surfaceLight, borderColor: colors.border }, isComplete && { backgroundColor: colors.primary }]}
            onPress={handleVerify}
            disabled={!isComplete}
          >
            <Text style={[styles.btnTxt, !isComplete && { color: colors.textSecondary }, isComplete && { color: '#fff' }]}>
              {isComplete ? 'Verify & Continue ✓' : 'Enter 4-digit code'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.backRow} onPress={() => router.back()}>
            <Text style={[styles.backTxt, { color: colors.textSecondary }]}>← Change phone number</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1 },
  header: { padding: 32, paddingTop: 48 },
  appName: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 16 },
  title: { color: '#fff', fontSize: 28, fontWeight: '800' },
  subtitle: { color: 'rgba(255,255,255,0.75)', fontSize: 14, marginTop: 4 },
  body: { flex: 1, paddingHorizontal: 24, paddingTop: 36 },
  phoneHint: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, padding: 14, gap: 10, marginBottom: 20, borderWidth: 1 },
  phoneIcon: { fontSize: 20 },
  phoneText: { fontSize: 15, fontWeight: '600' },
  instructions: { fontSize: 13, textAlign: 'center', marginBottom: 28 },
  otpRow: { flexDirection: 'row', justifyContent: 'center', gap: 14, marginBottom: 28 },
  otpBox: { width: 64, height: 68, borderRadius: 14, borderWidth: 1, fontSize: 26, fontWeight: '800', textAlign: 'center' },
  resendRow: { alignItems: 'center', marginBottom: 28 },
  resendTimer: { fontSize: 13 },
  timerNum: { fontWeight: '700' },
  resendActive: { fontSize: 13, fontWeight: '700' },
  btn: { borderRadius: 14, padding: 16, alignItems: 'center', borderWidth: 1 },
  btnTxt: { fontSize: 15, fontWeight: '700' },
  backRow: { alignItems: 'center', marginTop: 20 },
  backTxt: { fontSize: 13 },
});