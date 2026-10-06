import {useSyncExternalStore} from 'react';
import {getStateFromPath as defaultGetStateFromPath} from '@react-navigation/native';
import type {LinkingOptions} from '@react-navigation/native';
import type {RootStackParamList} from '../navigation/RootNavigator';

export const TOUCH_SITE_URL = 'https://app.touch.dophera.tech';
export const COMMUNITY_LINK_PREFIXES = ['touch://', TOUCH_SITE_URL];
export const COMMUNITY_SHARE_EXCERPT_LIMIT = 120;

let pendingDeepLink: string | null = null;
const pendingDeepLinkListeners = new Set<() => void>();

function notifyPendingDeepLinkListeners() {
  pendingDeepLinkListeners.forEach(listener => listener());
}

export function rememberPendingDeepLink(url: string) {
  pendingDeepLink = url;
  notifyPendingDeepLinkListeners();
}

export function consumePendingDeepLink() {
  const url = pendingDeepLink;
  pendingDeepLink = null;
  notifyPendingDeepLinkListeners();
  return url;
}

export function usePendingDeepLink() {
  return useSyncExternalStore(
    listener => {
      pendingDeepLinkListeners.add(listener);
      return () => pendingDeepLinkListeners.delete(listener);
    },
    () => pendingDeepLink,
    () => null,
  );
}

export function buildCommunityPostDeepLink(communityId: string, contentId: string) {
  const c = encodeURIComponent(String(communityId));
  const p = encodeURIComponent(String(contentId));
  return `touch://community/${c}/post/${p}`;
}

export function buildCommunityPostShareLink(communityId: string, contentId: string) {
  const c = encodeURIComponent(String(communityId));
  const p = encodeURIComponent(String(contentId));
  return `${TOUCH_SITE_URL}/c/${c}/p/${p}`;
}

export function buildCommunityHomeDeepLink(communityId: string) {
  const c = encodeURIComponent(String(communityId));
  return `touch://community/${c}`;
}

export function buildPublicPostShareMessage(communityName: string, communityId: string, contentId: string) {
  return buildCommunityPostShareMessage({
    communityName,
    alias: 'anonymous',
    text: '',
    communityId,
    contentId,
    visibility: 'public',
  });
}

type CommunityPostShareInput = {
  communityName: string;
  alias?: string;
  text?: string;
  communityId: string;
  contentId: string;
  visibility: 'public' | 'members';
};

export function buildCommunityPostShareMessage(input: CommunityPostShareInput) {
  const alias = input.alias?.trim() || 'anonymous';
  const link = input.visibility === 'public'
    ? buildCommunityPostShareLink(input.communityId, input.contentId)
    : buildCommunityPostShareLink(input.communityId, input.contentId);
  if (input.visibility === 'members') {
    return `See this latest post by ${alias} on Touch\n${link}`;
  }
  const normalizedText = (input.text || '').trim().replace(/\s+/g, ' ');
  const excerpt = normalizedText.length > COMMUNITY_SHARE_EXCERPT_LIMIT
    ? `${normalizedText.slice(0, COMMUNITY_SHARE_EXCERPT_LIMIT - 1).trimEnd()}…`
    : normalizedText;
  return `${excerpt ? `${excerpt}\n\n` : ''}Read the complete post by ${alias} on Touch\n${link}`;
}

export function buildWhatsAppShareUrl(message: string) {
  return `whatsapp://send?text=${encodeURIComponent(message)}`;
}

const communityLinkingConfig = {
  screens: {
    Auth: 'auth',
    ProfileSetup: 'profile-setup',
    Main: {
      screens: {
        MainTabs: {
          screens: {
            ChatTab: {
              path: 'community',
              screens: {
                CommunityBrowse: '',
                CommunityHome: ':communityId',
                CommunityPost: {
                  path: ':communityId/post/:contentId',
                  alias: [{path: 'c/:communityId/p/:contentId', exact: true}],
                },
                CommunityCreate: 'create',
                CommunityCompose: ':communityId/compose',
                CommunityQueue: ':communityId/queue',
                CommunityManage: ':communityId/manage',
                CommunityInvite: ':communityId/invite',
              },
            },
            Home: 'home',
            SearchBar: 'search',
            Reels: 'reels',
            ProfileTab: 'profile',
          },
        },
      },
    },
  },
};

function findRoute(state: any, name: string): any {
  const route = state?.routes?.find((candidate: any) => candidate.name === name);
  if (route) return route;
  for (const candidate of state?.routes || []) {
    const nested = findRoute(candidate.state, name);
    if (nested) return nested;
  }
  return undefined;
}

function addCommunityHomeToPostState(state: any) {
  const chatTab = findRoute(state, 'ChatTab');
  const communityState = chatTab?.state;
  const routes = communityState?.routes;
  const postIndex = routes?.findIndex((route: any) => route.name === 'CommunityPost');
  const postRoute = postIndex === undefined || postIndex < 0 ? undefined : routes[postIndex];
  const communityId = postRoute?.params?.communityId;
  if (!communityState || !Array.isArray(routes) || !postRoute || !communityId) return state;

  const alreadyHasHome = routes.some(
    (route: any) => route.name === 'CommunityHome' && route.params?.communityId === communityId,
  );
  const alreadyHasBrowse = routes.some((route: any) => route.name === 'CommunityBrowse');
  if (alreadyHasHome && alreadyHasBrowse) return state;

  if (alreadyHasHome && !alreadyHasBrowse) {
    const homeIndex = routes.findIndex(
      (route: any) => route.name === 'CommunityHome' && route.params?.communityId === communityId,
    );
    communityState.routes = [
      ...routes.slice(0, homeIndex),
      {name: 'CommunityBrowse'},
      ...routes.slice(homeIndex),
    ];
    communityState.index = (communityState.index ?? homeIndex) + 1;
    return state;
  }

  communityState.routes = [
    ...routes.slice(0, postIndex),
    {name: 'CommunityBrowse'},
    {name: 'CommunityHome', params: {communityId}},
    ...routes.slice(postIndex),
  ];
  communityState.index = postIndex + 2;
  return state;
}

export function getStateFromPath(path: string, options: any = communityLinkingConfig) {
  return addCommunityHomeToPostState(defaultGetStateFromPath(path, options));
}

export function getNavigationStateFromUrl(url: string) {
  const path = url.startsWith('touch://')
    ? url.slice('touch://'.length)
    : url.startsWith(TOUCH_SITE_URL)
      ? url.slice(TOUCH_SITE_URL.length)
      : url;
  return getStateFromPath(path, communityLinkingConfig);
}

export const communityLinking: LinkingOptions<RootStackParamList> = {
  prefixes: COMMUNITY_LINK_PREFIXES,
  config: communityLinkingConfig,
  getStateFromPath,
};
