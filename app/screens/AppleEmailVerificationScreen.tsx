import React, {useState} from 'react';
import {Image, Linking, Platform, Pressable, StyleSheet, Text, TextInput, ToastAndroid, View, Alert} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useAuth} from '../context/AuthContext';
import {authButtonStyles} from '../components/authButtonStyles';
import {pastelColors} from '../theme/colors';
import {requestAppleEmailVerification, AppleEmailVerificationRequired} from '../services/appleSignIn';

const APP_ICON = require('../../assets/images/app-logo.png');
const TERMS_URL = 'https://ij-roy.github.io/touch/terms-and-conditions/';

function toast(message: string) {
  if (Platform.OS === 'android') ToastAndroid.show(message, ToastAndroid.LONG);
  else Alert.alert('Touch', message);
}

export default function AppleEmailVerificationScreen({error, onBack}: {error: AppleEmailVerificationRequired; onBack: () => void}) {
  const {verifyAppleEmail} = useAuth();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const sendCode = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const response = await requestAppleEmailVerification(error.idToken, email);
      setChallengeId(response.challengeId);
      toast(`We sent a verification code to ${email.trim().toLowerCase()}.`);
    } catch (err: any) {
      toast(err?.response?.data?.error || 'We could not send the code. Please try again.');
    } finally { setBusy(false); }
  };

  const verifyCode = async () => {
    if (busy || !challengeId) return;
    setBusy(true);
    try {
      if (!verifyAppleEmail) throw new Error('Email verification is unavailable. Please try again later.');
      await verifyAppleEmail(error.idToken, challengeId, code);
    } catch (err: any) {
      toast(err?.response?.data?.error || 'That code could not be verified. Please try again.');
    } finally { setBusy(false); }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.content}>
          <Image source={APP_ICON} style={styles.appIcon} resizeMode="contain" />
          <Text style={styles.title}>Verify your email</Text>
          <Text style={styles.copy}>{challengeId ? 'Enter the code we sent you to finish signing in with Apple.' : 'Enter your email so we can securely connect your Apple sign-in to Touch.'}</Text>
          {!challengeId ? <>
            <TextInput value={email} onChangeText={setEmail} placeholder="Email address" placeholderTextColor={pastelColors.auth.mutedText} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} style={styles.input} />
            <Pressable disabled={busy} onPress={sendCode} style={({pressed}) => [authButtonStyles.button, pressed && authButtonStyles.pressed]}><Text style={authButtonStyles.label}>{busy ? 'Sending...' : 'Send verification code'}</Text></Pressable>
          </> : <>
            <TextInput value={code} onChangeText={setCode} placeholder="6-digit code" placeholderTextColor={pastelColors.auth.mutedText} keyboardType="number-pad" maxLength={6} style={styles.input} />
            <Pressable disabled={busy} onPress={verifyCode} style={({pressed}) => [authButtonStyles.button, pressed && authButtonStyles.pressed]}><Text style={authButtonStyles.label}>{busy ? 'Verifying...' : 'Verify and continue'}</Text></Pressable>
            <Pressable disabled={busy} onPress={sendCode} style={styles.linkButton}><Text style={styles.link}>Resend code</Text></Pressable>
          </>}
          <Pressable disabled={busy} onPress={onBack} style={styles.linkButton}><Text style={styles.back}>Back to sign-in</Text></Pressable>
        </View>
        <Text style={styles.terms}>By continuing you agree to our <Text onPress={() => Linking.openURL(TERMS_URL)} style={styles.link}>terms and conditions</Text></Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {flex: 1, backgroundColor: pastelColors.auth.background},
  container: {flex: 1, justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 72, paddingBottom: 28},
  content: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  appIcon: {width: 124, height: 124, marginBottom: 28, borderRadius: 30},
  title: {color: pastelColors.auth.deepText, fontSize: 30, fontWeight: '900', textAlign: 'center'},
  copy: {maxWidth: 340, marginTop: 12, marginBottom: 24, color: pastelColors.auth.mutedText, fontSize: 15, lineHeight: 22, textAlign: 'center', fontWeight: '600'},
  input: {width: '100%', maxWidth: 340, minHeight: 56, marginBottom: 14, paddingHorizontal: 18, borderRadius: 6, borderWidth: 1, borderColor: pastelColors.auth.glassBorder, backgroundColor: pastelColors.white, color: pastelColors.auth.deepText, fontSize: 17},
  linkButton: {marginTop: 16, padding: 8},
  link: {color: pastelColors.accent, fontSize: 15, fontWeight: '800'},
  back: {color: pastelColors.auth.mutedText, fontSize: 15, fontWeight: '700'},
  terms: {alignSelf: 'center', maxWidth: 340, color: pastelColors.auth.mutedText, fontSize: 12, textAlign: 'center', fontWeight: '600'},
});
