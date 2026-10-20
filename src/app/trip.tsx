import React, { useEffect, useRef, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import {
  Animated,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Modal,
  Alert,
  ActivityIndicator
} from 'react-native';
import PassengerTripMap from '../components/PassengerTripMap';
import LocationService from '../services/locationService';
import { useTheme } from '../contexts/ThemeContext';
import SOSButton from '../components/SOSButton';
import ShareTripModal from '../components/ShareTripModal';
import Logo from '../components/Logo';
import { auth, db } from '../config/firebase';
import { ref, update, onValue, get } from 'firebase/database';

export default function TripScreen() {
  const { colors } = useTheme();
  const params = useLocalSearchParams();
  const rideId = params.rideId ? params.rideId.toString() : null;
  const pickup = params.pickup ? params.pickup.toString() : 'Ikeja, Lagos';
  const destination = params.destination ? params.destination.toString() : 'Victoria Island, Lagos';
  const fare = params.fare ? params.fare.toString() : '1950';
  const tripCode = params.tripCode ? params.tripCode.toString() : '----';
  
  const [phase, setPhase] = useState<'active' | 'completed'>('active');
  const [elapsed, setElapsed] = useState(0);
  const [ratingDone, setRatingDone] = useState(false);
  const [showFareModal, setShowFareModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [rideData, setRideData] = useState<any>(null);
  const [driverData, setDriverData] = useState<any>(null);
  const [vehicleInfo, setVehicleInfo] = useState<any>(null);
  const [userLocation, setUserLocation] = useState<{latitude: number, longitude: number} | null>(null);
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (rideId) {
      loadRideDetails();
      subscribeToRideUpdates();
    } else {
      setIsLoading(false);
    }
    getUserLocation();
  }, [rideId]);

  const getUserLocation = async () => {
    const location = await LocationService.getCurrentLocation();
    if (location) {
      setUserLocation({
        latitude: location.latitude,
        longitude: location.longitude,
      });
    }
  };

  const loadRideDetails = async () => {
    if (!rideId) return;
    
    setIsLoading(true);
    const rideRef = ref(db, `rides/${rideId}`);
    
    onValue(rideRef, async (snapshot) => {
      const ride = snapshot.val();
      if (ride) {
        setRideData(ride);
        
        if (ride.driverId) {
          // Fetch full driver details including vehicle info
          const driverRef = ref(db, `users/${ride.driverId}`);
          const driverSnapshot = await get(driverRef);
          if (driverSnapshot.exists()) {
            const driverFullData = driverSnapshot.val();
            setDriverData({
              name: driverFullData.name || ride.driverName,
              phone: driverFullData.phone || ride.driverPhone,
              rating: driverFullData.rating || ride.driverRating || 5.0,
            });
            
            // Set vehicle information
            if (driverFullData.driverInfo) {
              setVehicleInfo({
                vehicleType: driverFullData.driverInfo.vehicleType || 'Car',
                vehiclePlate: driverFullData.driverInfo.vehiclePlate || 'Not available',
                vehicleModel: driverFullData.driverInfo.vehicleModel || '',
                vehicleColor: driverFullData.driverInfo.vehicleColor || '',
                vehicleYear: driverFullData.driverInfo.vehicleYear || '',
                seats: driverFullData.driverInfo.seats || '4',
              });
            }
          } else {
            // Fallback to ride data if driver fetch fails
            setDriverData({
              name: ride.driverName,
              phone: ride.driverPhone,
              rating: ride.driverRating || 5.0,
            });
          }
        }
        setIsLoading(false);
      }
    }, { onlyOnce: true });
  };

  const subscribeToRideUpdates = () => {
    if (!rideId) return;

    const rideRef = ref(db, `rides/${rideId}`);
    
    const unsubscribe = onValue(rideRef, (snapshot) => {
      const ride = snapshot.val();
      if (ride) {
        console.log('Ride update:', ride.status);
        
        if (ride.status === 'completed') {
          setPhase('completed');
        }
      }
    });

    return () => unsubscribe();
  };

  useEffect(() => {
    if (phase !== 'active') return;
    
    const timer = setInterval(() => setElapsed(prev => prev + 1), 1000);
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 20000,
      useNativeDriver: false,
    }).start();
    
    return () => clearInterval(timer);
  }, [phase]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const handleRatingComplete = () => {
    setRatingDone(true);
  };

  const openFareModal = () => setShowFareModal(true);
  const closeFareModal = () => setShowFareModal(false);

  const tripFare = {
    riderTotal: parseInt(fare) || 1950,
    distanceAmount: Math.round((parseInt(fare) || 1950) * 0.69),
    timeAmount: Math.round((parseInt(fare) || 1950) * 0.18),
    bookingFee: 120,
    serviceFee: 126,
    driverEarnings: Math.round((parseInt(fare) || 1950) * 0.85),
    driverCommission: Math.round((parseInt(fare) || 1950) * 0.15),
  };

  // Get vehicle display text
  const getVehicleDisplayText = () => {
    if (!vehicleInfo) return 'Loading vehicle info...';
    
    const parts = [];
    if (vehicleInfo.vehicleType) parts.push(vehicleInfo.vehicleType);
    if (vehicleInfo.vehicleModel) parts.push(vehicleInfo.vehicleModel);
    if (vehicleInfo.vehicleColor) parts.push(vehicleInfo.vehicleColor);
    
    const vehicleText = parts.join(' · ');
    const plateText = vehicleInfo.vehiclePlate;
    
    return `${vehicleText} · ${plateText}`;
  };

  const getVehicleIcon = (vehicleType: string) => {
    switch (vehicleType) {
      case 'Car': return '🚗';
      case 'Motorcycle': return '🏍️';
      case 'Tricycle': return '🛺';
      default: return '🚗';
    }
  };

  const sosTripInfo = {
    driverName: driverData?.name || 'Your driver',
    driverPhone: driverData?.phone || '+2348012345678',
    vehiclePlate: vehicleInfo?.vehiclePlate || 'LAG ABC 123 XY',
    pickupLocation: pickup,
    destinationLocation: destination,
    tripCode: tripCode,
  };

  const shareTripInfo = {
    tripId: rideId || Date.now().toString(),
    driverName: driverData?.name || 'Your driver',
    driverPhoto: '',
    vehicleModel: vehicleInfo?.vehicleModel || 'Toyota Camry',
    vehiclePlate: vehicleInfo?.vehiclePlate || 'LAG ABC 123 XY',
    pickupLocation: pickup,
    destinationLocation: destination,
    pickupTime: new Date(),
    estimatedArrival: new Date(Date.now() + 12 * 60000),
    driverRating: driverData?.rating || 4.8,
    tripCode: tripCode,
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading trip details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const FareBreakdownModal = () => (
    <Modal
      visible={showFareModal}
      animationType="slide"
      transparent={true}
      onRequestClose={closeFareModal}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Fare Breakdown</Text>
            <TouchableOpacity onPress={closeFareModal}>
              <Text style={[styles.modalClose, { color: colors.textSecondary }]}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView>
            <View style={styles.breakdownContainer}>
              <View style={styles.breakdownSection}>
                <Text style={[styles.breakdownSectionTitle, { color: colors.textSecondary }]}>What you pay</Text>
                <View style={styles.breakdownRow}>
                  <Text style={[styles.breakdownLabel, { color: colors.textSecondary }]}>Distance (4.2 km)</Text>
                  <Text style={[styles.breakdownValue, { color: colors.text }]}>₦{tripFare.distanceAmount.toLocaleString()}</Text>
                </View>
                <View style={styles.breakdownRow}>
                  <Text style={[styles.breakdownLabel, { color: colors.textSecondary }]}>Time (12 min)</Text>
                  <Text style={[styles.breakdownValue, { color: colors.text }]}>₦{tripFare.timeAmount.toLocaleString()}</Text>
                </View>
                <View style={styles.breakdownRow}>
                  <Text style={[styles.breakdownLabel, { color: colors.textSecondary }]}>Booking fee</Text>
                  <Text style={[styles.breakdownValue, { color: colors.text }]}>₦{tripFare.bookingFee.toLocaleString()}</Text>
                </View>
                <View style={styles.breakdownRow}>
                  <Text style={[styles.breakdownLabel, { color: colors.textSecondary }]}>Service fee</Text>
                  <Text style={[styles.breakdownValue, { color: colors.text }]}>₦{tripFare.serviceFee.toLocaleString()}</Text>
                </View>
              </View>
              <View style={[styles.breakdownDivider, { backgroundColor: colors.border }]} />
              <View style={styles.breakdownSection}>
                <Text style={[styles.breakdownSectionTitle, { color: colors.textSecondary }]}>Where your money goes</Text>
                <View style={styles.breakdownRow}>
                  <Text style={[styles.breakdownLabel, { color: colors.textSecondary }]}>Driver earns</Text>
                  <Text style={[styles.breakdownValue, { color: colors.success }]}>₦{tripFare.driverEarnings.toLocaleString()} (85%)</Text>
                </View>
                <View style={styles.breakdownRow}>
                  <Text style={[styles.breakdownLabel, { color: colors.textSecondary }]}>VeloCity commission</Text>
                  <Text style={[styles.breakdownValue, { color: colors.text }]}>₦{tripFare.driverCommission.toLocaleString()} (15%)</Text>
                </View>
              </View>
              <View style={[styles.breakdownDivider, { backgroundColor: colors.border }]} />
              <View style={styles.totalRow}>
                <Text style={[styles.totalLabel, { color: colors.text }]}>You pay total</Text>
                <Text style={[styles.totalValue, { color: colors.primary }]}>₦{tripFare.riderTotal.toLocaleString()}</Text>
              </View>
            </View>
          </ScrollView>

          <TouchableOpacity style={[styles.modalButton, { backgroundColor: colors.primary }]} onPress={closeFareModal}>
            <Text style={styles.modalButtonText}>Got it</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  if (phase === 'completed') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView contentContainerStyle={styles.completedWrap}>
          <View style={[styles.successCircle, { backgroundColor: colors.success }]}>
            <Logo size="small" showText={false} />
          </View>
          <Text style={[styles.completedTitle, { color: colors.text }]}>Trip Completed!</Text>
          <Text style={[styles.completedSub, { color: colors.textSecondary }]}>You have arrived at your destination</Text>

          <TouchableOpacity 
            style={[styles.fareCard, { backgroundColor: colors.surface, borderColor: colors.border }]} 
            onPress={openFareModal}
          >
            <Text style={[styles.fareTitle, { color: colors.text }]}>Trip Summary</Text>
            <View style={styles.fareRow}>
              <Text style={[styles.fareLabel, { color: colors.textSecondary }]}>Total Fare</Text>
              <Text style={[styles.fareTotal, { color: colors.primary }]}>₦{tripFare.riderTotal.toLocaleString()}</Text>
            </View>
            <Text style={[styles.breakdownLinkText, { color: colors.primary }]}>Tap for breakdown →</Text>
          </TouchableOpacity>

          <View style={[styles.taglineCard, { backgroundColor: colors.surfaceLight, borderColor: colors.primary }]}>
            <Logo size="small" showText={false} />
            <Text style={[styles.taglineText, { color: colors.text }]}>Set the Pace. Arrive in Style.</Text>
          </View>
          
          <Text style={[styles.rateTitle, { color: colors.text }]}>Rate your driver</Text>
          <RatingStars 
            onRatingComplete={handleRatingComplete} 
            colors={colors} 
            rideId={rideId}
          />

          {ratingDone ? (
            <TouchableOpacity style={[styles.doneBtn, { backgroundColor: colors.primary }]} onPress={() => router.replace({ pathname: '/home', params: { role: 'passenger' } })}>
              <Text style={styles.doneTxt}>Done</Text>
            </TouchableOpacity>
          ) : (
            <View style={[styles.doneBtnLocked, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.doneTxtLocked, { color: colors.textSecondary }]}>⭐ Rate driver to continue</Text>
            </View>
          )}
        </ScrollView>
        <FareBreakdownModal />
        <SOSButton tripInfo={sosTripInfo} />
      </SafeAreaView>
    );
  }

  // ACTIVE TRIP PHASE - Show live driver tracking map
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Live Passenger Trip Map - Shows driver approaching */}
      {rideData?.driverId && (
        <PassengerTripMap
          driverId={rideData.driverId}
          pickupLocation={{
            latitude: rideData?.pickupLat || 6.5244,
            longitude: rideData?.pickupLng || 3.3792,
          }}
          dropoffLocation={{
            latitude: rideData?.dropoffLat || 6.5244,
            longitude: rideData?.dropoffLng || 3.3792,
          }}
          userLocation={userLocation || undefined}
          onDriverNearby={(distance) => {
            // Show alert when driver is very close
            if (distance < 0.1) {
              Alert.alert(
                'Driver is here!',
                'Your driver has arrived. Please meet them at the pickup location.'
              );
            }
          }}
        />
      )}

      <View style={[styles.statusPill, { backgroundColor: colors.surface, borderColor: colors.success }]}>
        <View style={[styles.activeDot, { backgroundColor: colors.success }]} />
        <Text style={[styles.statusTxt, { color: colors.text }]}>Trip in progress</Text>
        <Text style={[styles.timerTxt, { color: colors.success }]}>{formatTime(elapsed)}</Text>
      </View>

      <View style={[styles.bottomSheet, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, { width: progressWidth, backgroundColor: colors.primary }]} />
        </View>
        <View style={styles.progressLabels}>
          <Text style={[styles.progressFrom, { color: colors.textSecondary }]}>📍 {pickup}</Text>
          <Text style={[styles.progressTo, { color: colors.textSecondary }]}>🏁 {destination}</Text>
        </View>

        {/* Driver Row with Vehicle Details */}
        <View style={[styles.driverRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={styles.driverAvatar}>
            {vehicleInfo ? getVehicleIcon(vehicleInfo.vehicleType) : '🧑‍✈️'}
          </Text>
          <View style={styles.driverInfo}>
            <Text style={[styles.driverName, { color: colors.text }]}>{driverData?.name || 'Your Driver'}</Text>
            <Text style={[styles.driverSub, { color: colors.textSecondary }]}>
              {getVehicleDisplayText()}
            </Text>
            {vehicleInfo?.seats && (
              <Text style={[styles.driverSub, { color: colors.textSecondary, marginTop: 2 }]}>
                👥 {vehicleInfo.seats} seats available
              </Text>
            )}
          </View>
          <TouchableOpacity 
            style={[styles.callBtn, { backgroundColor: colors.surfaceLight, borderColor: colors.primary }]}
            onPress={() => Alert.alert('Call Driver', `Calling ${driverData?.name || 'driver'} at ${driverData?.phone || 'number not available'}...`)}
          >
            <Text style={styles.callIcon}>📞</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.statsRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statVal, { color: colors.text }]}>4.2 km</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Distance</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statVal, { color: colors.text }]}>₦{tripFare.riderTotal.toLocaleString()}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Fare</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statVal, { color: colors.text }]}>~12 min</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>ETA</Text>
          </View>
        </View>

        <View style={styles.safetyRow}>
          <TouchableOpacity style={[styles.safetyBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={styles.safetyIcon}>🛡️</Text>
            <Text style={[styles.safetyTxt, { color: colors.textSecondary }]}>Safety</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.safetyBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => setShowShareModal(true)}
          >
            <Text style={styles.safetyIcon}>📤</Text>
            <Text style={[styles.safetyTxt, { color: colors.textSecondary }]}>Share Trip</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.safetyBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={styles.safetyIcon}>⚠️</Text>
            <Text style={[styles.safetyTxt, { color: colors.textSecondary }]}>Report</Text>
          </TouchableOpacity>
        </View>

        <PassengerAudioRecorder colors={colors} />

        <View style={[styles.messageCard, { backgroundColor: colors.surfaceLight, borderColor: colors.primary }]}>
          <Text style={styles.messageIcon}>🚗</Text>
          <Text style={[styles.messageTitle, { color: colors.text }]}>Your driver is taking you to your destination</Text>
          <Text style={[styles.messageSub, { color: colors.textSecondary }]}>
            The trip will end automatically when your driver arrives
          </Text>
        </View>

        <View style={[styles.taglineCard, { backgroundColor: colors.surfaceLight, borderColor: colors.primary }]}>
          <Logo size="small" showText={false} />
          <Text style={[styles.taglineText, { color: colors.text }]}>Set the Pace. Arrive in Style.</Text>
        </View>

        <TouchableOpacity style={styles.breakdownLink} onPress={openFareModal}>
          <Text style={[styles.breakdownLinkText, { color: colors.primary }]}>View fare breakdown →</Text>
        </TouchableOpacity>
      </View>

      <FareBreakdownModal />
      <SOSButton tripInfo={sosTripInfo} />
      <ShareTripModal
        visible={showShareModal}
        onClose={() => setShowShareModal(false)}
        tripInfo={shareTripInfo}
      />
    </SafeAreaView>
  );
}

// Passenger Audio Recorder Component
const PassengerAudioRecorder = React.memo(({ colors }: { colors: any }) => {
  const [recording, setRecording] = useState<'idle' | 'recording' | 'saved'>('idle');
  const [seconds, setSeconds] = useState(0);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseRef = useRef<Animated.CompositeAnimation | null>(null);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  };

  const startRecording = () => {
    setRecording('recording');
    setSeconds(0);
    pulseRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.3, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    );
    pulseRef.current.start();
    timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
  };

  const stopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (pulseRef.current) pulseRef.current.stop();
    pulseAnim.setValue(1);
    setRecording('saved');
  };

  if (recording === 'saved') {
    return (
      <View style={[styles.savedBox, { backgroundColor: colors.surfaceLight, borderColor: colors.success }]}>
        <Text style={styles.savedIcon}>🔒</Text>
        <View style={styles.savedInfo}>
          <Text style={[styles.savedTitle, { color: colors.success }]}>Audio Saved</Text>
          <Text style={[styles.savedSub, { color: colors.text }]}>Stored securely · {formatTime(seconds)} recorded</Text>
          <Text style={[styles.savedNote, { color: colors.textSecondary }]}>
            Only accessible by VeloCity Safety Team if a report is filed
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.recorderBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.recorderLeft}>
        <Animated.View style={[
          styles.micRing,
          { borderColor: colors.border },
          recording === 'recording' && { transform: [{ scale: pulseAnim }], borderColor: colors.error },
        ]}>
          <TouchableOpacity
            style={[styles.micBtn, { backgroundColor: colors.surfaceLight }, recording === 'recording' && { backgroundColor: colors.error }]}
            onPress={recording === 'idle' ? startRecording : stopRecording}
          >
            <Text style={styles.micIcon}>🎙️</Text>
          </TouchableOpacity>
        </Animated.View>
        <View style={styles.recInfo}>
          {recording === 'idle' ? (
            <>
              <Text style={[styles.recTitle, { color: colors.text }]}>Safety Recording</Text>
              <Text style={[styles.recSub, { color: colors.textSecondary }]}>Tap mic to record audio for safety</Text>
            </>
          ) : (
            <>
              <Text style={[styles.recTitle, { color: colors.error }]}>
                Recording... {formatTime(seconds)}
              </Text>
              <Text style={[styles.recSub, { color: colors.textSecondary }]}>Tap mic to stop & save</Text>
            </>
          )}
        </View>
      </View>
      {recording === 'recording' && (
        <View style={styles.waveBox}>
          {[10, 18, 12, 20, 14].map((h, i) => (
            <Animated.View key={i} style={[styles.waveBar, {
              height: h,
              opacity: pulseAnim.interpolate({ inputRange: [1, 1.3], outputRange: [0.4, 1] }),
              backgroundColor: colors.error,
            }]} />
          ))}
        </View>
      )}
    </View>
  );
});

// Rating Stars Component
const RatingStars = React.memo(({ onRatingComplete, colors, rideId }: { onRatingComplete: () => void; colors: any; rideId: string | null }) => {
  const [rating, setRating] = useState(0);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const quickTags: Record<number, string[]> = {
    1: ['Very rude', 'Wrong route', 'Dirty car', 'Drove dangerously', 'Late arrival'],
    2: ['Unprofessional', 'Poor driving', 'Uncomfortable car'],
    3: ['Okay trip', 'Could be better', 'Average experience'],
    4: ['Good driver', 'Clean car', 'Friendly', 'On time'],
    5: ['Excellent!', 'Very professional', 'Super clean', 'Great conversation', 'Safe driver'],
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async () => {
    if (rating > 0 && rideId) {
      try {
        const rideRef = ref(db, `rides/${rideId}`);
        await update(rideRef, { 
          passengerRating: rating,
          passengerFeedback: comment,
          passengerTags: selectedTags
        });
        
        Alert.alert('Rating Submitted', `You rated your driver ${rating} stars. Thank you for your feedback!`);
      } catch (error) {
        console.log('Error saving rating:', error);
      }
    }
    setSubmitted(true);
    onRatingComplete();
  };

  if (submitted) {
    return (
      <View style={styles.submittedBox}>
        <Text style={styles.submittedIcon}>🙏</Text>
        <Text style={[styles.submittedTxt, { color: colors.success }]}>Thanks for your feedback!</Text>
      </View>
    );
  }

  return (
    <View style={styles.ratingContainer}>
      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map(star => (
          <TouchableOpacity key={star} onPress={() => setRating(star)}>
            <Text style={[styles.star, { color: star <= rating ? '#F59E0B' : colors.textSecondary }]}>★</Text>
          </TouchableOpacity>
        ))}
      </View>

      {rating > 0 && (
        <>
          <Text style={[styles.feedbackLabel, { color: colors.textSecondary }]}>
            {rating <= 2 ? 'What went wrong?' : rating === 3 ? 'Tell us more' : 'What did you love?'}
          </Text>

          <View style={styles.tagsRow}>
            {quickTags[rating].map(tag => (
              <TouchableOpacity
                key={tag}
                style={[styles.tag, { backgroundColor: colors.surface, borderColor: colors.border }, selectedTags.includes(tag) && { borderColor: colors.primary }]}
                onPress={() => toggleTag(tag)}
              >
                <Text style={[styles.tagTxt, selectedTags.includes(tag) && { color: colors.primary }, !selectedTags.includes(tag) && { color: colors.textSecondary }]}>
                  {tag}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TextInput
            style={[styles.commentBox, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
            placeholder="Add a comment (optional)..."
            placeholderTextColor={colors.textSecondary}
            multiline
            numberOfLines={3}
            value={comment}
            onChangeText={setComment}
          />

          <TouchableOpacity style={[styles.submitBtn, { backgroundColor: colors.primary }]} onPress={handleSubmit}>
            <Text style={styles.submitTxt}>Submit Rating</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14 },
  statusPill: { position: 'absolute', top: 56, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  activeDot: { width: 8, height: 8, borderRadius: 4 },
  statusTxt: { fontSize: 13, fontWeight: '600' },
  timerTxt: { fontSize: 13, fontWeight: '800' },
  bottomSheet: { position: 'absolute', bottom: 0, left: 0, right: 0, borderTopLeftRadius: 28, borderTopRightRadius: 28, borderTopWidth: 1, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 24 },
  progressTrack: { height: 6, backgroundColor: '#162236', borderRadius: 3, marginBottom: 6, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3 },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  progressFrom: { fontSize: 11 },
  progressTo: { fontSize: 11 },
  driverRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, gap: 12 },
  driverAvatar: { fontSize: 32 },
  driverInfo: { flex: 1 },
  driverName: { fontSize: 15, fontWeight: '700' },
  driverSub: { fontSize: 11 },
  callBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  callIcon: { fontSize: 18 },
  statsRow: { flexDirection: 'row', borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1 },
  statItem: { flex: 1, alignItems: 'center' },
  statVal: { fontSize: 14, fontWeight: '700' },
  statLabel: { fontSize: 10, marginTop: 2 },
  statDivider: { width: 1 },
  safetyRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  safetyBtn: { flex: 1, borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1 },
  safetyIcon: { fontSize: 20, marginBottom: 4 },
  safetyTxt: { fontSize: 11, fontWeight: '600' },
  messageCard: { borderRadius: 14, padding: 20, alignItems: 'center', marginBottom: 16, borderWidth: 1 },
  messageIcon: { fontSize: 32, marginBottom: 12 },
  messageTitle: { fontSize: 15, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  messageSub: { fontSize: 12, textAlign: 'center' },
  breakdownLink: { alignItems: 'center', paddingVertical: 8 },
  breakdownLinkText: { fontSize: 12, fontWeight: '600' },
  completedWrap: { alignItems: 'center', paddingHorizontal: 24, paddingTop: 60 },
  successCircle: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 20, overflow: 'hidden' },
  successIcon: { color: '#fff', fontSize: 36, fontWeight: '900' },
  completedTitle: { fontSize: 26, fontWeight: '900', marginBottom: 8 },
  completedSub: { fontSize: 14, marginBottom: 24 },
  fareCard: { width: '100%', borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1 },
  fareTitle: { fontSize: 15, fontWeight: '700', marginBottom: 12 },
  fareRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  fareLabel: { fontSize: 13 },
  fareTotal: { fontSize: 18, fontWeight: '900' },
  rateTitle: { fontSize: 15, fontWeight: '700', marginBottom: 12 },
  ratingContainer: { width: '100%', alignItems: 'center', marginBottom: 16 },
  starsRow: { flexDirection: 'row', justifyContent: 'center', gap: 20, marginBottom: 20, marginTop: 8 },
  star: { fontSize: 44, fontWeight: '700' },
  feedbackLabel: { fontSize: 13, marginBottom: 10, marginTop: 4 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 16 },
  tag: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  tagTxt: { fontSize: 12, fontWeight: '600' },
  commentBox: { width: '100%', borderRadius: 12, borderWidth: 1, padding: 12, fontSize: 13, marginBottom: 16, textAlignVertical: 'top' },
  submitBtn: { width: '100%', borderRadius: 14, padding: 14, alignItems: 'center' },
  submitTxt: { color: '#fff', fontSize: 14, fontWeight: '700' },
  submittedBox: { alignItems: 'center', paddingVertical: 16 },
  submittedIcon: { fontSize: 40, marginBottom: 8 },
  submittedTxt: { fontSize: 16, fontWeight: '700' },
  doneBtn: { width: '100%', borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 8 },
  doneTxt: { color: '#fff', fontSize: 15, fontWeight: '700' },
  doneBtnLocked: { width: '100%', borderRadius: 14, padding: 16, alignItems: 'center', borderWidth: 1, marginTop: 8 },
  doneTxtLocked: { fontSize: 14, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, maxHeight: '85%', borderWidth: 1 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingBottom: 12, borderBottomWidth: 1 },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  modalClose: { fontSize: 20, fontWeight: '600' },
  breakdownContainer: { gap: 16 },
  breakdownSection: { gap: 8 },
  breakdownSectionTitle: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  breakdownLabel: { fontSize: 13 },
  breakdownValue: { fontSize: 13, fontWeight: '500' },
  breakdownDivider: { height: 1, marginVertical: 8 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, paddingBottom: 16 },
  totalLabel: { fontSize: 16, fontWeight: '700' },
  totalValue: { fontSize: 22, fontWeight: '800' },
  modalButton: { borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 20 },
  modalButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  taglineCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 12, borderWidth: 1, gap: 8, marginTop: 8, marginBottom: 16 },
  taglineText: { fontSize: 10, fontWeight: '600' },
  recorderBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1 },
  recorderLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  micRing: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  micBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  micIcon: { fontSize: 20 },
  recInfo: { flex: 1 },
  recTitle: { fontSize: 13, fontWeight: '700' },
  recSub: { fontSize: 11, marginTop: 2 },
  waveBox: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  waveBar: { width: 3, borderRadius: 2 },
  savedBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1 },
  savedIcon: { fontSize: 24 },
  savedInfo: { flex: 1 },
  savedTitle: { fontSize: 13, fontWeight: '700' },
  savedSub: { fontSize: 12, marginTop: 2 },
  savedNote: { fontSize: 11, marginTop: 4, lineHeight: 16 },
});