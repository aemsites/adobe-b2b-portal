# Onboarding a new site onto this worker

Runbook for putting a new Edge Delivery site behind this CUG + magic-link
Cloudflare Worker, using **b2b.aem.now** / `adobe-b2b-portal` as the worked
example. Repeat with your own org/site/domain for the next one.

## 1. Enable the CUG and magic-link apps in DA

These are the two tools under `tools/` in this repo (`tools/cug/cug.js`,
`tools/magic-link/magic-link.js`), surfaced inside DA's editor via a
**prepare** sheet.

1. Open `https://da.live/config#/aemsites/adobe-b2b-portal/`.
2. Add a `prepare` sheet with these rows:

   | title | path | icon |
   |---|---|---|
   | Protected Pages | `https://main--adobe-b2b-portal--aemsites.aem.live/tools/cug/cug.html` | `https://da.live/img/icons/s2-icon-key-20-n.svg#icon` |
   | Generate magic link | `https://main--adobe-b2b-portal--aemsites.aem.live/tools/magic-link/magic-link.html` | `https://da.live/img/icons/s2-icon-link-20-n.svg#icon` |

   Swap in the new site's own `main--{site}--{org}.aem.live` path.

## 2. Set up the edge worker

All commands run from `workers/cloudflare/cug-adobe-oauth-worker/`.

```bash
npm install   # uses the wrangler version pinned in package.json
```

### 2.1 Add the env block to `wrangler.toml`

```toml
[env.b2b]
name = "b2b-portal"

[env.b2b.vars]
ORIGIN_HOSTNAME = "main--adobe-b2b-portal--aemsites.aem.live"
OAUTH_AUTHORIZE_URL = "https://ims-na1.adobelogin.com/ims/authorize/v2"
OAUTH_TOKEN_URL = "https://ims-na1.adobelogin.com/ims/token/v3"
OAUTH_LOGOUT_URL = "https://ims-na1.adobelogin.com/ims/logout/v1"
OAUTH_REDIRECT_URI = "https://b2b.aem.now/auth/callback"
OAUTH_SCOPE = "openid,AdobeID,email,profile"
OAUTH_CLIENT_ID = "aem-sites-cug"
ENVIRONMENT = "prod"
EVENT_CRED_EPOCH = "1"
APO_CLIENT_ID = "expdev-xwalk-trial"
APO_SCOPE = "APO.(expdev_.+),APO_SMS.(expdev_.+)"

[[env.b2b.kv_namespaces]]
binding = "SESSIONS"
id = "..."   # filled in below
```

`OAUTH_CLIENT_ID`/`OAUTH_SCOPE` and `APO_CLIENT_ID`/`APO_SCOPE` are public
identifiers/permission lists, not secrets — they belong in `vars`, in plain
text. Only the values below go through `wrangler secret put`.

### 2.2 Create the KV namespace

```bash
npx wrangler kv namespace create SESSIONS --env b2b
```

Paste the `id` it prints into `[[env.b2b.kv_namespaces]]` above. Each site
gets its **own** namespace — never reuse another env's, or their sessions mix.

### 2.3 Register the OAuth redirect URI with IMS

`aem-sites-cug` supports multiple registered redirect URIs on one client.
Open `https://imss.corp.adobe.com/#/client/prod/aem-sites-cug` and add
`https://b2b.aem.now/auth/callback` alongside the existing one(s) — do not
remove the others, they belong to other sites sharing this client. Skipping
this step means login fails at the IMS screen with `redirect_uri_mismatch`,
and sign-out silently lands on whichever site's callback IMS falls back to.

### 2.4 Set the secrets

```bash
# Session-signing key — generate fresh per env, never reuse another site's.
openssl rand -base64 32 | npx wrangler secret put JWT_SECRET --env b2b

# Site token for the protected AEM origin (needed while the origin isn't
# public yet — it's returned by admin.hlx.page's secrets.json/access API,
# starts with "hlx_", sent as `authorization: token <value>`).
echo "hlx_..." | npx wrangler secret put ORIGIN_AUTHENTICATION --env b2b

# IMS client secret for aem-sites-cug — same value across every site sharing
# that client (retrieve from https://imss.corp.adobe.com/#/client/prod/aem-sites-cug
# or wherever your team stores
# it; it's write-only in Cloudflare, so there's no way to read it back later).
echo "..." | npx wrangler secret put OAUTH_CLIENT_SECRET --env b2b

# Post Office (APO) credentials for magic-link/share-link emails.
echo "..." | npx wrangler secret put APO_CLIENT_SECRET --env b2b
echo "..." | npx wrangler secret put APO_AUTHORIZATION_CODE --env b2b   # optional, only for the authorization_code grant
```

Store a retrievable copy of each secret in a shared password vault
 before or right after setting it — Cloudflare secrets can be
overwritten but never read back.

### 2.5 Deploy

```bash
npx wrangler deploy --env b2b
```

This publishes to a `*.workers.dev` URL (e.g.
`https://b2b-portal.franklin-prod.workers.dev`) immediately, ahead of the
custom domain below.

### 2.6 Bind the domain

Cloudflare dashboard → Workers & Pages → **b2b-portal** → Settings →
Domains & Routes → **Custom Domain** → `b2b.aem.now/*`. This provisions the
DNS record automatically; no manual CNAME needed.

## 3. CDN / Cloudflare zone setup

Follow [aem.live's BYO CDN Cloudflare Worker guide](https://www.aem.live/docs/byo-cdn-cloudflare-worker-setup)
for the **zone-level** settings only — **skip the "Worker Setup" section**
(deploying the stock `aem-cloudflare-prod-worker`): step 2 above already
deployed our own worker, which does its own proxying/caching to
`ORIGIN_HOSTNAME` and is what the Custom Domain binds to instead.

From that guide, still apply:
- **SSL/TLS → Edge Certificates**: enable "Always Use HTTPS" (one-time
  per-zone setting, if not already on).

Caching is handled inside this worker's own fetch to origin
(`cf: { cacheEverything: true }`) — no separate Cache Rule needed.

## 4. APO email templates

Magic-link and share-link emails are sent via Adobe Post Office (`src/notification.js`),
referencing a template **by name** — the actual subject/copy/branding lives in
APO, not in this repo. Existing templates can be found at
<https://cmc.adobe.com/emailsms/search> — search for `expdev_` to see the
current set.

Templates currently referenced in code (`templateForOrg()` in
`src/magiclink.js`, and the defaults in `src/notification.js`):

- `expdev_actnow_magiclink` (+ `_semrush` variant) — self-service login link
- `expdev_actnow_sharelink` (+ `_semrush` variant) — staff-generated share link
  (currently falls back to the `magiclink` template as an interim measure —
  see the comment in `src/sharelink.js`)
- `expdev_actnow_magiclink_notify` — internal notification when a new domain requests a link
- `expdev_actnow_no_report` — internal notification when no report exists for the domain

`templateForOrg()` hardcodes the `expdev_actnow_` prefix — it isn't
parameterized per site. So a new site onboarded onto this worker will send
these exact templates (Summit-branded) as-is, until dedicated templates are
created for it in APO and the code is updated to pick a different prefix.
Creating new templates is a content-team task (coordinate with whoever owns
APO template provisioning, e.g. the email/notification team) — this repo has
no visibility into a template's actual content, only its name.
