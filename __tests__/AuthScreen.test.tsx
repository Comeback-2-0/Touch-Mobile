import React from 'react';
import {Alert, Linking, Platform, ToastAndroid} from 'react-native';
import renderer, {act} from 'react-test-renderer';
import AuthScreen from '../app/screens/AuthScreen';
import {useAuth} from '../app/context/AuthContext';

const mockSignInWithGoogle = jest.fn();

jest.mock('../app/context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('react-native-svg', () => {
  const {View} = require('react-native');
  return {
    __esModule: true,
    default: View,
    Svg: View,
    Path: View,
  };
});

jest.mock('react-native-reanimated', () => {
  const {View} = require('react-native');

  return {
    __esModule: true,
    default: {
      View,
      Text: require('react-native').Text,
      createAnimatedComponent: (component: React.ComponentType) => component,
    },
    Easing: {
      inOut: jest.fn(easing => easing),
      ease: jest.fn(),
    },
    interpolate: jest.fn(() => 1),
    useAnimatedStyle: jest.fn(factory => factory()),
    useSharedValue: jest.fn(value => ({value})),
    withDelay: jest.fn((_delay, value) => value),
    withRepeat: jest.fn(value => value),
    withSequence: jest.fn((...values) => values[values.length - 1]),
    withSpring: jest.fn(value => value),
    withTiming: jest.fn(value => value),
  };
});

describe('AuthScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: 'android',
    });
    jest.mocked(useAuth).mockReturnValue({
      user: null,
      loading: false,
      signInWithGoogle: mockSignInWithGoogle,
      signOut: jest.fn(),
    });
  });

  it('renders branded login content and google sign-in action', () => {
    let screen: renderer.ReactTestRenderer;

    act(() => {
      screen = renderer.create(<AuthScreen />);
    });

    expect(screen!.root.findByProps({testID: 'auth-title'}).props.children).toBe(
      'Touch',
    );
    expect(screen!.root.findByProps({testID: 'auth-tagline'}).props.children).toBe(
      'scroll moodly, chat ghostly',
    );
    expect(screen!.root.findByProps({testID: 'auth-tagline'}).props.numberOfLines).toBe(
      1,
    );
    expect(
      screen!.root.findByProps({testID: 'auth-tagline'}).props.adjustsFontSizeToFit,
    ).toBe(true);
    expect(screen!.root.findByProps({testID: 'auth-app-icon'})).toBeTruthy();
    expect(screen!.root.findByProps({testID: 'google-icon'})).toBeTruthy();
    expect(screen!.root.findByProps({testID: 'google-button-content'})).toBeTruthy();
    expect(screen!.root.findByProps({testID: 'google-signin-label'}).props.children).toBe(
      'Continue with Google',
    );
  });

  it('keeps the login screen focused without marketing feature chips', () => {
    let screen: renderer.ReactTestRenderer;

    act(() => {
      screen = renderer.create(<AuthScreen />);
    });

    expect(screen!.root.findAllByProps({children: 'Sign in to Touch'})).toHaveLength(0);
    expect(screen!.root.findAllByProps({children: 'Use your Google account to continue securely.'})).toHaveLength(0);
    expect(screen!.root.findAllByProps({children: 'Live groups'})).toHaveLength(0);
    expect(screen!.root.findAllByProps({children: 'Saved reels'})).toHaveLength(0);
    expect(screen!.root.findAllByProps({children: 'Private profile'})).toHaveLength(0);
  });

  it('opens terms and conditions from the bottom legal copy', () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    let screen: renderer.ReactTestRenderer;

    act(() => {
      screen = renderer.create(<AuthScreen />);
    });

    act(() => {
      screen!.root.findByProps({testID: 'terms-link'}).props.onPress();
    });

    expect(openURL).toHaveBeenCalledWith(
      'https://ij-roy.github.io/touch/terms-and-conditions/',
    );

    openURL.mockRestore();
  });

  it('does not show creator credit on the auth screen', () => {
    let screen: renderer.ReactTestRenderer;

    act(() => {
      screen = renderer.create(<AuthScreen />);
    });

    expect(screen!.root.findAllByProps({testID: 'creator-credit'})).toHaveLength(0);
    expect(screen!.root.findAllByProps({testID: 'creator-link'})).toHaveLength(0);
  });

  it('calls google sign-in when the button is pressed', async () => {
    mockSignInWithGoogle.mockResolvedValue(undefined);
    let screen: renderer.ReactTestRenderer;

    act(() => {
      screen = renderer.create(<AuthScreen />);
    });

    await act(async () => {
      await screen!.root.findByProps({testID: 'google-signin-button'}).props.onPress();
    });

    expect(mockSignInWithGoogle).toHaveBeenCalledTimes(1);
  });

  it('shows button loading feedback while sign-in is pending', async () => {
    let resolveSignIn: () => void = () => undefined;
    mockSignInWithGoogle.mockImplementation(
      () =>
        new Promise<void>(resolve => {
          resolveSignIn = resolve;
        }),
    );

    let screen: renderer.ReactTestRenderer;

    act(() => {
      screen = renderer.create(<AuthScreen />);
    });

    await act(async () => {
      screen!.root.findByProps({testID: 'google-signin-button'}).props.onPress();
    });

    expect(screen!.root.findByProps({testID: 'google-signin-button'}).props.accessibilityState).toEqual({
      busy: true,
      disabled: true,
    });
    expect(screen!.root.findByProps({testID: 'google-signin-label'}).props.children).toBe(
      'Connecting...',
    );

    await act(async () => {
      resolveSignIn();
    });
  });

  it('shows auth errors as an Android toast without raw status codes', async () => {
    const showToast = jest.spyOn(ToastAndroid, 'show').mockImplementation(jest.fn());
    mockSignInWithGoogle.mockRejectedValue({
      response: {status: 502},
      message: 'Request failed with status code 502',
    });
    let screen: renderer.ReactTestRenderer;

    act(() => {
      screen = renderer.create(<AuthScreen />);
    });

    await act(async () => {
      await screen!.root.findByProps({testID: 'google-signin-button'}).props.onPress();
    });

    expect(screen!.root.findAllByProps({testID: 'auth-toast'})).toHaveLength(0);
    expect(showToast).toHaveBeenCalledWith(
      'Touch is having trouble reaching the server. Please try again in a moment.',
      ToastAndroid.LONG,
    );
    expect(showToast.mock.calls[0][0]).not.toContain('502');

    showToast.mockRestore();
  });

  it('falls back to an alert for auth errors outside Android', async () => {
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: 'ios',
    });
    const showAlert = jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());
    mockSignInWithGoogle.mockRejectedValue({message: 'Network request failed'});

    let screen: renderer.ReactTestRenderer;

    act(() => {
      screen = renderer.create(<AuthScreen />);
    });

    await act(async () => {
      await screen!.root.findByProps({testID: 'google-signin-button'}).props.onPress();
    });

    expect(showAlert).toHaveBeenCalledWith(
      'Touch',
      "You're offline. Check your connection and try again.",
    );

    showAlert.mockRestore();
  });
});
