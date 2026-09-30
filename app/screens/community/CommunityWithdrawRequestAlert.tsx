import React from 'react';
import {Image, Modal, Pressable, StyleSheet, Text, View} from 'react-native';
import {pastelColors} from '../../theme/colors';
import {communityAvatarColor, communityInitial} from './communityUx';

type Props = {
  visible: boolean;
  community: {name?: string; image?: string} | null | undefined;
  onClose: () => void;
  onConfirm: () => void;
};

export default function CommunityWithdrawRequestAlert({visible, community, onClose, onConfirm}: Props) {
  const name = community?.name || 'this community';
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close withdraw request alert" style={styles.backdrop} onPress={onClose} />
        <View style={styles.alert} accessibilityViewIsModal>
          {community?.image ? (
            <Image source={{uri: community.image}} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.fallback, {backgroundColor: communityAvatarColor(name)}]}>
              <Text style={styles.initial}>{communityInitial(name)}</Text>
            </View>
          )}
          <Text style={styles.communityName}>{name}</Text>
          <Text style={styles.title}>Remove Request</Text>
          <Text style={styles.copy}>Are you sure to remove your request to join this community</Text>
          <View style={styles.actions}>
            <Pressable accessibilityRole="button" accessibilityLabel="Remove request" onPress={onConfirm} style={styles.removeButton}>
              <Text style={styles.removeText}>Remove Request</Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Keep request" onPress={onClose} style={styles.keepButton}>
              <Text style={styles.keepText}>Keep Request</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20},
  backdrop: {...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(50, 17, 31, 0.48)'},
  alert: {width: '100%', maxWidth: 420, borderRadius: 24, padding: 24, backgroundColor: pastelColors.auth.background, alignItems: 'center', elevation: 12},
  avatar: {width: 72, height: 72, borderRadius: 16},
  fallback: {alignItems: 'center', justifyContent: 'center'},
  initial: {fontSize: 28, fontWeight: '900', color: pastelColors.white},
  communityName: {marginTop: 10, color: pastelColors.accent, fontSize: 17, fontWeight: '900', textAlign: 'center'},
  title: {marginTop: 14, color: pastelColors.auth.deepText, fontSize: 24, fontWeight: '900', textAlign: 'center'},
  copy: {marginTop: 10, color: pastelColors.auth.deepText, fontSize: 16, lineHeight: 23, fontWeight: '600', textAlign: 'center'},
  actions: {flexDirection: 'row', gap: 10, width: '100%', marginTop: 22},
  removeButton: {flex: 1, minHeight: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#D8D8DE'},
  removeText: {color: '#4E4E59', fontWeight: '900', fontSize: 14},
  keepButton: {flex: 1, minHeight: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: pastelColors.accent, backgroundColor: pastelColors.white},
  keepText: {color: pastelColors.accent, fontWeight: '900', fontSize: 14},
});
