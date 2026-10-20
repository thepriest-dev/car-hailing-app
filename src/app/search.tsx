import { router } from 'expo-router';
import { useState } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ScrollView
} from 'react-native';

export default function SearchScreen() {
  const [pickup, setPickup] = useState('My Current Location');
  const [destination, setDestination] = useState('');

  // Local destinations for quick selection
  const suggestions = [
    { id: '1', name: 'University of Ibadan (UI)', area: 'Agbowo, Ibadan' },
    { id: '2', name: 'Ventura Mall', area: 'Samonda, Ibadan' },
    { id: '3', name: 'The Woodlands Court', area: 'Oluyole, Ibadan' },
    { id: '4', name: 'Iwo Road Electronic Market', area: 'Iwo Road, Ibadan' },
  ];

  const handleSelectLocation = (locationName: string) => {
    setDestination(locationName);
    alert(`Destination set to: ${locationName}`);
    // Smoothly bounce back to the main dashboard layout
    router.replace('/home');
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header Close Trigger */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnTxt}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Plan your ride</Text>
      </View>

      {/* Input Destination Card Layout */}
      <View style={styles.routeCard}>
        {/* Visual Destination Connection Line */}
        <View style={styles.indicatorContainer}>
          <View style={styles.greenDot} />
          <View style={styles.dashedLine} />
          <View style={styles.redSquare} />
        </View>

        {/* Text Inputs */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.inputField}
            value={pickup}
            onChangeText={setPickup}
            placeholder="Pickup location"
            placeholderTextColor="#3A6B8A"
          />
          <View style={styles.divider} />
          <TextInput
            style={[styles.inputField, styles.activeInput]}
            value={destination}
            onChangeText={setDestination}
            placeholder="Where to?"
            placeholderTextColor="#3A6B8A"
            autoFocus={true}
          />
        </View>
      </View>

      {/* Suggested Address List */}
      <ScrollView contentContainerStyle={styles.resultsList} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Suggested Places</Text>
        
        {suggestions.map((place) => (
          <TouchableOpacity 
            key={place.id} 
            style={styles.suggestionItem}
            onPress={() => handleSelectLocation(place.name)}
          >
            <View style={styles.pinIconBox}>
              <Text style={styles.pinEmoji}>📍</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.placeName}>{place.name}</Text>
              <Text style={styles.placeArea}>{place.area}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#080B14' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingTop: 40 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#162236', alignItems: 'center', justifyContent: 'center' },
  backBtnTxt: { color: '#fff', fontSize: 16, fontWeight: '600' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700', marginLeft: 16 },
  
  routeCard: { flexDirection: 'row', backgroundColor: '#0D1829', margin: 20, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#162236' },
  indicatorContainer: { alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, marginRight: 12 },
  greenDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#22c55e' },
  dashedLine: { width: 1, flex: 1, backgroundColor: '#3A6B8A', marginVertical: 4 },
  redSquare: { width: 10, height: 10, backgroundColor: '#ef4444' },
  
  inputContainer: { flex: 1, gap: 4 },
  inputField: { color: '#fff', fontSize: 15, paddingVertical: 8 },
  activeInput: { fontWeight: '600' },
  divider: { height: 1, backgroundColor: '#162236', marginVertical: 6 },
  
  resultsList: { paddingHorizontal: 20 },
  sectionTitle: { color: '#3A6B8A', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', marginBottom: 16, letterSpacing: 0.5 },
  suggestionItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#162236' },
  pinIconBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#162236', alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  pinEmoji: { color: '#0EA5E9' },
  placeName: { color: '#fff', fontSize: 15, fontWeight: '600' },
  placeArea: { color: '#3A6B8A', fontSize: 12, marginTop: 2 }
});