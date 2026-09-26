// App.tsx
import React, { useEffect } from 'react';
import './app/utils/googleConfig';
import { NavigationContainer } from '@react-navigation/native';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import SplashScreen from 'react-native-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppSystemBars from './app/components/AppSystemBars';
import { AuthProvider } from './app/context/AuthContext';
import RootNavigator from './app/navigation/RootNavigator';
import { communityLinking } from './app/navigation/communityLinking';
import {registerNotificationDevice, registerNotificationToken} from './app/services/communityNotifications';
import messaging from '@react-native-firebase/messaging';
import {useAuth} from './app/context/AuthContext';
import {navigationRef, navigateFromCommunityNotification} from './app/navigation/navigationRef';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
    },
    mutations: {
      retry: false,
    },
  },
});

function NotificationRegistration() {
  const user = typeof useAuth === 'function' ? useAuth().user : null;
  useEffect(() => {
    if (!user) return undefined;
    registerNotificationDevice().catch(() => undefined);
    const unsubscribe = messaging().onTokenRefresh(token => {
      registerNotificationToken(token).catch(() => undefined);
    });
    const opened = messaging().onNotificationOpenedApp(message => {
      navigateFromCommunityNotification((message.data || {}) as any);
    });
    messaging().getInitialNotification().then(message => {
      if (message?.data) navigateFromCommunityNotification(message.data as any);
    }).catch(() => undefined);
    return () => {
      unsubscribe();
      opened();
    };
  }, [user]);
  return null;
}

export default function App() {
  useEffect(() => {
    SplashScreen.hide();
  }, []);

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <NotificationRegistration />
          <AppSystemBars />
          <NavigationContainer ref={navigationRef} linking={communityLinking}>
            <RootNavigator />
          </NavigationContainer>
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
