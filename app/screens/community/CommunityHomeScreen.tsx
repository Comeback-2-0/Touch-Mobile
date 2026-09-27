import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {RouteProp, useNavigation, useRoute} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {api} from '../../utils/api';
import {pastelColors} from '../../theme/colors';
import {useAuthStore} from '../../features/profile/store/authStore';
import type {CommunityStackParamList} from '../../navigation/CommunityStack';
import CommunityJoinRequestSheet from './CommunityJoinRequestSheet';
import CommunityPostCard from './CommunityPostCard';
import CommunityConfirmSheet from './CommunityConfirmSheet';
import {useBlockedCommunitiesStore} from './blockedCommunitiesStore';
import {
  communityErrorCopy,
  joinModeLabel,
  leaveConsequenceCopy,
  membersCopy,
  formatRelativeTime,
  showCommunityToast,
  splitRules,
  visibilityLabel,
} from './communityUx';

type Route = RouteProp<CommunityStackParamList, 'CommunityHome'>;
type Navigation = NativeStackNavigationProp<CommunityStackParamList>;
type Post = {
  id: string;
  alias: string;
  text: string;
  score: number;
  comments: unknown[];
  commentsCount?: number;
  unreadCount?: number;
  link?: string;
  media?: {type?: string; url?: string; mimeType?: string} | null;
  state?: string;
  pinned?: boolean;
  publishedAt?: string;
  createdAt?: string;
  upvotes?: number;
  downvotes?: number;
  likes?: number;
  dislikes?: number;
  likedByMe?: boolean;
  dislikedByMe?: boolean;
  reactions?: {totals?: {like?: number}};
};

const FEED_PAGE_SIZE = 20;
type JoinRequest = {
  id: string;
  status: 'pending' | 'approved' | 'declined' | string;
  alias?: string;
  revealUsername?: boolean;
  revealedUsername?: string;
};

function ScreenHeader({title, onBack}: {title: string; onBack: () => void}) {
  return (
    <View style={styles.header}>
      <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={onBack} style={styles.iconButton}>
        <Feather name="arrow-left" size={22} color={pastelColors.auth.deepText} />
      </Pressable>
      <Text numberOfLines={1} ellipsizeMode="tail" style={[styles.head, {flex: 1}]}>
        {title}
      </Text>
      <View style={styles.iconButton} />
    </View>
  );
}

function HeroSkeleton() {
  return (
    <View style={styles.hero}>
      <View style={styles.heroSkeletonAvatar} />
      <View style={[styles.skeletonLine, {width: '55%', marginTop: 14}]} />
      <View style={[styles.skeletonLine, {width: '80%', marginTop: 10}]} />
    </View>
  );
}

export default function CommunityHomeScreen() {
  const navigation = useNavigation<Navigation>();
  const {params} = useRoute<Route>();
  const routeCommunity = params.community;
  const id = routeCommunity?.id || routeCommunity?._id || params.communityId || '';
  const profileUsername = useAuthStore(state => state.profile?.username);
  const userUsername = useAuthStore(state => state.user?.username);
  const username = profileUsername || userUsername || '';

  const [community, setCommunity] = useState<any>(routeCommunity || {id, name: 'Community'});
  const [posts, setPosts] = useState<Post[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [queueCount, setQueueCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [firstUnreadPostId, setFirstUnreadPostId] = useState<string | null>(null);
  const firstUnreadPostRef = useRef<string | null>(null);
  const [membership, setMembership] = useState<any>();
  const [joinRequest, setJoinRequest] = useState<JoinRequest | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [postMenuId, setPostMenuId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [muted, setMuted] = useState(false);
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  const [blockConfirmOpen, setBlockConfirmOpen] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const blockCommunity = useBlockedCommunitiesStore(state => state.block);
  const listRef = useRef<FlatList<Post>>(null);
  const stickToLatestRef = useRef(true);
  const loadingOlderRef = useRef(false);
  const unreadMarkedRef = useRef(false);
  const onViewableItemsChanged = useRef(({viewableItems}: {viewableItems: Array<{item: Post}>}) => {
    const unreadId = firstUnreadPostRef.current;
    if (unreadMarkedRef.current || !unreadId) return;
    const reached = viewableItems.some(entry => entry.item?.id === unreadId);
    if (!reached) return;
    const post = viewableItems.find(entry => entry.item?.id === unreadId)?.item;
    if (!post?.createdAt) return;
    unreadMarkedRef.current = true;
    api.post(`/communities/${id}/read`, {postId: post.id, postCreatedAt: post.createdAt})
      .then(() => {
        setUnreadCount(0);
        setFirstUnreadPostId(null);
      })
      .catch(() => { unreadMarkedRef.current = false; });
  }).current;

  const joined = membership?.status === 'active';
  const manager = ['owner', 'moderator'].includes(membership?.role);
  const pending = joinRequest?.status === 'pending';
  const declined = joinRequest?.status === 'declined';
  useEffect(() => {
    firstUnreadPostRef.current = firstUnreadPostId;
  }, [firstUnreadPostId]);
  useEffect(() => {
    stickToLatestRef.current = true;
    setNextCursor(null);
  }, [id]);

  useEffect(() => {
    if (!firstUnreadPostId || !posts.length) return;
    const index = posts.findIndex(post => post.id === firstUnreadPostId);
    if (index < 0) return;
    requestAnimationFrame(() => {
      listRef.current?.scrollToIndex({index, animated: false, viewPosition: 0.12});
    });
  }, [firstUnreadPostId, posts]);

  const showCommunityInfo = () => {
    Alert.alert(community.name, community.description || 'An anonymous space to speak freely and safely.', [
      ...(String(community.rules || '').trim() ? [{text: `Rules: ${splitRules(community.rules, 12).join(' • ')}`, style: 'default' as const}] : []),
      {text: 'Close', style: 'cancel'},
    ]);
  };

  const scrollToLatest = useCallback((animated = false) => {
    if (!posts.length) return;
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({animated});
    });
  }, [posts.length]);

  const mergeChronological = useCallback((incomingNewestFirst: Post[], mode: 'replace' | 'prepend') => {
    const chronological = [...incomingNewestFirst].reverse();
    if (mode === 'replace') return chronological;
    setPosts(current => {
      const seen = new Set(current.map(post => post.id));
      return [...chronological.filter(post => !seen.has(post.id)), ...current];
    });
    return chronological;
  }, []);

  const loadOlder = useCallback(async () => {
    if (!nextCursor || loadingOlderRef.current) return;
    loadingOlderRef.current = true;
    setLoadingOlder(true);
    try {
      const feed = await api.get<{posts: Post[]; nextCursor?: string | null; unreadCount?: number; firstUnreadPostId?: string | null}>(
        `/communities/${id}/content/feed`,
        {params: {limit: FEED_PAGE_SIZE, before: nextCursor}},
      );
      mergeChronological(feed.data.posts || [], 'prepend');
      setNextCursor(feed.data.nextCursor || null);
    } catch {
      // Keep current page; user can scroll up again.
    } finally {
      loadingOlderRef.current = false;
      setLoadingOlder(false);
    }
  }, [id, mergeChronological, nextCursor]);

  const load = useCallback(
    async ({refresh = false} = {}) => {
      if (refresh) setRefreshing(true);
      else setLoading(true);
      setError('');
      try {
        const info = await api.get(`/communities/${id}`);
        const nextCommunity = info.data.community || routeCommunity || {id, name: 'Community'};
        const m = info.data.membership;
        setCommunity(nextCommunity);
        setMembership(m);
        setJoinRequest(info.data.joinRequest || null);
        setPendingCount(Number(info.data.pendingJoinRequestCount || 0));
        setMuted(Boolean(info.data.muted ?? m?.muted));
        if (nextCommunity?.contentVisibility !== 'members' || m?.status === 'active') {
          const [feed, queue] = await Promise.all([
            api.get<{posts: Post[]; nextCursor?: string | null}>(`/communities/${id}/content/feed`, {
              params: {limit: FEED_PAGE_SIZE},
            }),
            m?.status === 'active'
              ? api.get(`/communities/${id}/content/queue`).catch(() => ({data: {posts: []}}))
              : Promise.resolve({data: {posts: []}}),
          ]);
          setPosts(mergeChronological(feed.data.posts || [], 'replace'));
          setNextCursor(feed.data.nextCursor || null);
          setUnreadCount(Number(feed.data.unreadCount || 0));
          setFirstUnreadPostId(feed.data.firstUnreadPostId || null);
          setQueueCount((queue.data.posts || []).length);
          if (!refresh) stickToLatestRef.current = true;
        } else {
          setPosts([]);
          setNextCursor(null);
          setQueueCount(0);
        }
      } catch (err: any) {
        setError(communityErrorCopy(err, 'Could not load this community.'));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [id, mergeChronological, routeCommunity],
  );

  useEffect(() => {
    load();
  }, [load]);

  const joinOpen = async () => {
    try {
      await api.post(`/communities/${id}/join`);
      showCommunityToast('Joined anonymously');
      await load();
    } catch {
      Alert.alert('Could not join', 'Please try again in a moment.');
    }
  };

  const openJoinFlow = () => {
    if (community?.joinMode === 'approval') {
      setSheetOpen(true);
      return;
    }
    if (community?.joinMode === 'invite-only') {
      navigation.navigate('CommunityInvite', {community});
      return;
    }
    joinOpen();
  };

  const sendRequest = async (payload: {
    useAlias: boolean;
    alias: string;
    revealUsername: boolean;
    username: string;
    note: string;
  }) => {
    setSending(true);
    try {
      const response = await api.post(`/communities/${id}/join`, payload);
      setJoinRequest(response.data.joinRequest || response.data.request || null);
      setSheetOpen(false);
      showCommunityToast('Request sent');
      await load();
    } catch (err: any) {
      Alert.alert(
        'Could not send request',
        err?.response?.data?.error || 'Please try again in a moment.',
      );
    } finally {
      setSending(false);
    }
  };

  const cancelRequest = async () => {
    try {
      await api.delete(`/communities/${id}/join-requests/me`);
      setJoinRequest(null);
      await load();
    } catch {
      Alert.alert('Could not cancel request', 'Please try again.');
    }
  };

  const toggleMute = async () => {
    try {
      const nextMuted = !muted;
      await api.put(`/communities/${id}/mute`, {muted: nextMuted});
      setMuted(nextMuted);
      setOptionsOpen(false);
      showCommunityToast(nextMuted ? 'Community muted.' : 'Notifications on.');
    } catch {
      Alert.alert('Could not update notifications', 'Please try again.');
    }
  };

  const confirmLeave = () => {
    setOptionsOpen(false);
    setLeaveConfirmOpen(true);
  };

  const leaveCommunity = async () => {
    setActionBusy(true);
    try {
      await api.post(`/communities/${id}/leave`);
      setLeaveConfirmOpen(false);
      navigation.goBack();
    } catch {
      Alert.alert('Could not leave community', 'Please try again.');
    } finally {
      setActionBusy(false);
    }
  };

  const blockThisCommunity = async () => {
    setActionBusy(true);
    try {
      await api.put(`/communities/${id}/mute`, {muted: true}).catch(() => undefined);
      await api.post(`/communities/${id}/leave`).catch(() => undefined);
      blockCommunity(id);
      setBlockConfirmOpen(false);
      setOptionsOpen(false);
      showCommunityToast('Community blocked.');
      navigation.navigate('CommunityBrowse');
    } catch {
      Alert.alert('Could not block community', 'Please try again.');
    } finally {
      setActionBusy(false);
    }
  };

  const engagePost = async (postId: string, action: 'like' | 'dislike') => {
    if (!joined) {
      showCommunityToast('Join the community to interact.');
      return;
    }
    try {
      const response = await api.post(`/communities/${id}/content/${postId}/${action}`);
      const next = response.data?.post;
      if (next) setPosts(current => current.map(item => item.id === postId ? {...item, ...next} : item));
    } catch {
      showCommunityToast('Could not update reaction.');
    }
  };

  const primaryJoinLabel = () => {
    if (community?.joinMode === 'approval') return 'Request to join';
    if (community?.joinMode === 'invite-only') return 'Enter invite code';
    return 'Join anonymously';
  };

  const statusBlock = () => {
    if (joined) {
      return (
        <View style={styles.ctaRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Post anonymously"
            onPress={() => navigation.navigate('CommunityCompose', {community})}
            style={styles.button}>
            <Feather name="edit-3" size={16} color={pastelColors.white} />
            <Text style={styles.buttonText}>Post anonymously</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Vote in review queue"
            onPress={() => navigation.navigate('CommunityQueue', {community})}
            style={styles.secondaryButton}>
            <Feather name="list" size={16} color={pastelColors.auth.deepText} />
            <Text style={styles.secondaryButtonText}>Vote in queue</Text>
          </Pressable>
        </View>
      );
    }
    if (pending) {
      return (
        <View style={styles.statusBox}>
          <Text style={styles.statusTitle}>Request sent</Text>
          <Text style={styles.copy}>Admins still need to approve you.</Text>
          <Pressable onPress={cancelRequest} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Cancel request</Text>
          </Pressable>
        </View>
      );
    }
    if (declined) {
      return (
        <View style={styles.statusBox}>
          <Text style={styles.statusTitle}>Declined</Text>
          <Text style={styles.copy}>Your request was not approved this time.</Text>
          <Pressable onPress={() => setSheetOpen(true)} style={styles.button}>
            <Text style={styles.buttonText}>Request again</Text>
          </Pressable>
        </View>
      );
    }
    return (
      <Pressable onPress={openJoinFlow} style={styles.button}>
        <Text style={styles.buttonText}>{primaryJoinLabel()}</Text>
      </Pressable>
    );
  };

  const hero = (
    <View style={styles.hero}>
      {community?.image ? (
        <Image source={{uri: community.image}} style={styles.heroImage} />
      ) : (
        <View style={styles.heroFallback}>
          <Feather name="users" size={28} color={pastelColors.accent} />
        </View>
      )}
      <Text style={styles.heroTitle}>{community.name}</Text>
      <Text style={styles.copy}>
        {community.description || 'An anonymous space to speak freely and safely.'}
      </Text>
      <Text style={styles.members}>{membersCopy(community.membersCount)}</Text>
      <View style={styles.badges}>
        <Text style={styles.badge}>{visibilityLabel(community.contentVisibility)}</Text>
        <Text style={styles.badge}>{joinModeLabel(community.joinMode)}</Text>
        <Text style={styles.badge}>
          {queueCount > 0 ? `${queueCount} in queue` : 'Feed ready'}
        </Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader title={community?.name || 'Community'} onBack={() => navigation.goBack()} />
        <View style={styles.list}>
          <HeroSkeleton />
          <View style={styles.feedSkeleton} />
          <View style={styles.feedSkeleton} />
        </View>
      </SafeAreaView>
    );
  }

  if (error && !community?.name) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader title="Community" onBack={() => navigation.goBack()} />
        <View style={styles.center}>
          <Text style={styles.title}>{error}</Text>
          <Pressable onPress={() => load()} style={styles.button}>
            <Text style={styles.buttonText}>Retry</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (community?.contentVisibility === 'members' && !joined) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader title={community.name} onBack={() => navigation.goBack()} />
        <View style={styles.locked}>
          {hero}
          <View style={styles.lockCard}>
            <Feather name="lock" size={22} color={pastelColors.accent} />
            <Text style={styles.lockTitle}>This space is private</Text>
            <Text style={styles.copy}>
              Join to see posts, rules, and queue activity.
            </Text>
            {!joined ? statusBlock() : null}
          </View>
        </View>
        <CommunityJoinRequestSheet
          visible={sheetOpen}
          username={username}
          submitting={sending}
          onClose={() => setSheetOpen(false)}
          onSubmit={sendRequest}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => navigation.goBack()}
          style={styles.backButton}>
          <Feather name="arrow-left" size={22} color={pastelColors.auth.deepText} />
        </Pressable>
        <Pressable onPress={showCommunityInfo} onLongPress={showCommunityInfo} style={styles.headButton}>
          <Text numberOfLines={1} ellipsizeMode="tail" style={[styles.head, {flex: 1}]}>
            {community.name}
          </Text>
        </Pressable>
        <View style={styles.actions}>
          {!joined && community?.contentVisibility === 'public' && community?.joinMode === 'open' ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Join community"
              onPress={openJoinFlow}
              style={styles.joinHeaderButton}>
              <Text style={styles.joinHeaderText}>Join</Text>
            </Pressable>
          ) : null}
          {joined ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Review queue"
              onPress={() => navigation.navigate('CommunityQueue', {community})}
              style={styles.iconButton}>
              <Feather name="list" size={21} color={pastelColors.auth.deepText} />
            </Pressable>
          ) : null}
          {joined ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Submit post"
              onPress={() => navigation.navigate('CommunityCompose', {community})}
              style={styles.headerAction}>
              <Feather name="plus-square" size={21} color={pastelColors.auth.deepText} />
            </Pressable>
          ) : null}
          {joined ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Community options" onPress={() => setOptionsOpen(true)} style={styles.iconButton}>
              <Feather name="more-vertical" size={22} color={pastelColors.auth.deepText} />
            </Pressable>
          ) : null}
        </View>
      </View>

      <FlatList
        ref={listRef}
        data={posts}
        keyExtractor={p => p.id}
        refreshing={refreshing}
        onRefresh={() => load({refresh: true})}
        contentContainerStyle={posts.length ? styles.list : styles.empty}
        maintainVisibleContentPosition={{minIndexForVisible: 1}}
        onScroll={({nativeEvent}) => {
          if (nativeEvent.contentOffset.y < 80) loadOlder();
        }}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{itemVisiblePercentThreshold: 35}}
        scrollEventThrottle={160}
        onContentSizeChange={() => {
          if (stickToLatestRef.current && posts.length) {
            scrollToLatest(false);
            stickToLatestRef.current = false;
          }
        }}
        onLayout={() => {
          if (stickToLatestRef.current && posts.length) {
            scrollToLatest(false);
          }
        }}
        ListHeaderComponent={
          <View style={styles.about}>
            {unreadCount > 0 && firstUnreadPostId ? (
              <Text style={styles.loadingOlder}>Unread posts · {unreadCount}</Text>
            ) : null}
            {loadingOlder ? (
              <Text style={styles.loadingOlder}>Loading earlier posts...</Text>
            ) : nextCursor ? (
              <Pressable onPress={loadOlder} style={styles.loadOlderButton}>
                <Text style={styles.loadOlderText}>Load earlier posts</Text>
              </Pressable>
            ) : null}
          </View>
        }
        renderItem={({item}) => (
          <Pressable
            style={styles.card}>
            <CommunityPostCard
              compact
              alias={item.alias}
              caption={item.text}
              media={item.media}
              link={item.link}
              timeLabel={item.createdAt ? formatRelativeTime(item.createdAt) : undefined}
              showAvatar={false}
              showAnonymousLabel={false}
              onDoubleTapLike={() => {
                if (!item.likedByMe) engagePost(item.id, 'like');
              }}
              onSingleTap={() => navigation.navigate('CommunityPost', {community, contentId: item.id})}
              onMorePress={() => setPostMenuId(item.id)}
            />
            <View style={styles.feedActions}>
                <Pressable accessibilityRole="button" accessibilityLabel="Like post" onPress={() => engagePost(item.id, 'like')} style={styles.feedAction}>
                <MaterialCommunityIcons name={item.likedByMe ? 'thumb-up' : 'thumb-up-outline'} size={19} color={item.likedByMe ? pastelColors.accent : pastelColors.auth.deepText} />
                <Text style={styles.feedActionText}>{Number(item.likes || 0)}</Text>
                </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel="Dislike post" onPress={() => engagePost(item.id, 'dislike')} style={styles.feedAction}>
                <MaterialCommunityIcons name={item.dislikedByMe ? 'thumb-down' : 'thumb-down-outline'} size={19} color={item.dislikedByMe ? pastelColors.accent : pastelColors.auth.deepText} />
                <Text style={styles.feedActionText}>{Number(item.dislikes || 0)}</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Write a comment"
                onPress={() => {
                  if (!joined) return showCommunityToast('Join the community to interact.');
                  navigation.navigate('CommunityPost', {community, contentId: item.id, focusComment: true});
                }}
                style={styles.commentInput}>
                <Text style={styles.commentPlaceholder}>Write a comment...</Text>
              </Pressable>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.title}>No posts yet. Be the first voice here.</Text>
            <Text style={styles.copy}>
              Submissions start in the review queue before they become public.
            </Text>
            {joined ? (
              <Pressable
                onPress={() => navigation.navigate('CommunityCompose', {community})}
                style={styles.button}>
                <Text style={styles.buttonText}>Post anonymously</Text>
              </Pressable>
            ) : null}
          </View>
        }
      />

      <CommunityJoinRequestSheet
        visible={sheetOpen}
        username={username}
        submitting={sending}
        onClose={() => setSheetOpen(false)}
        onSubmit={sendRequest}
      />

      <Modal visible={Boolean(postMenuId)} transparent animationType="fade" onRequestClose={() => setPostMenuId(null)}>
        <Pressable style={styles.postMenuOverlay} onPress={() => setPostMenuId(null)}>
          <View style={styles.postMenu}>
            <Text style={styles.optionsTitle}>Post options</Text>
            <Pressable style={styles.optionsRow} onPress={() => {
              const reportId = postMenuId;
              setPostMenuId(null);
              if (reportId) api.post(`/communities/${id}/content/${reportId}/report`, {reason: 'other'}).catch(() => undefined);
            }}>
              <Feather name="flag" size={18} color={pastelColors.auth.deepText} />
              <Text style={styles.optionsRowText}>Report post</Text>
            </Pressable>
            <Pressable style={styles.optionsCancel} onPress={() => setPostMenuId(null)}>
              <Text style={styles.optionsCancelText}>Cancel</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      <Modal visible={optionsOpen} transparent animationType="slide" onRequestClose={() => setOptionsOpen(false)}>
        <View style={styles.optionsOverlay}>
          <Pressable style={styles.optionsBackdrop} onPress={() => setOptionsOpen(false)} />
          <View style={styles.optionsSheet}>
            <Text style={styles.optionsTitle}>Community options</Text>
            {manager ? (
              <Pressable onPress={() => { setOptionsOpen(false); navigation.navigate('CommunityManage', {community}); }} style={styles.optionsRow}>
                <Feather name="settings" size={18} color={pastelColors.auth.deepText} />
                <Text style={styles.optionsRowText}>Manage community{pendingCount ? ` (${pendingCount} pending)` : ''}</Text>
              </Pressable>
            ) : null}
            {joined ? (
              <Pressable onPress={() => { setOptionsOpen(false); navigation.navigate('CommunityQueue', {community}); }} style={styles.optionsRow}>
                <Feather name="list" size={18} color={pastelColors.auth.deepText} />
                <Text style={styles.optionsRowText}>Open voting queue{queueCount ? ` (${queueCount})` : ''}</Text>
              </Pressable>
            ) : null}
            <Pressable onPress={toggleMute} style={styles.optionsRow}>
              <Feather name={muted ? 'bell-off' : 'bell'} size={18} color={pastelColors.auth.deepText} />
              <Text style={styles.optionsRowText}>
                Notifications: {muted ? 'Muted' : 'On'}
              </Text>
            </Pressable>
            <Pressable onPress={confirmLeave} style={styles.optionsRow}>
              <Feather name="log-out" size={18} color="#C45C5C" />
              <Text style={[styles.optionsRowText, styles.destructiveText]}>Leave community</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setOptionsOpen(false);
                setBlockConfirmOpen(true);
              }}
              style={styles.optionsRow}>
              <Feather name="slash" size={18} color="#C45C5C" />
              <Text style={[styles.optionsRowText, styles.destructiveText]}>Block this community</Text>
            </Pressable>
            <Pressable onPress={() => setOptionsOpen(false)} style={styles.optionsCancel}>
              <Text style={styles.optionsCancelText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <CommunityConfirmSheet
        visible={leaveConfirmOpen}
        title="Leave community?"
        message={leaveConsequenceCopy(community?.joinMode)}
        confirmLabel="Leave"
        destructive
        busy={actionBusy}
        onConfirm={leaveCommunity}
        onCancel={() => setLeaveConfirmOpen(false)}
      />
      <CommunityConfirmSheet
        visible={blockConfirmOpen}
        title="Block this community?"
        message="We will mute notifications, leave the space, and hide it from your browse list for this session."
        confirmLabel="Block community"
        destructive
        busy={actionBusy}
        onConfirm={blockThisCommunity}
        onCancel={() => setBlockConfirmOpen(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: pastelColors.auth.background},
  header: {
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  head: {flexShrink: 1, minWidth: 0, fontSize: 18, fontWeight: '900', color: pastelColors.auth.deepText},
  headButton: {flex: 1, minWidth: 0, paddingVertical: 8},
  iconButton: {height: 44, width: 44, alignItems: 'center', justifyContent: 'center'},
  joinHeaderButton: {
    minHeight: 36,
    paddingHorizontal: 16,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: pastelColors.accent,
  },
  joinHeaderText: {color: pastelColors.white, fontWeight: '900'},
  backButton: {height: 44, width: 44, alignItems: 'center', justifyContent: 'center', marginLeft: -10},
  actions: {flexDirection: 'row', alignItems: 'center', gap: 2},
  headerAction: {
    position: 'relative',
    minHeight: 44,
    minWidth: 50,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActionText: {
    marginTop: 1,
    fontSize: 10,
    fontWeight: '900',
    color: pastelColors.auth.mutedText,
  },
  badgeDot: {
    position: 'absolute',
    top: -4,
    right: -8,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: pastelColors.accent,
  },
  badgeText: {color: pastelColors.white, fontSize: 10, fontWeight: '900'},
  center: {flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24},
  locked: {flex: 1, padding: 16},
  title: {fontSize: 20, fontWeight: '900', color: pastelColors.auth.deepText, textAlign: 'center'},
  copy: {
    marginTop: 6,
    color: pastelColors.auth.mutedText,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 20,
  },
  button: {
    alignSelf: 'center',
    marginTop: 16,
    minHeight: 44,
    paddingVertical: 11,
    paddingHorizontal: 18,
    borderRadius: 14,
    backgroundColor: pastelColors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  buttonText: {color: pastelColors.white, fontWeight: '900'},
  secondaryButton: {
    alignSelf: 'center',
    marginTop: 12,
    minHeight: 44,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: pastelColors.auth.glassSurface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  secondaryButtonText: {color: pastelColors.auth.deepText, fontWeight: '800'},
  ctaRow: {marginTop: 8, alignItems: 'center'},
  statusBox: {marginTop: 16, alignItems: 'center'},
  statusTitle: {fontSize: 18, fontWeight: '900', color: pastelColors.auth.deepText},
  list: {padding: 16},
  empty: {flexGrow: 1, padding: 16},
  about: {paddingBottom: 8},
  loadingOlder: {
    marginBottom: 10,
    textAlign: 'center',
    color: pastelColors.auth.mutedText,
    fontWeight: '700',
    fontSize: 12,
  },
  loadOlderButton: {
    alignSelf: 'center',
    marginBottom: 12,
    minHeight: 40,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  loadOlderText: {
    color: pastelColors.accent,
    fontWeight: '800',
    fontSize: 13,
  },
  hero: {
    padding: 18,
    borderRadius: 22,
    backgroundColor: pastelColors.white,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(50, 17, 31, 0.04)',
    shadowColor: '#32111F',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: {width: 0, height: 3},
    elevation: 2,
  },
  heroImage: {height: 84, width: 84, borderRadius: 24},
  heroFallback: {
    height: 84,
    width: 84,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: pastelColors.auth.primaryOverlay,
  },
  heroTitle: {
    marginTop: 12,
    fontSize: 24,
    fontWeight: '900',
    color: pastelColors.auth.deepText,
    textAlign: 'center',
  },
  members: {marginTop: 8, color: pastelColors.accent, fontWeight: '800', textAlign: 'center'},
  badges: {marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6},
  badge: {
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: pastelColors.auth.glassSurface,
    color: pastelColors.auth.mutedText,
    fontSize: 11,
    fontWeight: '800',
  },
  lockCard: {
    marginTop: 14,
    padding: 18,
    borderRadius: 18,
    backgroundColor: pastelColors.auth.primaryOverlay,
    alignItems: 'center',
  },
  lockTitle: {marginTop: 8, fontSize: 18, fontWeight: '900', color: pastelColors.auth.deepText},
  privacyNote: {
    marginTop: 14,
    padding: 12,
    borderRadius: 16,
    backgroundColor: pastelColors.auth.glassSurface,
    flexDirection: 'row',
    gap: 8,
  },
  privacyNoteText: {flex: 1, color: pastelColors.auth.mutedText, fontWeight: '700', lineHeight: 18},
  rulesBox: {
    marginTop: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: pastelColors.white,
  },
  rulesTitle: {fontWeight: '900', color: pastelColors.auth.deepText, marginBottom: 6},
  ruleBullet: {marginTop: 4, color: pastelColors.auth.mutedText, fontWeight: '700', lineHeight: 18},
  rulesMore: {marginTop: 10, color: pastelColors.accent, fontWeight: '900'},
  sectionHead: {
    marginTop: 22,
    marginBottom: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  sectionTitle: {fontSize: 18, fontWeight: '900', color: pastelColors.auth.deepText},
  sectionCopy: {marginTop: 2, color: pastelColors.auth.mutedText, fontWeight: '700', fontSize: 12},
  sectionLink: {color: pastelColors.accent, fontWeight: '900'},
  queueHint: {
    marginBottom: 10,
    color: pastelColors.auth.mutedText,
    fontWeight: '600',
    fontSize: 12,
  },
  card: {
    marginBottom: 6,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: pastelColors.white,
    borderWidth: 1,
    borderColor: 'rgba(50, 17, 31, 0.04)',
  },
  feedActions: {
    paddingHorizontal: 14,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 24,
  },
  feedAction: {flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 38},
  feedActionText: {fontWeight: '900', color: pastelColors.auth.deepText, fontSize: 13},
  commentInput: {
    flex: 1,
    minHeight: 36,
    marginLeft: 8,
    paddingHorizontal: 12,
    borderRadius: 18,
    backgroundColor: pastelColors.auth.background,
    justifyContent: 'center',
  },
  commentPlaceholder: {color: pastelColors.auth.mutedText, fontSize: 12},
  feedMeta: {color: pastelColors.auth.mutedText, fontWeight: '700', fontSize: 12},
  meta: {
    paddingHorizontal: 14,
    paddingBottom: 12,
    color: pastelColors.auth.mutedText,
    fontWeight: '700',
  },
  emptyState: {alignItems: 'center', paddingVertical: 24},
  heroSkeletonAvatar: {
    height: 84,
    width: 84,
    borderRadius: 24,
    backgroundColor: pastelColors.auth.glassSurface,
  },
  skeletonLine: {
    height: 12,
    borderRadius: 8,
    backgroundColor: pastelColors.auth.glassSurface,
    alignSelf: 'center',
  },
  feedSkeleton: {
    marginTop: 12,
    height: 120,
    borderRadius: 18,
    backgroundColor: pastelColors.white,
  },
  optionsOverlay: {flex: 1, justifyContent: 'flex-end'},
  postMenuOverlay: {flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.18)'},
  postMenu: {padding: 18, borderTopLeftRadius: 18, borderTopRightRadius: 18, backgroundColor: pastelColors.white},
  optionsBackdrop: {...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(50, 17, 31, 0.28)'},
  optionsSheet: {
    padding: 20,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    backgroundColor: pastelColors.auth.background,
  },
  optionsTitle: {fontSize: 20, fontWeight: '900', color: pastelColors.auth.deepText, marginBottom: 8},
  optionsRow: {
    minHeight: 48,
    marginTop: 8,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: pastelColors.white,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  optionsRowText: {fontWeight: '800', color: pastelColors.auth.deepText},
  destructiveText: {color: '#C45C5C'},
  optionsCancel: {marginTop: 12, minHeight: 44, alignItems: 'center', justifyContent: 'center'},
  optionsCancelText: {fontWeight: '800', color: pastelColors.auth.mutedText},
});
