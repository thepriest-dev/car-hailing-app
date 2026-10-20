// src/components/DriverAnalytics.tsx
import React from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { DriverStats } from '../services/driverAnalyticsService';

interface DriverAnalyticsProps {
  stats: DriverStats;
}

export default function DriverAnalytics({ stats }: DriverAnalyticsProps) {
  const { colors } = useTheme();
  const { width } = Dimensions.get('window');

  const getRideTypeIcon = (type: string) => {
    switch (type) {
      case 'standard': return '🚗';
      case 'comfort': return '🚙';
      case 'business': return '🚘';
      case 'luxury': return '🏎️';
      default: return '🚗';
    }
  };

  const maxEarnings = Math.max(...stats.weeklyTrend.map(w => w.earnings), 1);
  const maxMonthlyEarnings = Math.max(...stats.monthlyTrend.map(m => m.earnings), 1);
  const maxPeakTrips = Math.max(...stats.peakHours.map(p => p.trips), 1);

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      {/* Summary Cards */}
      <View style={styles.summaryGrid}>
        <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={styles.summaryIcon}>🚗</Text>
          <Text style={[styles.summaryValue, { color: colors.primary }]}>{stats.totalTrips}</Text>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Total Trips</Text>
        </View>
        
        <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={styles.summaryIcon}>💰</Text>
          <Text style={[styles.summaryValue, { color: colors.success }]}>₦{stats.totalEarnings.toLocaleString()}</Text>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Total Earnings</Text>
        </View>
        
        <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={styles.summaryIcon}>📏</Text>
          <Text style={[styles.summaryValue, { color: colors.text }]}>{stats.totalDistance.toFixed(1)} km</Text>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Total Distance</Text>
        </View>
        
        <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={styles.summaryIcon}>⭐</Text>
          <Text style={[styles.summaryValue, { color: colors.warning }]}>{stats.averagePassengerRating.toFixed(1)}</Text>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Avg Rating</Text>
        </View>
      </View>

      {/* Average Earnings Card */}
      <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Average per Trip</Text>
        <Text style={[styles.infoValue, { color: colors.primary }]}>₦{Math.round(stats.averageEarningsPerTrip).toLocaleString()}</Text>
      </View>

      {/* Waiting Time Card */}
      <View style={[styles.waitingCard, { backgroundColor: colors.surface, borderColor: colors.warning }]}>
        <View style={styles.waitingRow}>
          <View style={styles.waitingItem}>
            <Text style={styles.waitingIcon}>⏱️</Text>
            <Text style={[styles.waitingValue, { color: colors.warning }]}>{stats.totalWaitingTime} min</Text>
            <Text style={[styles.waitingLabel, { color: colors.textSecondary }]}>Total Waiting</Text>
          </View>
          <View style={styles.waitingDivider} />
          <View style={styles.waitingItem}>
            <Text style={styles.waitingIcon}>⌛</Text>
            <Text style={[styles.waitingValue, { color: colors.warning }]}>{stats.averageWaitingTime.toFixed(1)} min</Text>
            <Text style={[styles.waitingLabel, { color: colors.textSecondary }]}>Average Wait</Text>
          </View>
        </View>
      </View>

      {/* Favorite Stats */}
      <View style={styles.statsRow}>
        <View style={[styles.statItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={styles.statIcon}>📍</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Most Frequent Route</Text>
          <Text style={[styles.statValue, { color: colors.text }]} numberOfLines={1}>{stats.mostFrequentRoute || 'N/A'}</Text>
        </View>
        
        <View style={[styles.statItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={styles.statIcon}>{getRideTypeIcon(stats.favoriteRideType)}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Favorite Ride Type</Text>
          <Text style={[styles.statValue, { color: colors.text }]}>{stats.favoriteRideType}</Text>
        </View>
      </View>

      {/* Peak Hours */}
      <View style={[styles.chartCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.chartTitle, { color: colors.text }]}>⏰ Peak Hours</Text>
        <View style={styles.hourChart}>
          {stats.peakHours.map((hour, index) => (
            <View key={index} style={styles.hourColumn}>
              <View style={[styles.hourBar, { height: (hour.trips / maxPeakTrips) * 100, backgroundColor: colors.primary }]} />
              <Text style={[styles.hourLabel, { color: colors.textSecondary }]}>{hour.hour}</Text>
              <Text style={[styles.hourValue, { color: colors.textSecondary }]}>{hour.trips}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Weekly Earnings Trend */}
      <View style={[styles.chartCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.chartTitle, { color: colors.text }]}>📈 Weekly Earnings</Text>
        <View style={styles.barChart}>
          {stats.weeklyTrend.map((day, index) => {
            const height = (day.earnings / maxEarnings) * 120;
            return (
              <View key={index} style={styles.barColumn}>
                <View style={[styles.bar, { height, backgroundColor: colors.success }]} />
                <Text style={[styles.barLabel, { color: colors.textSecondary }]}>{day.day}</Text>
                <Text style={[styles.barValue, { color: colors.textSecondary }]}>₦{Math.round(day.earnings / 1000)}k</Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Monthly Earnings Trend */}
      <View style={[styles.chartCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.chartTitle, { color: colors.text }]}>💰 Monthly Earnings</Text>
        <View style={styles.lineChart}>
          {stats.monthlyTrend.map((month, index) => {
            const height = (month.earnings / maxMonthlyEarnings) * 100;
            return (
              <View key={index} style={styles.lineColumn}>
                <View style={[styles.lineBar, { height, backgroundColor: colors.primary }]} />
                <Text style={[styles.lineLabel, { color: colors.textSecondary }]}>{month.month}</Text>
                <Text style={[styles.lineValue, { color: colors.textSecondary }]}>₦{Math.round(month.earnings / 1000)}k</Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Rating Distribution */}
      <View style={[styles.chartCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.chartTitle, { color: colors.text }]}>⭐ Rating Distribution</Text>
        <View style={styles.ratingChart}>
          {stats.ratingDistribution.map((rating) => {
            const maxCount = Math.max(...stats.ratingDistribution.map(r => r.count), 1);
            const width = (rating.count / maxCount) * 100;
            return (
              <View key={rating.rating} style={styles.ratingRow}>
                <Text style={[styles.ratingLabel, { color: colors.textSecondary }]}>{rating.rating} ⭐</Text>
                <View style={[styles.ratingBarContainer, { backgroundColor: colors.border }]}>
                  <View style={[styles.ratingBar, { width: `${width}%`, backgroundColor: colors.warning }]} />
                </View>
                <Text style={[styles.ratingCount, { color: colors.textSecondary }]}>{rating.count}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Performance Tips */}
      <View style={[styles.tipsCard, { backgroundColor: colors.surfaceLight, borderColor: colors.primary }]}>
        <Text style={styles.tipsIcon}>💡</Text>
        <View style={styles.tipsContent}>
          <Text style={[styles.tipsTitle, { color: colors.primary }]}>Performance Tips</Text>
          <Text style={[styles.tipsText, { color: colors.textSecondary }]}>
            • Drive during peak hours ({stats.peakHours.map(h => h.hour).join(', ')}) for more rides{'\n'}
            • Maintain 4.8+ rating to get priority requests{'\n'}
            • Your average waiting time is {stats.averageWaitingTime.toFixed(1)} min - try to reduce it{'\n'}
            • {stats.favoriteRideType.charAt(0).toUpperCase() + stats.favoriteRideType.slice(1)} rides are your most profitable
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    minWidth: '47%',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  summaryIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  infoCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  infoLabel: {
    fontSize: 14,
  },
  infoValue: {
    fontSize: 20,
    fontWeight: '800',
  },
  waitingCard: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  waitingRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  waitingItem: {
    alignItems: 'center',
    flex: 1,
  },
  waitingIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  waitingValue: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 2,
  },
  waitingLabel: {
    fontSize: 11,
  },
  waitingDivider: {
    width: 1,
    marginHorizontal: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
  },
  statIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 11,
    marginBottom: 4,
    textAlign: 'center',
  },
  statValue: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  chartCard: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 16,
  },
  hourChart: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 120,
  },
  hourColumn: {
    alignItems: 'center',
    width: 50,
  },
  hourBar: {
    width: 30,
    borderRadius: 6,
    marginBottom: 8,
  },
  hourLabel: {
    fontSize: 11,
    marginBottom: 2,
  },
  hourValue: {
    fontSize: 10,
  },
  barChart: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 160,
  },
  barColumn: {
    alignItems: 'center',
    width: 40,
  },
  bar: {
    width: 30,
    borderRadius: 6,
    marginBottom: 8,
  },
  barLabel: {
    fontSize: 11,
    marginBottom: 2,
  },
  barValue: {
    fontSize: 10,
  },
  lineChart: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 140,
  },
  lineColumn: {
    alignItems: 'center',
    width: 50,
  },
  lineBar: {
    width: 35,
    borderRadius: 6,
    marginBottom: 8,
  },
  lineLabel: {
    fontSize: 11,
    marginBottom: 2,
  },
  lineValue: {
    fontSize: 10,
  },
  ratingChart: {
    gap: 10,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  ratingLabel: {
    width: 45,
    fontSize: 12,
  },
  ratingBarContainer: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  ratingBar: {
    height: '100%',
    borderRadius: 4,
  },
  ratingCount: {
    width: 30,
    fontSize: 12,
    textAlign: 'right',
  },
  tipsCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 14,
    gap: 12,
    marginBottom: 20,
    borderWidth: 1,
  },
  tipsIcon: {
    fontSize: 28,
  },
  tipsContent: {
    flex: 1,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 6,
  },
  tipsText: {
    fontSize: 12,
    lineHeight: 18,
  },
});