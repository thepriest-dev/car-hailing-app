import { router } from 'expo-router';
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal,
  Animated,
  Vibration,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { auth, db } from '../config/firebase';
import { ref, onValue, update, get } from 'firebase/database';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Logo from '../components/Logo';

export default function DriverRequestsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [requests, setRequests] = useState<any[]>([]);
  const [scheduledRequests, setScheduledRequests] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'immediate' | 'scheduled'>('immediate');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [selectedRide, setSelectedRide] = useState<any>(null);
  const [showEarningsModal, setShowEarningsModal] = useState(false);
  const [showNewRequestNotification, setShowNewRequestNotification] = useState(false);
  const [newRequest, setNewRequest] = useState<any>(null);
  const notificationAnim = useRef(new Animated.Value(0)).current;
  
  const [hasVehicle, setHasVehicle] = useState(false);
  const [vehicleVerified, setVehicleVerified] = useState(false);
  const [checkingVehicle, setCheckingVehicle] = useState(true);
  const [vehicleInfo, setVehicleInfo] = useState<any>(null);

  // Animate notification banner
  useEffect(() => {
    if (showNewRequestNotification) {
      Animated.sequence([
        Animated.timing(notificationAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.delay(4000),
        Animated.timing(notificationAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => setShowNewRequestNotification(false));
    }
  }, [showNewRequestNotification]);

  const checkVehicleStatus = useCallback(async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      router.replace('/login');
      return false;
    }

    // ═══════════════════════════════════════════════════════════
    // 🔧 TESTING BYPASS - REMOVE THIS BLOCK FOR PRODUCTION 🔧
    // ═══════════════════════════════════════════════════════════
    console.log('⚠️ TEST MODE: Bypassing vehicle verification');
    setHasVehicle(true);
    setVehicleVerified(true);
    setVehicleInfo({
      vehicleType: 'Car',
      vehiclePlate: 'TEST 123 XY',
      vehicleModel: 'Test Vehicle',
      vehicleColor: 'Red',
      seats: '4',
      isVerified: true
    });
    setCheckingVehicle(false);
    return true;
    // ═══════════════════════════════════════════════════════════
  }, []);

  // Listen for new ride requests
  useEffect(() => {
    if (!hasVehicle || !vehicleVerified) return;

    const ridesRef = ref(db, 'rides');
    const unsubscribe = onValue(ridesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        Object.keys(data).forEach((key) => {
          const ride = data[key];
          if (ride.status === 'searching' && !ride.driverId) {
            // Check if this is a new request (not already shown)
            const existingRequest = requests.find(r => r.id === key);
            if (!existingRequest) {
              Vibration.vibrate([500, 300, 500]);
              setNewRequest({
                id: key,
                pickupLocation: ride.pickupLocation,
                dropoffLocation: ride.dropoffLocation,
                fare: ride.fare,
                rideType: ride.rideType || 'standard',
                riderName: ride.riderName || 'Passenger',
              });
              setShowNewRequestNotification(true);
            }
          }
        });
      }
    });

    return () => unsubscribe();
  }, [hasVehicle, vehicleVerified, requests]);

  const loadRideRequests = useCallback(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      setIsLoading(false);
      return;
    }

    // Load immediate rides
    const ridesRef = ref(db, 'rides');
    const ridesUnsubscribe = onValue(ridesRef, (snapshot) => {
      const data = snapshot.val();
      const rideList: any[] = [];
      
      if (data) {
        Object.keys(data).forEach((key) => {
          const ride = data[key];
          if (ride.status === 'searching' && !ride.driverId) {
            rideList.push({
              id: key,
              ...ride,
              type: 'immediate'
            });
          }
        });
      }
      
      rideList.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
      
      setRequests(rideList);
      setIsLoading(false);
      setRefreshing(false);
    });

    // Load scheduled rides
    const scheduledRef = ref(db, 'scheduled_rides');
    const scheduledUnsubscribe = onValue(scheduledRef, (snapshot) => {
      const data = snapshot.val();
      const scheduledList: any[] = [];
      
      if (data) {
        Object.keys(data).forEach((key) => {
          const ride = data[key];
          if (ride.status === 'pending' && !ride.driverId) {
            scheduledList.push({
              id: key,
              ...ride,
              type: 'scheduled'
            });
          }
        });
      }
      
      scheduledList.sort((a, b) => {
        const dateA = a.scheduledDate ? new Date(a.scheduledDate).getTime() : 0;
        const dateB = b.scheduledDate ? new Date(b.scheduledDate).getTime() : 0;
        return dateA - dateB;
      });
      
      setScheduledRequests(scheduledList);
    });

    return () => {
      ridesUnsubscribe();
      scheduledUnsubscribe();
    };
  }, []);

  useEffect(() => {
    const init = async () => {
      const isValid = await checkVehicleStatus();
      if (isValid) {
        const unsubscribe = loadRideRequests();
        return () => {
          if (unsubscribe) unsubscribe();
        };
      }
    };
    
    init();
  }, [checkVehicleStatus, loadRideRequests]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    const isValid = await checkVehicleStatus();
    if (isValid) {
      loadRideRequests();
    } else {
      setRefreshing(false);
    }
  }, [checkVehicleStatus, loadRideRequests]);

  const calculateEarnings = (fare: number) => {
    const commissionRate = 15;
    const driverEarnings = fare * (1 - commissionRate / 100);
    const commission = fare * (commissionRate / 100);
    
    return {
      totalFare: fare,
      driverEarnings: Math.round(driverEarnings),
      commission: Math.round(commission),
      commissionRate: commissionRate
    };
  };

  const showBreakdown = (ride: any) => {
    setSelectedRide(ride);
    setShowEarningsModal(true);
  };

  const acceptRide = async () => {
    if (!selectedRide) return;
    
    const currentUser = auth.currentUser;
    if (!currentUser) {
      Alert.alert('Error', 'Please login as a driver');
      return;
    }

    setAcceptingId(selectedRide.id);
    setShowEarningsModal(false);
    
    try {
      const isScheduled = selectedRide.type === 'scheduled';
      const rideRef = ref(db, isScheduled ? `scheduled_rides/${selectedRide.id}` : `rides/${selectedRide.id}`);
      
      const snapshot = await get(rideRef);
      if (!snapshot.exists()) {
        Alert.alert('Error', 'This ride is no longer available');
        setAcceptingId(null);
        return;
      }
      
      const rideData = snapshot.val();
      const expectedStatus = isScheduled ? 'pending' : 'searching';
      if (rideData.status !== expectedStatus) {
        Alert.alert('Error', 'This ride has already been accepted');
        setAcceptingId(null);
        return;
      }
      
      const driverRef = ref(db, `users/${currentUser.uid}`);
      const driverSnapshot = await get(driverRef);
      const driverData = driverSnapshot.val() || {};
      
      const earnings = calculateEarnings(selectedRide.fare);
      
      await update(rideRef, {
        status: 'accepted',
        driverId: currentUser.uid,
        driverName: driverData.name || currentUser.email || 'Driver',
        driverPhone: driverData.phone || '',
        driverRating: driverData.rating || 5.0,
        driverEarnings: earnings.driverEarnings,
        commission: earnings.commission,
        acceptedAt: new Date().toISOString()
      });
      
      const successMessage = isScheduled 
        ? `You have accepted this scheduled VeloCity ride for ${new Date(selectedRide.scheduledDate).toLocaleString()}!`
        : 'You have accepted this VeloCity ride!';
      
      Alert.alert('Success', successMessage, [
        { 
          text: 'OK', 
          onPress: () => {
            if (!isScheduled) {
              router.replace({
                pathname: '/driver-trip',
                params: {
                  rideId: selectedRide.id,
                  tripCode: selectedRide.tripCode,
                  pickup: selectedRide.pickupLocation,
                  destination: selectedRide.dropoffLocation,
                  fare: selectedRide.fare?.toString()
                }
              });
            } else {
              router.back();
            }
          }
        }
      ]);
      
    } catch (error) {
      console.log('Error accepting ride:', error);
      Alert.alert('Error', 'Failed to accept ride. Please try again.');
    } finally {
      setAcceptingId(null);
      setSelectedRide(null);
    }
  };

  const formatFare = (fare: number) => {
    return `₦${fare?.toLocaleString() || '0'}`;
  };

  const formatScheduledDate = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString(),
    };
  };

  const EarningsBreakdownModal = () => {
    if (!selectedRide) return null;
    
    const earnings = calculateEarnings(selectedRide.fare);
    const isScheduled = selectedRide.type === 'scheduled';
    
    return (
      <Modal
        visible={showEarningsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEarningsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {isScheduled ? 'Schedule Details' : 'Earnings Breakdown'}
              </Text>
              <TouchableOpacity onPress={() => setShowEarningsModal(false)}>
                <Text style={[styles.modalClose, { color: colors.textSecondary }]}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {isScheduled && selectedRide.scheduledDate && (
                <View style={[styles.scheduleInfoBox, { backgroundColor: colors.surface, borderColor: colors.warning }]}>
                  <Text style={styles.scheduleIcon}>📅</Text>
                  <View style={styles.scheduleContent}>
                    <Text style={[styles.scheduleTitle, { color: colors.warning }]}>Scheduled Ride</Text>
                    <Text style={[styles.scheduleDate, { color: colors.text }]}>
                      {formatScheduledDate(selectedRide.scheduledDate).date}
                    </Text>
                    <Text style={[styles.scheduleTime, { color: colors.primary }]}>
                      {formatScheduledDate(selectedRide.scheduledDate).time}
                    </Text>
                  </View>
                </View>
              )}

              <View style={[styles.tripInfoBox, { backgroundColor: colors.surface, borderColor: colors.primary }]}>
                <Text style={[styles.tripInfoTitle, { color: colors.primary }]}>📍 Trip Details</Text>
                <Text style={[styles.tripInfoRoute, { color: colors.text }]}>{selectedRide.pickupLocation} → {selectedRide.dropoffLocation}</Text>
                <View style={styles.tripInfoRow}>
                  <Text style={[styles.tripInfoLabel, { color: colors.textSecondary }]}>Distance:</Text>
                  <Text style={[styles.tripInfoValue, { color: colors.text }]}>{selectedRide.distanceKm || 4.2} km</Text>
                </View>
                <View style={styles.tripInfoRow}>
                  <Text style={[styles.tripInfoLabel, { color: colors.textSecondary }]}>Ride Type:</Text>
                  <Text style={[styles.tripInfoValue, { color: colors.text }]}>{selectedRide.rideType || 'Standard'}</Text>
                </View>
                <View style={styles.tripInfoRow}>
                  <Text style={[styles.tripInfoLabel, { color: colors.textSecondary }]}>Passenger:</Text>
                  <Text style={[styles.tripInfoValue, { color: colors.text }]}>{selectedRide.riderName || 'Passenger'}</Text>
                </View>
                {selectedRide.numberOfStops > 0 && (
                  <View style={styles.tripInfoRow}>
                    <Text style={[styles.tripInfoLabel, { color: colors.textSecondary }]}>Stops:</Text>
                    <Text style={[styles.tripInfoValue, { color: colors.warning }]}>{selectedRide.numberOfStops} stop(s)</Text>
                  </View>
                )}
              </View>

              <View style={styles.breakdownSection}>
                <Text style={[styles.breakdownSectionTitle, { color: colors.textSecondary }]}>What Passenger Pays</Text>
                <View style={styles.breakdownRow}>
                  <Text style={[styles.breakdownLabel, { color: colors.textSecondary }]}>Total Fare</Text>
                  <Text style={[styles.breakdownValue, { color: colors.text }]}>₦{earnings.totalFare.toLocaleString()}</Text>
                </View>
              </View>

              <View style={[styles.breakdownDivider, { backgroundColor: colors.border }]} />

              <View style={styles.breakdownSection}>
                <Text style={[styles.breakdownSectionTitle, { color: colors.textSecondary }]}>Your Earnings</Text>
                <View style={styles.breakdownRow}>
                  <Text style={[styles.breakdownLabel, { color: colors.textSecondary }]}>You keep ({100 - earnings.commissionRate}%)</Text>
                  <Text style={[styles.breakdownValueHighlight, { color: colors.success, fontSize: 18, fontWeight: '800' }]}>
                    ₦{earnings.driverEarnings.toLocaleString()}
                  </Text>
                </View>
                <View style={styles.breakdownRow}>
                  <Text style={[styles.breakdownLabel, { color: colors.textSecondary }]}>VeloCity commission ({earnings.commissionRate}%)</Text>
                  <Text style={[styles.breakdownValue, { color: colors.text }]}>₦{earnings.commission.toLocaleString()}</Text>
                </View>
              </View>

              <View style={[styles.breakdownDivider, { backgroundColor: colors.border }]} />

              <View style={[styles.infoBox, { backgroundColor: colors.surface, borderColor: colors.warning }]}>
                <Text style={styles.infoIcon}>💡</Text>
                <View style={styles.infoContent}>
                  <Text style={[styles.infoTitle, { color: colors.warning }]}>Why {earnings.commissionRate}% commission?</Text>
                  <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                    Our commission helps us provide:
                    • Safety features & 24/7 support
                    • Secure payment processing
                    • Finding you more riders
                    • Insurance coverage
                  </Text>
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalButtonRow}>
              <TouchableOpacity 
                style={[styles.modalButtonDecline, { borderColor: colors.error }]} 
                onPress={() => setShowEarningsModal(false)}
              >
                <Text style={[styles.modalButtonDeclineText, { color: colors.error }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButtonAccept, { backgroundColor: colors.primary }]} 
                onPress={acceptRide}
                disabled={acceptingId === selectedRide?.id}
              >
                {acceptingId === selectedRide?.id ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalButtonAcceptText}>
                    {selectedRide.type === 'scheduled' ? 'Accept Schedule' : 'Accept Ride'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  const currentRequests = activeTab === 'immediate' ? requests : scheduledRequests;
  const hasRequests = currentRequests.length > 0;

  if (checkingVehicle || isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar style="light" backgroundColor="#0A1929" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            {checkingVehicle ? 'Checking vehicle status...' : 'Loading ride requests...'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style="light" backgroundColor="#0A1929" />
      
      {/* Animated Notification Banner for New Request */}
      {showNewRequestNotification && newRequest && (
        <Animated.View
          style={[
            styles.notificationBanner,
            {
              transform: [
                {
                  translateY: notificationAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-100, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={[styles.notificationContent, { backgroundColor: colors.primary }]}>
            <Text style={styles.notificationIcon}>🚗</Text>
            <View style={styles.notificationTextContainer}>
              <Text style={styles.notificationTitle}>New Ride Request!</Text>
              <Text style={styles.notificationMessage}>
                {newRequest.pickupLocation} → {newRequest.dropoffLocation}
              </Text>
              <Text style={styles.notificationFare}>
                ₦{newRequest.fare?.toLocaleString()} • {newRequest.rideType}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.notificationButton}
              onPress={() => {
                setShowNewRequestNotification(false);
                if (newRequest.id) {
                  // Find and highlight the request
                  const ride = requests.find(r => r.id === newRequest.id);
                  if (ride) showBreakdown(ride);
                }
              }}
            >
              <Text style={styles.notificationButtonText}>View</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}

      <View style={[styles.header, { borderBottomColor: colors.border, paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.surface }]}>
          <Text style={[styles.backIcon, { color: colors.text }]}>←</Text>
        </TouchableOpacity>
        <Logo size="small" showText={true} />
        <TouchableOpacity onPress={onRefresh} style={[styles.refreshBtn, { backgroundColor: colors.surface }]}>
          <Text style={[styles.refreshIcon, { color: colors.primary }]}>⟳</Text>
        </TouchableOpacity>
      </View>

      {/* Tab Selector */}
      <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'immediate' && styles.tabActive, activeTab === 'immediate' && { borderBottomColor: colors.primary }]}
          onPress={() => setActiveTab('immediate')}
        >
          <Text style={[styles.tabText, { color: activeTab === 'immediate' ? colors.primary : colors.textSecondary }]}>
            🚗 Immediate Rides {requests.length > 0 && `(${requests.length})`}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'scheduled' && styles.tabActive, activeTab === 'scheduled' && { borderBottomColor: colors.primary }]}
          onPress={() => setActiveTab('scheduled')}
        >
          <Text style={[styles.tabText, { color: activeTab === 'scheduled' ? colors.primary : colors.textSecondary }]}>
            📅 Scheduled {scheduledRequests.length > 0 && `(${scheduledRequests.length})`}
          </Text>
        </TouchableOpacity>
      </View>

      {vehicleInfo && vehicleVerified && activeTab === 'immediate' && (
        <View style={[styles.vehicleInfoCard, { backgroundColor: colors.success + '10', borderColor: colors.success, marginHorizontal: 20, marginTop: 12, marginBottom: 8 }]}>
          <View style={styles.vehicleInfoRow}>
            <Text style={styles.vehicleInfoIcon}>✅</Text>
            <View style={styles.vehicleInfoContent}>
              <Text style={[styles.vehicleInfoTitle, { color: colors.text }]}>Vehicle Verified</Text>
              <Text style={[styles.vehicleInfoText, { color: colors.textSecondary }]}>
                {vehicleInfo.vehicleType} • {vehicleInfo.vehiclePlate} • {vehicleInfo.vehicleColor} {vehicleInfo.vehicleModel}
              </Text>
            </View>
          </View>
        </View>
      )}

      <ScrollView 
        style={styles.body}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
      >
        <View style={[styles.taglineCard, { backgroundColor: colors.surfaceLight, borderColor: colors.primary }]}>
          <Logo size="small" showText={false} />
          <Text style={[styles.taglineText, { color: colors.text }]}>Set the Pace. Arrive in Style.</Text>
        </View>

        {!hasRequests ? (
          <View style={[styles.emptyContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={styles.emptyIcon}>{activeTab === 'immediate' ? '🚗' : '📅'}</Text>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              {activeTab === 'immediate' ? 'No Ride Requests' : 'No Scheduled Rides'}
            </Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {activeTab === 'immediate' 
                ? 'There are currently no active ride requests from passengers.'
                : 'No passengers have scheduled rides yet.'}
            </Text>
            <Text style={[styles.emptySubText, { color: colors.textSecondary }]}>
              {activeTab === 'immediate' 
                ? 'When a passenger books a VeloCity ride, you will be notified immediately!'
                : 'When a passenger schedules a future ride, it will appear here.'}
            </Text>
            <TouchableOpacity onPress={onRefresh} style={[styles.retryBtn, { borderColor: colors.primary }]}>
              <Text style={[styles.retryTxt, { color: colors.primary }]}>Refresh</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={[styles.requestCount, { color: colors.textSecondary }]}>
              {currentRequests.length} active {activeTab === 'immediate' ? 'ride' : 'scheduled ride'}{currentRequests.length !== 1 ? 's' : ''} available
            </Text>
            {currentRequests.map((ride) => {
              const earnings = calculateEarnings(ride.fare);
              const isScheduled = ride.type === 'scheduled';
              const scheduledInfo = isScheduled && ride.scheduledDate ? formatScheduledDate(ride.scheduledDate) : null;
              
              return (
                <View
                  key={ride.id}
                  style={[styles.requestCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                >
                  <View style={styles.requestHeader}>
                    <View style={[styles.rideTypeBadge, { backgroundColor: colors.primary + '20' }]}>
                      <Text style={[styles.rideTypeText, { color: colors.primary }]}>
                        {ride.rideType || 'Standard'}
                      </Text>
                    </View>
                    {isScheduled && (
                      <View style={[styles.scheduledBadge, { backgroundColor: colors.warning + '20' }]}>
                        <Text style={[styles.scheduledBadgeText, { color: colors.warning }]}>📅 Scheduled</Text>
                      </View>
                    )}
                    <Text style={[styles.fareAmount, { color: colors.success }]}>
                      {formatFare(ride.fare)}
                    </Text>
                  </View>

                  {isScheduled && scheduledInfo && (
                    <View style={[styles.schedulePreview, { backgroundColor: colors.surfaceLight, borderColor: colors.warning }]}>
                      <Text style={styles.schedulePreviewIcon}>📅</Text>
                      <Text style={[styles.schedulePreviewText, { color: colors.textSecondary }]}>
                        {scheduledInfo.date} at {scheduledInfo.time}
                      </Text>
                    </View>
                  )}

                  <View style={styles.locationSection}>
                    <View style={styles.locationRow}>
                      <View style={[styles.dot, styles.dotGreen]} />
                      <View style={styles.locationContent}>
                        <Text style={[styles.locationLabel, { color: colors.textSecondary }]}>PICKUP</Text>
                        <Text style={[styles.locationText, { color: colors.text }]} numberOfLines={2}>
                          {ride.pickupLocation}
                        </Text>
                      </View>
                    </View>
                    
                    <View style={[styles.divider, { backgroundColor: colors.border }]} />
                    
                    <View style={styles.locationRow}>
                      <View style={[styles.dot, styles.dotRed]} />
                      <View style={styles.locationContent}>
                        <Text style={[styles.locationLabel, { color: colors.textSecondary }]}>DESTINATION</Text>
                        <Text style={[styles.locationText, { color: colors.text }]} numberOfLines={2}>
                          {ride.dropoffLocation}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <TouchableOpacity 
                    style={[styles.earningsPreview, { backgroundColor: colors.surfaceLight, borderColor: colors.warning }]}
                    onPress={() => showBreakdown(ride)}
                  >
                    <Text style={styles.earningsIcon}>💰</Text>
                    <View style={styles.earningsPreviewContent}>
                      <Text style={[styles.earningsPreviewTitle, { color: colors.warning }]}>Your Earnings: ₦{earnings.driverEarnings.toLocaleString()}</Text>
                      <Text style={[styles.earningsPreviewSub, { color: colors.textSecondary }]}>
                        Tap to see full breakdown →
                      </Text>
                    </View>
                  </TouchableOpacity>

                  <View style={[styles.rideDetails, { borderTopColor: colors.border }]}>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailIcon}>👤</Text>
                      <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                        {ride.riderName || 'Passenger'}
                      </Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailIcon}>🆔</Text>
                      <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                        Code: {ride.tripCode}
                      </Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailIcon}>⏱️</Text>
                      <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                        {isScheduled && ride.scheduledDate 
                          ? formatScheduledDate(ride.scheduledDate).time
                          : ride.createdAt ? new Date(ride.createdAt).toLocaleTimeString() : 'Just now'}
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[styles.acceptBtn, { backgroundColor: colors.primary }]}
                    onPress={() => showBreakdown(ride)}
                    disabled={acceptingId === ride.id}
                  >
                    <Text style={styles.acceptBtnText}>
                      {isScheduled ? 'View & Accept Schedule' : 'View & Accept Ride'}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </>
        )}
      </ScrollView>

      <EarningsBreakdownModal />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backBtn: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  backIcon: { fontSize: 18 },
  refreshBtn: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  refreshIcon: { fontSize: 18 },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    marginHorizontal: 20,
    marginTop: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomWidth: 2,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
  },
  body: { flex: 1, padding: 20 },
  taglineCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 12, borderWidth: 1, gap: 8, marginBottom: 16 },
  taglineText: { fontSize: 10, fontWeight: '600' },
  emptyContainer: { alignItems: 'center', padding: 40, borderRadius: 16, borderWidth: 1, marginTop: 40 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  emptyText: { fontSize: 14, textAlign: 'center', marginBottom: 8 },
  emptySubText: { fontSize: 12, textAlign: 'center' },
  retryBtn: { marginTop: 20, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, borderWidth: 1 },
  retryTxt: { fontSize: 14, fontWeight: '600' },
  requestCount: { fontSize: 12, fontWeight: '600', marginBottom: 12 },
  requestCard: { borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1 },
  requestHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 },
  rideTypeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  rideTypeText: { fontSize: 12, fontWeight: '600' },
  scheduledBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  scheduledBadgeText: { fontSize: 11, fontWeight: '600' },
  fareAmount: { fontSize: 20, fontWeight: '800' },
  schedulePreview: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 10, marginBottom: 12, gap: 8, borderWidth: 1 },
  schedulePreviewIcon: { fontSize: 16 },
  schedulePreviewText: { fontSize: 12 },
  locationSection: { marginBottom: 16 },
  locationRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  dotGreen: { backgroundColor: '#10B981' },
  dotRed: { backgroundColor: '#EF4444' },
  locationContent: { flex: 1 },
  locationLabel: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', marginBottom: 2, letterSpacing: 0.5 },
  locationText: { fontSize: 14, fontWeight: '600' },
  divider: { height: 1, marginVertical: 10, marginLeft: 11 },
  earningsPreview: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, padding: 12, marginBottom: 12, gap: 10, borderWidth: 1 },
  earningsIcon: { fontSize: 24 },
  earningsPreviewContent: { flex: 1 },
  earningsPreviewTitle: { fontSize: 13, fontWeight: '700' },
  earningsPreviewSub: { fontSize: 11, marginTop: 2 },
  rideDetails: { flexDirection: 'row', justifyContent: 'space-around', paddingTop: 12, borderTopWidth: 1, marginBottom: 16 },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  detailIcon: { fontSize: 14 },
  detailText: { fontSize: 12 },
  acceptBtn: { borderRadius: 12, padding: 14, alignItems: 'center' },
  acceptBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, maxHeight: '85%', borderWidth: 1 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingBottom: 12, borderBottomWidth: 1 },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  modalClose: { fontSize: 20, fontWeight: '600' },
  tripInfoBox: { borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1 },
  tripInfoTitle: { fontSize: 14, fontWeight: '700', marginBottom: 8 },
  tripInfoRoute: { fontSize: 16, fontWeight: '800', marginBottom: 12 },
  tripInfoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  tripInfoLabel: { fontSize: 13 },
  tripInfoValue: { fontSize: 13, fontWeight: '600' },
  scheduleInfoBox: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, padding: 16, marginBottom: 16, gap: 12, borderWidth: 1 },
  scheduleIcon: { fontSize: 32 },
  scheduleContent: { flex: 1 },
  scheduleTitle: { fontSize: 12, fontWeight: '700', marginBottom: 4 },
  scheduleDate: { fontSize: 13 },
  scheduleTime: { fontSize: 13, fontWeight: '700' },
  breakdownSection: { gap: 8, marginBottom: 16 },
  breakdownSectionTitle: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  breakdownLabel: { fontSize: 13 },
  breakdownValue: { fontSize: 13, fontWeight: '500' },
  breakdownValueHighlight: { fontSize: 16, fontWeight: '800' },
  breakdownDivider: { height: 1, marginVertical: 8 },
  infoBox: { flexDirection: 'row', borderRadius: 12, padding: 12, gap: 10, marginTop: 8, borderWidth: 1 },
  infoIcon: { fontSize: 20 },
  infoContent: { flex: 1 },
  infoTitle: { fontSize: 13, fontWeight: '700', marginBottom: 4 },
  infoText: { fontSize: 11, lineHeight: 16 },
  modalButtonRow: { flexDirection: 'row', gap: 12, marginTop: 20 },
  modalButtonDecline: { flex: 1, borderRadius: 14, padding: 16, alignItems: 'center', borderWidth: 1 },
  modalButtonDeclineText: { fontSize: 15, fontWeight: '700' },
  modalButtonAccept: { flex: 1, borderRadius: 14, padding: 16, alignItems: 'center' },
  modalButtonAcceptText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  vehicleInfoCard: {
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 8,
    borderWidth: 1,
  },
  vehicleInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  vehicleInfoIcon: {
    fontSize: 24,
  },
  vehicleInfoContent: {
    flex: 1,
  },
  vehicleInfoTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  vehicleInfoText: {
    fontSize: 11,
  },
  notificationBanner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    paddingTop: 10,
    paddingHorizontal: 16,
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 12,
    gap: 12,
  },
  notificationIcon: {
    fontSize: 28,
    color: '#fff',
  },
  notificationTextContainer: {
    flex: 1,
  },
  notificationTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  notificationMessage: {
    color: '#fff',
    fontSize: 12,
    marginTop: 2,
    opacity: 0.9,
  },
  notificationFare: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
    opacity: 0.9,
  },
  notificationButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  notificationButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});