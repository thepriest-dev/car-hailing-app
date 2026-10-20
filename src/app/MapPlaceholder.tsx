import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Text,
  TouchableOpacity,
  Modal,
  Linking,
  Platform,
  Alert,
} from 'react-native';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

const { height: screenHeight } = Dimensions.get('window');

interface MapPlaceholderProps {
  pickupLocation?: { lat: number; lng: number; address: string };
  dropoffLocation?: { lat: number; lng: number; address: string };
  showNavigationButton?: boolean;
}

export default function MapPlaceholder({ 
  pickupLocation, 
  dropoffLocation, 
  showNavigationButton = true 
}: MapPlaceholderProps) {
  const { colors } = useTheme();
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [userHeading, setUserHeading] = useState<number>(0);
  const [userSpeed, setUserSpeed] = useState<number>(0);
  const [locationStatus, setLocationStatus] = useState('Getting location...');
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [fullscreenVisible, setFullscreenVisible] = useState(false);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const webViewRef = useRef<WebView>(null);

  useEffect(() => {
    getLocation();
  }, []);

  const getLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setPermissionDenied(true);
        setLocationStatus('Location permission denied');
        return;
      }

      setLocationStatus('Getting GPS...');
      
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      
      setUserLat(location.coords.latitude);
      setUserLng(location.coords.longitude);
      setUserHeading(location.coords.heading || 0);
      setUserSpeed(location.coords.speed || 0);
      setLocationStatus('📍 Live tracking');
      
      if (webViewRef.current && !isFirstLoad) {
        const speedKmh = ((location.coords.speed || 0) * 3.6).toFixed(1);
        webViewRef.current.injectJavaScript(`
          updateLocation(${location.coords.latitude}, ${location.coords.longitude}, ${location.coords.heading || 0}, ${speedKmh});
        `);
      }
      
      await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 1000,
          distanceInterval: 5,
        },
        (newLocation) => {
          const newHeading = newLocation.coords.heading || 0;
          const newSpeed = (newLocation.coords.speed || 0) * 3.6;
          
          setUserLat(newLocation.coords.latitude);
          setUserLng(newLocation.coords.longitude);
          setUserHeading(newHeading);
          setUserSpeed(newLocation.coords.speed || 0);
          
          if (webViewRef.current) {
            webViewRef.current.injectJavaScript(`
              updateLocation(${newLocation.coords.latitude}, ${newLocation.coords.longitude}, ${newHeading}, ${newSpeed.toFixed(1)});
            `);
          }
        }
      );
      
    } catch (error) {
      console.log('Location error:', error);
      setLocationStatus('Using default location');
    }
  };

  // Open Google Maps app with navigation
  const openGoogleMapsNavigation = () => {
    if (!dropoffLocation) {
      Alert.alert('No Destination', 'Please enter a destination first');
      return;
    }

    // Get start location (user's current location or pickup)
    const startLat = userLat || pickupLocation?.lat || 6.5244;
    const startLng = userLng || pickupLocation?.lng || 3.3792;
    
    // Get destination from dropoffLocation
    const destLat = dropoffLocation?.lat || 6.5244;
    const destLng = dropoffLocation?.lng || 3.3792;
    const destName = encodeURIComponent(dropoffLocation?.address || 'Destination');
    
    // Build Google Maps URL for navigation
    const url = Platform.select({
      ios: `comgooglemaps://?saddr=${startLat},${startLng}&daddr=${destLat},${destLng}&directionsmode=driving`,
      android: `google.navigation:q=${destLat},${destLng}&mode=d`,
    });
    
    // Fallback URL if Google Maps app not installed
    const webUrl = `https://www.google.com/maps/dir/?api=1&origin=${startLat},${startLng}&destination=${destLat},${destLng}&travelmode=driving`;
    
    // Try to open Google Maps app first
    Linking.canOpenURL(url as string).then(supported => {
      if (supported) {
        Linking.openURL(url as string);
      } else {
        Linking.openURL(webUrl);
      }
    }).catch(() => {
      Linking.openURL(webUrl);
    });
  };

  const mapHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=yes">
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>
        body { margin: 0; padding: 0; }
        #map { height: 100vh; width: 100vw; background: #1a1a2e; }
        
        .arrow-pointer {
          position: relative;
          width: 40px;
          height: 40px;
        }
        
        .arrow {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(0deg);
          width: 0;
          height: 0;
          border-left: 10px solid transparent;
          border-right: 10px solid transparent;
          border-bottom: 30px solid #0EA5E9;
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
        }
        
        .dot {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 12px;
          height: 12px;
          background: #0EA5E9;
          border: 2px solid white;
          border-radius: 50%;
        }
        
        .pulse {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 40px;
          height: 40px;
          background: rgba(14,165,233,0.3);
          border-radius: 50%;
          animation: pulse 1.5s ease-out infinite;
        }
        
        @keyframes pulse {
          0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0.8; }
          100% { transform: translate(-50%, -50%) scale(1.5); opacity: 0; }
        }
        
        .pickup-marker {
          position: relative;
          width: 30px;
          height: 30px;
        }
        
        .pickup-pin {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 0;
          height: 0;
          border-left: 10px solid transparent;
          border-right: 10px solid transparent;
          border-bottom: 20px solid #10B981;
        }
        
        .pickup-dot {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 6px;
          height: 6px;
          background: white;
          border-radius: 50%;
        }
        
        .dropoff-marker {
          position: relative;
          width: 30px;
          height: 30px;
        }
        
        .dropoff-pin {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 0;
          height: 0;
          border-left: 10px solid transparent;
          border-right: 10px solid transparent;
          border-bottom: 20px solid #EF4444;
        }
        
        .dropoff-dot {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 6px;
          height: 6px;
          background: white;
          border-radius: 50%;
        }
        
        .info-box {
          position: absolute;
          bottom: 20px;
          left: 20px;
          right: 20px;
          background: rgba(0,0,0,0.85);
          padding: 12px;
          border-radius: 12px;
          color: white;
          z-index: 1000;
          display: flex;
          flex-direction: row;
          justify-content: space-between;
          align-items: center;
          font-family: system-ui;
        }
        
        .speed {
          font-size: 24px;
          font-weight: bold;
          color: #0EA5E9;
        }
        
        .direction {
          font-size: 12px;
          color: #F59E0B;
        }
        
        .tap-hint {
          position: absolute;
          top: 20px;
          right: 20px;
          background: rgba(0,0,0,0.7);
          padding: 8px 12px;
          border-radius: 20px;
          font-size: 11px;
          color: white;
          z-index: 1000;
          font-family: system-ui;
        }
        
        .zoom-btn {
          position: absolute;
          bottom: 20px;
          right: 20px;
          background: white;
          width: 40px;
          height: 40px;
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          z-index: 1000;
          font-size: 20px;
          font-weight: bold;
          box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        }
        
        .zoom-in { bottom: 70px; }
        .zoom-out { bottom: 20px; }
        
        .follow-btn {
          position: absolute;
          bottom: 20px;
          left: 20px;
          background: #0EA5E9;
          color: white;
          padding: 8px 16px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          z-index: 1000;
          font-family: system-ui;
        }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <div class="tap-hint">📍 Tap map to open Google Maps</div>
      <div class="info-box">
        <div>
          <div id="coords">${userLat?.toFixed(4) || '--'}, ${userLng?.toFixed(4) || '--'}</div>
          <div class="direction" id="direction">Direction: ${Math.round(userHeading)}°</div>
        </div>
        <div>
          <div class="speed" id="speed">${(userSpeed * 3.6).toFixed(1)}</div>
          <div style="font-size: 10px; opacity: 0.7;">km/h</div>
        </div>
      </div>
      <div class="zoom-btn zoom-in" onclick="zoomIn()">+</div>
      <div class="zoom-btn zoom-out" onclick="zoomOut()">-</div>
      <div class="follow-btn" id="followBtn" onclick="toggleFollow()">📍 Following</div>
      
      <script>
        var map;
        var userMarker;
        var pickupMarker;
        var dropoffMarker;
        var followMode = true;
        var zoom = 14;
        
        var hasPickup = ${!!pickupLocation};
        var hasDropoff = ${!!dropoffLocation};
        var pickupLat = ${pickupLocation?.lat || 'null'};
        var pickupLng = ${pickupLocation?.lng || 'null'};
        var dropoffLat = ${dropoffLocation?.lat || 'null'};
        var dropoffLng = ${dropoffLocation?.lng || 'null'};
        
        function initMap(lat, lng) {
          map = L.map('map').setView([lat, lng], zoom);
          L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            attribution: '© OpenStreetMap',
            subdomains: 'abcd',
            maxZoom: 19
          }).addTo(map);
          
          if (hasPickup && pickupLat && pickupLng) {
            var pickupIcon = L.divIcon({
              html: '<div class="pickup-marker"><div class="pickup-pin"></div><div class="pickup-dot"></div></div>',
              iconSize: [30, 30]
            });
            pickupMarker = L.marker([pickupLat, pickupLng], { icon: pickupIcon }).addTo(map);
            pickupMarker.bindPopup('<b>📍 Pickup Location</b>');
          }
          
          if (hasDropoff && dropoffLat && dropoffLng) {
            var dropoffIcon = L.divIcon({
              html: '<div class="dropoff-marker"><div class="dropoff-pin"></div><div class="dropoff-dot"></div></div>',
              iconSize: [30, 30]
            });
            dropoffMarker = L.marker([dropoffLat, dropoffLng], { icon: dropoffIcon }).addTo(map);
            dropoffMarker.bindPopup('<b>🏁 Destination</b>');
          }
          
          if (hasPickup && hasDropoff && pickupLat && pickupLng && dropoffLat && dropoffLng) {
            var routePoints = [[pickupLat, pickupLng], [dropoffLat, dropoffLng]];
            L.polyline(routePoints, {
              color: '#0EA5E9',
              weight: 3,
              opacity: 0.8,
              dashArray: '5, 10'
            }).addTo(map);
          }
          
          var bounds = [];
          if (hasPickup && pickupLat) bounds.push([pickupLat, pickupLng]);
          if (hasDropoff && dropoffLat) bounds.push([dropoffLat, dropoffLng]);
          if (bounds.length > 0) {
            map.fitBounds(bounds, { padding: [50, 50] });
          }
        }
        
        function updateLocation(lat, lng, heading, speed) {
          if (!map) initMap(lat, lng);
          
          var iconHtml = '<div class="arrow-pointer">' +
            '<div class="pulse"></div>' +
            '<div class="arrow" style="transform: translate(-50%, -50%) rotate(' + heading + 'deg);"></div>' +
            '<div class="dot"></div>' +
            '</div>';
          
          var customIcon = L.divIcon({
            html: iconHtml,
            iconSize: [40, 40],
            className: 'custom-icon'
          });
          
          if (userMarker) {
            userMarker.setLatLng([lat, lng]);
            userMarker.setIcon(customIcon);
          } else {
            userMarker = L.marker([lat, lng], { icon: customIcon }).addTo(map);
          }
          
          document.getElementById('coords').innerHTML = lat.toFixed(4) + ', ' + lng.toFixed(4);
          document.getElementById('speed').innerHTML = speed;
          document.getElementById('direction').innerHTML = 'Direction: ' + Math.round(heading) + '°';
          
          if (followMode) {
            map.setView([lat, lng], zoom);
          }
        }
        
        function zoomIn() {
          zoom = Math.min(zoom + 1, 19);
          map.setZoom(zoom);
        }
        
        function zoomOut() {
          zoom = Math.max(zoom - 1, 3);
          map.setZoom(zoom);
        }
        
        function toggleFollow() {
          followMode = !followMode;
          var btn = document.getElementById('followBtn');
          if (followMode) {
            btn.style.background = '#0EA5E9';
            btn.innerHTML = '📍 Following';
          } else {
            btn.style.background = '#333';
            btn.innerHTML = '📍 Follow Off';
          }
        }
        
        document.getElementById('map').addEventListener('click', function() {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'OPEN_GOOGLE_MAPS' }));
        });
        
        setTimeout(function() {
          if (${userLat !== null && userLng !== null}) {
            initMap(${userLat || 6.5244}, ${userLng || 3.3792});
            updateLocation(${userLat || 6.5244}, ${userLng || 3.3792}, ${userHeading || 0}, ${(userSpeed * 3.6).toFixed(1)});
          } else {
            initMap(6.5244, 3.3792);
          }
          
          if (map) {
            map.invalidateSize();
          }
        }, 100);
      </script>
    </body>
    </html>
  `;

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'OPEN_GOOGLE_MAPS') {
        openGoogleMapsNavigation();
      }
    } catch (e) {
      console.log('Message error:', e);
    }
  };

  if (permissionDenied) {
    return (
      <TouchableOpacity 
        style={[styles.container, { backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center' }]}
        onPress={openGoogleMapsNavigation}
        activeOpacity={0.8}
      >
        <Ionicons name="location-outline" size={48} color={colors.error} />
        <Text style={[styles.errorText, { color: colors.text }]}>Location Access Required</Text>
        <Text style={[styles.errorSubtext, { color: colors.textSecondary }]}>
          Tap to open Google Maps
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <>
      <TouchableOpacity 
        style={styles.container}
        onPress={openGoogleMapsNavigation}
        activeOpacity={0.95}
      >
        <WebView
          ref={webViewRef}
          source={{ html: mapHTML }}
          style={styles.webview}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          onMessage={handleMessage}
          onLoadEnd={() => setIsFirstLoad(false)}
        />
        <View style={styles.statusBar}>
          <Ionicons name="navigate" size={12} color="#0EA5E9" />
          <Text style={styles.statusText}>{locationStatus}</Text>
          {userSpeed > 0 && (
            <Text style={[styles.statusText, { color: '#0EA5E9', fontWeight: 'bold' }]}>
              {(userSpeed * 3.6).toFixed(0)} km/h
            </Text>
          )}
        </View>
        <View style={styles.navigationHint}>
          <Ionicons name="open-outline" size={14} color="white" />
          <Text style={styles.hintText}>Tap anywhere to open Google Maps</Text>
        </View>
      </TouchableOpacity>

      <Modal visible={fullscreenVisible} animationType="slide" presentationStyle="fullScreen">
        <View style={styles.fullscreenContainer}>
          <View style={styles.fullscreenHeader}>
            <Text style={styles.fullscreenTitle}>Live Map</Text>
            <TouchableOpacity onPress={() => setFullscreenVisible(false)}>
              <Ionicons name="close" size={28} color="white" />
            </TouchableOpacity>
          </View>
          <WebView
            source={{ html: mapHTML }}
            style={styles.fullscreenWebview}
            javaScriptEnabled={true}
            domStorageEnabled={true}
          />
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    height: screenHeight * 0.35,
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  webview: {
    flex: 1,
    width: '100%',
  },
  statusBar: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusText: {
    color: 'white',
    fontSize: 11,
  },
  navigationHint: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  hintText: {
    color: 'white',
    fontSize: 10,
  },
  fullscreenContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  fullscreenHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 10,
    backgroundColor: '#0A1929',
  },
  fullscreenTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  fullscreenWebview: {
    flex: 1,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 12,
    textAlign: 'center',
  },
  errorSubtext: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});