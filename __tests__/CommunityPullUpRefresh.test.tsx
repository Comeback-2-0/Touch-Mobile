import React from 'react';
import {AccessibilityInfo, Animated, Text} from 'react-native';
import renderer, {act} from 'react-test-renderer';
import {useCommunityPullUpRefresh} from '../app/screens/community/useCommunityPullUpRefresh';

jest.mock('react-native-gesture-handler', () => require('../__mocks__/communityRefreshGestures'));
jest.mock('react-native-vector-icons/Feather', () => 'Feather');

let controller: ReturnType<typeof useCommunityPullUpRefresh>;
let tree: renderer.ReactTestRenderer;
let onRefresh: jest.Mock;
function Probe({enabled = true}: {enabled?: boolean}) {
  controller = useCommunityPullUpRefresh({enabled, onRefresh});
  return controller.indicator;
}
const pan = () => (controller.gesture as any).gestures[1].handlers;
const scroll = (offset: number, content = 1000) => act(() => controller.onScroll({nativeEvent: {
  contentOffset: {y: offset}, layoutMeasurement: {height: 500}, contentSize: {height: content},
}} as any));
const begin = () => act(() => pan().onBegin());
const drag = (translationY: number) => act(() => pan().onUpdate({translationY}));
const release = async (success = true) => act(async () => {
  pan().onEnd({}, success);
  pan().onFinalize();
});
const icon = () => tree.root.findByType('Feather' as any).props.name;
const advance = async (ms: number) => act(async () => jest.advanceTimersByTime(ms));

beforeEach(async () => {
  jest.useFakeTimers();
  onRefresh = jest.fn().mockResolvedValue(true);
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
  jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
  jest.spyOn(Animated, 'timing').mockImplementation((value, config) => ({
    start: callback => { (value as Animated.Value).setValue(config.toValue as number); callback?.({finished: true}); },
    stop: jest.fn(), reset: jest.fn(),
  }));
  jest.spyOn(Animated, 'loop').mockReturnValue({start: jest.fn(), stop: jest.fn(), reset: jest.fn()});
  await act(async () => { tree = renderer.create(<Probe />); });
});
afterEach(() => {
  act(() => tree.unmount());
  jest.restoreAllMocks();
  jest.useRealTimers();
});

it('does not refresh during normal scrolling or a downward drag at the end', async () => {
  scroll(200); begin(); drag(-250); await release();
  expect(controller.active).toBe(false);
  scroll(500); begin(); drag(200); await release();
  expect(onRefresh).not.toHaveBeenCalled();
});

it('only counts the part of a drag after reaching the bottom', async () => {
  scroll(300); begin(); drag(-200);
  scroll(500); drag(-220);
  expect(icon()).toBe('arrow-up');
  await release();
  expect(onRefresh).not.toHaveBeenCalled();
});

it('arms at the threshold, refreshes only on release, and shows icons without text', async () => {
  scroll(500); begin(); drag(-80);
  expect(icon()).toBe('arrow-up');
  drag(-150);
  expect(icon()).toBe('refresh-cw');
  expect(onRefresh).not.toHaveBeenCalled();
  await release();
  expect(onRefresh).toHaveBeenCalledTimes(1);
  begin(); drag(-200); await release();
  expect(onRefresh).toHaveBeenCalledTimes(1);
  await advance(500);
  expect(icon()).toBe('check');
  expect(tree.root.findAllByType(Text)).toHaveLength(0);
  await advance(600);
  expect(controller.active).toBe(false);
});

it('disarms when dragged back below threshold and cancels interrupted gestures', async () => {
  scroll(500); begin(); drag(-160); drag(-50); await release();
  expect(onRefresh).not.toHaveBeenCalled();
  begin(); drag(-180); await release(false);
  expect(onRefresh).not.toHaveBeenCalled();
  begin(); drag(-180); act(() => pan().onFinalize());
  expect(onRefresh).not.toHaveBeenCalled();
});

it('shows an error icon then allows retry, including for short and empty feeds', async () => {
  onRefresh.mockRejectedValueOnce(new Error('Offline'));
  scroll(0, 200); begin(); drag(-160); await release();
  await advance(500);
  expect(icon()).toBe('alert-circle');
  await advance(1000);
  scroll(0, 0); begin(); drag(-160); await release();
  expect(onRefresh).toHaveBeenCalledTimes(2);
});

it('cancels when disabled and ignores a request completing after unmount', async () => {
  scroll(500); begin(); drag(-180);
  act(() => tree.update(<Probe enabled={false} />));
  await release();
  expect(onRefresh).not.toHaveBeenCalled();
  act(() => tree.update(<Probe />));
  let complete!: (value: boolean) => void;
  onRefresh.mockImplementation(() => new Promise(resolve => { complete = resolve; }));
  begin(); drag(-180); await release();
  act(() => tree.unmount());
  jest.mocked(AccessibilityInfo.announceForAccessibility).mockClear();
  await act(async () => complete(true));
  await advance(2000);
  expect(AccessibilityInfo.announceForAccessibility).not.toHaveBeenCalled();
});
