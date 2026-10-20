import React from 'react';
import { View, StyleSheet, Dimensions, Image, Text, Linking, TouchableOpacity } from 'react-native';
import { WebView } from 'react-native-webview';
import { useTheme } from '../contexts/ThemeContext';

const { height: screenHeight, width: screenWidth } = Dimensions.get('window');

interface SimpleMapProps {
  height?: number;
  pickupLocation?: string;
  dropoffLocation?: string;
}

export default function SimpleMap({ height = screenHeight * 0.35, pickupLocation, dropoffLocation }: SimpleMapProps) {
  const { colors } = useTheme();
  
  // Static map image from OpenStreetMap (no API key needed!)
  // This shows Lagos, Nigeria
  const mapImageUrl = 'https://tile.openstreetmap.org/13/2695/1608.png';
  
  // Google Maps static image (works without API key for basic maps)
  const googleStaticMap = `https://maps.googleapis.com/maps/api/staticmap?center=6.5244,3.3792&zoom=13&size=600x400&maptype=roadmap&markers=color:red|6.5244,3.3792`;

  const openGoogleMaps = () => {
    const url = `https://www.google.com/maps/search/?api=1&query=6.5244,3.3792`;
    Linking.openURL(url);
  };

  return (
    <TouchableOpacity 
      style={[styles.container, { height, backgroundColor: colors.surface }]}
      onPress={openGoogleMaps}
      activeOpacity={0.9}
    >
      {/* Static Image Map - Always works! */}
      <Image 
        source={{ uri: 'https://maps.geoapify.com/v1/staticmap?style=osm-bright&width=600&height=400&center=lonlat:3.3792,6.5244&zoom=13&apiKey=AIzaSyDs699Hr6WfepgE5PBov9r1SzC8ewlNzTA' }}
        style={styles.mapImage}
        resizeMode="cover"
      />
      
      {/* Overlay with tap instructions */}
      <View style={styles.overlay}>
        <Text style={[styles.tapText, { color: colors.text }]}>🗺️ Tap to open Google Maps</Text>
        <Text style={[styles.subText, { color: colors.textSecondary }]}>
          {pickupLocation || 'Ikeja'} → {dropoffLocation || 'Victoria Island'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    overflow: 'hidden',
    borderRadius: 12,
    position: 'relative',
  },
  mapImage: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 12,
    alignItems: 'center',
  },
  tapText: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  subText: {
    fontSize: 11,
  },
});