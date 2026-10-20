import { useEffect } from 'react';
import { router } from 'expo-router';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { auth } from '../config/firebase';
import Logo from '../components/Logo';

export default function IndexScreen() {
  const { colors } = useTheme();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setTimeout(() => {
        if (user) {
          router.replace('/home');
        } else {
          router.replace('/login');
        }
      }, 1000);
    });

    return () => unsubscribe();
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Logo size="large" showText={true} />
      <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loader: {
    marginTop: 40,
  },
});