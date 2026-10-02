import React from 'react';
import {AccessibilityInfo, Animated, FlatList, StyleSheet} from 'react-native';
import renderer, {act} from 'react-test-renderer';
import {CommunityTabBarProvider, useCommunityTabBar} from '../app/navigation/CommunityTabBar';
import CommunityBrowseScreen from '../app/screens/community/CommunityBrowseScreen';
import {api} from '../app/utils/api';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({useIsFocused: () => true, useNavigation: () => ({navigate: mockNavigate})}));
jest.mock('@react-navigation/bottom-tabs', () => ({BottomTabBar: 'BottomTabBar'}));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: require('react-native').View,
  useSafeAreaInsets: () => ({bottom: 24}),
}));
jest.mock('../app/utils/api', () => ({api: {get: jest.fn()}}));
jest.mock('react-native-vector-icons/Feather', () => 'Feather');
jest.mock('../app/screens/community/PreviewMarqueeText', () => 'PreviewMarqueeText');
jest.mock('../app/screens/community/CommunityWithdrawRequestAlert', () => 'CommunityWithdrawRequestAlert');
jest.mock('react-native-gesture-handler', () => ({
  GestureHandlerRootView: require('react-native').View,
  GestureDetector: ({children, ...props}: any) => require('react').createElement(require('react-native').View, props, children),
  Gesture: require('react-native-gesture-handler/lib/commonjs/handlers/gestures/gestureObjects').GestureObjects,
  State: require('react-native-gesture-handler/lib/commonjs/State').State,
}));

let tree: renderer.ReactTestRenderer;
let controller: ReturnType<typeof useCommunityTabBar>;
function Probe() { controller = useCommunityTabBar(); return null; }
const list = () => tree.root.findByType(FlatList);
beforeEach(async () => {
  jest.useFakeTimers();
  jest.spyOn(AccessibilityInfo, 'isScreenReaderEnabled').mockResolvedValue(false);
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
  jest.spyOn(Animated, 'timing').mockImplementation((value, config) => ({
    start: () => (value as Animated.Value).setValue(config.toValue as number), stop: jest.fn(), reset: jest.fn(),
  }));
  jest.mocked(api.get).mockResolvedValue({data: [{id: 'community-1', name: 'Test community'}]});
  await act(async () => { tree = renderer.create(<CommunityTabBarProvider><Probe /><CommunityBrowseScreen /></CommunityTabBarProvider>); });
  await act(async () => { jest.advanceTimersByTime(0); });
  await act(async () => { jest.advanceTimersByTime(0); });
});
afterEach(() => {
  act(() => tree.unmount());
  jest.restoreAllMocks();
  jest.clearAllMocks();
  jest.useRealTimers();
});

it('wires real list geometry and scroll handlers into the shared bar controller', () => {
  const clearance = StyleSheet.flatten(list().props.contentContainerStyle).paddingBottom - 24;
  act(() => {
    list().props.onLayout({nativeEvent: {layout: {height: 500}}});
    list().props.onContentSizeChange(300, 450 + clearance);
  });
  act(() => jest.advanceTimersByTime(3000));
  expect(controller.visible).toBe(true);
  act(() => list().props.onContentSizeChange(300, 1000 + clearance));
  act(() => jest.advanceTimersByTime(3000));
  expect(controller.visible).toBe(false);
  const event = (y: number) => ({nativeEvent: {contentOffset: {y}, contentSize: {height: 1000 + clearance}, layoutMeasurement: {height: 500}}});
  act(() => {
    list().props.onScrollBeginDrag(event(50));
    list().props.onScroll(event(30));
  });
  expect(controller.visible).toBe(true);
});

it('keeps floating create access above the bar and preserves community navigation', () => {
  const button = tree.root.findByProps({accessibilityLabel: 'Create community'});
  let floating = button.parent!;
  while (!StyleSheet.flatten(floating.props.style)?.transform) floating = floating.parent!;
  const style = StyleSheet.flatten(floating.props.style);
  expect(style.bottom).toBe(40);
  expect(style.transform[0].translateY).toBe(-49);
  act(() => button.props.onPress());
  expect(mockNavigate).toHaveBeenCalledWith('CommunityCreate');
  const card = list().props.renderItem({item: {id: 'community-1', name: 'Test community'}, index: 0});
  act(() => card.props.onPress());
  expect(mockNavigate).toHaveBeenCalledWith('CommunityHome', {community: {id: 'community-1', name: 'Test community'}});
});

it('reveals at the top through a native gesture simultaneous with scrolling and refresh', () => {
  act(() => {
    list().props.onLayout({nativeEvent: {layout: {height: 500}}});
    list().props.onContentSizeChange(300, 1500);
  });
  act(() => jest.advanceTimersByTime(3000));
  expect(controller.visible).toBe(false);
  const gesture = tree.root.find(node => !!node.props.gesture).props.gesture;
  gesture.prepare();
  const [native, pan] = gesture.toGestureArray();
  expect(pan.config.simultaneousWith).toContain(native);
  expect(pan.config.runOnJS).toBe(true);
  act(() => { pan.handlers.onBegin({}); pan.handlers.onStart({translationY: 13}); });
  expect(controller.visible).toBe(true);
});
