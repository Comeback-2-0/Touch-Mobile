import {useCallback, useEffect, useRef, useState} from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';

const FIELD_GAP = 28;
const RESTING_PAD = 48;

export function extraScrollPadding(keyboardHeight: number) {
  return keyboardHeight > 0 ? keyboardHeight + FIELD_GAP : RESTING_PAD;
}

export function scrollOffsetToRevealField(
  currentOffset: number,
  fieldBottom: number,
  visibleBottom: number,
) {
  const overflow = fieldBottom - visibleBottom;
  if (overflow <= 0) return Math.max(0, currentOffset);
  return currentOffset + overflow;
}

export function useKeyboardHeight() {
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      e => setKeyboardHeight(e.endCoordinates.height),
    );
    const hide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardHeight(0),
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return keyboardHeight;
}

export function useKeyboardAwareScroll() {
  const scrollRef = useRef<ScrollView>(null);
  const offsetY = useRef(0);
  const keyboardHeight = useKeyboardHeight();

  const onInputFocus = useCallback(() => {
    // Android still needs the delayed end-scroll workaround. On iOS,
    // KeyboardAvoidingView plus automatic keyboard insets already manage the
    // viewport; forcing the whole form to the end hides the focused field.
    if (Platform.OS !== 'android') return;

    const delay = 320;
    setTimeout(() => {
      // React Native's New Architecture no longer guarantees the legacy
      // Keep the existing Android behavior without relying on the deprecated
      // findNodeHandle/UIManager measurement path.
      scrollRef.current?.scrollToEnd({animated: true});
    }, delay);
  }, []);

  return {
    scrollRef,
    onInputFocus,
    keyboardHeight,
    contentPadding: {paddingBottom: extraScrollPadding(keyboardHeight)},
    KeyboardAvoidingView,
    keyboardAvoidingProps: {
      style: {flex: 1} as const,
      behavior: 'padding' as const,
      keyboardVerticalOffset: Platform.OS === 'ios' ? 8 : 0,
    },
    scrollProps: {
      keyboardShouldPersistTaps: 'handled' as const,
      keyboardDismissMode: 'interactive' as const,
      automaticallyAdjustKeyboardInsets: true,
      showsVerticalScrollIndicator: false as const,
      onScroll: (event: {nativeEvent: {contentOffset: {y: number}}}) => {
        offsetY.current = event.nativeEvent.contentOffset.y;
      },
      scrollEventThrottle: 16,
    },
  };
}
