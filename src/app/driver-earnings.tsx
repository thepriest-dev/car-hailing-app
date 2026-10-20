import { router } from 'expo-router';
import { SafeAreaView, View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

export default function DriverEarningsScreen() {
  const { colors } = useTheme();
  
  // Sample data - will come from backend
  const todaysTrips = [
    { id: 1, route: 'Ikeja → VI', amount: 1658, time: '10:30 AM', distance: '4.2 km' },
    { id: 2, route: 'Lekki → Surulere', amount: 1420, time: '2:15 PM', distance: '3.8 km' },
    { id: 3, route: 'Yaba → Ajah', amount: 2100, time: '6:45 PM', distance: '5.5 km' },
  ];

  // Calculate totals correctly
  const totalEarnings = todaysTrips.reduce((sum, trip) => sum + trip.amount, 0);
  const totalRiderPaid = Math.round(totalEarnings / 0.85);
  const totalCommission = totalRiderPaid - totalEarnings;

  // Weekly estimate (based on today's earnings × 6 days)
  const weeklyEstimate = totalEarnings * 6;
  const monthlyEstimate = weeklyEstimate * 4;

  const handleGoBack = () => {
    router.replace('/home');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={handleGoBack} style={[styles.backBtn, { backgroundColor: colors.surface }]}>
          <Text style={[styles.backIcon, { color: colors.text }]}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>My Earnings</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.body}>
        {/* Today's Summary */}
        <View style={[styles.summaryCard, { backgroundColor: colors.surfaceLight, borderColor: colors.primary }]}>
          <Text style={[styles.summaryTitle, { color: colors.textSecondary }]}>Today's Earnings</Text>
          <Text style={[styles.summaryAmount, { color: colors.primary }]}>₦{totalEarnings.toLocaleString()}</Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Trips</Text>
              <Text style={[styles.summaryValue, { color: colors.text }]}>{todaysTrips.length}</Text>
            </View>
            <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Commission</Text>
              <Text style={[styles.summaryValue, { color: colors.text }]}>₦{totalCommission.toLocaleString()}</Text>
            </View>
            <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Net Earnings</Text>
              <Text style={[styles.summaryValue, { color: colors.success }]}>₦{totalEarnings.toLocaleString()}</Text>
            </View>
          </View>
        </View>

        {/* Earnings Projections */}
        <View style={[styles.projectionCard, { backgroundColor: colors.surface, borderColor: colors.warning }]}>
          <Text style={[styles.projectionTitle, { color: colors.warning }]}>📈 Earnings Projections</Text>
          <View style={styles.projectionRow}>
            <Text style={[styles.projectionLabel, { color: colors.textSecondary }]}>Weekly estimate:</Text>
            <Text style={[styles.projectionValue, { color: colors.text }]}>₦{weeklyEstimate.toLocaleString()}</Text>
          </View>
          <View style={styles.projectionRow}>
            <Text style={[styles.projectionLabel, { color: colors.textSecondary }]}>Monthly estimate:</Text>
            <Text style={[styles.projectionValue, { color: colors.text }]}>₦{monthlyEstimate.toLocaleString()}</Text>
          </View>
          <Text style={[styles.projectionNote, { color: colors.textSecondary }]}>*Based on today's performance</Text>
        </View>

        {/* Per-Trip Breakdown */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Today's Trips</Text>
        {todaysTrips.map((trip) => {
          const riderPaid = Math.round(trip.amount / 0.85);
          const commission = riderPaid - trip.amount;
          
          return (
            <View key={trip.id} style={[styles.tripCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.tripHeader}>
                <Text style={[styles.tripRoute, { color: colors.text }]}>{trip.route}</Text>
                <Text style={[styles.tripAmount, { color: colors.success }]}>₦{trip.amount.toLocaleString()}</Text>
              </View>
              <View style={styles.tripDetails}>
                <Text style={[styles.tripMeta, { color: colors.textSecondary }]}>🕐 {trip.time}</Text>
                <Text style={[styles.tripMeta, { color: colors.textSecondary }]}>📍 {trip.distance}</Text>
                <Text style={[styles.tripMeta, { color: colors.textSecondary }]}>💰 You keep 85%</Text>
              </View>
              <View style={[styles.tripBreakdown, { borderTopColor: colors.border }]}>
                <Text style={[styles.breakdownSmall, { color: colors.textSecondary }]}>Rider paid: ₦{riderPaid.toLocaleString()}</Text>
                <Text style={[styles.breakdownSmall, { color: colors.textSecondary }]}>Commission (15%): ₦{commission.toLocaleString()}</Text>
              </View>
            </View>
          );
        })}

        {/* Info Note */}
        <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.warning }]}>
          <Text style={styles.infoIcon}>💰</Text>
          <View style={styles.infoContent}>
            <Text style={[styles.infoTitle, { color: colors.warning }]}>You keep 85% of every fare</Text>
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              Our 15% commission helps us run the app, provide support, and keep you safe.
              Most other apps take 25-30% - that's ₦{Math.round(totalEarnings * 0.1).toLocaleString()} more in your pocket today!
            </Text>
          </View>
        </View>

        {/* Withdrawal Button */}
        <TouchableOpacity 
          style={[styles.withdrawBtn, { backgroundColor: colors.primary }]}
          onPress={() => Alert.alert('Coming Soon', 'Withdrawal feature will be available soon!')}
        >
          <Text style={styles.withdrawTxt}>💸 Withdraw Earnings</Text>
        </TouchableOpacity>

        {/* Back to Dashboard Button */}
        <TouchableOpacity 
          style={[styles.homeBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={handleGoBack}
        >
          <Text style={[styles.homeBtnTxt, { color: colors.textSecondary }]}>🏠 Back to Dashboard</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
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
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: { fontSize: 18 },
  headerTitle: { fontSize: 16, fontWeight: '700' },
  body: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
  summaryCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
  },
  summaryTitle: { fontSize: 12, textTransform: 'uppercase', marginBottom: 8 },
  summaryAmount: { fontSize: 36, fontWeight: '900', marginBottom: 16 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryLabel: { fontSize: 11 },
  summaryValue: { fontSize: 16, fontWeight: '700', marginTop: 4 },
  summaryDivider: { width: 1 },
  projectionCard: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
  },
  projectionTitle: { fontSize: 14, fontWeight: '700', marginBottom: 12 },
  projectionRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    paddingVertical: 6,
  },
  projectionLabel: { fontSize: 13 },
  projectionValue: { fontSize: 15, fontWeight: '700' },
  projectionNote: { fontSize: 10, marginTop: 8, textAlign: 'center' },
  sectionTitle: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', marginBottom: 12 },
  tripCard: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  tripHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  tripRoute: { fontSize: 15, fontWeight: '700' },
  tripAmount: { fontSize: 16, fontWeight: '800' },
  tripDetails: { flexDirection: 'row', gap: 16, marginBottom: 12, flexWrap: 'wrap' },
  tripMeta: { fontSize: 12 },
  tripBreakdown: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    paddingTop: 8, 
    borderTopWidth: 1,
    flexWrap: 'wrap',
    gap: 8,
  },
  breakdownSmall: { fontSize: 11 },
  infoCard: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 16,
    marginTop: 8,
    marginBottom: 16,
    gap: 12,
    borderWidth: 1,
  },
  infoIcon: { fontSize: 28 },
  infoContent: { flex: 1 },
  infoTitle: { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  infoText: { fontSize: 12, lineHeight: 18 },
  withdrawBtn: {
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  withdrawTxt: { color: '#fff', fontSize: 15, fontWeight: '700' },
  homeBtn: {
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
  },
  homeBtnTxt: { fontSize: 15, fontWeight: '700' },
});