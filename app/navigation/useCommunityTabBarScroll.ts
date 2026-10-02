import {useCallback, useEffect, useRef, useState} from 'react';
import type {LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent} from 'react-native';
import {useIsFocused} from '@react-navigation/native';
import {useCommunityTabBar} from './CommunityTabBar';

const DIRECTION_THRESHOLD = 12;
type ScrollEvent = NativeSyntheticEvent<NativeScrollEvent>;

export function useCommunityTabBarScroll({enabled, bottomClearance}: {enabled: boolean; bottomClearance: number}) {
  const {setFocused, setScrollable, hide, reveal} = useCommunityTabBar();
  const focused = useIsFocused();
  const [viewport, setViewport] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);
  const gesture = useRef({active: false, momentumUntil: 0, offset: 0, distance: 0, pullDistance: 0});

  const onGestureBegin = useCallback(() => {
    // Android may stop a fling without sending momentum-end when touched.
    gesture.current.active = false;
    gesture.current.momentumUntil = 0;
    gesture.current.distance = 0;
    gesture.current.pullDistance = 0;
  }, []);
  const onGesturePull = useCallback((translationY: number) => {
    const current = gesture.current;
    if (focused && enabled && current.offset <= 0 && translationY - current.pullDistance >= DIRECTION_THRESHOLD) {
      reveal();
      current.pullDistance = translationY;
    }
  }, [enabled, focused, reveal]);

  useEffect(() => {
    setFocused(focused);
    onGestureBegin();
    return () => setFocused(false);
  }, [focused, setFocused, onGestureBegin]);
  useEffect(() => {
    setScrollable(enabled && viewport > 0 && contentHeight - bottomClearance > viewport + 1);
    return () => setScrollable(false);
  }, [enabled, viewport, contentHeight, bottomClearance, setScrollable]);

  const onScroll = useCallback((event: ScrollEvent) => {
    const {contentOffset, contentSize, layoutMeasurement} = event.nativeEvent;
    const current = gesture.current;
    const maxOffset = Math.max(0, contentSize.height - layoutMeasurement.height);
    const offset = Math.max(0, Math.min(contentOffset.y, maxOffset));
    const delta = offset - current.offset;
    current.offset = offset;
    if (!current.active || !focused || !enabled || contentOffset.y < 0 || contentOffset.y > maxOffset) {
      current.distance = 0;
      return;
    }
    if (Math.sign(delta) !== Math.sign(current.distance)) current.distance = 0;
    current.distance += delta;
    if (Math.abs(current.distance) >= DIRECTION_THRESHOLD) {
      if (current.distance > 0) hide();
      else reveal();
      current.distance = 0;
    }
  }, [enabled, focused, hide, reveal]);

  return {
    onGestureBegin,
    onGesturePull,
    onGestureCancel: onGestureBegin,
    onLayout: (event: LayoutChangeEvent) => setViewport(event.nativeEvent.layout.height),
    onContentSizeChange: (_width: number, height: number) => setContentHeight(height),
    onScroll,
    onScrollBeginDrag: (event: ScrollEvent) => {
      gesture.current.active = true;
      gesture.current.momentumUntil = 0;
      gesture.current.offset = Math.max(0, event.nativeEvent.contentOffset.y);
      gesture.current.distance = 0;
    },
    onScrollEndDrag: () => {
      gesture.current.active = false;
      gesture.current.momentumUntil = Date.now() + 100;
    },
    onMomentumScrollBegin: () => {
      gesture.current.active = gesture.current.momentumUntil > 0 && Date.now() <= gesture.current.momentumUntil;
      gesture.current.momentumUntil = 0;
    },
    onMomentumScrollEnd: () => {
      gesture.current.active = false;
      gesture.current.momentumUntil = 0;
    },
  };
}
