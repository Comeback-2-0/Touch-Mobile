import React, {createContext, useCallback, useContext, useEffect, useMemo, useRef, useState} from 'react';
import {AccessibilityInfo, Animated, AppState, Easing, Keyboard, StyleSheet} from 'react-native';
import {BottomTabBar, type BottomTabBarProps} from '@react-navigation/bottom-tabs';
import {getFocusedRouteNameFromRoute} from '@react-navigation/native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

const HIDE_DELAY = 3000;

function useTabBarController() {
  const {bottom: bottomInset} = useSafeAreaInsets();
  const [height, setHeight] = useState(49 + bottomInset);
  const [focused, setFocused] = useState(false);
  const [scrollable, setScrollable] = useState(false);
  const [shown, setShown] = useState(true);
  const [screenReader, setScreenReader] = useState(true);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [active, setActive] = useState(AppState.currentState !== 'background' && AppState.currentState !== 'inactive');
  const [keyboard, setKeyboard] = useState(Keyboard.isVisible());
  const progress = useRef(new Animated.Value(1)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const canHide = focused && scrollable && !screenReader && active && !keyboard;
  const canHideRef = useRef(canHide);
  canHideRef.current = canHide;

  const clearTimer = useCallback(() => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
  }, []);
  const reveal = useCallback(() => {
    clearTimer();
    setShown(true);
    if (canHideRef.current) {
      timer.current = setTimeout(() => {
        timer.current = null;
        if (canHideRef.current) setShown(false);
      }, HIDE_DELAY);
    }
  }, [clearTimer]);
  const hide = useCallback(() => {
    if (!canHideRef.current) return;
    clearTimer();
    setShown(false);
  }, [clearTimer]);

  useEffect(() => {
    reveal();
    return clearTimer;
  }, [focused, scrollable, screenReader, active, keyboard, reveal, clearTimer]);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isScreenReaderEnabled().then(value => {
      if (mounted) setScreenReader(value);
    }).catch(() => undefined);
    AccessibilityInfo.isReduceMotionEnabled().then(value => {
      if (mounted) setReduceMotion(value);
    }).catch(() => undefined);
    const subscriptions = [
      AccessibilityInfo.addEventListener('screenReaderChanged', setScreenReader),
      AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion),
      AppState.addEventListener('change', value => setActive(value === 'active')),
      Keyboard.addListener('keyboardDidShow', () => setKeyboard(true)),
      Keyboard.addListener('keyboardDidHide', () => setKeyboard(false)),
    ];
    return () => {
      mounted = false;
      subscriptions.forEach(subscription => subscription.remove());
    };
  }, []);

  const visible = !keyboard && (!focused || !scrollable || screenReader || shown);
  useEffect(() => {
    // Stop at the current value so rapid scroll reversals remain continuous.
    progress.stopAnimation();
    const animation = Animated.timing(progress, {
      toValue: visible ? 1 : 0,
      duration: reduceMotion ? 0 : 220,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [visible, reduceMotion, progress]);

  return useMemo(() => ({
    visible, progress, height, bottomInset, setHeight, setFocused, setScrollable, hide, reveal,
  }), [visible, progress, height, bottomInset, hide, reveal]);
}

const Context = createContext<ReturnType<typeof useTabBarController> | null>(null);

export function CommunityTabBarProvider({children}: {children: React.ReactNode}) {
  const value = useTabBarController();
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useCommunityTabBar() {
  const value = useContext(Context);
  if (!value) throw new Error('Community tab bar requires CommunityTabBarProvider');
  return value;
}

export function CommunityTabBar(props: BottomTabBarProps) {
  const {visible, progress, height, setHeight} = useCommunityTabBar();
  const route = props.state.routes[props.state.index];
  const isCommunity = route.name === 'ChatTab';
  const nestedRoute = getFocusedRouteNameFromRoute(route) || 'CommunityBrowse';

  // Keep route nesting for existing push notifications and shared links.
  if (isCommunity && nestedRoute !== 'CommunityBrowse') return null;
  if (!isCommunity) return <BottomTabBar {...props} />;

  // The shared animation also moves the create button. Avoid a second keyboard
  // animation inside BottomTabBar, which would collapse its measured height.
  const descriptors = {
    ...props.descriptors,
    [route.key]: {
      ...props.descriptors[route.key],
      options: {...props.descriptors[route.key].options, tabBarHideOnKeyboard: false},
    },
  };
  return (
    <Animated.View
      testID="community-tab-bar"
      pointerEvents={visible ? 'auto' : 'none'}
      accessibilityElementsHidden={!visible}
      importantForAccessibility={visible ? 'auto' : 'no-hide-descendants'}
      onLayout={event => {
        const measuredHeight = event.nativeEvent.layout.height;
        if (measuredHeight > 0) setHeight(measuredHeight);
      }}
      style={[styles.overlay, {
        transform: [{translateY: progress.interpolate({inputRange: [0, 1], outputRange: [height + 12, 0]})}],
      }]}>
      <BottomTabBar {...props} descriptors={descriptors} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 10, elevation: 10},
});
