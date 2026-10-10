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
