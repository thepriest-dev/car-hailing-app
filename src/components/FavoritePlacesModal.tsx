// src/components/FavoritePlacesModal.tsx
import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import favoritePlacesService, { FavoritePlace } from '../services/favoritePlacesService';
import * as Location from 'expo-location';

interface FavoritePlacesModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectPlace: (place: FavoritePlace) => void;
}

export default function FavoritePlacesModal({ visible, onClose, onSelectPlace }: FavoritePlacesModalProps) {
  const { colors } = useTheme();
  const [places, setPlaces] = useState<FavoritePlace[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPlace, setNewPlace] = useState({ name: '', address: '', icon: '📍', color: colors.primary });
  const [editingPlace, setEditingPlace] = useState<FavoritePlace | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      loadPlaces();
    }
  }, [visible]);

  const loadPlaces = async () => {
    const savedPlaces = await favoritePlacesService.getFavoritePlaces();
    setPlaces(savedPlaces);
  };

  const handleSelectPlace = (place: FavoritePlace) => {
    if (place.address) {
      onSelectPlace(place);
      onClose();
    } else {
      Alert.alert('Location Not Set', `Please set your ${place.name} address first.`);
      setEditingPlace(place);
    }
  };

  const handleAddPlace = async () => {
    if (!newPlace.name || !newPlace.address) {
      Alert.alert('Error', 'Please fill in name and address');
      return;
    }

    setIsLoading(true);
    // Get coordinates from address
    const geocode = await Location.geocodeAsync(newPlace.address);
    const coordinates = geocode[0] || { latitude: 0, longitude: 0 };

    await favoritePlacesService.addFavoritePlace({
      name: newPlace.name,
      address: newPlace.address,
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
      icon: newPlace.icon,
      color: newPlace.color,
    });

    await loadPlaces();
    setNewPlace({ name: '', address: '', icon: '📍', color: colors.primary });
    setShowAddForm(false);
    setIsLoading(false);
  };

  const handleUpdatePlace = async () => {
    if (!editingPlace) return;
    
    setIsLoading(true);
    if (editingPlace.address && (!editingPlace.latitude || editingPlace.latitude === 0)) {
      const geocode = await Location.geocodeAsync(editingPlace.address);
      const coordinates = geocode[0] || { latitude: 0, longitude: 0 };
      editingPlace.latitude = coordinates.latitude;
      editingPlace.longitude = coordinates.longitude;
    }
    
    await favoritePlacesService.updateFavoritePlace(editingPlace.id, editingPlace);
    await loadPlaces();
    setEditingPlace(null);
    setIsLoading(false);
  };

  const handleDeletePlace = async (id: string) => {
    Alert.alert('Delete Place', 'Are you sure you want to remove this favorite place?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await favoritePlacesService.deleteFavoritePlace(id);
          await loadPlaces();
        }
      }
    ]);
  };

  const placeIcons = ['🏠', '💼', '📍', '🏢', '🏥', '🏫', '🛒', '🍽️', '☕', '⛽', '✈️', '🏨'];

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
            <Text style={[styles.modalTitle, { color: colors.text }]}>⭐ Favorite Places</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={[styles.modalClose, { color: colors.textSecondary }]}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Edit Place Form */}
            {editingPlace && (
              <View style={[styles.editForm, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.formTitle, { color: colors.text }]}>Set {editingPlace.name} Address</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surfaceLight, borderColor: colors.border, color: colors.text }]}
                  placeholder="Enter your address"
                  placeholderTextColor={colors.textSecondary}
                  value={editingPlace.address}
                  onChangeText={(text) => setEditingPlace({ ...editingPlace, address: text })}
                />
                <View style={styles.formButtons}>
                  <TouchableOpacity style={[styles.formCancel, { borderColor: colors.border }]} onPress={() => setEditingPlace(null)}>
                    <Text style={[styles.formCancelText, { color: colors.textSecondary }]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.formSave, { backgroundColor: colors.primary }]} onPress={handleUpdatePlace}>
                    <Text style={styles.formSaveText}>Save</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Add New Place Form */}
            {showAddForm && (
              <View style={[styles.addForm, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.formTitle, { color: colors.text }]}>Add New Place</Text>
                
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surfaceLight, borderColor: colors.border, color: colors.text }]}
                  placeholder="Place name (e.g., Gym, Mall)"
                  placeholderTextColor={colors.textSecondary}
                  value={newPlace.name}
                  onChangeText={(text) => setNewPlace({ ...newPlace, name: text })}
                />
                
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surfaceLight, borderColor: colors.border, color: colors.text }]}
                  placeholder="Address"
                  placeholderTextColor={colors.textSecondary}
                  value={newPlace.address}
                  onChangeText={(text) => setNewPlace({ ...newPlace, address: text })}
                />
                
                <Text style={[styles.iconLabel, { color: colors.textSecondary }]}>Choose Icon:</Text>
                <View style={styles.iconGrid}>
                  {placeIcons.map(icon => (
                    <TouchableOpacity
                      key={icon}
                      style={[styles.iconOption, newPlace.icon === icon && { borderColor: colors.primary, backgroundColor: colors.surfaceLight }]}
                      onPress={() => setNewPlace({ ...newPlace, icon })}
                    >
                      <Text style={styles.iconText}>{icon}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.formButtons}>
                  <TouchableOpacity style={[styles.formCancel, { borderColor: colors.border }]} onPress={() => setShowAddForm(false)}>
                    <Text style={[styles.formCancelText, { color: colors.textSecondary }]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.formSave, { backgroundColor: colors.primary }]} onPress={handleAddPlace}>
                    <Text style={styles.formSaveText}>Add Place</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Places List */}
            {places.map(place => (
              <TouchableOpacity
                key={place.id}
                style={[styles.placeCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => handleSelectPlace(place)}
                onLongPress={() => {
                  if (!place.isDefault) {
                    Alert.alert('Delete Place', `Remove "${place.name}" from favorites?`, [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Delete', style: 'destructive', onPress: () => handleDeletePlace(place.id) }
                    ]);
                  } else if (place.id === 'home' || place.id === 'work') {
                    setEditingPlace(place);
                  }
                }}
              >
                <View style={[styles.placeIconContainer, { backgroundColor: `${place.color}20` }]}>
                  <Text style={styles.placeIcon}>{place.icon}</Text>
                </View>
                <View style={styles.placeInfo}>
                  <Text style={[styles.placeName, { color: colors.text }]}>{place.name}</Text>
                  <Text style={[styles.placeAddress, { color: colors.textSecondary }]} numberOfLines={1}>
                    {place.address || 'Tap to set address'}
                  </Text>
                </View>
                <Text style={[styles.placeArrow, { color: colors.textSecondary }]}>›</Text>
              </TouchableOpacity>
            ))}

            {/* Add New Button */}
            {!showAddForm && !editingPlace && (
              <TouchableOpacity
                style={[styles.addButton, { backgroundColor: colors.surface, borderColor: colors.primary, borderWidth: 2 }]}
                onPress={() => setShowAddForm(true)}
              >
                <Text style={[styles.addButtonText, { color: colors.primary }]}>+ Add New Place</Text>
              </TouchableOpacity>
            )}

            <View style={{ height: 40 }} />
          </ScrollView>
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
  placeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
  },
  placeIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  placeIcon: {
    fontSize: 24,
  },
  placeInfo: {
    flex: 1,
  },
  placeName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  placeAddress: {
    fontSize: 12,
  },
  placeArrow: {
    fontSize: 20,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 2,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  addForm: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  editForm: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  input: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
    fontSize: 14,
  },
  iconLabel: {
    fontSize: 12,
    marginBottom: 8,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  iconOption: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  iconText: {
    fontSize: 24,
  },
  formButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  formCancel: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
  },
  formCancelText: {
    fontSize: 14,
    fontWeight: '600',
  },
  formSave: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  formSaveText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});