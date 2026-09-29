import messaging from '@react-native-firebase/messaging';
import {Linking, PermissionsAndroid, Platform} from 'react-native';
import {
  openNotificationSettings,
  registerNotificationDevice,
} from '../app/services/communityNotifications';

jest.mock('@react-native-firebase/messaging', () => {
  const instance = {
    requestPermission: jest.fn(),
    hasPermission: jest.fn(),
    getToken: jest.fn(),
  };
  const factory = jest.fn(() => instance) as any;
  factory.AuthorizationStatus = {AUTHORIZED: 1, PROVISIONAL: 2};
  return {__esModule: true, default: factory};
});

jest.mock('../app/utils/api', () => ({api: {post: jest.fn()}}));

describe('notification permission registration', () => {
  const permissionCheck = jest.spyOn(PermissionsAndroid, 'check');
  const permissionRequest = jest.spyOn(PermissionsAndroid, 'request');
  const openSettings = jest.spyOn(Linking, 'openSettings');

  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(Platform, 'OS', {value: 'android', configurable: true});
    Object.defineProperty(Platform, 'Version', {value: 35, configurable: true});
  });

  it('requests Android 13 notification permission when it is not authorized', async () => {
    const instance = messaging();
    permissionCheck.mockResolvedValue(false);
    permissionRequest.mockResolvedValue(PermissionsAndroid.RESULTS.GRANTED);
    (instance.getToken as jest.Mock).mockResolvedValue('token');

    await registerNotificationDevice();

    expect(permissionRequest).toHaveBeenCalledWith(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    );
    expect(instance.requestPermission).not.toHaveBeenCalled();
  });

  it('does not request permission when notifications are already authorized', async () => {
    const instance = messaging();
    permissionCheck.mockResolvedValue(true);
    (instance.getToken as jest.Mock).mockResolvedValue('token');

    await registerNotificationDevice();

    expect(instance.requestPermission).not.toHaveBeenCalled();
    expect(permissionRequest).not.toHaveBeenCalled();
  });

  it('does not register a token when Android notification permission is denied', async () => {
    const instance = messaging();
    permissionCheck.mockResolvedValue(false);
    permissionRequest.mockResolvedValue(PermissionsAndroid.RESULTS.DENIED);

    const token = await registerNotificationDevice();

    expect(token).toBeNull();
    expect(instance.getToken).not.toHaveBeenCalled();
  });

  it('does not request runtime permission on Android 12 and earlier', async () => {
    const instance = messaging();
    Object.defineProperty(Platform, 'Version', {value: 32, configurable: true});
    (instance.getToken as jest.Mock).mockResolvedValue('token');

    await registerNotificationDevice();

    expect(permissionCheck).not.toHaveBeenCalled();
    expect(permissionRequest).not.toHaveBeenCalled();
    expect(instance.getToken).toHaveBeenCalled();
  });

  it('does not register a token when permission is permanently denied', async () => {
    const instance = messaging();
    permissionCheck.mockResolvedValue(false);
    permissionRequest.mockResolvedValue(PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN);

    const token = await registerNotificationDevice();

    expect(token).toBeNull();
    expect(instance.getToken).not.toHaveBeenCalled();
  });

  it('provides a way to open notification settings', async () => {
    openSettings.mockResolvedValue();

    await openNotificationSettings();

    expect(openSettings).toHaveBeenCalledTimes(1);
  });
});
