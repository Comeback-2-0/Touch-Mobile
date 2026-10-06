import React from 'react';
import renderer, {act} from 'react-test-renderer';
import RootNavigator from '../app/navigation/RootNavigator';
import {useAuth} from '../app/context/AuthContext';
import {useCurrentProfile} from '../app/features/profile/hooks/useCurrentProfile';
import {navigationRef} from '../app/navigation/navigationRef';
import {consumePendingDeepLink, rememberPendingDeepLink} from '../app/navigation/communityLinking';

jest.mock('../app/context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../app/features/profile/hooks/useCurrentProfile', () => ({
  useCurrentProfile: jest.fn(),
}));

jest.mock('../app/navigation/navigationRef', () => ({
  navigationRef: {
    isReady: jest.fn(() => true),
    resetRoot: jest.fn(),
  },
}));

const mockScreenNames: string[] = [];

jest.mock('@react-navigation/native-stack', () => ({
  createNativeStackNavigator: () => ({
    Navigator: ({children}: {children: React.ReactNode}) => <>{children}</>,
    Screen: ({name, component: Component}: {name: string; component: React.ComponentType}) => {
      mockScreenNames.push(name);
      return <Component />;
    },
  }),
}));

jest.mock('../app/navigation/AppStack', () => () => null);
jest.mock('../app/navigation/AuthStack', () => () => null);
jest.mock('../app/screens/ProfileSetupScreen', () => () => null);

jest.mock('react-native-reanimated', () => {
  const {View, Text} = require('react-native');

  return {
    __esModule: true,
    default: {
      View,
      Text,
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

describe('RootNavigator', () => {
  beforeEach(() => {
    mockScreenNames.length = 0;
    jest.clearAllMocks();
    act(() => {
      consumePendingDeepLink();
    });
    jest.mocked(useCurrentProfile).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    } as any);
  });

  it('renders a neutral feed-shaped skeleton while auth restores', () => {
    jest.mocked(useAuth).mockReturnValue({
      user: null,
      loading: true,
      signInWithGoogle: jest.fn(),
      signOut: jest.fn(),
    });

    let screen: renderer.ReactTestRenderer;

    act(() => {
      screen = renderer.create(<RootNavigator />);
    });

    expect(screen!.root.findByProps({testID: 'auth-loading-screen'})).toBeTruthy();
    expect(screen!.root.findByProps({testID: 'auth-feed-skeleton'})).toBeTruthy();
    expect(screen!.root.findByProps({testID: 'auth-header-skeleton'})).toBeTruthy();
    expect(screen!.root.findAllByProps({testID: 'auth-story-skeleton'}).length).toBeGreaterThanOrEqual(6);
    expect(screen!.root.findAllByProps({testID: 'auth-post-skeleton'}).length).toBeGreaterThanOrEqual(2);
    expect(screen!.root.findAllByProps({testID: 'auth-skeleton-bar'}).length).toBeGreaterThan(1);
    expect(screen!.root.findAllByProps({testID: 'auth-loading-status'})).toHaveLength(0);
    expect(screen!.root.findAllByProps({children: 'TOUCH'})).toHaveLength(0);
  });

  it('routes unauthenticated users to the auth stack', () => {
    jest.mocked(useAuth).mockReturnValue({
      user: null,
      loading: false,
      signInWithGoogle: jest.fn(),
      signOut: jest.fn(),
    });

    act(() => {
      renderer.create(<RootNavigator />);
    });

    expect(mockScreenNames).toContain('Auth');
  });

  it('routes incomplete authenticated users to profile setup', () => {
    jest.mocked(useAuth).mockReturnValue({
      user: {_id: 'u1', name: 'Maya', email: 'maya@example.com'},
      loading: false,
      signInWithGoogle: jest.fn(),
      signOut: jest.fn(),
    });
    jest.mocked(useCurrentProfile).mockReturnValue({
      data: {
        id: 'u1',
        name: 'Maya',
        username: '',
        bio: '',
        profilePicture: '',
        isPrivate: false,
        followersCount: 0,
        followingCount: 0,
        postsCount: 0,
        isProfileComplete: false,
      },
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    } as any);

    act(() => {
      renderer.create(<RootNavigator />);
    });

    expect(mockScreenNames).toContain('ProfileSetup');
  });

  it('routes complete authenticated users to the main app', () => {
    jest.mocked(useAuth).mockReturnValue({
      user: {_id: 'u1', name: 'Maya', email: 'maya@example.com'},
      loading: false,
      signInWithGoogle: jest.fn(),
      signOut: jest.fn(),
    });
    jest.mocked(useCurrentProfile).mockReturnValue({
      data: {
        id: 'u1',
        name: 'Maya',
        username: 'maya',
        bio: '',
        profilePicture: '',
        isPrivate: false,
        followersCount: 0,
        followingCount: 0,
        postsCount: 0,
        isProfileComplete: true,
      },
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    } as any);

    act(() => {
      renderer.create(<RootNavigator />);
    });

    expect(mockScreenNames).toContain('Main');
  });

  it('restores a pending post link after the authenticated profile is ready', () => {
    jest.mocked(useAuth).mockReturnValue({
      user: {_id: 'u1', name: 'Maya', email: 'maya@example.com'},
      loading: false,
      signInWithGoogle: jest.fn(),
      signOut: jest.fn(),
    });
    jest.mocked(useCurrentProfile).mockReturnValue({
      data: {isProfileComplete: true},
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    } as any);
    act(() => {
      rememberPendingDeepLink('https://app.touch.dophera.tech/c/c1/p/p1');
    });

    act(() => {
      renderer.create(<RootNavigator />);
    });

    const state: any = jest.mocked(navigationRef.resetRoot).mock.calls[0][0];
    const communityState = state.routes[0].state.routes[0].state.routes[0].state;
    expect(communityState.routes.map((route: any) => route.name)).toEqual([
      'CommunityBrowse',
      'CommunityHome',
      'CommunityPost',
    ]);
    expect(communityState.routes[2].params).toEqual({communityId: 'c1', contentId: 'p1'});
  });
});
