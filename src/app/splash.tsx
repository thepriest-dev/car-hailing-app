import { router } from 'expo-router';
import { useEffect } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';

export default function SplashScreen() {
  const { colors } = useTheme();
  const fadeAnim = new Animated.Value(0);
  const scaleAnim = new Animated.Value(0.8);
  const rotateAnim = new Animated.Value(0);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      router.replace('/login');
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.circle1, { backgroundColor: `rgba(14,165,233,0.06)` }]} />
      <View style={[styles.circle2, { backgroundColor: `rgba(14,165,233,0.05)` }]} />

      <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
        <Animated.View style={{ transform: [{ rotate: spin }] }}>
          <LinearGradient
            colors={['#0EA5E9', '#3B82F6', '#6366F1']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.logoBox}
          >
            <View style={styles.logoInner}>
              <Text style={styles.logoText}>V</Text>
              <View style={styles.speedLine} />
            </View>
          </LinearGradient>
        </Animated.View>
        <Text style={[styles.appName, { color: colors.text }]}>VeloCity</Text>
        <Text style={[styles.tagline, { color: colors.textSecondary }]}>Set the Pace. Arrive in Style.</Text>
      </Animated.View>

      <Animated.View style={[styles.dotsRow, { opacity: fadeAnim }]}>
        <LoadingDot delay={0} colors={colors} />
        <LoadingDot delay={200} colors={colors} />
        <LoadingDot delay={400} colors={colors} />
      </Animated.View>

      <Text style={[styles.version, { color: colors.textSecondary }]}>v1.0.0</Text>
    </View>
  );
}

function LoadingDot({ delay, colors }: { delay: number; colors: any }) {
  const opacity = new Animated.Value(0.3);

  useEffect(() => {
    const animate = () => {
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 400, useNativeDriver: true }),
      ]).start(() => animate());
    };
    animate();
  }, []);

  return <Animated.View style={[styles.dot, { opacity, backgroundColor: colors.primary }]} />;
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  circle1: { position: 'absolute', width: 300, height: 300, borderRadius: 150, top: -80, left: -80 },
  circle2: { position: 'absolute', width: 200, height: 200, borderRadius: 100, bottom: -40, right: -40 },
  content: { alignItems: 'center' },
  logoBox: { 
    width: 90, 
    height: 90, 
    borderRadius: 24, 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginBottom: 20,
    shadowColor: '#0EA5E9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  logoInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 48,
    fontWeight: '800',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  speedLine: {
    width: 30,
    height: 3,
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
    marginTop: -6,
    opacity: 0.8,
  },
  appName: { fontSize: 32, fontWeight: '800', letterSpacing: 1 },
  tagline: { fontSize: 11, fontWeight: '500', letterSpacing: 2, marginTop: 8 },
  dotsRow: { flexDirection: 'row', gap: 8, marginTop: 60 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  version: { position: 'absolute', bottom: 40, fontSize: 11 },
});