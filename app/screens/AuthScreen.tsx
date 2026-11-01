import React, {useEffect, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  ToastAndroid,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, {Path} from 'react-native-svg';
import {useAuth} from '../context/AuthContext';
import AppleSignInButton from '../components/AppleSignInButton';
import {authButtonStyles} from '../components/authButtonStyles';
import {pastelColors} from '../theme/colors';
import {getAuthErrorMessage} from '../utils/authErrors';
import AppleEmailVerificationScreen from './AppleEmailVerificationScreen';
import type {AppleEmailVerificationRequired} from '../services/appleSignIn';

const AnimatedView = Animated.View as React.ComponentType<any>;
const APP_ICON = require('../../assets/images/app-logo.png');
const TERMS_URL = 'https://ij-roy.github.io/touch/terms-and-conditions/';

function showAuthToast(message: string | null | undefined) {
  if (!message) return;
  if (Platform.OS === 'android') {
    ToastAndroid.show(message, ToastAndroid.LONG);
    return;
  }
  Alert.alert('Touch', message);
}

function AnimatedBackdrop() {
  const drift = useSharedValue(0);

  useEffect(() => {
    drift.value = withRepeat(
      withTiming(1, {duration: 5600, easing: Easing.inOut(Easing.ease)}),
      -1,
      true,
    );
  }, [drift]);

  const topStyle = useAnimatedStyle(() => ({
    transform: [
      {translateY: drift.value * 18},
      {translateX: drift.value * -10},
      {rotate: `${-12 + drift.value * 6}deg`},
    ],
  }));

  const bottomStyle = useAnimatedStyle(() => ({
    transform: [
      {translateY: drift.value * -16},
      {translateX: drift.value * 12},
      {rotate: `${14 - drift.value * 5}deg`},
    ],
  }));

  return (
    <>
      <AnimatedView style={[styles.backdropPanelTop, topStyle]} />
      <AnimatedView style={[styles.backdropPanelBottom, bottomStyle]} />
      <View style={styles.backdropStripe} />
    </>
  );
}

function GoogleIcon() {
  return (
    <Svg testID="google-icon" width={22} height={22} viewBox="0 0 24 24">
      <Path
        fill={pastelColors.googleLogo.blue}
        d="M23.5 12.27c0-.83-.07-1.43-.22-2.05H12v3.96h6.62c-.13 1.02-.86 2.56-2.47 3.59l-.02.13 3.59 2.45.25.02c2.32-2 3.53-4.94 3.53-8.1z"
      />
      <Path
        fill={pastelColors.googleLogo.green}
        d="M12 24c3.31 0 6.09-1.02 8.12-2.78l-3.87-3.45c-1.04.67-2.43 1.14-4.25 1.14-3.25 0-6.01-2-6.99-4.77l-.12.01-3.73 2.69-.05.13C3.13 21.11 7.34 24 12 24z"
      />
      <Path
        fill={pastelColors.googleLogo.yellow}
        d="M5.01 14.14A7.03 7.03 0 0 1 4.62 12c0-.74.14-1.46.37-2.14l-.01-.14-3.78-2.73-.12.05A11.56 11.56 0 0 0 0 12c0 1.79.47 3.48 1.29 4.94l3.72-2.8z"
      />
      <Path
        fill={pastelColors.googleLogo.red}
        d="M12 5.09c2.3 0 3.85.93 4.73 1.7l3.46-3.15C18.06 1.79 15.31 0 12 0 7.34 0 3.13 2.89 1.08 7.04l3.91 2.82C5.99 7.09 8.75 5.09 12 5.09z"
      />
    </Svg>
  );
}

type Props = {
  route?: {
    params?: {
      authError?: string;
    };
  };
};

export default function AuthScreen({route}: Props) {
  const {signInWithGoogle, signInWithApple} = useAuth();
  const [signingIn, setSigningIn] = useState(false);
  const [appleVerificationError, setAppleVerificationError] = useState<AppleEmailVerificationRequired | null>(null);
  const toastedRouteError = useRef(false);

  useEffect(() => {
    if (!route?.params?.authError || toastedRouteError.current) return;
    toastedRouteError.current = true;
    showAuthToast(route.params.authError);
  }, [route?.params?.authError]);


  const handleLogin = async () => {
    if (signingIn) return;

    setSigningIn(true);

    try {
      await signInWithGoogle();
    } catch (err) {
      showAuthToast(getAuthErrorMessage(err));
    } finally {
      setSigningIn(false);
    }
  };

  const handleAppleLogin = async () => {
    if(signingIn || !signInWithApple) return;
    setSigningIn(true);
    try { await signInWithApple(); }
    catch(error:any) {
      if (error?.code === 'APPLE_EMAIL_VERIFICATION_REQUIRED') {
        setAppleVerificationError(error);
        return;
      }
      if(error?.code !== '1001') Alert.alert('Apple sign-in', error?.response?.data?.error || error?.message || 'Could not sign in. Please try again.');
    } finally { setSigningIn(false); }
  };

  if (appleVerificationError) {
    return <AppleEmailVerificationScreen error={appleVerificationError} onBack={() => setAppleVerificationError(null)} />;
  }

  const openTerms = () => {
    Linking.openURL(TERMS_URL);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AnimatedBackdrop />
      <View style={styles.container}>
        <View style={[styles.content, Platform.OS === 'android' && styles.contentAndroid]}>
          <Image
            testID="auth-app-icon"
            source={APP_ICON}
            style={styles.appIcon}
            resizeMode="contain"
            accessible
            accessibilityLabel="Touch app icon"
          />
          <Text testID="auth-title" style={styles.title}>
            Touch
          </Text>
          <Text
            testID="auth-tagline"
            style={styles.subtitle}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.78}>
            scroll moodly, chat ghostly
          </Text>

          <Pressable
            testID="google-signin-button"
            accessibilityRole="button"
            accessibilityLabel="Sign In With Google"
            accessibilityState={{busy: signingIn, disabled: signingIn}}
            disabled={signingIn}
            onPress={handleLogin}
            style={({pressed}) => [authButtonStyles.button, pressed && authButtonStyles.pressed]}>
            <View testID="google-button-content" style={styles.googleButtonContent}>
                <GoogleIcon />
              <Text testID="google-signin-label" style={authButtonStyles.label}>
                {signingIn ? 'Connecting...' : 'Sign In With Google'}
              </Text>
            </View>
            {signingIn ? (
              <ActivityIndicator
                style={styles.googleButtonSpinner}
                color={pastelColors.white}
              />
            ) : null}
          </Pressable>
          <AppleSignInButton onPress={handleAppleLogin} disabled={signingIn} />
        </View>

        <Text style={styles.termsText}>
          By continuing you agree to our{' '}
          <Text
            testID="terms-link"
            accessibilityRole="link"
            onPress={openTerms}
            style={styles.termsLink}>
            terms and conditions
          </Text>
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: pastelColors.auth.background,
  },
  container: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 72,
    paddingBottom: 28,
  },
  backdropPanelTop: {
    position: 'absolute',
    top: 92,
    left: -74,
    width: 210,
    height: 210,
    borderRadius: 105,
    opacity: 0.55,
    backgroundColor: pastelColors.auth.primaryOverlay,
  },
  backdropPanelBottom: {
    position: 'absolute',
    right: -96,
    bottom: 84,
    width: 240,
    height: 240,
    borderRadius: 120,
    opacity: 0.44,
    backgroundColor: pastelColors.auth.accentOverlay,
  },
  backdropStripe: {
    position: 'absolute',
    top: 150,
    right: 40,
    width: 96,
    height: 8,
    borderRadius: 999,
    opacity: 0.42,
    backgroundColor: pastelColors.card,
    transform: [{rotate: '-14deg'}],
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentAndroid: {
    transform: [{translateY: 56}],
  },
  appIcon: {
    width: 124,
    height: 124,
    marginBottom: 28,
    borderRadius: 30,
    shadowColor: pastelColors.shadow,
    shadowOpacity: 0.16,
    shadowRadius: 24,
    shadowOffset: {width: 0, height: 14},
    elevation: 10,
  },
  title: {
    color: pastelColors.auth.deepText,
    fontSize: 42,
    fontWeight: '900',
    letterSpacing: 0,
  },
  subtitle: {
    width: '100%',
    maxWidth: 340,
    marginTop: 8,
    marginBottom: 34,
    color: pastelColors.auth.mutedText,
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '600',
  },
  googleButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleButtonSpinner: {
    position: 'absolute',
    right: 18,
  },
  termsText: {
    alignSelf: 'center',
    maxWidth: 340,
    color: pastelColors.auth.mutedText,
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '600',
  },
  termsLink: {
    color: pastelColors.accent,
    fontWeight: '800',
    textDecorationLine: 'underline',
  },
});
