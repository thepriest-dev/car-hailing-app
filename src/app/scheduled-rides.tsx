import { router } from 'expo-router';
import { ref, onValue, update } from 'firebase/database';
import { useEffect, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { auth, db } from '../config/firebase';
import { useTheme } from '../contexts/ThemeContext';
import Logo from '../components/Logo';

export default function ScheduledRidesScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [scheduledRides, setScheduledRides] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadScheduledRides();
  }, []);

  const loadScheduledRides = () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      setIsLoading(false);
      return;
    }

    const scheduledRef = ref(db, 'scheduled_rides');
    const unsubscribe = onValue(scheduledRef, (snapshot) => {
      const data = snapshot.val();
      const rides: any[] = [];
      
      if (data) {
        Object.keys(data).forEach((key) => {
          const ride = data[key];
          if (ride.riderId === currentUser.uid && ride.status === 'pending') {
            rides.push({ id: key, ...ride });
          }
        });
      }
      
      rides.sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());
      setScheduledRides(rides);
      setIsLoading(false);
    });

    return () => unsubscribe();
  };

  const cancelScheduledRide = async (rideId: string) => {
    Alert.alert(
      'Cancel Schedule',
      'Are you sure you want to cancel this scheduled ride?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            const rideRef = ref(db, `scheduled_rides/${rideId}`);
            await update(rideRef, { status: 'cancelled' });
            Alert.alert('Success', 'Scheduled ride cancelled');
          },
        },
      ]
    );
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString(),
    };
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar style="light" backgroundColor="#0A1929" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading scheduled rides...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style="light" backgroundColor="#0A1929" />
      
      <View style={[styles.header, { paddingTop: insets.top + 16, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={[styles.backIcon, { color: colors.text }]}>←</Text>
        </TouchableOpacity>
        <Logo size="small" showText={true} />
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}>
        {scheduledRides.length === 0 ? (
          <View style={[styles.emptyContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={styles.emptyIcon}>📅</Text>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Scheduled Rides</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              You haven't scheduled any rides yet. Go to the booking screen to schedule a ride for later.
            </Text>
            <TouchableOpacity
              style={[styles.bookButton, { backgroundColor: colors.primary }]}
              onPress={() => router.push('/booking')}
            >
              <Text style={styles.bookButtonText}>Book a Ride</Text>
            </TouchableOpacity>
          </View>
        ) : (
          scheduledRides.map((ride) => {
            const { date, time } = formatDateTime(ride.scheduledDate);
            return (
              <View
                key={ride.id}
                style={[styles.rideCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <View style={styles.rideHeader}>
                  <Text style={[styles.rideType, { color: colors.primary }]}>{ride.rideType || 'Standard'}</Text>
                  <Text style={[styles.rideStatus, { color: colors.warning }]}>Pending</Text>
                </View>

                <View style={styles.routeInfo}>
                  <View style={styles.locationRow}>
                    <View style={styles.dotGreen} />
                    <Text style={[styles.locationText, { color: colors.text }]} numberOfLines={1}>
                      {ride.pickupLocation}
                    </Text>
                  </View>
                  <View style={styles.locationRow}>
                    <View style={styles.dotRed} />
                    <Text style={[styles.locationText, { color: colors.text }]} numberOfLines={1}>
                      {ride.dropoffLocation}
                    </Text>
                  </View>
                </View>

                <View style={styles.scheduleInfo}>
                  <Text style={styles.calendarIcon}>📅</Text>
                  <Text style={[styles.scheduleDate, { color: colors.text }]}>{date}</Text>
                  <Text style={[styles.scheduleTime, { color: colors.primary }]}>{time}</Text>
                </View>

                <View style={styles.fareInfo}>
                  <Text style={[styles.fareLabel, { color: colors.textSecondary }]}>Estimated Fare</Text>
                  <Text style={[styles.fareAmount, { color: colors.success }]}>₦{ride.fare?.toLocaleString()}</Text>
                </View>

                <TouchableOpacity
                  style={[styles.cancelButton, { borderColor: colors.error }]}
                  onPress={() => cancelScheduledRide(ride.id)}
                >
                  <Text style={[styles.cancelButtonText, { color: colors.error }]}>Cancel Schedule</Text>
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </ScrollView>
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
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backIcon: { fontSize: 28, fontWeight: '600' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14 },
  content: { flex: 1, padding: 20 },
  emptyContainer: { alignItems: 'center', padding: 40, borderRadius: 16, borderWidth: 1, marginTop: 40 },
  emptyIcon: { fontSize: 64, marginBottom: 16, opacity: 0.5 },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  emptyText: { fontSize: 14, textAlign: 'center', marginBottom: 20 },
  bookButton: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  bookButtonText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  rideCard: { borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1 },
  rideHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  rideType: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  rideStatus: { fontSize: 11, fontWeight: '600' },
  routeInfo: { gap: 8, marginBottom: 16 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dotGreen: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981' },
  dotRed: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444' },
  locationText: { fontSize: 13, flex: 1 },
  scheduleInfo: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#334155', marginBottom: 12 },
  calendarIcon: { fontSize: 16 },
  scheduleDate: { fontSize: 13, flex: 1 },
  scheduleTime: { fontSize: 13, fontWeight: '700' },
  fareInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  fareLabel: { fontSize: 13 },
  fareAmount: { fontSize: 16, fontWeight: '800' },
  cancelButton: { padding: 12, borderRadius: 12, alignItems: 'center', borderWidth: 1 },
  cancelButtonText: { fontSize: 14, fontWeight: '600' },
});