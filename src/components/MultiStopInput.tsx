import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

interface Stop {
  id: string;
  address: string;
  order: number;
  latitude?: number;
  longitude?: number;
}

interface MultiStopInputProps {
  stops: Stop[];
  destination?: string;
  onAddStop: () => void;
  onRemoveStop: (id: string) => void;
  onUpdateStop: (id: string, address: string) => void;
  maxStops?: number;
}

export default function MultiStopInput({
  stops,
  destination = '',
  onAddStop,
  onRemoveStop,
  onUpdateStop,
  maxStops = 5,
}: MultiStopInputProps) {
  const { colors } = useTheme();
  const fadeAnim = React.useRef(new Animated.Value(1)).current;

  const animateRemove = (id: string, callback: () => void) => {
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 0,
        useNativeDriver: true,
      }),
    ]).start();
    callback();
  };

  const canAddMore = stops.length < maxStops;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>🚏 Trip Stops</Text>
        <Text style={[styles.headerCount, { color: colors.textSecondary }]}>
          {stops.length} of {maxStops} stops
        </Text>
      </View>

      <View style={styles.stopsContainer}>
        {/* Pickup (always first) */}
        <View style={[styles.stopRow, { borderLeftColor: '#10B981' }]}>
          <View style={styles.stopNumber}>
            <View style={[styles.stopDot, { backgroundColor: '#10B981' }]} />
            <View style={[styles.stopLine, { backgroundColor: colors.border }]} />
          </View>
          <View style={styles.stopContent}>
            <Text style={[styles.stopLabel, { color: colors.success }]}>PICKUP</Text>
            <Text style={[styles.stopAddress, { color: colors.text }]}>
              {destination || 'Current Location'}
            </Text>
          </View>
        </View>

        {/* Intermediate Stops */}
        {stops.map((stop, index) => (
          <Animated.View
            key={stop.id}
            style={[
              styles.stopRow,
              { borderLeftColor: colors.warning, opacity: fadeAnim },
            ]}
          >
            <View style={styles.stopNumber}>
              <View style={[styles.stopDot, { backgroundColor: colors.warning }]} />
              <View style={[styles.stopLine, { backgroundColor: colors.border }]} />
              <Text style={[styles.stopIndex, { color: colors.warning }]}>
                {index + 1}
              </Text>
            </View>
            <View style={styles.stopContent}>
              <Text style={[styles.stopLabel, { color: colors.warning }]}>STOP {index + 1}</Text>
              <TextInput
                style={[
                  styles.stopInput,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                placeholder="Enter stop address"
                placeholderTextColor={colors.textSecondary}
                value={stop.address}
                onChangeText={(text) => onUpdateStop(stop.id, text)}
              />
              <TouchableOpacity
                style={styles.removeStopBtn}
                onPress={() => animateRemove(stop.id, () => onRemoveStop(stop.id))}
              >
                <Text style={[styles.removeStopText, { color: colors.error }]}>Remove</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        ))}

        {/* Destination (always last) */}
        <View style={[styles.stopRow, { borderLeftColor: '#EF4444' }]}>
          <View style={styles.stopNumber}>
            <View style={[styles.stopDot, { backgroundColor: '#EF4444' }]} />
          </View>
          <View style={styles.stopContent}>
            <Text style={[styles.stopLabel, { color: colors.error }]}>DESTINATION</Text>
            <Text style={[styles.stopAddress, { color: colors.text }]}>
              {destination || 'Enter destination'}
            </Text>
          </View>
        </View>
      </View>

      {/* Add Stop Button */}
      {canAddMore && (
        <TouchableOpacity
          style={[styles.addStopBtn, { backgroundColor: colors.surface, borderColor: colors.primary }]}
          onPress={onAddStop}
        >
          <Text style={styles.addStopIcon}>+</Text>
          <Text style={[styles.addStopText, { color: colors.primary }]}>Add Stop</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  headerCount: {
    fontSize: 12,
  },
  stopsContainer: {
    marginBottom: 12,
  },
  stopRow: {
    flexDirection: 'row',
    borderLeftWidth: 3,
    marginBottom: 12,
    paddingLeft: 8,
  },
  stopNumber: {
    width: 30,
    alignItems: 'center',
    marginRight: 8,
  },
  stopDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
  },
  stopLine: {
    width: 2,
    height: 30,
    marginVertical: 4,
  },
  stopIndex: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  stopContent: {
    flex: 1,
  },
  stopLabel: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  stopAddress: {
    fontSize: 14,
    fontWeight: '500',
  },
  stopInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    marginBottom: 4,
  },
  removeStopBtn: {
    alignSelf: 'flex-start',
  },
  removeStopText: {
    fontSize: 11,
    fontWeight: '600',
  },
  addStopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    gap: 8,
  },
  addStopIcon: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0EA5E9',
  },
  addStopText: {
    fontSize: 14,
    fontWeight: '600',
  },
});