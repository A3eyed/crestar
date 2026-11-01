# Crestar Security

## Reporting a vulnerability

Email **security@crestarhq.com** (or the owner account on file) with:

- Description and impact
- Steps to reproduce
- Affected URL / API / app version
- Your contact details

Please do not open public GitHub issues for active exploits.

We aim to acknowledge within 72 hours.

---

## What is in place

| Control | Detail |
|--------|--------|
| Auth | Neon Managed Better Auth; sessions in Postgres |
| Login abuse | IP rate limit + account soft lockout (`auth_login_guards`) |
| Admin APIs | Role checks (`owner` / `admin` / `moderator`) |
| Transport | HTTPS + HSTS |
| Browser hardening | CSP, X-Frame-Options DENY, nosniff, Referrer-Policy |
| Uploads | Type allowlist + 25 MB cap |
| Wallet P2P | Session required; atomic debit; max amount |
| Secrets | Cloudflare Worker secrets (not in git) |
| SQL | Parameterized queries via tagged templates |

Session cookies are issued by Neon Managed Auth. Production should use Secure + HttpOnly cookies (Neon Auth defaults on HTTPS origins).

---

## Incident response (operator checklist)

1. **Contain**
   - Cloudflare: enable Bot Fight / Under Attack if needed
   - Rotate compromised secrets immediately (see below)
2. **Revoke access**
   - Neon Console → Auth: review sessions / disable suspicious users
   - Force password reset for affected accounts
   - Demote compromised admin roles in `auth_users`
3. **Rotate secrets** (Cloudflare Worker → Secrets, then redeploy)
   - `DATABASE_URL`
   - `NEON_AUTH_COOKIE_SECRET`
   - `NEON_AUTH_BASE_URL` (if endpoint rotated)
   - Paystack keys, R2 keys, Resend/API keys, Neon API keys
4. **Investigate**
   - Cloudflare analytics / logs
   - Worker logs / Sentry (crashes only)
   - DB: wallet transactions, admin role changes, failed login guards
5. **Recover**
   - Patch the root cause; deploy
   - Restore balances only with audited transaction evidence
6. **Notify**
   - Affected users if personal data or funds were at risk
   - Update this doc with lessons learned

---

## Operator hardening (manual — not fully automatable)

- [ ] Use a **strong unique password** + **Apple/Google sign-in** for the `owner` account
- [ ] Replace Neon **shared Google OAuth** with your own Google Cloud OAuth client before scale
- [ ] Enable Cloudflare **WAF managed rules** and challenge on `/api/auth/*` if abused
- [ ] Turn on GitHub **Code scanning** (Settings → Code security) once available on the plan
- [ ] Restrict who can access Cloudflare / Neon / Paystack dashboards (2FA on those accounts)
- [ ] Never commit `.env`, `.p8`, or API keys; rotate any key that was pasted into chat

---

## Cookie note (Neon Managed Auth)

Cookie flags (`HttpOnly`, `Secure`, `SameSite`) are controlled by Neon Managed Better Auth for the auth host. Crestar proxies auth via `/api/auth/*` on `crestarhq.com`. After deploy, verify in browser DevTools → Application → Cookies that session cookies are `Secure` and `HttpOnly` on production.

---

*Last updated: security hardening pass (headers, Dependabot, upload limits, P2P atomic debit).*
