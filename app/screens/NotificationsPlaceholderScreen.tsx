import React, {useCallback, useEffect, useState} from 'react';
import {ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';
import {pastelColors} from '../theme/colors';
import {api} from '../utils/api';
import {navigateFromCommunityNotification} from '../navigation/navigationRef';

type Notification = { _id?: string; id?: string; content?: string; metadata?: Record<string, string>; seen?: boolean; timestamp?: string };

export default function NotificationsPlaceholderScreen({navigation}: any) {
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => { try { const response = await api.get('/notifications'); setItems(response.data?.notifications || []); } finally { setLoading(false); } }, []);
  useEffect(() => { load().catch(() => undefined); }, [load]);
  const open = async (item: Notification) => {
    const id = item._id || item.id;
    if (id && !item.seen) { api.patch(`/notifications/${id}/seen`).catch(() => undefined); setItems(current => current.map(entry => entry === item ? {...entry, seen: true} : entry)); }
    if (!navigateFromCommunityNotification(item.metadata || {})) navigation.goBack();
  };
  return <SafeAreaView style={styles.safeArea}>
    <View style={styles.header}><Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => navigation.goBack()} style={styles.iconButton}><Feather name="arrow-left" size={22} color={pastelColors.auth.deepText} /></Pressable><Text style={styles.title}>Notifications</Text></View>
    {loading ? <ActivityIndicator color={pastelColors.accent} /> : <FlatList data={items} keyExtractor={(item, index) => item._id || item.id || String(index)} contentContainerStyle={styles.list} ListEmptyComponent={<Text style={styles.empty}>You're all caught up.</Text>} renderItem={({item}) => <Pressable onPress={() => open(item)} style={[styles.card, !item.seen && styles.unread]}><Text style={styles.cardText}>{item.content || 'New community activity'}</Text>{!!item.timestamp && <Text style={styles.time}>{new Date(item.timestamp).toLocaleString()}</Text>}</Pressable>} />}
  </SafeAreaView>;
}
const styles = StyleSheet.create({safeArea:{flex:1,backgroundColor:pastelColors.auth.background},header:{minHeight:64,paddingHorizontal:16,flexDirection:'row',alignItems:'center',gap:12},iconButton:{width:42,height:42,alignItems:'center',justifyContent:'center'},title:{color:pastelColors.auth.deepText,fontSize:22,fontWeight:'900'},list:{padding:16,gap:10},card:{backgroundColor:pastelColors.white,borderRadius:16,padding:16},unread:{borderLeftWidth:4,borderLeftColor:pastelColors.accent},cardText:{color:pastelColors.auth.deepText,fontSize:15,fontWeight:'700'},time:{marginTop:6,color:pastelColors.auth.mutedText,fontSize:12},empty:{textAlign:'center',marginTop:40,color:pastelColors.auth.mutedText}});
