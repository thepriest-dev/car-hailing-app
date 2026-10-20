import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import MapView, { MapViewProps, UrlTile, PROVIDER_DEFAULT } from 'react-native-maps';

const { height: screenHeight } = Dimensions.get('window');

interface OpenStreetMapProps extends MapViewProps {
  height?: number;
}

export default function OpenStreetMap({ height = screenHeight * 0.5, ...props }: OpenStreetMapProps) {
  return (
    <View style={[styles.container, { height }]}>
      <MapView
        {...props}
        style={styles.map}
        provider={PROVIDER_DEFAULT}
        initialRegion={{
          latitude: 6.5244,
          longitude: 3.3792,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}
      >
        <UrlTile
          urlTemplate="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maximumZ={19}
        />
      </MapView>
    </View>
  );
}

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
});