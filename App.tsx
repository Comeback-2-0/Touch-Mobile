// App.tsx
import React, {useState} from 'react';
import './app/utils/googleConfig';
import { NavigationContainer } from '@react-navigation/native';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppSystemBars from './app/components/AppSystemBars';
import { AuthProvider } from './app/context/AuthContext';
import RootNavigator from './app/navigation/RootNavigator';
import { communityLinking } from './app/navigation/communityLinking';
import {navigationRef, flushPendingCommunityNotification} from './app/navigation/navigationRef';
import {NotificationCoordinator} from './app/services/NotificationCoordinator';

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

export default function App() {
  const [navigationReady, setNavigationReady] = useState(false);

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <NotificationCoordinator navigationReady={navigationReady} />
          <AppSystemBars />
          <NavigationContainer
            ref={navigationRef}
            linking={communityLinking}
            onReady={() => {
              setNavigationReady(true);
              flushPendingCommunityNotification();
            }}
          >
            <RootNavigator />
          </NavigationContainer>
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
