// src/services/shareTripService.ts
import * as Sharing from 'expo-sharing';
import * as Clipboard from 'expo-clipboard';
import { Alert, Platform, Linking } from 'react-native';

export interface TripShareInfo {
  tripId: string;
  driverName: string;
  driverPhoto?: string;
  vehicleModel: string;
  vehiclePlate: string;
  pickupLocation: string;
  destinationLocation: string;
  pickupTime: Date;
  estimatedArrival: Date;
  driverRating: number;
  tripCode: string;
}

class ShareTripService {
  private baseUrl = 'https://nexride.app/track'; // Replace with your actual domain

  // Generate a unique tracking link
  generateTrackingLink(tripId: string): string {
    return `${this.baseUrl}/${tripId}`;
  }

  // Generate share message
  generateShareMessage(tripInfo: TripShareInfo): string {
    return `🚗 I'm taking a ride with Nexride!
    
👤 Driver: ${tripInfo.driverName} (⭐ ${tripInfo.driverRating})
🚙 Vehicle: ${tripInfo.vehicleModel} · ${tripInfo.vehiclePlate}
📍 Pickup: ${tripInfo.pickupLocation}
🎯 Destination: ${tripInfo.destinationLocation}
🔐 Trip Code: ${tripInfo.tripCode}
⏰ Started: ${tripInfo.pickupTime.toLocaleTimeString()}
🕐 ETA: ${tripInfo.estimatedArrival.toLocaleTimeString()}

Track my trip live: ${this.generateTrackingLink(tripInfo.tripId)}

Sent via Nexride - Safe Rides, Better Experience`;
  }

  // Share via WhatsApp
  async shareViaWhatsApp(tripInfo: TripShareInfo): Promise<void> {
    const message = this.generateShareMessage(tripInfo);
    const url = `whatsapp://send?text=${encodeURIComponent(message)}`;
    
    try {
      await Linking.openURL(url);
    } catch (error) {
      Alert.alert('Error', 'WhatsApp is not installed on your device');
    }
  }

  // Share via SMS
  async shareViaSMS(tripInfo: TripShareInfo, phoneNumber?: string): Promise<void> {
    const message = this.generateShareMessage(tripInfo);
    const url = phoneNumber 
      ? `sms:${phoneNumber}?body=${encodeURIComponent(message)}`
      : `sms:&body=${encodeURIComponent(message)}`;
    
    await Linking.openURL(url);
  }

  // Share via any available method
  async shareViaAny(tripInfo: TripShareInfo): Promise<void> {
    const message = this.generateShareMessage(tripInfo);
    
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(message, {
        dialogTitle: 'Share Trip Progress',
        mimeType: 'text/plain',
      });
    } else {
      await Clipboard.setStringAsync(message);
      Alert.alert('Link Copied', 'Tracking link copied to clipboard!');
    }
  }

  // Copy tracking link to clipboard
  async copyTrackingLink(tripId: string): Promise<void> {
    const link = this.generateTrackingLink(tripId);
    await Clipboard.setStringAsync(link);
    Alert.alert('Link Copied', 'Tracking link copied to clipboard! Share it with your friends.');
  }

  // Get estimated time remaining
  getEstimatedTimeRemaining(eta: Date): string {
    const now = new Date();
    const diffMs = eta.getTime() - now.getTime();
    const diffMins = Math.round(diffMs / 60000);
    
    if (diffMins <= 0) return 'Arriving soon';
    if (diffMins < 60) return `${diffMins} minutes`;
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hours}h ${mins}m`;
  }
}

export default new ShareTripService();