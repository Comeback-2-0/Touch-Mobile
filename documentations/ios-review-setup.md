# iOS review build setup and operations

## Required before building

- On macOS, run `bundle exec pod install` inside `ios/` to install RNAppleAuthentication. Windows cannot produce or validate an iOS archive.
- Enable Sign in with Apple for the existing Apple App ID and regenerate/download the provisioning profile. The source entitlement is added; this does not configure the Apple Developer portal.
- Enable Apple as a Firebase Authentication provider in the existing project. A Services ID is not needed for basic native Apple login. Configure the Services ID and OAuth code-flow section (Apple team ID, key ID and private key) if using Firebase Apple-token revocation for account deletion, as required by the Firebase deletion guide. Backend verifies Firebase ID tokens with revocation checks; FIREBASE_SERVICE_ACCOUNT_JSON must belong to the same Firebase project as the app.
- Backend schema initialization adds users.apple_subject and users.deletion_request. Deploy backend before releasing the mobile client.
- Apple sign-in intentionally rejects missing/unverified email and @privaterelay.appleid.com. This is the owner's requested restriction, not an assertion of App Store compliance.
- Matching email on an unlinked Apple login returns a conflict. Existing users sign in with Google then use Settings > Link Apple Account. Backend binds Apple's verified provider identifier to the existing Touch user.

## Deletion requests

- POST /users/me/deletion-request requires authenticated ownership and confirmed=true. reason (max 200) and details (max 2000) are optional.
- Stored in the user's deletionRequest, with status=pending, requestedAt, dueAt, feedback, and adminEmailSentAt when delivery succeeds. Repeated requests retain the first deadline and feedback.
- Fourteen working days means Monday-Friday in Asia/Kolkata, excluding weekends only. Deadline is the end of the calculated date. Public holidays are not excluded.
- Email recipient: FEEDBACK_EMAIL_TO, fallback ijroy037@gmail.com. Uses existing RESEND_API_KEY and support-touch@dophera.tech sender.
- Every five minutes, the existing cron process retries requests without adminEmailSentAt. `node scripts/retry-deletion-emails.js` also retries notifications. This does not delete data.
- Do not rely only on mail. Inspect pending requests in the database, monitor deadlines, and process requests within the promised time.
- Administrator must actually delete the account and associated profile/media, posts, comments, memberships, report/account data, notifications and sessions from all active stores (PostgreSQL, MongoDB, media storage and any active graph/cache stores), except legally required retention. Revoke Firebase refresh tokens and applicable Apple authorization tokens. Send completion confirmation. Record completion without retaining unnecessary personal data. No automated purge is included in this change.
- Existing authenticated REST requests and new Google/Apple sign-ins are rejected while pending. The current realtime server uses unauthenticated rooms; this pre-existing design is not a claim that existing socket connections have been revoked.

## Post actions and release scope

- Hide this post and Block User intentionally perform identical, post-only hiding on this installation. Preferences persist per Touch user/community/post in AsyncStorage; no author-wide blocking or cross-device sync is implemented.
- Communities and Profile are the only bottom tabs. Home/Search/Reels placeholders are not listed.
- Website deletion/privacy files are updated locally and must be published with the app release, not ahead of backend/mobile availability.
- App Store metadata has not been edited or submitted. Remove future-feature claims and record the final physical-device build after testing login/linking, deletion, reporting and hiding.

## Verification results

- TypeScript: `npx tsc --noEmit` passed.
- Focused mobile: 20 tests passed (Apple credential exchange/linking, deletion screen, persistent post hiding, tab navigation, Settings and SettingsStack).
- Focused backend: 14 tests passed (Apple restrictions, deletion durability/deadline/retry, account access guards and authenticated HTTP integration).
- Website: `node tests/site-assets.test.mjs` passed.
- Full backend: 213 passed, one unrelated existing expectation failed: tests/unit/communities/postgresCommunityRepository.test.js (expected shape omits queueAutoDeleteDays/trendingReason).
- Full mobile: 151 passed, six unrelated failures across CommunityPostCard.test.tsx (caption expectations), api.test.ts (release URL expectation), and splashResources.test.ts (native resource expectations). Those tests and their production source files are unchanged by this task.
- iOS archive and physical-device verification were not possible on Windows. No production deployment, email send, account deletion, or App Store submission was performed.
