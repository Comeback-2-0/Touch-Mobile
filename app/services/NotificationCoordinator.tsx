import {useEffect, useRef, useState} from 'react';
import {AppState, type AppStateStatus} from 'react-native';
import messaging from '@react-native-firebase/messaging';
import {useAuth} from '../context/AuthContext';
import {navigateFromCommunityNotification} from '../navigation/navigationRef';
import {registerNotificationDevice, registerNotificationToken} from './communityNotifications';

type Props = {navigationReady: boolean};

/** Owns Firebase notification subscriptions. It starts only after the JS tree,
 * navigation, authentication, and foreground lifecycle are all ready. */
export function NotificationCoordinator({navigationReady}: Props) {
  const {user} = useAuth();
  const started = useRef(false);
  const [currentAppState, setCurrentAppState] = useState<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      setCurrentAppState(state);
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!user || !navigationReady || currentAppState !== 'active' || started.current) return;
    started.current = true;
    let mounted = true;
    const instance = messaging();

    void registerNotificationDevice().catch(() => undefined);
    const unsubscribeToken = instance.onTokenRefresh(token => {
      if (mounted) void registerNotificationToken(token).catch(() => undefined);
    });
    const unsubscribeOpened = instance.onNotificationOpenedApp(message => {
      if (mounted) navigateFromCommunityNotification(message.data || {});
    });
    void instance.getInitialNotification().then(message => {
      if (mounted && message?.data) navigateFromCommunityNotification(message.data);
    }).catch(() => undefined);

    return () => {
      mounted = false;
      unsubscribeToken();
      unsubscribeOpened();
      started.current = false;
    };
  }, [currentAppState, navigationReady, user]);

  return null;
}
