import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider } from '../contexts/ThemeContext';
import { View, Platform } from 'react-native';
import { useEffect, useState } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [appIsReady, setAppIsReady] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    async function prepare() {
      try {
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (e) {
        console.warn(e);
      } finally {
        setAppIsReady(true);
        await SplashScreen.hideAsync();
      }
    }

    prepare();
  }, []);

  if (!appIsReady) {
    return null;
  }

  return (
    <ThemeProvider>
      <StatusBar style="light" backgroundColor="#0A1929" translucent />
      <View style={{ 
        flex: 1, 
        paddingBottom: insets.bottom,
      }}>
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
            contentStyle: {
              backgroundColor: '#0A1929',
            },
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="login" />
          <Stack.Screen name="register" />
          <Stack.Screen name="home" />
          <Stack.Screen name="booking" />
          <Stack.Screen name="finding" />
          <Stack.Screen name="passenger-waiting" />
          <Stack.Screen name="trip" />
          <Stack.Screen name="driver-trip" />
          <Stack.Screen name="driver-requests" />
          <Stack.Screen name="ride-analytics" />
          <Stack.Screen name="driver-analytics" />
          <Stack.Screen name="emergency-contacts" />
          <Stack.Screen name="MapPlaceholder" />
          <Stack.Screen name="vehicle-registration" />
          <Stack.Screen name="edit-profile" />
          <Stack.Screen name="scheduled-rides" options={{ title: 'Scheduled Rides' }} />
          <Stack.Screen name="driver-documents" options={{ title: 'Driver Documents' }} />
        </Stack>
      </View>
    </ThemeProvider>
  );
}