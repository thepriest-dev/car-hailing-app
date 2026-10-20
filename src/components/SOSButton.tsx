// src/components/SOSButton.tsx
import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Modal,
  Alert,
  Animated,
  Vibration
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import sosService from '../services/sosService';

interface SOSButtonProps {
  tripInfo?: {
    driverName: string;
    driverPhone: string;
    vehiclePlate: string;
    pickupLocation: string;
    destinationLocation: string;
    tripCode: string;
  };
}

export default function SOSButton({ tripInfo }: SOSButtonProps) {
  const { colors } = useTheme();
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const pulseAnim = useState(new Animated.Value(1))[0];
  const [isLongPressing, setIsLongPressing] = useState(false);

  // Set trip info in SOS service
  React.useEffect(() => {
    if (tripInfo) {
      sosService.setCurrentTripInfo(tripInfo);
    }
    return () => {
      sosService.clearCurrentTripInfo();
    };
  }, [tripInfo]);

  // Pulse animation for SOS button
  React.useEffect(() => {
    const pulse = () => {
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.2, duration: 500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]).start(() => pulse());
    };
    pulse();
  }, []);

  const handleSOSPress = () => {
    setShowConfirmModal(true);
  };

  const handleConfirmSOS = async () => {
    setShowConfirmModal(false);
    Vibration.vibrate([500, 500, 500]);
    await sosService.triggerSOS();
  };

  const handleCallPolice = () => {
    setShowOptionsModal(false);
    sosService.callPolice();
  };

  const handleShareLocation = async () => {
    setShowOptionsModal(false);
    const location = await sosService.getCurrentLocation();
    if (location) {
      sosService.sendSMS('', `I need help! My current location: ${location.address}\nhttps://maps.google.com/?q=${location.lat},${location.lng}`);
    }
  };

  return (
    <>
      {/* Floating SOS Button */}
      <Animated.View style={[
        styles.container,
        { transform: [{ scale: pulseAnim }] }
      ]}>
        <TouchableOpacity
          style={[styles.sosButton, { backgroundColor: colors.error }]}
          onPress={handleSOSPress}
          onLongPress={() => {
            Vibration.vibrate(1000);
            setShowOptionsModal(true);
          }}
          delayLongPress={1000}
          activeOpacity={0.8}
        >
          <Text style={styles.sosText}>🆘</Text>
          <Text style={styles.sosLabel}>SOS</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Confirmation Modal */}
      <Modal
        visible={showConfirmModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowConfirmModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface, borderColor: colors.error }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>🚨 EMERGENCY SOS 🚨</Text>
            <Text style={[styles.modalText, { color: colors.textSecondary }]}>
              This will immediately send emergency alerts to your saved contacts with your current location and trip details. The VeloCity Safety Team will also be notified.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => setShowConfirmModal(false)}
              >
                <Text style={[styles.modalButtonText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.sosModalButton, { backgroundColor: colors.error }]}
                onPress={handleConfirmSOS}
              >
                <Text style={[styles.modalButtonText, { color: '#fff' }]}>SEND SOS</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Options Modal (Long Press) */}
      <Modal
        visible={showOptionsModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowOptionsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.optionsModalContent, { backgroundColor: colors.surface, borderColor: colors.error }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Emergency Options</Text>
            
            <TouchableOpacity 
              style={[styles.optionItem, { borderBottomColor: colors.border }]}
              onPress={handleCallPolice}
            >
              <Text style={styles.optionIcon}>🚔</Text>
              <View>
                <Text style={[styles.optionTitle, { color: colors.text }]}>Call Police</Text>
                <Text style={[styles.optionSubtitle, { color: colors.textSecondary }]}>Call local emergency services</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.optionItem, { borderBottomColor: colors.border }]}
              onPress={handleShareLocation}
            >
              <Text style={styles.optionIcon}>📍</Text>
              <View>
                <Text style={[styles.optionTitle, { color: colors.text }]}>Share Location</Text>
                <Text style={[styles.optionSubtitle, { color: colors.textSecondary }]}>Send your current location via SMS</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.optionItem, { borderBottomColor: colors.border }]}
              onPress={() => {
                setShowOptionsModal(false);
                setShowConfirmModal(true);
              }}
            >
              <Text style={styles.optionIcon}>🆘</Text>
              <View>
                <Text style={[styles.optionTitle, { color: colors.text }]}>Full SOS Alert</Text>
                <Text style={[styles.optionSubtitle, { color: colors.textSecondary }]}>Alert all emergency contacts and VeloCity Safety Team</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.closeButton, { borderTopColor: colors.border }]}
              onPress={() => setShowOptionsModal(false)}
            >
              <Text style={[styles.closeButtonText, { color: colors.textSecondary }]}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    zIndex: 1000,
  },
  sosButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  sosText: {
    fontSize: 28,
  },
  sosLabel: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    marginTop: -2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    borderRadius: 20,
    padding: 20,
    borderWidth: 2,
  },
  optionsModalContent: {
    width: '90%',
    borderRadius: 20,
    padding: 20,
    borderWidth: 2,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 12,
  },
  modalText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
  },
  sosModalButton: {
    borderWidth: 0,
  },
  modalButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 12,
    borderBottomWidth: 1,
  },
  optionIcon: {
    fontSize: 32,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  optionSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  closeButton: {
    paddingVertical: 14,
    alignItems: 'center',
    borderTopWidth: 1,
    marginTop: 8,
  },
  closeButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});