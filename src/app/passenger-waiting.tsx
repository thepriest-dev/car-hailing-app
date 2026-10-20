import { router, useLocalSearchParams } from 'expo-router';
import { useState, useEffect, useRef } from 'react';
import {
    Animated,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    Alert,
    ActivityIndicator,
    Linking
} from 'react-native';
import MapPlaceholder from './MapPlaceholder';
import { useTheme } from '../contexts/ThemeContext';
import { auth, db } from '../config/firebase';
import { ref, onValue, update, get } from 'firebase/database';
import Logo from '../components/Logo';

export default function PassengerWaitingScreen() {
  const { colors } = useTheme();
  const params = useLocalSearchParams();
  const tripCode = params.tripCode ? params.tripCode.toString() : '----';
  const rideId = params.rideId ? params.rideId.toString() : null;
  const [isDriverHere, setIsDriverHere] = useState(false);
  const [driverName, setDriverName] = useState(params.driverName?.toString() || 'Your driver');
  const [driverPhone, setDriverPhone] = useState(params.driverPhone?.toString() || '');
  const [driverRating, setDriverRating] = useState(params.driverRating?.toString() || '4.8');
  const [vehicleInfo, setVehicleInfo] = useState({
    vehicleType: 'Car',
    vehicleModel: 'Toyota Camry',
    vehicleColor: 'Silver',
    vehiclePlate: 'LAG ABC 123 XY',
    seats: '4',
    isVerified: false
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    loadRideDetails();
    
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.2, duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    ).start();

    if (rideId) {
      subscribeToRideUpdates();
    }
  }, []);

  const subscribeToRideUpdates = () => {
    if (!rideId) return;

    const rideRef = ref(db, `rides/${rideId}`);
    
    const unsubscribe = onValue(rideRef, (snapshot) => {
      const ride = snapshot.val();
      if (ride) {
        console.log('Ride update:', ride.status);
        
        if (ride.status === 'cancelled') {
          Alert.alert(
            'Ride Cancelled',
            'Your VeloCity ride has been cancelled. Redirecting to home.',
            [{ text: 'OK', onPress: () => router.replace({ pathname: '/home', params: { role: 'passenger' } }) }]
          );
        } else if (ride.status === 'arrived') {
          setIsDriverHere(true);
        } else if (ride.status === 'started') {
          router.replace({
            pathname: '/trip',
            params: {
              pickup: params.pickup,
              destination: params.destination,
              fare: params.fare,
              tripCode: tripCode,
              rideId: rideId
            }
          });
        }
      }
    });

    return () => unsubscribe();
  };

  const loadRideDetails = async () => {
    setIsLoading(true);
    
    try {
      if (rideId) {
        const rideRef = ref(db, `rides/${rideId}`);
        
        const snapshot = await new Promise((resolve) => {
          onValue(rideRef, (snap) => {
            resolve(snap);
          }, { onlyOnce: true });
        });
        
        const ride = (snapshot as any).val();
        
        if (ride) {
          if (ride.driverId && ride.driverName) {
            setDriverName(ride.driverName || 'Your driver');
            setDriverPhone(ride.driverPhone || '');
            setDriverRating(ride.driverRating?.toString() || '4.8');
            
            // Fetch full driver details including vehicle info
            const driverRef = ref(db, `users/${ride.driverId}`);
            const driverSnapshot = await get(driverRef);
            
            if (driverSnapshot.exists()) {
              const driverData = driverSnapshot.val();
              
              // Update driver info with full data
              if (driverData.name) setDriverName(driverData.name);
              if (driverData.phone) setDriverPhone(driverData.phone);
              if (driverData.rating) setDriverRating(driverData.rating.toString());
              
              // Set vehicle information from driver's profile
              if (driverData.driverInfo) {
                setVehicleInfo({
                  vehicleType: driverData.driverInfo.vehicleType || 'Car',
                  vehicleModel: driverData.driverInfo.vehicleModel || 'Toyota Camry',
                  vehicleColor: driverData.driverInfo.vehicleColor || 'Silver',
                  vehiclePlate: driverData.driverInfo.vehiclePlate || 'LAG ABC 123 XY',
                  seats: driverData.driverInfo.seats || '4',
                  isVerified: driverData.driverInfo.isVerified || false
                });
              }
            } else {
              // Fallback to ride data if available
              if (ride.vehiclePlate) setVehicleInfo(prev => ({ ...prev, vehiclePlate: ride.vehiclePlate }));
              if (ride.vehicleName) setVehicleInfo(prev => ({ ...prev, vehicleModel: ride.vehicleName }));
              if (ride.vehicleColor) setVehicleInfo(prev => ({ ...prev, vehicleColor: ride.vehicleColor }));
            }
          }
        }
        setIsLoading(false);
      } else {
        setIsLoading(false);
      }
    } catch (error) {
      console.log('Error loading ride details:', error);
      setIsLoading(false);
    }
  };

  // Function to call the driver
  const callDriver = async () => {
    if (!driverPhone) {
      Alert.alert('Error', 'Driver phone number not available');
      return;
    }
    
    // Format phone number (remove spaces, ensure proper format)
    let phoneNumber = driverPhone.replace(/\s/g, '');
    
    // If number doesn't start with +, add country code if needed
    if (!phoneNumber.startsWith('+')) {
      // For Nigerian numbers, if it starts with 0, replace with +234
      if (phoneNumber.startsWith('0')) {
        phoneNumber = '+234' + phoneNumber.substring(1);
      } else if (phoneNumber.length === 10) {
        phoneNumber = '+234' + phoneNumber;
      }
    }
    
    const url = `tel:${phoneNumber}`;
    
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Your device cannot make calls');
      }
    } catch (error) {
      console.log('Error calling driver:', error);
      Alert.alert('Error', 'Failed to make call. Please try again.');
    }
  };

  const handleDriverArrived = () => {
    setIsDriverHere(true);
    
    if (rideId) {
      const rideRef = ref(db, `rides/${rideId}`);
      update(rideRef, { status: 'arrived' })
        .catch(error => console.log('Error updating ride status:', error));
    }
  };

  const cancelRide = async () => {
    if (isCancelling) return;
    
    Alert.alert(
      'Cancel Ride',
      'Are you sure you want to cancel your VeloCity ride?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            setIsCancelling(true);
            
            if (rideId) {
              const rideRef = ref(db, `rides/${rideId}`);
              await update(rideRef, { status: 'cancelled' });
            }
            
            router.replace({ pathname: '/home', params: { role: 'passenger' } });
          }
        }
      ]
    );
  };

  const getVehicleIcon = () => {
    switch (vehicleInfo.vehicleType) {
      case 'Car': return '🚗';
      case 'Motorcycle': return '🏍️';
      case 'Tricycle': return '🛺';
      default: return '🚗';
    }
  };

  const getVehicleDisplayName = () => {
    const parts = [];
    if (vehicleInfo.vehicleType) parts.push(vehicleInfo.vehicleType);
    if (vehicleInfo.vehicleModel) parts.push(vehicleInfo.vehicleModel);
    if (vehicleInfo.vehicleColor) parts.push(vehicleInfo.vehicleColor);
    return parts.join(' · ');
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading ride details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isDriverHere) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <MapPlaceholder />
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={[styles.sheet, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
            <View style={[styles.successCircle, { backgroundColor: colors.success }]}>
              <Logo size="small" showText={false} />
            </View>

            <Text style={[styles.title, { color: colors.text }]}>Your driver has arrived!</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Please get in the vehicle. Your driver will start the trip.
            </Text>

            <View style={[styles.verifyCodeCard, { backgroundColor: colors.surfaceLight, borderColor: colors.primary }]}>
              <Text style={[styles.verifyCodeLabel, { color: colors.textSecondary }]}>Your Trip Code</Text>
              <Text style={[styles.verifyCodeValue, { color: colors.primary }]}>{tripCode}</Text>
              <Text style={[styles.verifyCodeNote, { color: colors.textSecondary }]}>
                Show this code to your driver
              </Text>
            </View>

            <View style={[styles.driverCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={styles.driverAvatar}>🧑‍✈️</Text>
              <View style={styles.driverInfo}>
                <Text style={[styles.driverName, { color: colors.text }]}>{driverName}</Text>
                <View style={styles.ratingRow}>
                  <Text style={styles.ratingStar}>⭐</Text>
                  <Text style={[styles.ratingVal, { color: colors.warning }]}>{driverRating}</Text>
                  <Text style={[styles.ratingCount, { color: colors.textSecondary }]}>(312 trips)</Text>
                </View>
                {driverPhone ? (
                  <TouchableOpacity onPress={callDriver}>
                    <Text style={[styles.driverPhone, { color: colors.primary }]}>📞 Call Driver</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>

            <View style={[styles.vehicleCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={styles.vehicleIcon}>{getVehicleIcon()}</Text>
              <View style={styles.vehicleInfo}>
                <Text style={[styles.vehicleName, { color: colors.text }]}>{getVehicleDisplayName()}</Text>
                <Text style={[styles.vehiclePlate, { color: colors.textSecondary }]}>{vehicleInfo.vehiclePlate}</Text>
                {vehicleInfo.seats && (
                  <Text style={[styles.vehicleSeats, { color: colors.textSecondary }]}>👥 {vehicleInfo.seats} seats</Text>
                )}
              </View>
            </View>

            <View style={[styles.waitingCard, { backgroundColor: colors.surfaceLight, borderColor: colors.primary }]}>
              <Text style={styles.waitingIcon}>⏳</Text>
              <Text style={[styles.waitingTitle, { color: colors.text }]}>Waiting for driver to start trip</Text>
              <Text style={[styles.waitingSub, { color: colors.textSecondary }]}>
                Your driver will begin the trip once you're both ready
              </Text>
            </View>

            <View style={[styles.taglineCard, { backgroundColor: colors.surfaceLight, borderColor: colors.primary }]}>
              <Logo size="small" showText={false} />
              <Text style={[styles.taglineText, { color: colors.text }]}>Set the Pace. Arrive in Style.</Text>
            </View>

            <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.error }]} onPress={cancelRide} disabled={isCancelling}>
              <Text style={[styles.cancelTxt, { color: colors.error }]}>{isCancelling ? 'Cancelling...' : 'Cancel Ride'}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <MapPlaceholder />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={[styles.sheet, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
          <Animated.View style={[
            styles.pulseCircle,
            {
              transform: [{ scale: pulse }],
              backgroundColor: colors.surfaceLight,
              borderColor: colors.primary
            }
          ]}>
            <Logo size="small" showText={false} />
          </Animated.View>

          <Text style={[styles.title, { color: colors.text }]}>Driver is on the way!</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Your VeloCity driver is heading to your pickup location
          </Text>

          <View style={styles.dotsRow}>
            {[0, 1, 2, 3, 4].map(i => (
              <View 
                key={i} 
                style={[
                  styles.dot,
                  i < 3 && { backgroundColor: colors.primary },
                  i >= 3 && { backgroundColor: colors.border }
                ]} 
              />
            ))}
          </View>

          <View style={[styles.driverCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={styles.driverAvatar}>🧑‍✈️</Text>
            <View style={styles.driverInfo}>
              <Text style={[styles.driverName, { color: colors.text }]}>{driverName}</Text>
              <View style={styles.ratingRow}>
                <Text style={styles.ratingStar}>⭐</Text>
                <Text style={[styles.ratingVal, { color: colors.warning }]}>{driverRating}</Text>
                <Text style={[styles.ratingCount, { color: colors.textSecondary }]}>(312 trips)</Text>
              </View>
              {driverPhone ? (
                <TouchableOpacity onPress={callDriver}>
                  <Text style={[styles.driverPhone, { color: colors.primary }]}>📞 Call Driver</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          <View style={[styles.vehicleCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={styles.vehicleIcon}>{getVehicleIcon()}</Text>
            <View style={styles.vehicleInfo}>
              <Text style={[styles.vehicleName, { color: colors.text }]}>{getVehicleDisplayName()}</Text>
              <Text style={[styles.vehiclePlate, { color: colors.textSecondary }]}>{vehicleInfo.vehiclePlate}</Text>
              {vehicleInfo.seats && (
                <Text style={[styles.vehicleSeats, { color: colors.textSecondary }]}>👥 {vehicleInfo.seats} seats</Text>
              )}
            </View>
          </View>

          <View style={[styles.tripCodeCard, { backgroundColor: colors.surfaceLight, borderColor: colors.warning }]}>
            <Text style={[styles.tripCodeLabel, { color: colors.warning }]}>YOUR VERIFICATION CODE</Text>
            <Text style={[styles.tripCodeValue, { color: colors.warning }]}>{tripCode}</Text>
            <Text style={[styles.tripCodeNote, { color: colors.textSecondary }]}>
              Show this code to your driver when they arrive
            </Text>
          </View>

          <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.summaryRow}>
              <View style={styles.dotGreen} />
              <Text style={[styles.summaryTxt, { color: colors.text }]}>
                {params.pickup || 'Ikeja, Lagos'}
              </Text>
            </View>
            <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
            <View style={styles.summaryRow}>
              <View style={styles.dotBlue} />
              <Text style={[styles.summaryTxt, { color: colors.text }]}>
                {params.destination || 'Victoria Island, Lagos'}
              </Text>
            </View>
          </View>

          <View style={[styles.taglineCard, { backgroundColor: colors.surfaceLight, borderColor: colors.primary }]}>
            <Logo size="small" showText={false} />
            <Text style={[styles.taglineText, { color: colors.text }]}>Set the Pace. Arrive in Style.</Text>
          </View>

          <TouchableOpacity style={[styles.driverArrivedBtn, { backgroundColor: colors.primary }]} onPress={handleDriverArrived}>
            <Text style={styles.driverArrivedTxt}>✓ My Driver Has Arrived</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.error }]} onPress={cancelRide} disabled={isCancelling}>
            <Text style={[styles.cancelTxt, { color: colors.error }]}>{isCancelling ? 'Cancelling...' : 'Cancel Ride'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'flex-end' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14 },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    padding: 24,
    alignItems: 'center',
  },
  pulseCircle: { width: 80, height: 80, borderRadius: 40, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  title: { fontSize: 22, fontWeight: '800', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 14, textAlign: 'center', marginBottom: 20 },
  dotsRow: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  driverCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, gap: 12, width: '100%' },
  driverAvatar: { fontSize: 40 },
  driverInfo: { flex: 1 },
  driverName: { fontSize: 16, fontWeight: '700' },
  driverPhone: { fontSize: 12, marginTop: 4 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  ratingStar: { fontSize: 12 },
  ratingVal: { fontSize: 13, fontWeight: '700' },
  ratingCount: { fontSize: 11 },
  vehicleCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, gap: 12, width: '100%' },
  vehicleIcon: { fontSize: 32 },
  vehicleInfo: { flex: 1 },
  vehicleName: { fontSize: 14, fontWeight: '600' },
  vehiclePlate: { fontSize: 12, marginTop: 2 },
  vehicleSeats: { fontSize: 11, marginTop: 2 },
  tripCodeCard: { width: '100%', borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 2, alignItems: 'center' },
  tripCodeLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  tripCodeValue: { fontSize: 52, fontWeight: '900', letterSpacing: 12, marginBottom: 8 },
  tripCodeNote: { fontSize: 11, textAlign: 'center' },
  summaryCard: { width: '100%', borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  summaryDivider: { height: 1, marginVertical: 10, marginLeft: 11 },
  dotGreen: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#10B981' },
  dotBlue: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#0EA5E9' },
  summaryTxt: { fontSize: 14, fontWeight: '600' },
  driverArrivedBtn: { width: '100%', borderRadius: 14, padding: 16, alignItems: 'center', marginBottom: 12 },
  driverArrivedTxt: { color: '#fff', fontSize: 15, fontWeight: '700' },
  cancelBtn: { width: '100%', padding: 16, borderRadius: 14, borderWidth: 1, alignItems: 'center' },
  cancelTxt: { fontSize: 15, fontWeight: '700' },
  successCircle: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 20, overflow: 'hidden' },
  successIcon: { fontSize: 40, color: '#fff' },
  verifyCodeCard: { width: '100%', borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 2, alignItems: 'center' },
  verifyCodeLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  verifyCodeValue: { fontSize: 48, fontWeight: '900', letterSpacing: 8, marginBottom: 8 },
  verifyCodeNote: { fontSize: 11, textAlign: 'center' },
  waitingCard: { width: '100%', borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 2, alignItems: 'center', backgroundColor: 'transparent' },
  waitingIcon: { fontSize: 32, marginBottom: 12 },
  waitingTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  waitingSub: { fontSize: 12, textAlign: 'center' },
  taglineCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 12, borderWidth: 1, gap: 8, marginTop: 8, marginBottom: 16 },
  taglineText: { fontSize: 10, fontWeight: '600' },
});