import messaging from '@react-native-firebase/messaging';
import {Platform} from 'react-native';
import {api} from '../utils/api';

export async function registerNotificationDevice() {
  const authorization = await messaging().requestPermission();
  const enabled = authorization === messaging.AuthorizationStatus.AUTHORIZED || authorization === messaging.AuthorizationStatus.PROVISIONAL;
  if (!enabled) return null;
  const token = await messaging().getToken();
  if (!token) return null;
  await api.post('/notifications/devices', {token, platform: Platform.OS, appVersion: '2.0.0'});
  return token;
}

export async function registerNotificationToken(token: string) {
  if (!token) return;
  await api.post('/notifications/devices', {
    token,
    platform: Platform.OS,
    appVersion: '2.0.0',
  });
}

export async function revokeNotificationDevice(token?: string | null) {
  if (!token) return;
  await api.delete('/notifications/devices', {data: {token}}).catch(() => undefined);
}
