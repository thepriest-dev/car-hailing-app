import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState, useRef } from 'react';
import {
    Animated,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    Alert,
    Easing
} from 'react-native';
import MapPlaceholder from './MapPlaceholder';
import { useTheme } from '../contexts/ThemeContext';
import { auth, db } from '../config/firebase';
import { ref, set, update, onValue, get } from 'firebase/database';
import Logo from '../components/Logo';
import { LinearGradient } from 'expo-linear-gradient';

export default function FindingDriverScreen() {
  const { colors } = useTheme();
  const params = useLocalSearchParams();
  const tripCode = params.tripCode ? params.tripCode.toString() : Math.floor(1000 + Math.random() * 9000).toString();
  const passedRideId = params.rideId ? params.rideId.toString() : null;
  const pulse = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const [isCancelling, setIsCancelling] = useState(false);
  const [checkingCount, setCheckingCount] = useState(0);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [currentRideId, setCurrentRideId] = useState<string | null>(passedRideId);
  const [rideCreated, setRideCreated] = useState(!!passedRideId);
  const [searchRadius, setSearchRadius] = useState(3);

  // Start animations
  useEffect(() => {
    // Pulse animation for logo
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.2, duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    ).start();

    // Rotation animation
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 2000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Fade in animation for content
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();

    // Slide up animation
    Animated.spring(slideAnim, {
      toValue: 0,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
    }).start();
  }, []);

  // Update search radius based on waiting time
  useEffect(() => {
    if (checkingCount > 10 && checkingCount < 20) {
      setSearchRadius(5);
    } else if (checkingCount >= 20 && checkingCount < 30) {
      setSearchRadius(8);
    } else if (checkingCount >= 30) {
      setSearchRadius(10);
    }
  }, [checkingCount]);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // Create ride record if not already created, then listen for updates
  useEffect(() => {
    console.log('=== FINDING DRIVER SCREEN LOADED ===');
    console.log('Received params:', params);
    console.log('Passed rideId:', passedRideId);
    
    if (passedRideId) {
      console.log('Using existing ride ID:', passedRideId);
      setCurrentRideId(passedRideId);
      setRideCreated(true);
      subscribeToRideUpdates(passedRideId);
    } else {
      console.log('Creating new ride record...');
      createRideRecord();
    }
  }, []);

  const safeGoBack = () => {
    if (isNavigating) return;
    setIsNavigating(true);
    
    setTimeout(() => {
      try {
        router.replace({ pathname: '/home', params: { role: 'passenger' } });
      } catch (error) {
        console.log('Navigation error:', error);
      }
    }, 100);
  };

  const createRideRecord = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        console.log('No user logged in');
        Alert.alert('Error', 'Please login to book a ride');
        safeGoBack();
        return;
      }

      const pickup = params.pickup?.toString() || 'Current Location';
      const destination = params.destination?.toString() || 'Victoria Island, Lagos';
      const rideType = params.rideType?.toString() || 'standard';
      const fare = parseFloat(params.fare?.toString() || '0');
      const newTripCode = params.tripCode?.toString() || tripCode;

      const newRideId = `${currentUser.uid}_${Date.now()}`;
      console.log('Generated new ride ID:', newRideId);
      setCurrentRideId(newRideId);
      const rideRef = ref(db, `rides/${newRideId}`);
      
      const rideData = {
        riderId: currentUser.uid,
        riderName: currentUser.displayName || 'User',
        pickupLocation: pickup,
        dropoffLocation: destination,
        status: 'searching',
        fare: fare,
        rideType: rideType,
        tripCode: newTripCode,
        createdAt: new Date().toISOString(),
      };
      
      console.log('Saving ride data:', rideData);
      await set(rideRef, rideData);
      console.log('Ride saved successfully to VeloCity!');
      setRideCreated(true);
      
      subscribeToRideUpdates(newRideId);
      
    } catch (error) {
      console.log('Error creating ride:', error);
      Alert.alert('Error', 'Failed to create ride request. Please try again.');
      safeGoBack();
    }
  };

  const subscribeToRideUpdates = (rideIdToListen: string) => {
    if (isSubscribed) return;
    
    console.log('Setting up real-time listener for ride:', rideIdToListen);
    const rideRef = ref(db, `rides/${rideIdToListen}`);
    
    const unsubscribe = onValue(rideRef, (snapshot) => {
      const ride = snapshot.val();
      console.log('Ride update received:', ride);
      setCheckingCount(prev => prev + 1);
      
      if (ride && !isNavigating) {
        if (ride.status === 'accepted' && ride.driverId) {
          console.log('Driver found! Redirecting to passenger waiting screen...');
          console.log('Driver name:', ride.driverName);
          setIsNavigating(true);
          
          setTimeout(() => {
            try {
              router.replace({
                pathname: '/passenger-waiting',
                params: { 
                  pickup: params.pickup,
                  destination: params.destination,
                  rideType: params.rideType,
                  fare: params.fare,
                  tripCode: ride.tripCode || tripCode,
                  rideId: rideIdToListen,
                  driverName: ride.driverName || 'Your driver',
                  driverPhone: ride.driverPhone || '',
                  driverRating: ride.driverRating?.toString() || '4.5'
                }
              });
            } catch (error) {
              console.log('Navigation error:', error);
            }
          }, 500);
        }
        
        if (ride.status === 'cancelled') {
          console.log('Ride was cancelled');
          Alert.alert(
            'Ride Cancelled',
            'Your VeloCity ride request was cancelled.',
            [{ text: 'OK', onPress: () => safeGoBack() }]
          );
        }
      } else if (!ride) {
        console.log('Waiting for ride to be created...');
      }
    }, (error) => {
      console.log('Error listening to ride:', error);
    });

    setIsSubscribed(true);
    
    return () => {
      console.log('Cleaning up ride listener');
      unsubscribe();
    };
  };

  const cancelRide = async () => {
    console.log('Cancel button pressed');
    console.log('Current ride ID:', currentRideId);
    console.log('Ride created:', rideCreated);
    
    if (isCancelling || isNavigating) {
      console.log('Already cancelling or navigating');
      return;
    }
    
    if (!currentRideId) {
      console.log('No ride ID to cancel');
      safeGoBack();
      return;
    }
    
    if (!rideCreated) {
      console.log('Ride not created yet');
      Alert.alert('Please wait', 'Your VeloCity ride request is still being created. Please try again in a moment.');
      return;
    }
    
    Alert.alert(
      'Cancel Request',
      'Are you sure you want to cancel your VeloCity ride request?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            console.log('User confirmed cancellation');
            setIsCancelling(true);
            
            try {
              const rideRef = ref(db, `rides/${currentRideId}`);
              const snapshot = await get(rideRef);
              
              if (snapshot.exists()) {
                console.log('Ride found, updating status to cancelled');
                await update(rideRef, { 
                  status: 'cancelled',
                  cancelledAt: new Date().toISOString()
                });
                console.log('Ride cancelled successfully');
              } else {
                console.log('Ride not found');
              }
            } catch (error) {
              console.log('Error cancelling ride:', error);
              Alert.alert('Error', 'Failed to cancel ride. Please try again.');
            }
            
            setTimeout(() => {
              safeGoBack();
            }, 500);
          }
        }
      ]
    );
  };

  // Get animated status text
  const getStatusText = () => {
    if (!rideCreated) return 'Creating your ride...';
    if (checkingCount < 10) return 'Searching for nearby drivers...';
    if (checkingCount < 20) return `Expanding search to ${searchRadius}km radius...`;
    if (checkingCount < 30) return `Searching within ${searchRadius}km for available drivers...`;
    if (checkingCount < 40) return 'Still looking... Drivers are busy in your area';
    return 'Taking longer than usual. Please wait...';
  };

  // Animated Dot Component
  const AnimatedDot = ({ index }: { index: number }) => {
    const activeCount = Math.min(3 + Math.floor(checkingCount / 5), 5);
    const isActive = index < activeCount;
    const dotScale = useRef(new Animated.Value(1)).current;

    useEffect(() => {
      if (isActive) {
        Animated.loop(
          Animated.sequence([
            Animated.timing(dotScale, {
              toValue: 1.3,
              duration: 500,
              useNativeDriver: true,
            }),
            Animated.timing(dotScale, {
              toValue: 1,
              duration: 500,
              useNativeDriver: true,
            }),
          ])
        ).start();
      } else {
        dotScale.setValue(1);
      }
    }, [isActive]);

    return (
      <Animated.View
        style={[
          styles.dot,
          {
            transform: [{ scale: dotScale }],
            backgroundColor: isActive ? colors.primary : colors.border,
          },
        ]}
      />
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <MapPlaceholder />

      <Animated.View 
        style={[
          styles.sheet, 
          { 
            backgroundColor: colors.background, 
            borderTopColor: colors.border,
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        {/* Animated Logo Container */}
        <Animated.View style={[
          styles.pulseCircle, 
          { 
            transform: [{ scale: pulse }],
            backgroundColor: colors.surfaceLight,
            borderColor: colors.primary
          }
        ]}>
          <Animated.View style={{ transform: [{ rotate: spin }] }}>
            <LinearGradient
              colors={['#0EA5E9', '#3B82F6', '#6366F1']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.gradientLogo}
            >
              <View style={styles.innerLogo}>
                <Text style={styles.logoText}>V</Text>
              </View>
            </LinearGradient>
          </Animated.View>
        </Animated.View>

        <Text style={[styles.title, { color: colors.text }]}>Finding your driver...</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {getStatusText()}
        </Text>

        {/* Animated Progress Dots */}
        <View style={styles.dotsRow}>
          {[0, 1, 2, 3, 4].map(i => (
            <AnimatedDot key={i} index={i} />
          ))}
        </View>

        {/* Animated Search Radius Indicator */}
        {searchRadius > 3 && (
          <Animated.View 
            style={[styles.radiusCard, { 
              backgroundColor: colors.surfaceLight, 
              borderColor: colors.warning,
              opacity: fadeAnim,
            }]}
          >
            <Text style={styles.radiusIcon}>🌐</Text>
            <Text style={[styles.radiusText, { color: colors.warning }]}>
              Searching within {searchRadius}km radius
            </Text>
          </Animated.View>
        )}

        <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.summaryRow}>
            <View style={styles.dotGreen} />
            <Text style={[styles.summaryTxt, { color: colors.text }]}>
              {params.pickup || 'Current Location'}
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

        <View style={[styles.statusCard, { backgroundColor: colors.surfaceLight, borderColor: colors.border }]}>
          <Text style={[styles.statusText, { color: colors.textSecondary }]}>
            {!rideCreated ? '⏳ Creating your VeloCity ride request...' : 
              checkingCount < 10 
                ? '🔍 Searching for nearby VeloCity drivers...' 
                : checkingCount < 20 
                  ? '⏳ Expanding search radius to find more drivers...'
                  : checkingCount < 30
                    ? '🚗 Found busy area. Increasing search range...'
                    : '🔄 Still searching. Thank you for your patience'}
          </Text>
          <Text style={[styles.statusSubText, { color: colors.textSecondary, marginTop: 8 }]}>
            Trip Code: <Text style={[styles.tripCodeText, { color: colors.primary }]}>{tripCode}</Text>
          </Text>
          <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
            <Animated.View 
              style={[
                styles.progressFill, 
                { 
                  width: `${Math.min((checkingCount / 50) * 100, 100)}%`,
                  backgroundColor: colors.primary 
                }
              ]} 
            />
          </View>
        </View>

        <View style={[styles.taglineCard, { backgroundColor: colors.surfaceLight, borderColor: colors.primary }]}>
          <Logo size="small" showText={false} />
          <Text style={[styles.taglineText, { color: colors.text }]}>Set the Pace. Arrive in Style.</Text>
        </View>

        <TouchableOpacity
          style={[styles.cancelBtn, { borderColor: colors.error }]}
          onPress={cancelRide}
          disabled={isCancelling || isNavigating}
        >
          <Text style={[styles.cancelTxt, { color: colors.error }]}>
            {isCancelling ? 'Cancelling...' : !rideCreated ? 'Creating VeloCity ride...' : 'Cancel Request'}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    padding: 28,
    alignItems: 'center',
  },
  pulseCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  gradientLogo: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerLogo: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#0A1929',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
  },
  title: { fontSize: 22, fontWeight: '800', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 14, textAlign: 'center', marginBottom: 24 },
  dotsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  radiusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 20,
    marginBottom: 16,
    gap: 8,
    borderWidth: 1,
  },
  radiusIcon: { fontSize: 16 },
  radiusText: { fontSize: 12, fontWeight: '600' },
  summaryCard: { width: '100%', borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  summaryDivider: { height: 1, marginVertical: 10, marginLeft: 11 },
  dotGreen: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#10B981' },
  dotBlue: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#0EA5E9' },
  summaryTxt: { fontSize: 13, fontWeight: '600' },
  statusCard: { width: '100%', borderRadius: 12, padding: 12, marginBottom: 16, borderWidth: 1, alignItems: 'center' },
  statusText: { fontSize: 12, textAlign: 'center' },
  statusSubText: { fontSize: 10, textAlign: 'center' },
  tripCodeText: { fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  progressBar: {
    width: '100%',
    height: 4,
    borderRadius: 2,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  taglineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
    marginTop: 8,
    marginBottom: 16,
  },
  taglineText: { fontSize: 10, fontWeight: '600' },
  cancelBtn: { width: '100%', padding: 16, borderRadius: 14, borderWidth: 1, alignItems: 'center' },
  cancelTxt: { fontSize: 15, fontWeight: '700' },
});