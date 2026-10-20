import { router, useLocalSearchParams } from 'expo-router';
import { useState, useEffect, useRef } from 'react';
import DriverLocationTracker from '../components/DriverLocationTracker';
import LiveMap from '../components/LiveMap';
import LocationService from '../services/locationService';
import {
  Animated,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
  ActivityIndicator
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { auth, db } from '../config/firebase';
import { ref, update, onValue, get } from 'firebase/database';
import Logo from '../components/Logo';

export default function DriverTripScreen() {
  const { colors } = useTheme();
  const params = useLocalSearchParams();
  const [phase, setPhase] = useState<'accepted' | 'picking' | 'active' | 'completed'>('accepted');
  const [elapsed, setElapsed] = useState(0);
  const [ratingDone, setRatingDone] = useState(false);
  const [rideId, setRideId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [rideData, setRideData] = useState<any>(null);
  const [passengerData, setPassengerData] = useState<any>(null);
  const [passengerRatingOfDriver, setPassengerRatingOfDriver] = useState<number | null>(null);
  const [passengerFeedbackOfDriver, setPassengerFeedbackOfDriver] = useState<string>('');
  const [driverCurrentLocation, setDriverCurrentLocation] = useState<{latitude: number, longitude: number} | null>(null);
  const progressAnim = useRef(new Animated.Value(0)).current;
  
  const tripCode = params.tripCode ? params.tripCode.toString() : '----';
  const pickup = params.pickup ? params.pickup.toString() : 'Ikeja, Lagos';
  const destination = params.destination ? params.destination.toString() : 'Victoria Island, Lagos';
  const fare = params.fare ? params.fare.toString() : '2400';
  const numberOfStops = params.numberOfStops ? parseInt(params.numberOfStops.toString()) : 0;

  useEffect(() => {
    loadRideDetails();
  }, []);

  useEffect(() => {
    if (!rideId) return;
    
    const rideRef = ref(db, `rides/${rideId}`);
    const unsubscribe = onValue(rideRef, (snapshot) => {
      const ride = snapshot.val();
      if (ride && ride.passengerRating && !passengerRatingOfDriver) {
        console.log('Real-time: Passenger rating received!', ride.passengerRating);
        setPassengerRatingOfDriver(ride.passengerRating);
        setPassengerFeedbackOfDriver(ride.passengerFeedback || '');
      }
    });
    
    return () => unsubscribe();
  }, [rideId]);

  // Get driver's current location for map
  useEffect(() => {
    const getDriverLocation = async () => {
      const location = await LocationService.getCurrentLocation();
      if (location) {
        setDriverCurrentLocation({
          latitude: location.latitude,
          longitude: location.longitude,
        });
      }
    };
    
    if (phase === 'accepted' || phase === 'active') {
      getDriverLocation();
      const interval = setInterval(getDriverLocation, 5000);
      return () => clearInterval(interval);
    }
  }, [phase]);

  const loadRideDetails = () => {
    setIsLoading(true);
    
    const currentUser = auth.currentUser;
    if (!currentUser) {
      setIsLoading(false);
      return;
    }
    
    const rideIdFromParams = params.rideId ? params.rideId.toString() : null;
    
    if (rideIdFromParams) {
      setRideId(rideIdFromParams);
      const rideRef = ref(db, `rides/${rideIdFromParams}`);
      onValue(rideRef, (snapshot) => {
        const ride = snapshot.val();
        if (ride) {
          console.log('Ride data loaded:', ride);
          setRideData(ride);
          setPassengerData({
            name: ride.riderName || 'Ada Okonkwo',
            rating: ride.passengerRating || 4.6,
            trips: 48,
            phone: ride.riderPhone || '+2348012345678'
          });
          
          if (ride.passengerRating) {
            console.log('Passenger rating found:', ride.passengerRating);
            setPassengerRatingOfDriver(ride.passengerRating);
            setPassengerFeedbackOfDriver(ride.passengerFeedback || '');
          } else {
            console.log('No passenger rating found yet');
          }
        }
        setIsLoading(false);
      }, { onlyOnce: true });
    } else {
      setPassengerData({
        name: 'Ada Okonkwo',
        rating: 4.6,
        trips: 48,
        phone: '+2348012345678'
      });
      
      setRideData({
        pickupLocation: pickup,
        dropoffLocation: destination,
        fare: fare,
        rideType: 'standard',
        numberOfStops: numberOfStops,
        stops: [],
        pickupLat: 6.5244,
        pickupLng: 3.3792,
        dropoffLat: 6.5244,
        dropoffLng: 3.3792,
      });
      
      setIsLoading(false);
    }
  };

  const updateRideStatus = async (newStatus: string) => {
    if (!rideId) return;

    try {
      const rideRef = ref(db, `rides/${rideId}`);
      await update(rideRef, { 
        status: newStatus,
        ...(newStatus === 'completed' && { completedAt: new Date().toISOString() })
      });
      console.log('Ride status updated to:', newStatus);
    } catch (error) {
      console.log('Error updating ride:', error);
    }
  };

  useEffect(() => {
    if (phase !== 'active') return;
    const timer = setInterval(() => setElapsed(prev => prev + 1), 1000);
    Animated.timing(progressAnim, {
      toValue: 1, duration: 20000, useNativeDriver: false,
    }).start();
    return () => clearInterval(timer);
  }, [phase]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1], outputRange: ['0%', '100%'],
  });

  const handlePhaseChange = async (newPhase: 'accepted' | 'picking' | 'active' | 'completed') => {
    if (newPhase === 'picking') {
      await updateRideStatus('arrived');
    } else if (newPhase === 'active') {
      await updateRideStatus('started');
    } else if (newPhase === 'completed') {
      await updateRideStatus('completed');
    }
    setPhase(newPhase);
  };

  const handleCancelRide = async () => {
    Alert.alert(
      'Cancel Ride',
      'Are you sure you want to cancel this VeloCity ride?',
      [
        { text: 'No', style: 'cancel' },
        { 
          text: 'Yes, Cancel', 
          style: 'destructive',
          onPress: async () => {
            if (rideId) {
              const rideRef = ref(db, `rides/${rideId}`);
              await update(rideRef, { status: 'cancelled' });
            }
            router.replace({ pathname: '/home', params: { role: 'driver' } });
          }
        }
      ]
    );
  };

  const handleRatingComplete = () => {
    setRatingDone(true);
  };

  // Render intermediate stops if any
  const renderIntermediateStops = () => {
    const stops = rideData?.stops || [];
    if (stops.length === 0) return null;

    return (
      <View style={[styles.stopsContainer, { borderTopColor: colors.border, marginTop: 8, paddingTop: 8 }]}>
        <Text style={[styles.stopsTitle, { color: colors.textSecondary }]}>📍 Intermediate Stops:</Text>
        {stops.map((stop: any, index: number) => (
          <View key={index} style={styles.stopItem}>
            <View style={[styles.stopDotOrange, { backgroundColor: colors.warning }]} />
            <Text style={[styles.stopAddress, { color: colors.text }]}>
              Stop {stop.order || index + 1}: {stop.address}
            </Text>
          </View>
        ))}
      </View>
    );
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

  // PHASE 1: ACCEPTED - HEADING TO PASSENGER
  if (phase === 'accepted') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Live Map - Driver heading to pickup */}
        <View style={{ height: 300 }}>
          <LiveMap
            userLocation={driverCurrentLocation}
            pickupLocation={rideData?.pickupLat && rideData?.pickupLng ? {
              latitude: rideData.pickupLat,
              longitude: rideData.pickupLng
            } : null}
            showUserMarker={true}
            showPickupMarker={true}
            showDriverMarker={false}
            interactive={false}
            height={300}
          />
        </View>
        
        {/* Driver Location Tracker - Shows GPS status */}
        <DriverLocationTracker
          rideId={rideId || ''}
          onTrackingStarted={() => console.log('Tracking started')}
          onTrackingStopped={() => console.log('Tracking stopped')}
          onError={(error) => console.error('Tracking error:', error)}
        />
        
        <View style={[styles.statusPill, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.dot, { backgroundColor: '#F59E0B' }]} />
          <Text style={[styles.statusTxt, { color: colors.text }]}>Heading to passenger</Text>
        </View>
        
        <View style={[styles.bottomSheet, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
          <View style={[styles.passengerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={styles.passengerAvatar}>🧑</Text>
            <View style={styles.passengerInfo}>
              <Text style={[styles.passengerName, { color: colors.text }]}>{passengerData?.name || 'Ada Okonkwo'}</Text>
              <View style={styles.ratingRow}>
                <Text style={styles.ratingStar}>⭐</Text>
                <Text style={[styles.ratingVal, { color: colors.warning }]}>{passengerData?.rating || 4.6}</Text>
                <Text style={[styles.ratingCount, { color: colors.textSecondary }]}>({passengerData?.trips || 48} trips)</Text>
              </View>
            </View>
            <TouchableOpacity style={[styles.callBtn, { backgroundColor: colors.surfaceLight, borderColor: colors.primary }]}>
              <Text style={styles.callIcon}>📞</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.routeCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.routeRow}>
              <View style={styles.dotGreen} />
              <View>
                <Text style={[styles.routeLabel, { color: colors.textSecondary }]}>Pickup</Text>
                <Text style={[styles.routeTxt, { color: colors.text }]}>{rideData?.pickupLocation || pickup}</Text>
              </View>
            </View>
            {renderIntermediateStops()}
            <View style={[styles.routeDivider, { backgroundColor: colors.border }]} />
            <View style={styles.routeRow}>
              <View style={styles.dotBlue} />
              <View>
                <Text style={[styles.routeLabel, { color: colors.textSecondary }]}>Destination</Text>
                <Text style={[styles.routeTxt, { color: colors.text }]}>{rideData?.dropoffLocation || destination}</Text>
              </View>
            </View>
          </View>

          {/* Stop Count Indicator */}
          {(rideData?.numberOfStops > 0 || numberOfStops > 0) && (
            <View style={[styles.stopInfoCard, { backgroundColor: colors.warning + '10', borderColor: colors.warning, marginBottom: 12 }]}>
              <Text style={styles.stopInfoIcon}>🚏</Text>
              <Text style={[styles.stopInfoText, { color: colors.warning }]}>
                {rideData?.numberOfStops || numberOfStops} intermediate stop{(rideData?.numberOfStops || numberOfStops) !== 1 ? 's' : ''} on this route
              </Text>
            </View>
          )}

          <View style={[styles.tripMeta, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.metaItem}>
              <Text style={[styles.metaVal, { color: colors.text }]}>
                {rideData?.distanceKm || 4.2} km
              </Text>
              <Text style={[styles.metaLabel, { color: colors.textSecondary }]}>Distance</Text>
            </View>
            <View style={[styles.metaDivider, { backgroundColor: colors.border }]} />
            <View style={styles.metaItem}>
              <Text style={[styles.metaVal, { color: colors.text }]}>₦{fare}</Text>
              <Text style={[styles.metaLabel, { color: colors.textSecondary }]}>Earnings</Text>
            </View>
            <View style={[styles.metaDivider, { backgroundColor: colors.border }]} />
            <View style={styles.metaItem}>
              <Text style={[styles.metaVal, { color: colors.text }]}>~8 min</Text>
              <Text style={[styles.metaLabel, { color: colors.textSecondary }]}>To Pickup</Text>
            </View>
          </View>

          <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: colors.primary }]} onPress={() => handlePhaseChange('picking')}>
            <Text style={styles.primaryBtnTxt}>▶ I've Arrived at Pickup</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.error }]} onPress={handleCancelRide}>
            <Text style={[styles.cancelTxt, { color: colors.error }]}>Cancel Ride</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // PHASE 2: PICKING - SHOW CODE, DRIVER JUST LOOKS AND CONFIRMS
  if (phase === 'picking') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Live Map Showing Pickup Location */}
        <View style={{ height: 250 }}>
          <LiveMap
            userLocation={driverCurrentLocation}
            pickupLocation={rideData?.pickupLat && rideData?.pickupLng ? {
              latitude: rideData.pickupLat,
              longitude: rideData.pickupLng
            } : null}
            showUserMarker={true}
            showPickupMarker={true}
            showDriverMarker={false}
            interactive={false}
            height={250}
          />
        </View>
        
        <View style={[styles.statusPill, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.dot, { backgroundColor: colors.primary }]} />
          <Text style={[styles.statusTxt, { color: colors.text }]}>Verify Passenger</Text>
        </View>
        
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={[styles.bottomSheet, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
            <View style={styles.waitBox}>
              <Text style={styles.waitIcon}>🔐</Text>
              <Text style={[styles.waitTitle, { color: colors.text }]}>Verify Your Passenger</Text>
              <Text style={[styles.waitSub, { color: colors.textSecondary }]}>Ask passenger to show their verification code</Text>
            </View>

            <View style={[styles.passengerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={styles.passengerAvatar}>🧑</Text>
              <View style={styles.passengerInfo}>
                <Text style={[styles.passengerName, { color: colors.text }]}>{passengerData?.name || 'Ada Okonkwo'}</Text>
                <Text style={[styles.verifyHint, { color: colors.warning }]}>Compare codes before starting trip</Text>
              </View>
              <TouchableOpacity style={[styles.callBtn, { backgroundColor: colors.surfaceLight, borderColor: colors.primary }]}>
                <Text style={styles.callIcon}>📞</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.driverCodeCard, { backgroundColor: colors.surfaceLight, borderColor: colors.success }]}>
              <Text style={[styles.driverCodeLabel, { color: colors.success }]}>YOUR CODE (Show to Passenger)</Text>
              <Text style={[styles.driverCodeValue, { color: colors.success }]}>{tripCode}</Text>
            </View>

            <View style={[styles.instructionBox, { backgroundColor: colors.surface, borderColor: colors.warning }]}>
              <Text style={styles.instructionIcon}>👀</Text>
              <View style={styles.instructionContent}>
                <Text style={[styles.instructionTitle, { color: colors.warning }]}>How to verify:</Text>
                <Text style={[styles.instructionText, { color: colors.textSecondary }]}>
                  1. Ask passenger to show their screen{'\n'}
                  2. Compare their code with yours above{'\n'}
                  3. If they match, start the trip
                </Text>
              </View>
            </View>

            {/* Show stops during verification */}
            {renderIntermediateStops()}

            <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: colors.primary }]} onPress={() => handlePhaseChange('active')}>
              <Text style={styles.primaryBtnTxt}>✓ Codes Match • Start Trip</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.error }]} onPress={handleCancelRide}>
              <Text style={[styles.cancelTxt, { color: colors.error }]}>Cancel Ride</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // PHASE 3: ACTIVE - TRIP IN PROGRESS
  if (phase === 'active') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Live Map Showing Route Progress */}
        <View style={{ height: 250 }}>
          <LiveMap
            userLocation={driverCurrentLocation}
            pickupLocation={rideData?.pickupLat && rideData?.pickupLng ? {
              latitude: rideData.pickupLat,
              longitude: rideData.pickupLng
            } : null}
            dropoffLocation={rideData?.dropoffLat && rideData?.dropoffLng ? {
              latitude: rideData.dropoffLat,
              longitude: rideData.dropoffLng
            } : null}
            showUserMarker={true}
            showPickupMarker={true}
            showDropoffMarker={true}
            showRoute={true}
            interactive={false}
            height={250}
          />
        </View>
        
        <View style={[styles.statusPill, { backgroundColor: colors.surface, borderColor: colors.success }]}>
          <View style={[styles.dot, { backgroundColor: colors.success }]} />
          <Text style={[styles.statusTxt, { color: colors.text }]}>Trip in progress</Text>
          <Text style={[styles.timerTxt, { color: colors.success }]}>{formatTime(elapsed)}</Text>
        </View>
        
        <View style={[styles.bottomSheet, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
          <View style={styles.progressTrack}>
            <Animated.View style={[styles.progressFill, { width: progressWidth, backgroundColor: colors.primary }]} />
          </View>
          <View style={styles.progressLabels}>
            <Text style={[styles.progressFrom, { color: colors.textSecondary }]}>📍 {rideData?.pickupLocation || pickup}</Text>
            <Text style={[styles.progressTo, { color: colors.textSecondary }]}>🏁 {rideData?.dropoffLocation || destination}</Text>
          </View>

          {/* Show stops during active trip */}
          {renderIntermediateStops()}

          <View style={[styles.passengerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={styles.passengerAvatar}>🧑</Text>
            <View style={styles.passengerInfo}>
              <Text style={[styles.passengerName, { color: colors.text }]}>{passengerData?.name || 'Ada Okonkwo'}</Text>
              <Text style={[styles.passengerSub, { color: colors.textSecondary }]}>
                {rideData?.rideType || 'Standard'} · 💳 Card
                {rideData?.numberOfStops > 0 && ` · ${rideData.numberOfStops} stop${rideData.numberOfStops !== 1 ? 's' : ''}`}
              </Text>
            </View>
            <TouchableOpacity style={[styles.callBtn, { backgroundColor: colors.surfaceLight, borderColor: colors.primary }]}>
              <Text style={styles.callIcon}>📞</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.tripMeta, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.metaItem}>
              <Text style={[styles.metaVal, { color: colors.text }]}>{rideData?.distanceKm || 4.2} km</Text>
              <Text style={[styles.metaLabel, { color: colors.textSecondary }]}>Distance</Text>
            </View>
            <View style={[styles.metaDivider, { backgroundColor: colors.border }]} />
            <View style={styles.metaItem}>
              <Text style={[styles.metaVal, { color: colors.text }]}>₦{fare}</Text>
              <Text style={[styles.metaLabel, { color: colors.textSecondary }]}>Earnings</Text>
            </View>
            <View style={[styles.metaDivider, { backgroundColor: colors.border }]} />
            <View style={styles.metaItem}>
              <Text style={[styles.metaVal, { color: colors.text }]}>~12 min</Text>
              <Text style={[styles.metaLabel, { color: colors.textSecondary }]}>ETA</Text>
            </View>
          </View>

          <View style={styles.safetyRow}>
            <TouchableOpacity style={[styles.safetyBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={styles.safetyIcon}>🛡️</Text>
              <Text style={[styles.safetyTxt, { color: colors.textSecondary }]}>Emergency</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.safetyBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={styles.safetyIcon}>⚠️</Text>
              <Text style={[styles.safetyTxt, { color: colors.textSecondary }]}>Report</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.safetyBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={styles.safetyIcon}>💬</Text>
              <Text style={[styles.safetyTxt, { color: colors.textSecondary }]}>Message</Text>
            </TouchableOpacity>
          </View>

          <DriverAudioRecorder colors={colors} />

          <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: colors.primary }]} onPress={() => handlePhaseChange('completed')}>
            <Text style={styles.primaryBtnTxt}>▶ Complete Trip</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.error }]} onPress={handleCancelRide}>
            <Text style={[styles.cancelTxt, { color: colors.error }]}>Emergency Cancel</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // PHASE 4: COMPLETED - TRIP COMPLETED
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.completedWrap}>
        <View style={[styles.successCircle, { backgroundColor: colors.success }]}>
          <Logo size="small" showText={false} />
        </View>
        <Text style={[styles.completedTitle, { color: colors.text }]}>Trip Completed!</Text>
        <Text style={[styles.completedSub, { color: colors.textSecondary }]}>Great job!</Text>

        {passengerRatingOfDriver ? (
          <View style={[styles.passengerRatingCard, { backgroundColor: colors.surface, borderColor: colors.warning }]}>
            <Text style={styles.passengerRatingIcon}>⭐</Text>
            <View style={styles.passengerRatingContent}>
              <Text style={[styles.passengerRatingTitle, { color: colors.warning }]}>Passenger rated you</Text>
              <View style={styles.passengerRatingStars}>
                {[1, 2, 3, 4, 5].map(star => (
                  <Text key={star} style={[styles.passengerRatingStar, { color: star <= passengerRatingOfDriver ? '#F59E0B' : colors.textSecondary }]}>★</Text>
                ))}
              </View>
              {passengerFeedbackOfDriver ? (
                <Text style={[styles.passengerRatingFeedback, { color: colors.textSecondary }]}>"{passengerFeedbackOfDriver}"</Text>
              ) : null}
            </View>
          </View>
        ) : (
          <View style={[styles.waitingRatingCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={styles.waitingRatingIcon}>⏳</Text>
            <View style={styles.waitingRatingContent}>
              <Text style={[styles.waitingRatingTitle, { color: colors.textSecondary }]}>Waiting for passenger rating</Text>
              <Text style={[styles.waitingRatingSub, { color: colors.textSecondary }]}>
                Your passenger hasn't rated you yet. You'll see their rating here once they submit it.
              </Text>
            </View>
          </View>
        )}

        <View style={[styles.earningsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.earningsTitle, { color: colors.text }]}>Trip Earnings</Text>
          <View style={styles.fareRow}>
            <Text style={[styles.fareLabel, { color: colors.textSecondary }]}>Route</Text>
            <Text style={[styles.fareVal, { color: colors.text }]}>{rideData?.pickupLocation || pickup} → {rideData?.dropoffLocation || destination}</Text>
          </View>
          {rideData?.stops && rideData.stops.length > 0 && (
            <View style={styles.fareRow}>
              <Text style={[styles.fareLabel, { color: colors.textSecondary }]}>Stops</Text>
              <Text style={[styles.fareVal, { color: colors.warning }]}>{rideData.stops.length} intermediate stop{rideData.stops.length !== 1 ? 's' : ''}</Text>
            </View>
          )}
          <View style={[styles.fareDivider, { backgroundColor: colors.border }]} />
          <View style={styles.fareRow}>
            <Text style={[styles.fareLabel, { color: colors.textSecondary }]}>Distance</Text>
            <Text style={[styles.fareVal, { color: colors.text }]}>{rideData?.distanceKm || 4.2} km</Text>
          </View>
          <View style={[styles.fareDivider, { backgroundColor: colors.border }]} />
          <View style={styles.fareRow}>
            <Text style={[styles.fareLabel, { color: colors.textSecondary }]}>Duration</Text>
            <Text style={[styles.fareVal, { color: colors.text }]}>{formatTime(elapsed)}</Text>
          </View>
          <View style={[styles.fareDivider, { backgroundColor: colors.border }]} />
          <View style={styles.fareRow}>
            <Text style={[styles.fareLabelBig, { color: colors.text }]}>Total Earned</Text>
            <Text style={[styles.fareTotal, { color: colors.success }]}>₦{fare}</Text>
          </View>
        </View>

        <View style={[styles.taglineCard, { backgroundColor: colors.surfaceLight, borderColor: colors.primary }]}>
          <Logo size="small" showText={false} />
          <Text style={[styles.taglineText, { color: colors.text }]}>Set the Pace. Arrive in Style.</Text>
        </View>

        <Text style={[styles.rateTitle, { color: colors.text }]}>Rate your passenger</Text>
        <PassengerRating onSubmitted={handleRatingComplete} colors={colors} rideId={rideId} />

        {ratingDone ? (
          <TouchableOpacity style={[styles.doneBtn, { backgroundColor: colors.primary }]} onPress={() => router.replace({ pathname: '/home', params: { role: 'driver' } })}>
            <Text style={styles.doneTxt}>Back to Dashboard</Text>
          </TouchableOpacity>
        ) : (
          <View style={[styles.doneBtnLocked, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.doneTxtLocked, { color: colors.textSecondary }]}>⭐ Rate passenger to continue</Text>
          </View>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// DRIVER AUDIO RECORDER COMPONENT
function DriverAudioRecorder({ colors }: { colors: any }) {
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
              <Text style={[styles.recSub, { color: colors.textSecondary }]}>Record audio for your protection</Text>
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
}

// PASSENGER RATING COMPONENT
function PassengerRating({ onSubmitted, colors, rideId }: { onSubmitted: () => void; colors: any; rideId: string | null }) {
  const [rating, setRating] = useState(0);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [reportMode, setReportMode] = useState(false);

  const quickTags: Record<number, string[]> = {
    1: ['Very rude', 'Threatening behaviour', 'Left mess in car', 'No-show after wait'],
    2: ['Unprofessional', 'Rude attitude', 'Slammed door'],
    3: ['Okay passenger', 'Could communicate better'],
    4: ['Polite', 'On time', 'Easy to find'],
    5: ['Excellent!', 'Very polite', 'Great tipper', 'Easy pickup'],
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const submitRating = async () => {
    if (rideId) {
      try {
        const rideRef = ref(db, `rides/${rideId}`);
        await update(rideRef, { 
          passengerRatingFromDriver: rating,
          passengerFeedbackFromDriver: comment,
          passengerTagsFromDriver: selectedTags
        });
        Alert.alert('Rating Submitted', `You rated your passenger ${rating} stars. Thank you for your feedback!`);
      } catch (error) {
        console.log('Error saving rating:', error);
      }
    }
    setSubmitted(true);
    onSubmitted();
  };

  if (submitted) {
    return (
      <View style={styles.submittedBox}>
        <Text style={styles.submittedIcon}>🙏</Text>
        <Text style={[styles.submittedTxt, { color: colors.success }]}>
          {reportMode ? 'Report submitted to admin' : 'Thanks for your feedback!'}
        </Text>
        {reportMode && (
          <Text style={[styles.reportConfirm, { color: colors.textSecondary }]}>Admin will review within 24 hours</Text>
        )}
      </View>
    );
  }

  return (
    <View style={styles.feedbackWrap}>
      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map(star => (
          <TouchableOpacity key={star} onPress={() => setRating(star)}>
            <Text style={[styles.star, { opacity: star <= rating ? 1 : 0.3, color: '#F59E0B' }]}>⭐</Text>
          </TouchableOpacity>
        ))}
      </View>

      {rating > 0 && (
        <>
          <Text style={[styles.feedbackLabel, { color: colors.textSecondary }]}>
            {rating <= 2 ? 'What went wrong?' : rating === 3 ? 'Tell us more' : 'What was great?'}
          </Text>

          <View style={styles.tagsRow}>
            {quickTags[rating].map(tag => (
              <TouchableOpacity
                key={tag}
                style={[styles.tag, { backgroundColor: colors.surface, borderColor: colors.border }, selectedTags.includes(tag) && { borderColor: colors.primary, backgroundColor: colors.surfaceLight }]}
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

          {rating <= 2 && (
            <TouchableOpacity
              style={[styles.reportToggle, { backgroundColor: colors.surface, borderColor: colors.border }, reportMode && { borderColor: colors.error, backgroundColor: '#1A0A0A' }]}
              onPress={() => setReportMode(!reportMode)}
            >
              <Text style={styles.reportToggleIcon}>🚨</Text>
              <Text style={[styles.reportToggleTxt, { color: reportMode ? colors.error : colors.textSecondary }]}>
                {reportMode ? 'Report filed — admin will review' : 'Report this passenger to admin'}
              </Text>
            </TouchableOpacity>
          )}

          {reportMode && (
            <View style={[styles.reportBox, { backgroundColor: '#1A0A0A', borderColor: colors.error }]}>
              <Text style={[styles.reportBoxTitle, { color: colors.error }]}>⚠️ Report Details</Text>
              <Text style={[styles.reportBoxSub, { color: colors.textSecondary }]}>
                Your rating, tags, and comment will be sent to admin alongside any report from the passenger. Admin will review both sides fairly.
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: reportMode ? colors.error : colors.primary }]}
            onPress={submitRating}
          >
            <Text style={styles.submitTxt}>
              {reportMode ? '🚨 Submit Rating & Report' : 'Submit Rating'}
            </Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14 },
  scrollContent: { flexGrow: 1 },
  statusPill: { position: 'absolute', top: 56, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  statusTxt: { fontSize: 13, fontWeight: '600' },
  timerTxt: { fontSize: 13, fontWeight: '800' },
  bottomSheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, borderTopWidth: 1, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 24 },
  passengerCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, gap: 12 },
  passengerAvatar: { fontSize: 32 },
  passengerInfo: { flex: 1 },
  passengerName: { fontSize: 15, fontWeight: '700' },
  passengerSub: { fontSize: 12, marginTop: 2 },
  verifyHint: { fontSize: 11, marginTop: 2 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  ratingStar: { fontSize: 12 },
  ratingVal: { fontSize: 13, fontWeight: '700' },
  ratingCount: { fontSize: 11 },
  callBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  callIcon: { fontSize: 18 },
  routeCard: { borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1 },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  routeLabel: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase' },
  routeTxt: { fontSize: 14, fontWeight: '600' },
  routeDivider: { height: 1, marginVertical: 10, marginLeft: 11 },
  dotGreen: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#10B981' },
  dotBlue: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#0EA5E9' },
  tripMeta: { flexDirection: 'row', borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1 },
  metaItem: { flex: 1, alignItems: 'center' },
  metaVal: { fontSize: 14, fontWeight: '700' },
  metaLabel: { fontSize: 10, marginTop: 2 },
  metaDivider: { width: 1 },
  primaryBtn: { borderRadius: 14, padding: 14, alignItems: 'center', marginBottom: 10 },
  primaryBtnTxt: { color: '#fff', fontSize: 14, fontWeight: '700' },
  cancelBtn: { borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1 },
  cancelTxt: { fontSize: 14, fontWeight: '700' },
  waitBox: { alignItems: 'center', marginBottom: 16 },
  waitIcon: { fontSize: 36, marginBottom: 8 },
  waitTitle: { fontSize: 18, fontWeight: '800' },
  waitSub: { fontSize: 13, marginTop: 4 },
  driverCodeCard: { borderRadius: 20, padding: 24, marginBottom: 16, borderWidth: 2, alignItems: 'center' },
  driverCodeLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  driverCodeValue: { fontSize: 56, fontWeight: '900', letterSpacing: 16, marginBottom: 8 },
  instructionBox: { flexDirection: 'row', borderRadius: 12, padding: 14, marginBottom: 16, gap: 12, borderWidth: 1 },
  instructionIcon: { fontSize: 24 },
  instructionContent: { flex: 1 },
  instructionTitle: { fontSize: 13, fontWeight: '700', marginBottom: 4 },
  instructionText: { fontSize: 12, lineHeight: 20 },
  progressTrack: { height: 6, backgroundColor: '#162236', borderRadius: 3, marginBottom: 6, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3 },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  progressFrom: { fontSize: 11 },
  progressTo: { fontSize: 11 },
  safetyRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  safetyBtn: { flex: 1, borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1 },
  safetyIcon: { fontSize: 20, marginBottom: 4 },
  safetyTxt: { fontSize: 11, fontWeight: '600' },
  completedWrap: { alignItems: 'center', paddingHorizontal: 24, paddingTop: 60 },
  successCircle: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 20, overflow: 'hidden' },
  successIcon: { color: '#fff', fontSize: 36, fontWeight: '900' },
  completedTitle: { fontSize: 26, fontWeight: '900', marginBottom: 8 },
  completedSub: { fontSize: 14, marginBottom: 24 },
  passengerRatingCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, width: '100%', gap: 12 },
  passengerRatingIcon: { fontSize: 32 },
  passengerRatingContent: { flex: 1 },
  passengerRatingTitle: { fontSize: 12, fontWeight: '600', marginBottom: 4 },
  passengerRatingStars: { flexDirection: 'row', gap: 4, marginBottom: 4 },
  passengerRatingStar: { fontSize: 16 },
  passengerRatingFeedback: { fontSize: 12, fontStyle: 'italic' },
  waitingRatingCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, width: '100%', gap: 12 },
  waitingRatingIcon: { fontSize: 32 },
  waitingRatingContent: { flex: 1 },
  waitingRatingTitle: { fontSize: 12, fontWeight: '600', marginBottom: 4 },
  waitingRatingSub: { fontSize: 11 },
  earningsCard: { width: '100%', borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1 },
  earningsTitle: { fontSize: 15, fontWeight: '700', marginBottom: 12 },
  fareRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  fareLabel: { fontSize: 13 },
  fareLabelBig: { fontSize: 14, fontWeight: '700' },
  fareVal: { fontSize: 13, fontWeight: '600' },
  fareTotal: { fontSize: 18, fontWeight: '900' },
  fareDivider: { height: 1 },
  rateTitle: { fontSize: 15, fontWeight: '700', marginBottom: 12 },
  taglineCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 12, borderWidth: 1, gap: 8, marginTop: 8, marginBottom: 16 },
  taglineText: { fontSize: 10, fontWeight: '600' },
  feedbackWrap: { width: '100%', alignItems: 'center', marginBottom: 16 },
  starsRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  star: { fontSize: 32 },
  doneBtn: { width: '100%', borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 8 },
  doneTxt: { color: '#fff', fontSize: 15, fontWeight: '700' },
  doneBtnLocked: { width: '100%', borderRadius: 14, padding: 16, alignItems: 'center', borderWidth: 1, marginTop: 8 },
  doneTxtLocked: { fontSize: 14, fontWeight: '700' },
  feedbackLabel: { fontSize: 13, marginBottom: 10, marginTop: 4 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 16 },
  tag: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  tagTxt: { fontSize: 12, fontWeight: '600' },
  commentBox: { width: '100%', borderRadius: 12, borderWidth: 1, padding: 12, fontSize: 13, marginBottom: 16, textAlignVertical: 'top' },
  reportToggle: { width: '100%', flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1 },
  reportToggleIcon: { fontSize: 18 },
  reportToggleTxt: { fontSize: 13, fontWeight: '600', flex: 1 },
  reportBox: { width: '100%', borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1 },
  reportBoxTitle: { fontSize: 13, fontWeight: '700', marginBottom: 6 },
  reportBoxSub: { fontSize: 12, lineHeight: 18 },
  submitBtn: { width: '100%', borderRadius: 14, padding: 14, alignItems: 'center' },
  submitTxt: { color: '#fff', fontSize: 14, fontWeight: '700' },
  submittedBox: { alignItems: 'center', paddingVertical: 16 },
  submittedIcon: { fontSize: 32, marginBottom: 8 },
  submittedTxt: { fontSize: 14, fontWeight: '700' },
  reportConfirm: { fontSize: 12, marginTop: 4 },
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
  stopsContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  stopsTitle: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 6,
  },
  stopItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  stopDotOrange: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  stopAddress: {
    fontSize: 12,
    flex: 1,
  },
  stopInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    gap: 8,
  },
  stopInfoIcon: {
    fontSize: 16,
  },
  stopInfoText: {
    fontSize: 11,
    fontWeight: '500',
  },
});