import React from 'react';
import {Platform, Pressable, Text} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {authButtonStyles} from './authButtonStyles';
import {
  appleAuth,
} from '@invertase/react-native-apple-authentication';
export default function AppleSignInButton({
  onPress,
  disabled,
}: {
  onPress: () => void;
  disabled: boolean;
}) {
  if (Platform.OS !== 'ios' || !appleAuth.isSupported) return null;
  return (
    <Pressable
      testID="apple-signin-button"
      accessibilityRole="button"
      accessibilityLabel="Sign In with Apple"
      accessibilityState={{disabled}}
      disabled={disabled}
      onPress={onPress}
      style={({pressed}) => [authButtonStyles.button, {marginTop: 14}, pressed && authButtonStyles.pressed]}>
      <Icon name="logo-apple" size={22} color="#FFFFFF" accessible={false} />
      <Text style={authButtonStyles.label}>Sign In with Apple</Text>
    </Pressable>
  );
}
