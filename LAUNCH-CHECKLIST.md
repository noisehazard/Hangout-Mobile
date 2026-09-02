# Launch checklist

What is left before Hangout can go in front of real people, and what is known
broken. Written 2026-09-02. Companion to `FEATURES.md`, which describes what
*exists*; this file tracks what *remains*.

Keep this current the same way `FEATURES.md` is kept current.

---

## Done — do not redo

- `send-push` deployed (`--no-verify-jwt`) with a Database Webhook on
  `notification_outbox` INSERT. Verified end to end: inserting a row stamps
  `sent_at`.
- `error-alert` and `metrics-digest` deployed, delivering to **Telegram**, not
  email. Both paths tested: crash sends, non-fatal is skipped, metrics send.
- Android OAuth client for `com.hangout.app` + debug SHA-1
  `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25` exists in Google
  Cloud, named "Hangout Android (debug)".
- `npx expo prebuild -p android --clean` run after the rename. Native project is
  on `com.hangout.app`, `google-services.json` is copied in, FCM default channel
  is `default` (matches `ANDROID_CHANNEL_ID`), deep-link scheme is `hangout`.
- Migrations 0001–0022 all applied.
- App verified running in Expo Go on the emulator after the rename (onboarding
  renders, `[push] not registering: expo-go` degrades gracefully).

---

## Where we left off (2026-09-02, end of session)

`main` = `faa115d`. Typecheck, lint and 104 tests all clean. Emulator verified
working; the app runs and renders.

**The 7-step post-rename plan was worked through in order. Steps 1-4 and 7 are
done** (see "Done" above). **Steps 5 and 6 were deliberately parked by Daniel**
and are the two entries under "Blocks launch" below:

- **Step 5** = the legal placeholders. Blocked on two decisions only Daniel can
  make: the name to publish under, and the governing law.
- **Step 6** = OTP email deliverability. Not blocked on anything — just not done
  yet. **This is the highest-risk unknown in the whole project.**

**The next piece of code work**, and the last thing fixable without a device, is
known issue #1 below: the duplicate-push race in `send-push`. It was offered and
neither accepted nor declined.

**Then** the remaining work genuinely requires Daniel: a phone, a Play account,
and two strings.

---

## Blocks launch

### 1. OTP email delivery — highest risk, unverified

Creating *and* joining both require a verified account, so **every invitee must
receive a code by email**. This has never been confirmed to work.

Specific reason for concern: Gmail rejected the same SMTP credential with
`535 BadCredentials` when the Edge Functions used it. Supabase Auth is
configured separately (Project Settings → Authentication → SMTP Settings) and
may hold a different password — but nobody has checked.

- [ ] Confirm Auth SMTP is configured and working
- [ ] Send a real OTP to Gmail, Outlook, and a Moldovan provider
- [ ] **Check spam folders** — mail relayed via a personal Gmail often lands there
- [ ] Raise the Auth hourly email rate limit before a launch evening

If it is broken: a fresh Gmail App Password is the cheapest fix. Resend does
**not** work here — without a verified domain it only delivers to your own
address, which is useless for invitees.

The supply plan is explicit that discovering this *after* the 15 personal asks
is the one mistake that cannot be undone.

### 2. Legal placeholders

`src/lib/contact.ts` still ships:

```ts
export const OPERATOR = '[ENTITY/NAME]';
export const JURISDICTION = '[JURISDICTION]';
```

Shown in-app under You → Privacy & Terms. **Play review rejects bracketed
placeholders.** Two decisions needed: the name to publish under (an individual's
legal name is fine and normal), and the governing law.

Note: individual developers on Google Play must display a **public physical
address** on the store listing.

### 3. Play Console

$25 one-off, plus the address requirement above. Not started.

### 4. Device testing

Nothing in the push client has run on real hardware. Unverified: Expo token
registration, notification delivery, tap-to-open routing, and Google sign-in
(which cannot work in Expo Go — it needs the installed build).

Needs `npx expo run:android` on a real phone.

---

## Unconfirmed — one dashboard glance each

- [ ] Database Webhook on `client_errors` INSERT → `error-alert`. Without it,
      real crashes trigger nothing.
- [ ] Crons registered: `select jobname, schedule, active from cron.job;` should
      list `error-digest-daily` and `metrics-digest-weekly`.

---

## Known issues, priority order

1. **Duplicate push notifications.** The webhook fires once per inserted row and
   `send-push` drains up to 100 rows per invocation, so simultaneous inserts can
   each read the same unsent rows before any stamps `sent_at`. A chat message
   inserts one row per attendee, so this is reachable in normal use. Fix: claim
   rows atomically (`update … set sent_at = now() where id in (select … for
   update skip locked limit 100) returning *`). ~10 lines.
2. **`LeafletMap` has the frozen-clock bug.** `src/components/LeafletMap.tsx`
   computes live/`startLabel` inside injected WebView JS that only re-runs when
   markers are pushed, so labels go stale. The React side was fixed with
   `useNow()`; the WebView side was not.
3. **`nearby_events` has no `LIMIT`** and the vibe filter is client-side. Fine at
   soft-launch scale, not beyond it.

---

## Deferred by decision

- **Kotlin rewrite: rejected** (2026-09-02). ~6,600 lines of client TS would be
  lost; the SQL and Edge Functions are stack-independent. The binding risk is
  supply, not the client language, and Expo OTA updates matter during a soft
  launch. Revisit only if background geofencing becomes core, or the map
  struggles on real mid-range phones.
- **`react-native-maps` swap** — the cheap 10% of that rewrite which recovers
  most of the map-performance argument. The original blocker (Google Maps key
  failing under Expo Go) is gone now that builds are local dev builds.
- Discovery filters, external event seeding, phone/SMS verification, iOS.

---

## Release build, when it comes

The debug SHA-1 above covers local builds only. A release build signed by EAS or
Play App Signing has a **different** fingerprint and needs its own Android OAuth
client with the same package name. With Play App Signing, register the SHA-1
Play shows you *after* the first upload, not the local one. Expect Google
sign-in to work in dev and fail in the store build until this is done.
