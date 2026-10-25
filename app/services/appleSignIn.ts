import {
  getAuth,
  AppleAuthProvider,
  signInWithCredential,
  getIdToken,
} from '@react-native-firebase/auth';
import {api, API_URL} from '../utils/api';
import axios from 'axios';
import {appleAuth} from '@invertase/react-native-apple-authentication';
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
  return (
    await axios.post(`${API_URL}/auth/apple`, {idToken}, {timeout: 15000})
  ).data;
}
