# Banking Shield — Specification

A proof-of-concept demo banking application with a multi-layered client-side tamper-detection system. The goal is to demonstrate how an online banking front-end can defend against opportunistic DOM manipulation by scammers operating via remote-access tools (AnyDesk, TeamViewer, etc.).

> **Language convention:** all source code, identifiers, comments, commit messages, documentation strings and log output must be in **English**, even though the project is being developed in a German-language conversation.

---

## 1. Threat Model

### 1.1 In Scope
- DOM text manipulation via browser DevTools (changing displayed account balance, transaction amounts, IBANs).
- Insertion of attacker-controlled DOM elements that visually overlap or replace protected elements (e.g. a copy of the balance element overlaid on top of the real one).
- Deletion or hiding of protected elements (`display:none`, `visibility:hidden`, removal from DOM).
- Manipulation of form input values after the user has typed them but before submission.
- Saving the page locally and re-opening it to bypass the live verifier.

### 1.2 Out of Scope (acknowledged but not defended against)
- A pre-prepared attacker script that knows our internals and patches the verifier before it runs.
- Runtime debugging with breakpoints to mutate variables in memory.
- Malicious browser extensions.
- Compromised TLS / man-in-the-middle on the network.

### 1.3 Success Criteria
The PoC succeeds when an attacker performing typical opportunistic DevTools edits (right-click → Inspect → edit text / inject element) either (a) cannot make the change persist beyond a few hundred milliseconds, or (b) gets the session quarantined.

---

## 2. System Architecture

A full-stack application running in Docker Compose with three services:

```
┌─────────────────┐      ┌──────────────────┐      ┌──────────────┐
│  frontend       │◀────▶│  backend (API)   │◀────▶│  postgres    │
│  (Vite + TS)    │      │  (Node + Fastify)│      │              │
│  port 5173      │      │  port 3000       │      │  port 5432   │
└─────────────────┘      └──────────────────┘      └──────────────┘
```

### 2.1 Tech Stack
- **Frontend:** TypeScript, Vite, vanilla DOM (no framework — frameworks like React abstract away DOM operations we need fine-grained control over). Tailwind for styling.
- **Backend:** Node.js with Fastify, TypeScript. JWT for sessions. HMAC-SHA256 for signing.
- **Database:** PostgreSQL with a small schema (users, accounts, transactions, sessions, quarantine_events).
- **Image rendering:** server-side rendering of protected values as PNG using `@napi-rs/canvas` or `sharp`.
- **Containerization:** Docker Compose, one `docker-compose.yml` brings the whole stack up.

### 2.2 Repository Layout
```
banking-shield/
├── docker-compose.yml
├── README.md
├── .env.example
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts
│       ├── routes/
│       │   ├── auth.ts
│       │   ├── accounts.ts
│       │   ├── transactions.ts
│       │   ├── verify.ts          # the verifier endpoint
│       │   ├── render.ts          # image rendering for protected values
│       │   └── quarantine.ts
│       ├── lib/
│       │   ├── db.ts
│       │   ├── hmac.ts
│       │   ├── session.ts
│       │   └── seed.ts            # per-session deterministic data generation
│       └── types.ts
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── vite.config.ts
│   ├── index.html
│   ├── overview.html
│   ├── transaction.html
│   ├── quarantine.html
│   ├── locked.html
│   └── src/
│       ├── main.ts
│       ├── pages/
│       │   ├── login.ts
│       │   ├── overview.ts
│       │   ├── transaction.ts
│       │   └── quarantine.ts
│       ├── shield/
│       │   ├── index.ts           # public API of the protection module
│       │   ├── observer.ts        # MutationObservers (whitelist + blacklist)
│       │   ├── nonce.ts           # nonce management for legitimate updates
│       │   ├── verifier.ts        # heartbeat loop to backend
│       │   ├── watchdog.ts        # mutual-watchdog pattern
│       │   ├── integrity.ts       # self-integrity checks (function hashing)
│       │   ├── devtools.ts        # heuristic DevTools detection
│       │   ├── origin.ts          # detects "saved locally" and redirects
│       │   └── report.ts          # reports tamper events to backend
│       └── styles.css
└── db/
    └── init.sql
```

---

## 3. The Demo Banking Application

### 3.1 Pages

1. **Login page** (`/`): simple form, accepts any of the seeded demo users. No real authentication strength needed — this is a PoC.
2. **Overview page** (`/overview`): shows the user's account balance prominently, plus a list of the last ~20 transactions (mixed incoming and outgoing). Each transaction row is **clickable** and navigates to the transaction detail page.
3. **Transaction detail page** (`/transaction/:id`): shows full details of a single transaction — date, sender IBAN, recipient IBAN, amount, reference text, type (incoming/outgoing).
4. **Quarantine page** (`/quarantine`): shown when the shield detects tampering. Contains a clear warning message, the reason for the quarantine, a counter showing how many strikes the session has, and a "Back to overview" button.
5. **Locked page** (`/locked`): shown when the strike counter reaches 5. Tells the user the account is locked and they must contact the bank. No way back from here in the demo (in reality this would require a phone call / branch visit).

Both the **overview page** and the **transaction detail page** must be protected by the shield system — these are the pages where scammers most commonly manipulate values.

### 3.2 Data Model

**Per-session deterministic data:** when a user logs in, a session is created with a seed derived from `hash(user_id || session_creation_timestamp)`. All displayed data (account balance, transaction list, individual transaction details) is generated deterministically from this seed using a seeded PRNG. This means:
- Within one session, the same balance and transactions are shown consistently.
- Across sessions (even for the same user), the data is different.
- The backend stores the seed and can regenerate the same data on demand for the verifier.

The transaction list should include ~20 entries with realistic-looking German bank data: mix of incoming/outgoing, varied amounts (5€ to 4000€), varied reference texts ("Gehalt November", "Miete", "Rückzahlung Essen", "Amazon Order #..." etc.), recent dates within the last 60 days. Generate 3–5 different recipient/sender names that recur, plus some one-offs.

### 3.3 Seeded Demo Users
```
alice@example.com  / demo123
bob@example.com    / demo123
charlie@example.com/ demo123
```

---

## 4. The Shield System (Five Layers)

This is the core of the project. All layers must work together; each layer is bypassable on its own.

### 4.1 Layer 1 — Structural Monitoring (MutationObserver)

Two observer types run on protected pages.

**Whitelist Observer** — watches every element with a `data-protected` attribute for:
- `characterData` changes (text edits)
- `childList` changes (children added/removed)
- `attributes` changes (style, class manipulation)

Every legitimate update to a protected element must go through `shield.updateProtected(element, newValue, nonce)`, which:
1. Validates the nonce against a nonce issued by the backend in the most recent verify-ack.
2. Sets a short-lived `data-update-nonce` attribute on the element so the observer can recognize this mutation as legitimate.
3. Performs the update and immediately clears the nonce.

Any mutation observed without a valid nonce → trigger `shield.reportTamper(reason, details)`.

**Blacklist Observer** — watches the entire `document.body` (`subtree: true`) for added nodes. For each added node:
- If it has the same computed bounding rect as a protected element (overlap detection).
- If it has `position: fixed` or `position: absolute` and z-index higher than any protected element.
- If it contains text that looks like a currency value (regex like `/[\d.,]+\s*€/`) and was not added via the shield's own update mechanism.

Any match → `shield.reportTamper`.

### 4.2 Layer 2 — Server-Rendered Image for Critical Values

The account balance on the overview page, and the amount + recipient IBAN on the transaction detail page, are rendered as PNG images by the backend, not as HTML text.

**Image endpoint:** `GET /api/render/:type/:id?token=<hmac>`
- `type`: one of `balance`, `amount`, `iban`.
- `id`: account ID or transaction ID.
- `token`: HMAC-SHA256 of `type|id|value|session_id|expiry`, validated server-side.
- Response: PNG image. Includes anti-cache headers.
- Backend regenerates the value from the session seed and renders it onto a transparent PNG at 2x resolution for sharp display.

**Frontend usage:**
```html
<img
  data-protected="balance"
  data-protected-type="balance"
  data-protected-id="acc_42"
  src="/api/render/balance/acc_42?token=..."
  alt="Account balance"
  aria-label="Account balance: see image"
/>
```

The `aria-label` is intentionally vague to avoid revealing the value to a DOM-text manipulation attempt while still being non-empty for accessibility tooling. The real value is communicated to screen readers via a separate channel: a visually hidden `<span>` whose text is *also* under MutationObserver protection and verified.

If the `src` of a protected image is changed, the blacklist observer catches the attribute mutation. If the image is replaced with a different image (different URL), the verifier (Layer 3) will catch the mismatch.

### 4.3 Layer 3 — Verifier Heartbeat

A loop runs every 3 seconds while on a protected page.

**Client side:**
1. Collect all protected elements via `[data-protected]`.
2. For each, compute a fingerprint:
   - For text elements: SHA-256 of textContent + computed style snapshot (color, font-size, display).
   - For image elements: the HMAC token in the `src` (already signed by server).
3. POST to `/api/verify` with `{ session_id, page, fingerprints: [...] }`.
4. Server compares against expected fingerprints derived from the session seed.
5. Server responds with a signed ack containing a fresh `update_nonce` (valid for 5 seconds) and a status.

**Server responses:**
- `{ status: "ok", nonce: "..." }` → all good, shield uses nonce for the next legitimate update.
- `{ status: "mismatch", element_ids: [...] }` → client navigates to `/quarantine?reason=verify_mismatch` and the session strike counter is incremented server-side.
- HTTP 401 / no response within 6 seconds → after 2 retries, also quarantine.

**Critical:** the "submit transaction" button on any transaction-creation page (not part of the demo's primary flow but include a stub) requires a fresh verify-ack token less than 5 seconds old. If the verifier is killed, the button stops working.

### 4.4 Layer 4 — Anti-Tampering of the Shield Itself

These measures raise the bar for an attacker who tries to disable the shield from DevTools.

- **Module encapsulation:** the shield's internal state lives entirely inside an IIFE closure. The only thing exposed on `window` is `window.__shield` with a frozen object containing `{ updateProtected, reportTamper }`. No references to observers, the verifier interval, or internal nonces are reachable.
- **Watchdog pattern:** two independent intervals (`watchdogA` and `watchdogB`) run on different timers. Each checks that the other is still ticking (via a shared counter that each increments on its tick). If one watchdog detects the other has stopped, it triggers a tamper report and quarantine. Both must be killed within ~1s of each other to evade detection.
- **Function integrity:** at startup, the shield stores `verifier.toString()` hashes for its critical functions. Before each heartbeat, it re-hashes and compares. (Note: this only catches `.toString` replacement, not bytecode-level patches — it's a speed bump, not a wall.)
- **DevTools heuristic detection:** check `window.outerHeight - window.innerHeight` for unexpected jumps; use the `console.log(obj)` getter trick (define a getter on a property of a logged object; if DevTools is open and inspects it, the getter fires). Treat as a soft signal — log it server-side but don't auto-quarantine on it alone (false positives are real).
- **Strict CSP:** the backend sets `Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'`. No inline scripts, no external scripts. Combined with **Subresource Integrity** on the main shield bundle.

### 4.5 Layer 5 — Origin & Saved-Page Detection

When the page loads, the shield runs origin checks:

1. `window.location.protocol` must be `https:` (or `http:` only for `localhost` dev). If it's `file:`, the page was saved and opened locally → immediately redirect via `window.location.replace('https://<configured-bank-host>/quarantine?reason=saved_offline')`.
2. `window.location.hostname` must match the configured bank host (env-injected at build time). Mismatch → same redirect.
3. The shield bundle's hash is computed at load and POSTed to `/api/verify/bootstrap`. If the backend cannot match the hash to a known-good build, or if the request fails entirely (likely because the page is offline / saved), redirect.
4. A `<noscript>` block on every protected page contains a full-page red warning: "Diese Seite kann ohne JavaScript-Schutz nicht sicher angezeigt werden." (English in source comments; user-facing text in German is fine for realism.)

### 4.6 Quarantine Flow

When `shield.reportTamper(reason, details)` is called:

1. POST to `/api/quarantine/report` with `{ session_id, reason, details, page, timestamp }`.
2. Server increments the `strike_count` for this session in the database.
3. Server response includes the new strike count.
4. If strike count < 5: client calls `window.location.replace('/quarantine?reason=' + reason)`.
5. If strike count >= 5: client calls `window.location.replace('/locked')` and the server marks the session as locked. All subsequent API calls for this session return 423 (Locked).
6. On the quarantine page, a "Back to overview" button is available. Clicking it does NOT reset the counter — the counter persists for the session lifetime and is visible on the quarantine page ("Strike 2 of 5 — your account will be locked after 5 strikes").

The `/quarantine` page itself is intentionally simple HTML (no protected elements, no shield active) so attackers can't trigger an infinite quarantine loop by tampering with the quarantine page.

---

## 5. Demonstration Plan

The README must include a "How to demo the attacks" section showing:

1. **Attack A — Change balance via DevTools:** open DevTools → Elements → find the protected balance → try to edit it (text edit on the image alt, or replace `<img>` with a `<span>` showing fake text). Expected: within ~100ms the blacklist observer fires and the page redirects to `/quarantine`.
2. **Attack B — Inject overlay:** in DevTools Console run a snippet that creates a `<div style="position:fixed; ...">9.999,00 €</div>` over the balance. Expected: blacklist observer detects the overlapping fixed-position element with currency-like content → quarantine.
3. **Attack C — Kill the verifier:** in Console try `clearInterval(...)` on visible timers, or freeze `window.__shield`. Expected: watchdog detects the missing heartbeat within ~3 seconds → quarantine.
4. **Attack D — Save page locally:** Ctrl+S the overview page, open the saved `.html` file. Expected: origin check fires, redirect to the real bank's quarantine page.
5. **Attack E — Five strikes:** repeatedly trigger any attack. After the 5th, the session is locked and `/locked` is shown.

---

## 6. Non-Functional Requirements

- **Reproducibility:** `docker compose up` must bring the whole stack up with seeded users and a working demo, no manual steps.
- **Logging:** the backend must log every quarantine event with full detail to stdout (structured JSON), so the demo viewer can see what triggered what.
- **No external services:** everything self-contained, no API keys, no cloud dependencies.
- **README:** must contain: project overview, architecture diagram (ASCII is fine), how to run, demo users, demo attack scripts (copy-pasteable DevTools snippets), explicit "Limitations" section explaining what the system does NOT protect against (Section 1.2).

---

## 7. Build Order Recommendation

Suggested implementation order to keep the project demoable at every step:

1. Docker Compose skeleton + Postgres + empty backend + empty frontend serving login page.
2. Auth + sessions + seeded data generation + overview page (no protection yet).
3. Transaction detail page (still unprotected).
4. Layer 1 (MutationObserver, both whitelist and blacklist) + nonce mechanism.
5. Layer 3 (verifier heartbeat) + quarantine flow + strike counter + `/quarantine` and `/locked` pages.
6. Layer 2 (image rendering for balance and amount).
7. Layer 4 (watchdog, integrity, encapsulation, CSP).
8. Layer 5 (origin checks, saved-page detection).
9. Polish, README with demo attack scripts, final test pass on all five attacks.

---

## 8. Open Questions to Resolve During Implementation

These are flagged for the implementing agent to decide and document:

- Exact image dimensions and font for rendered values (must look natural in the layout).
- Whether to use `crypto.subtle` (browser) or a small JS hash library for client-side fingerprinting.
- Exact backoff strategy for verifier retries on transient network errors.
- Whether to obfuscate the shield bundle in the demo (recommend: no — keep it readable for the educational value of the PoC).