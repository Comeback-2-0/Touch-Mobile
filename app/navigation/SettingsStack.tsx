import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import Settings from "../screens/Settings";
import ChangePasswordScreen from "../screens/ChangePassword";
import NotificationsScreen from "../screens/Notification";
import ThemeScreen from "../screens/Theme";
import BlockedAccountsScreen from "../screens/BlockedAccount";
import SecurityScreen from "../screens/Security";
import AboutTouchScreen from "../screens/AboutTouch";
import CommunityGuidelinesScreen from "../screens/Guildelines";
import ReportProblemScreen from "../screens/Report";
import FAQScreen from "../screens/FAQScreen";
import ReportBugScreen from "../screens/ReportBugScreen";
import SuggestFeatureScreen from "../screens/SuggestFeatureScreen";
import { SettingsStackParamList } from "./types/SettingsStackParamList";

const Stack = createNativeStackNavigator<SettingsStackParamList>();

export default function ProfileStack() {
  return (
    <Stack.Navigator>

      <Stack.Screen
        name="SettingsHome"
        component={Settings}
        options={{ headerShown: false }}
      />
       <Stack.Screen
        name="ChangePassword"
        component={ChangePasswordScreen}
        options={{ headerTitle: "Change Your  Password" }}
      />
       <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ headerShown: false }}
      />
       <Stack.Screen
        name="Theme"
        component={ThemeScreen}
        options={{ headerTitle: "Them" }}
      />
       <Stack.Screen
        name="BlockedAccounts"
        component={BlockedAccountsScreen}
        options={{ headerTitle: "Blocked User" }}
      />
       <Stack.Screen
        name="Security"
        component={SecurityScreen}
        options={{ headerTitle: "Security Screen" }}
      />
       <Stack.Screen
        name="Touch"
        component={AboutTouchScreen}
        options={{ headerTitle: "change Password" }}
      />
      <Stack.Screen
        name="Report"
        component={ReportProblemScreen}
        options={{ headerTitle: "Report Your problem here" }}
      />
      <Stack.Screen
        name="Guildlines"
        component={CommunityGuidelinesScreen}
        options={{ headerTitle: "Community Guidelines " }}
      />
      <Stack.Screen
        name="FAQ"
        component={FAQScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ReportBug"
        component={ReportBugScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="SuggestFeature"
        component={SuggestFeatureScreen}
        options={{ headerShown: false }}
      />

    </Stack.Navigator>
  );
}
