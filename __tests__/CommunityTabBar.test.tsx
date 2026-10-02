import React from 'react';
import {AccessibilityInfo, Animated, AppState, Keyboard} from 'react-native';
import renderer, {act} from 'react-test-renderer';
import {BottomTabBar} from '@react-navigation/bottom-tabs';
import {CommunityTabBar, CommunityTabBarProvider, useCommunityTabBar} from '../app/navigation/CommunityTabBar';
import {useCommunityTabBarScroll} from '../app/navigation/useCommunityTabBarScroll';

let mockFocused = true;
jest.mock('@react-navigation/native', () => ({
  useIsFocused: () => mockFocused,
  getFocusedRouteNameFromRoute: (route: any) => route.state?.routes[route.state.index || 0]?.name || route.params?.screen,
}));
jest.mock('@react-navigation/bottom-tabs', () => ({BottomTabBar: 'BottomTabBar'}));
jest.mock('react-native-safe-area-context', () => ({useSafeAreaInsets: () => ({bottom: 24})}));

let controller: ReturnType<typeof useCommunityTabBar>;
let scroll: ReturnType<typeof useCommunityTabBarScroll>;
let tree: renderer.ReactTestRenderer;
let listeners: Record<string, (value: any) => void>;
function Probe({enabled = true}: {enabled?: boolean}) {
  controller = useCommunityTabBar();
  scroll = useCommunityTabBarScroll({enabled, bottomClearance: 100});
  return null;
}
const event = (y: number) => ({nativeEvent: {contentOffset: {y}, layoutMeasurement: {height: 500}, contentSize: {height: 1000}}} as any);
const measure = (height = 1000) => act(() => {
  scroll.onLayout({nativeEvent: {layout: {height: 500}}} as any);
  scroll.onContentSizeChange(300, height);
});
const advance = (ms: number) => act(() => { jest.advanceTimersByTime(ms); });

beforeEach(async () => {
  jest.useFakeTimers();
  mockFocused = true;
  listeners = {};
  jest.spyOn(AccessibilityInfo, 'isScreenReaderEnabled').mockResolvedValue(false);
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
  for (const source of [AccessibilityInfo, AppState]) {
    jest.spyOn(source, 'addEventListener' as any).mockImplementation(((name: string, fn: any) => {
      listeners[name] = fn;
      return {remove: jest.fn()};
    }) as any);
  }
  jest.spyOn(Keyboard, 'addListener').mockImplementation(((name: string, fn: any) => {
    listeners[name] = fn;
    return {remove: jest.fn()};
  }) as any);
  jest.spyOn(Animated, 'timing').mockImplementation((value, config) => ({
    start: () => (value as Animated.Value).setValue(config.toValue as number), stop: jest.fn(), reset: jest.fn(),
  }));
  await act(async () => { tree = renderer.create(<CommunityTabBarProvider><Probe /></CommunityTabBarProvider>); });
});
afterEach(() => {
  act(() => tree.unmount());
  jest.restoreAllMocks();
  jest.useRealTimers();
});

it('hides at three seconds only after a scrollable list has been measured', () => {
  advance(5000);
  expect(controller.visible).toBe(true);
  measure();
  advance(2999);
  expect(controller.visible).toBe(true);
  advance(1);
  expect(controller.visible).toBe(false);
});

it('excludes clearance padding and keeps short, empty, and error lists visible', () => {
  measure(600);
  advance(5000);
  expect(controller.visible).toBe(true);
  measure(); advance(3000);
  expect(controller.visible).toBe(false);
  act(() => tree.update(<CommunityTabBarProvider><Probe enabled={false} /></CommunityTabBarProvider>));
  expect(controller.visible).toBe(true);
});

it('ignores programmatic scrolls, applies a direction threshold and resets the reveal timer', () => {
  measure();
  act(() => scroll.onScroll(event(100)));
  expect(controller.visible).toBe(true);
  act(() => { scroll.onScrollBeginDrag(event(100)); scroll.onScroll(event(106)); });
  expect(controller.visible).toBe(true);
  act(() => scroll.onScroll(event(113)));
  expect(controller.visible).toBe(false);
  act(() => scroll.onScroll(event(100)));
  expect(controller.visible).toBe(true);
  advance(2000);
  act(() => scroll.onScroll(event(85)));
  advance(2000);
  expect(controller.visible).toBe(true);
  advance(1000);
  expect(controller.visible).toBe(false);
});

it('reveals on a downward finger gesture at the top but ignores overscroll bounce', () => {
  measure(); advance(3000);
  act(() => {
    scroll.onScrollBeginDrag(event(0));
    scroll.onScroll(event(-20));
    scroll.onScroll(event(0));
  });
  expect(controller.visible).toBe(false);
  act(() => {
    scroll.onGestureBegin();
    scroll.onGesturePull(13);
  });
  expect(controller.visible).toBe(true);
});

it('does not treat automatic offsets after an interrupted fling as user scrolling', () => {
  measure();
  act(() => {
    scroll.onScrollBeginDrag(event(100));
    scroll.onScrollEndDrag();
    scroll.onMomentumScrollBegin();
    scroll.onGestureBegin(); // Touch interrupts momentum, which has no end event on Android.
    scroll.onScroll(event(130));
  });
  expect(controller.visible).toBe(true);
});

it('expires momentum authorization when a drag finishes without a fling', () => {
  measure();
  act(() => {
    scroll.onScrollBeginDrag(event(100));
    scroll.onScrollEndDrag();
  });
  advance(150);
  act(() => {
    scroll.onMomentumScrollBegin();
    scroll.onScroll(event(130));
  });
  expect(controller.visible).toBe(true);
});

it('clears timers on blur and starts afresh on returning', () => {
  measure(); advance(2000);
  mockFocused = false;
  act(() => tree.update(<CommunityTabBarProvider><Probe /></CommunityTabBarProvider>));
  advance(5000);
  mockFocused = true;
  act(() => tree.update(<CommunityTabBarProvider><Probe /></CommunityTabBarProvider>));
  expect(controller.visible).toBe(true);
  advance(3000);
  expect(controller.visible).toBe(false);
});

it('restarts after foregrounding and keyboard dismissal', () => {
  measure();
  act(() => listeners.change('background'));
  advance(5000);
  act(() => listeners.change('active'));
  expect(controller.visible).toBe(true);
  advance(3000);
  expect(controller.visible).toBe(false);
  act(() => listeners.keyboardDidShow({}));
  act(() => listeners.keyboardDidHide({}));
  expect(controller.visible).toBe(true);
  advance(3000);
  expect(controller.visible).toBe(false);
});

it('keeps navigation accessible with a screen reader and honors reduced motion', () => {
  measure();
  act(() => listeners.screenReaderChanged(true));
  advance(5000);
  act(() => { scroll.onScrollBeginDrag(event(0)); scroll.onScroll(event(100)); });
  expect(controller.visible).toBe(true);
  act(() => { listeners.reduceMotionChanged(true); listeners.screenReaderChanged(false); });
  advance(3000);
  expect(controller.visible).toBe(false);
  expect(Animated.timing).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({duration: 0, useNativeDriver: true}));
});

function tabProps(name = 'ChatTab', nested?: string, fromLink = false) {
  const route = {
    key: name, name,
    ...(nested ? fromLink ? {params: {screen: nested}} : {state: {index: 0, routes: [{name: nested}]}} : {}),
  };
  return {
    state: {index: 0, routes: [route]},
    descriptors: {[name]: {options: {tabBarHideOnKeyboard: true}}},
    navigation: {}, insets: {bottom: 24, top: 0, left: 0, right: 0},
  } as any;
}
const renderBar = (props = tabProps()) => act(() => {
  tree.update(<CommunityTabBarProvider><Probe /><CommunityTabBar {...props} /></CommunityTabBarProvider>);
});

it.each(['CommunityHome', 'CommunityPost', 'CommunityCompose', 'CommunityCreate', 'CommunityQueue', 'CommunityManage', 'CommunityInvite'])(
  'removes the entire bar on %s and restores it on back', nested => {
    renderBar(tabProps('ChatTab', nested));
    expect(tree.root.findAllByType(BottomTabBar)).toHaveLength(0);
    renderBar(tabProps('ChatTab', 'CommunityBrowse'));
    expect(tree.root.findAllByType(BottomTabBar)).toHaveLength(1);
  },
);

it('hides on an initial notification/deep-link destination before nested state exists', () => {
  renderBar(tabProps('ChatTab', 'CommunityPost', true));
  expect(tree.root.findAllByType(BottomTabBar)).toHaveLength(0);
});

it.each(['Home', 'SearchBar', 'Reels', 'ProfileTab'])('leaves %s visible even after the browse timer expires', name => {
  measure(); advance(3000);
  renderBar(tabProps(name));
  expect(tree.root.findAllByType(BottomTabBar)).toHaveLength(1);
  expect(tree.root.findAllByProps({testID: 'community-tab-bar'})).toHaveLength(0);
  expect(tree.root.findByType(BottomTabBar).props.descriptors[name].options.tabBarHideOnKeyboard).toBe(true);
});

it('uses measured height, removes hidden touch targets, and reverses a running animation', () => {
  renderBar(); measure();
  const wrapper = () => tree.root.findByProps({testID: 'community-tab-bar'});
  act(() => wrapper().props.onLayout({nativeEvent: {layout: {height: 81}}}));
  expect(controller.height).toBe(81);
  advance(3000);
  expect(wrapper().props.pointerEvents).toBe('none');
  expect(wrapper().props.importantForAccessibility).toBe('no-hide-descendants');
  act(() => controller.reveal());
  expect(wrapper().props.pointerEvents).toBe('auto');
  expect(Animated.timing).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({toValue: 1, duration: 220, useNativeDriver: true}));
});

it('restores visibility when a long list becomes short and clears the timer on unmount', () => {
  measure(); advance(3000);
  expect(controller.visible).toBe(false);
  measure(400);
  expect(controller.visible).toBe(true);
  measure();
  expect(jest.getTimerCount()).toBe(1);
  act(() => tree.unmount());
  expect(jest.getTimerCount()).toBe(0);
});
