<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/4981fd2e-dbba-428f-bb74-ea7db17692c1

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Storefront content publishing

Admin changes to inventory, customer stories, outlet settings, banners, and live-edited storefront text are immediately cached in LocalStorage so a refresh or offline session does not lose them. **Save Changes** publishes authorized changes to Firestore; **Discard Changes** restores the last saved in-memory baseline. Route changes and browser unloads are guarded while drafts are pending. Public pages consume the shared React state and subscribe to Firestore updates in real time, with browser storage events synchronizing cached content across tabs. LocalStorage fallback applies to this browser; cross-device public publishing requires an authorized Firebase account and a successful Firestore sync.

## Firebase Hosting deployment

Build the storefront with `npm run build`, then deploy Hosting and Functions together with `firebase deploy --only hosting,functions`. Hosting serves `dist`, rewrites deep links to the SPA entry point, and routes `/robots.txt` and `/sitemap.xml` to host-aware Functions so their absolute URLs use the deployed domain. The sitemap includes public storefront routes and product detail URLs currently stored in Firestore.

The public assets also include `/favicon.svg` for browser branding and `/llms.txt` with a concise, crawler-readable overview of Sosta Tech, its products, location, and contact channels.

## Facebook feed synchronization

The storefront uses cached Facebook Page posts when available and keeps the Facebook Page Plugin as a fallback. To enable the Admin Portal's **Sync Facebook Feed** action, set the numeric Page ID in `functions/.env.<firebase-project-id>` and set a Page access token without putting it in source control:

```powershell
firebase functions:secrets:set FACEBOOK_PAGE_ACCESS_TOKEN
firebase deploy --only functions
```

For example, `functions/.env.<firebase-project-id>` should contain `FACEBOOK_PAGE_ID="1234567890"`; keep the actual access token in Secret Manager, never in an env file or source control.

The token must belong to the configured Page and include permission to read its posts. The callable sync checks the signed-in Firebase user's Owner/Manager role, fetches the latest posts server-side, and updates the shared Firestore cache only after a successful Graph API response. Public storefronts read that cached feed; a fetch or token failure leaves the last successful cache untouched and the embedded Facebook Page Plugin available when there is no cached feed. Local-browser-only admin accounts cannot use the remote sync function; sign in with an authorized Firebase admin account.
