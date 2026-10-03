import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  StyleSheet,
  View,
} from 'react-native';
import {Gesture} from 'react-native-gesture-handler';
import Svg, {Path} from 'react-native-svg';
import Feather from 'react-native-vector-icons/Feather';
import {pastelColors} from '../../theme/colors';

const MAX_HEIGHT = 112;
const RELEASE_HEIGHT = 72;
const HOLD_HEIGHT = 64;
type Phase = 'idle' | 'pulling' | 'armed' | 'refreshing' | 'success' | 'error' | 'settling';

/** Native scrolling and this pan observe the same finger, including on Android
 * where the list itself cannot overscroll. Only movement past the end counts. */
export function useCommunityPullUpRefresh({enabled, onRefresh}: {
  enabled: boolean;
  onRefresh: () => Promise<boolean>;
}) {
  const height = useRef(new Animated.Value(0)).current;
  const rotation = useRef(new Animated.Value(0)).current;
  const [phase, setPhase] = useState<Phase>('idle');
  const state = useRef({
    phase: 'idle' as Phase, pull: 0, baseline: 0, tracking: false,
    viewport: 0, content: 0, offset: 0, mounted: true, generation: 0,
  }).current;
  const latest = useRef({enabled, onRefresh});
  latest.current = {enabled, onRefresh};
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const [reduceMotion, setReduceMotion] = useState(false);

  const changePhase = useCallback((next: Phase) => {
    state.phase = next;
    if (state.mounted) setPhase(next);
  }, [state]);
  const close = useCallback(() => {
    state.tracking = false;
    if (state.pull === 0 && state.phase === 'idle') return;
    state.pull = 0;
    changePhase('settling');
    Animated.timing(height, {
      toValue: 0, duration: reduceMotion ? 0 : 220,
      easing: Easing.out(Easing.cubic), useNativeDriver: true,
    }).start(({finished}) => {
      if (finished && state.mounted) changePhase('idle');
    });
  }, [changePhase, height, reduceMotion, state]);

  const refresh = useCallback(() => {
    if (!latest.current.enabled || ['refreshing', 'success', 'error', 'settling'].includes(state.phase)) return;
    state.tracking = false;
    const generation = ++state.generation;
    const started = Date.now();
    changePhase('refreshing');
    AccessibilityInfo.announceForAccessibility('Refreshing community feed');
    Animated.timing(height, {
      toValue: HOLD_HEIGHT, duration: reduceMotion ? 0 : 180,
      easing: Easing.out(Easing.cubic), useNativeDriver: true,
    }).start();
    Promise.resolve().then(() => latest.current.onRefresh()).catch(() => false).then(success => {
      if (!state.mounted || generation !== state.generation) return;
      timers.current.push(setTimeout(() => {
        if (!state.mounted || generation !== state.generation) return;
        changePhase(success ? 'success' : 'error');
        AccessibilityInfo.announceForAccessibility(success ? 'Community feed updated' : 'Could not refresh. Pull up to retry.');
        timers.current.push(setTimeout(close, success ? 600 : 1000));
      }, Math.max(0, 500 - (Date.now() - started))));
    });
  }, [changePhase, close, height, reduceMotion, state]);

  useEffect(() => {
    state.mounted = true;
    const pendingTimers = timers.current;
    AccessibilityInfo.isReduceMotionEnabled().then(value => {
      if (state.mounted) setReduceMotion(value);
    }).catch(() => undefined);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      state.mounted = false;
      state.generation += 1;
      pendingTimers.forEach(clearTimeout);
      height.stopAnimation();
      rotation.stopAnimation();
      subscription.remove();
    };
  }, [height, rotation, state]);

  useEffect(() => {
    if (!enabled && state.tracking) close();
  }, [enabled, close, state]);

  useEffect(() => {
    rotation.setValue(0);
    if (phase !== 'refreshing' || reduceMotion) return;
    const animation = Animated.loop(Animated.timing(rotation, {
      toValue: 1, duration: 850, easing: Easing.linear,
      useNativeDriver: true, isInteraction: false,
    }));
    animation.start();
    return () => animation.stop();
  }, [phase, reduceMotion, rotation]);

  const gesture = useMemo(() => Gesture.Simultaneous(
    Gesture.Native(),
    Gesture.Pan().runOnJS(true).maxPointers(1).activeOffsetY([-8, 8]).failOffsetX([-24, 24])
      .onBegin(() => {
        state.baseline = 0;
        state.tracking = latest.current.enabled && state.phase === 'idle';
      })
      .onUpdate(event => {
        if (!state.tracking || !latest.current.enabled) return;
        const atEnd = state.viewport > 0 && state.offset >= Math.max(0, state.content - state.viewport) - 2;
        if (!atEnd && state.pull === 0) {
          state.baseline = event.translationY;
          return;
        }
        // Rubber-band resistance: ~144pt of upward finger travel arms refresh.
        const distance = Math.max(0, state.baseline - event.translationY);
        state.pull = Math.min(MAX_HEIGHT, distance * 0.5);
        height.setValue(state.pull);
        const next = state.pull >= RELEASE_HEIGHT ? 'armed' : state.pull > 0 ? 'pulling' : 'idle';
        if (next !== state.phase) changePhase(next);
      })
      .onEnd((_event, success) => {
        if (!state.tracking) return;
        if (success && state.pull >= RELEASE_HEIGHT && latest.current.enabled) refresh();
        else close();
      })
      .onFinalize(() => {
        // OS interruptions/multitouch must never trigger a refresh.
        if (state.tracking) close();
      }),
  ), [changePhase, close, height, refresh, state]);

  const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const {contentOffset, contentSize, layoutMeasurement} = event.nativeEvent;
    state.offset = contentOffset.y;
    if (contentSize) state.content = contentSize.height;
    if (layoutMeasurement) state.viewport = layoutMeasurement.height;
  }, [state]);
  const onLayout = useCallback((event: LayoutChangeEvent) => {
    state.viewport = event.nativeEvent.layout.height;
  }, [state]);
  const onContentSizeChange = useCallback((_width: number, contentHeight: number) => {
    state.content = contentHeight;
  }, [state]);
  const active = phase !== 'idle';
  const icon = phase === 'success' ? 'check' : phase === 'error' ? 'alert-circle'
    : phase === 'armed' || phase === 'refreshing' ? 'refresh-cw' : 'arrow-up';

  return {
    gesture, active, onScroll, onLayout, onContentSizeChange, refresh,
    contentStyle: {transform: [{translateY: Animated.multiply(height, -1)}]},
    indicator: (
      <View pointerEvents="none" style={StyleSheet.absoluteFill} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Animated.View style={[styles.dome, {transform: [
          {translateY: Animated.divide(Animated.subtract(MAX_HEIGHT, height), 2)},
          {scaleY: Animated.divide(height, MAX_HEIGHT)},
        ]}]}>
          <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
            <Path d="M 0 100 A 50 100 0 0 1 100 100 Z" fill="#FFC4D6" />
          </Svg>
        </Animated.View>
        <Animated.View style={[styles.icon, {
          opacity: height.interpolate({inputRange: [0, 24, 48], outputRange: [0, 0, 1], extrapolate: 'clamp'}),
          transform: [{translateY: Animated.multiply(height, -0.42)}, {
            rotate: rotation.interpolate({inputRange: [0, 1], outputRange: ['0deg', '360deg']}),
          }],
        }]}>
          <Feather name={icon} size={24} color={pastelColors.accent} />
        </Animated.View>
      </View>
    ),
  };
}

const styles = StyleSheet.create({
  dome: {position: 'absolute', bottom: 0, left: 0, right: 0, height: MAX_HEIGHT},
  icon: {position: 'absolute', bottom: -12, left: 0, right: 0, alignItems: 'center'},
});
