// src/services/sosService.ts
import { Alert, Linking, Platform } from 'react-native';
import * as Location from 'expo-location';
import * as Contacts from 'expo-contacts';

export interface EmergencyContact {
  id: string;
  name: string;
  phoneNumber: string;
  relationship: string;
}

export interface TripInfo {
  driverName: string;
  driverPhone: string;
  vehiclePlate: string;
  pickupLocation: string;
  destinationLocation: string;
  tripCode: string;
}

class SOSService {
  private emergencyContacts: EmergencyContact[] = [];
  private currentTripInfo: TripInfo | null = null;

  // Load emergency contacts from storage (will implement with AsyncStorage)
  async loadEmergencyContacts(): Promise<EmergencyContact[]> {
    // For now, return mock data
    return [
      { id: '1', name: 'John Doe', phoneNumber: '+2348012345678', relationship: 'Brother' },
      { id: '2', name: 'Jane Smith', phoneNumber: '+2348023456789', relationship: 'Sister' },
    ];
  }

  // Set current trip info
  setCurrentTripInfo(tripInfo: TripInfo) {
    this.currentTripInfo = tripInfo;
  }

  // Clear trip info
  clearCurrentTripInfo() {
    this.currentTripInfo = null;
  }

  // Get current location
  async getCurrentLocation(): Promise<{ lat: number; lng: number; address: string } | null> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        return null;
      }
      
      const location = await Location.getCurrentPositionAsync({});
      const [address] = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
      
      return {
        lat: location.coords.latitude,
        lng: location.coords.longitude,
        address: `${address.street || ''} ${address.city || ''} ${address.region || ''}`.trim(),
      };
    } catch (error) {
      console.log('Error getting location:', error);
      return null;
    }
  }

  // Send SMS (opens messaging app with pre-filled message)
  sendSMS(phoneNumber: string, message: string) {
    const url = Platform.OS === 'ios' 
      ? `sms:${phoneNumber}&body=${encodeURIComponent(message)}`
      : `sms:${phoneNumber}?body=${encodeURIComponent(message)}`;
    Linking.openURL(url);
  }

  // Make phone call
  makePhoneCall(phoneNumber: string) {
    Linking.openURL(`tel:${phoneNumber}`);
  }

  // Generate emergency message
  generateEmergencyMessage(location: { lat: number; lng: number; address: string } | null): string {
    let message = `🚨 EMERGENCY ALERT! 🚨\n\n`;
    message += `I need help! I'm using Nexride and need assistance.\n\n`;
    
    if (location) {
      message += `📍 My current location:\n`;
      message += `${location.address}\n`;
      message += `https://maps.google.com/?q=${location.lat},${location.lng}\n\n`;
    }
    
    if (this.currentTripInfo) {
      message += `🚗 Trip Details:\n`;
      message += `Driver: ${this.currentTripInfo.driverName}\n`;
      message += `Vehicle: ${this.currentTripInfo.vehiclePlate}\n`;
      message += `From: ${this.currentTripInfo.pickupLocation}\n`;
      message += `To: ${this.currentTripInfo.destinationLocation}\n`;
      message += `Trip Code: ${this.currentTripInfo.tripCode}\n\n`;
    }
    
    message += `⏰ Time: ${new Date().toLocaleString()}\n\n`;
    message += `Please contact me immediately!`;
    
    return message;
  }

  // Trigger SOS - calls all emergency contacts
  async triggerSOS(): Promise<void> {
    const contacts = await this.loadEmergencyContacts();
    const location = await this.getCurrentLocation();
    const message = this.generateEmergencyMessage(location);
    
    if (contacts.length === 0) {
      Alert.alert(
        'No Emergency Contacts',
        'Please add emergency contacts in your profile settings first.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    // Show confirmation dialog
    Alert.alert(
      '🚨 EMERGENCY SOS 🚨',
      `This will alert your ${contacts.length} emergency contact(s). Continue?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Send Alert', 
          style: 'destructive',
          onPress: () => {
            // Send to each contact
            contacts.forEach(contact => {
              this.sendSMS(contact.phoneNumber, message);
            });
            
            // Also call the first contact automatically after 2 seconds
            setTimeout(() => {
              Alert.alert(
                'Alert Sent',
                `Emergency alerts sent to ${contacts.length} contact(s).`,
                [
                  { text: 'OK' },
                  { 
                    text: 'Call Now', 
                    onPress: () => this.makePhoneCall(contacts[0].phoneNumber)
                  }
                ]
              );
            }, 2000);
          }
        }
      ]
    );
  }

  // One-tap emergency call to local police (customize for your country)
  callPolice() {
    const policeNumber = Platform.OS === 'ios' ? '911' : '112'; // Nigeria: 112 or 199
    this.makePhoneCall(policeNumber);
  }
}

export default new SOSService();