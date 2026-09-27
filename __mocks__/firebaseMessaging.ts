const messaging = () => ({
  requestPermission: async () => 1,
  hasPermission: async () => 1,
  getToken: async () => '',
  onTokenRefresh: () => () => undefined,
  onNotificationOpenedApp: () => () => undefined,
  getInitialNotification: async () => null,
});

(messaging as any).AuthorizationStatus = {AUTHORIZED: 1, PROVISIONAL: 2};
export default messaging;
