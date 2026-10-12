# Cloudflare deployment (Crestar web)

Worker name: `crestar`
Domain: crestarhq.com

## Cloudflare dashboard (Workers & Pages → crestar)

| Setting | Value |
|--------|--------|
| Production branch | `main` |
| Root directory | *(repository root — leave empty)* |
| Build command | `corepack enable && corepack prepare yarn@4.12.0 --activate && yarn install --immutable && yarn workspace web run cf:build` |
| Deploy command | `yarn workspace web run cf:deploy` |

Do **not** use bare `npx wrangler deploy` (triggers interactive OpenNext migration).

## Required Worker secrets / vars

- `DATABASE_URL` (secret)
- `BETTER_AUTH_SECRET` (secret)
- `BETTER_AUTH_URL` = `https://crestarhq.com`
- `BETTER_AUTH_TRUSTED_ORIGINS` = `https://crestarhq.com,https://www.crestarhq.com`
- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` (secrets)
- `R2_BUCKET` = `crestar-media`
- `R2_PUBLIC_BASE_URL` = `https://media.crestarhq.com`
- Paystack / Apple / Google keys as in `.env.example`

`nodejs_compat` is enabled in `wrangler.jsonc`. Password verify for legacy hashes uses `argon2-wasm-edge`.
