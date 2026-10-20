import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { auth, db } from '../config/firebase';
import { ref, get } from 'firebase/database';
import { useEffect, useState } from 'react';
import Logo from '../components/Logo';

export default function DriverAnalyticsScreen() {
  const { colors } = useTheme();
  const [stats, setStats] = useState({
    totalRides: 0,
    totalEarnings: 0,
    averageRating: 0,
    totalDistance: 0,
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    try {
      const ridesRef = ref(db, 'rides');
      const snapshot = await get(ridesRef);
      const rides = snapshot.val();
      
      let totalRides = 0;
      let totalEarnings = 0;
      let ratingSum = 0;
      let ratingCount = 0;
      
      if (rides) {
        Object.keys(rides).forEach((key) => {
          const ride = rides[key];
          if (ride.driverId === currentUser.uid && ride.status === 'completed') {
            totalRides++;
            totalEarnings += ride.fare ? ride.fare * 0.85 : 0;
            
            if (ride.passengerRating) {
              ratingSum += ride.passengerRating;
              ratingCount++;
            }
          }
        });
      }
      
      const averageRating = ratingCount > 0 ? ratingSum / ratingCount : 0;
      
      setStats({
        totalRides,
        totalEarnings,
        averageRating: parseFloat(averageRating.toFixed(1)),
        totalDistance: totalRides * 4.2,
      });
    } catch (error) {
      console.log('Error loading driver stats:', error);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Driver Analytics</Text>
      </View>
      
      <ScrollView style={styles.content}>
        <View style={[styles.statsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Your VeloCity Performance</Text>
          
          <View style={styles.statRow}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Rides</Text>
            <Text style={[styles.statValue, { color: colors.primary }]}>{stats.totalRides}</Text>
          </View>
          
          <View style={styles.statRow}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Earnings</Text>
            <Text style={[styles.statValue, { color: colors.success }]}>₦{stats.totalEarnings.toLocaleString()}</Text>
          </View>
          
          <View style={styles.statRow}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Average Rating</Text>
            <Text style={[styles.statValue, { color: colors.warning }]}>{stats.averageRating} ⭐</Text>
          </View>
          
          <View style={styles.statRow}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Distance</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>{stats.totalDistance.toFixed(1)} km</Text>
          </View>
        </View>
        
        <View style={[styles.taglineCard, { backgroundColor: colors.surfaceLight, borderColor: colors.primary }]}>
          <Logo size="small" showText={false} />
          <Text style={[styles.taglineText, { color: colors.text }]}>Set the Pace. Arrive in Style.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  content: { flex: 1, padding: 20 },
  statsCard: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    marginBottom: 20,
  },
  cardTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  statLabel: { fontSize: 14 },
  statValue: { fontSize: 14, fontWeight: '700' },
  taglineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  taglineText: { fontSize: 12, fontWeight: '600' },
});