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

## Wrangler `vars` vs Secrets

Cloudflare may show: *Update your Wrangler configuration…* with a `"vars": {}` snippet.

- **`vars` in `wrangler.jsonc`** = public values only (committed). Crestar sets `BETTER_AUTH_URL` / `NEXT_PUBLIC_APP_URL` there.
- **Secrets** (encrypted) = **never** put in `wrangler.jsonc`. Add them as **Secrets** in the dashboard (Production), or via CLI:

```bash
cd apps/web
npx wrangler secret put NEON_AUTH_BASE_URL
npx wrangler secret put NEON_AUTH_COOKIE_SECRET
npx wrangler secret put DATABASE_URL
```

After adding dashboard Secrets, **redeploy** so the active Worker version picks them up.

## Required Worker secrets

### Auth (Neon Managed Better Auth)

| Name | Type | Where to get it |
|------|------|------------------|
| `NEON_AUTH_BASE_URL` | **Secret** | Neon Console → branch → **Auth / Better Auth** → Auth URL (`https://ep-xxx.neonauth..../neondb/auth`) |
| `NEON_AUTH_COOKIE_SECRET` | **Secret** | `openssl rand -base64 32` (≥ 32 characters) |

Also in Neon Console for production:

1. **Trusted domains**: `https://crestarhq.com`, `https://www.crestarhq.com`
2. Enable **email/password** sign-in
3. Optional: Google / Apple OAuth with your own client IDs

### App data & media

- `DATABASE_URL` (**secret**) — Neon pooled connection string (`neondb_owner`)
- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` (secrets)
- `R2_BUCKET` / `R2_PUBLIC_BASE_URL` as needed
- Paystack / Apple / Google keys as needed

## Verify

After deploy: `https://crestarhq.com/api/health`  
Expect `"ok": true` and all checks `true`.
