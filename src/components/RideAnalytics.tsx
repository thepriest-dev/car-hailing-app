// src/components/RideAnalytics.tsx
import React from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { RideStats } from '../services/rideHistoryService';

interface RideAnalyticsProps {
  stats: RideStats;
}

export default function RideAnalytics({ stats }: RideAnalyticsProps) {
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

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      {/* Summary Cards */}
      <View style={styles.summaryGrid}>
        <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={styles.summaryIcon}>🚗</Text>
          <Text style={[styles.summaryValue, { color: colors.primary }]}>{stats.totalRides}</Text>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Total Rides</Text>
        </View>
        
        <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={styles.summaryIcon}>💰</Text>
          <Text style={[styles.summaryValue, { color: colors.success }]}>₦{stats.totalSpent.toLocaleString()}</Text>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Total Spent</Text>
        </View>
        
        <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={styles.summaryIcon}>📏</Text>
          <Text style={[styles.summaryValue, { color: colors.text }]}>{stats.totalDistance.toFixed(1)} km</Text>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Total Distance</Text>
        </View>
        
        <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={styles.summaryIcon}>⭐</Text>
          <Text style={[styles.summaryValue, { color: colors.warning }]}>{stats.averageRating.toFixed(1)}</Text>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Avg Driver Rating</Text>
        </View>
      </View>

      {/* Average Fare Card */}
      <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Average Fare per Ride</Text>
        <Text style={[styles.infoValue, { color: colors.primary }]}>₦{Math.round(stats.averageFare).toLocaleString()}</Text>
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

      {/* Weekly Trend */}
      <View style={[styles.chartCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.chartTitle, { color: colors.text }]}>📊 Weekly Activity</Text>
        <View style={styles.barChart}>
          {stats.weeklyTrend.map((day, index) => {
            const maxRides = Math.max(...stats.weeklyTrend.map(d => d.rides), 1);
            const height = (day.rides / maxRides) * 120;
            return (
              <View key={index} style={styles.barColumn}>
                <View style={[styles.bar, { height, backgroundColor: colors.primary }]} />
                <Text style={[styles.barLabel, { color: colors.textSecondary }]}>{day.day}</Text>
                <Text style={[styles.barValue, { color: colors.textSecondary }]}>{day.rides}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Monthly Spending Trend */}
      <View style={[styles.chartCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.chartTitle, { color: colors.text }]}>💰 Monthly Spending</Text>
        <View style={styles.lineChart}>
          {stats.monthlyTrend.map((month, index) => {
            const maxSpent = Math.max(...stats.monthlyTrend.map(m => m.spent), 1);
            const height = (month.spent / maxSpent) * 100;
            return (
              <View key={index} style={styles.lineColumn}>
                <View style={[styles.lineBar, { height, backgroundColor: colors.success }]} />
                <Text style={[styles.lineLabel, { color: colors.textSecondary }]}>{month.month}</Text>
                <Text style={[styles.lineValue, { color: colors.textSecondary }]}>₦{Math.round(month.spent / 1000)}k</Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Savings Tips */}
      <View style={[styles.tipsCard, { backgroundColor: colors.surfaceLight, borderColor: colors.warning }]}>
        <Text style={styles.tipsIcon}>💡</Text>
        <View style={styles.tipsContent}>
          <Text style={[styles.tipsTitle, { color: colors.warning }]}>Savings Tips</Text>
          <Text style={[styles.tipsText, { color: colors.textSecondary }]}>
            • Book during off-peak hours to save up to 30%{'\n'}
            • Use Nexride Pass for discounted rides{'\n'}
            • Share rides with friends to split fares
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
  },
  statValue: {
    fontSize: 13,
    fontWeight: '700',
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