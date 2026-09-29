import React, {useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';
import {launchImageLibrary} from 'react-native-image-picker';
import Video from 'react-native-video';
import {RouteProp, useNavigation, useRoute} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {api} from '../../utils/api';
import {adjustPhoto, isMediaPickerCancelled} from '../../utils/mediaCrop';
import {pastelColors} from '../../theme/colors';
import type {CommunityStackParamList} from '../../navigation/CommunityStack';
import {
  COMPOSER_PROMPTS,
  MAX_ALIAS_LENGTH,
  MIN_ALIAS_LENGTH,
  showCommunityToast,
  suggestCommunityAlias,
} from './communityUx';
import {useKeyboardAwareScroll} from './communityKeyboard';
import CommunityConfirmSheet from './CommunityConfirmSheet';

type Route = RouteProp<CommunityStackParamList, 'CommunityCompose'>;
type Navigation = NativeStackNavigationProp<CommunityStackParamList>;

const PREVIEW = Math.min(Dimensions.get('window').width - 32, 420);
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_VIDEO_BYTES = 25 * 1024 * 1024;
const MAX_VIDEO_SECONDS = 30;

export default function CommunityComposeScreen() {
  const navigation = useNavigation<Navigation>();
  const {
    params: {community},
  } = useRoute<Route>();
  const [alias, setAlias] = useState(suggestCommunityAlias);
  const [text, setText] = useState('');
  const [media, setMedia] = useState<any>(null);
  const [sending, setSending] = useState(false);
  const [aliasConfirmOpen, setAliasConfirmOpen] = useState(false);
  const [promptIndex, setPromptIndex] = useState(0);
  const {
    scrollRef,
    onInputFocus,
    contentPadding,
    KeyboardAvoidingView,
    keyboardAvoidingProps,
    scrollProps,
  } = useKeyboardAwareScroll();

  useEffect(() => {
    setPromptIndex(Math.floor(Math.random() * COMPOSER_PROMPTS.length));
    const timer = setInterval(() => {
      setPromptIndex(current => (current + 1) % COMPOSER_PROMPTS.length);
    }, 7000);
    return () => clearInterval(timer);
  }, []);

  const placeholder = useMemo(() => COMPOSER_PROMPTS[promptIndex], [promptIndex]);
  const trimmedAlias = alias.trim();
  const aliasError =
    trimmedAlias.length > 0 && trimmedAlias.length < MIN_ALIAS_LENGTH
      ? `Name needs at least ${MIN_ALIAS_LENGTH} characters`
      : trimmedAlias.length > MAX_ALIAS_LENGTH
        ? `Name can be ${MAX_ALIAS_LENGTH} characters or fewer`
        : '';
  const canSubmit = Boolean((text.trim() || media) && trimmedAlias && !aliasError);
  const isVideo = Boolean(media?.type?.startsWith('video') || media?.duration);

  const pickMedia = async () => {
    const result = await launchImageLibrary({
      mediaType: 'mixed',
      selectionLimit: 1,
      videoQuality: 'medium',
    });
    const asset = result.assets?.[0];
    if (!asset) return;
    const isPickedVideo = Boolean(asset.type?.startsWith('video') || asset.duration);
    if (isPickedVideo && Number(asset.duration || 0) > MAX_VIDEO_SECONDS) {
      Alert.alert('Clip is too long', 'Videos and clips must be 30 seconds or shorter.');
      return;
    }
    if (isPickedVideo && Number(asset.fileSize || 0) > MAX_VIDEO_BYTES) {
      Alert.alert('Clip is too large', 'Videos and clips must be 25 MB or smaller.');
      return;
    }
    if (!isPickedVideo && Number(asset.fileSize || 0) > MAX_IMAGE_BYTES) {
      Alert.alert('Image is too large', 'Images, memes, and stickers must be 5 MB or smaller.');
      return;
    }
    setMedia(asset);
  };

  const adjustMedia = async () => {
    if (!media?.uri) return;
    const mediaIsVideo = Boolean(media?.type?.startsWith('video') || media?.duration);
    if (mediaIsVideo) return;
    try {
      const adjusted = await adjustPhoto({uri: media.uri}, 'communityCompose');
      setMedia({
        ...media,
        uri: adjusted.uri,
        type: adjusted.type,
        fileName: adjusted.fileName,
        fileSize: undefined,
      });
    } catch (error) {
      if (!isMediaPickerCancelled(error)) {
        Alert.alert('Could not adjust', 'Please try again.');
      }
    }
  };

  const submit = async () => {
    if (!canSubmit || sending) return;
    setAliasConfirmOpen(true);
  };

  const submitConfirmed = async () => {
    if (!canSubmit || sending) return;
    setSending(true);
    try {
      const form = new FormData();
      form.append('text', text);
      form.append('alias', trimmedAlias);
      if (media) {
        form.append('media', {
          uri: media.uri,
          type: media.type || 'image/jpeg',
          name: media.fileName || 'community-media',
        } as any);
      }
      await api.post(`/communities/${community.id || community._id}/content/queue`, form, {
        headers: {'Content-Type': 'multipart/form-data'},
      });
      showCommunityToast('Sent to the review queue');
      navigation.goBack();
    } catch (err: any) {
      Alert.alert(
        'Could not submit',
        err?.response?.data?.error || 'Please try again.',
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Close composer"
          style={styles.iconButton}>
          <Feather name="x" size={24} color={pastelColors.auth.deepText} />
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>
          {community.name || 'Community'}
        </Text>
        <Pressable
          onPress={submit}
          disabled={sending || !canSubmit}
          accessibilityRole="button"
          accessibilityLabel="Send to queue"
          style={styles.submitButton}>
          <Text style={[styles.submit, (sending || !canSubmit) && styles.disabled]}>
            {sending ? '...' : 'Post'}
          </Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView {...keyboardAvoidingProps}>
        <ScrollView
          ref={scrollRef}
          {...scrollProps}
          contentContainerStyle={[styles.content, contentPadding]}>
          <View style={styles.note}>
            <Text style={styles.noteTitle}>Posted under an alias</Text>
            <Text style={styles.noteCopy}>
              Your public profile stays hidden. Pick a name for this post, then send it to the
              review queue.
            </Text>
          </View>

          <Text style={styles.aliasLabel}>YOUR POST ALIAS</Text>
          <TextInput
            accessibilityLabel="Editable alias"
            value={alias}
            onChangeText={setAlias}
            onFocus={onInputFocus}
            maxLength={MAX_ALIAS_LENGTH}
            placeholder="Choose a name"
            placeholderTextColor={pastelColors.auth.mutedText}
            style={styles.aliasInput}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Text style={styles.aliasHint}>This is the name people will see on your post and comments.</Text>
          {aliasError ? <Text style={styles.aliasError}>{aliasError}</Text> : null}

          {media ? (
            <View style={[styles.previewTile, {width: PREVIEW, height: PREVIEW}]}>
              {isVideo ? (
                <Video
                  source={{uri: media.uri}}
                  style={styles.previewMedia}
                  resizeMode="contain"
                  paused
                  controls
                />
              ) : (
                <Image source={{uri: media.uri}} style={styles.previewMedia} resizeMode="contain" />
              )}
              {!isVideo ? (
                <Pressable
                  onPress={adjustMedia}
                  accessibilityRole="button"
                  accessibilityLabel="Adjust image"
                  style={styles.adjustChip}>
                  <Feather name="crop" size={16} color={pastelColors.white} />
                  <Text style={styles.removeLabel}>Adjust</Text>
                </Pressable>
              ) : null}
              <Pressable onPress={() => setMedia(null)} style={styles.removeChip}>
                <Feather name="x" size={16} color={pastelColors.white} />
                <Text style={styles.removeLabel}>Remove</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={pickMedia}
              style={styles.add}
              accessibilityRole="button"
              accessibilityLabel="Add one image, sticker, meme, or video">
              <Feather name="image" size={28} color={pastelColors.accent} />
              <View style={styles.addTextWrap}>
                <Text style={styles.addText}>Add meme, image, sticker, or clip</Text>
                <Text style={styles.addHint}>Optional | 1 item | Images 5 MB | Clips 30s / 25 MB</Text>
              </View>
            </Pressable>
          )}

          <TextInput
            value={text}
            onChangeText={setText}
            onFocus={onInputFocus}
            multiline
            scrollEnabled
            placeholder={placeholder}
            placeholderTextColor={pastelColors.auth.mutedText}
            style={[styles.text, !media && styles.textOnly]}
          />

          {sending ? <ActivityIndicator style={styles.loading} color={pastelColors.accent} /> : null}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Send to queue"
            onPress={submit}
            disabled={sending || !canSubmit}
            style={[styles.bottomCta, (sending || !canSubmit) && styles.bottomCtaDisabled]}>
            {sending ? (
              <ActivityIndicator color={pastelColors.white} />
            ) : (
              <Text style={styles.bottomCtaText}>Send to queue</Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
      <CommunityConfirmSheet
        visible={aliasConfirmOpen}
        title="Confirm your post alias"
        message={`Your post and comments will appear as ${trimmedAlias}. You can’t change this alias later.`}
        confirmLabel="Post"
        cancelLabel="Keep editing"
        onConfirm={() => {
          setAliasConfirmOpen(false);
          submitConfirmed();
        }}
        onCancel={() => setAliasConfirmOpen(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: pastelColors.auth.background},
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconButton: {height: 44, width: 44, alignItems: 'center', justifyContent: 'center'},
  submitButton: {minWidth: 56, minHeight: 44, alignItems: 'flex-end', justifyContent: 'center'},
  title: {
    flex: 1,
    marginHorizontal: 8,
    fontSize: 18,
    fontWeight: '900',
    color: pastelColors.auth.deepText,
    textAlign: 'center',
  },
  submit: {fontWeight: '900', color: pastelColors.accent, fontSize: 16},
  disabled: {opacity: 0.4},
  content: {paddingHorizontal: 16, paddingBottom: 32},
  note: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: pastelColors.auth.primaryOverlay,
    marginBottom: 14,
  },
  noteTitle: {fontWeight: '900', color: pastelColors.auth.deepText},
  noteCopy: {
    marginTop: 4,
    color: pastelColors.auth.mutedText,
    fontWeight: '700',
    lineHeight: 18,
  },
  label: {
    marginBottom: 8,
    fontWeight: '900',
    color: pastelColors.auth.deepText,
  },
  aliasLabel: {
    marginBottom: 8,
    fontSize: 11,
    letterSpacing: 1.1,
    fontWeight: '900',
    color: pastelColors.auth.mutedText,
  },
  aliasInput: {
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: pastelColors.white,
    color: pastelColors.accent,
    fontWeight: '900',
    fontSize: 16,
  },
  aliasError: {marginTop: 6, color: pastelColors.error, fontWeight: '800', fontSize: 12},
  aliasHint: {
    marginTop: 6,
    color: pastelColors.auth.mutedText,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 17,
  },
  previewTile: {
    marginTop: 14,
    alignSelf: 'center',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: pastelColors.auth.primaryOverlay,
  },
  previewMedia: {width: '100%', height: '100%'},
  removeChip: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(50,17,31,0.72)',
  },
  adjustChip: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(50,17,31,0.72)',
  },
  removeLabel: {color: pastelColors.white, fontWeight: '800', fontSize: 12},
  add: {
    marginTop: 14,
    minHeight: 72,
    padding: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: pastelColors.accent,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    backgroundColor: pastelColors.auth.glassSurface,
  },
  addTextWrap: {flex: 1},
  addText: {fontWeight: '800', color: pastelColors.accent},
  addHint: {color: pastelColors.auth.mutedText, fontWeight: '600', fontSize: 12},
  text: {
    marginTop: 12,
    height: 112,
    maxHeight: 112,
    padding: 14,
    borderRadius: 12,
    backgroundColor: pastelColors.white,
    color: pastelColors.auth.deepText,
    fontSize: 17,
    textAlignVertical: 'top',
  },
  textOnly: {height: 160, maxHeight: 160, fontSize: 18, lineHeight: 26, fontWeight: '600'},
  loading: {marginTop: 16},
  bottomCta: {
    marginTop: 22,
    minHeight: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: pastelColors.accent,
  },
  bottomCtaDisabled: {opacity: 0.55},
  bottomCtaText: {color: pastelColors.white, fontWeight: '900', fontSize: 16},
});
