// app/driver-trip-earnings.tsx
import React, { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal
} from 'react-native';

type TripEarnings = {
  id: string;
  route: string;
  date: string;
  time: string;
  distance: number;
  duration: number;
  riderPaid: number;
  driverEarnings: number;
  commission: number;
  commissionRate: number;
  surgeMultiplier?: number;
  waitingTime?: number;
  trafficDelay?: number;
};

export default function DriverTripEarningsScreen() {
  const params = useLocalSearchParams();
  const [selectedTrip, setSelectedTrip] = useState<TripEarnings | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Mock data - in real app, this comes from backend
  const trips: TripEarnings[] = [
    {
      id: '1',
      route: 'Ikeja → Victoria Island',
      date: 'Today',
      time: '10:30 AM',
      distance: 4.2,
      duration: 12,
      riderPaid: 1950,
      driverEarnings: 1658,
      commission: 292,
      commissionRate: 15,
    },
    {
      id: '2',
      route: 'Lekki → Surulere',
      date: 'Today',
      time: '2:15 PM',
      distance: 3.8,
      duration: 10,
      riderPaid: 1850,
      driverEarnings: 1573,
      commission: 277,
      commissionRate: 15,
    },
    {
      id: '3',
      route: 'Yaba → Ajah',
      date: 'Today',
      time: '6:45 PM',
      distance: 5.5,
      duration: 18,
      riderPaid: 2450,
      driverEarnings: 2083,
      commission: 367,
      commissionRate: 15,
      surgeMultiplier: 1.2,
      waitingTime: 3,
    },
    {
      id: '4',
      route: 'Airport → Ikeja',
      date: 'Yesterday',
      time: '8:15 AM',
      distance: 3.2,
      duration: 8,
      riderPaid: 1600,
      driverEarnings: 1360,
      commission: 240,
      commissionRate: 15,
    },
    {
      id: '5',
      route: 'Victoria Island → Lekki',
      date: 'Yesterday',
      time: '5:30 PM',
      distance: 4.5,
      duration: 15,
      riderPaid: 2100,
      driverEarnings: 1785,
      commission: 315,
      commissionRate: 15,
      trafficDelay: 5,
    },
  ];

  const totalEarnings = trips.reduce((sum, trip) => sum + trip.driverEarnings, 0);
  const totalRiderPaid = trips.reduce((sum, trip) => sum + trip.riderPaid, 0);
  const totalCommission = trips.reduce((sum, trip) => sum + trip.commission, 0);
  const averagePerTrip = totalEarnings / trips.length;

  const openTripDetails = (trip: TripEarnings) => {
    setSelectedTrip(trip);
    setShowDetailModal(true);
  };

  // Calculate weekly and monthly projections
  const weeklyEstimate = totalEarnings * 6;
  const monthlyEstimate = weeklyEstimate * 4;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Trip Earnings Breakdown</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.body}>
        {/* Summary Cards */}
        <View style={styles.summaryGrid}>
          <View style={[styles.summaryCard, styles.totalCard]}>
            <Text style={styles.summaryLabel}>Total Earnings</Text>
            <Text style={styles.summaryAmount}>₦{totalEarnings.toLocaleString()}</Text>
            <Text style={styles.summarySub}>{trips.length} trips</Text>
          </View>
          
          <View style={[styles.summaryCard, styles.avgCard]}>
            <Text style={styles.summaryLabel}>Average per Trip</Text>
            <Text style={styles.summaryAmount}>₦{Math.round(averagePerTrip).toLocaleString()}</Text>
            <Text style={styles.summarySub}>85% of fare</Text>
          </View>
        </View>

        {/* Commission Summary */}
        <View style={styles.commissionCard}>
          <View style={styles.commissionRow}>
            <Text style={styles.commissionLabel}>Riders paid total</Text>
            <Text style={styles.commissionValue}>₦{totalRiderPaid.toLocaleString()}</Text>
          </View>
          <View style={styles.commissionRow}>
            <Text style={styles.commissionLabel}>Your earnings (85%)</Text>
            <Text style={[styles.commissionValue, { color: '#10B981' }]}>₦{totalEarnings.toLocaleString()}</Text>
          </View>
          <View style={styles.commissionRow}>
            <Text style={styles.commissionLabel}>Nexride commission (15%)</Text>
            <Text style={styles.commissionValue}>₦{totalCommission.toLocaleString()}</Text>
          </View>
          <View style={styles.commissionDivider} />
          <View style={styles.projectionRow}>
            <Text style={styles.projectionLabel}>Weekly projection:</Text>
            <Text style={styles.projectionValue}>₦{weeklyEstimate.toLocaleString()}</Text>
          </View>
          <View style={styles.projectionRow}>
            <Text style={styles.projectionLabel}>Monthly projection:</Text>
            <Text style={styles.projectionValue}>₦{monthlyEstimate.toLocaleString()}</Text>
          </View>
        </View>

        {/* Trip List */}
        <Text style={styles.sectionTitle}>Trip History</Text>
        {trips.map((trip) => (
          <TouchableOpacity
            key={trip.id}
            style={styles.tripCard}
            onPress={() => openTripDetails(trip)}
            activeOpacity={0.7}
          >
            <View style={styles.tripHeader}>
              <View>
                <Text style={styles.tripRoute}>{trip.route}</Text>
                <View style={styles.tripMeta}>
                  <Text style={styles.tripMetaText}>📅 {trip.date}</Text>
                  <Text style={styles.tripMetaText}>🕐 {trip.time}</Text>
                </View>
              </View>
              <View style={styles.tripAmount}>
                <Text style={styles.tripEarnings}>₦{trip.driverEarnings.toLocaleString()}</Text>
                <Text style={styles.tripSubEarnings}>earned</Text>
              </View>
            </View>
            
            <View style={styles.tripStats}>
              <View style={styles.tripStat}>
                <Text style={styles.tripStatLabel}>Distance</Text>
                <Text style={styles.tripStatValue}>{trip.distance} km</Text>
              </View>
              <View style={styles.tripStatDivider} />
              <View style={styles.tripStat}>
                <Text style={styles.tripStatLabel}>Duration</Text>
                <Text style={styles.tripStatValue}>{trip.duration} min</Text>
              </View>
              <View style={styles.tripStatDivider} />
              <View style={styles.tripStat}>
                <Text style={styles.tripStatLabel}>Rider paid</Text>
                <Text style={styles.tripStatValue}>₦{trip.riderPaid}</Text>
              </View>
            </View>
            
            <View style={styles.tripFooter}>
              <Text style={styles.tripFooterText}>
                You kept 85% (₦{trip.driverEarnings}) • Commission ₦{trip.commission}
              </Text>
              <Text style={styles.tapForMore}>Tap for full breakdown →</Text>
            </View>
          </TouchableOpacity>
        ))}

        {/* Info Card */}
        <View style={styles.infoCard}>
          <Text style={styles.infoIcon}>💰</Text>
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Why 85%?</Text>
            <Text style={styles.infoText}>
              We take only 15% commission to run the app, provide support, safety features, 
              and driver benefits. Most other apps take 25-30%!
            </Text>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Trip Details Modal */}
      <Modal
        visible={showDetailModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDetailModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Trip Details</Text>
              <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {selectedTrip && (
                <View style={styles.detailContainer}>
                  {/* Route Info */}
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>📍 Route</Text>
                    <Text style={styles.detailRoute}>{selectedTrip.route}</Text>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Date & Time:</Text>
                      <Text style={styles.detailValue}>{selectedTrip.date} at {selectedTrip.time}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Distance:</Text>
                      <Text style={styles.detailValue}>{selectedTrip.distance} km</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Duration:</Text>
                      <Text style={styles.detailValue}>{selectedTrip.duration} minutes</Text>
                    </View>
                  </View>

                  <View style={styles.detailDivider} />

                  {/* Fare Breakdown */}
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>💰 Fare Breakdown</Text>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Rider paid:</Text>
                      <Text style={styles.detailValue}>₦{selectedTrip.riderPaid.toLocaleString()}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Your earnings (85%):</Text>
                      <Text style={[styles.detailValue, { color: '#10B981', fontWeight: '800' }]}>
                        ₦{selectedTrip.driverEarnings.toLocaleString()}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Commission (15%):</Text>
                      <Text style={styles.detailValue}>₦{selectedTrip.commission.toLocaleString()}</Text>
                    </View>
                  </View>

                  {selectedTrip.surgeMultiplier && (
                    <>
                      <View style={styles.detailDivider} />
                      <View style={[styles.detailSection, styles.surgeSection]}>
                        <Text style={styles.detailSectionTitle}>⚡ Surge Pricing</Text>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Multiplier:</Text>
                          <Text style={[styles.detailValue, { color: '#F59E0B' }]}>
                            {selectedTrip.surgeMultiplier}x
                          </Text>
                        </View>
                        <Text style={styles.surgeNote}>
                          Higher demand meant better earnings for this trip
                        </Text>
                      </View>
                    </>
                  )}

                  {(selectedTrip.waitingTime || selectedTrip.trafficDelay) && (
                    <>
                      <View style={styles.detailDivider} />
                      <View style={styles.detailSection}>
                        <Text style={styles.detailSectionTitle}>⏱️ Extra Time</Text>
                        {selectedTrip.waitingTime && (
                          <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Waiting time:</Text>
                            <Text style={styles.detailValue}>{selectedTrip.waitingTime} minutes</Text>
                          </View>
                        )}
                        {selectedTrip.trafficDelay && (
                          <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Traffic delay:</Text>
                            <Text style={styles.detailValue}>{selectedTrip.trafficDelay} minutes</Text>
                          </View>
                        )}
                        <Text style={styles.extraNote}>
                          You were fairly compensated for extra time
                        </Text>
                      </View>
                    </>
                  )}

                  <View style={styles.detailDivider} />

                  {/* Summary */}
                  <View style={styles.detailSummary}>
                    <Text style={styles.summaryTitle}>Trip Summary</Text>
                    <Text style={styles.summaryText}>
                      You earned ₦{selectedTrip.driverEarnings.toLocaleString()} from this trip.
                      {selectedTrip.surgeMultiplier && ' Surge pricing gave you a bonus!'}
                    </Text>
                  </View>
                </View>
              )}
            </ScrollView>

            <TouchableOpacity 
              style={styles.modalButton}
              onPress={() => setShowDetailModal(false)}
            >
              <Text style={styles.modalButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#080B14' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderColor: '#162236',
  },
  backBtn: {
    width: 36,
    height: 36,
    backgroundColor: '#0D1829',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: { color: '#fff', fontSize: 18 },
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  body: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
  
  summaryGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
  },
  totalCard: {
    backgroundColor: '#0D2A3A',
    borderWidth: 1,
    borderColor: '#0EA5E9',
  },
  avgCard: {
    backgroundColor: '#0D1829',
    borderWidth: 1,
    borderColor: '#162236',
  },
  summaryLabel: { color: '#3A6B8A', fontSize: 11, textTransform: 'uppercase', marginBottom: 4 },
  summaryAmount: { color: '#0EA5E9', fontSize: 24, fontWeight: '900' },
  summarySub: { color: '#3A6B8A', fontSize: 10, marginTop: 4 },
  
  commissionCard: {
    backgroundColor: '#0D1829',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#162236',
  },
  commissionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  commissionLabel: { color: '#9CA3AF', fontSize: 13 },
  commissionValue: { color: '#fff', fontSize: 13, fontWeight: '600' },
  commissionDivider: { height: 1, backgroundColor: '#162236', marginVertical: 8 },
  projectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  projectionLabel: { color: '#3A6B8A', fontSize: 12 },
  projectionValue: { color: '#F59E0B', fontSize: 12, fontWeight: '700' },
  
  sectionTitle: { color: '#3A6B8A', fontSize: 11, fontWeight: '600', textTransform: 'uppercase', marginBottom: 12 },
  
  tripCard: {
    backgroundColor: '#0D1829',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#162236',
  },
  tripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  tripRoute: { color: '#fff', fontSize: 15, fontWeight: '700', marginBottom: 4 },
  tripMeta: { flexDirection: 'row', gap: 12, marginTop: 4 },
  tripMetaText: { color: '#3A6B8A', fontSize: 11 },
  tripAmount: { alignItems: 'flex-end' },
  tripEarnings: { color: '#10B981', fontSize: 18, fontWeight: '800' },
  tripSubEarnings: { color: '#3A6B8A', fontSize: 10, marginTop: 2 },
  tripStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#162236',
    marginBottom: 12,
  },
  tripStat: { alignItems: 'center', flex: 1 },
  tripStatLabel: { color: '#3A6B8A', fontSize: 10, marginBottom: 2 },
  tripStatValue: { color: '#fff', fontSize: 13, fontWeight: '600' },
  tripStatDivider: { width: 1, backgroundColor: '#162236' },
  tripFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tripFooterText: { color: '#3A6B8A', fontSize: 10 },
  tapForMore: { color: '#0EA5E9', fontSize: 10, fontWeight: '600' },
  
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#0D1829',
    borderRadius: 14,
    padding: 16,
    marginTop: 8,
    marginBottom: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  infoIcon: { fontSize: 28 },
  infoContent: { flex: 1 },
  infoTitle: { color: '#F59E0B', fontSize: 14, fontWeight: '700', marginBottom: 4 },
  infoText: { color: '#3A6B8A', fontSize: 12, lineHeight: 18 },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#080B14',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#162236',
  },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  modalClose: { color: '#3A6B8A', fontSize: 20, fontWeight: '600' },
  
  detailContainer: { gap: 16 },
  detailSection: { gap: 8 },
  detailSectionTitle: { color: '#0EA5E9', fontSize: 14, fontWeight: '700', marginBottom: 8 },
  detailRoute: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 8 },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  detailLabel: { color: '#9CA3AF', fontSize: 13 },
  detailValue: { color: '#fff', fontSize: 13, fontWeight: '500' },
  detailDivider: { height: 1, backgroundColor: '#162236', marginVertical: 8 },
  surgeSection: {
    backgroundColor: '#7C2D12',
    padding: 12,
    borderRadius: 12,
    marginTop: 4,
  },
  surgeNote: { color: '#F87171', fontSize: 11, marginTop: 8, textAlign: 'center' },
  extraNote: { color: '#3A6B8A', fontSize: 11, marginTop: 8, textAlign: 'center' },
  detailSummary: {
    backgroundColor: '#0D2A3A',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  summaryTitle: { color: '#fff', fontSize: 14, fontWeight: '700', marginBottom: 8 },
  summaryText: { color: '#3A6B8A', fontSize: 12, textAlign: 'center', lineHeight: 18 },
  
  modalButton: {
    backgroundColor: '#0EA5E9',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  modalButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});