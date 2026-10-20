import { ref, onValue, off } from 'firebase/database';
import { db } from '../config/firebase';
import { Alert, Vibration, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

// Configure notifications for driver alerts
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

interface RideRequest {
  id: string;
  pickupLocation: string;
  dropoffLocation: string;
  fare: number;
  rideType: string;
  distanceKm: number;
  riderName: string;
  createdAt: string;
  numberOfStops?: number;
}

class DriverNotificationService {
  private listeners: { [key: string]: (() => void) | null } = {};
  private lastNotificationTime: number = 0;
  private notificationCooldown = 5000; // 5 seconds cooldown between notifications

  // Start listening for new ride requests
  startListeningForRideRequests(
    driverId: string,
    onNewRequest: (request: RideRequest) => void
  ) {
    // Listen to immediate rides
    const ridesRef = ref(db, 'rides');
    const ridesListener = onValue(ridesRef, (snapshot) => {
      const data = snapshot.val();
      const newRequests: RideRequest[] = [];
      
      if (data) {
        Object.keys(data).forEach((key) => {
          const ride = data[key];
          // Check for searching rides (not accepted yet)
          if (ride.status === 'searching' && !ride.driverId) {
            newRequests.push({
              id: key,
              pickupLocation: ride.pickupLocation,
              dropoffLocation: ride.dropoffLocation,
              fare: ride.fare,
              rideType: ride.rideType || 'standard',
              distanceKm: ride.distanceKm || 4.2,
              riderName: ride.riderName || 'Passenger',
              createdAt: ride.createdAt,
              numberOfStops: ride.numberOfStops || 0,
            });
          }
        });
      }
      
      // Sort by newest first
      newRequests.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      
      if (newRequests.length > 0) {
        onNewRequest(newRequests[0]); // Notify about the newest request
      }
    });
    
    this.listeners['rides'] = () => ridesListener();
    
    // Also listen to scheduled rides
    const scheduledRef = ref(db, 'scheduled_rides');
    const scheduledListener = onValue(scheduledRef, (snapshot) => {
      const data = snapshot.val();
      const newScheduledRequests: RideRequest[] = [];
      
      if (data) {
        Object.keys(data).forEach((key) => {
          const ride = data[key];
          if (ride.status === 'pending' && !ride.driverId) {
            newScheduledRequests.push({
              id: key,
              pickupLocation: ride.pickupLocation,
              dropoffLocation: ride.dropoffLocation,
              fare: ride.fare,
              rideType: ride.rideType || 'standard',
              distanceKm: ride.distanceKm || 4.2,
              riderName: ride.riderName || 'Passenger',
              createdAt: ride.createdAt,
              numberOfStops: ride.numberOfStops || 0,
            });
          }
        });
      }
      
      newScheduledRequests.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      
      if (newScheduledRequests.length > 0) {
        onNewRequest(newScheduledRequests[0]);
      }
    });
    
    this.listeners['scheduled_rides'] = () => scheduledListener();
  }

  // Stop listening for ride requests
  stopListening() {
    Object.keys(this.listeners).forEach((key) => {
      if (this.listeners[key]) {
        const refPath = key === 'rides' ? 'rides' : 'scheduled_rides';
        off(ref(db, refPath));
        this.listeners[key] = null;
      }
    });
  }

  // Show notification to driver
  async showRideRequestNotification(request: RideRequest, onAccept?: () => void) {
    const now = Date.now();
    if (now - this.lastNotificationTime < this.notificationCooldown) {
      return; // Don't spam notifications
    }
    this.lastNotificationTime = now;

    // Vibrate device
    Vibration.vibrate([500, 300, 500]);

    // Show in-app alert
    Alert.alert(
      '🚗 New Ride Request!',
      `📍 ${request.pickupLocation} → ${request.dropoffLocation}\n💰 Fare: ₦${request.fare.toLocaleString()}\n🚘 Ride: ${request.rideType}\n👤 Rider: ${request.riderName}`,
      [
        {
          text: 'Ignore',
          style: 'cancel',
        },
        {
          text: 'View Request',
          onPress: () => {
            if (onAccept) onAccept();
          },
        },
      ],
      { cancelable: true }
    );

    // Send push notification
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'New Ride Request!',
        body: `${request.riderName} needs a ride from ${request.pickupLocation} to ${request.dropoffLocation}`,
        data: { rideId: request.id, type: 'ride_request' },
        sound: true,
      },
      trigger: null, // Show immediately
    });
  }
}

export const driverNotificationService = new DriverNotificationService();