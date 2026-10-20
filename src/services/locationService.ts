import * as Location from 'expo-location';
import { getDatabase, ref, set, onValue, off } from 'firebase/database';
import { auth } from '../config/firebase';

export interface LocationCoords {
  latitude: number;
  longitude: number;
  heading?: number;
  speed?: number;
  accuracy?: number;
}

export interface DriverLocation extends LocationCoords {
  driverId: string;
  rideId?: string;
  updatedAt: number;
  isOnline: boolean;
}

class LocationService {
  private watchSubscription: Location.LocationSubscription | null = null;
  private updateInterval: ReturnType<typeof setInterval> | null = null;
  private currentRideId: string | null = null;

  // Request location permissions
  async requestPermissions(): Promise<boolean> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('Location permission denied');
        return false;
      }
      
      // Request background permissions for drivers
      const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
      console.log('Background location permission:', backgroundStatus);
      
      return true;
    } catch (error) {
      console.error('Permission error:', error);
      return false;
    }
  }

  // Get current location once
  async getCurrentLocation(): Promise<LocationCoords | null> {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        heading: location.coords.heading || undefined,
        speed: location.coords.speed || undefined,
        accuracy: location.coords.accuracy || undefined,
      };
    } catch (error) {
      console.error('Error getting location:', error);
      return null;
    }
  }

  // Start watching driver's location (for drivers on trip)
  async startDriverTracking(rideId: string, updateFrequencyMs: number = 3000) {
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    this.currentRideId = rideId;
    
    // Get high-accuracy location updates
    this.watchSubscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: updateFrequencyMs,
        distanceInterval: 5, // Update every 5 meters
      },
      async (location) => {
        await this.updateDriverLocation(userId, rideId, {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          heading: location.coords.heading || undefined,
          speed: location.coords.speed || undefined,
          accuracy: location.coords.accuracy || undefined,
        });
      }
    );
  }

  // Update driver location in Firebase
  private async updateDriverLocation(
    driverId: string, 
    rideId: string, 
    coords: LocationCoords
  ) {
    const db = getDatabase();
    const locationRef = ref(db, `live_locations/${driverId}`);
    
    await set(locationRef, {
      ...coords,
      driverId,
      rideId,
      updatedAt: Date.now(),
      isOnline: true,
    });
  }

  // Stop driver tracking
  async stopDriverTracking() {
    if (this.watchSubscription) {
      this.watchSubscription.remove();
      this.watchSubscription = null;
    }
    
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    
    // Remove location from Firebase
    const userId = auth.currentUser?.uid;
    if (userId) {
      const db = getDatabase();
      const locationRef = ref(db, `live_locations/${userId}`);
      await set(locationRef, null);
    }
    
    this.currentRideId = null;
  }

  // Subscribe to driver location updates (for passengers)
  subscribeToDriverLocation(
    driverId: string, 
    onLocationUpdate: (location: DriverLocation | null) => void
  ): () => void {
    const db = getDatabase();
    const locationRef = ref(db, `live_locations/${driverId}`);
    
    onValue(locationRef, (snapshot) => {
      const location = snapshot.val();
      if (location) {
        onLocationUpdate(location as DriverLocation);
      } else {
        onLocationUpdate(null);
      }
    });
    
    // Return unsubscribe function
    return () => off(locationRef);
  }

  // Calculate distance between two coordinates (in km)
  calculateDistance(
    lat1: number, 
    lon1: number, 
    lat2: number, 
    lon2: number
  ): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // Estimate ETA in minutes based on distance and average speed
  estimateETA(distanceKm: number, avgSpeedKmph: number = 30): number {
    return Math.ceil((distanceKm / avgSpeedKmph) * 60);
  }

  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  // Geocode address to coordinates (using OpenStreetMap Nominatim - free)
  async geocodeAddress(address: string): Promise<LocationCoords | null> {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`
      );
      const data = await response.json();
      if (data && data[0]) {
        return {
          latitude: parseFloat(data[0].lat),
          longitude: parseFloat(data[0].lon),
        };
      }
      return null;
    } catch (error) {
      console.error('Geocoding error:', error);
      return null;
    }
  }

  // Reverse geocode coordinates to address
  async reverseGeocode(lat: number, lng: number): Promise<string> {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
      );
      const data = await response.json();
      return data.display_name || `${lat}, ${lng}`;
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      return `${lat}, ${lng}`;
    }
  }
}

export default new LocationService();