import messaging from '@react-native-firebase/messaging';
import {Linking, PermissionsAndroid, Platform} from 'react-native';
import {getVersion} from 'react-native-device-info';
import {api} from '../utils/api';

const ANDROID_NOTIFICATION_PERMISSION_API = 33;

async function hasNotificationPermission() {
  if (Platform.OS === 'android') {
    if (Number(Platform.Version) < ANDROID_NOTIFICATION_PERMISSION_API) return true;

    return PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
  }

  const authorization = await messaging().hasPermission();
  return authorization === messaging.AuthorizationStatus.AUTHORIZED
    || authorization === messaging.AuthorizationStatus.PROVISIONAL;
}

async function requestNotificationPermission() {
  if (Platform.OS === 'android') {
    if (Number(Platform.Version) < ANDROID_NOTIFICATION_PERMISSION_API) return true;

    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    );
    return result === PermissionsAndroid.RESULTS.GRANTED;
  }

  const authorization = await messaging().requestPermission();
  return authorization === messaging.AuthorizationStatus.AUTHORIZED
    || authorization === messaging.AuthorizationStatus.PROVISIONAL;
}

export async function registerNotificationDevice() {
  if (!await hasNotificationPermission() && !await requestNotificationPermission()) return null;
  const token = await messaging().getToken();
  if (!token) return null;
  await api.post('/notifications/devices', {token, platform: Platform.OS, appVersion: getVersion()});
  return token;
}

export function openNotificationSettings() {
  return Linking.openSettings();
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
