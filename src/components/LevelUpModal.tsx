import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

interface LevelUpModalProps {
  visible: boolean;
  newLevel: any;
  onClose: () => void;
}

export default function LevelUpModal({ visible, newLevel, onClose }: LevelUpModalProps) {
  const { colors } = useTheme();

  if (!newLevel) return null;

  // Get reward description
  const getRewardText = () => {
    if (!newLevel.rewards || newLevel.rewards.length === 0) return '';
    const reward = newLevel.rewards[0];
    if (reward.type === 'free_minutes') {
      return `${reward.amount} free minute${reward.amount !== 1 ? 's' : ''} on your next VeloCity ride!`;
    }
    if (reward.type === 'commission') {
      return `${reward.percentage}% commission reduction on your future VeloCity rides!`;
    }
    if (reward.type === 'badge' && newLevel.id === 1) {
      return 'Welcome to VeloCity! Keep riding to unlock more rewards.';
    }
    return reward.description;
  };

  const rewardText = getRewardText();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.modal, { backgroundColor: colors.background, borderColor: colors.primary }]}>
          <Text style={styles.celebration}>🎉🎊🎉</Text>
          <Text style={[styles.title, { color: colors.text }]}>Level Up!</Text>
          <Text style={[styles.levelName, { color: colors.primary }]}>
            {newLevel.badge} {newLevel.name}
          </Text>
          
          {rewardText && (
            <View style={[styles.rewardBox, { backgroundColor: colors.surfaceLight, borderColor: colors.warning }]}>
              <Text style={styles.rewardIcon}>🎁</Text>
              <View style={styles.rewardContent}>
                <Text style={[styles.rewardTitle, { color: colors.warning }]}>Reward Unlocked!</Text>
                <Text style={[styles.rewardDescription, { color: colors.textSecondary }]}>
                  {rewardText}
                </Text>
              </View>
            </View>
          )}

          <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary }]} onPress={onClose}>
            <Text style={styles.buttonText}>Awesome!</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    width: '80%',
    borderRadius: 28,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
  },
  celebration: {
    fontSize: 40,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 8,
  },
  levelName: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 20,
  },
  rewardBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
    borderWidth: 1,
    gap: 12,
    width: '100%',
  },
  rewardIcon: {
    fontSize: 32,
  },
  rewardContent: {
    flex: 1,
  },
  rewardTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  rewardDescription: {
    fontSize: 12,
  },
  button: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 25,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});