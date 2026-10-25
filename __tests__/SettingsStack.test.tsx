import React from 'react';
import renderer, {act} from 'react-test-renderer';
import SettingsStack from '../app/navigation/SettingsStack';

let mockInitialRoute: string | undefined;
const mockScreenNames: string[] = [];
const mockScreenOptions: Record<string, any> = {};

jest.mock('@react-navigation/native-stack', () => ({
  createNativeStackNavigator: () => ({
    Navigator: ({
      children,
      initialRouteName,
    }: {
      children: React.ReactNode;
      initialRouteName?: string;
    }) => {
      mockInitialRoute = initialRouteName;
      return <>{children}</>;
    },
    Screen: ({
      name,
      options,
    }: {
      name: string;
      options?: Record<string, any>;
    }) => {
      mockScreenNames.push(name);
      mockScreenOptions[name] = options;
      return null;
    },
  }),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
  }),
}));

jest.mock('../app/context/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    loading: false,
    signInWithGoogle: jest.fn(),
    signOut: jest.fn(),
  }),
}));

jest.mock('react-native-image-crop-picker', () => ({
  openPicker: jest.fn(),
}));

jest.mock('react-native-vector-icons/Ionicons', () => {
  const {Text} = require('react-native');
  return ({name}: {name: string}) => <Text>{name}</Text>;
});

describe('SettingsStack', () => {
  beforeEach(() => {
    mockScreenNames.length = 0;
    Object.keys(mockScreenOptions).forEach(
      key => delete mockScreenOptions[key],
    );
  });

  it('uses a unique route name for the settings landing screen', () => {
    act(() => {
      renderer.create(<SettingsStack />);
    });

    expect(mockScreenNames).toContain('SettingsHome');
    expect(mockInitialRoute).toBe('SettingsHome');
    expect(mockScreenNames).not.toContain('Settings');
  });

  it('hides the native header on the settings landing screen', () => {
    act(() => {
      renderer.create(<SettingsStack />);
    });

    expect(mockScreenOptions.SettingsHome).toEqual(
      expect.objectContaining({headerShown: false}),
    );
  });

  it('registers in-app FAQ and feedback form routes without native headers', () => {
    act(() => {
      renderer.create(<SettingsStack />);
    });

    expect(mockScreenNames).toEqual(
      expect.arrayContaining(['FAQ', 'ReportBug', 'SuggestFeature']),
    );
    expect(mockScreenOptions.FAQ).toEqual(
      expect.objectContaining({headerShown: false}),
    );
    expect(mockScreenOptions.ReportBug).toEqual(
      expect.objectContaining({headerShown: false}),
    );
    expect(mockScreenOptions.SuggestFeature).toEqual(
      expect.objectContaining({headerShown: false}),
    );
  });
});

jest.mock('react-native-vector-icons/Feather', () => {
  const {Text} = require('react-native');
  return ({name}: any) => require('react').createElement(Text, null, name);
});

jest.mock('react-native-vector-icons/FontAwesome', () => {
  const {Text} = require('react-native');
  return ({name}: any) => require('react').createElement(Text, null, name);
});

jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => {
  const {Text} = require('react-native');
  return ({name}: any) => require('react').createElement(Text, null, name);
});
