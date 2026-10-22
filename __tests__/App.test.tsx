/**
 * @format
 */

import 'react-native';
import React from 'react';
import {StatusBar} from 'react-native';

// Note: import explicitly to use the types shipped with jest.
import {it} from '@jest/globals';

// Note: test renderer must be required after react-native.
import renderer, {act} from 'react-test-renderer';
import App from '../App';

jest.mock('react-native', () => {
  const TestReact = require('react');
  const actual = jest.requireActual('react-native');
  const MockStatusBar = (props: Record<string, unknown>) =>
    TestReact.createElement(actual.View, {testID: 'mock-status-bar', ...props});

  return new Proxy(actual, {
    get(target, property) {
      if (property === 'StatusBar') return MockStatusBar;
      return target[property];
    },
  });
});

jest.mock('../app/utils/googleConfig', () => ({
  configureGoogleSignIn: jest.fn(),
}));

jest.mock('react-native-safe-area-context', () => {
  const {View} = require('react-native');

  return {
    SafeAreaProvider: ({children}: {children: React.ReactNode}) => (
      <View>{children}</View>
    ),
  };
});

jest.mock('@react-navigation/native', () => {
  const {View} = require('react-native');

  return {
    NavigationContainer: ({children}: {children: React.ReactNode}) => (
      <View>{children}</View>
    ),
  };
});

jest.mock('../app/context/AuthContext', () => {
  const {View} = require('react-native');

  return {
    AuthProvider: ({children}: {children: React.ReactNode}) => (
      <View>{children}</View>
    ),
    useAuth: () => ({
      user: null,
      loading: false,
      signInWithGoogle: jest.fn(),
      signOut: jest.fn(),
    }),
  };
});

jest.mock('../app/navigation/RootNavigator', () => {
  const {View} = require('react-native');

  return function MockRootNavigator() {
    return <View testID="root-navigator" />;
  };
});

it('renders correctly', () => {
  act(() => {
    renderer.create(<App />);
  });
});

it('applies a transparent edge-to-edge status bar for the light app theme', () => {
  let screen: renderer.ReactTestRenderer;

  act(() => {
    screen = renderer.create(<App />);
  });

  const statusBar = screen!.root.findByType(StatusBar);
  expect(statusBar.props.translucent).toBe(true);
  expect(statusBar.props.backgroundColor).toBe('transparent');
  expect(statusBar.props.barStyle).toBe('dark-content');
});
