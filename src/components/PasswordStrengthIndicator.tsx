import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PasswordStrength } from '../utils/passwordSecurity';

interface PasswordStrengthIndicatorProps {
  strength: PasswordStrength;
}

export default function PasswordStrengthIndicator({ strength }: PasswordStrengthIndicatorProps) {
  const getStrengthColor = () => {
    switch (strength) {
      case PasswordStrength.VERY_WEAK:
        return '#EF4444';
      case PasswordStrength.WEAK:
        return '#F59E0B';
      case PasswordStrength.MEDIUM:
        return '#FBBF24';
      case PasswordStrength.STRONG:
        return '#10B981';
      case PasswordStrength.VERY_STRONG:
        return '#059669';
      default:
        return '#6B7280';
    }
  };

  const getStrengthWidth = () => {
    switch (strength) {
      case PasswordStrength.VERY_WEAK:
        return '20%';
      case PasswordStrength.WEAK:
        return '40%';
      case PasswordStrength.MEDIUM:
        return '60%';
      case PasswordStrength.STRONG:
        return '80%';
      case PasswordStrength.VERY_STRONG:
        return '100%';
      default:
        return '0%';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.barContainer}>
        <View style={[styles.strengthBar, { width: getStrengthWidth(), backgroundColor: getStrengthColor() }]} />
      </View>
      <Text style={[styles.strengthText, { color: getStrengthColor() }]}>
        Password Strength: {strength}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
    marginBottom: 8,
  },
  barContainer: {
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    overflow: 'hidden',
  },
  strengthBar: {
    height: '100%',
    borderRadius: 2,
  },
  strengthText: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
});