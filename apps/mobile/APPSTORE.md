# App Store / EAS

- Bundle id: `com.crestar.hq`
- EAS project id: `0e7ed2f7-a8a4-4d5c-86c2-951536c05e3e`
- Marketing version: see `app.json` → `expo.version` (build number auto-increments on EAS)

## Why the Oct 2026 workflow failed

```
Entity not authorized: AppEntity[0e7ed2f7-...] (viewer = RobotViewerContext[...], action = READ)
```

The GitHub secret `EXPO_TOKEN` is a robot token that **cannot read** this EAS app.

### Fix (required before CI builds succeed)

1. Sign in at https://expo.dev as the **owner** of the Crestar project.
2. Create a new access token: https://expo.dev/settings/access-tokens  
   (Account-wide token from the owner is simplest.)
3. GitHub → repo **crestar** → Settings → Secrets and variables → Actions  
   → update secret **`EXPO_TOKEN`** with the new token.
4. Optional: Project → Settings → Credentials / Access — confirm the account has Developer or Admin.
5. Re-run workflow **EAS Production Builds** with platform `ios`.

## Local build (if CI token is not ready)

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
