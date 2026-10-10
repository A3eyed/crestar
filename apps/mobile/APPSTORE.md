# App Store submit

The iOS bundle id is `com.crestar.hq`.

Still needed before `eas submit` can upload:

- Apple Team ID
- App Store Connect app id for Crestar
- The `.p8` file for key `K2JDF0O82Y5U`
- The App Store Connect issuer id

Put those in `apps/mobile/eas.json` under `submit.production.ios`. Do not commit the `.p8`.

Unused privacy keys (contacts, calendar, reminders, speech, always-on location) were removed so App Review does not ask for them.
