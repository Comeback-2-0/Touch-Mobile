/** Shared Community UX helpers - prefer ASCII punctuation to avoid mojibake on some RN builds. */

export const DOT = ' | ';
export const ELLIPSIS = '...';
export const MAX_COMMENT_TEXT = 500;
export const MAX_ALIAS_LENGTH = 24;
export const MIN_ALIAS_LENGTH = 2;

export type JoinMode = 'open' | 'approval' | 'invite-only';
export type ContentVisibility = 'public' | 'members';
export const COMMUNITY_CREATION_JOIN_MODES: JoinMode[] = ['open', 'approval'];
const ALIAS_ADJECTIVES = ['Quiet', 'Kind', 'Brave', 'Gentle', 'Calm', 'Bright', 'Hidden', 'Mellow', 'Curious', 'Silver', 'Warm', 'Clever', 'Soft', 'Steady', 'Lucky', 'Blue'];
const ALIAS_NOUNS = ['Owl', 'Fox', 'Moth', 'Kite', 'Fern', 'Wave', 'Ember', 'Moss', 'Lantern', 'Rain', 'Robin', 'Panda', 'Comet', 'Willow', 'Pebble', 'Dawn'];

export function suggestCommunityAlias() {
  const adjective = ALIAS_ADJECTIVES[Math.floor(Math.random() * ALIAS_ADJECTIVES.length)];
  const noun = ALIAS_NOUNS[Math.floor(Math.random() * ALIAS_NOUNS.length)];
  return `${adjective} ${noun}`;
}

export function progressiveCommentItems<T>(items: T[], expanded: boolean, initialCount = 3) {
  return expanded ? items : items.slice(0, initialCount);
}

export function communityVisitorActions(
  community: {contentVisibility?: string; joinMode?: string},
  membership?: {status?: string} | null,
) {
  const joined = membership?.status === 'active';
  const canRead = community.contentVisibility !== 'members' || joined;
  return {
    canRead,
    canJoin: !joined && community.joinMode !== 'invite-only',
    canInteract: joined,
    showJoinButton: !joined,
    showMemberActions: joined,
    queueVisible: joined,
  };
}

export function joinModeLabel(mode?: string) {
  if (mode === 'approval') return 'Approval';
  if (mode === 'invite-only') return 'Invite';
  return 'Open';
}

export function communityJoinActionLabel(community: {joinMode?: string}) {
  return community.joinMode === 'approval' ? 'Request to join' : 'Join';
}

export function visibilityLabel(visibility?: string) {
  return visibility === 'members' ? 'Members-only' : 'Public';
}

export function membersCopy(count?: number) {
  const n = Math.max(0, Math.floor(Number(count || 0)));
  if (n === 1) return '1 member';
  if (n < 1000) return `${n} members`;
  if (n < 10000) {
    const tenths = Math.floor(n / 100) / 10;
    const label = Number.isInteger(tenths) ? `${tenths}` : tenths.toFixed(1);
    return `${label}k+ members`;
  }
  return `${Math.floor(n / 1000)}k+ members`;
}

export function trendingReason(item: {
  trendingReason?: string;
  trendingScore?: number;
  membersCount?: number;
  createdAt?: string;
}) {
  const serverReason = String(item.trendingReason || '').trim();
  if (serverReason) return serverReason;

  const score = Number(item.trendingScore || 0);
  const members = Number(item.membersCount || 0);
  const created = item.createdAt ? new Date(item.createdAt).getTime() : 0;
  const ageDays = created ? (Date.now() - created) / (1000 * 60 * 60 * 24) : 999;
  if (ageDays < 3) return 'New corner';
  if (score >= 10 || members >= 25) return 'Growing fast';
  if (score > 0) return 'Hot queue';
  return 'Worth a look';
}

export function activityCopy(item: {trendingScore?: number; membersCount?: number}) {
  const score = Number(item.trendingScore || 0);
  if (score > 0) return 'Active today';
  if (Number(item.membersCount || 0) > 0) return 'New posts welcome';
  return 'Quiet for now';
}

export function formatRelativeTime(iso?: string) {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const seconds = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function formatFriendlyTimestamp(iso?: string) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate();
  const time = date.toLocaleTimeString([], {hour: 'numeric', minute: '2-digit'});
  if (sameDay) return `Today, ${time}`;
  if (isYesterday) return `Yesterday, ${time}`;
  return `${date.toLocaleDateString()} ${time}`;
}

export function aliasColor(alias = '') {
  const palette = ['#E8A0BF', '#B8D4E8', '#C9E4C5', '#F2D4A7', '#D4C1EC', '#F5C6AA'];
  let hash = 0;
  for (let i = 0; i < alias.length; i += 1) hash = (hash + alias.charCodeAt(i) * (i + 1)) % 997;
  return palette[hash % palette.length];
}

/** Distinct browse-avatar colors (higher saturation so rows don't look identical). */
export function communityAvatarColor(name = '') {
  const palette = ['#F2A0B8', '#8EC5E8', '#9DD4A8', '#E8C07A', '#C4A8E8', '#E8A88A', '#7DB8C9', '#D4A0C8'];
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = (hash + name.charCodeAt(i) * (i + 3)) % 997;
  return palette[hash % palette.length];
}

export function communityInitial(name = '') {
  const trimmed = String(name || '').trim();
  if (!trimmed) return '?';
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return trimmed.slice(0, 2).toUpperCase();
}

export function browseStatusLine(item: {
  membersCount?: number;
  joinMode?: string;
  contentVisibility?: string;
}) {
  return membersCopy(item.membersCount);
}

export function splitRules(rules?: string, limit = 3) {
  const raw = String(rules || '').trim();
  if (!raw) return [];
  const parts = raw
    .split(/\n+|\u2022|(?:^|\s)[-*]\s+/)
    .map(part => part.trim())
    .filter(Boolean);
  if (parts.length <= 1) {
    const sentences = raw
      .split(/(?<=[.!?])\s+/)
      .map(part => part.trim())
      .filter(Boolean);
    return sentences.slice(0, limit);
  }
  return parts.slice(0, limit);
}

export const COMPOSER_PROMPTS = [
  'Say what you cannot say elsewhere...',
  "What's something you wish someone understood?",
  'Drop a meme that explains your mood.',
  'Ask something you cannot ask publicly.',
  'Share a thought without carrying your name.',
];

export const REPORT_CATEGORIES: Array<{value: string; label: string}> = [
  {value: 'harassment', label: 'Harassment or bullying'},
  {value: 'hate', label: 'Hate or identity attack'},
  {value: 'spam', label: 'Spam/scam'},
  {value: 'self-harm', label: 'Self-harm concern'},
  {value: 'doxxing', label: 'Exposes identity'},
  {value: 'other', label: 'Other'},
];

export function humanReportReason(reason?: string) {
  return REPORT_CATEGORIES.find(item => item.value === reason)?.label || reason || 'Report';
}

export function humanAuditAction(action?: string) {
  const key = String(action || '');
  const map: Record<string, string> = {
    community_created: 'Someone created this community.',
    community_settings_updated: 'Owner updated community settings.',
    join_request_approved: 'A moderator approved a join request.',
    join_request_declined: 'A moderator declined a join request.',
    invite_created: 'An invite code was created.',
    invite_revoked: 'An invite code was revoked.',
    content_remove: 'A post was removed after review.',
    content_restore: 'A post was restored.',
    content_reject: 'A queue post was rejected.',
    content_pinned: 'A post was pinned.',
    content_unpinned: 'A post was unpinned.',
    membership_role_updated: 'A member role was updated.',
    ownership_transfer_requested: 'Ownership transfer was requested.',
    ownership_transfer_accepted: 'Ownership transfer was accepted.',
    member_banned: 'A member was banned from this community.',
    platform_ownership_recovered: 'Platform admin recovered community ownership.',
    platform_suspended: 'Platform admin suspended this community.',
    platform_restored: 'Platform admin restored this community.',
  };
  if (map[key]) return map[key];
  if (key.startsWith('join_request_')) return 'A join request was reviewed.';
  if (key.startsWith('content_')) return 'A moderator updated community content.';
  return key.replaceAll('_', ' ') || 'Community action recorded.';
}

export function auditCategory(action?: string): 'membership' | 'content' | 'ownership' | 'settings' | 'other' {
  const key = String(action || '');
  if (key.includes('join') || key.includes('invite') || key.includes('membership') || key.includes('mute')) {
    return 'membership';
  }
  if (key.includes('content') || key.includes('report') || key.includes('publish')) return 'content';
  if (key.includes('ownership')) return 'ownership';
  if (key.includes('settings') || key.includes('community_') || key.includes('platform')) return 'settings';
  return 'other';
}

export function leaveConsequenceCopy(joinMode?: string) {
  if (joinMode === 'approval' || joinMode === 'invite-only') {
    return 'You may need approval or an invite to return.';
  }
  return 'You can rejoin anytime.';
}

export function communityErrorCopy(err: any, fallback: string) {
  const status = err?.response?.status;
  if (status === 401 || status === 403) return 'Please sign in again.';
  if (!err?.response) return "Can't reach Community right now.";
  return err?.response?.data?.error || fallback;
}

export function showCommunityToast(message: string) {
  // Lazy require keeps this helper usable from pure utility imports in tests.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const RN = require('react-native') as typeof import('react-native');
  if (RN.Platform.OS === 'android') {
    RN.ToastAndroid.show(message, RN.ToastAndroid.SHORT);
    return;
  }
  RN.Alert.alert('', message);
}

export function countThreadComments(comments: Array<{replies?: unknown[]}> = []) {
  return comments.reduce((total, comment) => total + 1 + (comment.replies?.length || 0), 0);
}

export function normalizeAliasKey(alias = '') {
  return String(alias || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

export function aliasesTakenOnPost(
  post: {
    alias?: string;
    comments?: Array<{alias?: string; mine?: boolean; replies?: Array<{alias?: string; mine?: boolean}>}>;
  } = {},
  {exceptMine = true}: {exceptMine?: boolean} = {},
) {
  const taken = new Set<string>();
  const add = (name?: string) => {
    const key = normalizeAliasKey(name);
    if (key) taken.add(key);
  };
  add(post.alias);
  for (const comment of post.comments || []) {
    if (!(exceptMine && comment.mine)) add(comment.alias);
    for (const reply of comment.replies || []) {
      if (!(exceptMine && reply.mine)) add(reply.alias);
    }
  }
  return taken;
}

export function aliasConflictOnPost(name: string, post: Parameters<typeof aliasesTakenOnPost>[0]) {
  const trimmed = String(name || '').trim().replace(/\s+/g, ' ');
  if (!trimmed) return 'Choose a name to comment with.';
  if (trimmed.length < MIN_ALIAS_LENGTH) return `Name needs at least ${MIN_ALIAS_LENGTH} characters.`;
  if (trimmed.length > MAX_ALIAS_LENGTH) return `Name can be ${MAX_ALIAS_LENGTH} characters or fewer.`;
  if (aliasesTakenOnPost(post).has(normalizeAliasKey(trimmed))) {
    return 'That name is already used on this post.';
  }
  return '';
}

export function sortCommentsForThread<T extends {likes?: number; replies?: unknown[]; createdAt?: string}>(
  comments: T[] = [],
  sort: 'time' | 'top' = 'time',
) {
  const copy = [...comments];
  if (sort === 'top') {
    return copy.sort((left, right) => {
      const likeDiff = Number(right.likes || 0) - Number(left.likes || 0);
      if (likeDiff) return likeDiff;
      return (right.replies?.length || 0) - (left.replies?.length || 0);
    });
  }
  return copy.sort((left, right) => {
    const delta = new Date(left.createdAt || 0).getTime() - new Date(right.createdAt || 0).getTime();
    if (delta) return delta;
    return 0;
  });
}
