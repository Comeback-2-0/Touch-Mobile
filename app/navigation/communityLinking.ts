import type {LinkingOptions} from '@react-navigation/native';
import type {RootStackParamList} from '../navigation/RootNavigator';

export const COMMUNITY_LINK_PREFIXES = ['touch://', 'https://touch.app', 'https://www.touch.app'];

export function buildCommunityPostDeepLink(communityId: string, contentId: string) {
  const c = encodeURIComponent(String(communityId));
  const p = encodeURIComponent(String(contentId));
  return `touch://community/${c}/post/${p}`;
}

export function buildCommunityPostShareLink(communityId: string, contentId: string) {
  const c = encodeURIComponent(String(communityId));
  const p = encodeURIComponent(String(contentId));
  return `https://touch.app/c/${c}/p/${p}`;
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
    : buildCommunityPostDeepLink(input.communityId, input.contentId);
  if (input.visibility === 'members') {
    return `See this latest post by ${alias} on Touch\n${link}`;
  }
  const excerpt = (input.text || '')
    .trim()
    .split(/\r?\n/)
    .slice(0, 2)
    .join('\n');
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
                  CommunityPost: ':communityId/post/:contentId',
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
