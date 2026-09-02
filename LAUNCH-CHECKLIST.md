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
- Migrations 0001–0023 all applied.
- Database Webhook "Alert on client error" on `client_errors` INSERT →
  `error-alert`, verified end to end: a fatal test row produced a Telegram
  alert. Crons `error-digest-daily` and `metrics-digest-weekly` registered and
  active.
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

**The duplicate-push race is fixed, applied and deployed** (2026-09-03). That
was the last thing fixable without a device.

**Everything that remains needs Daniel**: two strings in `src/lib/contact.ts`, a
Play Console account, two cross-provider email checks, and a phone.

**Then** the remaining work genuinely requires Daniel: a phone, a Play account,
and two strings.

---

## Blocks launch

### 1. OTP email delivery — works, cross-provider check outstanding

**Confirmed working 2026-09-02.** Auth SMTP delivers sign-in codes; the
`535 BadCredentials` that broke the Edge Functions did not affect Supabase Auth,
which holds its own separate SMTP configuration.

Remaining, and cheap:

- [ ] Send a code to **Outlook** and to a **Moldovan provider**. Delivery to the
      sender's own Gmail does not prove either — those are the providers the
      supply plan flags as the weak point, and a personal-Gmail relay is exactly
      what they filter.
- [x] Spam check on the sender's own provider — passed, code landed in the inbox.
- [ ] Raise the Auth hourly email rate limit before a launch evening where 15
      people sign up at once. The default is low.

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

## Known issues, priority order

1. ~~**Duplicate push notifications.**~~ **Fixed in code** — migration
   `0023_claim_notifications` adds `claimed_at` plus a `claim_notifications()`
   RPC using `FOR UPDATE SKIP LOCKED`, and `send-push` now claims instead of
   selecting. Claiming is separate from sending, so a crashed invocation retries
   after 5 minutes rather than losing the notification.
   Migration applied and `send-push` redeployed 2026-09-03. Verified the
   deployed function drains through the RPC, including three concurrent
   invocations. **Not yet proven:** the claim semantics under real contention —
   that needs actual queued rows and registered device tokens, so it rides along
   with the device test.
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
