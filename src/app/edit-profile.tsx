import { router } from 'expo-router';
import { ref, update, get } from 'firebase/database';
import { useState, useEffect } from 'react';
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

export default function EditProfileScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
  });

  const [originalData, setOriginalData] = useState({
    name: '',
    email: '',
    phone: '',
  });

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      Alert.alert('Error', 'User not logged in');
      router.back();
      return;
    }

    try {
      const userRef = ref(db, `users/${currentUser.uid}`);
      const snapshot = await get(userRef);
      
      if (snapshot.exists()) {
        const data = snapshot.val();
        const userData = {
          name: data.name || '',
          email: data.email || currentUser.email || '',
          phone: data.phone || '',
        };
        setFormData(userData);
        setOriginalData(userData);
      } else {
        // If no data in database, use auth email
        setFormData({
          name: '',
          email: currentUser.email || '',
          phone: '',
        });
        setOriginalData({
          name: '',
          email: currentUser.email || '',
          phone: '',
        });
      }
    } catch (error) {
      console.log('Error loading user data:', error);
      Alert.alert('Error', 'Failed to load user data');
    } finally {
      setLoading(false);
    }
  };

  const hasChanges = () => {
    return formData.name !== originalData.name ||
           formData.phone !== originalData.phone;
  };

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return false;
    }
    
    if (formData.phone && formData.phone.length > 0) {
      const phoneRegex = /^[0-9]{10,15}$/;
      if (!phoneRegex.test(formData.phone.replace(/[^0-9]/g, ''))) {
        Alert.alert('Error', 'Please enter a valid phone number (10-15 digits)');
        return false;
      }
    }
    
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    if (!hasChanges()) {
      Alert.alert('Info', 'No changes to save');
      router.back();
      return;
    }

    setSaving(true);
    
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        Alert.alert('Error', 'User not logged in');
        return;
      }

      // Update user data in Realtime Database
      const userRef = ref(db, `users/${currentUser.uid}`);
      await update(userRef, {
        name: formData.name,
        phone: formData.phone,
        updatedAt: new Date().toISOString(),
      });

      Alert.alert('Success', 'Profile updated successfully!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error: any) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <StatusBar style="light" backgroundColor="#0A1929" />
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary, marginTop: 16 }]}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style="light" backgroundColor="#0A1929" />
      
      <View style={[styles.header, { paddingTop: insets.top + 16, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={[styles.backIcon, { color: colors.text }]}>←</Text>
        </TouchableOpacity>
        <Logo size="small" showText={true} />
        <TouchableOpacity onPress={handleSave} disabled={saving} style={styles.saveBtn}>
          {saving ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text style={[styles.saveText, { color: colors.primary }]}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ 
          paddingBottom: insets.bottom + 30,
          paddingTop: 20,
        }}
      >
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
              placeholder="Your full name"
              placeholderTextColor={colors.textSecondary}
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
            />
          </View>

          {/* Email (Read-only) */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Email</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  color: colors.textSecondary,
                },
              ]}
              placeholder="Your email"
              placeholderTextColor={colors.textSecondary}
              value={formData.email}
              editable={false}
            />
            <Text style={[styles.readonlyNote, { color: colors.textSecondary }]}>
              Email cannot be changed
            </Text>
          </View>

          {/* Phone Number */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Phone Number</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              placeholder="0802 123 4567"
              placeholderTextColor={colors.textSecondary}
              keyboardType="phone-pad"
              value={formData.phone}
              onChangeText={(text) => setFormData({ ...formData, phone: text })}
            />
          </View>

          {/* Change Password Link */}
          <TouchableOpacity 
            style={[styles.passwordLink, { borderTopColor: colors.border, borderBottomColor: colors.border }]}
            onPress={() => Alert.alert('Coming Soon', 'Password reset feature will be available soon!')}
          >
            <Text style={[styles.passwordLinkText, { color: colors.primary }]}>Change Password</Text>
            <Text style={[styles.passwordLinkArrow, { color: colors.textSecondary }]}>→</Text>
          </TouchableOpacity>

          {/* Changes Info */}
          {hasChanges() && (
            <View style={[styles.changesInfo, { backgroundColor: colors.warning + '10', borderColor: colors.warning }]}>
              <Text style={styles.changesIcon}>✏️</Text>
              <Text style={[styles.changesText, { color: colors.textSecondary }]}>
                You have unsaved changes
              </Text>
            </View>
          )}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 28,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  saveBtn: {
    width: 60,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: {
    fontSize: 16,
    fontWeight: '600',
  },
  form: {
    paddingHorizontal: 20,
  },
  inputGroup: {
    marginBottom: 24,
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
  readonlyNote: {
    fontSize: 11,
    marginTop: 4,
  },
  passwordLink: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    marginTop: 20,
  },
  passwordLinkText: {
    fontSize: 15,
    fontWeight: '500',
  },
  passwordLinkArrow: {
    fontSize: 18,
  },
  changesInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 24,
  },
  changesIcon: {
    fontSize: 20,
  },
  changesText: {
    fontSize: 13,
    flex: 1,
  },
  loadingText: {
    fontSize: 14,
  },
});