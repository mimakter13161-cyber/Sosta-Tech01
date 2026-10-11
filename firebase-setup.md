# Firebase Setup

The browser app uses Firebase Auth, Cloud Firestore, Cloud Storage, and callable Cloud Functions when all six `VITE_FIREBASE_*` values are configured. Keep the existing Firebase config in the workspace parent `.env.local`; `vite.config.ts` loads that parent env directory. Do not commit `.env.local`.

Required client config keys:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

In Firebase Console, enable Email/Password under Authentication, create the Firestore database, and enable Cloud Storage. The `/admin/login` UI always shows sign-in and prefills `admin@sostatech.bd`; it does not perform an Owner setup check or seed a Firebase password. Firebase mode requires an existing Firebase Authentication account and an authorized Firestore `users/{uid}` profile. A frontend-only app cannot securely create that account or assign an Owner role. Provision the Owner through a trusted Firebase Admin SDK environment (such as deployed Cloud Functions or an administrator using the Firebase Console) before signing in. In local Vite development only, the client demo accepts `admin@sostatech.bd` / `Owner@010101`, stores a salted local profile, and persists its local demo session. This credential path is excluded from production builds and must not be used for real data or production administration. Passwords are never written to Firestore.

If Firebase Auth returns `auth/api-key-not-valid`, replace `VITE_FIREBASE_API_KEY` with the Web API key from that same Firebase project's Project settings > General > Your apps. Check that the key's API restrictions permit Identity Toolkit API and that its HTTP referrer restrictions include the local development host and deployed site domain. Restart Vite after changing environment variables.

When Firebase is not configured, local development uses salted password hashes in this browser's LocalStorage. This local mode is not shared across devices and is not a substitute for configuring Firebase Authentication before production. When Firebase is configured, local fallback credentials are not accepted.

Store Manager applicants can register from the Admin login page. Their `users/{uid}` profile is created with `role: manager` and `status: pending`; pending and rejected accounts cannot enter the admin portal, write products, or upload product images. The Owner can approve or reject requests in User Management. Manager approvals, rejections, account creation, and password changes use callable Functions and the Firebase Admin SDK. Firestore and Storage rules require an approved role for client-side writes. Firebase Authentication uses browser-local persistence so a valid admin session survives reloads and browser restarts; signing out from the admin portal ends that session.

Deploy the rules and Manager administration functions from the repository root:

```sh
firebase deploy --project YOUR_FIREBASE_PROJECT_ID --only firestore:rules,storage,functions
```

Cloud data layout:

- `products/{productId}` stores products, gallery/cover URLs, variant combinations, and each product's category.
- `settings/site_config` stores branding, banners, footer text, and the Facebook Page URL for public storefront reads and live subscriptions. `siteSettings/public` is read only as a legacy migration fallback.
- `settings/owner` stores only the Owner UID, role, and creation timestamp. It is publicly readable so bootstrap can identify an existing Owner; only Admin SDK Cloud Functions can create the marker.
- `happyCustomers/{storyId}` stores customer proofs and reviews.
- `users/{uid}` stores the email, role, manager approval status, and initial password-change requirement. Passwords remain in Firebase Authentication.
- Product, customer, logo, and banner files are uploaded beneath `products/`, `happy-customers/`, and `site/` in Firebase Storage.

Browser storage remains as an offline cache/fallback for non-editor content if Firebase is unavailable. Customer stories are upserted individually in Firestore; removals use tombstone documents in the same collection so stale browser caches cannot resurrect deleted stories. Outlet settings and Live Editor changes are written directly to `settings/site_config` when an authenticated Owner saves them; a failed Firebase write does not mark Live Editor changes as saved locally. Public storefronts subscribe to this document, so edits propagate across browsers and devices. Published product categories are reflected in storefront category filters through the Firestore product subscription. Other browsers and incognito sessions read and subscribe to these shared Firestore documents; they cannot receive changes from another browser's LocalStorage. The Owner-only JSON backup exports image bytes as data URLs so the file can be kept offline.

The application seed data is a deploy-time default, not a shared writable store. Do not add runtime customer stories to source files; use Firestore for cross-browser persistence and LocalStorage only for the current browser's offline fallback.

## Facebook Page Feed

The Home page uses Facebook's public Page Plugin timeline for the editable `facebookPageUrl`, defaulting to `https://www.facebook.com/sosta.techbd`. The offer button and footer link use the same setting. Facebook controls whether public posts can be embedded and may limit content for unpublished/restricted pages or visitor privacy settings. Direct Graph API retrieval of posts/videos requires a Facebook app, Page access token, permissions, and a trusted server-side proxy; no token is needed or exposed by this Page Plugin embed.
