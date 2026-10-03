import React from 'react';
import {AccessibilityInfo, FlatList} from 'react-native';
import renderer, {act} from 'react-test-renderer';
import CommunityHomeScreen from '../app/screens/community/CommunityHomeScreen';
import CommunityPostCard from '../app/screens/community/CommunityPostCard';
import {api} from '../app/utils/api';

const mockCommunity = {id: 'community-1', name: 'Community', contentVisibility: 'public'};
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({navigate: jest.fn(), goBack: jest.fn()}),
  useRoute: () => ({params: {community: mockCommunity}}),
  useIsFocused: () => true,
}));
jest.mock('react-native-gesture-handler', () => require('../__mocks__/communityRefreshGestures'));
jest.mock('../app/utils/api', () => ({api: {get: jest.fn(), post: jest.fn()}}));
jest.mock('../app/features/profile/store/authStore', () => ({useAuthStore: (select: any) => select({})}));
jest.mock('react-native-vector-icons/Feather', () => 'Feather');
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'MaterialCommunityIcons');
jest.mock('react-native-video', () => 'Video');
jest.mock('react-native-safe-area-context', () => ({SafeAreaView: require('react-native').View}));
jest.mock('../app/screens/community/CommunityJoinRequestSheet', () => 'CommunityJoinRequestSheet');
jest.mock('../app/screens/community/CommunityWithdrawRequestAlert', () => 'CommunityWithdrawRequestAlert');
jest.mock('../app/screens/community/CommunityConfirmSheet', () => 'CommunityConfirmSheet');

let screen: renderer.ReactTestRenderer;
beforeEach(async () => {
  jest.useFakeTimers();
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
  jest.mocked(api.get).mockImplementation(async url => ({data: String(url).endsWith('/content/feed')
    ? {posts: [{id: 'post-1', text: 'Caption', alias: 'Anon'}], nextCursor: 'older'}
    : {community: mockCommunity},
  }) as any);
  await act(async () => { screen = renderer.create(<CommunityHomeScreen />); });
});
afterEach(() => {
  act(() => screen?.unmount());
  jest.restoreAllMocks();
  jest.clearAllMocks();
  jest.useRealTimers();
});

it('pauses anchoring and bottom scroll during expansion, then restores older-post anchoring', () => {
  const list = () => screen.root.findByType(FlatList);
  const scrollToEnd = jest.spyOn(list().instance, 'scrollToEnd').mockImplementation(() => {});
  expect(list().props.maintainVisibleContentPosition).toEqual({minIndexForVisible: 1});
  act(() => screen.root.findByType(CommunityPostCard).props.onCaptionAnimationChange?.(true));
  expect(list().props.maintainVisibleContentPosition).toBeUndefined();
  act(() => {
    list().props.onContentSizeChange(300, 900);
    list().props.onLayout({nativeEvent: {layout: {height: 500}}});
    jest.runOnlyPendingTimers();
  });
  expect(scrollToEnd).not.toHaveBeenCalled();
  act(() => screen.root.findByType(CommunityPostCard).props.onCaptionAnimationChange?.(false));
  expect(list().props.maintainVisibleContentPosition).toEqual({minIndexForVisible: 1});
  act(() => { list().props.onContentSizeChange(300, 900); jest.runOnlyPendingTimers(); });
  expect(scrollToEnd).not.toHaveBeenCalled();
});

it('cancels a queued initial bottom scroll when the reader expands a caption', () => {
  const list = screen.root.findByType(FlatList);
  const scrollToEnd = jest.spyOn(list.instance, 'scrollToEnd').mockImplementation(() => {});
  act(() => list.props.onLayout({nativeEvent: {layout: {height: 500}}}));
  act(() => screen.root.findByType(CommunityPostCard).props.onCaptionAnimationChange?.(true));
  act(() => { jest.runOnlyPendingTimers(); });
  expect(scrollToEnd).not.toHaveBeenCalled();
});

it('defers an older page and its header changes until native anchoring is restored', async () => {
  let finishPage: (value: any) => void = () => {};
  jest.mocked(api.get).mockImplementationOnce(() => new Promise(resolve => { finishPage = resolve; }));
  const list = () => screen.root.findByType(FlatList);
  await act(async () => list().props.onScroll({nativeEvent: {contentOffset: {y: 0}}}));
  const headerText = () => list().props.ListHeaderComponent.props.children
    .filter(Boolean).map((child: React.ReactElement<any>) => child.props.children);
  expect(headerText()).toContain('Loading earlier posts...');
  const changeAnimation = screen.root.findByType(CommunityPostCard).props.onCaptionAnimationChange;
  act(() => changeAnimation(true));
  await act(async () => finishPage({data: {posts: [{id: 'older-post', text: 'Older'}], nextCursor: null}}));
  expect(list().props.data.map((post: any) => post.id)).toEqual(['post-1']);
  expect(headerText()).toContain('Loading earlier posts...');
  act(() => changeAnimation(false));
  expect(list().props.maintainVisibleContentPosition).toEqual({minIndexForVisible: 1});
  expect(list().props.data.map((post: any) => post.id)).toEqual(['older-post', 'post-1']);
});

it('keeps the loading header stationary if an older-page request fails during expansion', async () => {
  let failPage: (error: Error) => void = () => {};
  jest.mocked(api.get).mockImplementationOnce(() => new Promise((_resolve, reject) => { failPage = reject; }));
  const list = () => screen.root.findByType(FlatList);
  const loadingLabel = () => list().props.ListHeaderComponent.props.children[1]?.props.children;
  await act(async () => list().props.onScroll({nativeEvent: {contentOffset: {y: 0}}}));
  const changeAnimation = screen.root.findByType(CommunityPostCard).props.onCaptionAnimationChange;
  act(() => changeAnimation(true));
  await act(async () => failPage(new Error('Offline')));
  expect(loadingLabel()).toBe('Loading earlier posts...');
  act(() => changeAnimation(false));
  expect(list().props.maintainVisibleContentPosition).toEqual({minIndexForVisible: 1});
  expect(list().props.ListHeaderComponent.props.children[1]?.props.children?.props.children).toBe('Load earlier posts');
  expect(list().props.data.map((post: any) => post.id)).toEqual(['post-1']);
});

it('refreshes from the bottom without a native top refresh control and keeps newest posts last', async () => {
  const list = () => screen.root.findByType(FlatList);
  expect(list().props.onRefresh).toBeUndefined();
  jest.mocked(api.get).mockImplementation(async url => ({data: String(url).endsWith('/content/feed')
    ? {posts: [{id: 'new-post', text: 'New'}, {id: 'post-1', text: 'Caption', alias: 'Anon'}]}
    : {community: mockCommunity},
  }) as any);
  await act(async () => list().props.onAccessibilityAction({nativeEvent: {actionName: 'refresh'}}));
  expect(list().props.data.map((post: any) => post.id)).toEqual(['post-1', 'new-post']);
  expect(list().props.scrollEnabled).toBe(false);
});

it('keeps the visible posts when a bottom refresh fails', async () => {
  const list = () => screen.root.findByType(FlatList);
  const originalPosts = list().props.data;
  jest.mocked(api.get).mockRejectedValueOnce(new Error('Offline'));
  await act(async () => list().props.onAccessibilityAction({nativeEvent: {actionName: 'refresh'}}));
  expect(list().props.data).toBe(originalPosts);
  await act(async () => { jest.advanceTimersByTime(500); });
  expect(screen.root.findAllByType('Feather' as any).some(item => item.props.name === 'alert-circle')).toBe(true);
});
