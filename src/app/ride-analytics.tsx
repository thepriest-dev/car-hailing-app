import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { auth, db } from '../config/firebase';
import { ref, get } from 'firebase/database';
import { useEffect, useState } from 'react';
import Logo from '../components/Logo';

export default function RideAnalyticsScreen() {
  const { colors } = useTheme();
  const [stats, setStats] = useState({
    totalRides: 0,
    totalSpent: 0,
    averageRating: 0,
    favoriteRoute: '',
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
      let totalSpent = 0;
      let routeCounts: Record<string, number> = {};
      
      if (rides) {
        Object.keys(rides).forEach((key) => {
          const ride = rides[key];
          if (ride.riderId === currentUser.uid && ride.status === 'completed') {
            totalRides++;
            totalSpent += ride.fare || 0;
            
            const route = `${ride.pickupLocation} → ${ride.dropoffLocation}`;
            routeCounts[route] = (routeCounts[route] || 0) + 1;
          }
        });
      }
      
      // Find favorite route
      let favoriteRoute = 'No trips yet';
      let maxCount = 0;
      for (const [route, count] of Object.entries(routeCounts)) {
        if (count > maxCount) {
          maxCount = count;
          favoriteRoute = route;
        }
      }
      
      setStats({
        totalRides,
        totalSpent,
        averageRating: 4.8,
        favoriteRoute: favoriteRoute !== 'No trips yet' ? favoriteRoute : 'No trips yet',
      });
    } catch (error) {
      console.log('Error loading stats:', error);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Ride Analytics</Text>
      </View>
      
      <ScrollView style={styles.content}>
        <View style={[styles.statsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Your VeloCity Stats</Text>
          
          <View style={styles.statRow}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Rides</Text>
            <Text style={[styles.statValue, { color: colors.primary }]}>{stats.totalRides}</Text>
          </View>
          
          <View style={styles.statRow}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Spent</Text>
            <Text style={[styles.statValue, { color: colors.success }]}>₦{stats.totalSpent.toLocaleString()}</Text>
          </View>
          
          <View style={styles.statRow}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Average Rating</Text>
            <Text style={[styles.statValue, { color: colors.warning }]}>{stats.averageRating} ⭐</Text>
          </View>
          
          <View style={styles.statRow}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Favorite Route</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>{stats.favoriteRoute}</Text>
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