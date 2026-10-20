import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import LiveMap from './LiveMap';
import LocationService, { DriverLocation } from '../services/locationService';

interface PassengerTripMapProps {
  driverId: string;
  pickupLocation: { latitude: number; longitude: number };
  dropoffLocation: { latitude: number; longitude: number };
  userLocation?: { latitude: number; longitude: number };
  onDriverNearby?: (distance: number) => void;
}

const PassengerTripMap: React.FC<PassengerTripMapProps> = ({
  driverId,
  pickupLocation,
  dropoffLocation,
  userLocation,
  onDriverNearby,
}) => {
  const [driverLocation, setDriverLocation] = useState<DriverLocation | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [eta, setEta] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showFullMap, setShowFullMap] = useState(false);

  useEffect(() => {
    if (!driverId) return;

    // Subscribe to driver location updates
    const unsubscribe = LocationService.subscribeToDriverLocation(
      driverId,
      (location) => {
        if (location) {
          setDriverLocation(location);
          
          // Calculate distance to pickup
          const dist = LocationService.calculateDistance(
            location.latitude,
            location.longitude,
            pickupLocation.latitude,
            pickupLocation.longitude
          );
          setDistance(dist);
          
          // Calculate ETA (assuming 30 km/h average speed)
          const estimatedEta = LocationService.estimateETA(dist, 30);
          setEta(estimatedEta);
          
          // Notify when driver is nearby (within 500 meters)
          if (dist < 0.5 && onDriverNearby) {
            onDriverNearby(dist);
          }
        }
        setIsLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [driverId, pickupLocation]);

  const formatDistance = (km: number): string => {
    if (km < 1) {
      return `${Math.round(km * 1000)} m`;
    }
    return `${km.toFixed(1)} km`;
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0EA5E9" />
        <Text style={styles.loadingText}>Loading driver location...</Text>
      </View>
    );
  }

  if (showFullMap) {
    return (
      <View style={styles.fullMapContainer}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setShowFullMap(false)}
        >
          <Ionicons name="chevron-down" size={24} color="#0EA5E9" />
        </TouchableOpacity>
        <LiveMap
          userLocation={userLocation}
          driverLocation={driverLocation}
          pickupLocation={pickupLocation}
          dropoffLocation={dropoffLocation}
          showUserMarker={true}
          showDriverMarker={true}
          showPickupMarker={true}
          showDropoffMarker={true}
          showRoute={true}
          interactive={true}
          height={800} // Use number instead of "100%"
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Mini Map Preview */}
      <TouchableOpacity
        style={styles.mapPreview}
        onPress={() => setShowFullMap(true)}
        activeOpacity={0.9}
      >
        <LiveMap
          userLocation={userLocation}
          driverLocation={driverLocation}
          pickupLocation={pickupLocation}
          dropoffLocation={dropoffLocation}
          showUserMarker={true}
          showDriverMarker={true}
          showPickupMarker={true}
          showDropoffMarker={false}
          interactive={false}
          height={200}
        />
        
        {/* Expand Icon */}
        <View style={styles.expandButton}>
          <Ionicons name="expand-outline" size={20} color="#fff" />
        </View>
      </TouchableOpacity>

      {/* Driver Info Card */}
      {driverLocation && (
        <View style={styles.infoCard}>
          <View style={styles.driverInfo}>
            <View style={styles.driverIcon}>
              <Ionicons name="car" size={24} color="#0EA5E9" />
            </View>
            <View style={styles.driverDetails}>
              <Text style={styles.driverTitle}>Driver is on the way</Text>
              <View style={styles.distanceContainer}>
                <Ionicons name="navigate" size={16} color="#6B7280" />
                <Text style={styles.distanceText}>
                  {formatDistance(distance || 0)} away
                </Text>
              </View>
              {eta && (
                <View style={styles.etaContainer}>
                  <Ionicons name="time-outline" size={16} color="#6B7280" />
                  <Text style={styles.etaText}>
                    ETA: {eta} minute{eta !== 1 ? 's' : ''}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Progress Bar */}
          {distance && distance < 2 && (
            <View style={styles.progressContainer}>
              <View 
                style={[
                  styles.progressBar, 
                  { width: `${Math.max(0, Math.min(100, (1 - distance / 2) * 100))}%` }
                ]} 
              />
            </View>
          )}

          {/* Nearby Alert */}
          {distance && distance < 0.3 && (
            <View style={styles.nearbyAlert}>
              <Ionicons name="alert-circle" size={20} color="#F59E0B" />
              <Text style={styles.nearbyText}>
                Driver is nearby! Get ready at pickup point
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  mapPreview: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
    margin: 16,
  },
  fullMapContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'white',
    zIndex: 1000,
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 1001,
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  expandButton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 8,
    borderRadius: 20,
  },
  infoCard: {
    backgroundColor: 'white',
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  driverInfo: {
    flexDirection: 'row',
    gap: 12,
  },
  driverIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E0F2FE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  driverDetails: {
    flex: 1,
    gap: 4,
  },
  driverTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  distanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  distanceText: {
    fontSize: 14,
    color: '#6B7280',
  },
  etaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  etaText: {
    fontSize: 14,
    color: '#6B7280',
  },
  progressContainer: {
    marginTop: 12,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 2,
  },
  nearbyAlert: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
  },
  nearbyText: {
    flex: 1,
    fontSize: 14,
    color: '#92400E',
    fontWeight: '500',
  },
});

export default PassengerTripMap;