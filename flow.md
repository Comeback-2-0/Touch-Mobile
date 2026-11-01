# Execution Flow

This document describes how the current Touch mobile authentication and login UI code travels between files and functions.

## Application entry point

1. `index.js` starts the React Native application and loads `App.tsx`.
2. `App.tsx` configures Google Sign-In in `configureGoogleSignIn()` and mounts the providers and navigation tree.
3. `AuthProvider` from `app/context/AuthContext.tsx` initializes authentication before rendering the rest of the app.
4. `RootNavigator` reads the auth state and chooses `AuthStack`, `ProfileSetupScreen`, or `AppStack`.

## Session restoration flow

1. `AuthProvider` calls `restoreSession()` from its startup effect.
2. `restoreSession()` calls `getAuthTokens()` in `app/utils/authTokenStorage.ts`.
3. If an access token exists, it calls `api.get('/auth/me')`.
4. The Axios request interceptor in `app/utils/api.ts` reads the Keychain token and adds `Authorization: Bearer <accessToken>`.
5. The backend route in `touch-backend/src/modules/auth/auth.routes.js` sends the request through `middleware/auth.js`.
6. The middleware verifies the access JWT, loads the user, and `me()` returns the public user.
7. `setUser()` updates `app/features/profile/store/authStore.ts`; `RootNavigator` then selects the authenticated route.

## Google sign-in flow

1. `AuthScreen.tsx` renders the Google button and `handleLogin()` handles its press.
2. `handleLogin()` calls `signInWithGoogle()` from `AuthContext.tsx`.
3. `GoogleSignin.signIn()` opens native Google authentication; `GoogleSignin.getTokens()` returns the Google ID token.
4. `signInWithCredential()` signs the credential into Firebase.
5. `AuthContext.tsx` posts the Google ID token to `/auth/google`.
6. The backend `googleSignIn()` verifies the token, finds or creates the Touch user, and calls `issueTokenPair()`.
7. The mobile app stores the returned access and refresh tokens with `saveAuthTokens()` and calls `setUser()`.

## Apple sign-in flow on iOS

1. `AppleSignInButton.tsx` renders only when `Platform.OS === 'ios'` and Apple Sign-In is supported.
2. Its press handler calls `handleAppleLogin()` in `AuthScreen.tsx`.
3. `handleAppleLogin()` calls `signInWithApple()` from `AuthContext.tsx`.
4. `authenticateApple()` in `app/services/appleSignIn.ts` calls `appleAuth.performRequest()`.
5. The Apple identity token is converted to a Firebase credential and passed to `signInWithCredential()`.
6. The Firebase ID token is posted to `/auth/apple`.
7. The backend Apple controller verifies the Firebase token, finds or creates the Touch user, and issues the Touch token pair.
8. `AuthContext.tsx` stores the tokens and updates the auth store.

## Authenticated API and refresh flow

1. Feature APIs call the shared `api` Axios instance.
2. The request interceptor attaches the access token.
3. A `401` response enters the response interceptor.
4. The interceptor posts the refresh token to `/auth/refresh`.
5. The backend validates and rotates the refresh session, then returns a new token pair.
6. The original request is retried once with the new access token.
7. If refresh fails, tokens are cleared and the auth failure handler resets the local auth state.

## Logout flow

1. A settings or account action calls `signOut()` in `AuthContext.tsx`.
2. The app revokes the notification device and posts the refresh token to `/auth/logout`.
3. The backend deletes the refresh session.
4. The app clears Keychain tokens, signs out Firebase and Google, and calls `resetAuth()`.
