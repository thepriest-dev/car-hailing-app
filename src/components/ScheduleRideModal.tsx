import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, TextInput, Platform, Alert
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';

interface ScheduleRideModalProps {
  visible: boolean;
  onClose: () => void;
  onSchedule: (date: Date, notes: string) => void;
}

export default function ScheduleRideModal({ visible, onClose, onSchedule }: ScheduleRideModalProps) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [notes, setNotes] = useState('');

  const handleSchedule = () => {
    if (selectedDate < new Date()) {
      Alert.alert('Invalid Date', 'Please select a future date and time');
      return;
    }
    onSchedule(selectedDate, notes);
    onClose();
    setNotes('');
  };

  const formatDateTime = (date: Date) => {
    return date.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Schedule Ride</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#1F2937" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Pick Date & Time</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Ionicons name="calendar-outline" size={20} color="#0EA5E9" />
                <Text style={styles.dateText}>{formatDateTime(selectedDate)}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Add Notes (Optional)</Text>
              <TextInput
                style={styles.notesInput}
                placeholder="E.g., Meet at gate, call on arrival..."
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Schedule Summary</Text>
              <View style={styles.summaryCard}>
                <View style={styles.summaryRow}>
                  <Ionicons name="time-outline" size={16} color="#6B7280" />
                  <Text style={styles.summaryText}>Ride will arrive ~10 min before scheduled time</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Ionicons name="notifications-outline" size={16} color="#6B7280" />
                  <Text style={styles.summaryText}>You'll receive a reminder 30 min before</Text>
                </View>
              </View>
            </View>

            <TouchableOpacity style={styles.scheduleButton} onPress={handleSchedule}>
              <Text style={styles.scheduleButtonText}>Schedule Ride</Text>
            </TouchableOpacity>
          </ScrollView>

          {showDatePicker && (
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(event, date) => {
                setShowDatePicker(false);
                if (date) {
                  const newDate = new Date(selectedDate);
                  newDate.setFullYear(date.getFullYear());
                  newDate.setMonth(date.getMonth());
                  newDate.setDate(date.getDate());
                  setSelectedDate(newDate);
                }
              }}
            />
          )}

          {showTimePicker && (
            <DateTimePicker
              value={selectedDate}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(event, date) => {
                setShowTimePicker(false);
                if (date) {
                  const newDate = new Date(selectedDate);
                  newDate.setHours(date.getHours());
                  newDate.setMinutes(date.getMinutes());
                  setSelectedDate(newDate);
                }
              }}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    padding: 14,
    borderRadius: 12,
    gap: 10,
  },
  dateText: {
    fontSize: 14,
    color: '#1F2937',
  },
  notesInput: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  summaryCard: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  summaryText: {
    fontSize: 12,
    color: '#6B7280',
  },
  scheduleButton: {
    backgroundColor: '#0EA5E9',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  scheduleButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
});