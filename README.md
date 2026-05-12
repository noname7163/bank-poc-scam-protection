# Banking Shield

A proof-of-concept demo banking application with a multi-layered
client-side tamper-detection system. The shield is designed to defend
against *opportunistic* DOM manipulation by scammers operating via
remote-access tools (AnyDesk, TeamViewer, …) — the typical
"your bank is calling, please follow my instructions on the screen"
attack.

> See `SPEC.md` for the full specification this is built against and
> `AA-INFO.txt` for a short pitch + detailed write-up.

---

## What the demo shows

Once running, you can switch between two perspectives in two browser tabs:

- **Banking** at <http://localhost:8080/> — the customer view, with
  login, account overview, transaction details and a multi-layer shield
  protecting the displayed values.
- **Admin** at <http://localhost:8080/admin/> — a separate management
  UI to create / edit / delete demo accounts, edit balances and
  transactions, toggle per-field image protection, reset strikes and
  unlock accounts.

The point of the demo: run a copy-pasteable DevTools snippet from the
"How to demo the attacks" section below and watch the shield catch it.
Then go to admin, unlock, tweak the per-account configuration, and try
a different attack.

---

## Running locally

Requirements: Docker + Docker Compose v2.

```bash
cp .env.example .env
docker compose up --build
```

Once the five containers come up cleanly:

- Banking app: <http://localhost:8080/>
- Admin app:   <http://localhost:8080/admin/>
- Backend (direct, for debugging): <http://localhost:3000/api/health>
- Postgres:    `localhost:5432`

### Demo users

Banking customers (sign in at `/`):

| Email                  | Password  | Notes |
|---                     |---        |---    |
| `alice@example.com`    | `demo123` |       |
| `bob@example.com`      | `demo123` |       |
| `charlie@example.com`  | `demo123` |       |

The login page has a "Demo quick select" dropdown that auto-fills email
and password. Locked users appear in the dropdown with a **— locked**
suffix and are disabled.

### Admin

Credentials come from `.env`:

```
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
```

The admin account is created idempotently at backend boot (upsert into
`admin_accounts`), so changing `ADMIN_PASSWORD` in `.env` applies on
the next restart.

In the admin UI you can, per user:
- Edit balance, IBAN, holder name
- Add / edit / delete individual transactions
- Set the lock threshold (1 = instant lock on the first tampering
  attempt; 3 = three warnings; …)
- Reset the password
- Toggle **Layer 2 — image protection** per field (balance / tx_amount
  / tx_iban)
- Reset accumulated strikes
- Unlock a locked account
- Create new demo users / delete existing ones

### UI language

English (default + fallback), German and French. The locale is
detected from `navigator.language` on first visit and persisted in
`localStorage`. Use the small language dropdown in any header to
switch. On the customer pages (overview, transaction) switching the
language reloads the page so the verifier fingerprints stay
consistent.

### Dev-mode note on `crypto.subtle`

`window.crypto.subtle` is only available in *secure contexts*.
`localhost`, `127.0.0.1` and `[::1]` count as secure even without TLS,
so the hashing works in dev. **Accessing the frontend via a LAN IP or
hostname other than `localhost` will break all fingerprint
computations** — and Layer 5 would redirect immediately anyway because
of the hostname mismatch.

---

## How to demo the attacks

Sign in as alice → `/overview`. Open DevTools (`F12`). For each attack,
paste the snippet into the Console and watch what happens. Between
attacks, unlock the user or reset strikes in admin if needed.

### Attack A — Balance text edit

In the admin UI, make sure alice has **no image protection enabled**
(all check-boxes off). Then:

```js
document.getElementById('balance').textContent = '999,999.99 €';
```

**Expected:** the Whitelist `MutationObserver` fires within
milliseconds, `reportTamper('whitelist_mutation')` runs, and the page
navigates to `/quarantine?reason=whitelist_mutation&strikes=1`.

**Variant with image protection on:** the value is no longer text but
an `<img>`. Direct edits are impossible. Try hijacking the src
instead:

```js
document.querySelector('#balance img').src = 'data:image/png;base64,iVBORw0KGgo=';
```

→ The Whitelist observer catches the attribute mutation, same outcome.

### Attack B — Overlay injection

```js
const bal = document.getElementById('balance').getBoundingClientRect();
const overlay = document.createElement('div');
Object.assign(overlay.style, {
  position: 'fixed',
  left: bal.left + 'px',
  top: bal.top + 'px',
  width: bal.width + 'px',
  height: bal.height + 'px',
  background: 'white',
  color: 'black',
  zIndex: '9999',
  font: '40px sans-serif',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
});
overlay.textContent = '999,999.99 €';
document.body.appendChild(overlay);
```

**Expected:** the Blacklist observer fires immediately. Reason will be
whichever heuristic trips first:
- `blacklist_overlay_position` — `position:fixed` with a positive
  z-index
- `blacklist_overlay_rect` — bounding-box matches a protected element
- `blacklist_currency_text` — the currency regex `\d[\d.,\s]*€` matches

Works **independently of image protection** — overlay detection is L1.

### Attack C — Kill the verifier

```js
for (let i = 1; i < 10000; i++) { clearInterval(i); clearTimeout(i); }
```

Wipes all timers and intervals. Both watchdog intervals and the
verifier die.

**Expected:**
- If only *one* watchdog dies: the other detects it within ~3s and
  reports `watchdog_a_silent` / `watchdog_b_silent`.
- If both die together (as in the brute-force version above): the
  verifier is also dead, so the server doesn't see a stale heartbeat
  immediately, but the next page reload will be blocked by the
  bootstrap check. In live demos one of the two watchdogs usually
  catches the kill window.

Gentler variant — patch a shield function:

```js
window.__shield.updateProtected.toString = () => 'evil';
```

**Expected:** on the next verifier heartbeat (≤3s) `checkIntegrity()`
re-hashes the `toString` and sees the mismatch →
`function_integrity_broken` → quarantine.

### Attack D — Save the page locally

1. In the banking tab on `/overview` → **Ctrl+S** → save as
   `overview.html` on disk.
2. Open that file directly from the file system (double-click).
3. The URL is now `file:///…/overview.html`.

**Expected:** `checkOrigin()` runs immediately after module load, sees
`location.protocol === 'file:'`, and calls
`window.location.replace('http://localhost:8080/quarantine?reason=saved_offline')`.
The real banking app loads the quarantine page with the scam banner.

(In production this would be `PUBLIC_BANK_HOST=https://bank.example.com`
and the redirect would land on the real bank's site.)

### Attack E — Lock the account

Repeat any of attacks A–C three times in a row (each time, click
"Back to overview" on the quarantine page). On the third strike →
`/locked`.

Fast-track variant: in the admin UI set the user's
**`max_strikes = 1`** and trigger any attack once → **instantly locked**.

The Locked page prominently shows the scam warning — **"Are you on the
phone with someone right now? … This is a scam. Hang up immediately."**
— and the instruction to "clarify in person at a branch of your bank".
The locked user appears as **locked** in the login dropdown and login
POST returns HTTP 423. Other demo accounts still work.

Unlock from admin (dashboard or the account detail page).

### Bonus — try to remove the scam banner

On `/quarantine` or `/locked`:

```js
document.getElementById('scam-banner').remove();
```

**Expected:** the banner is back within <100 ms. The scam-banner
self-heal uses a `MutationObserver` on `document.body` plus a 500 ms
interval heartbeat. Both have to be killed simultaneously to keep the
banner gone — and even then SPEC §1.2 ("pre-prepared attacker") applies.

---

## Architecture

```
                                            ┌──────────────┐
                                            │   postgres   │
                                            │  banking_db  │
                                            └──────┬───────┘
                                                   │
              ┌─────────────────────────┐          │
        ──────► nginx (host:8080) :80 ──┤    ┌─────▼─────────────┐
host          │  /              → bank  ├────►   backend (Node)  │
              │  /api           → bank  │    │   Fastify + pg    │
              │  /api/admin     → bank  │    │   :3000           │
              │  /admin         → admin │    └───────────────────┘
              └────┬─────────────┬──────┘
                   │             │
        ┌──────────▼──┐    ┌─────▼────────────┐
        │  frontend   │    │  admin-frontend  │
        │  Vite :5173 │    │  Vite :5173      │
        │  (banking)  │    │  base='/admin/'  │
        └─────────────┘    └──────────────────┘
```

Five Docker services. nginx is the only externally exposed ingress
(:8080). Banking and admin share the backend; admin endpoints under
`/api/admin/*` are gated by a separate cookie (`bs_admin`) and a
separate DB table (`admin_accounts`) — admins and customers never mix.

### The five protection layers

| # | Layer | What it does |
|---|---|---|
| **L1** | **Structural Monitoring** | Two MutationObservers. *Whitelist* watches each `[data-protected]` element (subtree, attributes, childList, characterData). *Blacklist* watches `document.body` for injected nodes with currency-looking text, fixed/absolute positioning + z-index, or matching bounding-rect overlays. Mutations under a valid `data-update-nonce` are allowed; everything else triggers `reportTamper`. |
| **L2** | **Server-Rendered PNGs** | Per-account toggles for balance, tx_amount, tx_iban. When enabled, the value is returned as a signed `<img src="/api/render/:type/:id?token=HMAC">` instead of plain text. The HMAC token binds to `type|id|session_id`, validated server-side, **un-forgeable** without the secret. Direct text edits become physically impossible for protected fields. |
| **L3** | **Verifier Heartbeat** | A 3-second loop collects fingerprints from all `[data-protected]` elements (SHA-256 of textContent for text fields, HMAC token from `src` for image fields) and POSTs to `/api/verify`. Server compares against expected fingerprints from the DB-stored account/tx data. Mismatch → strike + quarantine. 6s timeout + 2 retries → quarantine. Each successful ack rotates the update nonce (5s TTL). |
| **L4** | **Self-Defense** | (a) Module encapsulation — internals live in the bundled shield closure; only `window.__shield = freeze({ updateProtected, reportTamper })` is exposed. (b) Dual watchdog — two intervals on different periods (900ms / 1400ms), each checks the other's last-tick timestamp; killing one alone is detected within ~1s. (c) Function integrity — captures `.toString()` hashes of public methods at startup, re-checks per heartbeat. (d) DevTools heuristic — outerHeight-jump check, soft-signal only (no auto-quarantine, since false positives are real). (e) Strict CSP set as an HTTP response header in nginx for every request — `script-src 'self'; style-src 'self' 'unsafe-inline'; object-src 'none'; frame-ancestors 'none'`. Plus `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`. |
| **L5** | **Origin Guard** | First thing on page load: `file://` → redirect to bank quarantine (`reason=saved_offline`); non-HTTPS on non-localhost → `insecure_protocol`; hostname mismatch vs configured `PUBLIC_BANK_HOST` → `hostname_mismatch`. Bootstrap-Hash-POST to `/api/verify/bootstrap` after origin OK — failed request means "offline / saved page" / "rejected build". Plus `<noscript>` full-screen red warning on every protected HTML. |

### Strike model

- Strikes are per *session* (`sessions.strike_count`), incremented in
  `recordTamper()`.
- The lock threshold (`users.max_strikes`) is **per user**, editable in
  admin. Default 3.
- When `strike_count >= max_strikes`, both the session and the user
  get `locked_at = NOW()`. The user cannot log in with that account
  again until an admin clears it (`/users/:id/unlock`).
- Strikes auto-decay after **1 hour** of inactivity
  (`last_strike_at < NOW() - INTERVAL '1 hour'` → next strike starts
  back at 1). Locked sessions don't auto-decay — admin action is
  required.

### Quarantine and locked pages

These two pages are **intentionally simple**: no shield, no protected
elements. They each carry a self-healing scam banner
(`scam-banner.ts` — MutationObserver + 500ms heartbeat) that restores
its `outerHTML` snapshot if removed or edited. Text on both pages
directs the user to **clarify in person at a branch** — never via
phone — because the scammer is likely still on the line during the
attack.

### Internationalisation

English (default + fallback), German, French. The backend respects the
client's locale for direction-label fingerprints so a locale switch
never causes a false positive. Currency and date formatting stay
locale-fixed to `de-DE` / `Europe/Berlin` everywhere — the data is
German banking data, and localising the format would put client and
server out of sync on the verifier fingerprints.

---

## Limitations

This shield raises the bar against opportunistic scammer DOM
manipulation via DevTools. It does **not** defend against
(per SPEC §1.2):

- **A pre-prepared attacker script** that knows the shield's internals
  and patches `MutationObserver.prototype.observe`,
  `Function.prototype.toString`, `fetch`, or the verifier reference
  *before* the shield boots.
- **Runtime debugging with breakpoints** to mutate variables in memory
  — closures and frozen objects don't survive a determined debugger
  user.
- **Malicious browser extensions** with permission to modify page
  contents.
- **Compromised TLS / man-in-the-middle** on the network path.

For each of those, the layered DOM-side defence is the wrong layer —
they need to be addressed elsewhere (extension policy, secure
transport, device attestation).

### Production gaps to close before shipping anything resembling this

- **Subresource Integrity** on the shield bundle — disabled here
  because Vite-HMR re-hashes on every change. Add `vite-plugin-sri`
  (or similar) to the production build pipeline; populate
  `ALLOWED_BUNDLE_HASHES` in env so `/api/verify/bootstrap` enforces a
  known-good build.
- **The HMAC token** binding currently covers `type|id|session_id`.
  Spec also lists `value|expiry` — re-including both means rotating
  tokens when data changes (and an explicit reload UX after admin
  edits).
- **Server-pushed value updates** (WebSocket) instead of full page
  reloads, so admin edits don't risk false-positive quarantines on
  active customer sessions.
- The **demo-status endpoint** that lists locked emails on the login
  dropdown is a privacy hack — fine for a demo, remove for real auth.
- **CSP `report-uri`** so blocked-script attempts surface server-side
  (the strict CSP itself is already delivered as an nginx response
  header, not a meta tag).
- The admin app currently shares cookies with the bank app on
  `:8080`. In production, host admin under a separate hostname/origin
  so there's no CSRF surface between them.

---

## Milestones (see `SPEC.md` §7)

| # | Milestone | State |
|---|---|---|
| M0 | Compose skeleton + Postgres + Fastify health + Vite login stub | ✅ |
| M1 | Auth, sessions, seeded data, overview page (unprotected) | ✅ |
| M2 | Transaction detail page (unprotected) | ✅ |
| M3 | Layer 1 — MutationObserver (whitelist + blacklist) + nonces | ✅ |
| M4 | Layer 3 — verifier heartbeat + quarantine + strike counter | ✅ |
| M5 | Layer 2 — server-rendered PNGs for balance / amount / IBAN | ✅ |
| M6 | Layer 4 — closure encapsulation, dual watchdog, integrity, CSP | ✅ |
| M7 | Layer 5 — origin / saved-page detection | ✅ |
| M8 | Polish, README demo-attack snippets, smoke pass | ✅ |

Side-quests built on top of the spec: per-user lock threshold,
strike auto-decay, separate admin service with nginx ingress,
per-field Layer-2 toggle, full account/transaction CRUD, scam-banner
self-heal, strike-reset & unlock controls in two places, multi-language
UI (EN/DE/FR) with browser detection.

---

## Troubleshooting

**Containers don't pick up new dependencies.** The named `node_modules`
volumes mask freshly installed packages. The `command:` in
`docker-compose.yml` runs `npm install --prefer-offline` at every boot,
so adding a dependency just needs `docker compose up` again — no
volume wipe required.

**`docker compose down -v` after schema changes.** Not required.
`backend/src/lib/schema.ts` runs `CREATE TABLE IF NOT EXISTS` and
`ALTER TABLE … ADD COLUMN IF NOT EXISTS` at every boot, so existing
volumes are migrated forward in place. `db/init.sql` is only used for
fresh-volume initialisation.

**A customer keeps landing on `/locked` or `/quarantine` after every
click.** Most likely the session was locked from a previous demo run.
Open `/admin/`, locate the user, click *Unlock*. Set `max_strikes`
back to 3 if you have been testing the instant-lock flow with
`max_strikes=1`.

**Verifier mismatch right after page load.** All `Intl.DateTimeFormat`
calls in this project use a pinned `timeZone: 'Europe/Berlin'` so the
backend (UTC container) and the browser (whatever the user is in)
emit the same formatted timestamp. If you change this, change *both*
`backend/src/lib/format.ts` and `frontend/src/lib/format.ts`.

**Admin edits cause customer quarantines.** Expected — see Limitations
→ "Server-pushed value updates". The verifier compares against current
DB state; an admin balance change while a customer tab is open will
fire a mismatch on the next 3-second heartbeat. The customer should
reload the page after the admin edit.

**Switching the language on overview / transaction triggers a page
reload.** Intentional — see `frontend/src/pages/{overview,transaction}.ts`.
JS-set localised text (e.g. the direction badge "Incoming" / "Eingang"
/ "Entrant") would otherwise stay stale while the verifier already
sends the new locale, producing a false-positive strike. Login,
quarantine and locked pages do not have a switcher / do not reload.
