import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { ref, set } from 'firebase/database';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Logo from '../components/Logo';
import PasswordRequirements from '../components/PasswordRequirements';
import PasswordStrengthIndicator from '../components/PasswordStrengthIndicator';
import PhoneVerification from '../components/PhoneVerification';
import { auth, db } from '../config/firebase';
import { useTheme } from '../contexts/ThemeContext';
import {
  checkPasswordStrength,
  DEFAULT_PASSWORD_REQUIREMENTS,
  PasswordStrength,
  validatePassword,
} from '../utils/passwordSecurity';
// import { registerForPushNotificationsAsync, savePushToken } from '../services/notificationService';

export default function RegisterScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [verifiedPhone, setVerifiedPhone] = useState('');
  const [showVerification, setShowVerification] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: 'passenger' as 'passenger' | 'driver',
  });

  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>(PasswordStrength.VERY_WEAK);
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);

  const handlePasswordChange = (password: string) => {
    setFormData({ ...formData, password });
    const strength = checkPasswordStrength(password);
    setPasswordStrength(strength);
    
    const validation = validatePassword(password);
    setPasswordErrors(validation.errors);
  };

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Please enter your full name');
      return false;
    }
    
    if (!formData.email.trim()) {
      Alert.alert('Error', 'Please enter your email');
      return false;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return false;
    }
    
    if (!phoneVerified) {
      Alert.alert('Error', 'Please verify your phone number');
      return false;
    }
    
    const passwordValidation = validatePassword(formData.password);
    if (!passwordValidation.isValid) {
      Alert.alert('Error', passwordValidation.errors[0]);
      return false;
    }
    
    if (formData.password !== formData.confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return false;
    }
    
    return true;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;
    
    setLoading(true);
    
    try {
      // Create user with Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );
      
      const newUser = userCredential.user;
      
      // PUSH NOTIFICATION - TEMPORARILY DISABLED FOR EXPO GO
      /*
      try {
        const pushToken = await registerForPushNotificationsAsync();
        if (pushToken && newUser) {
          await savePushToken(newUser.uid, pushToken);
        }
      } catch (tokenError) {
        console.log('Push token registration error (non-critical):', tokenError);
      }
      */
      
      // Save user data to Realtime Database
      const userRef = ref(db, `users/${newUser.uid}`);
      await set(userRef, {
        name: formData.name,
        email: formData.email,
        phone: verifiedPhone,
        phoneVerified: true,
        role: formData.role,
        totalTrips: 0,
        rating: 0,
        createdAt: new Date().toISOString(),
        isActive: true,
        ...(formData.role === 'driver' && {
          driverInfo: {
            vehicleType: '',
            vehiclePlate: '',
            vehicleModel: '',
            vehicleColor: '',
            vehicleYear: '',
            seats: '4',
            isVerified: false,
          },
        }),
      });
      
      Alert.alert(
        'Success',
        'Account created successfully!',
        [
          {
            text: 'OK',
            onPress: () => router.replace({
              pathname: '/home',
              params: { role: formData.role }
            }),
          },
        ]
      );
    } catch (error: any) {
      console.error('Registration error:', error);
      let errorMessage = 'Failed to create account';
      
      switch (error.code) {
        case 'auth/email-already-in-use':
          errorMessage = 'Email already in use';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Invalid email address';
          break;
        case 'auth/weak-password':
          errorMessage = 'Password is too weak';
          break;
        default:
          errorMessage = error.message;
      }
      
      Alert.alert('Registration Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style="light" backgroundColor="#0A1929" />
      
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ 
          paddingBottom: insets.bottom + 30,
          paddingTop: Platform.OS === 'android' ? insets.top + 20 : 60,
        }}
      >
        <View style={styles.header}>
          <Logo size="large" showText={true} />
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Sign up to get started with VeloCity
          </Text>
        </View>

        <View style={styles.form}>
          {/* Full Name */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Full Name</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              placeholder="John Doe"
              placeholderTextColor={colors.textSecondary}
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
            />
          </View>

          {/* Email */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Email</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              placeholder="john@example.com"
              placeholderTextColor={colors.textSecondary}
              keyboardType="email-address"
              autoCapitalize="none"
              value={formData.email}
              onChangeText={(text) => setFormData({ ...formData, email: text })}
            />
          </View>

          {/* Phone Number with Verification */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Phone Number</Text>
            <View style={styles.phoneRow}>
              <TextInput
                style={[
                  styles.phoneInput,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                placeholder="802 123 4567"
                placeholderTextColor={colors.textSecondary}
                keyboardType="phone-pad"
                value={formData.phone}
                onChangeText={(text) => {
                  setFormData({ ...formData, phone: text });
                  setPhoneVerified(false);
                }}
                editable={!phoneVerified}
              />
              <TouchableOpacity
                style={[
                  styles.verifyBtn,
                  { backgroundColor: phoneVerified ? colors.success : colors.primary },
                  (phoneVerified || !formData.phone || formData.phone.length < 10) && { opacity: 0.7 }
                ]}
                onPress={() => {
                  if (formData.phone && formData.phone.length >= 10) {
                    setShowVerification(true);
                  } else {
                    Alert.alert('Error', 'Please enter a valid phone number (minimum 10 digits)');
                  }
                }}
                disabled={phoneVerified}
              >
                <Text style={styles.verifyBtnText}>
                  {phoneVerified ? '✓ Verified' : 'Verify'}
                </Text>
              </TouchableOpacity>
            </View>
            {phoneVerified && (
              <Text style={[styles.verifiedText, { color: colors.success }]}>
                ✓ Phone number verified
              </Text>
            )}
          </View>

          {/* Password */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={[
                  styles.passwordInput,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                placeholder="Create a strong password"
                placeholderTextColor={colors.textSecondary}
                secureTextEntry={!showPassword}
                value={formData.password}
                onChangeText={handlePasswordChange}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Text style={styles.eyeIcon}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
              </TouchableOpacity>
            </View>
            
            {/* Password Strength Indicator */}
            {formData.password.length > 0 && (
              <>
                <PasswordStrengthIndicator strength={passwordStrength} />
                <PasswordRequirements 
                  password={formData.password}
                  requirements={DEFAULT_PASSWORD_REQUIREMENTS}
                />
              </>
            )}
          </View>

          {/* Confirm Password */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Confirm Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={[
                  styles.passwordInput,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                placeholder="Confirm your password"
                placeholderTextColor={colors.textSecondary}
                secureTextEntry={!showConfirmPassword}
                value={formData.confirmPassword}
                onChangeText={(text) => setFormData({ ...formData, confirmPassword: text })}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                <Text style={styles.eyeIcon}>{showConfirmPassword ? '👁️' : '👁️‍🗨️'}</Text>
              </TouchableOpacity>
            </View>
            {formData.confirmPassword.length > 0 && formData.password !== formData.confirmPassword && (
              <Text style={[styles.errorText, { color: colors.error }]}>Passwords do not match</Text>
            )}
          </View>

          {/* Role Selection */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>I want to</Text>
            <View style={styles.roleContainer}>
              <TouchableOpacity
                style={[
                  styles.roleButton,
                  formData.role === 'passenger' && styles.roleButtonActive,
                  {
                    backgroundColor: formData.role === 'passenger' ? colors.primary : colors.surface,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => setFormData({ ...formData, role: 'passenger' })}
              >
                <Text style={styles.roleIcon}>👤</Text>
                <Text
                  style={[
                    styles.roleText,
                    { color: formData.role === 'passenger' ? '#fff' : colors.text },
                  ]}
                >
                  Ride as Passenger
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.roleButton,
                  formData.role === 'driver' && styles.roleButtonActive,
                  {
                    backgroundColor: formData.role === 'driver' ? colors.primary : colors.surface,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => setFormData({ ...formData, role: 'driver' })}
              >
                <Text style={styles.roleIcon}>🚗</Text>
                <Text
                  style={[
                    styles.roleText,
                    { color: formData.role === 'driver' ? '#fff' : colors.text },
                  ]}
                >
                  Drive as Driver
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Register Button */}
          <TouchableOpacity
            style={[styles.registerButton, { backgroundColor: colors.primary }]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.registerButtonText}>Create Account</Text>
            )}
          </TouchableOpacity>

          {/* Login Link */}
          <TouchableOpacity
            style={styles.loginLink}
            onPress={() => router.push('/login')}
          >
            <Text style={[styles.loginText, { color: colors.textSecondary }]}>
              Already have an account?{' '}
              <Text style={[styles.loginLinkText, { color: colors.primary }]}>Sign In</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Phone Verification Modal */}
      <Modal
        visible={showVerification}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowVerification(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <PhoneVerification
              onVerificationComplete={(phone, verified) => {
                if (verified) {
                  setVerifiedPhone(phone);
                  setPhoneVerified(true);
                  // Store the phone number without country code for display
                  const localNumber = phone.replace('+234', '');
                  setFormData({ ...formData, phone: localNumber });
                }
                setShowVerification(false);
              }}
              onBack={() => setShowVerification(false)}
              initialPhoneNumber={formData.phone}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 40,
    marginTop: 16,
  },
  form: {
    paddingHorizontal: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  phoneRow: {
    flexDirection: 'row',
    gap: 12,
  },
  phoneInput: {
    flex: 1,
    height: 50,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  verifyBtn: {
    width: 100,
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifyBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  verifiedText: {
    fontSize: 12,
    marginTop: 4,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordInput: {
    flex: 1,
    height: 50,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    paddingRight: 50,
  },
  eyeButton: {
    position: 'absolute',
    right: 12,
    padding: 8,
  },
  eyeIcon: {
    fontSize: 20,
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
  },
  roleContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  roleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  roleButtonActive: {
    borderWidth: 0,
  },
  roleIcon: {
    fontSize: 20,
  },
  roleText: {
    fontSize: 14,
    fontWeight: '600',
  },
  registerButton: {
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 16,
  },
  registerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  loginLink: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  loginText: {
    fontSize: 14,
  },
  loginLinkText: {
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    borderRadius: 20,
    borderWidth: 1,
    maxHeight: '80%',
  },
});