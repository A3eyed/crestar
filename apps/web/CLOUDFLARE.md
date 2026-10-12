# Cloudflare deployment (Crestar web)

Worker name: `crestar`  
Domain: crestarhq.com  
Auth: **Neon Managed Better Auth**

## Cloudflare dashboard (Workers & Pages → crestar)

| Setting | Value |
|--------|--------|
| Production branch | `main` |
| Root directory | *(repository root — leave empty)* |
| Build command | `corepack enable && corepack prepare yarn@4.12.0 --activate && yarn install --immutable && yarn workspace web run cf:build` |
| Deploy command | `yarn workspace web run cf:deploy` |

Do **not** use bare `npx wrangler deploy` (triggers interactive OpenNext migration).

## Required Worker secrets / vars

### Auth (Neon Managed Better Auth)

| Name | Type | Where to get it |
|------|------|------------------|
| `NEON_AUTH_BASE_URL` | Secret or var | Neon Console → your branch → **Auth** / **Better Auth** → Auth URL (looks like `https://ep-xxx.neonauth..../neondb/auth`) |
| `NEON_AUTH_COOKIE_SECRET` | Secret | Generate: `openssl rand -base64 32` (must be **≥ 32 characters**) |

Also in Neon Console for production:

1. **Trusted domains**: add `https://crestarhq.com` and `https://www.crestarhq.com`
2. Enable **email/password** sign-in
3. Optional: Google / Apple OAuth with your own client IDs

### App data & media

- `DATABASE_URL` (secret) — Neon pooled connection string
- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` (secrets)
- `R2_BUCKET` = `crestar-media`
- `R2_PUBLIC_BASE_URL` = `https://media.crestarhq.com`
- Paystack / Apple / Google keys as needed

`nodejs_compat` is enabled in `wrangler.jsonc`.

## Verify

After deploy: `https://crestarhq.com/api/health`  
Expect `"auth":"neon-managed-better-auth"` and all checks `true`.
