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

export default function VehicleRegistrationScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  
  const [vehicleData, setVehicleData] = useState({
    vehicleType: 'Car',
    vehiclePlate: '',
    vehicleModel: '',
    vehicleColor: '',
    vehicleYear: '',
    seats: '4',
    isVerified: false,
  });

  const [existingVehicle, setExistingVehicle] = useState<any>(null);

  useEffect(() => {
    loadVehicleData();
  }, []);

  const loadVehicleData = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      router.replace('/login');
      return;
    }

    try {
      const userRef = ref(db, `users/${currentUser.uid}/driverInfo`);
      const snapshot = await get(userRef);
      if (snapshot.exists()) {
        const data = snapshot.val();
        setExistingVehicle(data);
        setVehicleData({
          vehicleType: data.vehicleType || 'Car',
          vehiclePlate: data.vehiclePlate || '',
          vehicleModel: data.vehicleModel || '',
          vehicleColor: data.vehicleColor || '',
          vehicleYear: data.vehicleYear || '',
          seats: data.seats || '4',
          isVerified: data.isVerified || false,
        });
      }
    } catch (error) {
      console.log('Error loading vehicle data:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const validateForm = (): boolean => {
    if (!vehicleData.vehiclePlate.trim()) {
      Alert.alert('Error', 'Please enter your vehicle plate number');
      return false;
    }
    
    if (vehicleData.vehiclePlate.length < 5) {
      Alert.alert('Error', 'Please enter a valid plate number');
      return false;
    }
    
    if (!vehicleData.vehicleModel.trim()) {
      Alert.alert('Error', 'Please enter your vehicle model');
      return false;
    }
    
    if (!vehicleData.vehicleColor.trim()) {
      Alert.alert('Error', 'Please enter your vehicle color');
      return false;
    }
    
    if (vehicleData.vehicleYear && vehicleData.vehicleYear.length !== 4) {
      Alert.alert('Error', 'Please enter a valid year (e.g., 2020)');
      return false;
    }
    
    return true;
  };

  const handleSaveVehicle = async () => {
    if (!validateForm()) return;
    
    setLoading(true);
    
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        Alert.alert('Error', 'User not logged in');
        return;
      }

      const userRef = ref(db, `users/${currentUser.uid}`);
      await update(userRef, {
        driverInfo: {
          vehicleType: vehicleData.vehicleType,
          vehiclePlate: vehicleData.vehiclePlate.toUpperCase(),
          vehicleModel: vehicleData.vehicleModel,
          vehicleColor: vehicleData.vehicleColor,
          vehicleYear: vehicleData.vehicleYear,
          seats: vehicleData.seats,
          isVerified: existingVehicle?.isVerified || false,
          registeredAt: existingVehicle?.registeredAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      });
      
      Alert.alert(
        'Success',
        existingVehicle ? 'Vehicle information updated successfully!' : 'Vehicle registered successfully!',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error: any) {
      console.error('Error saving vehicle:', error);
      Alert.alert('Error', 'Failed to save vehicle information');
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <StatusBar style="light" backgroundColor="#0A1929" />
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary, marginTop: 16 }]}>Loading vehicle info...</Text>
      </View>
    );
  }

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
          <Logo size="medium" showText={true} />
          <Text style={[styles.title, { color: colors.text }]}>
            {existingVehicle ? 'Edit Vehicle' : 'Register Your Vehicle'}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {existingVehicle 
              ? 'Update your vehicle information' 
              : 'Add your vehicle details to start driving with VeloCity'}
          </Text>
        </View>

        <View style={styles.form}>
          {/* Vehicle Type */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Vehicle Type</Text>
            <View style={styles.typeContainer}>
              {['Motorcycle', 'Car', 'Tricycle'].map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.typeButton,
                    vehicleData.vehicleType === type && styles.typeButtonActive,
                    {
                      backgroundColor: vehicleData.vehicleType === type ? colors.primary : colors.surface,
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={() => setVehicleData({ ...vehicleData, vehicleType: type })}
                >
                  <Text style={styles.typeIcon}>
                    {type === 'Car' ? '🚗' : type === 'Motorcycle' ? '🏍️' : '🛺'}
                  </Text>
                  <Text
                    style={[
                      styles.typeText,
                      { color: vehicleData.vehicleType === type ? '#fff' : colors.text },
                    ]}
                  >
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Vehicle Plate Number */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Plate Number</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              placeholder="ABC 123 XY"
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="characters"
              value={vehicleData.vehiclePlate}
              onChangeText={(text) => setVehicleData({ ...vehicleData, vehiclePlate: text })}
            />
          </View>

          {/* Vehicle Model */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Vehicle Model</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              placeholder="Toyota Camry"
              placeholderTextColor={colors.textSecondary}
              value={vehicleData.vehicleModel}
              onChangeText={(text) => setVehicleData({ ...vehicleData, vehicleModel: text })}
            />
          </View>

          {/* Vehicle Color */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Vehicle Color</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              placeholder="Red"
              placeholderTextColor={colors.textSecondary}
              value={vehicleData.vehicleColor}
              onChangeText={(text) => setVehicleData({ ...vehicleData, vehicleColor: text })}
            />
          </View>

          {/* Vehicle Year */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Year (Optional)</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              placeholder="2020"
              placeholderTextColor={colors.textSecondary}
              keyboardType="numeric"
              maxLength={4}
              value={vehicleData.vehicleYear}
              onChangeText={(text) => setVehicleData({ ...vehicleData, vehicleYear: text })}
            />
          </View>

          {/* Number of Seats */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Number of Seats</Text>
            <View style={styles.seatsContainer}>
              {['2', '4', '5', '6', '7', '8'].map((seat) => (
                <TouchableOpacity
                  key={seat}
                  style={[
                    styles.seatButton,
                    vehicleData.seats === seat && styles.seatButtonActive,
                    {
                      backgroundColor: vehicleData.seats === seat ? colors.primary : colors.surface,
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={() => setVehicleData({ ...vehicleData, seats: seat })}
                >
                  <Text
                    style={[
                      styles.seatText,
                      { color: vehicleData.seats === seat ? '#fff' : colors.text },
                    ]}
                  >
                    {seat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Verification Status */}
          {existingVehicle && (
            <View style={[styles.verificationBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.verificationTitle, { color: colors.text }]}>Verification Status</Text>
              <View style={styles.verificationStatus}>
                <Text style={styles.verificationIcon}>
                  {vehicleData.isVerified ? '✅' : '⏳'}
                </Text>
                <Text style={[styles.verificationText, { color: vehicleData.isVerified ? colors.success : colors.warning }]}>
                  {vehicleData.isVerified ? 'Verified' : 'Pending Verification'}
                </Text>
              </View>
              {!vehicleData.isVerified && (
                <Text style={[styles.verificationNote, { color: colors.textSecondary }]}>
                  Your vehicle is pending verification. This may take 1-2 business days.
                </Text>
              )}
            </View>
          )}

          {/* Save Button */}
          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: colors.primary }]}
            onPress={handleSaveVehicle}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>
                {existingVehicle ? 'Update Vehicle' : 'Register Vehicle'}
              </Text>
            )}
          </TouchableOpacity>
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
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
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
  typeContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  typeButton: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  typeButtonActive: {
    borderWidth: 0,
  },
  typeIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  typeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  seatsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  seatButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  seatButtonActive: {
    borderWidth: 0,
  },
  seatText: {
    fontSize: 16,
    fontWeight: '700',
  },
  verificationBox: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  verificationTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  verificationStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  verificationIcon: {
    fontSize: 20,
  },
  verificationText: {
    fontSize: 14,
    fontWeight: '600',
  },
  verificationNote: {
    fontSize: 12,
    marginTop: 4,
  },
  saveButton: {
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  loadingText: {
    fontSize: 14,
  },
});