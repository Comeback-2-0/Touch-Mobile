import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  Alert,
  Animated,
  FlatList,
  Image,
  Linking,
  KeyboardAvoidingView,
  LayoutAnimation,
  Modal,
  Pressable,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  UIManager,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {RouteProp, useNavigation, useRoute} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {api} from '../../utils/api';
import {pastelColors} from '../../theme/colors';
import {useAuthStore} from '../../features/profile/store/authStore';
import type {CommunityStackParamList} from '../../navigation/CommunityStack';
import {buildCommunityPostShareMessage, buildWhatsAppShareUrl} from '../../navigation/communityLinking';
import CommunityJoinRequestSheet from './CommunityJoinRequestSheet';
import CommunityPostCard from './CommunityPostCard';
import CommunityConfirmSheet from './CommunityConfirmSheet';
import CommunityWithdrawRequestAlert from './CommunityWithdrawRequestAlert';
import {useBlockedCommunitiesStore} from './blockedCommunitiesStore';
import {
  communityErrorCopy,
  communityCommentCount,
  formatCommunityCount,
  REPORT_CATEGORIES,
  communityJoinHeaderLabel,
  joinModeLabel,
  leaveConsequenceCopy,
  membersCopy,
  formatRelativeTime,
  showCommunityToast,
  splitRules,
  visibilityLabel,
} from './communityUx';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type Route = RouteProp<CommunityStackParamList, 'CommunityHome'>;
type Navigation = NativeStackNavigationProp<CommunityStackParamList>;

function CommunityInfoAlert({
  community,
  visible,
  onClose,
}: {
  community: any;
  visible: boolean;
  onClose: () => void;
}) {
  const avatarScale = React.useRef(new Animated.Value(0.55)).current;
  const avatarLift = React.useRef(new Animated.Value(-28)).current;
  const nameScale = React.useRef(new Animated.Value(0.82)).current;
  const nameLift = React.useRef(new Animated.Value(-16)).current;
  useEffect(() => {
    if (!visible) return;
    avatarScale.setValue(0.55);
    avatarLift.setValue(-28);
    nameScale.setValue(0.82);
    nameLift.setValue(-16);
    Animated.parallel([
      Animated.spring(avatarScale, {toValue: 1, useNativeDriver: true, damping: 16, stiffness: 180}),
      Animated.spring(avatarLift, {toValue: 0, useNativeDriver: true, damping: 16, stiffness: 180}),
      Animated.spring(nameScale, {toValue: 1, useNativeDriver: true, damping: 18, stiffness: 170}),
      Animated.spring(nameLift, {toValue: 0, useNativeDriver: true, damping: 18, stiffness: 170}),
    ]).start();
  }, [avatarLift, avatarScale, nameLift, nameScale, visible]);
  const name = community?.name || 'Community';
  const description = community?.description?.trim() || 'An anonymous place to connect.';
  const members = Number(community?.membersCount || 0);
  const rules = splitRules(community?.rules || '', 12);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.infoOverlay}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close community information"
          style={styles.infoBackdrop}
          onPress={onClose}
        />
        <View style={styles.infoAlert} accessibilityViewIsModal>
          {community?.image ? (
            <Animated.Image source={{uri: community.image}} style={[styles.infoAvatar, {transform: [{translateY: avatarLift}, {scale: avatarScale}]}]} />
          ) : (
            <Animated.View style={[styles.infoAvatar, styles.infoAvatarFallback, {transform: [{translateY: avatarLift}, {scale: avatarScale}]}]}>
              <Text style={styles.infoAvatarText}>{name.slice(0, 1).toUpperCase()}</Text>
            </Animated.View>
          )}
          <Animated.Text style={[styles.infoName, {transform: [{translateY: nameLift}, {scale: nameScale}]}]} maxFontSizeMultiplier={1.25}>
            {name}
          </Animated.Text>
          <View style={styles.infoSectionRow}>
            <Text style={styles.infoSectionLabel}>DESCRIPTION</Text>
            <Text style={styles.infoMembers}>{members} {members === 1 ? 'member' : 'members'}</Text>
          </View>
          <ScrollView
            style={styles.infoScroll}
            contentContainerStyle={styles.infoScrollContent}
            showsVerticalScrollIndicator
            nestedScrollEnabled>
            <View style={styles.infoDescriptionBox}>
              <Text style={styles.infoDescription} maxFontSizeMultiplier={1.35}>
                {description}
              </Text>
            </View>
            <Text style={styles.infoRulesLabel}>RULES</Text>
            {rules.length ? (
              <View style={styles.infoRulesBox}>
                {rules.map((rule, index) => (
                  <Text key={`${index}-${rule}`} style={styles.infoRule} maxFontSizeMultiplier={1.3}>
                    {rule}
                  </Text>
                ))}
              </View>
            ) : (
              <Text style={styles.infoEmptyRules}>No community rules have been added yet.</Text>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
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

function FeedPostSkeleton() {
  return (
    <View style={styles.feedSkeletonCard} accessible accessibilityLabel="Loading community post">
      <View style={styles.feedSkeletonIdentity}>
        <View style={styles.feedSkeletonTextGroup}>
          <View style={[styles.skeletonLine, styles.feedSkeletonAlias]} />
          <View style={[styles.skeletonLine, styles.feedSkeletonMeta]} />
        </View>
        <Feather name="more-vertical" size={19} color={pastelColors.auth.mutedText} />
      </View>
      <View style={styles.feedSkeletonImage} />
      <View style={styles.feedSkeletonCaption}>
        <View style={[styles.skeletonLine, styles.feedSkeletonCaptionLine]} />
        <View style={[styles.skeletonLine, styles.feedSkeletonCaptionLineShort]} />
      </View>
      <View style={styles.feedSkeletonActions}>
        <Feather name="thumbs-up" size={19} color={pastelColors.auth.mutedText} />
        <Feather name="thumbs-down" size={19} color={pastelColors.auth.mutedText} />
        <Feather name="message-square" size={19} color={pastelColors.auth.mutedText} />
        <View style={styles.feedSkeletonComment}>
          <View style={[styles.skeletonLine, styles.feedSkeletonCommentText]} />
        </View>
      </View>
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
  const [communityInfoOpen, setCommunityInfoOpen] = useState(false);
  const [withdrawRequestOpen, setWithdrawRequestOpen] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [postMenuId, setPostMenuId] = useState<string | null>(null);
  const [sharingPost, setSharingPost] = useState(false);
  const [reportPostId, setReportPostId] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('harassment');
  const [reportContext, setReportContext] = useState('');
  const [reportBusy, setReportBusy] = useState(false);
  const [sending, setSending] = useState(false);
  const [muted, setMuted] = useState(false);
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  const [blockConfirmOpen, setBlockConfirmOpen] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [revealingCountKey, setRevealingCountKey] = useState<string | null>(null);
  const countRevealTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const blockCommunity = useBlockedCommunitiesStore(state => state.block);
  const listRef = useRef<FlatList<Post>>(null);
  const stickToLatestRef = useRef(true);
  const captionAnimationsRef = useRef(new Set<string>());
  const scrollAdjustmentVersion = useRef(0);
  const [captionAnimating, setCaptionAnimating] = useState(false);
  const deferredOlderPage = useRef<{posts: Post[]; nextCursor: string | null} | null>(null);
  const prependOlderPosts = useCallback((older: Post[]) => {
    setPosts(current => {
      const seen = new Set(current.map(post => post.id));
      return [...older.filter(post => !seen.has(post.id)), ...current];
    });
  }, []);
  const onCaptionAnimationChange = useCallback((postId: string, active: boolean) => {
    if (active) {
      captionAnimationsRef.current.add(postId);
      scrollAdjustmentVersion.current += 1;
      stickToLatestRef.current = false;
    } else {
      captionAnimationsRef.current.delete(postId);
    }
    setCaptionAnimating(captionAnimationsRef.current.size > 0);
  }, []);

  const shareFeedPost = useCallback(async (post: Post, whatsapp = false) => {
    if (sharingPost) return;
    setPostMenuId(null);
    setSharingPost(true);
    const message = buildCommunityPostShareMessage({
      communityName: community?.name || 'Community',
      alias: post.alias,
      text: post.text,
      communityId: id,
      contentId: post.id,
      visibility: community?.contentVisibility === 'members' ? 'members' : 'public',
    });
    try {
      if (whatsapp) {
        const supported = await Linking.canOpenURL('whatsapp://send');
        if (!supported) {
          showCommunityToast('WhatsApp is not installed.');
          return;
        }
        await Linking.openURL(buildWhatsAppShareUrl(message));
        return;
      }
      await Share.share({message, title: `${community?.name || 'Community'} post`});
    } catch {
      showCommunityToast('Could not share this post. Please try again.');
    } finally {
      setSharingPost(false);
    }
  }, [community, id, sharingPost]);
  useEffect(() => {
    // Restore native anchoring before inserting a page that arrived mid-animation.
    if (!captionAnimating && deferredOlderPage.current) {
      const page = deferredOlderPage.current;
      deferredOlderPage.current = null;
      prependOlderPosts(page.posts);
      setNextCursor(page.nextCursor);
      setLoadingOlder(false);
    }
  }, [captionAnimating, prependOlderPosts]);
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
  const onScrollToIndexFailed = useCallback(
    ({index, averageItemLength}: {index: number; averageItemLength: number}) => {
      if (captionAnimationsRef.current.size || index < 0 || index >= posts.length) return;
      const version = scrollAdjustmentVersion.current;

      // Variable-height posts may not have been measured yet. Move near the
      // target using the measured average, then retry once after rendering.
      listRef.current?.scrollToOffset({
        offset: Math.max(0, averageItemLength * index),
        animated: false,
      });
      setTimeout(() => {
        if (captionAnimationsRef.current.size || version !== scrollAdjustmentVersion.current) return;
        listRef.current?.scrollToIndex({index, animated: false, viewPosition: 0.12});
      }, 100);
    },
    [posts.length],
  );

  useEffect(() => () => {
    if (countRevealTimer.current) clearTimeout(countRevealTimer.current);
  }, []);

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
    const version = scrollAdjustmentVersion.current;
    requestAnimationFrame(() => {
      if (captionAnimationsRef.current.size || version !== scrollAdjustmentVersion.current) return;
      listRef.current?.scrollToIndex({index, animated: false, viewPosition: 0.12});
    });
  }, [firstUnreadPostId, posts]);

  const showCommunityInfo = () => {
    setCommunityInfoOpen(true);
  };

  const scrollToLatest = useCallback((animated = false) => {
    if (!posts.length || captionAnimationsRef.current.size) return;
    const version = scrollAdjustmentVersion.current;
    requestAnimationFrame(() => {
      if (captionAnimationsRef.current.size || version !== scrollAdjustmentVersion.current) return;
      listRef.current?.scrollToEnd({animated});
    });
  }, [posts.length]);

  const mergeChronological = useCallback((incomingNewestFirst: Post[], mode: 'replace' | 'prepend') => {
    const chronological = [...incomingNewestFirst].reverse();
    if (mode === 'replace') return chronological;
    prependOlderPosts(chronological);
    return chronological;
  }, [prependOlderPosts]);

  const loadOlder = useCallback(async () => {
    if (!nextCursor || loadingOlderRef.current || captionAnimationsRef.current.size || deferredOlderPage.current) return;
    loadingOlderRef.current = true;
    setLoadingOlder(true);
    try {
      const feed = await api.get<{posts: Post[]; nextCursor?: string | null; unreadCount?: number; firstUnreadPostId?: string | null}>(
        `/communities/${id}/content/feed`,
        {params: {limit: FEED_PAGE_SIZE, before: nextCursor}},
      );
      if (captionAnimationsRef.current.size) {
        deferredOlderPage.current = {
          posts: [...(feed.data.posts || [])].reverse(), nextCursor: feed.data.nextCursor || null,
        };
      } else {
        mergeChronological(feed.data.posts || [], 'prepend');
        setNextCursor(feed.data.nextCursor || null);
      }
    } catch {
      // Keep current page; user can scroll up again.
      if (captionAnimationsRef.current.size) {
        deferredOlderPage.current = {posts: [], nextCursor};
      }
    } finally {
      loadingOlderRef.current = false;
      if (!deferredOlderPage.current) setLoadingOlder(false);
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

  const confirmCancelRequest = () => {
    setWithdrawRequestOpen(true);
  };

  const confirmAndCancelRequest = async () => {
    setWithdrawRequestOpen(false);
    await cancelRequest();
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
    const previousPost = posts.find(item => item.id === postId);
    if (!previousPost) return;
    const wasLiked = Boolean(previousPost.likedByMe);
    const wasDisliked = Boolean(previousPost.dislikedByMe);
    const optimisticPost: Post = {
      ...previousPost,
      likes: Math.max(0, Number(previousPost.likes || 0) + (action === 'like' ? (wasLiked ? -1 : 1) : (wasLiked ? -1 : 0))),
      dislikes: Math.max(0, Number(previousPost.dislikes || 0) + (action === 'dislike' ? (wasDisliked ? -1 : 1) : (wasDisliked ? -1 : 0))),
      likedByMe: action === 'like' ? !wasLiked : false,
      dislikedByMe: action === 'dislike' ? !wasDisliked : false,
    };
    const countKey = `${postId}:${action}`;
    if (countRevealTimer.current) clearTimeout(countRevealTimer.current);
    setRevealingCountKey(countKey);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setPosts(current => current.map(item => item.id === postId ? optimisticPost : item));
    countRevealTimer.current = setTimeout(() => {
      setRevealingCountKey(current => current === countKey ? null : current);
      countRevealTimer.current = null;
    }, 240);

    try {
      const response = await api.post(`/communities/${id}/content/${postId}/${action}`);
      const next = response.data?.post;
      if (next) {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setPosts(current => current.map(item => item.id === postId ? {...item, ...next} : item));
      }
    } catch {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setPosts(current => current.map(item => item.id === postId ? previousPost : item));
      showCommunityToast('Could not update reaction.');
    }
  };

  const submitReport = async () => {
    if (reportBusy || !reportPostId) return;
    const reportId = reportPostId;
    setReportBusy(true);
    try {
      await api.post(`/communities/${id}/content/${reportId}/report`, {
        reason: reportReason,
        context: reportContext.trim(),
      });
      setReportOpen(false);
      setReportPostId(null);
      setReportContext('');
      showCommunityToast('Thanks. You helped keep this space safer.');
      setBlockConfirmOpen(true);
    } catch (err) {
      Alert.alert('Could not report', communityErrorCopy(err, 'Please try again.'));
    } finally {
      setReportBusy(false);
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
          <Pressable onPress={confirmCancelRequest} style={styles.secondaryButton}>
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

  const feedHeader = (
    <View style={styles.header}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Go back"
        onPress={() => navigation.goBack()}
        android_ripple={{color: pastelColors.auth.primaryOverlay}}
        style={({pressed}) => [styles.backButton, pressed && styles.headerButtonPressed]}>
        <Feather name="arrow-left" size={22} color={pastelColors.auth.deepText} />
      </Pressable>
      <Pressable
        onPress={loading ? undefined : showCommunityInfo}
        onLongPress={loading ? undefined : showCommunityInfo}
        disabled={loading}
        android_ripple={{color: pastelColors.auth.primaryOverlay}}
        style={({pressed}) => [styles.headButton, pressed && styles.headerButtonPressed]}
        accessibilityRole="button"
        accessibilityLabel="Open community information">
        {community?.image ? (
          <Image source={{uri: community.image}} style={styles.headerAvatar} />
        ) : (
          <View style={[styles.headerAvatar, styles.headerAvatarFallback]}>
            <Text style={styles.headerAvatarText}>{String(community?.name || 'C').slice(0, 1).toUpperCase()}</Text>
          </View>
        )}
        <Text numberOfLines={1} ellipsizeMode="tail" style={[styles.head, {flex: 1}]}>
          {community?.name || 'Community'}
        </Text>
      </Pressable>
      <View style={styles.actions}>
        {!loading && !joined && community?.contentVisibility === 'public' && community?.joinMode !== 'invite-only' ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={communityJoinHeaderLabel(community, joinRequest?.status)}
            onPress={pending ? confirmCancelRequest : openJoinFlow}
            disabled={sending}
            android_ripple={{color: 'rgba(255, 255, 255, 0.22)'}}
            style={({pressed}) => [styles.joinHeaderButton, pressed && styles.joinHeaderButtonPressed]}>
            <Text style={styles.joinHeaderText}>{communityJoinHeaderLabel(community, joinRequest?.status)}</Text>
          </Pressable>
        ) : null}
        {joined ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Review queue"
            onPress={() => navigation.navigate('CommunityQueue', {community})}
            android_ripple={{color: pastelColors.auth.primaryOverlay}}
            style={({pressed}) => [styles.iconButton, pressed && styles.headerButtonPressed]}>
            <Feather name="list" size={21} color={pastelColors.auth.deepText} />
          </Pressable>
        ) : null}
        {joined ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Submit post"
            onPress={() => navigation.navigate('CommunityCompose', {community})}
            android_ripple={{color: pastelColors.auth.primaryOverlay}}
            style={({pressed}) => [styles.headerAction, pressed && styles.headerButtonPressed]}>
            <Feather name="plus-square" size={21} color={pastelColors.auth.deepText} />
          </Pressable>
        ) : null}
        {joined ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Community options"
            onPress={() => setOptionsOpen(true)}
            android_ripple={{color: pastelColors.auth.primaryOverlay}}
            style={({pressed}) => [styles.iconButton, pressed && styles.headerButtonPressed]}>
            <Feather name="more-vertical" size={22} color={pastelColors.auth.deepText} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        {feedHeader}
        <View style={styles.list}>
          <FeedPostSkeleton />
          <FeedPostSkeleton />
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
        <CommunityWithdrawRequestAlert
          community={community}
          visible={withdrawRequestOpen}
          onClose={() => setWithdrawRequestOpen(false)}
          onConfirm={confirmAndCancelRequest}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {feedHeader}

      <FlatList
        ref={listRef}
        data={posts}
        keyExtractor={p => p.id}
        refreshing={refreshing}
        onRefresh={() => load({refresh: true})}
        contentContainerStyle={posts.length ? styles.list : styles.empty}
        maintainVisibleContentPosition={captionAnimating ? undefined : {minIndexForVisible: 1}}
        onScroll={({nativeEvent}) => {
          if (nativeEvent.contentOffset.y < 80) loadOlder();
        }}
        onViewableItemsChanged={onViewableItemsChanged}
        onScrollToIndexFailed={onScrollToIndexFailed}
        viewabilityConfig={{itemVisiblePercentThreshold: 35}}
        scrollEventThrottle={160}
        onContentSizeChange={() => {
          if (!captionAnimationsRef.current.size && stickToLatestRef.current && posts.length) {
            scrollToLatest(false);
            stickToLatestRef.current = false;
          }
        }}
        onLayout={() => {
          if (!captionAnimationsRef.current.size && stickToLatestRef.current && posts.length) {
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
              onCaptionAnimationChange={active => onCaptionAnimationChange(item.id, active)}
            />
            <View style={styles.feedActions}>
                <Pressable accessibilityRole="button" accessibilityLabel="Like post" onPress={() => engagePost(item.id, 'like')} style={styles.feedAction}>
                <MaterialCommunityIcons name={item.likedByMe ? 'thumb-up' : 'thumb-up-outline'} size={19} color={item.likedByMe ? pastelColors.accent : pastelColors.auth.deepText} />
                {Number(item.likes || 0) > 0 ? (
                  <Text style={[styles.feedActionText, revealingCountKey === `${item.id}:like` && styles.hiddenCount]}>
                    {formatCommunityCount(Number(item.likes || 0))}
                  </Text>
                ) : null}
                </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel="Dislike post" onPress={() => engagePost(item.id, 'dislike')} style={styles.feedAction}>
                <MaterialCommunityIcons name={item.dislikedByMe ? 'thumb-down' : 'thumb-down-outline'} size={19} color={item.dislikedByMe ? pastelColors.accent : pastelColors.auth.deepText} />
                {Number(item.dislikes || 0) > 0 ? (
                  <Text style={[styles.feedActionText, revealingCountKey === `${item.id}:dislike` && styles.hiddenCount]}>
                    {formatCommunityCount(Number(item.dislikes || 0))}
                  </Text>
                ) : null}
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Comments, ${communityCommentCount(item)}`}
                onPress={() => navigation.navigate('CommunityPost', {community, contentId: item.id})}
                style={styles.feedAction}>
                <MaterialCommunityIcons name="comment-outline" size={19} color={pastelColors.auth.deepText} />
                {communityCommentCount(item) > 0 ? <Text style={styles.feedActionText}>{formatCommunityCount(communityCommentCount(item))}</Text> : null}
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

      <Modal visible={Boolean(postMenuId)} transparent animationType="slide" onRequestClose={() => setPostMenuId(null)}>
        <Pressable style={styles.postMenuOverlay} onPress={() => setPostMenuId(null)}>
          <View style={styles.postMenu}>
            <Text style={styles.optionsTitle}>Post options</Text>
            <Pressable style={({pressed}) => [styles.optionsRow, pressed && styles.optionsRowPressed]} disabled={sharingPost} onPress={() => {
              const post = posts.find(item => item.id === postMenuId);
              if (post) shareFeedPost(post);
            }}>
              {sharingPost ? <ActivityIndicator size="small" color={pastelColors.auth.deepText} /> : <Feather name="share-2" size={18} color={pastelColors.auth.deepText} />}
              <Text style={styles.optionsRowText}>Share</Text>
            </Pressable>
            <Pressable style={({pressed}) => [styles.optionsRow, pressed && styles.optionsRowPressed]} disabled={sharingPost} onPress={() => {
              const post = posts.find(item => item.id === postMenuId);
              if (post) shareFeedPost(post, true);
            }}>
              <FontAwesome name="whatsapp" size={20} color="#25D366" />
              <Text style={styles.optionsRowText}>Share on WhatsApp</Text>
            </Pressable>
            <Pressable style={({pressed}) => [styles.optionsRow, pressed && styles.optionsRowPressed]} disabled={sharingPost} onPress={() => {
              setReportPostId(postMenuId);
              setPostMenuId(null);
              setReportOpen(true);
            }}>
              <Feather name="flag" size={18} color="#C45C5C" />
              <Text style={[styles.optionsRowText, styles.destructiveText]}>Report post</Text>
            </Pressable>
            <Pressable style={({pressed}) => [styles.optionsCancel, pressed && styles.optionsCancelPressed]} onPress={() => setPostMenuId(null)}>
              <Text style={styles.optionsCancelText}>Cancel</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      <Modal visible={reportOpen} transparent animationType="slide" onRequestClose={() => !reportBusy && setReportOpen(false)}>
        <KeyboardAvoidingView style={styles.reportOverlay} behavior="padding">
          <Pressable style={styles.reportBackdrop} onPress={() => !reportBusy && setReportOpen(false)} />
          <View style={styles.reportSheet}>
            <ScrollView keyboardShouldPersistTaps="handled" bounces={false}>
              <Text style={styles.reportTitle}>Report post</Text>
              <Text style={styles.reportCopy}>Tell moderators what feels unsafe.</Text>
              {REPORT_CATEGORIES.map(reason => (
                <Pressable
                  key={reason.value}
                  onPress={() => setReportReason(reason.value)}
                  style={[styles.reportReason, reportReason === reason.value && styles.reportReasonActive]}
                  accessibilityState={{selected: reportReason === reason.value}}>
                  <Text style={[styles.reportReasonText, reportReason === reason.value && styles.reportReasonTextActive]}>
                    {reason.label}
                  </Text>
                </Pressable>
              ))}
              <TextInput
                value={reportContext}
                onChangeText={setReportContext}
                placeholder="Optional context"
                placeholderTextColor={pastelColors.auth.mutedText}
                multiline
                style={styles.reportInput}
              />
              <View style={styles.reportActions}>
                <Pressable onPress={() => setReportOpen(false)} style={styles.cancelButton} disabled={reportBusy}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </Pressable>
                <Pressable onPress={submitReport} style={styles.reportButton} disabled={reportBusy}>
                  <Text style={styles.reportButtonText}>{reportBusy ? 'Sending...' : 'Send report'}</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
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
      <CommunityInfoAlert
        community={community}
        visible={communityInfoOpen}
        onClose={() => setCommunityInfoOpen(false)}
      />
      <CommunityWithdrawRequestAlert
        community={community}
        visible={withdrawRequestOpen}
        onClose={() => setWithdrawRequestOpen(false)}
        onConfirm={confirmAndCancelRequest}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: pastelColors.auth.background},
  infoOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  infoBackdrop: {...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(50, 17, 31, 0.42)'},
  infoAlert: {
    width: '100%',
    maxWidth: 560,
    maxHeight: '86%',
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 22,
    borderRadius: 24,
    backgroundColor: pastelColors.auth.background,
    shadowColor: '#32111F',
    shadowOpacity: 0.2,
    shadowRadius: 18,
    shadowOffset: {width: 0, height: 8},
    elevation: 10,
  },
  infoAvatar: {height: 104, width: 104, borderRadius: 20, alignSelf: 'center'},
  infoAvatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: pastelColors.auth.primaryOverlay,
  },
  infoAvatarText: {fontSize: 32, fontWeight: '900', color: pastelColors.auth.deepText},
  infoName: {
    marginTop: 12,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '900',
    color: pastelColors.auth.deepText,
  },
  infoSectionRow: {
    marginTop: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  infoSectionLabel: {
    fontSize: 11,
    letterSpacing: 1.1,
    fontWeight: '900',
    color: pastelColors.auth.mutedText,
  },
  infoMembers: {color: pastelColors.auth.mutedText, fontSize: 12, fontWeight: '700'},
  infoScroll: {
    maxHeight: 390,
    marginTop: 8,
    borderRadius: 16,
    backgroundColor: 'transparent',
  },
  infoScrollContent: {padding: 16},
  infoDescription: {
    color: pastelColors.auth.deepText,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
  },
  infoDescriptionBox: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: pastelColors.auth.primaryOverlay,
  },
  infoRulesLabel: {
    marginTop: 22,
    marginBottom: 8,
    fontSize: 16,
    fontWeight: '900',
    color: pastelColors.auth.deepText,
  },
  infoRulesBox: {gap: 10, padding: 16, borderRadius: 16, backgroundColor: pastelColors.auth.primaryOverlay},
  infoRule: {color: pastelColors.auth.deepText, fontSize: 15, lineHeight: 22, fontWeight: '600'},
  infoEmptyRules: {color: pastelColors.auth.mutedText, fontWeight: '600'},
  header: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    backgroundColor: pastelColors.card,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  head: {flexShrink: 1, minWidth: 0, fontSize: 18, fontWeight: '900', color: pastelColors.auth.deepText},
  headButton: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAvatar: {width: 34, height: 34, borderRadius: 10, marginRight: 10},
  headerAvatarFallback: {alignItems: 'center', justifyContent: 'center', backgroundColor: pastelColors.auth.primaryOverlay},
  headerAvatarText: {fontWeight: '900', color: pastelColors.auth.deepText},
  headerButtonPressed: {
    backgroundColor: pastelColors.auth.primaryOverlay,
    transform: [{scale: 0.96}],
  },
  iconButton: {height: 44, width: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center'},
  joinHeaderButton: {
    minHeight: 36,
    paddingHorizontal: 16,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: pastelColors.accent,
  },
  joinHeaderButtonPressed: {
    backgroundColor: '#D93670',
    transform: [{scale: 0.97}],
  },
  joinHeaderText: {color: pastelColors.white, fontWeight: '900'},
  backButton: {height: 44, width: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginLeft: -10},
  actions: {flexDirection: 'row', alignItems: 'center', gap: 0},
  headerAction: {
    position: 'relative',
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: 0,
    borderRadius: 10,
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
  list: {paddingVertical: 16, paddingHorizontal: 0},
  empty: {flexGrow: 1, paddingVertical: 16, paddingHorizontal: 0},
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
    paddingLeft: 14,
    paddingRight: 14,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 8,
  },
  feedAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    minHeight: 38,
  },
  feedActionText: {fontWeight: '900', color: pastelColors.auth.deepText, fontSize: 13},
  hiddenCount: {opacity: 0},
  commentInput: {
    flex: 1,
    minHeight: 28,
    marginLeft: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#000',
    backgroundColor: pastelColors.white,
    justifyContent: 'center',
  },
  commentPlaceholder: {color: pastelColors.auth.mutedText, fontSize: 12, lineHeight: 14},
  feedMeta: {color: pastelColors.auth.mutedText, fontWeight: '700', fontSize: 12},
  meta: {
    paddingHorizontal: 14,
    paddingBottom: 12,
    color: pastelColors.auth.mutedText,
    fontWeight: '700',
  },
  emptyState: {alignItems: 'center', paddingVertical: 24},
  skeletonLine: {
    height: 12,
    borderRadius: 8,
    backgroundColor: '#EEDDE4',
  },
  feedSkeletonCard: {
    marginBottom: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(50, 17, 31, 0.04)',
    backgroundColor: pastelColors.white,
    overflow: 'hidden',
  },
  feedSkeletonIdentity: {
    minHeight: 50,
    paddingHorizontal: 14,
    paddingTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  feedSkeletonTextGroup: {flex: 1},
  feedSkeletonAlias: {width: '38%', height: 15},
  feedSkeletonMeta: {width: '18%', height: 10, marginTop: 5},
  feedSkeletonImage: {
    width: '100%',
    aspectRatio: 1,
    maxHeight: 480,
    marginTop: 2,
    backgroundColor: '#F6E8EE',
  },
  feedSkeletonCaption: {
    paddingHorizontal: 14,
    paddingTop: 12,
    gap: 8,
  },
  feedSkeletonCaptionLine: {width: '88%', height: 16},
  feedSkeletonCaptionLineShort: {width: '64%', height: 16},
  feedSkeletonActions: {
    minHeight: 38,
    marginTop: 10,
    paddingHorizontal: 14,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  feedSkeletonComment: {
    flex: 1,
    minHeight: 28,
    marginLeft: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBBBC1',
    justifyContent: 'center',
  },
  feedSkeletonCommentText: {width: '42%', height: 10},
  optionsOverlay: {flex: 1, justifyContent: 'flex-end'},
  reportOverlay: {flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(50, 17, 31, 0.32)'},
  reportBackdrop: {...StyleSheet.absoluteFillObject},
  reportSheet: {
    maxHeight: '92%',
    padding: 18,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    backgroundColor: pastelColors.auth.background,
  },
  reportTitle: {fontSize: 20, fontWeight: '900', color: pastelColors.auth.deepText},
  reportCopy: {marginTop: 4, marginBottom: 10, color: pastelColors.auth.mutedText, fontWeight: '700'},
  reportReason: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    marginTop: 4,
    minHeight: 44,
    justifyContent: 'center',
    backgroundColor: pastelColors.white,
  },
  reportReasonActive: {backgroundColor: pastelColors.auth.deepText},
  reportReasonText: {fontWeight: '800', color: pastelColors.auth.deepText},
  reportReasonTextActive: {color: pastelColors.white},
  reportInput: {
    height: 96,
    minHeight: 80,
    marginTop: 12,
    padding: 12,
    borderRadius: 14,
    textAlignVertical: 'top',
    backgroundColor: pastelColors.white,
    color: pastelColors.auth.deepText,
  },
  reportActions: {marginTop: 14, flexDirection: 'row', justifyContent: 'flex-end', gap: 10},
  cancelButton: {paddingVertical: 10, paddingHorizontal: 14, minHeight: 44, justifyContent: 'center'},
  cancelText: {fontWeight: '900', color: pastelColors.auth.mutedText},
  reportButton: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: pastelColors.accent,
    minHeight: 44,
    justifyContent: 'center',
  },
  reportButtonText: {fontWeight: '900', color: pastelColors.white},
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
  optionsRowPressed: {backgroundColor: '#F1DCE5', transform: [{scale: 0.98}]},
  destructiveText: {color: '#C45C5C'},
  optionsCancel: {marginTop: 12, minHeight: 44, alignItems: 'center', justifyContent: 'center'},
  optionsCancelText: {fontWeight: '800', color: pastelColors.auth.mutedText},
  optionsCancelPressed: {opacity: 0.55},
});
