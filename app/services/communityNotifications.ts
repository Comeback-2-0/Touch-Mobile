import messaging from '@react-native-firebase/messaging';
import {Platform} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {getVersion} from 'react-native-device-info';
import {api} from '../utils/api';

const NOTIFICATION_PERMISSION_REQUESTED = 'touch.notification_permission_requested.v1';

export async function registerNotificationDevice() {
  const alreadyRequested = await AsyncStorage.getItem(NOTIFICATION_PERMISSION_REQUESTED);
  const authorization = alreadyRequested === '1'
    ? await messaging().hasPermission()
    : await messaging().requestPermission();
  if (alreadyRequested !== '1') {
    await AsyncStorage.setItem(NOTIFICATION_PERMISSION_REQUESTED, '1');
  }
  const enabled = authorization === messaging.AuthorizationStatus.AUTHORIZED || authorization === messaging.AuthorizationStatus.PROVISIONAL;
  if (!enabled) return null;
  const token = await messaging().getToken();
  if (!token) return null;
  await api.post('/notifications/devices', {token, platform: Platform.OS, appVersion: getVersion()});
  return token;
}

export async function registerNotificationToken(token: string) {
  if (!token) return;
  await api.post('/notifications/devices', {
    token,
    platform: Platform.OS,
    appVersion: getVersion(),
  });
}

export async function revokeNotificationDevice(token?: string | null) {
  if (!token) return;
  await api.delete('/notifications/devices', {data: {token}}).catch(() => undefined);
}
