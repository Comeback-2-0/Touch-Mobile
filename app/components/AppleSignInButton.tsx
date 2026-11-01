import React from 'react';
import {ActivityIndicator, Platform, Pressable, Text} from 'react-native';
import Animated, {useAnimatedStyle, useSharedValue, withSpring} from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/Ionicons';
import {authButtonStyles} from './authButtonStyles';
import {
  appleAuth,
} from '@invertase/react-native-apple-authentication';
export default function AppleSignInButton({
  onPress,
  disabled,
  loading = false,
}: {
  onPress: () => void;
  disabled: boolean;
  loading?: boolean;
}) {
  if (Platform.OS !== 'ios' || !appleAuth.isSupported) return null;
  const buttonScale = useSharedValue(1);
  const buttonAnimatedStyle = useAnimatedStyle(() => ({transform: [{scale: buttonScale.value}]}));
  return (
    <AnimatedPressable
      testID="apple-signin-button"
      accessibilityRole="button"
      accessibilityLabel="Sign In with Apple"
      accessibilityState={{disabled}}
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => {buttonScale.value = withSpring(0.98, {damping: 18, stiffness: 260});}}
      onPressOut={() => {buttonScale.value = withSpring(1, {damping: 18, stiffness: 260});}}
      style={[authButtonStyles.button, {marginTop: 14}, buttonAnimatedStyle]}>
      <Icon name="logo-apple" size={22} color="#202124" accessible={false} />
      <Text style={authButtonStyles.label}>{loading ? 'Signing in...' : 'Sign In with Apple'}</Text>
      {loading ? <ActivityIndicator style={{position: 'absolute', right: 18}} color="#EC407A" /> : null}
    </AnimatedPressable>
  );
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable) as React.ComponentType<any>;
