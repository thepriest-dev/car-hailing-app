import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface PromoCodeInputProps {
  onApply: (code: string, discount: number) => void;
}

const validPromoCodes: { [key: string]: number } = {
  'WELCOME50': 50,
  'FIRSTRIDE': 30,
  'VELOCITY20': 20,
  'SAVE10': 10,
};

export default function PromoCodeInput({ onApply }: PromoCodeInputProps) {
  const [code, setCode] = useState('');
  const [applied, setApplied] = useState(false);
  const [discountAmount, setDiscountAmount] = useState(0);

  const applyPromoCode = () => {
    const codeUpper = code.toUpperCase();
    if (validPromoCodes[codeUpper]) {
      const discount = validPromoCodes[codeUpper];
      setDiscountAmount(discount);
      setApplied(true);
      onApply(codeUpper, discount);
      Alert.alert('Success', `${discount}% discount applied!`);
    } else {
      Alert.alert('Invalid Code', 'Please enter a valid promo code');
    }
  };

  const removePromoCode = () => {
    setCode('');
    setApplied(false);
    setDiscountAmount(0);
    onApply('', 0);
  };

  if (applied) {
    return (
      <View style={styles.appliedContainer}>
        <View style={styles.appliedBadge}>
          <Ionicons name="pricetag" size={16} color="#10B981" />
          <Text style={styles.appliedText}>{code.toUpperCase()} - {discountAmount}% OFF</Text>
        </View>
        <TouchableOpacity onPress={removePromoCode}>
          <Ionicons name="close-circle" size={20} color="#EF4444" />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <Ionicons name="pricetag-outline" size={20} color="#6B7280" />
        <TextInput
          style={styles.input}
          placeholder="Enter promo code"
          placeholderTextColor="#9CA3AF"
          value={code}
          onChangeText={setCode}
          autoCapitalize="characters"
        />
        <TouchableOpacity
          style={[styles.applyButton, !code && styles.disabledButton]}
          onPress={applyPromoCode}
          disabled={!code}
        >
          <Text style={styles.applyButtonText}>Apply</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    marginLeft: 8,
  },
  applyButton: {
    backgroundColor: '#0EA5E9',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  applyButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 12,
  },
  disabledButton: {
    backgroundColor: '#9CA3AF',
  },
  appliedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#10B98120',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  appliedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  appliedText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#10B981',
  },
});