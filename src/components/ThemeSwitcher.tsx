// src/components/ThemeSwitcher.tsx
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

export default function ThemeSwitcher() {
  const { mode, setMode, colors } = useTheme();
  const [showModal, setShowModal] = useState(false);

  const themeOptions = [
    { id: 'light', label: '☀️ Light Mode', icon: '☀️' },
    { id: 'dark', label: '🌙 Dark Mode', icon: '🌙' },
    { id: 'system', label: '📱 System Default', icon: '📱' },
  ];

  const getCurrentModeLabel = () => {
    switch (mode) {
      case 'light': return '☀️ Light';
      case 'dark': return '🌙 Dark';
      case 'system': return '📱 System';
      default: return '🌙 Dark';
    }
  };

  return (
    <>
      <TouchableOpacity 
        style={[styles.themeButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => setShowModal(true)}
      >
        <Text style={styles.themeButtonIcon}>🎨</Text>
        <Text style={[styles.themeButtonText, { color: colors.text }]}>
          {getCurrentModeLabel()}
        </Text>
      </TouchableOpacity>

      <Modal
        visible={showModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setShowModal(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Choose Theme</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Text style={[styles.modalClose, { color: colors.textSecondary }]}>✕</Text>
              </TouchableOpacity>
            </View>

            {themeOptions.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.themeOption,
                  { backgroundColor: colors.surfaceLight, borderColor: colors.border },
                  mode === option.id && styles.themeOptionActive,
                  mode === option.id && { borderColor: colors.primary }
                ]}
                onPress={() => {
                  setMode(option.id as any);
                  setShowModal(false);
                }}
              >
                <Text style={styles.themeOptionIcon}>{option.icon}</Text>
                <Text style={[styles.themeOptionLabel, { color: colors.text }]}>
                  {option.label}
                </Text>
                {mode === option.id && (
                  <Text style={[styles.checkmark, { color: colors.primary }]}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  themeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  themeButtonIcon: {
    fontSize: 14,
  },
  themeButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
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
    borderBottomColor: '#E5E5E5',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalClose: {
    fontSize: 18,
    fontWeight: '600',
  },
  themeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    gap: 12,
  },
  themeOptionActive: {
    borderWidth: 2,
  },
  themeOptionIcon: {
    fontSize: 24,
  },
  themeOptionLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  checkmark: {
    fontSize: 18,
    fontWeight: '700',
  },
});