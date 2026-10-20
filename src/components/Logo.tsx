import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface LogoProps {
  size?: 'small' | 'medium' | 'large';
  showText?: boolean;
  style?: ViewStyle;
}

export default function Logo({ size = 'medium', showText = true, style }: LogoProps) {
  const getSize = () => {
    switch (size) {
      case 'small':
        return { width: 40, height: 40, fontSize: 24, iconSize: 20 };
      case 'large':
        return { width: 80, height: 80, fontSize: 48, iconSize: 36 };
      default:
        return { width: 60, height: 60, fontSize: 36, iconSize: 28 };
    }
  };

  const dimensions = getSize();

  return (
    <View style={[styles.container, style]}>
      <View style={[styles.logoWrapper, { width: dimensions.width, height: dimensions.height }]}>
        <LinearGradient
          colors={['#0EA5E9', '#3B82F6', '#6366F1']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.gradient, { borderRadius: dimensions.width / 2 }]}
        >
          <View style={styles.vContainer}>
            <Text style={[styles.vSymbol, { fontSize: dimensions.iconSize }]}>V</Text>
            <View style={[styles.speedLine, { width: dimensions.iconSize - 8 }]} />
          </View>
        </LinearGradient>
      </View>
      {showText && (
        <View style={styles.textContainer}>
          <Text style={[styles.appName, getTextSize(size)]}>VeloCity</Text>
          <Text style={[styles.tagline, getTaglineSize(size)]}>Set the Pace. Arrive in Style.</Text>
        </View>
      )}
    </View>
  );
}

const getTextSize = (size: string) => {
  switch (size) {
    case 'small':
      return { fontSize: 14 };
    case 'large':
      return { fontSize: 28 };
    default:
      return { fontSize: 18 };
  }
};

const getTaglineSize = (size: string) => {
  switch (size) {
    case 'small':
      return { fontSize: 8 };
    case 'large':
      return { fontSize: 12 };
    default:
      return { fontSize: 10 };
  }
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoWrapper: {
    position: 'relative',
  },
  gradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0EA5E9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  vContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  vSymbol: {
    fontWeight: '800',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  speedLine: {
    height: 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 1,
    marginTop: -4,
    opacity: 0.8,
  },
  textContainer: {
    alignItems: 'center',
    marginTop: 4,
  },
  appName: {
    fontWeight: '800',
    letterSpacing: 1,
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  tagline: {
    fontWeight: '500',
    letterSpacing: 0.5,
    color: '#94A3B8',
    marginTop: 2,
  },
});