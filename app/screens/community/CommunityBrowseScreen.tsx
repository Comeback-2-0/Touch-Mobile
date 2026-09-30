import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  AccessibilityInfo,
  Animated,
  FlatList,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {api} from '../../utils/api';
import {pastelColors} from '../../theme/colors';
import type {CommunityStackParamList, CommunitySummary} from '../../navigation/CommunityStack';
import {
  browseStatusLine,
  communityAvatarColor,
  communityErrorCopy,
  communityInitial,
} from './communityUx';
import {useBlockedCommunitiesStore} from './blockedCommunitiesStore';
import PreviewMarqueeText from './PreviewMarqueeText';

type Navigation = NativeStackNavigationProp<CommunityStackParamList>;
type BrowseMode = 'trending' | 'mine';

function SkeletonCard() {
  return (
    <View style={styles.skeletonCard}>
      <View style={styles.skeletonAvatar} />
      <View style={styles.skeletonBody}>
        <View style={[styles.skeletonLine, {width: '58%'}]} />
        <View style={[styles.skeletonLine, {width: '84%', marginTop: 10}]} />
        <View style={[styles.skeletonLine, {width: '46%', marginTop: 10}]} />
      </View>
    </View>
  );
}

function CommunityAvatar({name, image}: {name: string; image?: string}) {
  if (image) {
    return <Image source={{uri: image}} style={styles.avatar} />;
  }
  const bg = communityAvatarColor(name);
  return (
    <View style={[styles.avatar, styles.avatarFallback, {backgroundColor: bg}]}>
      <Text style={styles.avatarInitial} maxFontSizeMultiplier={1.2}>
        {communityInitial(name)}
      </Text>
    </View>
  );
}

function CommunityPreviewSheet({
  community,
  onClose,
  onOpen,
}: {
  community: CommunitySummary | null;
  onClose: () => void;
  onOpen: () => void;
}) {
  if (!community) return null;
  const description = community.description?.trim() || 'An anonymous place to connect.';
  const members = Number(community.membersCount || 0);
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.previewOverlay}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close community preview"
          style={styles.previewBackdrop}
          onPress={onClose}
        />
        <View style={styles.previewSheet} accessibilityViewIsModal>
          <View style={styles.previewHandle} />
          <View style={styles.previewHeader}>
            <CommunityAvatar name={community.name} image={community.image} />
            <View style={styles.previewIdentity}>
              <Text style={styles.previewName} maxFontSizeMultiplier={1.3}>
                {community.name}
              </Text>
              <Text style={styles.previewMembers} maxFontSizeMultiplier={1.3}>
                {members} {members === 1 ? 'member' : 'members'}
              </Text>
            </View>
          </View>
          <Text style={styles.previewSectionLabel}>ABOUT THIS COMMUNITY</Text>
          <ScrollView
            style={styles.previewDescriptionScroll}
            contentContainerStyle={styles.previewDescriptionContent}
            showsVerticalScrollIndicator
            nestedScrollEnabled>
            <Text style={styles.previewDescription} maxFontSizeMultiplier={1.35}>
              {description}
            </Text>
          </ScrollView>
          <View style={styles.previewActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close community preview"
              onPress={onClose}
              style={styles.previewSecondaryButton}>
              <Text style={styles.previewSecondaryText}>Close</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Open ${community.name}`}
              onPress={onOpen}
              style={styles.previewPrimaryButton}>
              <Text style={styles.previewPrimaryText}>Open community</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function IntroAtmosphere({reduceMotion}: {reduceMotion: boolean}) {
  const drift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduceMotion) {
      drift.setValue(0);
      return undefined;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(drift, {toValue: 1, duration: 4200, useNativeDriver: true}),
        Animated.timing(drift, {toValue: 0, duration: 4200, useNativeDriver: true}),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [drift, reduceMotion]);

  const shift = drift.interpolate({inputRange: [0, 1], outputRange: [0, 8]});

  return (
    <View style={styles.introCard} accessibilityRole="summary">
      <Animated.View
        pointerEvents="none"
        style={[styles.introBlob, styles.introBlobOne, {transform: [{translateX: shift}]}]}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.introBlob,
          styles.introBlobTwo,
          {
            transform: [
              {
                translateY: drift.interpolate({inputRange: [0, 1], outputRange: [0, -6]}),
              },
            ],
          },
        ]}
      />
      <View style={styles.introDotRow}>
        <View style={[styles.introDot, {backgroundColor: '#F2A0B8'}]} />
        <View style={[styles.introDot, {backgroundColor: '#8EC5E8'}]} />
        <View style={[styles.introDot, {backgroundColor: '#C4A8E8'}]} />
      </View>
      <Text style={styles.introTitle} maxFontSizeMultiplier={1.35}>
        Say what you can't say elsewhere
      </Text>
      <Text style={styles.introCopy} maxFontSizeMultiplier={1.4}>
        Join anonymous corners built around mood, stories, help, jokes, and quiet honesty.
      </Text>
    </View>
  );
}

export default function CommunityBrowseScreen() {
  const navigation = useNavigation<Navigation>();
  const [communities, setCommunities] = useState<CommunitySummary[]>([]);
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<BrowseMode>('trending');
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [previewCommunity, setPreviewCommunity] = useState<CommunitySummary | null>(null);
  const searchProgress = useRef(new Animated.Value(0)).current;
  const inputRef = useRef<TextInput>(null);
  const blockedIds = useBlockedCommunitiesStore(state => state.blockedIds);

  const visibleCommunities = useMemo(
    () =>
      communities.filter(item => {
        const id = item.id || item._id;
        return !blockedIds[String(id)];
      }),
    [blockedIds, communities],
  );

  useEffect(() => {
    setPreviewId(null);
    setPreviewCommunity(null);
  }, [mode, query]);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => undefined);
    const sub = AccessibilityInfo.addEventListener?.('reduceMotionChanged', setReduceMotion);
    return () => sub?.remove?.();
  }, []);

  const load = useCallback(
    async ({refresh = false} = {}) => {
      if (refresh) setRefreshing(true);
      else if (!communities.length) setInitialLoading(true);
      setError('');
      try {
        if (mode === 'mine') {
          const response = await api.get<{communities: CommunitySummary[]}>('/communities/mine');
          setCommunities(response.data.communities || []);
        } else {
          const response = await api.get<CommunitySummary[]>('/communities', {
            params: query.trim() ? {q: query.trim()} : undefined,
          });
          setCommunities(response.data || []);
        }
      } catch (err: any) {
        setError(
          communityErrorCopy(
            err,
            mode === 'mine' ? 'Could not load your communities.' : 'Could not load communities.',
          ),
        );
      } finally {
        setInitialLoading(false);
        setRefreshing(false);
      }
    },
    [communities.length, mode, query],
  );

  useEffect(() => {
    const timer = setTimeout(() => load(), searchOpen && mode === 'trending' ? 250 : 0);
    return () => clearTimeout(timer);
  }, [load, mode, searchOpen]);

  useEffect(() => {
    Animated.timing(searchProgress, {
      toValue: searchOpen ? 1 : 0,
      duration: reduceMotion ? 0 : 180,
      useNativeDriver: false,
    }).start(() => {
      if (searchOpen) inputRef.current?.focus();
    });
  }, [searchOpen, searchProgress, reduceMotion]);

  const openSearch = () => {
    setMode('trending');
    setSearchOpen(true);
  };

  const closeSearch = () => {
    setSearchOpen(false);
    setQuery('');
  };

  const emptyTitle = query.trim()
    ? 'No matching communities'
    : mode === 'mine'
      ? 'No joined communities yet'
      : 'No corners trending yet';
  const emptyCopy = query.trim()
    ? 'Try a mood, topic, or different spelling — or create a quiet corner.'
    : mode === 'mine'
      ? 'Join a corner and it will show up here.'
      : 'Be the first voice. Open an anonymous corner for others to find.';

  const listHeader = (
    <View>
      {mode === 'trending' && !query.trim() ? <IntroAtmosphere reduceMotion={reduceMotion} /> : null}
      {mode === 'trending' && !query.trim() && visibleCommunities.length > 0 ? (
        <Text style={styles.sectionLabel} maxFontSizeMultiplier={1.3}>
          Trending now
        </Text>
      ) : null}
      {searchOpen && !query.trim() && mode === 'trending' ? (
        <View style={styles.searchHintCard}>
          <Feather name="search" size={16} color={pastelColors.auth.deepText} />
          <Text style={styles.searchHintText} maxFontSizeMultiplier={1.35}>
            Search by mood or topic — late nights, memes, help, honesty.
          </Text>
        </View>
      ) : null}
      {error ? <Text style={styles.inlineError}>{error}</Text> : null}
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View style={styles.heading}>
          <Text style={styles.title} maxFontSizeMultiplier={1.3}>
            Community
          </Text>
          <Text style={styles.subtitle} maxFontSizeMultiplier={1.35}>
            Find your anonymous corner
          </Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Search communities"
            onPress={openSearch}
            style={styles.iconButton}>
            <Feather name="search" size={22} color={pastelColors.auth.deepText} />
          </Pressable>
        </View>
      </View>

      <Animated.View
        style={[
          styles.search,
          {
            height: searchProgress.interpolate({inputRange: [0, 1], outputRange: [0, 48]}),
            opacity: searchProgress,
            marginBottom: searchProgress.interpolate({inputRange: [0, 1], outputRange: [0, 10]}),
          },
        ]}
        pointerEvents={searchOpen ? 'auto' : 'none'}>
        <Feather name="search" size={18} color={pastelColors.auth.mutedText} />
        <TextInput
          ref={inputRef}
          accessibilityLabel="Search communities"
          value={query}
          onChangeText={setQuery}
          placeholder="Search by mood or topic"
          placeholderTextColor={pastelColors.auth.mutedText}
          style={styles.input}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close search"
          onPress={closeSearch}
          style={styles.smallIconButton}>
          <Feather name="x" size={18} color={pastelColors.auth.mutedText} />
        </Pressable>
      </Animated.View>

      <View style={styles.tabs}>
        {(['trending', 'mine'] as BrowseMode[]).map(item => {
          const selected = mode === item;
          return (
            <Pressable
              key={item}
              accessibilityRole="button"
              accessibilityState={{selected}}
              onPress={() => {
                setMode(item);
                if (item === 'mine') closeSearch();
              }}
              style={[styles.tab, selected && styles.tabSelected]}>
              <Text
                style={[styles.tabText, selected && styles.tabTextSelected]}
                maxFontSizeMultiplier={1.3}>
                {item === 'trending' ? 'Trending' : 'My communities'}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {initialLoading ? (
        <View style={styles.list}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </View>
      ) : error && !visibleCommunities.length ? (
        <View style={styles.center}>
          <Feather name="wifi-off" size={28} color={pastelColors.auth.deepText} />
          <Text style={styles.emptyTitle}>{error}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Retry loading communities"
            onPress={() => load()}
            style={styles.retry}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={visibleCommunities}
          keyExtractor={item => item.id || item._id}
          refreshing={refreshing}
          onRefresh={() => load({refresh: true})}
          onScrollBeginDrag={() => {
            setPreviewId(null);
            setPreviewCommunity(null);
          }}
          contentContainerStyle={visibleCommunities.length ? styles.list : styles.empty}
          ListHeaderComponent={listHeader}
          renderItem={({item, index}) => {
            const id = String(item.id || item._id);
            const previewing = previewId === id && !reduceMotion;
            const showRank = mode === 'trending' && !query.trim();
            const description = item.description?.trim() || 'An anonymous place to connect.';
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Open ${item.name}`}
                delayLongPress={280}
                onLongPress={() => {
                  setPreviewId(id);
                  setPreviewCommunity(item);
                }}
                onPress={() => {
                  setPreviewId(null);
                  navigation.navigate('CommunityHome', {community: item});
                }}
                style={({pressed}) => [styles.card, pressed && styles.cardPressed]}>
                {showRank ? (
                  <View style={styles.rankSticker} pointerEvents="none">
                    <Text style={styles.rankStickerText} maxFontSizeMultiplier={1.2}>
                      #{index + 1}
                    </Text>
                  </View>
                ) : null}
                <CommunityAvatar name={item.name} image={item.image} />
                <View style={styles.cardText}>
                  <PreviewMarqueeText
                    text={item.name}
                    active={previewing}
                    style={styles.name}
                    maxFontSizeMultiplier={1.3}
                    onManualDrag={() => setPreviewId(id)}
                  />
                  <PreviewMarqueeText
                    text={description}
                    active={previewing}
                    style={styles.description}
                    containerStyle={styles.descriptionClip}
                    maxFontSizeMultiplier={1.35}
                    onManualDrag={() => setPreviewId(id)}
                  />
                  <Text style={styles.statusLine} maxFontSizeMultiplier={1.3}>
                    {browseStatusLine(item)}
                  </Text>
                </View>
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <View style={styles.center}>
              <View style={styles.emptyIcon}>
                <Feather name="moon" size={26} color={pastelColors.auth.deepText} />
              </View>
              <Text style={styles.emptyTitle}>{emptyTitle}</Text>
              <Text style={styles.copy}>{emptyCopy}</Text>
              {!query.trim() ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => navigation.navigate('CommunityCreate')}
                  style={styles.softCreate}>
                  <Feather name="plus" size={18} color={pastelColors.auth.deepText} />
                  <Text style={styles.softCreateText}>Create a corner</Text>
                </Pressable>
              ) : (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => navigation.navigate('CommunityCreate')}
                  style={styles.softCreate}>
                  <Text style={styles.softCreateText}>Create instead</Text>
                </Pressable>
              )}
            </View>
          }
        />
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Create community"
        onPress={() => navigation.navigate('CommunityCreate')}
        style={({pressed}) => [
          styles.createFab,
          {bottom: 16},
          pressed && styles.createFabPressed,
        ]}>
        <Feather name="plus" size={26} color={pastelColors.white} />
      </Pressable>
      <CommunityPreviewSheet
        community={previewCommunity}
        onClose={() => setPreviewCommunity(null)}
        onOpen={() => {
          const community = previewCommunity;
          setPreviewCommunity(null);
          if (community) navigation.navigate('CommunityHome', {community});
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: pastelColors.auth.background},
  previewOverlay: {flex: 1, justifyContent: 'flex-end'},
  previewBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(50, 17, 31, 0.42)',
  },
  previewSheet: {
    maxHeight: '82%',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 24,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: pastelColors.auth.background,
  },
  previewHandle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: 4,
    marginBottom: 18,
    backgroundColor: pastelColors.auth.glassBorder,
  },
  previewHeader: {flexDirection: 'row', alignItems: 'center'},
  previewIdentity: {flex: 1, minWidth: 0},
  previewName: {fontSize: 23, fontWeight: '900', color: pastelColors.auth.deepText},
  previewMembers: {marginTop: 5, color: pastelColors.auth.mutedText, fontWeight: '700'},
  previewSectionLabel: {
    marginTop: 22,
    marginBottom: 8,
    fontSize: 11,
    letterSpacing: 1.1,
    fontWeight: '900',
    color: pastelColors.auth.mutedText,
  },
  previewDescriptionScroll: {
    maxHeight: 240,
    borderRadius: 16,
    backgroundColor: pastelColors.auth.primaryOverlay,
  },
  previewDescriptionContent: {padding: 16},
  previewDescription: {
    color: pastelColors.auth.deepText,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
  },
  previewActions: {flexDirection: 'row', gap: 10, marginTop: 18},
  previewSecondaryButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: pastelColors.auth.glassBorder,
  },
  previewSecondaryText: {color: pastelColors.auth.mutedText, fontWeight: '900', fontSize: 15},
  previewPrimaryButton: {
    flex: 1.4,
    minHeight: 50,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: pastelColors.accent,
  },
  previewPrimaryText: {color: pastelColors.white, fontWeight: '900', fontSize: 15},
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heading: {flex: 1, paddingRight: 8},
  title: {fontSize: 28, fontWeight: '900', color: pastelColors.auth.deepText},
  subtitle: {marginTop: 2, fontWeight: '700', color: pastelColors.auth.mutedText},
  headerActions: {flexDirection: 'row', alignItems: 'center'},
  iconButton: {height: 44, width: 44, alignItems: 'center', justifyContent: 'center'},
  createFab: {
    position: 'absolute',
    right: 18,
    height: 58,
    width: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: pastelColors.accent,
    shadowColor: '#32111F',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: {width: 0, height: 4},
    elevation: 6,
  },
  createFabPressed: {
    transform: [{scale: 0.94}],
    opacity: 0.9,
  },
  smallIconButton: {height: 44, width: 44, alignItems: 'center', justifyContent: 'center'},
  search: {
    overflow: 'hidden',
    marginHorizontal: 16,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: pastelColors.white,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(50, 17, 31, 0.06)',
  },
  input: {flex: 1, marginLeft: 10, color: pastelColors.auth.deepText, fontWeight: '700'},
  tabs: {flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 4, marginTop: 4},
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: pastelColors.white,
    borderWidth: 1,
    borderColor: 'rgba(50, 17, 31, 0.06)',
  },
  tabSelected: {
    backgroundColor: pastelColors.auth.deepText,
    borderColor: pastelColors.auth.deepText,
  },
  tabText: {fontWeight: '800', color: pastelColors.auth.mutedText},
  tabTextSelected: {color: pastelColors.white},
  list: {paddingHorizontal: 16, paddingBottom: 24, paddingTop: 14},
  sectionLabel: {
    marginBottom: 10,
    marginTop: 4,
    fontSize: 13,
    fontWeight: '800',
    color: pastelColors.auth.mutedText,
    letterSpacing: 0.2,
  },
  introCard: {
    marginBottom: 14,
    padding: 18,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#FFE8F0',
    borderWidth: 1,
    borderColor: 'rgba(50, 17, 31, 0.06)',
  },
  introBlob: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.55,
  },
  introBlobOne: {
    width: 120,
    height: 120,
    top: -36,
    right: -28,
    backgroundColor: '#F7C4D4',
  },
  introBlobTwo: {
    width: 90,
    height: 90,
    bottom: -30,
    left: -20,
    backgroundColor: '#D7E9F7',
  },
  introDotRow: {flexDirection: 'row', gap: 6, marginBottom: 10},
  introDot: {height: 8, width: 8, borderRadius: 4},
  introTitle: {fontSize: 18, fontWeight: '900', color: pastelColors.auth.deepText},
  introCopy: {
    marginTop: 8,
    color: pastelColors.auth.mutedText,
    fontWeight: '600',
    lineHeight: 21,
  },
  searchHintCard: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: pastelColors.white,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(50, 17, 31, 0.06)',
  },
  searchHintText: {
    flex: 1,
    color: pastelColors.auth.mutedText,
    fontWeight: '700',
    lineHeight: 18,
    fontSize: 13,
  },
  card: {
    position: 'relative',
    padding: 14,
    paddingTop: 16,
    marginBottom: 10,
    borderRadius: 12,
    backgroundColor: pastelColors.white,
    borderWidth: 1,
    borderColor: 'rgba(50, 17, 31, 0.07)',
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#32111F',
    shadowOpacity: 0.07,
    shadowRadius: 10,
    shadowOffset: {width: 0, height: 3},
    elevation: 2,
    overflow: 'visible',
  },
  cardPressed: {
    backgroundColor: '#FFF8FA',
    borderColor: 'rgba(50, 17, 31, 0.14)',
    transform: [{scale: 0.992}],
  },
  rankSticker: {
    position: 'absolute',
    top: -6,
    left: 10,
    zIndex: 2,
    minWidth: 34,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: pastelColors.accent,
    borderWidth: 2,
    borderColor: pastelColors.white,
    shadowColor: '#32111F',
    shadowOpacity: 0.16,
    shadowRadius: 4,
    shadowOffset: {width: 0, height: 2},
    elevation: 3,
    transform: [{rotate: '-8deg'}],
  },
  rankStickerText: {
    color: pastelColors.white,
    fontSize: 11,
    fontWeight: '900',
    textAlign: 'center',
  },
  avatar: {height: 58, width: 58, borderRadius: 16, marginRight: 12},
  avatarFallback: {alignItems: 'center', justifyContent: 'center'},
  avatarInitial: {
    fontSize: 18,
    fontWeight: '900',
    color: pastelColors.auth.deepText,
  },
  cardText: {flex: 1, minWidth: 0},
  name: {fontSize: 16, fontWeight: '900', color: pastelColors.auth.deepText},
  description: {
    color: pastelColors.auth.mutedText,
    fontWeight: '600',
    lineHeight: 18,
  },
  descriptionClip: {marginTop: 4},
  statusLine: {
    marginTop: 7,
    color: pastelColors.auth.deepText,
    fontWeight: '700',
    fontSize: 12,
    opacity: 0.78,
  },
  skeletonCard: {
    flexDirection: 'row',
    padding: 14,
    marginBottom: 10,
    borderRadius: 12,
    backgroundColor: pastelColors.white,
  },
  skeletonAvatar: {
    height: 58,
    width: 58,
    borderRadius: 16,
    backgroundColor: '#F0EAEB',
    marginRight: 12,
  },
  skeletonBody: {flex: 1, justifyContent: 'center'},
  skeletonLine: {
    height: 12,
    borderRadius: 8,
    backgroundColor: '#F0EAEB',
  },
  center: {flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24},
  empty: {flexGrow: 1, paddingHorizontal: 16, paddingTop: 8},
  emptyIcon: {
    height: 56,
    width: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: pastelColors.white,
    borderWidth: 1,
    borderColor: 'rgba(50, 17, 31, 0.06)',
  },
  copy: {
    marginTop: 10,
    color: pastelColors.auth.mutedText,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyTitle: {
    marginTop: 14,
    color: pastelColors.auth.deepText,
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
  },
  softCreate: {
    marginTop: 18,
    minHeight: 44,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: pastelColors.white,
    borderWidth: 1,
    borderColor: 'rgba(50, 17, 31, 0.1)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  softCreateText: {color: pastelColors.auth.deepText, fontWeight: '900'},
  inlineError: {
    marginBottom: 10,
    padding: 12,
    borderRadius: 12,
    backgroundColor: pastelColors.white,
    color: pastelColors.auth.deepText,
    fontWeight: '800',
    textAlign: 'center',
  },
  retry: {
    marginTop: 16,
    minHeight: 44,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: pastelColors.auth.deepText,
    justifyContent: 'center',
  },
  retryText: {color: pastelColors.white, fontWeight: '900', textAlign: 'center'},
});
