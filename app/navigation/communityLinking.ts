import type {LinkingOptions} from '@react-navigation/native';
import type {RootStackParamList} from '../navigation/RootNavigator';

export const TOUCH_SITE_URL = 'https://app.touch.dophera.tech';
export const COMMUNITY_LINK_PREFIXES = ['touch://', TOUCH_SITE_URL];
export const COMMUNITY_SHARE_EXCERPT_LIMIT = 120;

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

export const communityLinking: LinkingOptions<RootStackParamList> = {
  prefixes: COMMUNITY_LINK_PREFIXES,
  config: {
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
  },
};
