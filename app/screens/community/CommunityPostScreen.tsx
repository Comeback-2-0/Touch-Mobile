import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {RouteProp, useNavigation, useRoute} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {CommunityStackParamList, CommunitySummary} from '../../navigation/CommunityStack';
import {api} from '../../utils/api';
import {pastelColors} from '../../theme/colors';
import {buildPublicPostShareMessage} from '../../navigation/communityLinking';
import CommunityPostCard from './CommunityPostCard';
import CommunityConfirmSheet from './CommunityConfirmSheet';
import {useBlockedCommunitiesStore} from './blockedCommunitiesStore';
import {useKeyboardHeight} from './communityKeyboard';
import {io, Socket} from 'socket.io-client';
import {API_URL} from '../../utils/api';
import {
  MAX_ALIAS_LENGTH,
  MAX_COMMENT_TEXT,
  REPORT_CATEGORIES,
  aliasConflictOnPost,
  communityErrorCopy,
  countThreadComments,
  formatRelativeTime,
  showCommunityToast,
  sortCommentsForThread,
  progressiveCommentItems,
} from './communityUx';

type Route = RouteProp<CommunityStackParamList, 'CommunityPost'>;
type Navigation = NativeStackNavigationProp<CommunityStackParamList>;

type Engagement = {
  likes?: number;
  dislikes?: number;
  likedByMe?: boolean;
  dislikedByMe?: boolean;
  reportedByMe?: boolean;
  mine?: boolean;
};

type Reply = Engagement & {
  id: string;
  alias: string;
  text: string;
  createdAt?: string;
};

type Comment = Engagement & {
  id: string;
  alias: string;
  text: string;
  createdAt?: string;
  replies: Reply[];
};

const reactionOptions = [
  {value: 'like', label: 'Like', icon: 'thumbs-up'},
  {value: 'dislike', label: 'Dislike', icon: 'thumbs-down'},
] as const;

function mergeThread(previous: any, incoming: any) {
  if (!previous || !incoming) return incoming;
  const incomingComments: Comment[] = incoming.comments || [];
  const byId = new Map(incomingComments.map(comment => [comment.id, comment]));
  const seen = new Set<string>();
  const merged = (previous.comments || []).map((comment: Comment) => {
    const next = byId.get(comment.id);
    if (!next) return comment;
    seen.add(comment.id);
    const replyById = new Map((next.replies || []).map(reply => [reply.id, reply]));
    const replies = (comment.replies || []).map(reply => replyById.get(reply.id) || reply);
    const extra = (next.replies || []).filter(
      reply => !(comment.replies || []).some(item => item.id === reply.id),
    );
    return {...next, replies: [...replies, ...extra]};
  });
  const appended = incomingComments.filter(comment => !seen.has(comment.id));
  return {...incoming, comments: [...merged, ...appended]};
}

function patchEngagement(target: Engagement, action: 'like' | 'dislike'): Engagement {
  if (action === 'like') {
    if (target.likedByMe) {
      return {
        ...target,
        likedByMe: false,
        likes: Math.max(0, Number(target.likes || 0) - 1),
      };
    }
    return {
      ...target,
      likedByMe: true,
      dislikedByMe: false,
      likes: Number(target.likes || 0) + 1,
      dislikes: target.dislikedByMe
        ? Math.max(0, Number(target.dislikes || 0) - 1)
        : Number(target.dislikes || 0),
    };
  }
  if (target.dislikedByMe) {
    return {
      ...target,
      dislikedByMe: false,
      dislikes: Math.max(0, Number(target.dislikes || 0) - 1),
    };
  }
  return {
    ...target,
    dislikedByMe: true,
    likedByMe: false,
    dislikes: Number(target.dislikes || 0) + 1,
    likes: target.likedByMe ? Math.max(0, Number(target.likes || 0) - 1) : Number(target.likes || 0),
  };
}

function AliasChip({alias, time, mine: _mine}: {alias: string; time?: string; mine?: boolean}) {
  return (
    <View style={styles.aliasChip}>
      <View style={{flex: 1}}>
        <View style={styles.aliasRow}>
          <Text style={styles.alias} maxFontSizeMultiplier={1.35}>
            {alias}
          </Text>
        </View>
      </View>
      {time ? (
        <Text style={styles.timeLabel} maxFontSizeMultiplier={1.3}>
          {time}
        </Text>
      ) : null}
    </View>
  );
}

function VoteButton({
  icon,
  count,
  active,
  label,
  onPress,
  reduceMotion,
  compact = false,
}: {
  icon: string;
  count: number;
  active?: boolean;
  label: string;
  onPress: () => void;
  reduceMotion: boolean;
  compact?: boolean;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{selected: Boolean(active)}}
      accessibilityLabel={`${label}${count ? `, ${count}` : ''}`}
      onPress={() => {
        if (!reduceMotion) {
          Animated.sequence([
            Animated.timing(scale, {toValue: 1.18, duration: 90, useNativeDriver: true}),
            Animated.timing(scale, {toValue: 1, duration: 90, useNativeDriver: true}),
          ]).start();
        }
        onPress();
      }}
      style={[styles.voteButton, compact && styles.voteButtonCompact]}>
      <Animated.View style={{transform: [{scale}]}}>
        {icon === 'thumbs-up' || icon === 'thumbs-down' ? (
          <MaterialCommunityIcons
            name={active ? icon === 'thumbs-up' ? 'thumb-up' : 'thumb-down' : icon === 'thumbs-up' ? 'thumb-up-outline' : 'thumb-down-outline'}
          size={compact ? 19 : 24}
            color={active ? pastelColors.accent : pastelColors.auth.mutedText}
          />
        ) : (
          <Feather name={icon} size={compact ? 19 : 24} color={active ? pastelColors.accent : pastelColors.auth.mutedText} />
        )}
      </Animated.View>
      <Text style={[styles.voteCount, compact && styles.voteCountCompact, active && styles.voteCountActive]}>{count}</Text>
    </Pressable>
  );
}

function PulseBlock({
  reduceMotion,
  style,
  children,
}: {
  reduceMotion: boolean;
  style?: any;
  children?: React.ReactNode;
}) {
  const opacity = useRef(new Animated.Value(0.55)).current;
  useEffect(() => {
    if (reduceMotion) return undefined;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {toValue: 1, duration: 700, useNativeDriver: true}),
        Animated.timing(opacity, {toValue: 0.45, duration: 700, useNativeDriver: true}),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity, reduceMotion]);
  return (
    <Animated.View style={[style, {opacity: reduceMotion ? 1 : opacity}]}>
      {children}
    </Animated.View>
  );
}

function PostSkeleton({reduceMotion}: {reduceMotion: boolean}) {
  return (
    <View style={styles.content}>
      <PulseBlock reduceMotion={reduceMotion} style={styles.skeletonCard}>
        <View style={styles.skeletonRow}>
          <View style={styles.skeletonAvatar} />
          <View style={{flex: 1}}>
            <View style={[styles.skeletonLine, {width: '40%'}]} />
            <View style={[styles.skeletonLine, {width: '28%', marginTop: 8}]} />
          </View>
        </View>
        <View style={[styles.skeletonLine, {width: '92%', marginTop: 16}]} />
        <View style={[styles.skeletonLine, {width: '78%', marginTop: 10}]} />
      </PulseBlock>
      <PulseBlock reduceMotion={reduceMotion} style={[styles.skeletonCard, {marginTop: 12, height: 90}]} />
    </View>
  );
}

export default function CommunityPostScreen() {
  const navigation = useNavigation<Navigation>();
  const {params} = useRoute<Route>();
  const contentId = params.contentId;
  const [community, setCommunity] = useState<CommunitySummary | any>(
    params.community || {
      id: params.communityId || '',
      _id: params.communityId || '',
      name: 'Community',
      description: '',
      image: '',
      membersCount: 0,
    },
  );
  const communityId =
    community?.id || community?._id || params.communityId || params.community?.id || '';
  const base = `/communities/${communityId}/content/${contentId}`;
  const isPrivate = community?.contentVisibility === 'members';
  const blockCommunity = useBlockedCommunitiesStore(state => state.block);

  const [post, setPost] = useState<any>();
  const [joined, setJoined] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [comment, setComment] = useState('');
  const [alias, setAlias] = useState('');
  const [aliasEditing, setAliasEditing] = useState(false);
  const [composerFocused, setComposerFocused] = useState(false);
  const [sort, setSort] = useState<'time' | 'top'>('time');
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('harassment');
  const [reportContext, setReportContext] = useState('');
  const [reportTarget, setReportTarget] = useState<{path: string; label: string} | null>(null);
  const [reportBusy, setReportBusy] = useState(false);
  const [replyingTo, setReplyingTo] = useState<{comment: Comment; reply?: Reply} | null>(null);
  const [expandedComments, setExpandedComments] = useState(false);
  const [expandedReplies, setExpandedReplies] = useState<Record<string, boolean>>({});
  const [activeCommentActions, setActiveCommentActions] = useState<string | null>(null);
  const [pressedCommentId, setPressedCommentId] = useState<string | null>(null);
  const [replyTyping, setReplyTyping] = useState(false);
  const [sending, setSending] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [privateShareOpen, setPrivateShareOpen] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [reacting, setReacting] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const socketRef = useRef<Socket | null>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const insertOpacity = useRef(new Animated.Value(1)).current;
  const keyboardHeight = useKeyboardHeight();

  useEffect(() => {
    if (!communityId || !contentId) return;
    const socket = io(API_URL, {transports: ['websocket'], autoConnect: true});
    socketRef.current = socket;
    socket.on('communityReplyTyping', (payload: {contentId?: string; commentId?: string; isTyping?: boolean}) => {
      if (String(payload.contentId) !== String(contentId)) return;
      if (replyingTo?.comment.id !== String(payload.commentId)) return;
      setReplyTyping(Boolean(payload.isTyping));
    });
    return () => {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [communityId, contentId, replyingTo?.comment.id]);

  useEffect(() => {
    const socket = socketRef.current;
    const target = replyingTo?.comment;
    if (!socket || !target || !communityId || !contentId) {
      setReplyTyping(false);
      return;
    }
    const payload = {communityId, contentId, commentId: target.id};
    socket.emit('joinCommunityPostThread', payload);
    return () => {
      socket.emit('leaveCommunityPostThread', payload);
      setReplyTyping(false);
    };
  }, [communityId, contentId, replyingTo?.comment.id]);

  const handleCommentChange = (value: string) => {
    setComment(value);
    const socket = socketRef.current;
    const target = replyingTo?.comment;
    if (!socket || !target || !communityId || !contentId) return;
    const payload = {communityId, contentId, commentId: target.id};
    socket.emit('communityReplyTyping', {...payload, isTyping: Boolean(value.trim())});
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      socket.emit('communityReplyTyping', {...payload, isTyping: false});
    }, 1500);
  };

  useEffect(() => {
    if (!params.focusComment || loading || !post) return;
    const timer = setTimeout(() => inputRef.current?.focus(), 180);
    return () => clearTimeout(timer);
  }, [loading, params.focusComment, post]);

  const load = useCallback(async () => {
    if (!communityId || !contentId) {
      setError('This post is unavailable.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const info = await api.get(`/communities/${communityId}`);
      if (info.data.community) setCommunity(info.data.community);
      setJoined(info.data.membership?.status === 'active');
      const response = await api.get(`${base}`);
      setPost(response.data.post);
      if (response.data.post?.viewerAlias) setAlias(response.data.post.viewerAlias);
    } catch (err: any) {
      setPost(null);
      const status = err?.response?.status;
      setError(
        status === 403
          ? 'Join this community to view the post.'
          : status === 404
            ? 'This post is unavailable.'
            : 'Could not load this post.',
      );
    } finally {
      setLoading(false);
    }
  }, [base, communityId, contentId, params.community]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled?.().then(value => setReduceMotion(Boolean(value)));
    const sub = AccessibilityInfo.addEventListener?.('reduceMotionChanged', setReduceMotion);
    return () => sub?.remove?.();
  }, []);

  const comments: Comment[] = useMemo(
    () => sortCommentsForThread(post?.comments || [], sort),
    [post, sort],
  );
  const visibleComments = progressiveCommentItems(comments, expandedComments);
  const commentCount = Number(post?.commentsCount ?? countThreadComments(comments));
  const aliasConflict = aliasConflictOnPost(alias, post);
  const showAliasBar = composerFocused || Boolean(comment.trim()) || aliasEditing;
  const quoted = replyingTo?.reply || replyingTo?.comment;

  const applyPost = useCallback(
    (incoming: any) => {
      setPost((current: any) => mergeThread(current, incoming));
      if (incoming?.viewerAlias) setAlias(incoming.viewerAlias);
    },
    [],
  );

  const react = async (value: string) => {
    if (!joined) {
      showCommunityToast('Join the community to interact.');
      return;
    }
    if (reacting) return;
    const previous = post?.likedByMe ? 'like' : post?.dislikedByMe ? 'dislike' : '';
    const nextValue = previous === value ? '' : value;
    setReacting(true);
    setPost((current: any) => {
      if (!current) return current;
      return {
        ...current,
        likedByMe: nextValue === 'like',
        dislikedByMe: nextValue === 'dislike',
        likes: Math.max(0, Number(current.likes || 0) + (nextValue === 'like' ? 1 : 0) - (previous === 'like' ? 1 : 0)),
        dislikes: Math.max(0, Number(current.dislikes || 0) + (nextValue === 'dislike' ? 1 : 0) - (previous === 'dislike' ? 1 : 0)),
      };
    });
    try {
      let response;
      try {
        response = await api.post(`${base}/${value}`);
      } catch (requestError: any) {
        if (requestError?.response?.status !== 400) throw requestError;
        response = await api.post(`${base}/react`, {value});
      }
      if (response.data.post) applyPost(response.data.post);
    } catch (err) {
      await load();
      Alert.alert('Could not react', communityErrorCopy(err, 'Join the community or try again.'));
    } finally {
      setReacting(false);
    }
  };

  const sendComment = async () => {
    if (!joined) {
      showCommunityToast('Join the community to interact.');
      return;
    }
    if (!comment.trim() || sending || aliasConflict) return;
    setSending(true);
    try {
      const payload = {text: comment.trim(), alias: alias.trim()};
      const response = replyingTo
        ? await api.post(`${base}/comments/${replyingTo.comment.id}/replies`, payload)
        : await api.post(`${base}/comments`, payload);
      if (response.data.post) {
        applyPost(response.data.post);
        if (!reduceMotion) {
          insertOpacity.setValue(0.35);
          Animated.timing(insertOpacity, {
            toValue: 1,
            duration: 180,
            useNativeDriver: true,
          }).start();
        }
      } else await load();
      setComment('');
      setReplyingTo(null);
      setAliasEditing(false);
    } catch (err: any) {
      Alert.alert('Could not send', communityErrorCopy(err, 'Please try again.'));
    } finally {
      setSending(false);
    }
  };

  const engage = async (item: Comment | Reply, action: 'like' | 'dislike', path: string) => {
    const patched = patchEngagement(item, action);
    setPost((current: any) => {
      if (!current) return current;
      return {
        ...current,
        comments: (current.comments || []).map((commentItem: Comment) => {
          if (commentItem.id === item.id) return {...commentItem, ...patched};
          return {
            ...commentItem,
            replies: (commentItem.replies || []).map((reply: Reply) =>
              reply.id === item.id ? {...reply, ...patched} : reply,
            ),
          };
        }),
      };
    });
    try {
      const response = await api.post(path);
      if (response.data.post) applyPost(response.data.post);
    } catch {
      await load();
      Alert.alert('Could not update', 'Please try again.');
    }
  };

  const submitReport = async () => {
    if (reportBusy) return;
    setReportBusy(true);
    try {
      const path = reportTarget?.path || `${base}/report`;
      const response = await api.post(path, {
        reason: reportReason,
        context: reportContext.trim(),
      });
      if (response.data.post) applyPost(response.data.post);
      setReportOpen(false);
      setReportTarget(null);
      setReportContext('');
      showCommunityToast('Thanks. You helped keep this space safer.');
      if (!reportTarget) setBlockOpen(true);
    } catch (err) {
      Alert.alert('Could not report', communityErrorCopy(err, 'Please try again.'));
    } finally {
      setReportBusy(false);
    }
  };

  const sharePost = async () => {
    setMenuOpen(false);
    if (isPrivate) {
      setPrivateShareOpen(true);
      return;
    }
    await Share.share({
      message: buildPublicPostShareMessage(community.name || 'Community', communityId, contentId),
      title: `${community.name || 'Community'} anonymous post`,
      url: `touch://community/${encodeURIComponent(communityId)}/post/${encodeURIComponent(contentId)}`,
    });
  };

  const blockThisCommunity = async () => {
    setActionBusy(true);
    try {
      await api.put(`/communities/${communityId}/mute`, {muted: true}).catch(() => undefined);
      await api.post(`/communities/${communityId}/leave`).catch(() => undefined);
      blockCommunity(communityId);
      setBlockOpen(false);
      showCommunityToast('Community blocked.');
      navigation.navigate('CommunityBrowse');
    } catch {
      Alert.alert('Could not block community', 'Please try again.');
    } finally {
      setActionBusy(false);
    }
  };

  const startReply = (commentItem: Comment, reply?: Reply) => {
    setReplyingTo({comment: commentItem, reply});
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const openLink = async (url: string) => {
    const href = /^(https?:)?\/\//i.test(url) ? url : `https://${url}`;
    try {
      await Linking.openURL(href);
    } catch {
      Alert.alert('Could not open link', href);
    }
  };

  const selectedReaction = post?.likedByMe ? 'like' : post?.dislikedByMe ? 'dislike' : '';

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => navigation.goBack()}
            style={styles.iconButton}>
            <Feather name="arrow-left" size={22} color={pastelColors.auth.deepText} />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.heading} numberOfLines={1} maxFontSizeMultiplier={1.35}>
              {community?.name || 'Community'}
            </Text>
          </View>
          <View style={styles.iconButton} />
        </View>
        <PostSkeleton reduceMotion={reduceMotion} />
      </SafeAreaView>
    );
  }

  if (!post) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => navigation.goBack()}
            style={styles.iconButton}>
            <Feather name="arrow-left" size={22} color={pastelColors.auth.deepText} />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.heading} numberOfLines={1}>
              {community?.name || 'Community'}
            </Text>
          </View>
          <View style={styles.iconButton} />
        </View>
        <View style={styles.center}>
          <Feather name="alert-circle" size={28} color={pastelColors.accent} />
          <Text style={styles.errorTitle}>{error || 'This post is unavailable.'}</Text>
          <Pressable onPress={load} style={styles.retry}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
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
          style={styles.iconButton}>
          <Feather name="arrow-left" size={22} color={pastelColors.auth.deepText} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.heading} numberOfLines={1} maxFontSizeMultiplier={1.35}>
            {community?.name || 'Community'}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="More post actions"
          style={styles.iconButton}
          onPress={() => setMenuOpen(true)}>
          <Feather name="more-horizontal" size={22} color={pastelColors.auth.deepText} />
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior="padding"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets>
          <CommunityPostCard
            compact
            alias={post.alias}
            caption={post.text}
            media={post.media}
            link={post.link}
            state={post.pinned ? 'Pinned' : post.state === 'removed' ? 'Removed' : undefined}
            timeLabel={formatRelativeTime(post.createdAt)}
            showAvatar={false}
            showAnonymousLabel={false}
            onPressLink={post.link ? () => openLink(post.link) : undefined}
          />

          <View style={styles.reactions}>
            {reactionOptions.map(option => {
              const selected = selectedReaction === option.value;
              const count = option.value === 'like' ? Number(post.likes || 0) : Number(post.dislikes || 0);
              return (
                <VoteButton
                  key={option.value}
                  icon={option.icon}
                  count={count}
                  active={selected}
                  label={option.label}
                  reduceMotion={reduceMotion}
                  onPress={() => react(option.value)}
                />
              );
            })}
          </View>

          <View style={styles.commentsHead}>
            <Text style={styles.comments} maxFontSizeMultiplier={1.35}>
              Comments {commentCount}
            </Text>
            <View style={styles.sortRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{selected: sort === 'time'}}
                onPress={() => setSort('time')}
                style={[styles.sortChip, sort === 'time' && styles.sortChipActive]}>
                <Text style={[styles.sortText, sort === 'time' && styles.sortTextActive]}>Thread</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{selected: sort === 'top'}}
                onPress={() => setSort('top')}
                style={[styles.sortChip, sort === 'top' && styles.sortChipActive]}>
                <Text style={[styles.sortText, sort === 'top' && styles.sortTextActive]}>Top</Text>
              </Pressable>
            </View>
          </View>

          {!comments.length ? (
            <View style={styles.emptyComments}>
              <Feather name="message-circle" size={22} color={pastelColors.accent} />
              <Text style={styles.emptyTitle}>Be the first to comment anonymously</Text>
              <Text style={styles.emptyCopy}>Your name stays on this post unless you change it.</Text>
            </View>
          ) : (
            <Animated.View style={{opacity: insertOpacity}}>
              {visibleComments.map(item => (
                <Pressable
                  style={[styles.comment, pressedCommentId === item.id && styles.commentPressed]}
                  key={item.id}
                  onPressIn={() => setPressedCommentId(item.id)}
                  onPressOut={() => setPressedCommentId(null)}
                  onLongPress={() => setActiveCommentActions(item.id)}
                  delayLongPress={350}>
                  <AliasChip
                    alias={item.alias}
                    mine={item.mine}
                    time={formatRelativeTime(item.createdAt)}
                  />
                  <Text style={styles.commentText} maxFontSizeMultiplier={1.4}>
                    {item.text}
                  </Text>
                  <View style={styles.engagement}>
                    <VoteButton
                      icon="thumbs-up"
                      count={item.likes || 0}
                      active={item.likedByMe}
                      label="Like comment"
                      compact
                      reduceMotion={reduceMotion}
                      onPress={() => engage(item, 'like', `${base}/comments/${item.id}/like`)}
                    />
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Reply to comment"
                      onPress={() => startReply(item)}
                      style={styles.replyAction}>
                      <Text style={styles.replyActionText}>Reply</Text>
                    </Pressable>
                    {activeCommentActions === item.id ? <VoteButton
                      icon="thumbs-down"
                      count={item.dislikes || 0}
                      active={item.dislikedByMe}
                      label="Dislike comment"
                      compact
                      reduceMotion={reduceMotion}
                      onPress={() => engage(item, 'dislike', `${base}/comments/${item.id}/dislike`)}
                    /> : null}
                    {activeCommentActions === item.id ? <>
                    <Pressable
                      onPress={() => {
                        setReportTarget({
                          path: `${base}/comments/${item.id}/report`,
                          label: 'comment',
                        });
                        setReportOpen(true);
                      }}
                      style={styles.moreAction}
                      accessibilityLabel="Report comment">
                      <Feather name="flag" size={22} color={pastelColors.auth.mutedText} />
                    </Pressable>
                    </> : null}
                  </View>

                  {progressiveCommentItems(item.replies || [], Boolean(expandedReplies[item.id]), 2).map(reply => (
                    <View style={styles.reply} key={reply.id}>
                      <AliasChip
                        alias={reply.alias}
                        mine={reply.mine}
                        time={formatRelativeTime(reply.createdAt)}
                      />
                      <Text style={styles.commentText}>{reply.text}</Text>
                      <View style={styles.engagement}>
                        <VoteButton
                          icon="thumbs-up"
                          count={reply.likes || 0}
                          active={reply.likedByMe}
                          label="Like reply"
                          compact
                          reduceMotion={reduceMotion}
                          onPress={() =>
                            engage(reply, 'like', `${base}/comments/${item.id}/replies/${reply.id}/like`)
                          }
                        />
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel="Reply to this reply"
                          onPress={() => startReply(item, reply)}
                          style={styles.replyAction}>
                          <Text style={styles.replyActionText}>Reply</Text>
                        </Pressable>
                        {activeCommentActions === reply.id ? <VoteButton
                          icon="thumbs-down"
                          count={reply.dislikes || 0}
                          active={reply.dislikedByMe}
                          label="Dislike reply"
                          compact
                          reduceMotion={reduceMotion}
                          onPress={() =>
                            engage(
                              reply,
                              'dislike',
                              `${base}/comments/${item.id}/replies/${reply.id}/dislike`,
                            )
                          }
                        /> : null}
                        {activeCommentActions === reply.id ? <>
                        <Pressable
                          onPress={() => {
                            setReportTarget({
                              path: `${base}/comments/${item.id}/replies/${reply.id}/report`,
                              label: 'reply',
                            });
                            setReportOpen(true);
                          }}
                          style={styles.moreAction}
                          accessibilityLabel="Report reply">
                          <Feather name="flag" size={22} color={pastelColors.auth.mutedText} />
                        </Pressable>
                        </> : null}
                      </View>
                    </View>
                  ))}

                  {(item.replies || []).length > 2 ? (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => setExpandedReplies(current => ({...current, [item.id]: !current[item.id]}))}
                      style={styles.showRepliesButton}>
                      <Text style={styles.showRepliesText}>
                        {expandedReplies[item.id] ? 'Hide replies' : `View ${(item.replies || []).length} replies`}
                      </Text>
                    </Pressable>
                  ) : null}

                  {replyingTo?.comment.id === item.id ? (
                    <View style={styles.quotedReply}>
                      <Text style={styles.quotedLabel}>
                        Replying to {quoted?.alias}
                      </Text>
                      <Text style={styles.quotedText} numberOfLines={2}>
                        {quoted?.text}
                      </Text>
                    </View>
                  ) : null}
                </Pressable>
              ))}
              {comments.length > 3 ? (
                <Pressable onPress={() => setExpandedComments(current => !current)} style={styles.showRepliesButton}>
                  <Text style={styles.showRepliesText}>
                    {expandedComments ? 'Show fewer comments' : `Show ${comments.length - 3} more comments`}
                  </Text>
                </Pressable>
              ) : null}
            </Animated.View>
          )}
        </ScrollView>

        <View style={styles.composerDock}>
          {showAliasBar ? (
            <View style={styles.aliasBar}>
              {aliasEditing ? (
                <View style={styles.aliasEditRow}>
                  <TextInput
                    value={alias}
                    onChangeText={setAlias}
                    autoFocus
                    maxLength={MAX_ALIAS_LENGTH}
                    placeholder="Choose a name"
                    placeholderTextColor={pastelColors.auth.mutedText}
                    style={styles.aliasInput}
                  />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Done editing name"
                    onPress={() => !aliasConflict && setAliasEditing(false)}
                    style={styles.aliasDone}>
                    <Text style={styles.aliasDoneText}>Use</Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Commenting as ${alias}. Edit name`}
                  onPress={() => setAliasEditing(true)}
                  style={styles.aliasTap}>
                  <Text style={styles.aliasBarText}>
                    Commenting as {alias || 'anonymous'}
                  </Text>
                  <Feather name="edit-2" size={16} color={pastelColors.accent} />
                </Pressable>
              )}
              {aliasConflict ? <Text style={styles.aliasError}>{aliasConflict}</Text> : null}
            </View>
          ) : null}

          {replyingTo ? (
            <View style={styles.replying}>
              <Text style={styles.replyingText} numberOfLines={1}>
                Replying to {quoted?.alias}
              </Text>
              <Pressable onPress={() => setReplyingTo(null)} accessibilityLabel="Cancel reply">
                <Text style={styles.actionActive}>Cancel</Text>
              </Pressable>
            </View>
          ) : null}
          {replyTyping ? <Text style={styles.typingIndicator}>Someone is typing a reply…</Text> : null}

          <View style={styles.composer}>
            <TextInput
              ref={inputRef}
              value={comment}
              onChangeText={handleCommentChange}
              onFocus={() => setComposerFocused(true)}
              onBlur={() => setComposerFocused(false)}
              placeholder={
                replyingTo ? 'Write a reply anonymously' : 'Write a comment, anonymously'
              }
              placeholderTextColor={pastelColors.auth.mutedText}
              style={styles.input}
              multiline
              scrollEnabled
              maxLength={MAX_COMMENT_TEXT}
              maxFontSizeMultiplier={1.4}
            />
            <Text
              testID="comment-character-counter"
              style={styles.counter}
              accessibilityLabel={`${comment.length} of ${MAX_COMMENT_TEXT} characters`}>
              {comment.length}/{MAX_COMMENT_TEXT}
            </Text>
            <View style={styles.composerMeta}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Send comment"
                accessibilityState={{disabled: sending || !comment.trim() || Boolean(aliasConflict)}}
                onPress={sendComment}
                disabled={sending || !comment.trim() || Boolean(aliasConflict)}
                style={styles.sendButton}>
                {sending ? (
                  <ActivityIndicator size="small" color={pastelColors.accent} />
                ) : (
                  <Feather
                    name="send"
                    size={21}
                    color={
                      comment.trim() && !aliasConflict
                        ? pastelColors.accent
                        : pastelColors.auth.mutedText
                    }
                  />
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>

      <Modal visible={reportOpen} transparent animationType="slide" onRequestClose={() => setReportOpen(false)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior="padding">
          <Pressable style={styles.modalDismiss} onPress={() => !reportBusy && setReportOpen(false)} />
          <View style={[styles.reportSheet, {paddingBottom: 18 + keyboardHeight}]}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            bounces={false}>
            <Text style={styles.reportTitle}>Report {reportTarget?.label || 'post'}</Text>
            <Text style={styles.reportCopy}>Tell moderators what feels unsafe.</Text>
            {REPORT_CATEGORIES.map(reason => (
              <Pressable
                key={reason.value}
                onPress={() => setReportReason(reason.value)}
                style={[styles.reason, reportReason === reason.value && styles.reasonActive]}
                accessibilityState={{selected: reportReason === reason.value}}>
                <Text
                  style={[
                    styles.reasonText,
                    reportReason === reason.value && styles.reasonTextActive,
                  ]}>
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
              scrollEnabled
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

      <Modal visible={menuOpen} transparent animationType="slide" onRequestClose={() => setMenuOpen(false)}>
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalDismiss} onPress={() => setMenuOpen(false)} />
          <View style={styles.reportSheet}>
            <Text style={styles.reportTitle}>Post</Text>
            <Pressable onPress={sharePost} style={styles.reason} accessibilityLabel="Share post">
              <Text style={styles.reasonText}>
                {isPrivate ? 'Sharing unavailable for private posts' : 'Share'}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setMenuOpen(false);
                setReportTarget(null);
                setReportOpen(true);
              }}
              style={styles.reason}>
              <Text style={styles.reasonText}>Report post</Text>
            </Pressable>
            <Pressable onPress={() => setMenuOpen(false)} style={styles.cancelButton}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <CommunityConfirmSheet
        visible={privateShareOpen}
        title="Private post"
        message="Private posts can only be viewed by active members."
        confirmLabel="OK"
        onConfirm={() => setPrivateShareOpen(false)}
        onCancel={() => setPrivateShareOpen(false)}
      />
      <CommunityConfirmSheet
        visible={blockOpen}
        title="Feel unsafe here?"
        message="You can mute notifications, leave, and block this community so it stays out of your way."
        confirmLabel="Block this community"
        cancelLabel="Not now"
        destructive
        busy={actionBusy}
        onConfirm={blockThisCommunity}
        onCancel={() => setBlockOpen(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: pastelColors.auth.background},
  flex: {flex: 1},
  header: {
    paddingHorizontal: 4,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerCopy: {flex: 1, minWidth: 0},
  heading: {fontWeight: '900', fontSize: 17, color: pastelColors.auth.deepText},
  headingMeta: {marginTop: 1, fontSize: 12, fontWeight: '800', color: pastelColors.auth.mutedText},
  iconButton: {height: 44, width: 44, alignItems: 'center', justifyContent: 'center'},
  content: {paddingHorizontal: 12, paddingTop: 4, paddingBottom: 18},
  center: {flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24},
  errorTitle: {
    marginTop: 12,
    color: pastelColors.auth.deepText,
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
  },
  retry: {
    marginTop: 16,
    minHeight: 44,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: pastelColors.accent,
  },
  retryText: {color: pastelColors.white, fontWeight: '900'},
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(50, 17, 31, 0.32)',
  },
  modalDismiss: {...StyleSheet.absoluteFillObject},
  reportSheet: {
    maxHeight: '92%',
    padding: 18,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    backgroundColor: pastelColors.auth.background,
  },
  reportTitle: {fontSize: 20, fontWeight: '900', color: pastelColors.auth.deepText},
  reportCopy: {marginTop: 4, marginBottom: 10, color: pastelColors.auth.mutedText, fontWeight: '700'},
  reason: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    marginTop: 4,
    minHeight: 44,
    justifyContent: 'center',
    backgroundColor: pastelColors.white,
  },
  reasonActive: {backgroundColor: pastelColors.auth.deepText},
  reasonText: {fontWeight: '800', color: pastelColors.auth.deepText},
  reasonTextActive: {color: pastelColors.white},
  reportInput: {
    height: 96,
    maxHeight: 96,
    marginTop: 12,
    minHeight: 80,
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
  aliasChip: {flexDirection: 'row', alignItems: 'center', gap: 8},
  aliasRow: {flexDirection: 'row', alignItems: 'center', gap: 6},
  miniAvatar: {
    height: 28,
    width: 28,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniAvatarText: {fontWeight: '900', color: pastelColors.auth.deepText, fontSize: 12},
  alias: {fontWeight: '800', color: pastelColors.accent, fontSize: 12},
  youChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: pastelColors.auth.accentOverlay,
  },
  youChipText: {fontSize: 10, fontWeight: '900', color: pastelColors.accent},
  anonLabel: {fontSize: 11, fontWeight: '700', color: pastelColors.auth.mutedText},
  timeLabel: {fontSize: 11, fontWeight: '700', color: pastelColors.auth.mutedText},
  reactions: {
    marginTop: 8,
    paddingHorizontal: 4,
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
  },
  commentsHead: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  comments: {
    fontSize: 18,
    fontWeight: '900',
    color: pastelColors.auth.deepText,
  },
  sortRow: {flexDirection: 'row', gap: 6},
  sortChip: {
    minHeight: 32,
    paddingHorizontal: 10,
    borderRadius: 12,
    justifyContent: 'center',
    backgroundColor: pastelColors.auth.glassSurface,
  },
  sortChipActive: {backgroundColor: pastelColors.auth.deepText},
  sortText: {fontWeight: '800', color: pastelColors.auth.deepText, fontSize: 12},
  sortTextActive: {color: pastelColors.white},
  emptyComments: {
    marginTop: 10,
    padding: 14,
    borderRadius: 10,
    backgroundColor: pastelColors.white,
    alignItems: 'center',
    gap: 6,
  },
  emptyTitle: {fontWeight: '900', color: pastelColors.auth.deepText, textAlign: 'center'},
  emptyCopy: {color: pastelColors.auth.mutedText, fontWeight: '700', textAlign: 'center'},
  comment: {
    marginTop: 8,
    padding: 10,
    borderRadius: 8,
    backgroundColor: pastelColors.white,
  },
  commentPressed: {backgroundColor: pastelColors.auth.glassSurface},
  commentText: {marginTop: 5, color: pastelColors.auth.deepText, lineHeight: 20, fontSize: 15, fontWeight: '700'},
  engagement: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  voteButton: {
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  voteCount: {fontWeight: '800', color: pastelColors.auth.mutedText, fontSize: 12},
  voteButtonCompact: {minHeight: 34, minWidth: 34, paddingHorizontal: 3, gap: 3},
  voteCountCompact: {fontSize: 11},
  voteCountActive: {color: pastelColors.accent},
  replyAction: {minHeight: 34, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center'},
  replyActionText: {fontSize: 12, fontWeight: '900', color: pastelColors.auth.mutedText},
  moreAction: {
    marginLeft: 'auto',
    height: 44,
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reply: {
    marginTop: 6,
    marginLeft: 16,
    padding: 8,
    borderRadius: 10,
    borderLeftWidth: 2,
    borderLeftColor: pastelColors.auth.glassBorder,
    backgroundColor: pastelColors.auth.glassSurface,
  },
  quotedReply: {
    marginTop: 10,
    padding: 10,
    borderRadius: 12,
    backgroundColor: pastelColors.auth.primaryOverlay,
  },
  showRepliesButton: {alignSelf: 'flex-start', marginTop: 8, paddingVertical: 6, paddingHorizontal: 2},
  showRepliesText: {fontWeight: '900', color: pastelColors.accent, fontSize: 12},
  quotedLabel: {fontWeight: '800', color: pastelColors.accent, fontSize: 12},
  quotedText: {marginTop: 4, color: pastelColors.auth.deepText, fontWeight: '600'},
  actionActive: {fontWeight: '900', color: pastelColors.accent},
  composerDock: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 8,
    backgroundColor: pastelColors.auth.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: pastelColors.auth.glassBorder,
  },
  aliasBar: {paddingHorizontal: 4, marginBottom: 6},
  aliasTap: {flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 32},
  aliasBarText: {fontWeight: '800', color: pastelColors.auth.deepText},
  aliasEditRow: {flexDirection: 'row', alignItems: 'center', gap: 8},
  aliasInput: {
    flex: 1,
    minHeight: 40,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: pastelColors.white,
    color: pastelColors.auth.deepText,
    fontWeight: '800',
  },
  aliasDone: {minHeight: 40, paddingHorizontal: 12, justifyContent: 'center'},
  aliasDoneText: {fontWeight: '900', color: pastelColors.accent},
  aliasError: {marginTop: 4, color: pastelColors.error, fontWeight: '800', fontSize: 12},
  replying: {
    paddingHorizontal: 4,
    marginBottom: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  typingIndicator: {
    marginHorizontal: 16,
    marginBottom: 6,
    color: pastelColors.accent,
    fontSize: 12,
    fontWeight: '800',
  },
  replyingText: {flex: 1, fontWeight: '700', color: pastelColors.auth.mutedText, marginRight: 8},
  composer: {
    position: 'relative',
    padding: 10,
    borderRadius: 16,
    backgroundColor: pastelColors.white,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    color: pastelColors.auth.deepText,
    paddingTop: 10,
    paddingRight: 28,
  },
  composerMeta: {alignItems: 'center'},
  counter: {
    position: 'absolute',
    top: 10,
    right: 14,
    fontSize: 10,
    fontWeight: '700',
    color: pastelColors.auth.mutedText,
  },
  sendButton: {height: 44, width: 44, alignItems: 'center', justifyContent: 'center'},
  skeletonCard: {
    padding: 16,
    borderRadius: 18,
    backgroundColor: pastelColors.white,
  },
  skeletonRow: {flexDirection: 'row', alignItems: 'center', gap: 10},
  skeletonAvatar: {
    height: 34,
    width: 34,
    borderRadius: 12,
    backgroundColor: pastelColors.auth.glassSurface,
  },
  skeletonLine: {
    height: 12,
    borderRadius: 8,
    backgroundColor: pastelColors.auth.glassSurface,
  },
});
