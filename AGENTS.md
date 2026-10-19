# Touch Mobile Coding Guidance

## Startup, native events, and navigation

Treat native-to-JavaScript callbacks as lifecycle-sensitive resources.

- `NavigationContainer` with `linking={communityLinking}` owns deep-link routing. Do not add a parallel `Linking` listener for the same URLs.
- `NotificationCoordinator` owns Firebase Messaging subscriptions. Keep it idempotent and unsubscribe every listener on cleanup.
- Start notification work only after navigation `onReady`, an active app state, and an authenticated user are all present.
- Notification opens are intents: queue them until `navigationRef.isReady()` instead of dropping them.
- Never call JavaScript from native module construction or after bridge teardown.
- Do not solve startup races with arbitrary timers, duplicate subscriptions, manual callable-module registration, or disabling the New Architecture without a confirmed cause.

Any change to this lifecycle must preserve Android and iOS cold launch, foreground/background notification, deep-link, login, logout, and remount behavior, with tests updated first.
