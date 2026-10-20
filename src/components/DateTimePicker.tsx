import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../contexts/ThemeContext';

interface DateTimePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (date: Date) => void;
  minimumDate?: Date;
}

export default function DateTimePickerModal({
  visible,
  onClose,
  onConfirm,
  minimumDate = new Date(),
}: DateTimePickerModalProps) {
  const { colors } = useTheme();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(true);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const handleDateChange = (event: any, date?: Date) => {
    if (date) {
      setSelectedDate(date);
      setShowDatePicker(false);
      setShowTimePicker(true);
    }
  };

  const handleTimeChange = (event: any, time?: Date) => {
    if (time) {
      const finalDate = new Date(selectedDate);
      finalDate.setHours(time.getHours());
      finalDate.setMinutes(time.getMinutes());
      setSelectedDate(finalDate);
      setShowTimePicker(false);
      onConfirm(finalDate);
      onClose();
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

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
            <Text style={[styles.modalTitle, { color: colors.text }]}>Schedule Ride</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={[styles.modalClose, { color: colors.textSecondary }]}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {showDatePicker && (
              <View style={styles.pickerContainer}>
                <Text style={[styles.pickerLabel, { color: colors.text }]}>Select Date</Text>
                <DateTimePicker
                  value={selectedDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleDateChange}
                  minimumDate={minimumDate}
                  style={styles.picker}
                />
              </View>
            )}

            {showTimePicker && (
              <View style={styles.pickerContainer}>
                <Text style={[styles.pickerLabel, { color: colors.text }]}>Select Time</Text>
                <DateTimePicker
                  value={selectedDate}
                  mode="time"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleTimeChange}
                  style={styles.picker}
                />
              </View>
            )}

            {!showDatePicker && !showTimePicker && (
              <View style={styles.selectedContainer}>
                <Text style={[styles.selectedTitle, { color: colors.success }]}>✓ Ride Scheduled!</Text>
                <Text style={[styles.selectedDate, { color: colors.text }]}>{formatDate(selectedDate)}</Text>
                <Text style={[styles.selectedTime, { color: colors.primary }]}>{formatTime(selectedDate)}</Text>
              </View>
            )}
          </ScrollView>

          {!showDatePicker && !showTimePicker && (
            <TouchableOpacity
              style={[styles.confirmButton, { backgroundColor: colors.primary }]}
              onPress={() => onConfirm(selectedDate)}
            >
              <Text style={styles.confirmButtonText}>Confirm Schedule</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    borderRadius: 20,
    padding: 20,
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
  pickerContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  pickerLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  picker: {
    width: '100%',
  },
  selectedContainer: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  selectedTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 16,
  },
  selectedDate: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  selectedTime: {
    fontSize: 24,
    fontWeight: '800',
  },
  confirmButton: {
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});