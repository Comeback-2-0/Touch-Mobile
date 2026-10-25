import React from 'react';
import renderer, {act} from 'react-test-renderer';
import {Alert} from 'react-native';
import DeleteAccountScreen from '../app/screens/DeleteAccountScreen';
import {api} from '../app/utils/api';
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({goBack: jest.fn()}),
}));
jest.mock('../app/context/AuthContext', () => ({
  useAuth: () => ({signOut: jest.fn(async () => {})}),
}));
jest.mock('../app/utils/api', () => ({api: {post: jest.fn()}}));
jest.mock('../app/utils/authTokenStorage', () => ({
  clearAuthTokens: jest.fn(async () => {}),
}));
test('feedback can be skipped and confirmation records a request and deadline receipt', async () => {
  const alert = jest.spyOn(Alert, 'alert');
  jest
    .mocked(api.post)
    .mockResolvedValue({data: {dueAt: '2026-11-12T18:29:59.999Z'}});
  let screen: renderer.ReactTestRenderer;
  await act(async () => {
    screen = renderer.create(<DeleteAccountScreen />);
  });
  act(() =>
    screen!.root
      .findByProps({testID: 'deletion-details'})
      .props.onChangeText('optional feedback'),
  );
  act(() =>
    screen!.root.findByProps({testID: 'deletion-skip'}).props.onPress(),
  );
  act(() =>
    screen!.root.findByProps({testID: 'deletion-submit'}).props.onPress(),
  );
  expect(api.post).not.toHaveBeenCalled();
  const buttons = alert.mock.calls.at(-1)?.[2];
  await act(async () => {
    await buttons?.[1].onPress?.();
  });
  expect(api.post).toHaveBeenCalledWith(
    '/users/me/deletion-request',
    {confirmed: true, reason: '', details: ''},
    {timeout: 20000},
  );
  expect(
    screen!.root.findByProps({testID: 'deletion-receipt'}).props.children,
  ).toContain('14 working days');
  act(() => screen!.unmount());
  alert.mockRestore();
});
