import React, {useMemo} from 'react';
import {Gesture, GestureDetector, State} from 'react-native-gesture-handler';

type Props = {
  children: React.ReactElement;
  onBegin: () => void;
  onPull: (translationY: number) => void;
  onCancel: () => void;
};

export function CommunityListGesture({children, onBegin, onPull, onCancel}: Props) {
  const gesture = useMemo(() => Gesture.Simultaneous(
    Gesture.Native(),
    Gesture.Pan()
      .runOnJS(true)
      .activeOffsetY(12)
      .onBegin(onBegin)
      .onStart(event => onPull(event.translationY))
      .onUpdate(event => onPull(event.translationY))
      .onFinalize(event => {
        if (event.state === State.CANCELLED) onCancel();
      }),
  ), [onBegin, onPull, onCancel]);

  // Native tracking survives ScrollView/RefreshControl cancelling JS touches.
  // Simultaneous recognition leaves native scrolling and refresh in control.
  return <GestureDetector gesture={gesture}>{children}</GestureDetector>;
}
