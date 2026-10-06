import React, {useEffect, useState} from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {useAuth} from '../context/AuthContext';
import AuthStack from './AuthStack';
import AppStack from './AppStack';
import AuthLoadingScreen from '../components/AuthLoadingScreen';
import ProfileSetupScreen from '../screens/ProfileSetupScreen';
import {useCurrentProfile} from '../features/profile/hooks/useCurrentProfile';
import {AUTH_ERROR_MESSAGES} from '../utils/authErrors';
import {clearAuthTokens} from '../utils/authTokenStorage';
import {useAuthStore} from '../features/profile/store/authStore';
import {navigationRef} from './navigationRef';
import {
  consumePendingDeepLink,
  getNavigationStateFromUrl,
  usePendingDeepLink,
} from './communityLinking';

export type RootStackParamList = {
  Auth: {authError?: string} | undefined;
  ProfileSetup: undefined;
  Main: undefined;
};

const RootStack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const {user, loading} = useAuth();
  const resetAuth = useAuthStore(state => state.resetAuth);
  const profileQuery = useCurrentProfile({enabled: Boolean(user)});
  const [authError, setAuthError] = useState<string | undefined>();
  const pendingDeepLink = usePendingDeepLink();

  useEffect(() => {
    if (!user || !profileQuery.isError) return;

    setAuthError(AUTH_ERROR_MESSAGES.server);
    let cancelled = false;
    (async () => {
      await clearAuthTokens();
      if (!cancelled) resetAuth();
    })();

    return () => {
      cancelled = true;
    };
  }, [profileQuery.isError, resetAuth, user]);

  useEffect(() => {
    if (
      !pendingDeepLink
      || !user
      || loading
      || profileQuery.isLoading
      || profileQuery.isError
      || profileQuery.data?.isProfileComplete !== true
      || !navigationRef.isReady()
      || typeof (navigationRef as any).resetRoot !== 'function'
    ) return;

    const state = getNavigationStateFromUrl(pendingDeepLink);
    consumePendingDeepLink();
    if (state) (navigationRef as any).resetRoot(state);
  }, [loading, pendingDeepLink, profileQuery.data?.isProfileComplete, profileQuery.isError, profileQuery.isLoading, user]);

  if (loading) return <AuthLoadingScreen />;

  // Never park on a blank bootstrap state when the server is unreachable.
  if (user && profileQuery.isLoading && !profileQuery.isError) {
    return <AuthLoadingScreen />;
  }

  const showAuth = !user || Boolean(profileQuery.isError) || Boolean(authError);

  return (
    <RootStack.Navigator screenOptions={{headerShown: false}}>
      {showAuth ? (
        <RootStack.Screen
          name="Auth"
          component={AuthStack}
          initialParams={authError ? {authError} : undefined}
        />
      ) : profileQuery.data?.isProfileComplete === false ? (
        <RootStack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
      ) : (
        <RootStack.Screen name="Main" component={AppStack} />
      )}
    </RootStack.Navigator>
  );
}
