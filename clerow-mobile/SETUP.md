# Clerow Mobile — backend setup

The mobile app authenticates with Supabase directly and calls the deployed
`clerow-web` API (`/api/*`) using the user's Supabase access token as a
`Authorization: Bearer` header. No backend logic is duplicated on the device.

## 1. Fill in `app.json` → `expo.extra`

```json
"extra": {
  "supabaseUrl": "https://bglhkaltbcifughqxafl.supabase.co",
  "supabaseAnonKey": "<anon key — already set>",
  "apiBaseUrl": "https://<your-clerow-web>.vercel.app"
}
```

- `supabaseUrl` / `supabaseAnonKey` are already filled with the live project's
  publishable anon key (safe to commit).
- **`apiBaseUrl` must be replaced** with the deployed clerow-web URL (Vercel).
  For local testing point it at your dev machine, e.g. `http://192.168.x.x:3000`
  (the phone must be able to reach it — use your LAN IP or an Expo tunnel, not
  `localhost`). Until this is set, the app launches and signs in but API calls
  show an error.

## 2. Supabase Auth config (dashboard → Authentication)

- **Providers → Google:** enable; add the OAuth client ID/secret.
- **Providers → Apple:** enable; configure the Services ID + key (for native
  `signInWithIdToken`).
- **URL Configuration → Redirect URLs:** add `clerow://auth-callback`
  (and your Expo dev URL while developing).

## 3. Vercel (clerow-web)

No new env vars. The bearer-token support is in `lib/supabase/server.ts` and is
already deployed with the rest of the API. CORS is not needed — native apps
aren't browsers.

## 4. Run

```bash
cd clerow-mobile
npx expo start          # then open in a dev build / simulator
```

Apple sign-in requires a real iOS device or simulator and a development build
(`npx expo run:ios`) — it does not work in Expo Go.

## Flow

`index` routes by state: no session → onboarding → auth (Google/Apple) →
once signed in, no brand → scan (URL → discover → run) → the tabs. Returning
users with a brand land straight on Home. Everything (streak, quests, score,
prompts, leaderboard, sources, models, reports, billing) reads the live API.
