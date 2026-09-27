import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
  Alert,
  Animated,
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
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {api} from '../../utils/api';
import {resolveCommunityImageUrl} from '../../utils/communityImageUpload';
import {adjustPhoto, isMediaPickerCancelled, pickAvatarPhoto} from '../../utils/mediaCrop';
import {pastelColors} from '../../theme/colors';
import type {CommunityStackParamList} from '../../navigation/CommunityStack';
import {ELLIPSIS, showCommunityToast} from './communityUx';
import {useKeyboardAwareScroll} from './communityKeyboard';

function AnimatedChoice({
  selected,
  title,
  copy,
  onPress,
}: {
  selected: boolean;
  title: string;
  copy: string;
  onPress: () => void;
}) {
  const progress = useRef(new Animated.Value(selected ? 1 : 0)).current;
  const bounce = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: selected ? 1 : 0,
      duration: 220,
      useNativeDriver: false,
    }).start();
    if (selected) {
      Animated.sequence([
        Animated.timing(bounce, {toValue: 0.97, duration: 90, useNativeDriver: true}),
        Animated.spring(bounce, {toValue: 1, friction: 5, tension: 160, useNativeDriver: true}),
      ]).start();
    } else {
      bounce.setValue(1);
    }
  }, [bounce, progress, selected]);

  const backgroundColor = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['#F7F0F3', pastelColors.auth.deepText],
  });
  const titleColor = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [pastelColors.auth.deepText, '#FFFFFF'],
  });
  const copyColor = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [pastelColors.auth.mutedText, '#F2E8EC'],
  });

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{selected}}
      onPress={onPress}>
      {/* Native-driver scale must not share a node with JS-driver colors. */}
      <Animated.View style={{transform: [{scale: bounce}]}}>
        <Animated.View style={[styles.option, {backgroundColor}]}>
          <Animated.Text style={[styles.optionTitle, {color: titleColor}]}>{title}</Animated.Text>
          <Animated.Text style={[styles.optionCopy, {color: copyColor}]}>{copy}</Animated.Text>
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

type Navigation = NativeStackNavigationProp<CommunityStackParamList>;
type JoinMode = 'open' | 'approval';
type Visibility = 'public' | 'members';
type Step = 0 | 1 | 2 | 3;

const joinOptions: Array<{value: JoinMode; title: string; copy: string}> = [
  {value: 'open', title: 'Open', copy: 'Anyone can join and start participating.'},
  {
    value: 'approval',
    title: 'Approval',
    copy: 'People request access with an alias or username reveal.',
  },
];

const steps = [
  'What should this place feel like?',
  'Who can join?',
  'What should stay private?',
  'Set the first rule',
] as const;

export default function CommunityCreateScreen() {
  const navigation = useNavigation<Navigation>();
  const {
    scrollRef,
    onInputFocus,
    contentPadding,
    KeyboardAvoidingView,
    keyboardAvoidingProps,
    scrollProps,
  } = useKeyboardAwareScroll();
  const [step, setStep] = useState<Step>(0);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [rules, setRules] = useState('');
  const [image, setImage] = useState('');
  const [visibility, setVisibility] = useState<Visibility>('public');
  const [joinMode, setJoinMode] = useState<JoinMode>('open');
  const [saving, setSaving] = useState(false);

  const canContinue = useMemo(() => {
    if (step === 0) return Boolean(name.trim());
    return true;
  }, [name, step]);

  const pickImage = async () => {
    try {
      const picked = await pickAvatarPhoto('communityCover');
      if (picked?.uri) setImage(picked.uri);
    } catch (error) {
      if (!isMediaPickerCancelled(error)) {
        Alert.alert('Could not pick image', 'Please try again.');
      }
    }
  };

  const adjustImage = async () => {
    if (!image) return;
    try {
      const adjusted = await adjustPhoto({uri: image}, 'communityCover');
      setImage(adjusted.uri);
    } catch (error) {
      if (!isMediaPickerCancelled(error)) {
        Alert.alert('Could not adjust', 'Please try again.');
      }
    }
  };

  const create = async () => {
    if (!name.trim()) {
      Alert.alert('Name required', 'Give your community a name.');
      return;
    }
    setSaving(true);
    try {
      const imageUrl = await resolveCommunityImageUrl(image);
      const response = await api.post('/communities', {
        name: name.trim(),
        description: description.trim(),
        rules: rules.trim(),
        image: imageUrl,
        contentVisibility: visibility,
        joinMode,
      });
      showCommunityToast('Community created');
      navigation.replace('CommunityHome', {community: response.data.community});
    } catch {
      Alert.alert('Could not create community', 'Please check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  const next = () => {
    if (step < 3) setStep((step + 1) as Step);
    else create();
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => (step === 0 ? navigation.goBack() : setStep((step - 1) as Step))}
          style={styles.iconButton}>
          <Feather name="arrow-left" size={22} color={pastelColors.auth.deepText} />
        </Pressable>
        <Text style={styles.headerTitle}>Create community</Text>
        <View style={styles.iconButton} />
      </View>

      <KeyboardAvoidingView {...keyboardAvoidingProps}>
      <ScrollView
        ref={scrollRef}
        {...scrollProps}
        contentContainerStyle={[styles.content, contentPadding]}>
        <View style={styles.progressRow}>
          {steps.map((_, index) => (
            <View
              key={steps[index]}
              style={[styles.progressDot, index <= step && styles.progressDotActive]}
            />
          ))}
        </View>
        <Text style={styles.stepLabel}>Step {step + 1} of 4</Text>
        <Text style={styles.title}>{steps[step]}</Text>

        {step === 0 ? (
          <>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Choose community image"
              onPress={pickImage}
              style={styles.imagePicker}>
              {image ? (
                <Image source={{uri: image}} style={styles.imagePreview} />
              ) : (
                <Feather name="camera" size={28} color={pastelColors.accent} />
              )}
            </Pressable>
            <Text style={styles.imageText}>{image ? 'Community photo' : 'Add community photo'}</Text>
            {image ? (
              <Pressable onPress={adjustImage} style={styles.removeImage}>
                <Text style={styles.removeImageText}>Adjust image</Text>
              </Pressable>
            ) : null}
            {image ? (
              <Pressable onPress={() => setImage('')} style={styles.removeImage}>
                <Text style={styles.removeImageText}>Remove image</Text>
              </Pressable>
            ) : null}
            <View style={styles.card}>
              <Text style={styles.label}>Name</Text>
              <TextInput
                accessibilityLabel="Community name"
                value={name}
                onChangeText={setName}
                onFocus={onInputFocus}
                placeholder="Late night thoughts"
                placeholderTextColor={pastelColors.auth.mutedText}
                style={styles.input}
              />
              <Text style={styles.helper}>A short, inviting name people can feel.</Text>
              <Text style={styles.label}>Description</Text>
              <TextInput
                accessibilityLabel="Community description"
                value={description}
                onChangeText={setDescription}
                onFocus={onInputFocus}
                placeholder="A place for things people think but rarely say."
                placeholderTextColor={pastelColors.auth.mutedText}
                style={[styles.input, styles.multiline]}
                multiline
                scrollEnabled
              />
              <Text style={styles.helper}>One sentence on the mood of this corner.</Text>
            </View>
          </>
        ) : null}

        {step === 1 ? (
          <View style={styles.card}>
            <Text style={styles.lead}>Set how people enter this space.</Text>
            {joinOptions.map(option => (
              <AnimatedChoice
                key={option.value}
                selected={joinMode === option.value}
                title={option.title}
                copy={option.copy}
                onPress={() => setJoinMode(option.value)}
              />
            ))}
          </View>
        ) : null}

        {step === 2 ? (
          <View style={styles.card}>
            <Text style={styles.lead}>Choose what visitors can see before joining.</Text>
            {(['public', 'members'] as const).map(value => (
              <AnimatedChoice
                key={value}
                selected={visibility === value}
                title={value === 'public' ? 'Public feed' : 'Members-only'}
                copy={
                  value === 'public'
                    ? 'Anyone can read posts before joining.'
                    : 'Only approved members can read posts.'
                }
                onPress={() => setVisibility(value)}
              />
            ))}
          </View>
        ) : null}

        {step === 3 ? (
          <View style={styles.card}>
            <Text style={styles.lead}>A clear first rule builds trust.</Text>
            <TextInput
              accessibilityLabel="Community rules"
              value={rules}
              onChangeText={setRules}
              onFocus={onInputFocus}
              placeholder="Be kind. No exposing real identities. No targeted hate."
              placeholderTextColor={pastelColors.auth.mutedText}
              style={[styles.input, styles.multiline]}
              multiline
              scrollEnabled
            />
            <Text style={styles.helper}>
              Members will see this under "Before you post here."
            </Text>
          </View>
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={step === 3 ? 'Create community' : 'Continue'}
          onPress={next}
          disabled={!canContinue || saving}
          style={[styles.button, (!canContinue || saving) && styles.disabled]}>
          <Text style={styles.buttonText}>
            {saving ? `Creating${ELLIPSIS}` : step === 3 ? 'Create community' : 'Continue'}
          </Text>
        </Pressable>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: pastelColors.auth.background},
  header: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconButton: {height: 44, width: 44, alignItems: 'center', justifyContent: 'center'},
  headerTitle: {fontSize: 17, fontWeight: '900', color: pastelColors.auth.deepText},
  content: {padding: 20, paddingBottom: 36},
  progressRow: {flexDirection: 'row', gap: 8, marginBottom: 10},
  progressDot: {
    flex: 1,
    height: 6,
    borderRadius: 999,
    backgroundColor: pastelColors.white,
  },
  progressDotActive: {backgroundColor: pastelColors.accent},
  stepLabel: {color: pastelColors.auth.mutedText, fontWeight: '800', fontSize: 12},
  title: {marginTop: 6, fontSize: 26, fontWeight: '900', color: pastelColors.auth.deepText},
  imagePicker: {
    marginTop: 18,
    alignSelf: 'center',
    height: 116,
    width: 116,
    borderRadius: 58,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: pastelColors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: pastelColors.auth.glassSurface,
  },
  imagePreview: {height: '100%', width: '100%', borderRadius: 58},
  imageText: {
    marginTop: 10,
    alignSelf: 'center',
    color: pastelColors.accent,
    fontWeight: '900',
  },
  removeImage: {marginTop: 10, alignSelf: 'center'},
  removeImageText: {color: pastelColors.auth.mutedText, fontWeight: '800'},
  card: {marginTop: 16, padding: 14, borderRadius: 12, backgroundColor: pastelColors.white},
  lead: {marginBottom: 8, color: pastelColors.auth.mutedText, fontWeight: '600'},
  label: {marginTop: 12, marginBottom: 8, fontWeight: '900', color: pastelColors.auth.deepText},
  helper: {marginTop: 6, color: pastelColors.auth.mutedText, fontSize: 12, fontWeight: '600'},
  input: {
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: pastelColors.auth.background,
    color: pastelColors.auth.deepText,
    fontWeight: '700',
  },
  multiline: {height: 112, maxHeight: 112, textAlignVertical: 'top'},
  option: {
    marginTop: 10,
    padding: 13,
    borderRadius: 10,
    backgroundColor: pastelColors.auth.glassSurface,
  },
  optionTitle: {fontWeight: '900', color: pastelColors.auth.deepText},
  optionCopy: {
    marginTop: 4,
    color: pastelColors.auth.mutedText,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 17,
  },
  button: {
    marginTop: 22,
    minHeight: 48,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: pastelColors.accent,
  },
  disabled: {opacity: 0.6},
  buttonText: {color: pastelColors.white, fontSize: 16, fontWeight: '900'},
});
