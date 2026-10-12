# Cloudflare deployment (Crestar web)

Worker name: `crestar`
Domain: crestarhq.com

## Cloudflare dashboard (Workers & Pages → crestar)

Set these so Cloudflare does **not** run interactive `wrangler deploy` migration:

| Setting | Value |
|--------|--------|
| Root directory | *(repository root — leave empty)* |
| Build command | `corepack enable && corepack prepare yarn@4.12.0 --activate && yarn install --immutable && yarn workspace web run cf:build` |
| Deploy command | `yarn workspace web run cf:deploy` |
| Build system version | 3 (or latest) |

Do **not** use `npx wrangler deploy` alone; that triggers the interactive OpenNext migration and times out.

## Required Worker secrets / vars

Set in Cloudflare → Worker `crestar` → Settings → Variables and Secrets:

- `DATABASE_URL` (secret)
- `BETTER_AUTH_SECRET` (secret)
- `BETTER_AUTH_URL` = `https://crestarhq.com`
- `BETTER_AUTH_TRUSTED_ORIGINS` = `https://crestarhq.com,https://www.crestarhq.com`
- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` (secrets)
- `R2_BUCKET` = `crestar-media`
- `R2_PUBLIC_BASE_URL` = `https://media.crestarhq.com`
- `PAYSTACK_SECRET_KEY`, `PAYSTACK_PUBLIC_KEY`
- `APPLE_CLIENT_ID`, `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY`, `APPLE_APP_BUNDLE_IDENTIFIER`
- Optional: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, Stream tokens

Compatibility: `nodejs_compat` is enabled in `wrangler.jsonc`. Password hashing uses `argon2-wasm-edge` (Workers-safe), not native `argon2`.
