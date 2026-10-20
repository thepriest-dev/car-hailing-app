import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface RideOption {
  id: string;
  name: string;
  icon: string;
  price: number;
  time: number;
  description: string;
  capacity: number;
  color: string;
}

interface RideOptionsProps {
  onSelect: (ride: RideOption) => void;
  selectedId?: string;
  distanceKm?: number;
}

const rideOptions: RideOption[] = [
  {
    id: 'standard',
    name: 'Standard',
    icon: '🚗',
    price: 1200,
    time: 3,
    description: 'Affordable, everyday rides',
    capacity: 4,
    color: '#0EA5E9',
  },
  {
    id: 'comfort',
    name: 'Comfort',
    icon: '🚙',
    price: 2000,
    time: 4,
    description: 'Newer cars with extra legroom',
    capacity: 4,
    color: '#10B981',
  },
  {
    id: 'business',
    name: 'Business',
    icon: '🚘',
    price: 3500,
    time: 5,
    description: 'Premium cars for business',
    capacity: 4,
    color: '#8B5CF6',
  },
  {
    id: 'luxury',
    name: 'Luxury',
    icon: '🏎️',
    price: 6000,
    time: 6,
    description: 'Luxury vehicles, top-rated drivers',
    capacity: 4,
    color: '#F59E0B',
  },
  {
    id: 'bike',
    name: 'Bike',
    icon: '🛵',
    price: 800,
    time: 2,
    description: 'Fastest in traffic',
    capacity: 1,
    color: '#EF4444',
  },
];

export default function RideOptions({ onSelect, selectedId, distanceKm = 5 }: RideOptionsProps) {
  const calculatePrice = (basePrice: number) => {
    const distanceFactor = distanceKm / 5;
    return Math.round(basePrice * distanceFactor);
  };

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.container}>
      {rideOptions.map((ride) => {
        const isSelected = selectedId === ride.id;
        const finalPrice = calculatePrice(ride.price);
        
        return (
          <TouchableOpacity
            key={ride.id}
            style={[
              styles.rideCard,
              { borderColor: isSelected ? ride.color : '#E5E7EB' },
              isSelected && { backgroundColor: `${ride.color}10` }
            ]}
            onPress={() => onSelect({ ...ride, price: finalPrice })}
          >
            <Text style={styles.rideIcon}>{ride.icon}</Text>
            <Text style={[styles.rideName, { color: isSelected ? ride.color : '#1F2937' }]}>
              {ride.name}
            </Text>
            <Text style={styles.ridePrice}>₦{finalPrice.toLocaleString()}</Text>
            <Text style={styles.rideTime}>{ride.time} min</Text>
            <Text style={styles.rideCapacity}>
              <Ionicons name="people" size={10} /> {ride.capacity}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 0,
    marginVertical: 12,
  },
  rideCard: {
    width: 110,
    padding: 12,
    marginRight: 12,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    backgroundColor: 'white',
  },
  rideIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  rideName: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  ridePrice: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0EA5E9',
    marginBottom: 2,
  },
  rideTime: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 2,
  },
  rideCapacity: {
    fontSize: 10,
    color: '#9CA3AF',
  },
});