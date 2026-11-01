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
