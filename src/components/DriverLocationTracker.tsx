import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import LocationService from '../services/locationService';
import { getDatabase, ref, set } from 'firebase/database';
import { auth } from '../config/firebase';

interface DriverLocationTrackerProps {
  rideId: string;
  onTrackingStarted?: () => void;
  onTrackingStopped?: () => void;
  onError?: (error: string) => void;
}

const DriverLocationTracker: React.FC<DriverLocationTrackerProps> = ({
  rideId,
  onTrackingStarted,
  onTrackingStopped,
  onError,
}) => {
  const [isTracking, setIsTracking] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);

  useEffect(() => {
    checkPermissionsAndStart();
    return () => {
      if (isTracking) {
        stopTracking();
      }
    };
  }, [rideId]);

  const checkPermissionsAndStart = async () => {
    try {
      const granted = await LocationService.requestPermissions();
      if (granted) {
        setPermissionGranted(true);
        await startTracking();
      } else {
        const permError = 'Location permission is required for driver tracking';
        setError(permError);
        onError?.(permError);
      }
    } catch (err) {
      const errMsg = 'Failed to start location tracking';
      setError(errMsg);
      onError?.(errMsg);
    }
  };

  const startTracking = async () => {
    try {
      await LocationService.startDriverTracking(rideId, 3000); // Update every 3 seconds
      setIsTracking(true);
      setLastUpdate(new Date());
      onTrackingStarted?.();
      
      // Update driver status in database
      const db = getDatabase();
      const userId = auth.currentUser?.uid;
      if (userId) {
        const driverStatusRef = ref(db, `drivers/${userId}/currentRide`);
        await set(driverStatusRef, {
          rideId: rideId,
          isTracking: true,
          startedAt: Date.now(),
        });
      }
    } catch (err) {
      const errMsg = 'Failed to start location tracking';
      setError(errMsg);
      onError?.(errMsg);
    }
  };

  const stopTracking = async () => {
    try {
      await LocationService.stopDriverTracking();
      setIsTracking(false);
      onTrackingStopped?.();
      
      // Update driver status in database
      const db = getDatabase();
      const userId = auth.currentUser?.uid;
      if (userId) {
        const driverStatusRef = ref(db, `drivers/${userId}/currentRide`);
        await set(driverStatusRef, null);
      }
    } catch (err) {
      console.error('Error stopping tracking:', err);
    }
  };

  const manualUpdate = async () => {
    if (!isTracking) return;
    
    const location = await LocationService.getCurrentLocation();
    if (location) {
      setLastUpdate(new Date());
    }
  };

  if (!permissionGranted) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="location-outline" size={48} color="#EF4444" />
          <Text style={styles.errorText}>Location permission required</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={checkPermissionsAndStart}
          >
            <Text style={styles.retryButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={checkPermissionsAndStart}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.trackingInfo}>
        <View style={styles.statusContainer}>
          {isTracking ? (
            <>
              <View style={styles.activeDot} />
              <Text style={styles.activeText}>Sharing live location</Text>
            </>
          ) : (
            <>
              <View style={styles.inactiveDot} />
              <Text style={styles.inactiveText}>Starting tracking...</Text>
            </>
          )}
        </View>
        
        {isTracking && lastUpdate && (
          <View style={styles.updateInfo}>
            <Ionicons name="time-outline" size={16} color="#6B7280" />
            <Text style={styles.updateText}>
              Last update: {lastUpdate.toLocaleTimeString()}
            </Text>
          </View>
        )}

        {isTracking && (
          <TouchableOpacity style={styles.refreshButton} onPress={manualUpdate}>
            <Ionicons name="refresh-outline" size={20} color="#0EA5E9" />
            <Text style={styles.refreshText}>Update now</Text>
          </TouchableOpacity>
        )}

        {isTracking && (
          <ActivityIndicator size="small" color="#0EA5E9" style={styles.spinner} />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  trackingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  activeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
  },
  inactiveDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#F59E0B',
  },
  activeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
  },
  inactiveText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F59E0B',
  },
  updateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  updateText: {
    fontSize: 12,
    color: '#6B7280',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  refreshText: {
    fontSize: 12,
    color: '#0EA5E9',
    fontWeight: '500',
  },
  spinner: {
    marginLeft: 8,
  },
  errorContainer: {
    alignItems: 'center',
    gap: 12,
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#0EA5E9',
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: '600',
  },
});

export default DriverLocationTracker;