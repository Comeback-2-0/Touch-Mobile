import React, {useEffect, useRef} from 'react';
import {
  Animated,
  Image,
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
import ExpandableCommunityCaption from './ExpandableCommunityCaption';

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
  onCaptionAnimationChange?: (active: boolean) => void;
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
  onCaptionAnimationChange,
}: Props) {
  const uri = media?.url || media?.uri;
  const hasMedia = Boolean(uri);
  const hasText = Boolean(caption.trim());
  const captionLineLimit = hasMedia ? 2 : 12;
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
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Post options"
              accessibilityHint="Opens actions for this post"
              hitSlop={10}
              android_ripple={{color: pastelColors.auth.primaryOverlay}}
              onPress={onMorePress}
              style={({pressed}) => [styles.moreButton, pressed && styles.moreButtonPressed]}>
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
        <ExpandableCommunityCaption
          key={`${captionLineLimit}:${caption}`}
          caption={caption.trim()}
          collapsedLines={captionLineLimit}
          lineHeight={hasMedia ? 22 : 26}
          textStyle={[styles.caption, !hasMedia && styles.textOnly]}
          onPress={onDoubleTapLike ? handleMediaPress : undefined}
          onAnimationChange={onCaptionAnimationChange}
        />
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
    paddingTop: 6,
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
    marginTop: 0,
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
  moreButton: {
    height: 34,
    width: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreButtonPressed: {backgroundColor: pastelColors.auth.primaryOverlay},
  mediaFrame: {
    width: '100%',
    alignSelf: 'stretch',
    aspectRatio: 1,
    maxHeight: 480,
    backgroundColor: pastelColors.card,
    marginTop: 2,
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
    paddingBottom: 0,
    fontSize: 16,
    lineHeight: 18,
    color: pastelColors.auth.deepText,
    fontWeight: '700',
  },
  textOnly: {
    fontSize: 18,
    lineHeight: 20,
    fontWeight: '700',
  },
  link: {
    paddingHorizontal: 14,
    paddingBottom: 12,
    color: pastelColors.accent,
    fontWeight: '700',
  },
});
