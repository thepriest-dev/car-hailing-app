import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { ref, set, get } from 'firebase/database';
import { auth, db } from '../config/firebase';

// Check if we're in Expo Go
const isExpoGo = !__DEV__ || (Platform.OS === 'ios' && !Device.isDevice);

// Configure notification handler only if not in Expo Go
if (!isExpoGo) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

// Request permissions and get push token (safe for Expo Go)
export async function registerForPushNotificationsAsync() {
  if (isExpoGo) {
    console.log('Push notifications not available in Expo Go. Use development build.');
    return null;
  }

  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#0EA5E9',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return null;
    }
    token = (await Notifications.getExpoPushTokenAsync()).data;
    console.log('Push token:', token);
  } else {
    console.log('Must use physical device for Push Notifications');
  }

  return token;
}

// Save push token to database (safe even if token is null)
export async function savePushToken(userId: string, token: string | null) {
  if (!token) {
    console.log('No push token to save');
    return;
  }
  
  const tokenKey = token.replace(/[.#$[\]]/g, '_');
  const tokenRef = ref(db, `push_tokens/${userId}/${tokenKey}`);
  await set(tokenRef, {
    token,
    createdAt: new Date().toISOString(),
    platform: Platform.OS,
  });
}

// Get all push tokens for a user
export async function getUserPushTokens(userId: string): Promise<string[]> {
  const tokensRef = ref(db, `push_tokens/${userId}`);
  const snapshot = await get(tokensRef);
  const tokens: string[] = [];
  
  if (snapshot.exists()) {
    const data = snapshot.val();
    Object.keys(data).forEach(key => {
      if (data[key].token) {
        tokens.push(data[key].token);
      }
    });
  }
  
  return tokens;
}

// Send notification to a user (safe, won't crash if no tokens)
export async function sendNotificationToUser(userId: string, title: string, body: string, data?: any) {
  const tokens = await getUserPushTokens(userId);
  
  if (tokens.length === 0) {
    console.log('No push tokens for user:', userId);
    return;
  }
  
  for (const token of tokens) {
    try {
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: token,
          sound: 'default',
          title: title,
          body: body,
          data: data || {},
        }),
      });
    } catch (error) {
      console.log('Error sending notification:', error);
    }
  }
}

// Listen for incoming notifications (safe for Expo Go)
export function setupNotificationListeners() {
  if (isExpoGo) {
    console.log('Notification listeners not set up in Expo Go');
    return { subscription: { remove: () => {} }, responseSubscription: { remove: () => {} } };
  }
  
  const subscription = Notifications.addNotificationReceivedListener(notification => {
    console.log('Notification received in foreground:', notification);
  });

  const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
    const notificationData = response.notification.request.content.data;
    console.log('Notification response:', notificationData);
    
    if (notificationData?.type === 'ride_accepted' && notificationData?.rideId) {
      console.log('Navigate to ride:', notificationData.rideId);
    }
  });

  return { subscription, responseSubscription };
}