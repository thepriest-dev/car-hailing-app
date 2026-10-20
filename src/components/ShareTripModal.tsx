// src/components/ShareTripModal.tsx
import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import shareTripService, { TripShareInfo } from '../services/shareTripService';
import * as Linking from 'expo-linking';

interface ShareTripModalProps {
  visible: boolean;
  onClose: () => void;
  tripInfo: TripShareInfo;
}

export default function ShareTripModal({ visible, onClose, tripInfo }: ShareTripModalProps) {
  const { colors } = useTheme();

  const shareOptions = [
    {
      id: 'whatsapp',
      name: 'WhatsApp',
      icon: '💚',
      color: '#25D366',
      action: () => shareTripService.shareViaWhatsApp(tripInfo),
    },
    {
      id: 'sms',
      name: 'SMS',
      icon: '💬',
      color: '#34B7F1',
      action: () => shareTripService.shareViaSMS(tripInfo),
    },
    {
      id: 'copy',
      name: 'Copy Link',
      icon: '📋',
      color: colors.primary,
      action: () => shareTripService.copyTrackingLink(tripInfo.tripId),
    },
    {
      id: 'more',
      name: 'More',
      icon: '📱',
      color: colors.textSecondary,
      action: () => shareTripService.shareViaAny(tripInfo),
    },
  ];

  const etaRemaining = shareTripService.getEstimatedTimeRemaining(tripInfo.estimatedArrival);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Share Trip Progress</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={[styles.modalClose, { color: colors.textSecondary }]}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Trip Summary Card */}
            <View style={[styles.tripSummary, { backgroundColor: colors.surface, borderColor: colors.primary }]}>
              <Text style={[styles.tripSummaryTitle, { color: colors.primary }]}>📍 VeloCity Trip Details</Text>
              <View style={styles.tripDetailRow}>
                <Text style={[styles.tripDetailLabel, { color: colors.textSecondary }]}>From:</Text>
                <Text style={[styles.tripDetailValue, { color: colors.text }]}>{tripInfo.pickupLocation}</Text>
              </View>
              <View style={styles.tripDetailRow}>
                <Text style={[styles.tripDetailLabel, { color: colors.textSecondary }]}>To:</Text>
                <Text style={[styles.tripDetailValue, { color: colors.text }]}>{tripInfo.destinationLocation}</Text>
              </View>
              <View style={styles.tripDetailRow}>
                <Text style={[styles.tripDetailLabel, { color: colors.textSecondary }]}>Driver:</Text>
                <Text style={[styles.tripDetailValue, { color: colors.text }]}>{tripInfo.driverName} ⭐ {tripInfo.driverRating}</Text>
              </View>
              <View style={styles.tripDetailRow}>
                <Text style={[styles.tripDetailLabel, { color: colors.textSecondary }]}>Vehicle:</Text>
                <Text style={[styles.tripDetailValue, { color: colors.text }]}>{tripInfo.vehicleModel} · {tripInfo.vehiclePlate}</Text>
              </View>
              <View style={styles.tripDetailRow}>
                <Text style={[styles.tripDetailLabel, { color: colors.textSecondary }]}>ETA:</Text>
                <Text style={[styles.tripDetailValue, { color: colors.success }]}>{etaRemaining}</Text>
              </View>
            </View>

            {/* ETA Progress Bar */}
            <View style={styles.etaContainer}>
              <Text style={[styles.etaLabel, { color: colors.textSecondary }]}>Estimated Time Remaining</Text>
              <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                <View style={[styles.progressFill, { width: '65%', backgroundColor: colors.primary }]} />
              </View>
              <Text style={[styles.etaText, { color: colors.primary }]}>{etaRemaining}</Text>
            </View>

            {/* Share Options */}
            <Text style={[styles.shareTitle, { color: colors.text }]}>Share with:</Text>
            <View style={styles.shareOptionsGrid}>
              {shareOptions.map(option => (
                <TouchableOpacity
                  key={option.id}
                  style={[styles.shareOption, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={() => {
                    option.action();
                    onClose();
                  }}
                >
                  <Text style={styles.shareOptionIcon}>{option.icon}</Text>
                  <Text style={[styles.shareOptionName, { color: colors.text }]}>{option.name}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Info Note */}
            <View style={[styles.infoNote, { backgroundColor: colors.surfaceLight, borderColor: colors.warning }]}>
              <Text style={styles.infoIcon}>🔒</Text>
              <View style={styles.infoContent}>
                <Text style={[styles.infoTitle, { color: colors.text }]}>Privacy Note</Text>
                <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                  Your friends can track your VeloCity trip live for 2 hours. They won't see your personal information.
                </Text>
              </View>
            </View>
          </ScrollView>

          <TouchableOpacity
            style={[styles.closeButton, { backgroundColor: colors.primary }]}
            onPress={onClose}
          >
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    maxHeight: '90%',
    borderWidth: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  modalClose: {
    fontSize: 20,
    fontWeight: '600',
  },
  tripSummary: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  tripSummaryTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 12,
  },
  tripDetailRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  tripDetailLabel: {
    width: 60,
    fontSize: 13,
  },
  tripDetailValue: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
  },
  etaContainer: {
    marginBottom: 20,
  },
  etaLabel: {
    fontSize: 12,
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  etaText: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  shareTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
  },
  shareOptionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  shareOption: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  shareOptionIcon: {
    fontSize: 24,
  },
  shareOptionName: {
    fontSize: 14,
    fontWeight: '600',
  },
  infoNote: {
    flexDirection: 'row',
    padding: 14,
    borderRadius: 12,
    gap: 12,
    marginBottom: 16,
    borderWidth: 1,
  },
  infoIcon: {
    fontSize: 24,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 11,
    lineHeight: 16,
  },
  closeButton: {
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});