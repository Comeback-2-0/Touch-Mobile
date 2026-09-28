import React from 'react';
import {ActivityIndicator, Linking} from 'react-native';
import renderer, {act} from 'react-test-renderer';
import SettingsScreen from '../app/screens/Settings';
import {useAuth} from '../app/context/AuthContext';

const mockNavigate = jest.fn();
const mockSignOut = jest.fn();
jest.mock('react-native-device-info', () => ({
  __esModule: true,
  getVersion: () => '9.9.9',
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

jest.mock('../app/context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('react-native-vector-icons/Ionicons', () => {
  const {Text} = require('react-native');
  return ({name}: {name: string}) => <Text>{name}</Text>;
});

describe('SettingsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useAuth).mockReturnValue({
      user: null,
      loading: false,
      signInWithGoogle: jest.fn(),
      signOut: mockSignOut,
    });
  });

  it('renders redesigned settings sections and app version', () => {
    let screen: renderer.ReactTestRenderer;

    act(() => {
      screen = renderer.create(<SettingsScreen />);
    });

    expect(screen!.root.findByProps({testID: 'settings-screen'})).toBeTruthy();
    expect(screen!.root.findByProps({testID: 'settings-title'}).props.children).toBe('Settings');
    [
      'FAQ',
      'Contact Us',
      'Report a Bug',
      'Suggest a Feature',
      'Instagram',
      'Website',
      'Rate on Google Play',
      'Privacy Policy',
      'Terms of Service',
      'Community Guidelines',
      'Child Safety Standards',
      'App Version',
    ].forEach(label => {
      expect(screen!.root.findAllByProps({children: label}).length).toBeGreaterThan(0);
    });
    expect(screen!.root.findByProps({testID: 'settings-app-version'}).props.children).toContain('9.9.9');
  });

  it('opens external settings links', () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    let screen: renderer.ReactTestRenderer;

    act(() => {
      screen = renderer.create(<SettingsScreen />);
    });

    act(() => {
      screen!.root.findByProps({testID: 'settings-link-privacy-policy'}).props.onPress();
    });
    act(() => {
      screen!.root.findByProps({testID: 'settings-link-instagram'}).props.onPress();
    });
    act(() => {
      screen!.root.findByProps({testID: 'settings-link-rate-on-google-play'}).props.onPress();
    });

    expect(openURL).toHaveBeenCalledWith('https://ij-roy.github.io/touch/privacy-policy/');
    expect(openURL).toHaveBeenCalledWith('https://www.instagram.com/out_liarrs/');
    expect(openURL).toHaveBeenCalledWith('https://play.google.com/store/apps/details?id=roy.ij.touch');

    openURL.mockRestore();
  });

  it('opens support mail and navigates in-app help flows', () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    let screen: renderer.ReactTestRenderer;

    act(() => {
      screen = renderer.create(<SettingsScreen />);
    });

    act(() => {
      screen!.root.findByProps({testID: 'settings-link-faq'}).props.onPress();
    });
    act(() => {
      screen!.root.findByProps({testID: 'settings-link-contact-us'}).props.onPress();
    });
    act(() => {
      screen!.root.findByProps({testID: 'settings-link-report-a-bug'}).props.onPress();
    });
    act(() => {
      screen!.root.findByProps({testID: 'settings-link-suggest-a-feature'}).props.onPress();
    });

    expect(mockNavigate).toHaveBeenCalledWith('FAQ');
    expect(openURL).toHaveBeenCalledWith(
      'mailto:ijroy037@gmail.com?subject=Touch%20Support%20Request',
    );
    expect(mockNavigate).toHaveBeenCalledWith('ReportBug');
    expect(mockNavigate).toHaveBeenCalledWith('SuggestFeature');

    openURL.mockRestore();
  });

  it('shows logout feedback while sign out is running', async () => {
    let resolveSignOut: () => void;
    mockSignOut.mockImplementation(
      () =>
        new Promise<void>(resolve => {
          resolveSignOut = resolve;
        }),
    );
    let screen: renderer.ReactTestRenderer;

    act(() => {
      screen = renderer.create(<SettingsScreen />);
    });

    act(() => {
      screen.root.findByProps({testID: 'settings-action-logout'}).props.onPress();
    });

    expect(mockSignOut).toHaveBeenCalledTimes(1);
    expect(screen!.root.findByProps({testID: 'settings-logout-label'}).props.children).toBe(
      'Logging out...',
    );
    expect(screen!.root.findAllByType(ActivityIndicator).length).toBe(1);

    await act(async () => {
      resolveSignOut();
    });
  });

  it('renders logout as the last settings action', () => {
    let screen: renderer.ReactTestRenderer;

    act(() => {
      screen = renderer.create(<SettingsScreen />);
    });

    const actions = screen!.root
      .findAll(node => typeof node.props.testID === 'string' && node.props.testID.startsWith('settings-action-'))
      .map(node => node.props.testID);

    expect(actions[actions.length - 1]).toBe('settings-action-logout');
  });
});
