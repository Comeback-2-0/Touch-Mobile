import {CommonActions, createNavigationContainerRef} from '@react-navigation/native';
import type {RootStackParamList} from './RootNavigator';

const createRef = (createNavigationContainerRef as any) || (() => ({isReady: () => false, dispatch: () => undefined}));
export const navigationRef = createRef();

export type CommunityNotificationData = {
  type?: string;
  target?: string;
  communityId?: string;
  contentId?: string;
  commentId?: string;
  requestId?: string;
};

export function navigateFromCommunityNotification(data: CommunityNotificationData) {
  const communityId = data.communityId;
  if (!navigationRef.isReady() || !communityId) return false;
  const target = data.target || (data.contentId ? 'post' : 'community');
  let screen: string = 'CommunityHome';
  let params: Record<string, unknown> = {communityId};
  if (target === 'post' || target === 'comment') {
    if (!data.contentId) return false;
    screen = 'CommunityPost';
    params = {communityId, contentId: data.contentId, commentId: data.commentId, focusComment: target === 'comment'};
  } else if (target === 'join_requests') {
    screen = 'CommunityManage';
    params = {community: {id: communityId, _id: communityId, name: '', description: '', image: '', membersCount: 0}};
  }
  navigationRef.dispatch(CommonActions.navigate({
    name: 'Main',
    params: {
      screen: 'MainTabs',
      params: {screen: 'ChatTab', params: {screen, params}},
    },
  }));
  return true;
}
