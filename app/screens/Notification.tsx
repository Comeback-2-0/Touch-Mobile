import React, {useEffect, useState} from 'react';
import {ActivityIndicator, Pressable, SafeAreaView, ScrollView, Switch, Text, View, StyleSheet} from 'react-native';
import messaging from '@react-native-firebase/messaging';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {api} from '../utils/api';
import {pastelColors} from '../theme/colors';
import {SettingsStackParamList} from '../navigation/types/SettingsStackParamList';

const defaults = {newPosts: true, postComments: true, commentReplies: true, joinRequests: true, joinDecisions: true, communityActivity: false, queueReview: true};
const labels: Array<[keyof typeof defaults, string]> = [['newPosts', 'New posts in joined communities'], ['postComments', 'Comments on your posts'], ['commentReplies', 'Replies to your comments'], ['joinRequests', 'Join requests'], ['joinDecisions', 'Join request decisions'], ['communityActivity', 'All community activity'], ['queueReview', 'New posts awaiting review']];

export default function NotificationsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<SettingsStackParamList>>();
  const [preferences, setPreferences] = useState(defaults);
  const [loading, setLoading] = useState(true);
  useEffect(() => { (async () => { try { const token = await messaging().getToken(); const response = await api.get('/notifications/devices/preferences', {params: {token}}); setPreferences({...defaults, ...(response.data?.preferences || {})}); } finally { setLoading(false); } })().catch(() => setLoading(false)); }, []);
  const toggle = async (key: keyof typeof defaults, value: boolean) => { const next = {...preferences, [key]: value}; setPreferences(next); const token = await messaging().getToken(); await api.put('/notifications/devices/preferences', {token, preferences: next}); };
  if (loading) return <SafeAreaView style={styles.safeArea}><ActivityIndicator color={pastelColors.accent} style={styles.loading} /></SafeAreaView>;
  return <SafeAreaView style={styles.safeArea}><View style={styles.header}><Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => navigation.goBack()} style={styles.backButton}><Ionicons name="arrow-back" size={24} color={pastelColors.auth.deepText} /></Pressable><Text style={styles.headerTitle}>Notifications</Text><View style={styles.headerSpacer} /></View><ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}><Text style={styles.pageTitle}>Notifications</Text><Text style={styles.subtitle}>Communities</Text><View style={styles.card}>{labels.map(([key, label], index) => <View style={[styles.row, index < labels.length - 1 && styles.rowBorder]} key={key}><Text style={styles.label}>{label}</Text><Switch trackColor={{false: '#E8DCE1', true: pastelColors.primary}} thumbColor={preferences[key] ? pastelColors.accent : '#FFFFFF'} ios_backgroundColor="#E8DCE1" value={preferences[key]} onValueChange={value => toggle(key, value).catch(() => undefined)} /></View>)}</View></ScrollView></SafeAreaView>;
}

const styles = StyleSheet.create({safeArea: {flex: 1, backgroundColor: pastelColors.auth.background}, loading: {flex: 1}, header: {minHeight: 64, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: pastelColors.auth.glassBorder}, backButton: {width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: pastelColors.white}, headerSpacer: {width: 42}, headerTitle: {color: pastelColors.auth.deepText, fontSize: 24, fontWeight: '900'}, content: {paddingHorizontal: 18, paddingTop: 22, paddingBottom: 34}, pageTitle: {color: pastelColors.auth.deepText, fontSize: 28, fontWeight: '900', marginBottom: 22}, subtitle: {marginBottom: 8, color: pastelColors.auth.mutedText, fontSize: 13, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.8}, card: {overflow: 'hidden', borderRadius: 18, backgroundColor: pastelColors.white, borderWidth: 1, borderColor: pastelColors.auth.glassBorder}, row: {minHeight: 62, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16}, rowBorder: {borderBottomWidth: 1, borderBottomColor: '#F3E4EA'}, label: {flex: 1, color: pastelColors.auth.deepText, fontSize: 15, fontWeight: '800'}});
