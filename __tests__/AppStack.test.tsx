import React from 'react';
import renderer, {act} from 'react-test-renderer';
import AppStack from '../app/navigation/AppStack';

const mockNativeScreens: string[] = [];
const mockNativeOptions: Record<string, any> = {};
const mockTabScreens: string[] = [];
const mockTabIcons: Record<string, string> = {};
const mockTabComponents: Record<string, React.ComponentType | undefined> = {};
let mockTabScreenOptions: any;
let mockInitialTab: string | undefined;
let mockTabBar: (props: any) => React.ReactNode;

jest.mock('../app/navigation/CommunityTabBar', () => ({
  CommunityTabBarProvider: ({children}: any) => children,
  CommunityTabBar: () => {
    require('react').useState(true);
    return null;
  },
}));

jest.mock('@react-navigation/native-stack', () => ({
  createNativeStackNavigator: () => ({
    Navigator: ({children}: {children: React.ReactNode}) => <>{children}</>,
    Screen: ({
      name,
      options,
      component: Component,
    }: {
      name: string;
      options?: Record<string, any>;
      component?: React.ComponentType;
    }) => {
      mockNativeScreens.push(name);
      mockNativeOptions[name] = options;
      if (name === 'MainTabs' && Component) {
        return <Component />;
      }
      return null;
    },
  }),
}));

jest.mock('@react-navigation/bottom-tabs', () => ({
  createBottomTabNavigator: () => ({
    Navigator: ({children, screenOptions, initialRouteName, tabBar}: any) => {
      mockTabScreenOptions = screenOptions;
      mockInitialTab = initialRouteName;
      mockTabBar = tabBar;
      return <>{children}</>;
    },
    Screen: ({name, component}: {name: string; component?: React.ComponentType}) => {
      mockTabScreens.push(name);
      mockTabComponents[name] = component;
      if (mockTabScreenOptions) {
        const options = mockTabScreenOptions({route: {name}});
        const icon = options.tabBarIcon({color: 'black', size: 24});
        mockTabIcons[name] = `${icon.type.iconFamily}:${icon.props.name}`;
      }
      return null;
    },
  }),
}));

jest.mock('react-native-vector-icons/Ionicons', () => {
  const MockIonicons = ({name}: {name: string}) =>
    require('react').createElement(require('react-native').Text, null, `Ionicons:${name}`);
  MockIonicons.iconFamily = 'Ionicons';
  return MockIonicons;
});
jest.mock('react-native-vector-icons/Feather', () => {
  const MockFeather = ({name}: {name: string}) =>
    require('react').createElement(require('react-native').Text, null, `Feather:${name}`);
  MockFeather.iconFamily = 'Feather';
  return MockFeather;
});

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({top: 0, right: 0, bottom: 24, left: 0}),
}));

jest.mock('../app/screens/HomeScreen', () => {
  const MockHomeScreen = () => null;
  MockHomeScreen.displayName = 'MockHomeScreen';
  return MockHomeScreen;
});
jest.mock('../app/screens/coming-soon/HomeComingSoon', () => {
  const MockHomeComingSoon = () => null;
  MockHomeComingSoon.displayName = 'MockHomeComingSoon';
  return MockHomeComingSoon;
});
jest.mock('../app/screens/coming-soon/SearchComingSoon', () => () => null);
jest.mock('../app/screens/coming-soon/CommunityComingSoon', () => () => null);
jest.mock('../app/navigation/CommunityStack', () => () => null);
jest.mock('../app/screens/coming-soon/ReelsComingSoon', () => () => null);
jest.mock('../app/screens/ReelScreen', () => () => null);
jest.mock('../app/screens/SearchBar', () => () => null);
jest.mock('../app/navigation/ProfileStack', () => () => null);
jest.mock('../app/navigation/PostReelsStack', () => () => null);
jest.mock('../app/screens/EditProfile', () => () => null);
jest.mock('../app/screens/CreatePostScreen', () => () => null);
jest.mock('../app/screens/NotificationsPlaceholderScreen', () => () => null);
jest.mock('../app/navigation/SettingsStack', () => () => null);
jest.mock('../app/context/PostQueueContext', () => ({
  PostQueueProvider: ({children}: {children: React.ReactNode}) => <>{children}</>,
}));

describe('AppStack', () => {
  it('renders the custom tab bar as a component inside the library render callback', () => {
    act(() => { renderer.create(<AppStack />); });
    const Context = React.createContext(null);
    // BottomTabView calls tabBar from a Consumer, outside a hooks dispatcher.
    expect(() => act(() => {
      renderer.create(<Context.Consumer>{() => mockTabBar({})}</Context.Consumer>);
    })).not.toThrow();
  });
  it('opens Communities by default without reordering the tabs', () => {
    act(() => { renderer.create(<AppStack />); });
    expect(mockInitialTab).toBe('ChatTab');
    expect(mockTabScreens).toEqual(['Home', 'SearchBar', 'ChatTab', 'Reels', 'ProfileTab']);
  });
  beforeEach(() => {
    mockNativeScreens.length = 0;
    mockTabScreens.length = 0;
    Object.keys(mockTabIcons).forEach(key => delete mockTabIcons[key]);
    Object.keys(mockTabComponents).forEach(key => delete mockTabComponents[key]);
    mockTabScreenOptions = undefined;
    Object.keys(mockNativeOptions).forEach(key => delete mockNativeOptions[key]);
  });

  it('registers edit profile and settings above the bottom tabs', () => {
    act(() => {
      renderer.create(<AppStack />);
    });

    expect(mockNativeScreens).toEqual(
      expect.arrayContaining(['MainTabs', 'CreatePost', 'PostReels', 'EditProfile', 'Settings']),
    );
    expect(mockNativeScreens).toContain('Notifications');
    expect(mockTabScreens).toContain('ProfileTab');
    expect(mockTabScreens).not.toContain('EditProfile');
    expect(mockTabScreens).not.toContain('Settings');
    expect(mockNativeOptions.EditProfile).toEqual(expect.objectContaining({headerShown: false}));
    expect(mockNativeOptions.Settings).toEqual(expect.objectContaining({headerShown: false}));
  });

  it('orders bottom tabs and uses the requested icon set', () => {
    act(() => {
      renderer.create(<AppStack />);
    });

    expect(mockTabScreens).toEqual(['Home', 'SearchBar', 'ChatTab', 'Reels', 'ProfileTab']);
    expect(mockTabIcons).toEqual({
      Home: 'Feather:home',
      SearchBar: 'Feather:search',
      ChatTab: 'Feather:users',
      Reels: 'Feather:smartphone',
      ProfileTab: 'Feather:user',
    });
  });

  it('uses the animated home placeholder for the Home tab', () => {
    act(() => {
      renderer.create(<AppStack />);
    });

    expect(mockTabComponents.Home?.displayName).toBe('MockHomeComingSoon');
  });

  it('does not add safe-area inset into tab bar height manually', () => {
    act(() => {
      renderer.create(<AppStack />);
    });

    const options = mockTabScreenOptions({route: {name: 'Home'}});
    expect(options.tabBarHideOnKeyboard).toBe(true);
    expect(options.tabBarStyle).toEqual(
      expect.objectContaining({
        backgroundColor: '#FFC0CB',
        borderTopWidth: 0,
        elevation: 10,
      }),
    );
    expect(options.tabBarStyle).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          height: expect.any(Number),
          paddingBottom: expect.any(Number),
        }),
      ]),
    );
  });
});
