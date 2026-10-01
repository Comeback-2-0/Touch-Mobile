import React, {useEffect, useRef, useState} from 'react';
import {Animated, Easing, Pressable, StyleSheet, Text, View} from 'react-native';
import type {StyleProp, TextStyle} from 'react-native';
import {pastelColors} from '../../theme/colors';

type Props = {
  caption: string;
  collapsedLines: number;
  lineHeight: number;
  textStyle: StyleProp<TextStyle>;
  onPress?: () => void;
  onAnimationChange?: (active: boolean) => void;
};

export default function ExpandableCommunityCaption({
  caption, collapsedLines, lineHeight, textStyle, onPress, onAnimationChange,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [measurement, setMeasurement] = useState({
    collapsed: collapsedLines * lineHeight, full: collapsedLines * lineHeight, overflow: false,
  });
  const height = useRef(new Animated.Value(collapsedLines * lineHeight)).current;
  const animating = useRef(false);
  const completionFrame = useRef<number | null>(null);
  const notify = useRef(onAnimationChange);
  notify.current = onAnimationChange;

  useEffect(() => {
    const target = expanded && measurement.overflow
      ? measurement.full : measurement.collapsed;
    if (!animating.current) {
      height.setValue(target);
      return;
    }
    // The parent has committed its scroll guard before this effect starts.
    const animation = Animated.timing(height, {
      toValue: target, duration: 280,
      easing: Easing.inOut(Easing.cubic), useNativeDriver: false,
    });
    animation.start(({finished}) => {
      if (!finished) return;
      // Let the final height reach native layout before restoring list anchoring.
      completionFrame.current = requestAnimationFrame(() => {
        completionFrame.current = null;
        animating.current = false;
        notify.current?.(false);
      });
    });
    return () => {
      animation.stop();
      if (completionFrame.current !== null) cancelAnimationFrame(completionFrame.current);
    };
  }, [expanded, height, measurement]);

  useEffect(() => () => {
    if (completionFrame.current !== null) cancelAnimationFrame(completionFrame.current);
    if (animating.current) notify.current?.(false);
  }, []);

  const toggle = () => {
    animating.current = true;
    notify.current?.(true);
    setExpanded(current => !current);
  };

  const text = (
    <Text
      style={[textStyle, styles.text]}
      onTextLayout={({nativeEvent: {lines}}) => {
        if (!lines.length) return;
        const last = lines[lines.length - 1];
        const collapsedLast = lines[Math.min(collapsedLines, lines.length) - 1];
        const next = {
          collapsed: Math.ceil(collapsedLast.y + collapsedLast.height),
          full: Math.ceil(last.y + last.height),
          overflow: lines.length > collapsedLines,
        };
        setMeasurement(current => current.full === next.full && current.collapsed === next.collapsed
          && current.overflow === next.overflow ? current : next);
      }}>
      {caption}
    </Text>
  );

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.clip, {height}]}>
        {/* Full text is always laid out at the same width; clipping reveals more lines. */}
        {onPress ? <Pressable style={styles.content} onPress={onPress} accessibilityRole="text">{text}</Pressable>
          : <View style={styles.content}>{text}</View>}
        {measurement.overflow && !expanded ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Show more caption"
            accessibilityState={{expanded: false}} onPress={toggle} style={styles.more}>
            <Text style={styles.toggleText}>... more</Text>
          </Pressable>
        ) : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {marginTop: 12},
  clip: {overflow: 'hidden'},
  content: {position: 'absolute', top: 0, left: 0, right: 0},
  text: {includeFontPadding: false},
  more: {position: 'absolute', right: 14, bottom: 0, paddingLeft: 6, backgroundColor: pastelColors.auth.glassSurface},
  toggleText: {color: pastelColors.accent, fontSize: 14, lineHeight: 20, fontWeight: '900'},
});
