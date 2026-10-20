import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

interface LevelProgressProps {
  currentLevel: any;
  nextLevel: any;
  progress: number;
  tripsToNextLevel: number;
  totalTrips: number;
  role: 'passenger' | 'driver';
}

export default function LevelProgress({
  currentLevel,
  nextLevel,
  progress,
  tripsToNextLevel,
  totalTrips,
  role,
}: LevelProgressProps) {
  const { colors } = useTheme();

  // Get reward description for current level
  const getRewardText = () => {
    if (!currentLevel.rewards || currentLevel.rewards.length === 0) return '';
    const reward = currentLevel.rewards[0];
    if (reward.type === 'free_minutes') {
      return `🎁 Reward: ${reward.amount} free minute${reward.amount !== 1 ? 's' : ''}`;
    }
    if (reward.type === 'commission') {
      return `🎁 Reward: ${reward.percentage}% commission reduction`;
    }
    return '';
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.header}>
        <View style={[styles.levelBadgeContainer, { backgroundColor: currentLevel.color + '20' }]}>
          <Text style={styles.levelBadgeIcon}>{currentLevel.badge}</Text>
          <Text style={[styles.levelBadgeText, { color: currentLevel.color }]}>
            {currentLevel.name}
          </Text>
        </View>
        <View style={styles.stats}>
          <Text style={[styles.tripCount, { color: colors.text }]}>
            {totalTrips} trips
          </Text>
        </View>
      </View>

      {/* Reward Display for current level (if level > 1) */}
      {currentLevel.id > 1 && getRewardText() !== '' && (
        <View style={[styles.rewardCard, { backgroundColor: colors.surfaceLight, borderColor: colors.warning }]}>
          <Text style={styles.rewardIcon}>🎁</Text>
          <View style={styles.rewardContent}>
            <Text style={[styles.rewardTitle, { color: colors.warning }]}>
              Level {currentLevel.id} Reward Unlocked!
            </Text>
            <Text style={[styles.rewardDescription, { color: colors.textSecondary }]}>
              {getRewardText()}
            </Text>
          </View>
        </View>
      )}

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
          <View
            style={[
              styles.progressFill,
              { width: `${progress}%`, backgroundColor: colors.primary },
            ]}
          />
        </View>
      </View>

      {/* Next Level Info */}
      {nextLevel ? (
        <View style={styles.nextLevelInfo}>
          <Text style={[styles.nextLevelText, { color: colors.textSecondary }]}>
            {tripsToNextLevel} more trip{tripsToNextLevel !== 1 ? 's' : ''} to reach {nextLevel.name}
          </Text>
          {nextLevel.rewards && nextLevel.rewards[0] && (
            <Text style={[styles.rewardPreview, { color: colors.success }]}>
              Next reward: {nextLevel.rewards[0].type === 'free_minutes' 
                ? `${nextLevel.rewards[0].amount} free minute${nextLevel.rewards[0].amount !== 1 ? 's' : ''}`
                : nextLevel.rewards[0].type === 'commission'
                ? `${nextLevel.rewards[0].percentage}% commission reduction`
                : nextLevel.rewards[0].description}
            </Text>
          )}
        </View>
      ) : (
        <View style={styles.nextLevelInfo}>
          <Text style={[styles.maxLevelText, { color: colors.success }]}>
            🏆 Maximum Level Reached! You're a VeloCity legend!
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  levelBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  levelBadgeIcon: {
    fontSize: 14,
  },
  levelBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  stats: {
    alignItems: 'flex-end',
  },
  tripCount: {
    fontSize: 14,
    fontWeight: '700',
  },
  rewardCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    gap: 10,
  },
  rewardIcon: {
    fontSize: 24,
  },
  rewardContent: {
    flex: 1,
  },
  rewardTitle: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2,
  },
  rewardDescription: {
    fontSize: 11,
  },
  progressContainer: {
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: 8,
    borderRadius: 4,
  },
  nextLevelInfo: {
    alignItems: 'center',
  },
  nextLevelText: {
    fontSize: 11,
    marginTop: 8,
  },
  rewardPreview: {
    fontSize: 10,
    marginTop: 4,
  },
  maxLevelText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8,
  },
});