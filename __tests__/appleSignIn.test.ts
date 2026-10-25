import {authenticateApple} from '../app/services/appleSignIn';
import {appleAuth} from '@invertase/react-native-apple-authentication';
import {
  AppleAuthProvider,
  signInWithCredential,
  getIdToken,
} from '@react-native-firebase/auth';
import axios from 'axios';
import {api} from '../app/utils/api';
jest.mock('@react-native-firebase/auth', () => ({
  getAuth: () => ({}),
  AppleAuthProvider: {credential: jest.fn(() => ({providerId: 'apple.com'}))},
  signInWithCredential: jest.fn(async () => ({user: {}})),
  getIdToken: jest.fn(async () => 'firebase-token'),
}));
jest.mock('axios', () => ({
  post: jest.fn(async () => ({data: {accessToken: 'access'}})),
}));
jest.mock('../app/utils/api', () => ({
  API_URL: 'https://backend.example',
  api: {post: jest.fn(async () => ({data: {user: {_id: 'same-user'}}}))},
}));
beforeEach(() => {
  jest.clearAllMocks();
  jest
    .mocked(appleAuth.performRequest)
    .mockResolvedValue({identityToken: 'apple-token', nonce: 'nonce'} as any);
});
test('uses native Firebase Apple credentials and sends verified Firebase token to backend', async () => {
  expect(await authenticateApple()).toEqual({accessToken: 'access'});
  expect(AppleAuthProvider.credential).toHaveBeenCalledWith(
    'apple-token',
    'nonce',
  );
  expect(signInWithCredential).toHaveBeenCalled();
  expect(getIdToken).toHaveBeenCalled();
  expect(axios.post).toHaveBeenCalledWith(
    'https://backend.example/auth/apple',
    {idToken: 'firebase-token'},
    {timeout: 15000},
  );
});
test('links using current authenticated backend session', async () => {
  await authenticateApple(true);
  expect(api.post).toHaveBeenCalledWith(
    '/auth/apple/link',
    {idToken: 'firebase-token'},
    {timeout: 15000},
  );
  expect(axios.post).not.toHaveBeenCalled();
});
test('missing native token never reaches backend', async () => {
  jest
    .mocked(appleAuth.performRequest)
    .mockResolvedValue({nonce: 'nonce'} as any);
  await expect(authenticateApple()).rejects.toThrow('credentials');
  expect(axios.post).not.toHaveBeenCalled();
});
