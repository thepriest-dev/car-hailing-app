import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, ScrollView, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface SplitFareModalProps {
  visible: boolean;
  onClose: () => void;
  totalFare: number;
  onSplit: (participants: string[], amounts: number[]) => void;
}

export default function SplitFareModal({ visible, onClose, totalFare, onSplit }: SplitFareModalProps) {
  const [participants, setParticipants] = useState<string[]>(['You']);
  const [emails, setEmails] = useState<string[]>(['']);

  const addParticipant = () => {
    if (participants.length < 5) {
      setParticipants([...participants, `Friend ${participants.length}`]);
      setEmails([...emails, '']);
    } else {
      Alert.alert('Limit reached', 'Maximum 5 participants allowed');
    }
  };

  const removeParticipant = (index: number) => {
    if (index > 0) {
      const newParticipants = participants.filter((_, i) => i !== index);
      const newEmails = emails.filter((_, i) => i !== index);
      setParticipants(newParticipants);
      setEmails(newEmails);
    }
  };

  const updateEmail = (index: number, email: string) => {
    const newEmails = [...emails];
    newEmails[index] = email;
    setEmails(newEmails);
  };

  const updateName = (index: number, name: string) => {
    const newNames = [...participants];
    newNames[index] = name;
    setParticipants(newNames);
  };

  const calculateShare = () => {
    const perPerson = totalFare / participants.length;
    return perPerson;
  };

  const handleSplit = () => {
    // Validate emails for non-self participants
    for (let i = 1; i < participants.length; i++) {
      if (!emails[i] || !emails[i].includes('@')) {
        Alert.alert('Invalid Email', `Please enter a valid email for ${participants[i]}`);
        return;
      }
    }
    
    const perPerson = calculateShare();
    const amounts = participants.map(() => perPerson);
    onSplit(participants, amounts);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Split Fare</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#1F2937" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.totalContainer}>
              <Text style={styles.totalLabel}>Total Fare</Text>
              <Text style={styles.totalAmount}>₦{totalFare.toLocaleString()}</Text>
            </View>

            <View style={styles.participantsContainer}>
              <Text style={styles.sectionTitle}>Participants</Text>
              {participants.map((participant, index) => (
                <View key={index} style={styles.participantCard}>
                  <View style={styles.participantInfo}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>{participant.charAt(0)}</Text>
                    </View>
                    <View style={styles.participantDetails}>
                      <TextInput
                        style={styles.nameInput}
                        value={participant}
                        onChangeText={(text) => updateName(index, text)}
                        editable={index > 0}
                      />
                      {index > 0 && (
                        <TextInput
                          style={styles.emailInput}
                          placeholder="friend@example.com"
                          value={emails[index]}
                          onChangeText={(text) => updateEmail(index, text)}
                          keyboardType="email-address"
                          autoCapitalize="none"
                        />
                      )}
                    </View>
                  </View>
                  {index > 0 && (
                    <TouchableOpacity onPress={() => removeParticipant(index)}>
                      <Ionicons name="remove-circle-outline" size={24} color="#EF4444" />
                    </TouchableOpacity>
                  )}
                </View>
              ))}

              {participants.length < 5 && (
                <TouchableOpacity style={styles.addButton} onPress={addParticipant}>
                  <Ionicons name="add-circle-outline" size={20} color="#0EA5E9" />
                  <Text style={styles.addButtonText}>Add Participant</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.splitSummary}>
              <Text style={styles.splitSummaryTitle}>Each person pays</Text>
              <Text style={styles.splitSummaryAmount}>₦{calculateShare().toLocaleString()}</Text>
            </View>

            <TouchableOpacity style={styles.splitButton} onPress={handleSplit}>
              <Text style={styles.splitButtonText}>Split Fare & Send Requests</Text>
            </TouchableOpacity>
          </ScrollView>
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
  totalContainer: {
    alignItems: 'center',
    marginBottom: 20,
    padding: 16,
    backgroundColor: '#0EA5E910',
    borderRadius: 12,
  },
  totalLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  totalAmount: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0EA5E9',
  },
  participantsContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 12,
  },
  participantCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  participantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0EA5E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 16,
  },
  participantDetails: {
    flex: 1,
  },
  nameInput: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  emailInput: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#0EA5E9',
    borderRadius: 12,
    borderStyle: 'dashed',
    marginTop: 8,
  },
  addButtonText: {
    color: '#0EA5E9',
    fontWeight: '600',
  },
  splitSummary: {
    alignItems: 'center',
    marginBottom: 20,
    padding: 16,
    backgroundColor: '#10B98110',
    borderRadius: 12,
  },
  splitSummaryTitle: {
    fontSize: 12,
    color: '#6B7280',
  },
  splitSummaryAmount: {
    fontSize: 24,
    fontWeight: '800',
    color: '#10B981',
  },
  splitButton: {
    backgroundColor: '#0EA5E9',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  splitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
});