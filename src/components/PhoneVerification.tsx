import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { auth } from '../config/firebase';
import {
  PhoneAuthProvider,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  ConfirmationResult,
} from 'firebase/auth';

interface PhoneVerificationProps {
  onVerificationComplete: (phoneNumber: string, verified: boolean) => void;
  onBack?: () => void;
  initialPhoneNumber?: string;
}

export default function PhoneVerification({ 
  onVerificationComplete, 
  onBack,
  initialPhoneNumber = '' 
}: PhoneVerificationProps) {
  const { colors } = useTheme();
  const [phoneNumber, setPhoneNumber] = useState(initialPhoneNumber);
  const [verificationCode, setVerificationCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const recaptchaVerifierRef = useRef<any>(null);

  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [timeLeft]);

  const setupRecaptcha = () => {
    if (!recaptchaVerifierRef.current) {
      recaptchaVerifierRef.current = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
        callback: () => {
          console.log('Recaptcha verified');
        },
      });
    }
  };

  const formatPhoneNumber = (number: string): string => {
    // Remove all non-digit characters
    let cleaned = number.replace(/\D/g, '');
    
    // If number starts with 0, replace with +234 for Nigeria
    if (cleaned.startsWith('0') && cleaned.length === 11) {
      cleaned = '+234' + cleaned.substring(1);
    }
    // If number doesn't have country code, add +234
    else if (!cleaned.startsWith('+') && cleaned.length === 10) {
      cleaned = '+234' + cleaned;
    }
    // If number already has +, keep it
    else if (!cleaned.startsWith('+')) {
      cleaned = '+' + cleaned;
    }
    
    return cleaned;
  };

  const sendVerificationCode = async () => {
    if (!phoneNumber || phoneNumber.length < 10) {
      Alert.alert('Error', 'Please enter a valid phone number');
      return;
    }

    setLoading(true);
    try {
      setupRecaptcha();
      const formattedNumber = formatPhoneNumber(phoneNumber);
      
      const confirmation = await signInWithPhoneNumber(
        auth,
        formattedNumber,
        recaptchaVerifierRef.current
      );
      
      setConfirmationResult(confirmation);
      setCodeSent(true);
      setTimeLeft(60);
      Alert.alert('Success', 'Verification code sent!');
    } catch (error: any) {
      console.log('Error sending code:', error);
      let errorMessage = 'Failed to send verification code';
      
      if (error.code === 'auth/invalid-phone-number') {
        errorMessage = 'Invalid phone number format';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many attempts. Please try again later';
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    if (!verificationCode || verificationCode.length < 6) {
      Alert.alert('Error', 'Please enter the 6-digit verification code');
      return;
    }

    setLoading(true);
    try {
      if (!confirmationResult) {
        Alert.alert('Error', 'Please request a new verification code');
        return;
      }
      
      const result = await confirmationResult.confirm(verificationCode);
      const user = result.user;
      
      // Phone number verified successfully
      onVerificationComplete(formatPhoneNumber(phoneNumber), true);
    } catch (error: any) {
      console.log('Error verifying code:', error);
      Alert.alert('Error', 'Invalid verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resendCode = async () => {
    if (timeLeft > 0) {
      Alert.alert('Please wait', `Wait ${timeLeft} seconds before requesting a new code`);
      return;
    }
    sendVerificationCode();
  };

  return (
    <View style={styles.container}>
      {/* Recaptcha container (invisible) */}
      <View id="recaptcha-container" />
      
      {!codeSent ? (
        <>
          <Text style={[styles.title, { color: colors.text }]}>Verify Your Phone Number</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            We'll send a verification code to your phone number
          </Text>
          
          <View style={[styles.inputContainer, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <Text style={[styles.countryCode, { color: colors.text }]}>+234</Text>
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="802 123 4567"
              placeholderTextColor={colors.textSecondary}
              keyboardType="phone-pad"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              maxLength={11}
            />
          </View>
          
          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary }]}
            onPress={sendVerificationCode}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Send Verification Code</Text>
            )}
          </TouchableOpacity>
          
          {onBack && (
            <TouchableOpacity onPress={onBack} style={styles.backLink}>
              <Text style={[styles.backText, { color: colors.textSecondary }]}>← Back</Text>
            </TouchableOpacity>
          )}
        </>
      ) : (
        <>
          <Text style={[styles.title, { color: colors.text }]}>Enter Verification Code</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            We sent a 6-digit code to {formatPhoneNumber(phoneNumber)}
          </Text>
          
          <View style={[styles.codeContainer, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <TextInput
              style={[styles.codeInput, { color: colors.text }]}
              placeholder="000000"
              placeholderTextColor={colors.textSecondary}
              keyboardType="number-pad"
              value={verificationCode}
              onChangeText={setVerificationCode}
              maxLength={6}
              textAlign="center"
            />
          </View>
          
          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary }]}
            onPress={verifyCode}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Verify Code</Text>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity onPress={resendCode} style={styles.resendLink}>
            <Text style={[styles.resendText, { color: timeLeft > 0 ? colors.textSecondary : colors.primary }]}>
              {timeLeft > 0 ? `Resend code in ${timeLeft}s` : 'Resend Code'}
            </Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 32,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 20,
    width: '100%',
  },
  countryCode: {
    fontSize: 16,
    fontWeight: '600',
    paddingLeft: 16,
    paddingRight: 8,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 16,
    paddingHorizontal: 8,
  },
  codeContainer: {
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 20,
    width: '100%',
  },
  codeInput: {
    height: 50,
    fontSize: 24,
    fontWeight: '600',
    letterSpacing: 4,
    textAlign: 'center',
  },
  button: {
    width: '100%',
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  backLink: {
    marginTop: 8,
  },
  backText: {
    fontSize: 14,
  },
  resendLink: {
    marginTop: 8,
  },
  resendText: {
    fontSize: 14,
    fontWeight: '600',
  },
});