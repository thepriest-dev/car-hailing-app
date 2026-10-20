import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  TouchableOpacity,
  Text,
} from 'react-native';
import MapView, { Marker, UrlTile, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';

const { height: screenHeight } = Dimensions.get('window');

export interface LocationCoords {
  latitude: number;
  longitude: number;
  heading?: number;
}

export interface LiveMapProps {
  initialRegion?: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
  userLocation?: LocationCoords | null;
  driverLocation?: LocationCoords | null;
  pickupLocation?: LocationCoords | null;
  dropoffLocation?: LocationCoords | null;
  showUserMarker?: boolean;
  showDriverMarker?: boolean;
  showPickupMarker?: boolean;
  showDropoffMarker?: boolean;
  showRoute?: boolean;
  onMapReady?: () => void;
  onRegionChange?: (region: any) => void;
  interactive?: boolean;
  height?: number;
}

const LiveMap: React.FC<LiveMapProps> = ({
  initialRegion,
  userLocation,
  driverLocation,
  pickupLocation,
  dropoffLocation,
  showUserMarker = true,
  showDriverMarker = true,
  showPickupMarker = true,
  showDropoffMarker = true,
  showRoute = false,
  onMapReady,
  onRegionChange,
  interactive = true,
  height: propHeight = screenHeight * 0.5,
}) => {
  const mapRef = useRef<MapView>(null);
  const [isLoading, setIsLoading] = useState(true);

  const defaultRegion = {
    latitude: 6.5244,
    longitude: 3.3792,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  };

  useEffect(() => {
    if (mapRef.current && (userLocation || driverLocation || pickupLocation)) {
      setTimeout(() => {
        fitToMarkers();
      }, 500);
    }
  }, [userLocation, driverLocation, pickupLocation, dropoffLocation]);

  const fitToMarkers = () => {
    const locations: LocationCoords[] = [];
    if (showUserMarker && userLocation) locations.push(userLocation);
    if (showDriverMarker && driverLocation) locations.push(driverLocation);
    if (showPickupMarker && pickupLocation) locations.push(pickupLocation);
    if (showDropoffMarker && dropoffLocation) locations.push(dropoffLocation);

    if (locations.length > 0 && mapRef.current) {
      const firstLocation = locations[0];
      mapRef.current.animateToRegion({
        latitude: firstLocation.latitude,
        longitude: firstLocation.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    }
  };

  const centerOnUser = () => {
    if (userLocation && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    }
  };

  const centerOnDriver = () => {
    if (driverLocation && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: driverLocation.latitude,
        longitude: driverLocation.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    }
  };

  return (
    <View style={[styles.container, { height: propHeight }]}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_DEFAULT}
        initialRegion={initialRegion || defaultRegion}
        onMapReady={() => {
          console.log('Map is ready');
          setIsLoading(false);
          onMapReady?.();
        }}
        onRegionChange={onRegionChange}
        showsUserLocation={showUserMarker}
        showsMyLocationButton={false}
        showsCompass={true}
        zoomEnabled={interactive}
        scrollEnabled={interactive}
        rotateEnabled={interactive}
        pitchEnabled={interactive}
      >
        {/* OpenStreetMap Tiles */}
        <UrlTile
          urlTemplate="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maximumZ={19}
        />

        {/* Route Polyline */}
        {showRoute && pickupLocation && dropoffLocation && (
          <Polyline
            coordinates={[
              {
                latitude: pickupLocation.latitude,
                longitude: pickupLocation.longitude,
              },
              {
                latitude: dropoffLocation.latitude,
                longitude: dropoffLocation.longitude,
              },
            ]}
            strokeColor="#0EA5E9"
            strokeWidth={3}
            lineDashPattern={[5, 5]}
          />
        )}

        {/* Driver Marker */}
        {showDriverMarker && driverLocation && (
          <Marker
            coordinate={{
              latitude: driverLocation.latitude,
              longitude: driverLocation.longitude,
            }}
            rotation={driverLocation.heading || 0}
          >
            <View style={styles.driverMarker}>
              <Ionicons name="car" size={24} color="#fff" />
            </View>
          </Marker>
        )}

        {/* Pickup Location Marker */}
        {showPickupMarker && pickupLocation && (
          <Marker
            coordinate={{
              latitude: pickupLocation.latitude,
              longitude: pickupLocation.longitude,
            }}
          >
            <View style={styles.pickupMarker}>
              <Ionicons name="location" size={20} color="#fff" />
              <View style={styles.pickupLabel}>
                <Text style={styles.markerLabel}>Pickup</Text>
              </View>
            </View>
          </Marker>
        )}

        {/* Dropoff Location Marker */}
        {showDropoffMarker && dropoffLocation && (
          <Marker
            coordinate={{
              latitude: dropoffLocation.latitude,
              longitude: dropoffLocation.longitude,
            }}
          >
            <View style={styles.dropoffMarker}>
              <Ionicons name="flag" size={20} color="#fff" />
              <View style={styles.dropoffLabel}>
                <Text style={styles.markerLabel}>Dropoff</Text>
              </View>
            </View>
          </Marker>
        )}
      </MapView>

      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#0EA5E9" />
          <Text style={styles.loadingText}>Loading map...</Text>
        </View>
      )}

      {/* Control Buttons */}
      {interactive && (
        <View style={styles.controls}>
          {showUserMarker && userLocation && (
            <TouchableOpacity style={styles.controlButton} onPress={centerOnUser}>
              <Ionicons name="navigate" size={24} color="#0EA5E9" />
            </TouchableOpacity>
          )}
          {showDriverMarker && driverLocation && (
            <TouchableOpacity style={styles.controlButton} onPress={centerOnDriver}>
              <Ionicons name="car" size={24} color="#0EA5E9" />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.controlButton} onPress={fitToMarkers}>
            <Ionicons name="resize" size={24} color="#0EA5E9" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    overflow: 'hidden',
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#0EA5E9',
  },
  controls: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    gap: 8,
  },
  controlButton: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  driverMarker: {
    backgroundColor: '#0EA5E9',
    padding: 8,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  pickupMarker: {
    backgroundColor: '#10B981',
    padding: 6,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: 'white',
  },
  dropoffMarker: {
    backgroundColor: '#EF4444',
    padding: 6,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: 'white',
  },
  pickupLabel: {
    position: 'absolute',
    bottom: -25,
    left: -20,
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  dropoffLabel: {
    position: 'absolute',
    bottom: -25,
    left: -22,
    backgroundColor: '#EF4444',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  markerLabel: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
});

export default LiveMap;