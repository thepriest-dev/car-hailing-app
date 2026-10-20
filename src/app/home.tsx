import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { ref, get, update } from 'firebase/database';
import { getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage';
import { useEffect, useState, useRef } from 'react';
import {
  ActivityIndicator, Alert,
  Image,
  Modal,
  ScrollView, StyleSheet,
  Switch, Text, TouchableOpacity, View, Platform, Animated
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FavoritePlacesModal from '../components/FavoritePlacesModal';
import LevelProgress from '../components/LevelProgress';
import LevelUpModal from '../components/LevelUpModal';
import SOSButton from '../components/SOSButton';
import ThemeSwitcher from '../components/ThemeSwitcher';
import Logo from '../components/Logo';
import NotificationBell from '../components/NotificationBell';
import { auth, db, storage } from '../config/firebase';
import { useTheme } from '../contexts/ThemeContext';
import { FavoritePlace } from '../services/favoritePlacesService';
import { checkLevelUp, getLevelDisplay, Level } from '../utils/gamificationEngine';
import MapPlaceholder from './MapPlaceholder';
import { RideCardSkeleton } from '../components/SkeletonLoader';

// Trip Details Modal Component
const TripDetailsModalComponent = ({ 
  visible, 
  onClose, 
  selectedTrip, 
  role, 
  colors, 
  formatFullDateTime 
}: { 
  visible: boolean; 
  onClose: () => void; 
  selectedTrip: any; 
  role: string; 
  colors: any; 
  formatFullDateTime: (date: string) => string;
}) => {
  if (!selectedTrip) return null;
  
  const driverRating = role === 'Passenger' ? selectedTrip.driverRatingFromPassenger : selectedTrip.driverRating;
  
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Trip Details</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={[styles.modalClose, { color: colors.textSecondary }]}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={[styles.tripInfoBox, { backgroundColor: colors.surface, borderColor: colors.primary }]}>
              <Text style={[styles.tripInfoTitle, { color: colors.primary }]}>📍 Trip Route</Text>
              <View style={styles.tripInfoRow}>
                <View style={styles.dotGreen} />
                <Text style={[styles.tripInfoLabel, { color: colors.textSecondary }]}>Pickup:</Text>
                <Text style={[styles.tripInfoValue, { color: colors.text }]}>{selectedTrip.pickupLocation}</Text>
              </View>
              <View style={styles.tripInfoRow}>
                <View style={styles.dotRed} />
                <Text style={[styles.tripInfoLabel, { color: colors.textSecondary }]}>Destination:</Text>
                <Text style={[styles.tripInfoValue, { color: colors.text }]}>{selectedTrip.dropoffLocation}</Text>
              </View>
            </View>

            <View style={[styles.detailsBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.detailsTitle, { color: colors.text }]}>Trip Information</Text>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Date & Time:</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>{formatFullDateTime(selectedTrip.date)}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Ride Type:</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>{selectedTrip.rideType || 'Standard'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Distance:</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>{selectedTrip.distanceKm || 4.2} km</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Fare:</Text>
                <Text style={[styles.detailValue, { color: colors.success, fontWeight: '800' }]}>₦{selectedTrip.fare?.toLocaleString()}</Text>
              </View>
            </View>

            {role === 'Passenger' && selectedTrip.driverName && (
              <View style={[styles.detailsBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.detailsTitle, { color: colors.text }]}>Driver Information</Text>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Driver Name:</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>{selectedTrip.driverName}</Text>
                </View>
                {driverRating > 0 && (
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Your Rating:</Text>
                    <View style={styles.ratingStars}>
                      {[1, 2, 3, 4, 5].map(star => (
                        <Text key={star} style={[styles.ratingStarSmall, { color: star <= driverRating ? '#F59E0B' : colors.textSecondary }]}>★</Text>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            )}

            {role !== 'Passenger' && (
              <View style={[styles.detailsBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.detailsTitle, { color: colors.text }]}>Earnings Breakdown</Text>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Total Fare:</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>₦{selectedTrip.fare?.toLocaleString()}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Your Earnings (85%):</Text>
                  <Text style={[styles.detailValue, { color: colors.success }]}>₦{Math.round(selectedTrip.fare * 0.85).toLocaleString()}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Commission (15%):</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>₦{Math.round(selectedTrip.fare * 0.15).toLocaleString()}</Text>
                </View>
              </View>
            )}
          </ScrollView>

          <TouchableOpacity 
            style={[styles.modalButton, { backgroundColor: colors.primary }]}
            onPress={onClose}
          >
            <Text style={styles.modalButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default function HomeScreen() {
  const { colors } = useTheme();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  
  const initialRole = params.role ? (params.role === 'driver' ? 'Driver' : 'Passenger') : 'Passenger';
  
  const [role, setRole] = useState(initialRole);
  const [activeTab, setActiveTab] = useState('home');
  const [isOnline, setIsOnline] = useState(false);
  const [showLevelUpModal, setShowLevelUpModal] = useState(false);
  const [newLevel, setNewLevel] = useState<Level | null>(null);
  const [showFavoritePlaces, setShowFavoritePlaces] = useState(false);
  const [recentTrips, setRecentTrips] = useState<any[]>([]);
  const [loadingTrips, setLoadingTrips] = useState(true);
  const [selectedTrip, setSelectedTrip] = useState<any>(null);
  const [showTripDetailsModal, setShowTripDetailsModal] = useState(false);
  
  const [userData, setUserData] = useState({
    name: '',
    email: '',
    phone: '',
    role: '',
  });
  
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  const [userStats, setUserStats] = useState({
    totalTrips: 0,
    totalRating: 0,
    role: role === 'Driver' ? ('driver' as const) : ('passenger' as const),
  });

  // Vehicle verification states - ONLY FOR DRIVERS
  const [hasVehicle, setHasVehicle] = useState(false);
  const [vehicleVerified, setVehicleVerified] = useState(false);
  const [loadingVehicle, setLoadingVehicle] = useState(true);
  const [vehicleInfo, setVehicleInfo] = useState<any>(null);

  const getTimeBasedGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const getUserFirstName = () => {
    const fullName = userData.name || 'User';
    return fullName.split(' ')[0];
  };

  // Check if driver has registered vehicle - ONLY FOR DRIVERS
  const checkVehicleStatus = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser || role !== 'Driver') {
      setLoadingVehicle(false);
      return;
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
    setLoadingVehicle(false);
    return;
    // ═══════════════════════════════════════════════════════════
  };

  useEffect(() => {
    const fetchUserData = async () => {
      const currentUser = auth.currentUser;
      if (currentUser) {
        const userRef = ref(db, `users/${currentUser.uid}`);
        const snapshot = await get(userRef);
        if (snapshot.exists()) {
          const data = snapshot.val();
          setUserData({
            name: data.name || 'User',
            email: data.email || currentUser.email || '',
            phone: data.phone || '',
            role: data.role || '',
          });
        }
      }
    };
    fetchUserData();
    loadProfileImage();
    if (role === 'Driver') {
      loadDriverStatus();
      checkVehicleStatus();
    }
    loadUserStats();
    loadRecentTrips();
  }, []);

  const loadRecentTrips = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      setLoadingTrips(false);
      return;
    }

    try {
      const ridesRef = ref(db, 'rides');
      const snapshot = await get(ridesRef);
      const rides = snapshot.val();
      
      const userTrips: any[] = [];
      
      if (rides) {
        Object.keys(rides).forEach((key) => {
          const ride = rides[key];
          
          if ((ride.riderId === currentUser.uid || ride.driverId === currentUser.uid) && 
              ride.status === 'completed') {
            userTrips.push({
              id: key,
              pickupLocation: ride.pickupLocation,
              dropoffLocation: ride.dropoffLocation,
              fare: ride.fare,
              date: ride.completedAt || ride.createdAt,
              status: 'Completed',
              rideType: ride.rideType,
              distanceKm: ride.distanceKm,
              driverName: ride.driverName,
              driverRating: ride.driverRating,
              passengerRating: ride.passengerRating,
              passengerFeedback: ride.passengerFeedback,
              driverRatingFromPassenger: ride.passengerRating,
              driverFeedbackFromPassenger: ride.passengerFeedback,
            });
          }
        });
      }
      
      userTrips.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      setRecentTrips(userTrips);
      setLoadingTrips(false);
      
    } catch (error) {
      console.log('Error loading recent trips:', error);
      setLoadingTrips(false);
    }
  };

  const loadUserStats = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    try {
      const ridesRef = ref(db, 'rides');
      const snapshot = await get(ridesRef);
      const rides = snapshot.val();
      
      let totalCompletedTrips = 0;
      let totalRating = 0;
      let ratingCount = 0;
      
      if (rides) {
        Object.keys(rides).forEach((key) => {
          const ride = rides[key];
          
          if (ride.status === 'completed') {
            if (ride.riderId === currentUser.uid || ride.driverId === currentUser.uid) {
              totalCompletedTrips++;
            }
          }
          
          if (role === 'Passenger') {
            if (ride.riderId === currentUser.uid && ride.passengerRating) {
              totalRating += ride.passengerRating;
              ratingCount++;
            }
          } else {
            if (ride.driverId === currentUser.uid && ride.passengerRating) {
              totalRating += ride.passengerRating;
              ratingCount++;
            }
          }
        });
      }
      
      const averageRating = ratingCount > 0 ? totalRating / ratingCount : 0;
      
      setUserStats({
        totalTrips: totalCompletedTrips,
        totalRating: averageRating,
        role: role === 'Driver' ? 'driver' : 'passenger',
      });
      
      const userRef = ref(db, `users/${currentUser.uid}`);
      await update(userRef, {
        totalTrips: totalCompletedTrips,
        totalRating: averageRating,
      });
      
    } catch (error) {
      console.log('Error loading user stats:', error);
    }
  };

  const loadDriverStatus = async () => {
    const currentUser = auth.currentUser;
    if (currentUser && role === 'Driver') {
      const statusRef = ref(db, `drivers/${currentUser.uid}/isOnline`);
      const snapshot = await get(statusRef);
      if (snapshot.exists()) {
        setIsOnline(snapshot.val());
      } else {
        setIsOnline(false);
      }
    }
  };

  const toggleOnlineStatus = async (value: boolean) => {
    // ═══════════════════════════════════════════════════════════
    // 🔧 TESTING BYPASS - REMOVE THIS BLOCK FOR PRODUCTION 🔧
    // ═══════════════════════════════════════════════════════════
    console.log('⚠️ TEST MODE: Allowing driver to go online without verification');
    setIsOnline(value);
    const currentUser = auth.currentUser;
    if (currentUser && role === 'Driver') {
      const driverRef = ref(db, `drivers/${currentUser.uid}`);
      await update(driverRef, { 
        isOnline: value,
        lastStatusChange: new Date().toISOString()
      });
    }
    return;
    // ═══════════════════════════════════════════════════════════
  };

  const loadProfileImage = async () => {
    const currentUser = auth.currentUser;
    if (currentUser) {
      const userRef = ref(db, `users/${currentUser.uid}`);
      const snapshot = await get(userRef);
      if (snapshot.exists()) {
        const data = snapshot.val();
        if (data.profileImage) {
          setProfileImage(data.profileImage);
        }
      }
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Needed', 'Please grant permission to access your photos');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled) {
      uploadImage(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Needed', 'Please grant permission to use camera');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled) {
      uploadImage(result.assets[0].uri);
    }
  };

  const uploadImage = async (uri: string) => {
    setUploadingImage(true);
    
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        Alert.alert('Error', 'User not logged in');
        return;
      }

      const response = await fetch(uri);
      const blob = await response.blob();
      
      const imageRef = storageRef(storage, `profile_pictures/${currentUser.uid}.jpg`);
      
      await uploadBytes(imageRef, blob);
      
      const downloadURL = await getDownloadURL(imageRef);
      
      const userRef = ref(db, `users/${currentUser.uid}`);
      await update(userRef, { profileImage: downloadURL });
      
      setProfileImage(downloadURL);
      Alert.alert('Success', 'Profile picture updated!');
    } catch (error: any) {
      Alert.alert('Upload Failed', `Error: ${error.message}`);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRideSelect = (rideType: string, ridePrice: string) => {
    router.push('/booking');
  };

  const handleRecentTripSelect = (trip: any) => {
    router.push('/booking');
  };

  const handleTripDetails = (trip: any) => {
    setSelectedTrip(trip);
    setShowTripDetailsModal(true);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  };

  const formatFullDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const levelInfo = getLevelDisplay(userStats.role, userStats.totalTrips);

  useEffect(() => {
    const checkForLevelUp = () => {
      const result = checkLevelUp(userStats.role, userStats.totalTrips - 1, userStats.totalTrips);
      if (result.leveledUp && result.newLevel) {
        setNewLevel(result.newLevel);
        setShowLevelUpModal(true);
      }
    };
    checkForLevelUp();
  }, [userStats.totalTrips]);

  const closeLevelUpModal = () => {
    setShowLevelUpModal(false);
    setNewLevel(null);
  };

  const handleSelectFavoritePlace = (place: FavoritePlace) => {
    router.push({
      pathname: '/booking',
      params: { destination: place.address }
    });
  };

  const sosTripInfo = {
    driverName: 'James Adeyemi',
    driverPhone: '+2348012345678',
    vehiclePlate: 'LAG ABC 123 XY',
    pickupLocation: 'Ikeja, Lagos',
    destinationLocation: 'Victoria Island, Lagos',
    tripCode: '7432',
  };

  const showImagePickerOptions = () => {
    Alert.alert(
      'Profile Picture',
      'Choose an option',
      [
        { text: 'Take Photo', onPress: takePhoto },
        { text: 'Choose from Gallery', onPress: pickImage },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const handleSignOut = () => {
    auth.signOut();
    router.replace('/login');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style="light" backgroundColor="transparent" translucent />
      
      {/* Top Header with Logo and Notification Bell */}
      <View style={[styles.topHeader, { paddingTop: insets.top + 10, paddingBottom: 10, borderBottomColor: colors.border }]}>
        <Logo size="small" showText={false} />
        <View style={styles.headerRight}>
          <NotificationBell />
          <TouchableOpacity 
            style={[styles.profileBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} 
            onPress={() => setActiveTab('profile')}
          >
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.profileAvatarSmall} />
            ) : (
              <Text style={styles.profileTxt}>👤</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
      
      <LevelUpModal 
        visible={showLevelUpModal} 
        newLevel={newLevel} 
        onClose={closeLevelUpModal} 
      />

      <MapPlaceholder />

      <SOSButton tripInfo={sosTripInfo} />

      {/* Bottom Sheet */}
      <View style={[
        styles.bottomSheet, 
        { 
          backgroundColor: colors.background, 
          borderTopColor: colors.border,
        }
      ]}>
        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        >
          {/* ==================== PASSENGER VIEWS ==================== */}
          {role === 'Passenger' && (
            <>
              {/* PASSENGER: HOME TAB */}
              {activeTab === 'home' && (
                <View>
                  <TouchableOpacity 
                    style={styles.profileRow}
                    onPress={() => setActiveTab('profile')}
                  >
                    {profileImage ? (
                      <Image source={{ uri: profileImage }} style={styles.profileAvatarSmall} />
                    ) : (
                      <View style={[styles.profileAvatarPlaceholder, { backgroundColor: colors.primary }]}>
                        <Text style={styles.profileAvatarText}>
                          {userData.name ? userData.name.charAt(0).toUpperCase() : 'U'}
                        </Text>
                      </View>
                    )}
                    <View style={styles.userInfoContainer}>
                      <Text style={[styles.greeting, { color: colors.text }]}>
                        {getTimeBasedGreeting()}, {getUserFirstName()} 👋
                      </Text>
                      <Text style={[styles.userRole, { color: colors.textSecondary }]}>
                        👤 Passenger
                      </Text>
                    </View>
                  </TouchableOpacity>
                  
                  <Text style={[styles.question, { color: colors.textSecondary }]}>Where are you going?</Text>
                  
                  <TouchableOpacity 
                    style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]} 
                    onPress={() => router.push('/booking')}
                  >
                    <Text style={styles.searchIcon}>📍</Text>
                    <Text style={[styles.searchTxt, { color: colors.textSecondary }]}>Enter destination</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.favoriteBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    onPress={() => setShowFavoritePlaces(true)}
                  >
                    <Text style={styles.favoriteIcon}>⭐</Text>
                    <Text style={[styles.favoriteText, { color: colors.text }]}>Favorite Places</Text>
                  </TouchableOpacity>

                  <LevelProgress
                    currentLevel={levelInfo.currentLevel}
                    nextLevel={levelInfo.nextLevel}
                    progress={levelInfo.progress}
                    tripsToNextLevel={levelInfo.tripsToNextLevel}
                    totalTrips={userStats.totalTrips}
                    role={userStats.role}
                  />

                  <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Choose a ride</Text>
                  <View style={styles.rideRow}>
                    <TouchableOpacity 
                      style={[styles.rideCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                      onPress={() => router.push('/booking')}
                    >
                      <Text style={styles.rideIcon}>🚗</Text>
                      <Text style={[styles.rideName, { color: colors.text }]}>Standard</Text>
                      <Text style={[styles.ridePrice, { color: colors.primary }]}>₦1,200</Text>
                      <Text style={[styles.rideTime, { color: colors.textSecondary }]}>3 min</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={[styles.rideCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                      onPress={() => router.push('/booking')}
                    >
                      <Text style={styles.rideIcon}>🚙</Text>
                      <Text style={[styles.rideName, { color: colors.text }]}>Comfort</Text>
                      <Text style={[styles.ridePrice, { color: colors.primary }]}>₦2,000</Text>
                      <Text style={[styles.rideTime, { color: colors.textSecondary }]}>4 min</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={[styles.rideCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                      onPress={() => router.push('/booking')}
                    >
                      <Text style={styles.rideIcon}>🚘</Text>
                      <Text style={[styles.rideName, { color: colors.text }]}>Business</Text>
                      <Text style={[styles.ridePrice, { color: colors.primary }]}>₦3,500</Text>
                      <Text style={[styles.rideTime, { color: colors.textSecondary }]}>5 min</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={[styles.rideCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                      onPress={() => router.push('/booking')}
                    >
                      <Text style={styles.rideIcon}>🏎️</Text>
                      <Text style={[styles.rideName, { color: colors.text }]}>Luxury</Text>
                      <Text style={[styles.ridePrice, { color: colors.primary }]}>₦6,000</Text>
                      <Text style={[styles.rideTime, { color: colors.textSecondary }]}>6 min</Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Recent Trips</Text>
                  {loadingTrips ? (
                    <>
                      <RideCardSkeleton />
                      <RideCardSkeleton />
                      <RideCardSkeleton />
                    </>
                  ) : recentTrips.length === 0 ? (
                    <View style={[styles.emptyTripsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <Text style={styles.emptyTripsIcon}>🚗</Text>
                      <Text style={[styles.emptyTripsTitle, { color: colors.text }]}>No trips yet</Text>
                      <Text style={[styles.emptyTripsText, { color: colors.textSecondary }]}>
                        Complete your first ride to see it here!
                      </Text>
                    </View>
                  ) : (
                    recentTrips.slice(0, 5).map((trip, i) => (
                      <TouchableOpacity 
                        key={i} 
                        style={[styles.tripCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                        onPress={() => router.push('/booking')}
                      >
                        <View style={styles.tripLeft}>
                          <Text style={[styles.tripRoute, { color: colors.text }]}>{trip.pickupLocation} → {trip.dropoffLocation}</Text>
                          <Text style={[styles.tripDate, { color: colors.textSecondary }]}>{formatDate(trip.date)}</Text>
                        </View>
                        <View style={styles.tripRight}>
                          <Text style={[styles.tripPrice, { color: colors.text }]}>₦{trip.fare?.toLocaleString()}</Text>
                          <View style={[styles.tripStatusBadge, { backgroundColor: colors.success + '20' }]}>
                            <Text style={[styles.tripStatus, { color: colors.success }]}>{trip.status}</Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    ))
                  )}
                </View>
              )}

              {/* PASSENGER: HISTORY TAB */}
              {activeTab === 'history' && (
                <View>
                  <TouchableOpacity 
                    style={styles.profileRow}
                    onPress={() => setActiveTab('profile')}
                  >
                    {profileImage ? (
                      <Image source={{ uri: profileImage }} style={styles.profileAvatarSmall} />
                    ) : (
                      <View style={[styles.profileAvatarPlaceholder, { backgroundColor: colors.primary }]}>
                        <Text style={styles.profileAvatarText}>
                          {userData.name ? userData.name.charAt(0).toUpperCase() : 'U'}
                        </Text>
                      </View>
                    )}
                    <View style={styles.userInfoContainer}>
                      <Text style={[styles.greeting, { color: colors.text }]}>Trip History</Text>
                      <Text style={[styles.userRole, { color: colors.textSecondary }]}>
                        {userData.name}
                      </Text>
                    </View>
                  </TouchableOpacity>
                  
                  {loadingTrips ? (
                    <View style={[styles.loadingContainer, { padding: 40 }]}>
                      <ActivityIndicator size="large" color={colors.primary} />
                      <Text style={[styles.loadingText, { color: colors.textSecondary, marginTop: 12 }]}>Loading trip history...</Text>
                    </View>
                  ) : recentTrips.length === 0 ? (
                    <View style={[styles.emptyTripsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <Text style={styles.emptyTripsIcon}>🚗</Text>
                      <Text style={[styles.emptyTripsTitle, { color: colors.text }]}>No trip history</Text>
                      <Text style={[styles.emptyTripsText, { color: colors.textSecondary }]}>
                        Your completed trips will appear here
                      </Text>
                    </View>
                  ) : (
                    recentTrips.map((trip, i) => (
                      <TouchableOpacity 
                        key={i} 
                        style={[styles.tripCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                        onPress={() => handleTripDetails(trip)}
                      >
                        <View style={styles.tripLeft}>
                          <Text style={[styles.tripRoute, { color: colors.text }]}>{trip.pickupLocation} → {trip.dropoffLocation}</Text>
                          <Text style={[styles.tripDate, { color: colors.textSecondary }]}>{formatDate(trip.date)}</Text>
                        </View>
                        <View style={styles.tripRight}>
                          <Text style={[styles.tripPrice, { color: colors.text }]}>₦{trip.fare?.toLocaleString()}</Text>
                          <View style={[styles.tripStatusBadge, { backgroundColor: colors.success + '20' }]}>
                            <Text style={[styles.tripStatus, { color: colors.success }]}>{trip.status}</Text>
                          </View>
                          <Text style={[styles.tripDetailsLink, { color: colors.primary }]}>Tap for details →</Text>
                        </View>
                      </TouchableOpacity>
                    ))
                  )}
                </View>
              )}

              {/* PASSENGER: WALLET TAB */}
              {activeTab === 'wallet' && (
                <View>
                  <TouchableOpacity 
                    style={styles.profileRow}
                    onPress={() => setActiveTab('profile')}
                  >
                    {profileImage ? (
                      <Image source={{ uri: profileImage }} style={styles.profileAvatarSmall} />
                    ) : (
                      <View style={[styles.profileAvatarPlaceholder, { backgroundColor: colors.primary }]}>
                        <Text style={styles.profileAvatarText}>
                          {userData.name ? userData.name.charAt(0).toUpperCase() : 'U'}
                        </Text>
                      </View>
                    )}
                    <View style={styles.userInfoContainer}>
                      <Text style={[styles.greeting, { color: colors.text }]}>My Wallet</Text>
                      <Text style={[styles.userRole, { color: colors.textSecondary }]}>
                        {userData.name}
                      </Text>
                    </View>
                  </TouchableOpacity>
                  
                  <View style={styles.walletCard}>
                    <Text style={styles.walletLabel}>Available Balance</Text>
                    <Text style={styles.walletAmount}>₦12,400.00</Text>
                    <TouchableOpacity style={styles.topupBtn}>
                      <Text style={styles.topupTxt}>+ Top Up</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Recent Transactions</Text>
                  {[
                    { desc: 'Ride to Victoria Island', amount: '-₦2,400', date: 'Today' },
                    { desc: 'Wallet Top Up', amount: '+₦5,000', date: 'Yesterday' },
                    { desc: 'Ride to Surulere', amount: '-₦1,800', date: '2 days ago' },
                  ].map((tx, i) => (
                    <View key={i} style={[styles.txCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <View style={styles.tripLeft}>
                        <Text style={[styles.tripRoute, { color: colors.text }]}>{tx.desc}</Text>
                        <Text style={[styles.tripDate, { color: colors.textSecondary }]}>{tx.date}</Text>
                      </View>
                      <Text style={[styles.tripPrice, { color: tx.amount.startsWith('+') ? colors.success : colors.text }]}>{tx.amount}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* PASSENGER: PROFILE TAB */}
              {activeTab === 'profile' && (
                <View>
                  <Text style={[styles.greeting, { color: colors.text }]}>My Profile</Text>
                  <View style={[styles.profileCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <TouchableOpacity onPress={showImagePickerOptions}>
                      {profileImage ? (
                        <Image source={{ uri: profileImage }} style={styles.profileAvatarImage} />
                      ) : (
                        <View style={[styles.profileAvatarPlaceholder, { backgroundColor: colors.primary }]}>
                          <Text style={styles.profileAvatarText}>🧑</Text>
                        </View>
                      )}
                      {uploadingImage && <ActivityIndicator style={styles.uploadIndicator} color={colors.primary} />}
                    </TouchableOpacity>
                    <Text style={[styles.profileName, { color: colors.text }]}>{userData.name}</Text>
                    <Text style={[styles.profileEmail, { color: colors.textSecondary }]}>{userData.email}</Text>
                    <Text style={[styles.profilePhone, { color: colors.textSecondary }]}>{userData.phone}</Text>
                    <TouchableOpacity onPress={showImagePickerOptions}>
                      <Text style={[styles.changePhotoText, { color: colors.primary }]}>Change Photo</Text>
                    </TouchableOpacity>
                  </View>

                  <LevelProgress
                    currentLevel={levelInfo.currentLevel}
                    nextLevel={levelInfo.nextLevel}
                    progress={levelInfo.progress}
                    tripsToNextLevel={levelInfo.tripsToNextLevel}
                    totalTrips={userStats.totalTrips}
                    role={userStats.role}
                  />

                  <TouchableOpacity 
                    style={[styles.menuItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    onPress={() => router.push('/scheduled-rides')}
                  >
                    <Text style={[styles.menuTxt, { color: colors.text }]}>📅 Scheduled Rides</Text>
                    <Text style={[styles.menuArrow, { color: colors.textSecondary }]}>›</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.menuItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    onPress={() => router.push('/ride-analytics')}
                  >
                    <Text style={[styles.menuTxt, { color: colors.text }]}>📊 Ride Analytics</Text>
                    <Text style={[styles.menuArrow, { color: colors.textSecondary }]}>›</Text>
                  </TouchableOpacity>

                  {['Edit Profile', 'Notifications', 'Help & Support', 'Terms of Service'].map((item, i) => (
                    <TouchableOpacity 
                      key={i} 
                      style={[styles.menuItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
                      onPress={() => {
                        if (item === 'Edit Profile') {
                          router.push('/edit-profile');
                        } else {
                          Alert.alert('Coming Soon', `${item} will be available soon!`);
                        }
                      }}
                    >
                      <Text style={[styles.menuTxt, { color: colors.text }]}>{item}</Text>
                      <Text style={[styles.menuArrow, { color: colors.textSecondary }]}>›</Text>
                    </TouchableOpacity>
                  ))}
                  
                  <TouchableOpacity 
                    style={[styles.menuItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    onPress={() => router.push('/emergency-contacts')}
                  >
                    <Text style={[styles.menuTxt, { color: colors.text }]}>🆘 Emergency Contacts</Text>
                    <Text style={[styles.menuArrow, { color: colors.textSecondary }]}>›</Text>
                  </TouchableOpacity>

                  <View style={styles.themeSection}>
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Appearance</Text>
                    <ThemeSwitcher />
                  </View>
                  <TouchableOpacity style={[styles.signOutBtn, { borderColor: colors.error }]} onPress={handleSignOut}>
                    <Text style={[styles.signOutTxt, { color: colors.error }]}>Sign Out</Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}

          {/* ==================== DRIVER VIEWS ==================== */}
          {role === 'Driver' && (
            <>
              {/* DRIVER: DASHBOARD TAB */}
              {activeTab === 'home' && (
                <View>
                  <View style={styles.driverHeader}>
                    <View style={styles.profileRow}>
                      {profileImage ? (
                        <Image source={{ uri: profileImage }} style={styles.profileAvatarSmall} />
                      ) : (
                        <View style={[styles.profileAvatarPlaceholder, { backgroundColor: colors.primary }]}>
                          <Text style={styles.profileAvatarText}>
                            {userData.name ? userData.name.charAt(0).toUpperCase() : 'U'}
                          </Text>
                        </View>
                      )}
                      <View>
                        <Text style={[styles.greeting, { color: colors.text }]}>
                          {getTimeBasedGreeting()} {getUserFirstName()} 👋
                        </Text>
                        <Text style={[styles.userRole, { color: colors.textSecondary }]}>
                          🚗 Driver
                        </Text>
                      </View>
                    </View>
                    <View style={styles.onlineRow}>
                      <Text style={[styles.onlineStatus, { color: isOnline ? colors.success : colors.error }]}>{isOnline ? '🟢 Online' : '🔴 Offline'}</Text>
                      <Switch 
                        value={isOnline} 
                        onValueChange={toggleOnlineStatus} 
                        trackColor={{ false: colors.border, true: colors.primary }} 
                        thumbColor={isOnline ? '#fff' : colors.textSecondary} 
                      />
                    </View>
                  </View>

                  {/* Vehicle Status Messages - ONLY FOR DRIVERS */}
                  {!loadingVehicle && !hasVehicle && (
                    <View style={[styles.warningCard, { backgroundColor: colors.error + '10', borderColor: colors.error, marginBottom: 16 }]}>
                      <Text style={styles.warningIcon}>🚗</Text>
                      <Text style={[styles.warningTitle, { color: colors.text }]}>Vehicle Not Registered</Text>
                      <Text style={[styles.warningText, { color: colors.textSecondary }]}>
                        Please register your vehicle before going online.
                      </Text>
                      <TouchableOpacity 
                        style={[styles.warningButton, { backgroundColor: colors.primary }]}
                        onPress={() => router.push('/vehicle-registration')}
                      >
                        <Text style={styles.warningButtonText}>Register Vehicle</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {!loadingVehicle && hasVehicle && !vehicleVerified && (
                    <View style={[styles.warningCard, { backgroundColor: colors.warning + '10', borderColor: colors.warning, marginBottom: 16 }]}>
                      <Text style={styles.warningIcon}>⏳</Text>
                      <Text style={[styles.warningTitle, { color: colors.text }]}>Vehicle Pending Verification</Text>
                      <Text style={[styles.warningText, { color: colors.textSecondary }]}>
                        Your vehicle is pending verification. You cannot go online until verified.
                      </Text>
                    </View>
                  )}

                  {!loadingVehicle && hasVehicle && vehicleVerified && (
                    <View style={[styles.successCard, { backgroundColor: colors.success + '10', borderColor: colors.success, marginBottom: 16 }]}>
                      <Text style={styles.successIcon}>✅</Text>
                      <Text style={[styles.successTitle, { color: colors.text }]}>Vehicle Verified</Text>
                      <Text style={[styles.successText, { color: colors.textSecondary }]}>
                        {vehicleInfo?.vehicleType} • {vehicleInfo?.vehiclePlate} • {vehicleInfo?.vehicleColor} {vehicleInfo?.vehicleModel}
                      </Text>
                    </View>
                  )}

                  <LevelProgress
                    currentLevel={levelInfo.currentLevel}
                    nextLevel={levelInfo.nextLevel}
                    progress={levelInfo.progress}
                    tripsToNextLevel={levelInfo.tripsToNextLevel}
                    totalTrips={userStats.totalTrips}
                    role={userStats.role}
                  />

                  <View style={styles.earningsRow}>
                    {[
                      { label: "Total Trips", value: userStats.totalTrips.toString() },
                      { label: "Today's Earnings", value: '₦14,200' },
                      { label: 'Rating', value: userStats.totalRating > 0 ? `${userStats.totalRating.toFixed(1)} ⭐` : 'New' },
                    ].map((stat, i) => (
                      <View key={i} style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <Text style={[styles.statValue, { color: colors.primary }]}>{stat.value}</Text>
                        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{stat.label}</Text>
                      </View>
                    ))}
                  </View>

                  {isOnline && hasVehicle && vehicleVerified && (
                    <TouchableOpacity 
                      style={[styles.viewRequestsBtn, { backgroundColor: colors.primary }]}
                      onPress={() => router.push('/driver-requests')}
                    >
                      <Text style={styles.viewRequestsBtnText}>🚗 View Available Ride Requests</Text>
                    </TouchableOpacity>
                  )}

                  {isOnline && (!hasVehicle || !vehicleVerified) && (
                    <TouchableOpacity 
                      style={[styles.viewRequestsBtn, { backgroundColor: colors.textSecondary, opacity: 0.5 }]}
                      disabled={true}
                    >
                      <Text style={styles.viewRequestsBtnText}>
                        {!hasVehicle ? 'Complete Vehicle Registration First' : 'Awaiting Vehicle Verification'}
                      </Text>
                    </TouchableOpacity>
                  )}

                  {!isOnline && hasVehicle && vehicleVerified && (
                    <View style={[styles.offlineCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <Text style={styles.offlineIcon}>😴</Text>
                      <Text style={[styles.offlineTxt, { color: colors.text }]}>You are offline</Text>
                      <Text style={[styles.offlineSub, { color: colors.textSecondary }]}>
                        Toggle online to see and accept ride requests
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {/* DRIVER: EARNINGS TAB */}
              {activeTab === 'history' && (
                <View>
                  <Text style={[styles.greeting, { color: colors.text }]}>Earnings</Text>
                  <View style={styles.walletCard}>
                    <Text style={styles.walletLabel}>Total Earned</Text>
                    <Text style={styles.walletAmount}>₦84,200.00</Text>
                    <TouchableOpacity style={styles.topupBtn}>
                      <Text style={styles.topupTxt}>Withdraw</Text>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity 
                    style={[styles.menuItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    onPress={() => router.push('/driver-analytics')}
                  >
                    <Text style={[styles.menuTxt, { color: colors.text }]}>📊 Driver Performance Analytics</Text>
                    <Text style={[styles.menuArrow, { color: colors.textSecondary }]}>›</Text>
                  </TouchableOpacity>

                  {recentTrips.map((trip, i) => (
                    <TouchableOpacity 
                      key={i} 
                      style={[styles.tripCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                      onPress={() => handleTripDetails(trip)}
                    >
                      <View style={styles.tripLeft}>
                        <Text style={[styles.tripRoute, { color: colors.text }]}>{trip.pickupLocation} → {trip.dropoffLocation}</Text>
                        <Text style={[styles.tripDate, { color: colors.textSecondary }]}>{formatDate(trip.date)}</Text>
                      </View>
                      <View style={styles.tripRight}>
                        <Text style={[styles.tripPrice, { color: colors.success }]}>₦{trip.fare?.toLocaleString()}</Text>
                        <Text style={[styles.tripDetailsLink, { color: colors.primary }]}>Tap for details →</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                  
                  <TouchableOpacity 
                    style={[styles.menuItem, { backgroundColor: colors.surface, borderColor: colors.border, marginBottom: 16 }]}
                    onPress={() => router.push('/emergency-contacts')}
                  >
                    <Text style={[styles.menuTxt, { color: colors.text }]}>🆘 Emergency Contacts</Text>
                    <Text style={[styles.menuArrow, { color: colors.textSecondary }]}>›</Text>
                  </TouchableOpacity>

                  <View style={styles.themeSection}>
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Appearance</Text>
                    <ThemeSwitcher />
                  </View>
                </View>
              )}

              {/* DRIVER: PROFILE TAB */}
              {activeTab === 'profile' && (
                <View>
                  <Text style={[styles.greeting, { color: colors.text }]}>Driver Profile</Text>
                  <View style={[styles.profileCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <TouchableOpacity onPress={showImagePickerOptions}>
                      {profileImage ? (
                        <Image source={{ uri: profileImage }} style={styles.profileAvatarImage} />
                      ) : (
                        <View style={[styles.profileAvatarPlaceholder, { backgroundColor: colors.primary }]}>
                          <Text style={styles.profileAvatarText}>🚗</Text>
                        </View>
                      )}
                      {uploadingImage && <ActivityIndicator style={styles.uploadIndicator} color={colors.primary} />}
                    </TouchableOpacity>
                    <Text style={[styles.profileName, { color: colors.text }]}>{userData.name}</Text>
                    <Text style={[styles.profileEmail, { color: colors.textSecondary }]}>{userData.email}</Text>
                    <Text style={[styles.profilePhone, { color: colors.textSecondary }]}>{userData.phone}</Text>
                    <TouchableOpacity onPress={showImagePickerOptions}>
                      <Text style={[styles.changePhotoText, { color: colors.primary }]}>Change Photo</Text>
                    </TouchableOpacity>
                  </View>

                  <LevelProgress
                    currentLevel={levelInfo.currentLevel}
                    nextLevel={levelInfo.nextLevel}
                    progress={levelInfo.progress}
                    tripsToNextLevel={levelInfo.tripsToNextLevel}
                    totalTrips={userStats.totalTrips}
                    role={userStats.role}
                  />

                  {/* Vehicle Registration Menu Item */}
                  <TouchableOpacity 
                    style={[styles.menuItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    onPress={() => router.push('/vehicle-registration')}
                  >
                    <Text style={[styles.menuTxt, { color: colors.text }]}>🚗 Vehicle Registration</Text>
                    <Text style={[styles.menuArrow, { color: colors.textSecondary }]}>›</Text>
                  </TouchableOpacity>

                  {/* Documents & Verification Menu Item */}
                  <TouchableOpacity 
                    style={[styles.menuItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    onPress={() => router.push('/driver-documents')}
                  >
                    <Text style={[styles.menuTxt, { color: colors.text }]}>📋 Documents & Verification</Text>
                    <Text style={[styles.menuArrow, { color: colors.textSecondary }]}>›</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.menuItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    onPress={() => router.push('/driver-analytics')}
                  >
                    <Text style={[styles.menuTxt, { color: colors.text }]}>📊 Driver Performance Analytics</Text>
                    <Text style={[styles.menuArrow, { color: colors.textSecondary }]}>›</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.menuItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    onPress={() => router.push('/driver-requests')}
                  >
                    <Text style={[styles.menuTxt, { color: colors.text }]}>🚗 View Ride Requests</Text>
                    <Text style={[styles.menuArrow, { color: colors.textSecondary }]}>›</Text>
                  </TouchableOpacity>

                  {['Edit Profile', 'Documents', 'Help & Support'].map((item, i) => (
                    <TouchableOpacity 
                      key={i} 
                      style={[styles.menuItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
                      onPress={() => {
                        if (item === 'Edit Profile') {
                          router.push('/edit-profile');
                        } else {
                          Alert.alert('Coming Soon', `${item} will be available soon!`);
                        }
                      }}
                    >
                      <Text style={[styles.menuTxt, { color: colors.text }]}>{item}</Text>
                      <Text style={[styles.menuArrow, { color: colors.textSecondary }]}>›</Text>
                    </TouchableOpacity>
                  ))}
                  
                  <TouchableOpacity 
                    style={[styles.menuItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    onPress={() => router.push('/emergency-contacts')}
                  >
                    <Text style={[styles.menuTxt, { color: colors.text }]}>🆘 Emergency Contacts</Text>
                    <Text style={[styles.menuArrow, { color: colors.textSecondary }]}>›</Text>
                  </TouchableOpacity>

                  <View style={styles.themeSection}>
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Appearance</Text>
                    <ThemeSwitcher />
                  </View>
                  <TouchableOpacity style={[styles.signOutBtn, { borderColor: colors.error }]} onPress={handleSignOut}>
                    <Text style={[styles.signOutTxt, { color: colors.error }]}>Sign Out</Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}
        </ScrollView>

        {/* Bottom Navigation (tabs only) */}
        <View style={[
          styles.navBar, 
          { 
            borderTopColor: colors.border,
            paddingBottom: insets.bottom + 15,
            paddingTop: 12,
          }
        ]}>
          <View style={styles.navItems}>
            {(role === 'Passenger'
              ? [
                  { id: 'home', icon: '🏠', label: 'Home' },
                  { id: 'history', icon: '🕓', label: 'History' },
                  { id: 'wallet', icon: '💳', label: 'Wallet' },
                  { id: 'profile', icon: '👤', label: 'Profile' },
                ]
              : [
                  { id: 'home', icon: '🚗', label: 'Dashboard' },
                  { id: 'history', icon: '💰', label: 'Earnings' },
                  { id: 'profile', icon: '👤', label: 'Profile' },
                ]
            ).map(tab => (
              <TouchableOpacity key={tab.id} style={styles.navItem} onPress={() => setActiveTab(tab.id)}>
                <Text style={styles.navIcon}>{tab.icon}</Text>
                <Text style={[styles.navLabel, { color: activeTab === tab.id ? colors.primary : colors.textSecondary }]}>{tab.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      <FavoritePlacesModal
        visible={showFavoritePlaces}
        onClose={() => setShowFavoritePlaces(false)}
        onSelectPlace={handleSelectFavoritePlace}
      />

      <TripDetailsModalComponent 
        visible={showTripDetailsModal}
        onClose={() => setShowTripDetailsModal(false)}
        selectedTrip={selectedTrip}
        role={role}
        colors={colors}
        formatFullDateTime={formatFullDateTime}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    zIndex: 10,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  profileBtn: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    alignItems: 'center', 
    justifyContent: 'center',
    borderWidth: 1,
    overflow: 'hidden',
  },
  profileAvatarSmall: { width: 40, height: 40, borderRadius: 20 },
  profileTxt: { fontSize: 20 },
  bottomSheet: { 
    flex: 1,
    borderTopLeftRadius: 28, 
    borderTopRightRadius: 28, 
    borderTopWidth: 1, 
    paddingHorizontal: 20, 
    paddingTop: 20,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  profileAvatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  profileAvatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 8,
  },
  userInfoContainer: {
    flex: 1,
  },
  userRole: {
    fontSize: 12,
    marginTop: 2,
  },
  greeting: { fontSize: 22, fontWeight: '800', marginBottom: 0 },
  question: { fontSize: 14, marginBottom: 16 },
  searchBar: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 16, gap: 10 },
  searchIcon: { fontSize: 16 },
  searchTxt: { fontSize: 14 },
  favoriteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 16, gap: 8 },
  favoriteIcon: { fontSize: 18 },
  favoriteText: { fontSize: 14, fontWeight: '600' },
  sectionTitle: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  rideRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  rideCard: { flex: 1, borderRadius: 14, borderWidth: 1, padding: 12, alignItems: 'center' },
  rideIcon: { fontSize: 28, marginBottom: 4 },
  rideName: { fontSize: 12, fontWeight: '700' },
  ridePrice: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  rideTime: { fontSize: 10, marginTop: 2 },
  tripCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1 },
  tripLeft: { flex: 1 },
  tripRight: { alignItems: 'flex-end' },
  tripRoute: { fontSize: 13, fontWeight: '600' },
  tripDate: { fontSize: 11, marginTop: 2 },
  tripPrice: { fontSize: 13, fontWeight: '700' },
  tripStatusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, marginTop: 4 },
  tripStatus: { fontSize: 10, fontWeight: '600' },
  tripDetailsLink: { fontSize: 10, marginTop: 4, fontWeight: '600' },
  emptyTripsCard: { alignItems: 'center', padding: 30, borderRadius: 16, borderWidth: 1, marginVertical: 10 },
  emptyTripsIcon: { fontSize: 48, marginBottom: 12, opacity: 0.5 },
  emptyTripsTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  emptyTripsText: { fontSize: 12, textAlign: 'center' },
  loadingContainer: { alignItems: 'center', justifyContent: 'center', padding: 20 },
  loadingText: { fontSize: 12 },
  walletCard: { backgroundColor: '#0EA5E9', borderRadius: 16, padding: 20, marginBottom: 20, alignItems: 'center' },
  walletLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 12 },
  walletAmount: { color: '#fff', fontSize: 32, fontWeight: '800', marginVertical: 8 },
  topupBtn: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20 },
  topupTxt: { color: '#fff', fontWeight: '700', fontSize: 13 },
  txCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1 },
  profileCard: { borderRadius: 16, padding: 20, alignItems: 'center', marginBottom: 20, borderWidth: 1 },
  profileName: { fontSize: 18, fontWeight: '700' },
  profileEmail: { fontSize: 13, marginTop: 4 },
  profilePhone: { fontSize: 13, marginTop: 2 },
  changePhotoText: { fontSize: 12, marginTop: 8, textDecorationLine: 'underline' },
  uploadIndicator: { position: 'absolute', top: 30, left: 30 },
  menuItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: 12, padding: 16, marginBottom: 10, borderWidth: 1 },
  menuTxt: { fontSize: 14 },
  menuArrow: { fontSize: 20 },
  signOutBtn: { borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 8, borderWidth: 1, marginBottom: 20 },
  signOutTxt: { fontSize: 15, fontWeight: '700' },
  driverHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  onlineRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  onlineStatus: { fontSize: 13, fontWeight: '600' },
  earningsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  statCard: { flex: 1, borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1 },
  statValue: { fontSize: 16, fontWeight: '800' },
  statLabel: { fontSize: 9, marginTop: 4, textAlign: 'center' },
  viewRequestsBtn: { borderRadius: 14, padding: 16, alignItems: 'center', marginBottom: 16 },
  viewRequestsBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  offlineCard: { borderRadius: 16, padding: 24, alignItems: 'center', borderWidth: 1 },
  offlineIcon: { fontSize: 40, marginBottom: 12 },
  offlineTxt: { fontSize: 16, fontWeight: '700' },
  offlineSub: { fontSize: 12, textAlign: 'center', marginTop: 4 },
  themeSection: { marginTop: 16, marginBottom: 16 },
  navBar: { 
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12, 
    borderTopWidth: 1, 
    marginTop: 8,
    backgroundColor: 'transparent',
  },
  navItems: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flex: 1,
  },
  navItem: { alignItems: 'center' },
  navIcon: { fontSize: 20 },
  navLabel: { fontSize: 10, fontWeight: '600', marginTop: 2 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, maxHeight: '85%', borderWidth: 1 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingBottom: 12, borderBottomWidth: 1 },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  modalClose: { fontSize: 20, fontWeight: '600' },
  modalButton: { borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 20 },
  modalButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  tripInfoBox: { borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1 },
  tripInfoTitle: { fontSize: 14, fontWeight: '700', marginBottom: 12 },
  tripInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  tripInfoLabel: { fontSize: 13, width: 80 },
  tripInfoValue: { fontSize: 13, fontWeight: '600', flex: 1 },
  dotGreen: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#10B981', marginRight: 4 },
  dotRed: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#EF4444', marginRight: 4 },
  detailsBox: { borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1 },
  detailsTitle: { fontSize: 14, fontWeight: '700', marginBottom: 12 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  detailLabel: { fontSize: 12 },
  detailValue: { fontSize: 12, fontWeight: '600' },
  ratingStars: { flexDirection: 'row', gap: 2 },
  ratingStarSmall: { fontSize: 14 },
  warningCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  warningIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  warningText: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 16,
  },
  warningButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  warningButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  successCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  successIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  successTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  successText: {
    fontSize: 12,
    textAlign: 'center',
  },
});