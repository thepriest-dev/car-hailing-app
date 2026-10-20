import { router, useLocalSearchParams } from 'expo-router';
import { ref, set, push, get } from 'firebase/database';
import { useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Platform,
  Modal,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../config/firebase';
import { useTheme } from '../contexts/ThemeContext';
import RideOptions from '../components/RideOptions';
import ScheduleRideModal from '../components/ScheduleRideModal';
import PromoCodeInput from '../components/PromoCodeInput';
import SplitFareModal from '../components/SplitFareModal';
import MapPlaceholder from './MapPlaceholder';
import Logo from '../components/Logo';
import DateTimePickerModal from '../components/DateTimePicker';
import MultiStopInput from '../components/MultiStopInput';
import {
  calculateRealisticFare,
  getSurgeLevelName,
  getSurgeColor,
} from '../utils/pricingEngine';

interface Stop {
  id: string;
  address: string;
  order: number;
  latitude?: number;
  longitude?: number;
}

interface Place {
  id: string;
  description: string;
  lat: number;
  lng: number;
}

type PaymentMethod = 'cash' | 'card' | 'wallet';

const DEFAULT_COORDS = {
  lat: 6.5244,
  lng: 3.3792,
};

// Comprehensive Lagos coordinates for autocomplete
const POPULAR_PLACES: Place[] = [
  { id: '1', description: 'Ikeja, Lagos', lat: 6.6018, lng: 3.3515 },
  { id: '2', description: 'Victoria Island, Lagos', lat: 6.4281, lng: 3.4216 },
  { id: '3', description: 'Lekki Phase 1, Lagos', lat: 6.4365, lng: 3.4519 },
  { id: '4', description: 'Lekki, Lagos', lat: 6.4703, lng: 3.5788 },
  { id: '5', description: 'Surulere, Lagos', lat: 6.5014, lng: 3.3418 },
  { id: '6', description: 'Yaba, Lagos', lat: 6.5127, lng: 3.3786 },
  { id: '7', description: 'Maryland, Lagos', lat: 6.5891, lng: 3.3554 },
  { id: '8', description: 'Magodo, Lagos', lat: 6.5972, lng: 3.3814 },
  { id: '9', description: 'Ogba, Lagos', lat: 6.6130, lng: 3.3180 },
  { id: '10', description: 'Agege, Lagos', lat: 6.6159, lng: 3.3271 },
  { id: '11', description: 'Ajah, Lagos', lat: 6.4722, lng: 3.5849 },
  { id: '12', description: 'GRA Ikeja, Lagos', lat: 6.5949, lng: 3.3568 },
  { id: '13', description: 'Allen Avenue, Ikeja', lat: 6.5988, lng: 3.3496 },
  { id: '14', description: 'MMIA Airport, Lagos', lat: 6.5774, lng: 3.3211 },
  { id: '15', description: 'Ikeja City Mall', lat: 6.6054, lng: 3.3496 },
  { id: '16', description: 'Palms Mall, Lekki', lat: 6.4402, lng: 3.4398 },
  { id: '17', description: 'University of Lagos', lat: 6.5176, lng: 3.3863 },
  { id: '18', description: 'CMS, Lagos Island', lat: 6.4503, lng: 3.3889 },
  { id: '19', description: 'TBS, Lagos', lat: 6.4482, lng: 3.4141 },
  { id: '20', description: 'National Stadium, Surulere', lat: 6.4985, lng: 3.3629 },
  { id: '21', description: 'Oshodi, Lagos', lat: 6.5553, lng: 3.3472 },
  { id: '22', description: 'Mushin, Lagos', lat: 6.5289, lng: 3.3521 },
  { id: '23', description: 'Bariga, Lagos', lat: 6.5304, lng: 3.3845 },
  { id: '24', description: 'Ketu, Lagos', lat: 6.5931, lng: 3.3779 },
  { id: '25', description: 'Alimosho, Lagos', lat: 6.6101, lng: 3.2963 },
  { id: '26', description: 'Ikorodu, Lagos', lat: 6.6165, lng: 3.5190 },
  { id: '27', description: 'Badagry, Lagos', lat: 6.4192, lng: 2.8837 },
  { id: '28', description: 'Epe, Lagos', lat: 6.5867, lng: 3.9833 },
  { id: '29', description: 'Marina, Lagos Island', lat: 6.4477, lng: 3.3955 },
  { id: '30', description: 'Apapa, Lagos', lat: 6.4487, lng: 3.3526 },
];

export default function BookingScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  
  const [pickup, setPickup] = useState('');
  const [destination, setDestination] = useState('');
  const [stops, setStops] = useState<Stop[]>([]);
  const [selectedRide, setSelectedRide] = useState('standard');
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDateTime, setScheduledDateTime] = useState<Date | null>(null);
  const [showMultiStop, setShowMultiStop] = useState(false);
  const [priceDetails, setPriceDetails] = useState<any>(null);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [destinationCoords, setDestinationCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [showPromoInput, setShowPromoInput] = useState(false);
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [promoCode, setPromoCode] = useState('');
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedRideDetails, setSelectedRideDetails] = useState<any>(null);
  const [walletBalance, setWalletBalance] = useState(12400);
  const [estimatedArrival, setEstimatedArrival] = useState<Date | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [pickupCoords, setPickupCoords] = useState<{ lat: number; lng: number; address: string } | null>(null);
  const [dropoffCoords, setDropoffCoords] = useState<{ lat: number; lng: number; address: string } | null>(null);
  
  // Autocomplete suggestions
  const [pickupSuggestions, setPickupSuggestions] = useState<Place[]>([]);
  const [destinationSuggestions, setDestinationSuggestions] = useState<Place[]>([]);
  const [showPickupSuggestions, setShowPickupSuggestions] = useState(false);
  const [showDestinationSuggestions, setShowDestinationSuggestions] = useState(false);
  const [activeInput, setActiveInput] = useState<'pickup' | 'destination' | null>(null);

  const rideOptionsMap = {
    standard: { name: 'Standard', icon: '🚗', multiplier: 1, description: 'Economy rides for daily commutes', time: 3, capacity: 4 },
    comfort: { name: 'Comfort', icon: '🚙', multiplier: 1.67, description: 'Extra legroom, newer cars', time: 4, capacity: 4 },
    business: { name: 'Business', icon: '🚘', multiplier: 2.92, description: 'Premium vehicles for business travel', time: 5, capacity: 4 },
    luxury: { name: 'Luxury', icon: '🏎️', multiplier: 5, description: 'Luxury vehicles with professional drivers', time: 6, capacity: 4 },
  };

  useEffect(() => {
    loadUserData();
    getCurrentLocationForPricing();
    loadWalletBalance();
    
    if (params.pickup) setPickup(params.pickup.toString());
    if (params.destination) setDestination(params.destination.toString());
    if (params.preselectedRide) setSelectedRide(params.preselectedRide.toString());
  }, []);

  useEffect(() => {
    if (currentLocation && destinationCoords) {
      updatePricing();
    }
  }, [selectedRide, stops.length, currentLocation, destinationCoords, promoDiscount]);

  const loadWalletBalance = async () => {
    const currentUser = auth.currentUser;
    if (currentUser) {
      const userRef = ref(db, `users/${currentUser.uid}/walletBalance`);
      const snapshot = await get(userRef);
      if (snapshot.exists()) {
        setWalletBalance(snapshot.val());
      }
    }
  };

  const getCurrentLocationForPricing = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setCurrentLocation({
          lat: location.coords.latitude,
          lng: location.coords.longitude,
        });
      } else {
        setCurrentLocation(DEFAULT_COORDS);
      }
    } catch (error) {
      setCurrentLocation(DEFAULT_COORDS);
    }
  };

  const updatePricing = () => {
    if (!currentLocation || !destinationCoords) return;
    
    const currentHour = new Date().getHours();
    const surgeLevel = 'normal';
    
    const pricing = calculateRealisticFare(
      selectedRide,
      currentLocation.lat,
      currentLocation.lng,
      destinationCoords.lat,
      destinationCoords.lng,
      stops.length,
      surgeLevel,
      currentHour
    );
    
    let finalTotal = pricing.totalFare;
    let discountAmount = 0;
    
    if (promoDiscount > 0) {
      discountAmount = Math.round(pricing.totalFare * (promoDiscount / 100));
      finalTotal = pricing.totalFare - discountAmount;
    }
    
    setPriceDetails({
      ...pricing,
      originalFare: pricing.totalFare,
      totalFare: finalTotal,
      discountAmount: discountAmount,
      promoDiscount: promoDiscount,
      promoCode: promoCode,
    });
    
    const arrivalTime = new Date();
    const rideTime = rideOptionsMap[selectedRide as keyof typeof rideOptionsMap]?.time || 3;
    arrivalTime.setMinutes(arrivalTime.getMinutes() + rideTime + Math.ceil(pricing.distance / 30 * 60));
    setEstimatedArrival(arrivalTime);
    setDistance(pricing.distance);
  };

  const loadUserData = async () => {
    const currentUser = auth.currentUser;
    if (currentUser) {
      const userRef = ref(db, `users/${currentUser.uid}`);
      const snapshot = await get(userRef);
      if (snapshot.exists()) {
        setUserData(snapshot.val());
      }
    }
  };

  const generateTripCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  const searchPlaces = (text: string, type: 'pickup' | 'destination') => {
    if (text.length < 2) {
      if (type === 'pickup') {
        setPickupSuggestions([]);
        setShowPickupSuggestions(false);
      } else {
        setDestinationSuggestions([]);
        setShowDestinationSuggestions(false);
      }
      return;
    }

    const lowerText = text.toLowerCase();
    const results = POPULAR_PLACES.filter(place => 
      place.description.toLowerCase().includes(lowerText)
    );
    
    if (type === 'pickup') {
      setPickupSuggestions(results.slice(0, 8));
      setShowPickupSuggestions(results.length > 0);
    } else {
      setDestinationSuggestions(results.slice(0, 8));
      setShowDestinationSuggestions(results.length > 0);
    }
  };

  const selectPickupPlace = (place: Place) => {
    setPickup(place.description);
    setPickupCoords({ lat: place.lat, lng: place.lng, address: place.description });
    setCurrentLocation({ lat: place.lat, lng: place.lng });
    setPickupSuggestions([]);
    setShowPickupSuggestions(false);
    setActiveInput(null);
    console.log('📍 Pickup selected:', { lat: place.lat, lng: place.lng, address: place.description });
  };

  const selectDestinationPlace = (place: Place) => {
    setDestination(place.description);
    setDestinationCoords({ lat: place.lat, lng: place.lng });
    setDropoffCoords({ lat: place.lat, lng: place.lng, address: place.description });
    setDestinationSuggestions([]);
    setShowDestinationSuggestions(false);
    setActiveInput(null);
    console.log('📍 Destination selected:', { lat: place.lat, lng: place.lng, address: place.description });
  };

  const getCurrentLocation = async () => {
    setLocationLoading(true);
    
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Please allow location access to use current location.');
        setLocationLoading(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const { latitude, longitude } = location.coords;
      
      const reverseGeocode = await Location.reverseGeocodeAsync({
        latitude: latitude,
        longitude: longitude,
      });

      let address = 'Current Location';
      if (reverseGeocode.length > 0) {
        const addr = reverseGeocode[0];
        const parts = [];
        if (addr.street) parts.push(addr.street);
        if (addr.city) parts.push(addr.city);
        address = parts.join(', ') || 'Current Location';
      }
      
      setPickup(address);
      setPickupCoords({ lat: latitude, lng: longitude, address: address });
      setCurrentLocation({ lat: latitude, lng: longitude });
      
      setPickupSuggestions([]);
      setShowPickupSuggestions(false);
      setActiveInput(null);

      console.log('📍 Current location set:', { latitude, longitude, address });
      
    } catch (error) {
      console.log('Error getting location:', error);
      Alert.alert('Error', 'Failed to get current location. Please enter manually.');
    } finally {
      setLocationLoading(false);
    }
  };

  const handlePickupChange = (text: string) => {
    setPickup(text);
    setActiveInput('pickup');
    searchPlaces(text, 'pickup');
  };

  const handleDestinationChange = (text: string) => {
    setDestination(text);
    setActiveInput('destination');
    searchPlaces(text, 'destination');
  };

  const handleAddStop = () => {
    const newStop: Stop = {
      id: Date.now().toString(),
      address: '',
      order: stops.length + 1,
    };
    setStops([...stops, newStop]);
  };

  const handleRemoveStop = (id: string) => {
    setStops(stops.filter(stop => stop.id !== id));
  };

  const handleUpdateStop = (id: string, address: string) => {
    const foundPlace = POPULAR_PLACES.find(p => 
      p.description.toLowerCase().includes(address.toLowerCase())
    );
    
    setStops(stops.map(stop => 
      stop.id === id ? { 
        ...stop, 
        address,
        latitude: foundPlace?.lat,
        longitude: foundPlace?.lng
      } : stop
    ));
  };

  const handleScheduleRide = (date: Date) => {
    setScheduledDateTime(date);
    setIsScheduled(true);
    setShowScheduleModal(false);
    Alert.alert(
      'Ride Scheduled!',
      `Your VeloCity ride has been scheduled for ${date.toLocaleDateString()} at ${date.toLocaleTimeString()}. We'll notify you when a driver accepts.`,
      [{ text: 'OK' }]
    );
  };

  const handleApplyPromo = (code: string, discount: number) => {
    setPromoCode(code);
    setPromoDiscount(discount);
    setShowPromoInput(false);
  };

  const handleSplitFare = (participants: string[], amounts: number[]) => {
    Alert.alert(
      'Split Fare Request Sent',
      `Fare split between ${participants.length} people. They will receive a notification to pay their share.`,
      [{ text: 'OK' }]
    );
    setShowSplitModal(false);
  };

  const handleRideSelect = (ride: any) => {
    setSelectedRide(ride.id);
    setSelectedRideDetails(ride);
  };

  const handleBookRide = async () => {
    if (!pickup.trim()) {
      Alert.alert('Error', 'Please enter pickup location');
      return;
    }
    
    if (!destination.trim()) {
      Alert.alert('Error', 'Please enter destination');
      return;
    }

    const currentUser = auth.currentUser;
    if (!currentUser) {
      Alert.alert('Error', 'Please login to book a ride');
      router.push('/login');
      return;
    }

    if (!destinationCoords) {
      Alert.alert('Error', 'Please select a valid destination from the suggestions');
      return;
    }

    if (!priceDetails) {
      updatePricing();
      if (!priceDetails) {
        Alert.alert('Error', 'Unable to calculate fare. Please try again.');
        return;
      }
    }

    if (paymentMethod === 'wallet' && walletBalance < priceDetails.totalFare) {
      Alert.alert(
        'Insufficient Balance',
        `Your wallet balance is ₦${walletBalance.toLocaleString()}. Please add funds or choose another payment method.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Add Funds', onPress: () => Alert.alert('Coming Soon', 'Wallet funding will be available in the next update.') }
        ]
      );
      return;
    }

    setLoading(true);

    try {
      const rideData = {
        riderId: currentUser.uid,
        riderName: userData?.name || currentUser.email,
        riderPhone: userData?.phone || '',
        pickupLocation: pickup,
        dropoffLocation: destination,
        pickupLat: pickupCoords?.lat || currentLocation?.lat,
        pickupLng: pickupCoords?.lng || currentLocation?.lng,
        dropoffLat: dropoffCoords?.lat || destinationCoords?.lat,
        dropoffLng: dropoffCoords?.lng || destinationCoords?.lng,
        stops: stops.map((stop, index) => ({
          address: stop.address,
          order: index + 1,
          stopType: "intermediate",
          latitude: stop.latitude,
          longitude: stop.longitude,
        })),
        status: isScheduled ? 'pending' : 'searching',
        fare: priceDetails.totalFare,
        originalFare: priceDetails.originalFare,
        distanceKm: priceDetails.distance,
        rideType: selectedRide,
        tripCode: generateTripCode(),
        createdAt: new Date().toISOString(),
        numberOfStops: stops.length,
        paymentMethod: paymentMethod,
        promoCode: promoCode || null,
        promoDiscount: promoDiscount || null,
        discountAmount: priceDetails.discountAmount || 0,
        priceBreakdown: {
          baseFare: priceDetails.baseFare,
          distanceFare: priceDetails.distanceFare,
          timeFare: priceDetails.timeFare,
          stopFare: priceDetails.stopFare,
          surgeMultiplier: priceDetails.surgeMultiplier,
          surgeAmount: priceDetails.surgeAmount,
          promoDiscount: promoDiscount,
        },
        ...(isScheduled && scheduledDateTime && {
          scheduledDate: scheduledDateTime.toISOString(),
          scheduledTime: scheduledDateTime.toLocaleTimeString(),
        }),
      };

      if (paymentMethod === 'wallet') {
        const newBalance = walletBalance - priceDetails.totalFare;
        setWalletBalance(newBalance);
        await set(ref(db, `users/${currentUser.uid}/walletBalance`), newBalance);
      }

      const ridesRef = ref(db, isScheduled ? 'scheduled_rides' : 'rides');
      const newRideRef = push(ridesRef);
      await set(newRideRef, rideData);

      if (isScheduled) {
        Alert.alert(
          'Ride Scheduled!',
          'Your ride has been scheduled successfully. You will be notified when a driver accepts.',
          [{ text: 'OK', onPress: () => router.replace('/home') }]
        );
      } else {
        router.replace({
          pathname: '/finding',
          params: {
            rideId: newRideRef.key,
            pickup: pickup,
            destination: destination,
            fare: priceDetails.totalFare.toString(),
            tripCode: rideData.tripCode,
            rideType: selectedRide,
            numberOfStops: stops.length.toString(),
            paymentMethod: paymentMethod,
          }
        });
      }
    } catch (error) {
      console.error('Error booking ride:', error);
      Alert.alert('Error', 'Failed to book ride. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const PaymentMethodModal = () => (
    <Modal
      visible={showPaymentModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowPaymentModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Select Payment Method</Text>
            <TouchableOpacity onPress={() => setShowPaymentModal(false)}>
              <Text style={[styles.modalClose, { color: colors.textSecondary }]}>✕</Text>
            </TouchableOpacity>
          </View>

          {[
            { id: 'card', name: 'Credit/Debit Card', icon: '💳', description: 'Pay with card' },
            { id: 'wallet', name: 'VeloCity Wallet', icon: '👛', description: `Balance: ₦${walletBalance.toLocaleString()}` },
            { id: 'cash', name: 'Cash', icon: '💵', description: 'Pay driver in cash' },
          ].map((method) => (
            <TouchableOpacity
              key={method.id}
              style={[
                styles.paymentOption,
                { backgroundColor: colors.surface, borderColor: colors.border },
                paymentMethod === method.id && { borderColor: colors.primary, backgroundColor: colors.primary + '10' }
              ]}
              onPress={() => {
                setPaymentMethod(method.id as PaymentMethod);
                setShowPaymentModal(false);
              }}
            >
              <Text style={styles.paymentIcon}>{method.icon}</Text>
              <View style={styles.paymentInfo}>
                <Text style={[styles.paymentName, { color: colors.text }]}>{method.name}</Text>
                <Text style={[styles.paymentDescription, { color: colors.textSecondary }]}>{method.description}</Text>
              </View>
              {paymentMethod === method.id && (
                <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </Modal>
  );

  // Render suggestions as absolute positioned modal-like component
  const renderSuggestionsModal = () => {
    if (!showPickupSuggestions && !showDestinationSuggestions) return null;
    
    const suggestions = showPickupSuggestions ? pickupSuggestions : destinationSuggestions;
    const onSelect = showPickupSuggestions ? selectPickupPlace : selectDestinationPlace;
    
    return (
      <TouchableOpacity 
        style={styles.suggestionsOverlay}
        activeOpacity={1}
        onPress={() => {
          setShowPickupSuggestions(false);
          setShowDestinationSuggestions(false);
          setActiveInput(null);
        }}
      >
        <View style={[styles.suggestionsModal, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <ScrollView 
            style={styles.suggestionsScrollView}
            keyboardShouldPersistTaps="always"
          >
            {suggestions.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.suggestionItem, { borderBottomColor: colors.border }]}
                onPress={() => onSelect(item)}
              >
                <Text style={styles.suggestionIcon}>📍</Text>
                <Text style={[styles.suggestionText, { color: colors.text }]}>{item.description}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar style="light" backgroundColor="#0A1929" />
        
        <View style={[styles.header, { paddingTop: insets.top + 16, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={[styles.backIcon, { color: colors.text }]}>←</Text>
          </TouchableOpacity>
          <Logo size="small" showText={true} />
          <View style={{ width: 40 }} />
        </View>

        <MapPlaceholder 
          pickupLocation={pickupCoords ? { 
            lat: pickupCoords.lat, 
            lng: pickupCoords.lng, 
            address: pickupCoords.address 
          } : undefined}
          dropoffLocation={dropoffCoords ? { 
            lat: dropoffCoords.lat, 
            lng: dropoffCoords.lng, 
            address: dropoffCoords.address 
          } : undefined}
        />

        <ScrollView 
          style={styles.bottomSheet}
          contentContainerStyle={{ paddingBottom: insets.bottom + 30 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.locationCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.locationInput}>
              <View style={styles.pinColumn}>
                <View style={styles.greenDot} />
                <View style={styles.pinLine} />
                <View style={styles.redDot} />
              </View>
              <View style={styles.inputColumn}>
                <View style={styles.pickupContainer}>
                  <TextInput
                    style={[styles.pickupInput, { color: colors.text, borderBottomColor: colors.border }]}
                    placeholder="Pickup location"
                    placeholderTextColor={colors.textSecondary}
                    value={pickup}
                    onChangeText={handlePickupChange}
                    onFocus={() => {
                      if (pickup.length > 0) searchPlaces(pickup, 'pickup');
                    }}
                  />
                  <TouchableOpacity 
                    style={[styles.currentLocationBtn, { backgroundColor: colors.surfaceLight, borderColor: colors.primary }]}
                    onPress={getCurrentLocation}
                    disabled={locationLoading}
                  >
                    {locationLoading ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <>
                        <Text style={styles.locationIcon}>📍</Text>
                        <Text style={[styles.locationText, { color: colors.primary }]}>Current</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
                
                <TextInput
                  style={[styles.input, { color: colors.text, borderBottomColor: colors.border }]}
                  placeholder="Where are you going?"
                  placeholderTextColor={colors.textSecondary}
                  value={destination}
                  onChangeText={handleDestinationChange}
                  onFocus={() => {
                    if (destination.length > 0) searchPlaces(destination, 'destination');
                  }}
                />
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.multiStopToggle, { backgroundColor: colors.surface, borderColor: colors.primary }]}
            onPress={() => setShowMultiStop(!showMultiStop)}
          >
            <Text style={styles.multiStopIcon}>🚏</Text>
            <Text style={[styles.multiStopText, { color: colors.primary }]}>
              {showMultiStop ? 'Hide Stops' : 'Add Multiple Stops'}
            </Text>
            {stops.length > 0 && (
              <View style={[styles.stopCountBadge, { backgroundColor: colors.primary }]}>
                <Text style={styles.stopCountText}>{stops.length}</Text>
              </View>
            )}
          </TouchableOpacity>

          {showMultiStop && (
            <MultiStopInput
              stops={stops}
              destination={destination}
              onAddStop={handleAddStop}
              onRemoveStop={handleRemoveStop}
              onUpdateStop={handleUpdateStop}
              maxStops={5}
            />
          )}

          <RideOptions onSelect={handleRideSelect} selectedId={selectedRide} distanceKm={distance || 5} />

          {estimatedArrival && (
            <View style={[styles.etaCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={styles.etaIcon}>⏰</Text>
              <View style={styles.etaContent}>
                <Text style={[styles.etaLabel, { color: colors.textSecondary }]}>Estimated arrival</Text>
                <Text style={[styles.etaValue, { color: colors.text }]}>
                  {estimatedArrival.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            </View>
          )}

          {priceDetails && (
            <View style={[styles.priceBreakdownCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <TouchableOpacity style={styles.priceHeader} onPress={() => setShowPromoInput(!showPromoInput)}>
                <Text style={[styles.priceBreakdownTitle, { color: colors.text }]}>💰 Fare Breakdown</Text>
                {promoDiscount > 0 && (
                  <View style={styles.promoBadge}>
                    <Text style={styles.promoBadgeText}>{promoDiscount}% OFF</Text>
                  </View>
                )}
              </TouchableOpacity>
              
              <View style={styles.priceRow}>
                <Text style={[styles.priceLabel, { color: colors.textSecondary }]}>Base Fare</Text>
                <Text style={[styles.priceValue, { color: colors.text }]}>₦{priceDetails.baseFare.toLocaleString()}</Text>
              </View>
              
              <View style={styles.priceRow}>
                <Text style={[styles.priceLabel, { color: colors.textSecondary }]}>Distance ({priceDetails.distance} km)</Text>
                <Text style={[styles.priceValue, { color: colors.text }]}>₦{priceDetails.distanceFare.toLocaleString()}</Text>
              </View>
              
              <View style={styles.priceRow}>
                <Text style={[styles.priceLabel, { color: colors.textSecondary }]}>Time ({priceDetails.estimatedTime} min)</Text>
                <Text style={[styles.priceValue, { color: colors.text }]}>₦{priceDetails.timeFare.toLocaleString()}</Text>
              </View>
              
              {stops.length > 0 && (
                <View style={styles.priceRow}>
                  <Text style={[styles.priceLabel, { color: colors.textSecondary }]}>Stops ({stops.length})</Text>
                  <Text style={[styles.priceValue, { color: colors.warning }]}>₦{priceDetails.stopFare.toLocaleString()}</Text>
                </View>
              )}
              
              {priceDetails.surgeMultiplier > 1 && (
                <View style={[styles.surgeRow, { backgroundColor: getSurgeColor(priceDetails.surgeMultiplier) + '20' }]}>
                  <Text style={styles.surgeIcon}>⚡</Text>
                  <View style={styles.surgeContent}>
                    <Text style={[styles.surgeTitle, { color: getSurgeColor(priceDetails.surgeMultiplier) }]}>
                      {getSurgeLevelName(priceDetails.surgeMultiplier)}
                    </Text>
                    <Text style={[styles.surgeText, { color: colors.textSecondary }]}>
                      {priceDetails.surgeMultiplier}x multiplier
                    </Text>
                  </View>
                  <Text style={[styles.surgeAmount, { color: getSurgeColor(priceDetails.surgeMultiplier) }]}>
                    +₦{priceDetails.surgeAmount.toLocaleString()}
                  </Text>
                </View>
              )}

              {promoDiscount > 0 && priceDetails.discountAmount > 0 && (
                <View style={[styles.promoRow, { backgroundColor: colors.success + '20' }]}>
                  <Text style={styles.promoIcon}>🎉</Text>
                  <Text style={[styles.promoText, { color: colors.success }]}>
                    Promo {promoCode} - {promoDiscount}% OFF
                  </Text>
                  <Text style={[styles.promoAmount, { color: colors.success }]}>
                    -₦{priceDetails.discountAmount.toLocaleString()}
                  </Text>
                </View>
              )}
              
              <View style={styles.priceDivider} />
              
              <View style={styles.priceRow}>
                <Text style={[styles.totalLabel, { color: colors.text }]}>Total</Text>
                <Text style={[styles.totalAmount, { color: colors.success }]}>
                  ₦{priceDetails.totalFare.toLocaleString()}
                </Text>
              </View>
            </View>
          )}

          {showPromoInput && (
            <PromoCodeInput onApply={handleApplyPromo} />
          )}

          <View style={styles.actionButtonsRow}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.surface, borderColor: colors.primary }]}
              onPress={() => setShowSplitModal(true)}
            >
              <Text style={styles.actionIcon}>👥</Text>
              <Text style={[styles.actionText, { color: colors.primary }]}>Split</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.surface, borderColor: colors.primary }]}
              onPress={() => setShowPaymentModal(true)}
            >
              <Text style={styles.actionIcon}>
                {paymentMethod === 'card' ? '💳' : paymentMethod === 'wallet' ? '👛' : '💵'}
              </Text>
              <Text style={[styles.actionText, { color: colors.primary }]}>
                {paymentMethod === 'card' ? 'Card' : paymentMethod === 'wallet' ? 'Wallet' : 'Cash'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.surface, borderColor: colors.primary }]}
              onPress={() => setShowScheduleModal(true)}
            >
              <Text style={styles.actionIcon}>📅</Text>
              <Text style={[styles.actionText, { color: colors.primary }]}>
                {isScheduled ? 'Scheduled' : 'Later'}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.bookButton, { backgroundColor: colors.primary }]}
            onPress={handleBookRide}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.bookButtonText}>
                {isScheduled ? 'Schedule Ride' : `${selectedRideDetails?.name || 'Standard'} • ₦${priceDetails?.totalFare.toLocaleString() || '0'}`}
              </Text>
            )}
          </TouchableOpacity>

          <Text style={[styles.finePrint, { color: colors.textSecondary }]}>
            By booking, you agree to VeloCity's Terms of Service. Cancellation fees may apply.
          </Text>
        </ScrollView>

        {/* Suggestions as overlay modal - no nested scrolling! */}
        {renderSuggestionsModal()}

        <DateTimePickerModal
          visible={showScheduleModal}
          onClose={() => setShowScheduleModal(false)}
          onConfirm={handleScheduleRide}
          minimumDate={new Date()}
        />

        <SplitFareModal
          visible={showSplitModal}
          onClose={() => setShowSplitModal(false)}
          totalFare={priceDetails?.totalFare || 0}
          onSplit={handleSplitFare}
        />

        <PaymentMethodModal />
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backIcon: { fontSize: 28, fontWeight: '600' },
  bottomSheet: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
  locationCard: { borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1 },
  locationInput: { flexDirection: 'row', gap: 12 },
  pinColumn: { alignItems: 'center', width: 20 },
  greenDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#10B981' },
  pinLine: { width: 2, flex: 1, backgroundColor: '#334155', marginVertical: 4 },
  redDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#EF4444' },
  inputColumn: { flex: 1, gap: 8 },
  pickupContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pickupInput: { flex: 1, height: 50, fontSize: 16, borderBottomWidth: 1 },
  input: { height: 50, fontSize: 16, borderBottomWidth: 1 },
  currentLocationBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, gap: 4 },
  locationIcon: { fontSize: 12 },
  locationText: { fontSize: 11, fontWeight: '600' },
  multiStopToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 12, borderWidth: 1, gap: 8, marginBottom: 12 },
  multiStopIcon: { fontSize: 18 },
  multiStopText: { fontSize: 14, fontWeight: '600' },
  stopCountBadge: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  stopCountText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  suggestionsOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  suggestionsModal: {
    width: '90%',
    maxHeight: 300,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  suggestionsScrollView: {
    maxHeight: 300,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 0.5,
  },
  suggestionIcon: {
    fontSize: 16,
    marginRight: 12,
  },
  suggestionText: {
    fontSize: 14,
    flex: 1,
  },
  etaCard: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 12, gap: 12 },
  etaIcon: { fontSize: 24 },
  etaContent: { flex: 1 },
  etaLabel: { fontSize: 11 },
  etaValue: { fontSize: 16, fontWeight: '700' },
  priceBreakdownCard: { borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1 },
  priceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  priceBreakdownTitle: { fontSize: 14, fontWeight: '700' },
  promoBadge: { backgroundColor: '#10B981', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  promoBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  priceLabel: { fontSize: 13 },
  priceValue: { fontSize: 13, fontWeight: '600' },
  surgeRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 10, marginVertical: 8, gap: 10 },
  surgeIcon: { fontSize: 20 },
  surgeContent: { flex: 1 },
  surgeTitle: { fontSize: 13, fontWeight: '700' },
  surgeText: { fontSize: 11 },
  surgeAmount: { fontSize: 13, fontWeight: '700' },
  promoRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 10, marginVertical: 8, gap: 10 },
  promoIcon: { fontSize: 16 },
  promoText: { flex: 1, fontSize: 13, fontWeight: '600' },
  promoAmount: { fontSize: 13, fontWeight: '700' },
  priceDivider: { height: 1, backgroundColor: '#334155', marginVertical: 12 },
  totalLabel: { fontSize: 16, fontWeight: '700' },
  totalAmount: { fontSize: 20, fontWeight: '800' },
  actionButtonsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  actionButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 12, borderRadius: 12, borderWidth: 1 },
  actionIcon: { fontSize: 18 },
  actionText: { fontSize: 12, fontWeight: '600' },
  bookButton: { borderRadius: 14, padding: 16, alignItems: 'center', marginBottom: 12 },
  bookButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  finePrint: { fontSize: 10, textAlign: 'center', marginBottom: 20 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, borderWidth: 1 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  modalClose: { fontSize: 20, fontWeight: '600' },
  paymentOption: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 12, gap: 12 },
  paymentIcon: { fontSize: 28 },
  paymentInfo: { flex: 1 },
  paymentName: { fontSize: 15, fontWeight: '600' },
  paymentDescription: { fontSize: 12, marginTop: 2 },
});