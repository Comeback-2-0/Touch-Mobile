import {useHiddenPostsStore} from './hiddenPostsStore';
import {useAuthStore} from '../../features/profile/store/authStore';
import React, {useCallback, useEffect, useState} from 'react';
import {Alert, FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {RouteProp, useNavigation, useRoute} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {api} from '../../utils/api';
import {pastelColors} from '../../theme/colors';
import type {CommunityStackParamList} from '../../navigation/CommunityStack';
import CommunityPostCard from './CommunityPostCard';
import CommunityConfirmSheet from './CommunityConfirmSheet';
import {
  ELLIPSIS,
  REPORT_CATEGORIES,
  communityErrorCopy,
  showCommunityToast,
} from './communityUx';

type Route = RouteProp<CommunityStackParamList, 'CommunityQueue'>;
type Navigation = NativeStackNavigationProp<CommunityStackParamList>;
type Post = {
  id: string;
  alias: string;
  text: string;
  score: number;
  upvotes?: number;
  downvotes?: number;
  myVote?: number;
  link?: string;
  media?: {type?: string; url?: string; mimeType?: string} | null;
};

function voteCountsFromScore(post: Post) {
  const upvotes = Number(post.upvotes);
  const downvotes = Number(post.downvotes);
  if (Number.isFinite(upvotes) && Number.isFinite(downvotes)) {
    return {upvotes, downvotes};
  }
  const score = Number(post.score || 0);
  if (score >= 0) return {upvotes: score, downvotes: 0};
  return {upvotes: 0, downvotes: Math.abs(score)};
}

function QueueSkeleton() {
  return (
    <View style={styles.list}>
      <View style={styles.queueInfo}>
        <View style={[styles.skeletonLine, {width: '55%'}]} />
        <View style={[styles.skeletonLine, {width: '90%', marginTop: 10}]} />
      </View>
      <View style={styles.skeletonCard} />
      <View style={styles.skeletonCard} />
    </View>
  );
}

export default function CommunityQueueScreen() {
  const navigation = useNavigation<Navigation>();
  const {
    params: {community},
  } = useRoute<Route>();
  const communityId = community.id || community._id;
  const accountId=useAuthStore(state=>state.user?._id||'');
  const hidden=useHiddenPostsStore(state=>state.hidden);
  const hiddenLoaded=useHiddenPostsStore(state=>state.loaded);
  useEffect(()=>{useHiddenPostsStore.getState().load().catch(()=>Alert.alert('Could not load hidden posts','Please restart Touch to retry.'));},[]);
  const hidePost=async(postId:string)=>{
    try{await useHiddenPostsStore.getState().hide(accountId,communityId,postId);showCommunityToast('Post hidden.');}
    catch{Alert.alert('Could not hide post','Please try again.');}
  };
  const [posts, setPosts] = useState<Post[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [publishConfirm, setPublishConfirm] = useState<{id: string; top?: boolean} | null>(null);
  const [reportedIds, setReportedIds] = useState<Record<string, true>>({});
  const [reportTarget, setReportTarget] = useState<Post | null>(null);
  const [reportReason, setReportReason] = useState(REPORT_CATEGORIES[0]?.value || 'other');
  const [reportContext, setReportContext] = useState('');
  const [reportBusy, setReportBusy] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<Post | null>(null);

  const load = useCallback(
    async ({refresh = false} = {}) => {
      if (refresh) setRefreshing(true);
      else setLoading(true);
      setError('');
      try {
        const r = await api.get(`/communities/${communityId}/content/queue`);
        setPosts(r.data.posts || []);
        setCanManage(Boolean(r.data.canManage));
      } catch (err: any) {
        setError(communityErrorCopy(err, 'Could not load review queue.'));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [communityId],
  );

  useEffect(() => {
    load();
  }, [load]);

  const vote = async (id: string, value: number) => {
    try {
      const r = await api.post(`/communities/${communityId}/content/${id}/vote`, {value});
      const updated = r.data.post;
      setPosts(current =>
        current.map(post => (post.id === id ? {...post, ...updated} : post)),
      );
    } catch {
      showCommunityToast('Could not vote. Please try again.');
    }
  };

  const publishOne = async (id: string) => {
    setBusyId(id);
    try {
      await api.post(`/communities/${communityId}/content/${id}/publish`);
      showCommunityToast('Post published');
      setPublishConfirm(null);
      await load();
    } catch {
      showCommunityToast('Could not publish. Please try again.');
    } finally {
      setBusyId(null);
    }
  };

  const publishTop = async () => {
    setBusyId('top');
    try {
      await api.post(`/communities/${communityId}/content/queue/publish-top`);
      showCommunityToast('Top post published');
      setPublishConfirm(null);
      await load();
    } catch (err: any) {
      showCommunityToast(err?.response?.data?.error || 'Could not publish top.');
    } finally {
      setBusyId(null);
    }
  };

  const deletePost = async (id: string) => {
    setBusyId(id);
    try {
      await api.delete(`/communities/${communityId}/content/${id}`);
      showCommunityToast('Post deleted from queue');
      setDeleteConfirm(null);
      await load();
    } catch {
      showCommunityToast('Could not delete. Please try again.');
    } finally {
      setBusyId(null);
    }
  };

  const submitReport = async () => {
    if (!reportTarget || reportBusy) return;
    setReportBusy(true);
    try {
      await api.post(`/communities/${communityId}/content/${reportTarget.id}/report`, {
        reason: reportReason,
        context: reportContext.trim(),
      });
      setReportedIds(current => ({...current, [reportTarget.id]: true}));
      setReportTarget(null);
      setReportContext('');
      showCommunityToast('Report sent to moderators');
    } catch {
      showCommunityToast('Could not report. Please try again.');
    } finally {
      setReportBusy(false);
    }
  };

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
        <Text style={styles.title} maxFontSizeMultiplier={1.35}>
          Review queue
        </Text>
        {canManage && posts.length ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Publish top voted post"
            onPress={() => setPublishConfirm({id: 'top', top: true})}
            disabled={busyId === 'top'}
            style={styles.topButton}>
            <Text style={styles.topAction}>
              {busyId === 'top' ? ELLIPSIS : 'Publish top'}
            </Text>
          </Pressable>
        ) : (
          <View style={styles.headerSpacer} />
        )}
      </View>

      {loading ? (
        <QueueSkeleton />
      ) : (
        <FlatList
          data={hiddenLoaded?posts.filter(post=>!hidden[JSON.stringify([accountId,communityId,post.id])]):[]}
          keyExtractor={p => p.id}
          refreshing={refreshing}
          onRefresh={() => load({refresh: true})}
          contentContainerStyle={posts.length ? styles.list : styles.empty}
          ListHeaderComponent={
            <View style={styles.queueInfo}>
              <Text style={styles.queueInfoTitle} maxFontSizeMultiplier={1.35}>
                Vote what goes live
              </Text>
              <Text style={styles.queueInfoCopy} maxFontSizeMultiplier={1.4}>
                Posts start here first. Members vote. The best ones become public in the
                community feed.
              </Text>
              {canManage ? (
                <Text style={styles.ownerHint} maxFontSizeMultiplier={1.35}>
                  Highest upvotes go first. When likes tie, more downvotes rank lower. Votes
                  reset when a post is published.
                </Text>
              ) : null}
              {error ? <Text style={styles.inlineError}>{error}</Text> : null}
            </View>
          }
          renderItem={({item}) => {
            const {upvotes, downvotes} = voteCountsFromScore(item);
            const alreadyReported = Boolean(reportedIds[item.id]);
            return (
              <View style={styles.card}>
                <CommunityPostCard
                  queueStyle
                  alias={item.alias}
                  caption={item.text}
                  media={item.media}
                  onDoubleTapLike={() => vote(item.id, 1)}
                />
                <View style={styles.actions}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Upvote, ${upvotes}`}
                    accessibilityState={{selected: item.myVote === 1}}
                    onPress={() => vote(item.id, 1)}
                    style={styles.voteBlock}>
                    <MaterialCommunityIcons
                      name={item.myVote === 1 ? 'thumb-up' : 'thumb-up-outline'}
                      size={22}
                      color={
                        item.myVote === 1 ? pastelColors.accent : pastelColors.auth.mutedText
                      }
                    />
                    <Text
                      style={[styles.voteCount, item.myVote === 1 && styles.voteCountActive]}
                      maxFontSizeMultiplier={1.3}>
                      {upvotes}
                    </Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Downvote, ${downvotes}`}
                    accessibilityState={{selected: item.myVote === -1}}
                    onPress={() => vote(item.id, -1)}
                    style={styles.voteBlock}>
                    <MaterialCommunityIcons
                      name={item.myVote === -1 ? 'thumb-down' : 'thumb-down-outline'}
                      size={22}
                      color={
                        item.myVote === -1 ? pastelColors.accent : pastelColors.auth.mutedText
                      }
                    />
                    <Text
                      style={[styles.voteCount, item.myVote === -1 && styles.voteCountActive]}
                      maxFontSizeMultiplier={1.3}>
                      {downvotes}
                    </Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={alreadyReported ? 'Already reported' : 'Report post'}
                    disabled={alreadyReported}
                    onPress={() => {
                      setReportReason(REPORT_CATEGORIES[0]?.value || 'other');
                      setReportContext('');
                      setReportTarget(item);
                    }}
                    style={styles.reportButton}>
                    <Feather
                      name="flag"
                      size={18}
                      color={
                        alreadyReported ? pastelColors.auth.mutedText : pastelColors.auth.deepText
                      }
                    />
                    <Text
                      style={[
                        styles.reportLabel,
                        alreadyReported && styles.reportLabelDone,
                      ]}>
                      {alreadyReported ? 'Reported' : 'Report'}
                    </Text>
                  </Pressable>
                  {['Hide this post','Block User'].map(label=><Pressable key={label} accessibilityRole="button" accessibilityLabel={label} onPress={()=>hidePost(item.id)} style={styles.reportButton}><Text style={styles.reportLabel}>{label}</Text></Pressable>)}
                  {canManage ? (
                    <>
                      <Pressable
                        onPress={() => setDeleteConfirm(item)}
                        disabled={busyId === item.id}
                        style={styles.deleteButton}
                        accessibilityLabel="Delete from queue">
                        <Feather name="trash-2" size={18} color={pastelColors.error} />
                      </Pressable>
                      <Pressable
                        onPress={() => setPublishConfirm({id: item.id})}
                        disabled={busyId === item.id}
                        style={styles.publish}
                        accessibilityLabel="Publish to community">
                        <Text style={styles.publishText}>
                          {busyId === item.id ? `Sending${ELLIPSIS}` : 'Publish'}
                        </Text>
                      </Pressable>
                    </>
                  ) : null}
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyTitle}>The queue is quiet</Text>
              <Text style={styles.copy}>Submit something anonymously.</Text>
              <Pressable
                onPress={() => navigation.navigate('CommunityCompose', {community})}
                style={styles.retry}>
                <Text style={styles.retryText}>Post</Text>
              </Pressable>
            </View>
          }
        />
      )}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Create anonymous post"
        onPress={() => navigation.navigate('CommunityCompose', {community})}
        style={styles.fab}>
        <Feather name="plus" size={26} color={pastelColors.white} />
      </Pressable>

      <CommunityConfirmSheet
        visible={Boolean(publishConfirm)}
        title={publishConfirm?.top ? 'Publish top post?' : 'Publish this post?'}
        message={
          publishConfirm?.top
            ? 'The highest-liked eligible queue post will go live now. Queue votes reset after publish.'
            : 'This post will leave the queue and appear in the published feed. Queue votes reset.'
        }
        confirmLabel="Publish"
        busy={Boolean(busyId)}
        onConfirm={() => {
          if (!publishConfirm) return;
          if (publishConfirm.top) publishTop();
          else publishOne(publishConfirm.id);
        }}
        onCancel={() => setPublishConfirm(null)}
      />

      <CommunityConfirmSheet
        visible={Boolean(deleteConfirm)}
        title="Delete from queue?"
        message="This removes the post permanently. It will not go to the community feed."
        confirmLabel="Delete"
        destructive
        busy={Boolean(busyId)}
        onConfirm={() => {
          if (!deleteConfirm) return;
          deletePost(deleteConfirm.id);
        }}
        onCancel={() => setDeleteConfirm(null)}
      />

      <Modal
        visible={Boolean(reportTarget)}
        transparent
        animationType="slide"
        onRequestClose={() => !reportBusy && setReportTarget(null)}>
        <View style={styles.modalOverlay}>
          <Pressable
            style={styles.modalDismiss}
            onPress={() => !reportBusy && setReportTarget(null)}
          />
          <View style={styles.reportSheet}>
            <Text style={styles.reportTitle}>Report post</Text>
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
              <Pressable
                onPress={() => setReportTarget(null)}
                style={styles.cancelButton}
                disabled={reportBusy}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={submitReport} style={styles.sendReport} disabled={reportBusy}>
                <Text style={styles.sendReportText}>
                  {reportBusy ? 'Sending...' : 'Send report'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: pastelColors.auth.background},
  header: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  iconButton: {height: 44, width: 44, alignItems: 'center', justifyContent: 'center'},
  title: {fontSize: 18, fontWeight: '900', color: pastelColors.auth.deepText},
  topButton: {minHeight: 44, justifyContent: 'center'},
  topAction: {fontWeight: '900', color: pastelColors.accent},
  headerSpacer: {width: 72},
  center: {flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24},
  list: {padding: 16, paddingBottom: 28},
  empty: {flexGrow: 1, padding: 16},
  queueInfo: {
    marginBottom: 12,
    padding: 14,
    borderRadius: 12,
    backgroundColor: pastelColors.auth.primaryOverlay,
    borderWidth: 1,
    borderColor: 'rgba(232, 160, 191, 0.28)',
  },
  queueInfoTitle: {fontWeight: '900', color: pastelColors.auth.deepText, fontSize: 16},
  queueInfoCopy: {
    marginTop: 6,
    color: pastelColors.auth.mutedText,
    fontWeight: '700',
    lineHeight: 18,
  },
  ownerHint: {
    marginTop: 8,
    color: pastelColors.auth.deepText,
    fontWeight: '700',
    lineHeight: 18,
    fontSize: 12,
  },
  inlineError: {marginTop: 8, color: pastelColors.accent, fontWeight: '800'},
  card: {
    marginBottom: 14,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: pastelColors.white,
  },
  actions: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  voteBlock: {
    minHeight: 44,
    minWidth: 52,
    paddingHorizontal: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  voteCount: {
    fontWeight: '900',
    color: pastelColors.auth.mutedText,
    minWidth: 14,
  },
  voteCountActive: {color: pastelColors.accent},
  reportButton: {
    minHeight: 44,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  reportLabel: {fontWeight: '800', color: pastelColors.auth.deepText, fontSize: 12},
  reportLabelDone: {color: pastelColors.auth.mutedText},
  deleteButton: {
    minHeight: 44,
    minWidth: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  publish: {
    marginLeft: 'auto',
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: pastelColors.accent,
    justifyContent: 'center',
  },
  publishText: {color: pastelColors.white, fontWeight: '900', fontSize: 12},
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 16,
    height: 56,
    width: 56,
    borderRadius: 28,
    backgroundColor: pastelColors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#32111F',
    shadowOpacity: 0.22,
    shadowRadius: 8,
    shadowOffset: {width: 0, height: 4},
  },
  emptyTitle: {fontSize: 18, fontWeight: '900', color: pastelColors.auth.deepText},
  copy: {marginTop: 6, color: pastelColors.auth.mutedText, fontWeight: '700'},
  retry: {
    marginTop: 16,
    minHeight: 44,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: pastelColors.accent,
    justifyContent: 'center',
  },
  retryText: {color: pastelColors.white, fontWeight: '900'},
  skeletonCard: {
    height: 140,
    marginBottom: 12,
    borderRadius: 12,
    backgroundColor: pastelColors.white,
  },
  skeletonLine: {
    height: 12,
    borderRadius: 8,
    backgroundColor: pastelColors.auth.glassSurface,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(50, 17, 31, 0.32)',
  },
  modalDismiss: {...StyleSheet.absoluteFillObject},
  reportSheet: {
    maxHeight: '92%',
    padding: 18,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    backgroundColor: pastelColors.auth.background,
  },
  reportTitle: {fontSize: 20, fontWeight: '900', color: pastelColors.auth.deepText},
  reportCopy: {marginTop: 4, marginBottom: 10, color: pastelColors.auth.mutedText, fontWeight: '700'},
  reason: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginTop: 8,
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
    minHeight: 72,
    padding: 12,
    borderRadius: 12,
    backgroundColor: pastelColors.white,
    color: pastelColors.auth.deepText,
    textAlignVertical: 'top',
  },
  reportActions: {marginTop: 14, flexDirection: 'row', gap: 10},
  cancelButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: pastelColors.auth.glassSurface,
  },
  cancelText: {fontWeight: '900', color: pastelColors.auth.deepText},
  sendReport: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: pastelColors.accent,
  },
  sendReportText: {fontWeight: '900', color: pastelColors.white},
});
