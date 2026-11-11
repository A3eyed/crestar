# App Store / EAS

- Bundle id: `com.crestar.hq`
- EAS project id: `b341ed25-1eb0-4fe4-8515-01f12cc4da20` (`@a3eyed/crestar`)
- Marketing version: see `app.json` → `expo.version` (build number auto-increments on EAS)

## Project id mismatch (fixed Nov 2026)

GitHub was linked to Expo project `b341ed25-…` while `app.json` still had an older id.
`extra.eas.projectId` must match the project that owns the GitHub connection.

## Local / dashboard build

1. Builds: https://expo.dev/accounts/a3eyed/projects/crestar/builds
2. Use profile **production**, platform **iOS**, base directory **apps/mobile** if prompted.
3. Or from a machine with Node:

```bash
cd apps/mobile
npx eas-cli login
npx eas-cli build --platform ios --profile production
```

## Submit

Still needed for `eas submit`:

- Apple Team ID
- App Store Connect app id for Crestar
- App Store Connect API key (`.p8`) + Key ID + Issuer ID

Configure via EAS secrets / `eas.json` submit profile. Do not commit `.p8` files.

## Mobile vs web parity

- API base defaults to `https://crestarhq.com` (`authenticatedFetch`).
- Sign-in / sign-up use an in-app WebView of the website auth pages, so Neon Auth + Apple web flow apply when the web deploy is current.
- Native capability: `expo-apple-authentication` + `ios.usesAppleSignIn` is enabled for App Store / Sign in with Apple entitlement.
