import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform, Alert } from 'react-native';
import apiClient from '../api/apiClient';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
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
      Alert.alert('Permission Required', 'To receive task reminders, please enable push notifications for Aura in your device settings.');
      return;
    }

    try {
        token = (await Notifications.getExpoPushTokenAsync({
            projectId: Constants.expoConfig.extra.eas.projectId,
        })).data;
        console.log("Your Expo Push Token:", token);

        await apiClient.put('/api/users/pushtoken', { pushToken: token });
        console.log("Push token successfully sent to backend.");

    } catch (e) {
        console.error("Failed to get or send push token:", e);
        Alert.log('Error', 'An error occurred while setting up notifications.');
    }

  } else {
    Alert.alert('Device Required', 'Must use a physical device for Push Notifications.');
  }
  
  return token;
}