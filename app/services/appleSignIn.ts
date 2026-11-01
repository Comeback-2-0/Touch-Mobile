import {
  getAuth,
  AppleAuthProvider,
  signInWithCredential,
  getIdToken,
} from '@react-native-firebase/auth';
import {api, API_URL} from '../utils/api';
import axios from 'axios';
import {appleAuth} from '@invertase/react-native-apple-authentication';

export type AppleEmailVerificationRequired = Error & {
  code: 'APPLE_EMAIL_VERIFICATION_REQUIRED';
  idToken: string;
  appleRelayEmail?: string;
};

function verificationRequired(idToken: string, data: any): AppleEmailVerificationRequired {
  const error = new Error(data?.error || 'Verify your email to finish Apple sign-in.') as AppleEmailVerificationRequired;
  error.code = 'APPLE_EMAIL_VERIFICATION_REQUIRED';
  error.idToken = idToken;
  error.appleRelayEmail = data?.appleRelayEmail || '';
  return error;
}
export async function authenticateApple(link = false) {
  const response = await appleAuth.performRequest({
    requestedOperation: appleAuth.Operation.LOGIN,
    requestedScopes: [appleAuth.Scope.FULL_NAME, appleAuth.Scope.EMAIL],
  });
  if (!response.identityToken || !response.nonce)
    throw Error('Apple sign-in did not return credentials. Please try again.');
  const credential = AppleAuthProvider.credential(
    response.identityToken,
    response.nonce,
  );
  const result = await signInWithCredential(getAuth(), credential);
  const idToken = await getIdToken(result.user, true);
  if (link)
    return (await api.post('/auth/apple/link', {idToken}, {timeout: 15000}))
      .data;
  try {
    return (await axios.post(`${API_URL}/auth/apple`, {idToken}, {timeout: 15000})).data;
  } catch (error: any) {
    if (error?.response?.data?.code === 'APPLE_EMAIL_VERIFICATION_REQUIRED') {
      throw verificationRequired(idToken, error.response.data);
    }
    throw error;
  }
}

export async function requestAppleEmailVerification(idToken: string, email: string) {
  return (await axios.post(`${API_URL}/auth/apple/email-verification/request`, {idToken, email}, {timeout: 15000})).data;
}

export async function verifyAppleEmailVerification(idToken: string, challengeId: string, code: string) {
  return (await axios.post(`${API_URL}/auth/apple/email-verification/verify`, {idToken, challengeId, code}, {timeout: 15000})).data;
}
