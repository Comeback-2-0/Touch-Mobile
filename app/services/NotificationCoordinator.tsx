import {useEffect, useRef} from 'react';
import {AppState} from 'react-native';
import messaging from '@react-native-firebase/messaging';
import {useAuth} from '../context/AuthContext';
import {navigateFromCommunityNotification} from '../navigation/navigationRef';
import {registerNotificationDevice, registerNotificationToken} from './communityNotifications';
import {showCommunityToast} from '../screens/community/communityUx';

type Props = {navigationReady: boolean};

/** Owns Firebase notification subscriptions. It starts only after the JS tree,
 * navigation, authentication, and foreground lifecycle are all ready. */
export function NotificationCoordinator({navigationReady}: Props) {
  const {user} = useAuth();
  const started = useRef(false);

  useEffect(() => {
    if (!user || !navigationReady || started.current) return;
    started.current = true;
    let mounted = true;
    const instance = messaging();
    const register = () => {
      registerNotificationDevice().catch(error => {
        if (__DEV__) console.warn('Notification device registration failed', error);
      });
    };

    if (AppState.currentState === 'active') register();
    const unsubscribeAppState = AppState.addEventListener('change', state => {
      if (state === 'active' && mounted) register();
    });
    const unsubscribeToken = instance.onTokenRefresh(token => {
      if (mounted) {
        registerNotificationToken(token).catch(error => {
          if (__DEV__) console.warn('Notification token registration failed', error);
        });
      }
    });
    const unsubscribeOpened = instance.onNotificationOpenedApp(message => {
      if (mounted) navigateFromCommunityNotification(message.data || {});
    });
    const unsubscribeMessage = instance.onMessage(message => {
      if (!mounted) return;
      const title = message.notification?.title;
      const body = message.notification?.body;
      showCommunityToast(title || body || 'New community activity');
    });
    instance.getInitialNotification().then(message => {
      if (mounted && message?.data) navigateFromCommunityNotification(message.data);
    }).catch(() => undefined);

    return () => {
      mounted = false;
      unsubscribeAppState.remove();
      unsubscribeToken();
      unsubscribeOpened();
      unsubscribeMessage();
      started.current = false;
    };
  }, [navigationReady, user]);

  return null;
}
