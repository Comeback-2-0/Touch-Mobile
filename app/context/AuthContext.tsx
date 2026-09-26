import React, {createContext, useContext, useEffect} from 'react';
import {
  getAuth,
  signInWithCredential,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
} from '@react-native-firebase/auth';
import axios from 'axios';
import {GoogleSignin} from '@react-native-google-signin/google-signin';
import {API_URL, api, setAuthFailureHandler} from '../utils/api';
import {
  clearAuthTokens,
  getAuthTokens,
  saveAuthTokens,
} from '../utils/authTokenStorage';
import messaging from '@react-native-firebase/messaging';
import {revokeNotificationDevice} from '../services/communityNotifications';
import {createAuthFlowError} from '../utils/authErrors';
import {
  BackendUser,
  useAuthStore,
} from '../features/profile/store/authStore';

interface AuthContextShape {
  user: BackendUser | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextShape | undefined>(undefined);

export const AuthProvider: React.FC<{children: React.ReactNode}> = ({
  children,
}) => {
  const auth = getAuth();
  const user = useAuthStore(state => state.user);
  const loading = useAuthStore(state => state.loading);
  const setUser = useAuthStore(state => state.setUser);
  const setLoading = useAuthStore(state => state.setLoading);
  const resetAuth = useAuthStore(state => state.resetAuth);

  useEffect(() => {
    setAuthFailureHandler(() => {
      resetAuth();
    });

    const restoreSession = async () => {
      try {
        const tokens = await getAuthTokens();
        if (!tokens?.accessToken) return;

        const response = await api.get('/auth/me', {timeout: 12_000});
        setUser(response.data.user);
      } catch (err) {
        await clearAuthTokens();
        resetAuth();
      } finally {
        setLoading(false);
      }
    };

    restoreSession();

    return () => setAuthFailureHandler(null);
  }, [resetAuth, setLoading, setUser]);

  const signInWithGoogle = async () => {
    try {
      await GoogleSignin.hasPlayServices({showPlayServicesUpdateDialog: true});

      await GoogleSignin.signIn();
      const {idToken} = await GoogleSignin.getTokens();

      if (!idToken) throw new Error('No idToken returned from Google Sign-In');

      const credential = GoogleAuthProvider.credential(idToken);
      await signInWithCredential(auth, credential);

      const response = await axios.post(`${API_URL}/auth/google`, {idToken}, {timeout: 15_000});

      await saveAuthTokens({
        accessToken: response.data.accessToken,
        refreshToken: response.data.refreshToken,
      });
      setUser(response.data.user);
    } catch (error) {
      console.error('Google Sign-In Error:', error);
      throw createAuthFlowError(error);
    }
  };

  const signOut = async () => {
    await revokeNotificationDevice(await messaging().getToken().catch(() => null));
    const tokens = await getAuthTokens();
    if (tokens?.refreshToken) {
      try {
        await axios.post(`${API_URL}/auth/logout`, {
          refreshToken: tokens.refreshToken,
        });
      } catch (err) {
        console.error('Backend logout failed:', err);
      }
    }

    await clearAuthTokens();
    await firebaseSignOut(auth);
    await GoogleSignin.revokeAccess();
    await GoogleSignin.signOut();
    resetAuth();
  };

  return (
    <AuthContext.Provider value={{user, loading, signInWithGoogle, signOut}}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
