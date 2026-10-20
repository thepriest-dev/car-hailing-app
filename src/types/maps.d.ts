declare module '../components/LiveMap' {
  import { ComponentType } from 'react';
  import { Region } from 'react-native-maps';

  interface LocationCoords {
    latitude: number;
    longitude: number;
    heading?: number;
  }

  interface LiveMapProps {
    initialRegion?: Region;
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
    onRegionChange?: (region: Region) => void;
    interactive?: boolean;
    height?: number | string;
  }

  const LiveMap: ComponentType<LiveMapProps>;
  export default LiveMap;
}