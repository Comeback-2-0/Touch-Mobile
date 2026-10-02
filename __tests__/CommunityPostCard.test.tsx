import React from 'react';
import {Animated, LayoutAnimation, Text} from 'react-native';
import renderer, {act} from 'react-test-renderer';
import CommunityPostCard from '../app/screens/community/CommunityPostCard';

jest.mock('react-native-vector-icons/Feather', () => 'Feather');
jest.mock('react-native-video', () => 'Video');

const caption = 'First line stays where it is. '.repeat(12);
let screen: renderer.ReactTestRenderer;
let completions: Array<(result: {finished: boolean}) => void>;
let timing: jest.SpyInstance;

function measure(count: number, lineHeight = 22) {
  const text = screen.root.findAllByType(Text).find(node => node.props.onTextLayout)!;
  act(() => text.props.onTextLayout({nativeEvent: {
    lines: Array.from({length: count}, (_, index) => ({y: index * lineHeight, height: lineHeight, text: `Line ${index}`})),
  }}));
}

function press(label: string) {
  act(() => screen.root.findAll(node => node.props.accessibilityLabel === label && typeof node.props.onPress === 'function')[0].props.onPress());
}

beforeEach(() => {
  jest.useFakeTimers();
  completions = [];
  timing = jest.spyOn(Animated, 'timing').mockImplementation((_value, _config) => ({
    start: callback => { if (callback) completions.push(callback); },
    stop: jest.fn(), reset: jest.fn(),
  }));
  jest.spyOn(LayoutAnimation, 'configureNext');
});

afterEach(() => {
  act(() => screen?.unmount());
  jest.restoreAllMocks();
  jest.useRealTimers();
});

it('reveals the caption by height without a global layout animation or changing the text', () => {
  act(() => { screen = renderer.create(<CommunityPostCard caption={caption} media={{url: 'photo'}} />); });
  measure(6);
  press('Show more caption');
  expect(LayoutAnimation.configureNext).not.toHaveBeenCalled();
  expect(timing).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({
    toValue: 168, duration: 280, useNativeDriver: false,
  }));
  const text = screen.root.findAllByType(Text).find(node => node.props.onTextLayout)!;
  expect(text.props.children).toBe(caption.trim());
  expect(text.props.numberOfLines).toBeUndefined();
});

it('uses measured lines rather than character count to decide whether more is needed', () => {
  act(() => { screen = renderer.create(<CommunityPostCard caption={caption} media={{url: 'photo'}} />); });
  measure(2);
  expect(screen.root.findAllByProps({accessibilityLabel: 'Show more caption'})).toHaveLength(0);
});

it('pauses feed adjustment for expansion and collapse and releases it after animation', () => {
  const onCaptionAnimationChange = jest.fn();
  act(() => { screen = renderer.create(<CommunityPostCard caption={caption} media={{url: 'photo'}} onCaptionAnimationChange={onCaptionAnimationChange} />); });
  measure(6);
  press('Show more caption');
  expect(onCaptionAnimationChange).toHaveBeenLastCalledWith(true);
  act(() => { completions[0]({finished: true}); jest.runOnlyPendingTimers(); });
  expect(onCaptionAnimationChange).toHaveBeenLastCalledWith(false);
  press('Show less');
  expect(timing).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({toValue: 44}));
  expect(onCaptionAnimationChange).toHaveBeenLastCalledWith(true);
});

it('releases the feed if an animating post unmounts', () => {
  const onCaptionAnimationChange = jest.fn();
  act(() => { screen = renderer.create(<CommunityPostCard caption={caption} media={{url: 'photo'}} onCaptionAnimationChange={onCaptionAnimationChange} />); });
  measure(6);
  press('Show more caption');
  act(() => screen.unmount());
  expect(onCaptionAnimationChange).toHaveBeenLastCalledWith(false);
});

it('keeps twelve measured lines for text-only posts, including larger text sizes', () => {
  act(() => { screen = renderer.create(<CommunityPostCard caption={caption} />); });
  measure(15, 34);
  press('Show more caption');
  expect(timing).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({toValue: 546}));
  act(() => { completions[0]({finished: true}); jest.runOnlyPendingTimers(); });
  press('Show less');
  expect(timing).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({toValue: 408}));
});

it('cancels expansion when a post caption changes and releases the feed guard', () => {
  const onCaptionAnimationChange = jest.fn();
  act(() => { screen = renderer.create(<CommunityPostCard caption={caption} media={{url: 'photo'}} onCaptionAnimationChange={onCaptionAnimationChange} />); });
  measure(6);
  press('Show more caption');
  act(() => screen.update(<CommunityPostCard caption="Edited short caption" media={{url: 'photo'}} onCaptionAnimationChange={onCaptionAnimationChange} />));
  expect(onCaptionAnimationChange).toHaveBeenLastCalledWith(false);
  measure(1);
  expect(screen.root.findAllByProps({accessibilityLabel: 'Show more caption'})).toHaveLength(0);
});
