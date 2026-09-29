import React, {useState} from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {getVersion} from 'react-native-device-info';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {SettingsStackParamList} from '../navigation/types/SettingsStackParamList';
import {useAuth} from '../context/AuthContext';
import {pastelColors} from '../theme/colors';

const APP_VERSION = getVersion();

const LINKS = {
  childSafety: 'https://ij-roy.github.io/touch/child-safety-standards/',
  privacy: 'https://ij-roy.github.io/touch/privacy-policy/',
  terms: 'https://ij-roy.github.io/touch/terms-and-conditions/',
  community: 'https://ij-roy.github.io/touch/community-guidelines/',
  contact: 'https://ij-roy.github.io/touch/contact/',
  instagram: 'https://www.instagram.com/out_liarrs/',
  website: 'https://ij-roy.github.io/touch/',
  playStore: 'https://play.google.com/store/apps/details?id=roy.ij.touch',
  supportMail: 'mailto:ijroy037@gmail.com?subject=Touch%20Support%20Request',
};

type NavigationProp = NativeStackNavigationProp<
  SettingsStackParamList,
  'SettingsHome'
>;

type SettingsAction = {
  key: string;
  label: string;
  icon: string;
  url?: string;
  screen?: keyof SettingsStackParamList;
  value?: string;
};

type SettingsSection = {
  title: string;
  actions: SettingsAction[];
};

const sections: SettingsSection[] = [
  {
    title: 'Help',
    actions: [
      {key: 'faq', label: 'FAQ', icon: 'help-circle-outline', screen: 'FAQ'},
      {key: 'contact-us', label: 'Contact Us', icon: 'mail-outline', url: LINKS.supportMail},
      {key: 'report-a-bug', label: 'Report a Bug', icon: 'bug-outline', screen: 'ReportBug'},
      {key: 'suggest-a-feature', label: 'Suggest a Feature', icon: 'bulb-outline', screen: 'SuggestFeature'},
    ],
  },
  {
    title: 'Touch',
    actions: [
      {key: 'instagram', label: 'Instagram', icon: 'logo-instagram', url: LINKS.instagram},
      {key: 'website', label: 'Website', icon: 'globe-outline', url: LINKS.website},
      {key: 'rate-on-google-play', label: 'Rate on Google Play', icon: 'star-outline', url: LINKS.playStore},
    ],
  },
  {
    title: 'Notifications',
    actions: [
      {key: 'notifications', label: 'Notifications', icon: 'notifications-outline', screen: 'Notifications'},
    ],
  },
  {
    title: 'Legal',
    actions: [
      {key: 'privacy-policy', label: 'Privacy Policy', icon: 'shield-checkmark-outline', url: LINKS.privacy},
      {key: 'terms-of-service', label: 'Terms of Service', icon: 'document-text-outline', url: LINKS.terms},
      {key: 'community-guidelines', label: 'Community Guidelines', icon: 'people-outline', url: LINKS.community},
      {key: 'child-safety-standards', label: 'Child Safety Standards', icon: 'heart-outline', url: LINKS.childSafety},
    ],
  },
  {
    title: 'App',
    actions: [
      {key: 'app-version', label: 'App Version', icon: 'information-circle-outline', value: APP_VERSION},
    ],
  },
];

function openExternalUrl(url: string) {
  return Linking.openURL(url);
}

export default function SettingsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const {signOut} = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleAction = (action: SettingsAction) => {
    if (action.url) {
      openExternalUrl(action.url);
      return;
    }

    if (action.screen) {
      navigation.navigate(action.screen);
    }
  };

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await signOut();
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <SafeAreaView testID="settings-screen" style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => navigation.goBack()}
          style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={pastelColors.auth.deepText} />
        </Pressable>
        <Text testID="settings-title" style={styles.title}>
          Settings
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        {sections.map(section => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.card}>
              {section.actions.map((action, index) => (
                <Pressable
                  key={action.key}
                  testID={`settings-link-${action.key}`}
                  accessibilityRole={action.value ? 'text' : 'button'}
                  disabled={Boolean(action.value)}
                  onPress={() => handleAction(action)}
                  style={[
                    styles.row,
                    index < section.actions.length - 1 && styles.rowBorder,
                  ]}>
                  <View style={styles.iconWrap}>
                    <Ionicons name={action.icon} size={19} color={pastelColors.accent} />
                  </View>
                  <Text style={styles.rowLabel}>{action.label}</Text>
                  {action.value ? (
                    <Text testID="settings-app-version" style={styles.rowValue}>
                      {action.value}
                    </Text>
                  ) : (
                    <Ionicons name="chevron-forward" size={18} color="#9A7C89" />
                  )}
                </Pressable>
              ))}
            </View>
          </View>
        ))}

        <Pressable
          testID="settings-action-logout"
          accessibilityRole="button"
          accessibilityState={{busy: isLoggingOut, disabled: isLoggingOut}}
          android_ripple={{color: '#F3C7C7'}}
          disabled={isLoggingOut}
          style={styles.logoutButton}
          onPress={handleLogout}>
          {isLoggingOut ? (
            <ActivityIndicator testID="settings-logout-spinner" color="#B42318" />
          ) : (
            <Ionicons name="log-out-outline" size={20} color="#B42318" />
          )}
          <Text testID="settings-logout-label" style={styles.logoutLabel}>
            {isLoggingOut ? 'Logging out...' : 'Log Out'}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: pastelColors.auth.background,
  },
  header: {
    minHeight: 64,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: pastelColors.auth.glassBorder,
    backgroundColor: pastelColors.auth.background,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: pastelColors.white,
  },
  headerSpacer: {
    width: 42,
  },
  title: {
    color: pastelColors.auth.deepText,
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 0,
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 34,
  },
  section: {
    marginBottom: 18,
  },
  sectionTitle: {
    marginBottom: 8,
    color: pastelColors.auth.mutedText,
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  card: {
    overflow: 'hidden',
    borderRadius: 18,
    backgroundColor: pastelColors.white,
    borderWidth: 1,
    borderColor: pastelColors.auth.glassBorder,
  },
  row: {
    minHeight: 56,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3E4EA',
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: pastelColors.card,
  },
  rowLabel: {
    flex: 1,
    marginLeft: 12,
    color: pastelColors.auth.deepText,
    fontSize: 15,
    fontWeight: '800',
  },
  rowValue: {
    color: pastelColors.auth.mutedText,
    fontSize: 14,
    fontWeight: '800',
  },
  logoutButton: {
    minHeight: 56,
    marginTop: 4,
    borderRadius: 18,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF0F0',
    borderWidth: 1,
    borderColor: '#F3C7C7',
  },
  logoutLabel: {
    marginLeft: 12,
    color: '#B42318',
    fontSize: 15,
    fontWeight: '900',
  },
});
