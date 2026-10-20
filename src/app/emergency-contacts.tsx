import { useState, useEffect } from 'react';
import { router } from 'expo-router';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, TextInput, Modal, SafeAreaView
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { auth, db } from '../config/firebase';
import { ref, get, set, push, remove } from 'firebase/database';
import Logo from '../components/Logo';

export default function EmergencyContactsScreen() {
  const { colors } = useTheme();
  const [contacts, setContacts] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newContact, setNewContact] = useState({ name: '', phone: '' });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    try {
      const contactsRef = ref(db, `emergency_contacts/${currentUser.uid}`);
      const snapshot = await get(contactsRef);
      const data = snapshot.val();
      
      const contactsList = [];
      if (data) {
        for (let key in data) {
          contactsList.push({ id: key, ...data[key] });
        }
      }
      setContacts(contactsList);
      setIsLoading(false);
    } catch (error) {
      console.log('Error loading contacts:', error);
      setIsLoading(false);
    }
  };

  const addContact = async () => {
    if (!newContact.name || !newContact.phone) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    const currentUser = auth.currentUser;
    if (!currentUser) return;

    try {
      const contactsRef = ref(db, `emergency_contacts/${currentUser.uid}`);
      const newContactRef = push(contactsRef);
      await set(newContactRef, {
        name: newContact.name,
        phone: newContact.phone,
        createdAt: new Date().toISOString(),
      });
      
      setNewContact({ name: '', phone: '' });
      setShowAddModal(false);
      loadContacts();
      Alert.alert('Success', 'Emergency contact added');
    } catch (error) {
      console.log('Error adding contact:', error);
      Alert.alert('Error', 'Failed to add contact');
    }
  };

  const deleteContact = async (id: string) => {
    Alert.alert(
      'Delete Contact',
      'Are you sure you want to remove this emergency contact?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const currentUser = auth.currentUser;
            if (!currentUser) return;
            
            const contactRef = ref(db, `emergency_contacts/${currentUser.uid}/${id}`);
            await remove(contactRef);
            loadContacts();
            Alert.alert('Success', 'Contact removed');
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.surface }]}>
          <Text style={[styles.backIcon, { color: colors.text }]}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Emergency Contacts</Text>
        <TouchableOpacity onPress={() => setShowAddModal(true)} style={[styles.addBtn, { backgroundColor: colors.primary }]}>
          <Text style={styles.addBtnText}>+</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <View style={[styles.infoCard, { backgroundColor: colors.surfaceLight, borderColor: colors.warning }]}>
          <Text style={styles.infoIcon}>🆘</Text>
          <View style={styles.infoContent}>
            <Text style={[styles.infoTitle, { color: colors.warning }]}>Safety First</Text>
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              Your emergency contacts will be notified if you use the SOS button during a VeloCity ride.
            </Text>
          </View>
        </View>

        {contacts.length === 0 ? (
          <View style={[styles.emptyContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={styles.emptyIcon}>📞</Text>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No emergency contacts</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Add contacts who will be alerted in case of emergency
            </Text>
          </View>
        ) : (
          contacts.map((contact) => (
            <View key={contact.id} style={[styles.contactCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.contactInfo}>
                <Text style={[styles.contactName, { color: colors.text }]}>{contact.name}</Text>
                <Text style={[styles.contactPhone, { color: colors.textSecondary }]}>{contact.phone}</Text>
              </View>
              <TouchableOpacity onPress={() => deleteContact(contact.id)}>
                <Text style={[styles.deleteBtn, { color: colors.error }]}>🗑️</Text>
              </TouchableOpacity>
            </View>
          ))
        )}

        <View style={[styles.taglineCard, { backgroundColor: colors.surfaceLight, borderColor: colors.primary }]}>
          <Logo size="small" showText={false} />
          <Text style={[styles.taglineText, { color: colors.text }]}>Set the Pace. Arrive in Style.</Text>
        </View>
      </ScrollView>

      {/* Add Contact Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent onRequestClose={() => setShowAddModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Add Emergency Contact</Text>
            
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="Full Name"
              placeholderTextColor={colors.textSecondary}
              value={newContact.name}
              onChangeText={(text) => setNewContact({ ...newContact, name: text })}
            />
            
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="Phone Number"
              placeholderTextColor={colors.textSecondary}
              value={newContact.phone}
              onChangeText={(text) => setNewContact({ ...newContact, phone: text })}
              keyboardType="phone-pad"
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalCancel, { borderColor: colors.error }]} onPress={() => setShowAddModal(false)}>
                <Text style={[styles.modalCancelText, { color: colors.error }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalSave, { backgroundColor: colors.primary }]} onPress={addContact}>
                <Text style={styles.modalSaveText}>Save Contact</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: { fontSize: 18 },
  headerTitle: { fontSize: 16, fontWeight: '700' },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: { color: '#fff', fontSize: 20, fontWeight: '700' },
  content: { flex: 1, padding: 20 },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    gap: 12,
  },
  infoIcon: { fontSize: 28 },
  infoContent: { flex: 1 },
  infoTitle: { fontSize: 13, fontWeight: '700', marginBottom: 4 },
  infoText: { fontSize: 11 },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 20,
  },
  emptyIcon: { fontSize: 48, marginBottom: 16, opacity: 0.5 },
  emptyTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  emptyText: { fontSize: 12, textAlign: 'center' },
  contactCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  contactInfo: { flex: 1 },
  contactName: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  contactPhone: { fontSize: 13 },
  deleteBtn: { fontSize: 22, padding: 8 },
  taglineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
    marginTop: 20,
    marginBottom: 30,
  },
  taglineText: { fontSize: 12, fontWeight: '600' },
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
    borderWidth: 1,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 20, textAlign: 'center' },
  modalInput: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    fontSize: 14,
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  modalCancel: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  modalCancelText: { fontSize: 14, fontWeight: '600' },
  modalSave: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalSaveText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});