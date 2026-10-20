import { router } from 'expo-router';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { ref, get } from 'firebase/database';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { auth, db } from '../config/firebase';
import { useTheme } from '../contexts/ThemeContext';
import Logo from '../components/Logo';
// import { registerForPushNotificationsAsync, savePushToken } from '../services/notificationService';

export default function LoginScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const validateForm = (): boolean => {
    if (!formData.email.trim()) {
      Alert.alert('Error', 'Please enter your email');
      return false;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return false;
    }
    
    if (!formData.password.trim()) {
      Alert.alert('Error', 'Please enter your password');
      return false;
    }
    
    return true;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;
    
    setLoading(true);
    
    try {
      console.log('Attempting login for:', formData.email);
      
      // Sign in with Firebase Auth
      const userCredential = await signInWithEmailAndPassword(
        auth,
        formData.email.trim(),
        formData.password
      );
      
      const loggedInUser = userCredential.user;
      console.log('Login successful for user:', loggedInUser.uid);
      
      // PUSH NOTIFICATION - TEMPORARILY DISABLED FOR EXPO GO
      /*
      try {
        const pushToken = await registerForPushNotificationsAsync();
        if (pushToken && loggedInUser) {
          await savePushToken(loggedInUser.uid, pushToken);
        }
      } catch (tokenError) {
        console.log('Push token registration error (non-critical):', tokenError);
      }
      */
      
      // Get user role from database
      const userRef = ref(db, `users/${loggedInUser.uid}`);
      const snapshot = await get(userRef);
      
      if (snapshot.exists()) {
        const userData = snapshot.val();
        const role = userData.role || 'passenger';
        
        Alert.alert(
          'Success',
          `Welcome back, ${userData.name || 'User'}!`,
          [
            {
              text: 'OK',
              onPress: () => router.replace({
                pathname: '/home',
                params: { role: role === 'driver' ? 'driver' : 'passenger' }
              }),
            },
          ]
        );
      } else {
        // If user data doesn't exist in database, use default
        console.log('User data not found, using default');
        Alert.alert(
          'Success',
          'Logged in successfully!',
          [
            {
              text: 'OK',
              onPress: () => router.replace('/home'),
            },
          ]
        );
      }
    } catch (error: any) {
      console.error('Login error details:', error.code, error.message);
      
      let errorMessage = 'Failed to login';
      let errorTitle = 'Login Failed';
      
      switch (error.code) {
        case 'auth/invalid-credential':
          errorTitle = 'Invalid Credentials';
          errorMessage = 'The email or password you entered is incorrect. Please try again.';
          break;
        case 'auth/invalid-email':
          errorTitle = 'Invalid Email';
          errorMessage = 'Please enter a valid email address.';
          break;
        case 'auth/user-disabled':
          errorTitle = 'Account Disabled';
          errorMessage = 'This account has been disabled. Please contact support.';
          break;
        case 'auth/user-not-found':
          errorTitle = 'Account Not Found';
          errorMessage = 'No account found with this email. Please sign up first.';
          break;
        case 'auth/wrong-password':
          errorTitle = 'Wrong Password';
          errorMessage = 'Incorrect password. Please try again.';
          break;
        case 'auth/too-many-requests':
          errorTitle = 'Too Many Attempts';
          errorMessage = 'Too many failed login attempts. Please try again later.';
          break;
        case 'auth/network-request-failed':
          errorTitle = 'Network Error';
          errorMessage = 'Please check your internet connection and try again.';
          break;
        default:
          errorMessage = error.message;
      }
      
      Alert.alert(errorTitle, errorMessage);
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
            Sign in to continue your journey with VeloCity
          </Text>
        </View>

        <View style={styles.form}>
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
              autoCorrect={false}
              value={formData.email}
              onChangeText={(text) => setFormData({ ...formData, email: text })}
            />
          </View>

          {/* Password with visibility toggle */}
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
                placeholder="Enter your password"
                placeholderTextColor={colors.textSecondary}
                secureTextEntry={!showPassword}
                value={formData.password}
                onChangeText={(text) => setFormData({ ...formData, password: text })}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Text style={styles.eyeIcon}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Forgot Password Link */}
          <TouchableOpacity 
            style={styles.forgotPasswordLink}
            onPress={() => Alert.alert('Coming Soon', 'Password reset feature will be available soon!')}
          >
            <Text style={[styles.forgotPasswordText, { color: colors.primary }]}>
              Forgot Password?
            </Text>
          </TouchableOpacity>

          {/* Login Button */}
          <TouchableOpacity
            style={[styles.loginButton, { backgroundColor: colors.primary }]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.loginButtonText}>Sign In</Text>
            )}
          </TouchableOpacity>

          {/* Register Link */}
          <TouchableOpacity
            style={styles.registerLink}
            onPress={() => router.push('/register')}
          >
            <Text style={[styles.registerText, { color: colors.textSecondary }]}>
              Don't have an account?{' '}
              <Text style={[styles.registerLinkText, { color: colors.primary }]}>Sign Up</Text>
            </Text>
          </TouchableOpacity>

          {/* Demo Credentials (for testing) */}
          <View style={styles.demoContainer}>
            <Text style={[styles.demoTitle, { color: colors.textSecondary }]}>Demo Credentials:</Text>
            <Text style={[styles.demoText, { color: colors.textSecondary }]}>
              Email: demo@velocity.com{'\n'}
              Password: demo123456
            </Text>
          </View>
        </View>
      </ScrollView>
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
  forgotPasswordLink: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    fontSize: 14,
    fontWeight: '600',
  },
  loginButton: {
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  registerLink: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  registerText: {
    fontSize: 14,
  },
  registerLinkText: {
    fontWeight: '600',
  },
  demoContainer: {
    marginTop: 30,
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(14, 165, 233, 0.1)',
    alignItems: 'center',
  },
  demoTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  demoText: {
    fontSize: 12,
    textAlign: 'center',
  },
});