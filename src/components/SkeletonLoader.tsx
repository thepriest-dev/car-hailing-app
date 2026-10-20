import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface SkeletonLoaderProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}

export function SkeletonLoader({ width = '100%', height = 20, borderRadius = 4, style }: SkeletonLoaderProps) {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = () => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(animatedValue, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(animatedValue, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    };
    animate();
  }, []);

  const translateX = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [-SCREEN_WIDTH, SCREEN_WIDTH],
  });

  return (
    <View style={[styles.skeletonContainer, { width, height, borderRadius }, style]}>
      <Animated.View
        style={[
          styles.skeletonShimmer,
          {
            transform: [{ translateX }],
          },
        ]}
      >
        <LinearGradient
          colors={['transparent', 'rgba(255,255,255,0.3)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.shimmerGradient}
        />
      </Animated.View>
    </View>
  );
}

export function RideCardSkeleton() {
  return (
    <View style={styles.rideCardSkeleton}>
      <View style={styles.skeletonHeader}>
        <SkeletonLoader width={80} height={24} borderRadius={12} />
        <SkeletonLoader width={60} height={20} borderRadius={4} />
      </View>
      <View style={styles.skeletonLocation}>
        <SkeletonLoader width="100%" height={20} borderRadius={4} />
        <SkeletonLoader width="80%" height={20} borderRadius={4} />
      </View>
      <View style={styles.skeletonFooter}>
        <SkeletonLoader width={100} height={16} borderRadius={4} />
        <SkeletonLoader width={80} height={16} borderRadius={4} />
      </View>
    </View>
  );
}

export function TripCardSkeleton() {
  return (
    <View style={styles.tripCardSkeleton}>
      <View style={styles.skeletonRow}>
        <SkeletonLoader width={40} height={40} borderRadius={20} />
        <View style={styles.skeletonTextContainer}>
          <SkeletonLoader width="60%" height={16} borderRadius={4} />
          <SkeletonLoader width="40%" height={12} borderRadius={4} />
        </View>
      </View>
      <View style={styles.skeletonDivider} />
      <View style={styles.skeletonRow}>
        <SkeletonLoader width={40} height={40} borderRadius={20} />
        <View style={styles.skeletonTextContainer}>
          <SkeletonLoader width="60%" height={16} borderRadius={4} />
          <SkeletonLoader width="40%" height={12} borderRadius={4} />
        </View>
      </View>
    </View>
  );
}

export function ProfileSkeleton() {
  return (
    <View style={styles.profileSkeleton}>
      <View style={styles.skeletonAvatarContainer}>
        <SkeletonLoader width={80} height={80} borderRadius={40} />
      </View>
      <SkeletonLoader width="50%" height={24} borderRadius={4} />
      <SkeletonLoader width="60%" height={16} borderRadius={4} />
      <SkeletonLoader width="70%" height={16} borderRadius={4} />
      <View style={styles.skeletonMenu}>
        {[1, 2, 3, 4].map((i) => (
          <View key={i} style={styles.skeletonMenuItem}>
            <SkeletonLoader width={24} height={24} borderRadius={12} />
            <SkeletonLoader width="70%" height={16} borderRadius={4} />
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  skeletonContainer: {
    backgroundColor: '#1E293B',
    overflow: 'hidden',
    position: 'relative',
  },
  skeletonShimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  shimmerGradient: {
    flex: 1,
  },
  rideCardSkeleton: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#1E293B',
    marginBottom: 12,
    gap: 12,
  },
  skeletonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  skeletonLocation: {
    gap: 8,
  },
  skeletonFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  tripCardSkeleton: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#1E293B',
    marginBottom: 10,
    gap: 12,
  },
  skeletonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  skeletonTextContainer: {
    flex: 1,
    gap: 6,
  },
  skeletonDivider: {
    height: 1,
    backgroundColor: '#334155',
    marginVertical: 4,
  },
  profileSkeleton: {
    alignItems: 'center',
    gap: 12,
  },
  skeletonAvatarContainer: {
    marginBottom: 8,
  },
  skeletonMenu: {
    width: '100%',
    marginTop: 20,
    gap: 10,
  },
  skeletonMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#1E293B',
  },
});