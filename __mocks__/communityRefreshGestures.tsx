import React from 'react';
export {View as GestureHandlerRootView} from 'react-native';

function gesture() {
  const value: any = {handlers: {}};
  for (const method of ['runOnJS', 'maxPointers', 'activeOffsetY', 'failOffsetX']) {
    value[method] = () => value;
  }
  for (const method of ['onBegin', 'onUpdate', 'onEnd', 'onFinalize']) {
    value[method] = (callback: unknown) => {
      value.handlers[method] = callback;
      return value;
    };
  }
  return value;
}

export const Gesture = {Native: gesture, Pan: gesture, Simultaneous: (...gestures: any[]) => ({gestures})};
export const GestureDetector = ({children}: {children: React.ReactNode}) => <>{children}</>;
