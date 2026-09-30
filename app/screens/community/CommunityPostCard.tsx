import React, {useEffect, useRef, useState} from 'react';
import {
  Animated,
  Image,
  LayoutAnimation,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import Video from 'react-native-video';
import {pastelColors} from '../../theme/colors';
import {aliasColor} from './communityUx';

type Media = {
  type?: string;
  url?: string;
  mimeType?: string;
  uri?: string;
};

type Props = {
  media?: Media | null;
  caption?: string;
  alias?: string;
  link?: string;
  compact?: boolean;
  state?: string;
  createdAt?: string;
  timeLabel?: string;
  onPressLink?: () => void;
  queueStyle?: boolean;
  showAvatar?: boolean;
  showAnonymousLabel?: boolean;
  onDoubleTapLike?: () => void;
  onSingleTap?: () => void;
  onMorePress?: () => void;
};

function isVideo(media?: Media | null) {
  if (!media) return false;
  if (media.type === 'video') return true;
  const mime = media.mimeType || '';
  return mime.startsWith('video/');
}

export default function CommunityPostCard({
  media,
  caption = '',
  alias,
  link,
  compact = false,
  state,
  timeLabel,
  onPressLink,
  queueStyle = false,
  showAvatar = !queueStyle,
  showAnonymousLabel = !queueStyle,
  onDoubleTapLike,
  onSingleTap,
  onMorePress,
}: Props) {
  const uri = media?.url || media?.uri;
  const hasMedia = Boolean(uri);
  const hasText = Boolean(caption.trim());
  const [captionLineCount, setCaptionLineCount] = useState(0);
  const [captionExpanded, setCaptionExpanded] = useState(false);
  const [collapsedCaption, setCollapsedCaption] = useState(caption.trim());
  const captionLineLimit = hasMedia ? 2 : 12;
  const captionOverflow = captionLineCount > captionLineLimit || caption.trim().length > (hasMedia ? 110 : 650);
  const collapsedDisplayCaption = !captionExpanded && captionOverflow && collapsedCaption === caption.trim()
    ? caption.trim().slice(0, hasMedia ? 140 : 650).trim()
    : collapsedCaption;
  useEffect(() => {
    setCaptionExpanded(false);
    setCaptionLineCount(0);
    setCollapsedCaption(caption.trim());
  }, [caption]);
  const lastTap = useRef(0);
  const singleTapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (singleTapTimer.current) clearTimeout(singleTapTimer.current);
  }, []);
  const heart = useRef(new Animated.Value(0)).current;

  const burstHeart = () => {
    heart.setValue(0);
    Animated.sequence([
      Animated.timing(heart, {toValue: 1, duration: 160, useNativeDriver: true}),
      Animated.delay(420),
      Animated.timing(heart, {toValue: 0, duration: 220, useNativeDriver: true}),
    ]).start();
  };

  const handleMediaPress = () => {
    if (!onDoubleTapLike) return;
    const now = Date.now();
    if (now - lastTap.current < 280) {
      lastTap.current = 0;
      if (singleTapTimer.current) clearTimeout(singleTapTimer.current);
      burstHeart();
      onDoubleTapLike();
      return;
    }
    lastTap.current = now;
    if (onSingleTap) {
      singleTapTimer.current = setTimeout(() => {
        singleTapTimer.current = null;
        onSingleTap();
      }, 280);
    }
  };

  if (!hasMedia && !hasText) return null;

  const mediaBody = hasMedia ? (
    <View style={styles.mediaFrame}>
      {isVideo(media) ? (
        <Video
          source={{uri}}
          style={styles.media}
          resizeMode="cover"
          muted={false}
          repeat={false}
          paused
          controls
        />
      ) : (
        <Image source={{uri}} style={styles.media} resizeMode="cover" />
      )}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.heartBurst,
          {
            opacity: heart,
            transform: [
              {
                scale: heart.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.4, 1],
                }),
              },
            ],
          },
        ]}>
        <Feather name="heart" size={72} color={pastelColors.white} />
      </Animated.View>
    </View>
  ) : null;

  return (
    <View style={[styles.card, compact && styles.compact, queueStyle && styles.queueCard]}>
      {alias ? (
        <View style={styles.identity}>
          {showAvatar ? (
            <View style={[styles.avatar, {backgroundColor: aliasColor(alias)}]}>
              <Text style={styles.avatarText}>{alias.trim().charAt(0).toUpperCase() || '?'}</Text>
            </View>
          ) : null}
          <View style={styles.identityText}>
            <Text style={styles.alias}>{alias}</Text>
            {showAnonymousLabel || timeLabel ? (
              <Text style={styles.meta}>
                {showAnonymousLabel ? 'anonymous' : ''}
                {showAnonymousLabel && timeLabel ? '  ' : ''}
                {timeLabel || ''}
              </Text>
            ) : null}
          </View>
          {state ? <Text style={styles.state}>{state}</Text> : null}
          {onMorePress ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Post options" onPress={onMorePress} style={styles.moreButton}>
              <Feather name="more-vertical" size={19} color={pastelColors.auth.deepText} />
            </Pressable>
          ) : null}
        </View>
      ) : null}
      {hasMedia ? (
        onDoubleTapLike ? (
          <Pressable onPress={handleMediaPress} accessibilityRole="imagebutton">
            {mediaBody}
          </Pressable>
        ) : (
          mediaBody
        )
      ) : null}
      {hasText ? (
        <View>
          <Text
            pointerEvents="none"
            onTextLayout={event => {
              const lines = event.nativeEvent.lines.length;
              setCaptionLineCount(lines);
              if (!captionExpanded && lines > captionLineLimit && collapsedCaption === caption.trim()) {
                const estimatedLength = Math.max(24, Math.floor(caption.trim().length * (captionLineLimit / lines) * 0.9));
                const words = caption.trim().slice(0, estimatedLength).trim().split(/\s+/);
                words.pop();
                setCollapsedCaption(words.join(' '));
              }
            }}
            style={[styles.caption, !hasMedia && styles.textOnly, styles.measureCaption]}>
            {caption.trim()}
          </Text>
          {onDoubleTapLike ? (
            <Pressable onPress={handleMediaPress} accessibilityRole="text">
              <Text numberOfLines={captionExpanded ? undefined : captionLineLimit} style={[styles.caption, !hasMedia && styles.textOnly]}>
                {captionExpanded ? caption.trim() : collapsedDisplayCaption}
              </Text>
            </Pressable>
          ) : (
            <Text numberOfLines={captionExpanded ? undefined : captionLineLimit} style={[styles.caption, !hasMedia && styles.textOnly]}>
              {captionExpanded ? caption.trim() : collapsedDisplayCaption}
            </Text>
          )}
          {!captionExpanded && captionOverflow ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Show more caption"
              onPress={() => {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                setCaptionExpanded(true);
              }}
              style={styles.inlineMoreButton}>
              <Text style={styles.inlineMore}>... more</Text>
            </Pressable>
          ) : null}
          {captionOverflow && captionExpanded ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={captionExpanded ? 'Show less' : 'Show full caption'}
              onPress={() => {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                setCaptionExpanded(current => !current);
              }}
              style={styles.showMoreButton}>
              <Text style={styles.showMoreText}>{captionExpanded ? 'Show less' : 'Show more'}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
      {link ? (
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={`Open link ${link}`}
          onPress={
            onPressLink ||
            (() => {
              const href = /^(https?:)?\/\//i.test(link) ? link : `https://${link}`;
              Linking.openURL(href).catch(() => undefined);
            })
          }>
          <Text style={styles.link}>{link}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: pastelColors.auth.glassSurface,
    alignSelf: 'stretch',
  },
  queueCard: {backgroundColor: 'transparent'},
  compact: {backgroundColor: 'transparent'},
  identity: {
    paddingHorizontal: 14,
    paddingTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    height: 34,
    width: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {color: pastelColors.auth.deepText, fontWeight: '900'},
  identityText: {flex: 1},
  alias: {fontWeight: '900', color: pastelColors.accent},
  meta: {
    marginTop: 1,
    fontSize: 10,
    fontWeight: '700',
    color: pastelColors.auth.mutedText,
  },
  state: {
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: pastelColors.white,
    color: pastelColors.auth.mutedText,
    fontSize: 11,
    fontWeight: '800',
  },
  moreButton: {height: 40, width: 34, alignItems: 'center', justifyContent: 'center'},
  mediaFrame: {
    width: '100%',
    alignSelf: 'stretch',
    aspectRatio: 1,
    maxHeight: 480,
    backgroundColor: pastelColors.card,
    marginTop: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  media: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  heartBurst: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  caption: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 0,
    fontSize: 16,
    lineHeight: 22,
    color: pastelColors.auth.deepText,
    fontWeight: '600',
  },
  textOnly: {
    fontSize: 18,
    lineHeight: 26,
    fontWeight: '700',
    paddingTop: 12,
  },
  measureCaption: {position: 'absolute', left: 0, right: 0, opacity: 0, zIndex: -1},
  showMoreButton: {alignSelf: 'flex-start', paddingHorizontal: 14, paddingTop: 2, paddingBottom: 12},
  showMoreText: {color: pastelColors.accent, fontWeight: '900'},
  inlineMoreButton: {
    position: 'absolute',
    right: 14,
    bottom: 0,
    paddingLeft: 6,
    backgroundColor: pastelColors.auth.glassSurface,
  },
  inlineMore: {color: pastelColors.accent, fontSize: 14, fontWeight: '900'},
  link: {
    paddingHorizontal: 14,
    paddingBottom: 12,
    color: pastelColors.accent,
    fontWeight: '700',
  },
});
