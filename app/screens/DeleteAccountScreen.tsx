import React, {useRef, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  StyleSheet,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {api} from '../utils/api';
import {useAuth} from '../context/AuthContext';
import {clearAuthTokens} from '../utils/authTokenStorage';
import {useAuthStore} from '../features/profile/store/authStore';
const REASONS = [
  'Not using Touch',
  'Privacy concerns',
  'Unwanted content',
  'Other',
];
export default function DeleteAccountScreen() {
  const navigation = useNavigation();
  const {signOut} = useAuth();
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState<{dueAt: string} | null>(null);
  const submitting = useRef(false);
  const submit = async () => {
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    try {
      const response = await api.post(
        '/users/me/deletion-request',
        {confirmed: true, reason, details},
        {timeout: 20000},
      );
      setReceipt(response.data);
    } catch (error: any) {
      Alert.alert(
        'Could not request deletion',
        error?.response?.data?.error ||
          'Please check your connection and try again.',
      );
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  };
  const finish = async () => {
    setBusy(true);
    try {
      await signOut();
    } catch {
      // The server already disabled the account; always clear this device.
    } finally {
      await clearAuthTokens();
      useAuthStore.getState().resetAuth();
    }
  };
  const confirm = () =>
    Alert.alert(
      'Delete your account?',
      'Your account and associated data will be deleted within 14 working days. You will be signed out and cannot use the account while deletion is pending.',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Submit deletion request',
          style: 'destructive',
          onPress: submit,
        },
      ],
    );
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Delete Account</Text>
        {receipt ? (
          <>
            <Text testID="deletion-receipt" style={styles.copy}>
              Account deletion requested. Your account and associated data will
              be deleted within 14 working days.
            </Text>
            <Text style={styles.copy}>
              Delete by:{' '}
              {new Date(receipt.dueAt).toLocaleDateString('en-IN', {
                timeZone: 'Asia/Kolkata',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
              .
            </Text>
            <Text style={styles.copy}>
              Working days are Monday-Friday, excluding weekends. You will
              receive confirmation when deletion is complete.
            </Text>
            <Pressable
              testID="deletion-done"
              disabled={busy}
              style={styles.button}
              onPress={finish}>
              <Text style={styles.buttonText}>Done and sign out</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={styles.copy}>
              This requests permanent deletion of your Touch account and
              associated personal data and content. Processing takes up to 14
              working days (Monday-Friday, excluding weekends). We will confirm
              completion. Information legally required to be retained is
              excluded.
            </Text>
            <Text style={styles.copy}>Why are you leaving? (Optional)</Text>
            {REASONS.map(value => (
              <Pressable
                key={value}
                accessibilityRole="radio"
                accessibilityState={{checked: reason === value}}
                onPress={() => setReason(reason === value ? '' : value)}
                style={styles.option}>
                <Text>
                  {reason === value ? '● ' : '○ '}
                  {value}
                </Text>
              </Pressable>
            ))}
            <TextInput
              testID="deletion-details"
              value={details}
              onChangeText={setDetails}
              maxLength={2000}
              multiline
              placeholder="Anything else? (Optional)"
              placeholderTextColor="#6B4B58"
              style={styles.input}
            />
            <Pressable
              testID="deletion-skip"
              disabled={busy}
              onPress={() => {
                setReason('');
                setDetails('');
              }}>
              <Text style={styles.copy}>Skip feedback</Text>
            </Pressable>
            <Pressable
              testID="deletion-submit"
              disabled={busy}
              style={styles.button}
              onPress={confirm}>
              {busy ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.buttonText}>Submit deletion request</Text>
              )}
            </Pressable>
            <Pressable disabled={busy} onPress={() => navigation.goBack()}>
              <Text style={styles.copy}>Cancel</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: '#FFF6F9'},
  content: {padding: 24, gap: 16},
  title: {fontSize: 28, fontWeight: '800', color: '#32111F'},
  copy: {fontSize: 15, lineHeight: 23, color: '#6B4B58'},
  option: {padding: 14, borderRadius: 12, backgroundColor: 'white'},
  input: {
    minHeight: 100,
    padding: 14,
    backgroundColor: 'white',
    borderRadius: 12,
    color: '#32111F',
    textAlignVertical: 'top',
  },
  button: {
    padding: 17,
    alignItems: 'center',
    borderRadius: 14,
    backgroundColor: '#B42318',
  },
  buttonText: {fontWeight: '800', color: 'white'},
});
