import React from 'react';
import {Platform, View} from 'react-native';
import {
  appleAuth,
  AppleButton,
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
    <View
      pointerEvents={disabled ? 'none' : 'auto'}
      accessibilityState={{disabled}}
      style={{width: '100%', maxWidth: 340}}>
      <AppleButton
        testID="apple-signin-button"
        buttonStyle={AppleButton.Style.BLACK}
        buttonType={AppleButton.Type.SIGN_IN}
        onPress={onPress}
        style={{width: '100%', maxWidth: 340, height: 56, marginTop: 14}}
      />
    </View>
  );
}
