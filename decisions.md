# Decisions

This file records meaningful implementation decisions made while changing the Touch mobile app. Each entry explains the reason for the approach and the tradeoff accepted.

## 2026-11-01 — Keep authentication provider login separate from Touch API sessions

- Decision: Use Google or Apple to establish identity, then exchange the provider/Firebase identity token with the Touch backend for Touch access and refresh JWTs.
- Reason: The backend needs one authorization model for all authenticated API requests, independent of the provider used to sign in.
- Tradeoff: Login has an extra token exchange step and two authentication layers to maintain, but API authorization, refresh, logout, and account lookup stay centralized.

## 2026-11-01 — Store mobile session tokens in Keychain/Keystore-backed storage

- Decision: Store the Touch access and refresh tokens with `react-native-keychain` instead of ordinary AsyncStorage.
- Reason: Authentication tokens need protected device storage and must survive app restarts.
- Tradeoff: The storage API is platform-backed and slightly more complex to test, but it reduces exposure compared with unprotected app storage.

## 2026-11-01 — Use one shared visual style for Google and Apple sign-in buttons

- Decision: Render both provider actions with the same black button treatment, dimensions, spacing, and white typography; retain each provider's icon.
- Reason: The previous white Google button and black Apple button created unequal visual weight and made the login choices feel inconsistent.
- Tradeoff: Google no longer uses its conventional white branded button surface, but the providers now have equal hierarchy in this product's login screen.

## 2026-11-01 — Offset the Android single-button layout downward

- Decision: Apply an Android-only `56px` downward content offset when Apple Sign-In is unavailable.
- Reason: The shared content block is vertically centered. Android has one button while iOS has two, so the single-button state appeared too high compared with the intended composition.
- Tradeoff: The offset is a platform-specific layout value that must be checked on very small Android screens, but it preserves the desired visual balance without changing the iOS layout.

## Change review gate

Before accepting a major change, the assistant must explain the proposed change and quiz the developer on its purpose, affected files, execution flow, and tradeoffs. The change is accepted only after the developer answers the quiz correctly. Minor, reversible changes can proceed with a recorded rationale and normal verification.

## 2026-11-01 — Automatically link verified Apple email identities

- Decision: When Apple returns a verified, non-private-relay email that already belongs to a Touch account, attach the Apple subject to that account and issue a session immediately.
- Reason: The email is the account matching key and the iOS release is not public, so the duplicate-account friction can be removed before broad adoption.
- Tradeoff: A provider identity is linked automatically, so the backend must trust only Firebase-verified provider claims and exact normalized email matches.

## 2026-11-01 — Use email OTP for missing, unverified, or private-relay Apple email

- Decision: If Apple does not provide a usable shared email, show an in-app email verification flow. The user enters an email, receives a one-time code, and the backend creates or links the account only after the code is verified.
- Reason: The OTP proves control of the email that becomes the Touch matching key without rejecting a valid Apple identity.
- Tradeoff: This adds a step for private-relay and incomplete Apple claims, but avoids silent account creation with an unverified email.

## 2026-11-01 — Retain Apple private-relay identity separately

- Decision: Store the stable Apple subject as the provider identity and retain the Apple private-relay email in `appleRelayEmail`; use the OTP-verified email as the account email.
- Reason: The relay address is useful for provider identity and auditability, while the user-verified email is the stable matching key for linking.
- Tradeoff: User records carry two email-related values and require a schema migration, but future Apple logins remain associated with the same Apple subject.

## 2026-11-01 — Redis-backed OTP controls and branded email

- Decision: Store only a hash of the six-digit OTP in Redis for 10 minutes, limit sends and attempts, and send the HTML/text email through the existing Resend service from `no-reply-touch@dophera.tech`.
- Reason: Redis already backs session state, and the existing email service provides the project’s branded template and provider integration.
- Tradeoff: Redis availability becomes part of this recovery flow, but OTPs are short-lived, single-use, and are not stored in plaintext.

## 2026-11-01 — Restore the original Google button visual language for both providers

- Decision: Use the previous Google button treatment as the shared style for Google and Apple: white surface, pink border and shadow, rounded corners, dark text, and dark provider icons.
- Reason: The requested visual reference is the original Google button, and sharing it keeps both provider actions equal without making Apple visually dominant.
- Tradeoff: Apple no longer uses its conventional black button surface, but both choices now match the established Touch login design.

## 2026-11-01 — Lock the mobile app to portrait orientation

- Decision: Keep Android portrait-only and remove landscape orientations from the iOS app configuration.
- Reason: The app’s layouts and interaction model are designed for portrait mobile use.
- Tradeoff: Users cannot use Touch in landscape, but rotation will no longer change the app layout unexpectedly.

## 2026-11-01 — Apply Android portrait lock to the main activity

- Decision: Put `android:screenOrientation="portrait"` on `MainActivity`, while retaining portrait behavior for the crop flow through the app’s main orientation policy.
- Reason: The previous manifest setting was attached only to `UCropActivity`, so the main Touch screen could still rotate.
- Tradeoff: Android users cannot rotate the main app into landscape, which matches the portrait-only product requirement.
