// app/navigation/AppStack.tsx
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { RouteProp } from '@react-navigation/native';
import Feather from 'react-native-vector-icons/Feather';
import {pastelColors} from '../theme/colors';

// PostQueueProvider import preserved — will be restored when Community is ready
// import { PostQueueProvider } from '../context/PostQueueContext';

import SearchComingSoon from '../screens/coming-soon/SearchComingSoon';
import CommunityStack from './CommunityStack';
import ReelsComingSoon from '../screens/coming-soon/ReelsComingSoon';
import HomeComingSoon from '../screens/coming-soon/HomeComingSoon';
import ProfileStack from './ProfileStack';
import PostReelStack from './PostReelsStack';
import EditProfile from '../screens/EditProfile';
import SettingsStack from './SettingsStack';
import CreatePostScreen from '../screens/CreatePostScreen';
import NotificationsPlaceholderScreen from '../screens/NotificationsPlaceholderScreen';
import type {LocalPostImage} from '../features/posts/types';
import {CommunityTabBar, CommunityTabBarProvider} from './CommunityTabBar';

export type AppStackParamList = {
  MainTabs: undefined;
  PostReels: undefined;
  EditProfile: undefined;
  Settings: undefined;
  CreatePost: {images: LocalPostImage[]};
  Notifications: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  SearchBar: undefined;
  ChatTab: undefined;
  Reels: undefined;
  ProfileTab: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

function getTabIcon(routeName: keyof MainTabParamList, color: string, size: number) {
  switch (routeName) {
    case 'Home':
      return <Feather name="home" size={size} color={color} />;
    case 'SearchBar':
      return <Feather name="search" size={size} color={color} />;
    case 'ProfileTab':
      return <Feather name="user" size={size} color={color} />;
    case 'ChatTab':
      return <Feather name="users" size={size} color={color} />;
    case 'Reels':
      return <Feather name="smartphone" size={size} color={color} />;
    default:
      return null;
  }
}

// ChatTabScreen wrapper preserved — will be restored when Community is ready
// function ChatTabScreen() {
//   return (
//     <PostQueueProvider>
//       <ChatNavigator />
//     </PostQueueProvider>
//   );
// }

const TAB_LABELS: Record<keyof MainTabParamList, string> = {
  Home: 'Home',
  SearchBar: 'Search',
  ChatTab: 'Communities',
  Reels: 'Reels',
  ProfileTab: 'Profile',
};

function getTabScreenOptions({
  route,
}: {
  route: RouteProp<MainTabParamList, keyof MainTabParamList>;
}) {
  return {
    headerShown: false,
    tabBarShowLabel: true,
    tabBarLabel: TAB_LABELS[route.name],
    tabBarActiveTintColor: pastelColors.accent,
    tabBarInactiveTintColor: pastelColors.auth.deepText,
    tabBarHideOnKeyboard: true,
    tabBarStyle: styles.tabBar,
    tabBarItemStyle: styles.tabBarItem,
    tabBarLabelStyle: styles.tabBarLabel,
    // The library's internal Pressable (tabVerticalUiKit) uses
    // justifyContent: 'flex-start' — it cannot be overridden via
    // tabBarItemStyle which targets the outer wrapper, not the Pressable.
    // tabBarButton is the documented way to replace that inner Pressable.
    tabBarButton: (props: any) => (
      <TouchableOpacity
        {...props}
        style={[props.style, styles.tabBarButton]}
      />
    ),
    tabBarIcon: ({color, size}: {color: string; size: number}) =>
      getTabIcon(route.name, color, size),
  };
}

function BottomTabNavigator() {
  return (
    <CommunityTabBarProvider>
      <Tab.Navigator
        initialRouteName="ChatTab"
        screenOptions={getTabScreenOptions}
        tabBar={props => <CommunityTabBar {...props} />}>
        <Tab.Screen name="Home" component={HomeComingSoon} />
        <Tab.Screen name="SearchBar" component={SearchComingSoon} />
        <Tab.Screen name="ChatTab" component={CommunityStack} />
        <Tab.Screen name="Reels" component={ReelsComingSoon} />
        <Tab.Screen name="ProfileTab" component={ProfileStack} />
      </Tab.Navigator>
    </CommunityTabBarProvider>
  );
}

const Stack = createNativeStackNavigator<AppStackParamList>();

export default function AppStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={BottomTabNavigator} />
      <Stack.Screen name="CreatePost" component={CreatePostScreen} />
      <Stack.Screen name="Notifications" component={NotificationsPlaceholderScreen} />
      <Stack.Screen name="PostReels" component={PostReelStack} />
      <Stack.Screen
        name="EditProfile"
        component={EditProfile}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsStack}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}
const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#FFC0CB',
    borderTopWidth: 0,
    elevation: 10,
  },
  tabBarItem: {
    flex: 1,
  },
  tabBarLabel: {
    fontSize: 10,
    fontWeight: '800',
  },
  tabBarButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
