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

### 2. Legal placeholders — RESOLVED 2026-09-27

Both decisions are made. Hangout publishes as a **physical person**, and
`src/lib/contact.ts` now ships real values:

```ts
export const OPERATOR = 'Brițchi Daniel';
export const OPERATOR_ADDRESS = 'MD-2004 Chișinău, Moldova';
export const JURISDICTION = 'Moldova';
```

`OPERATOR_ADDRESS` is new: publishing as an individual makes that person the
GDPR data controller, and a controller notice has to carry a postal address.
It renders in the privacy policy intro under You → Privacy & Terms.

**Still open:** the address above has no street line. Google Play's listing
address and the identity-verification documents both need a full one, and the
listing address must match what the policy shows. Fill in the street before
submitting, in `src/lib/contact.ts` and in Play Console together.

**Also still open:** the three GDPR content gaps in section 3d — legal basis,
the user-rights list, and the international-transfer statement. Naming the
controller was the first of the four; the other three are unwritten.

### 3. Play Console

$25 one-off, plus the address requirement above. Not started.

Publishing as a **physical person** (a "Personal" Play developer account) is a
supported, normal route for an app like this. It is cheaper and faster than
registering a company, and it costs three things: your legal name and a
physical address become **public on the store listing**, you personally are the
data controller for GDPR purposes, and you personally carry the liability the
Terms disclaim. Everything below assumes that choice.

#### 3a. Account setup, in order

- [ ] Register a **Personal** account, $25 one-off, non-refundable.
- [ ] Pass **identity verification** - government photo ID plus proof of
      address. A D-U-N-S number is an *organisation* requirement; personal
      accounts do not need one.
- [ ] Decide the **public address**. It is shown to every user on the listing.
      Many solo developers use a registered or virtual mailbox rather than
      their home. Decide before verification, because it has to match the ID
      documents.
- [ ] **Closed testing before production.** New personal accounts must run a
      closed test with a minimum number of testers opted in continuously for a
      minimum period, then apply for production access. Google has changed
      these numbers more than once (it was 20 testers / 14 days, later
      12 / 14) - **read the exact current figures in Play Console before
      planning a launch date.** Whatever they are, this is a multi-week gate
      and it needs that many real Android devices. Recruit testers now, not
      once the build is ready.

#### 3b. The legal documents Google actually requires

**A privacy policy at a public URL is the hard blocker.** The in-app copy in
`src/app/legal.tsx` does not satisfy Google on its own. The URL has to be
publicly reachable with no login, not geoblocked, and not user-editable (a
shared Google Doc with edit rights gets rejected). It goes in Play Console
under App content -> Privacy policy, and it should stay linked in-app too.

**An account-deletion URL is the second hard blocker.** Apps that let users
create accounts must offer both in-app deletion - we have it,
`delete_my_account` - *and* a **web page where deletion can be requested
without installing the app**. That URL is declared in the Data safety form.

Both need the website that does not exist yet (see the "no domain registered"
note). Two static pages on a registered domain unblock both. This is now the
longest pole in the launch.

Then, all inside Play Console -> App content:

- [ ] **Data safety form.** Declare every data type Hangout collects: precise
      and approximate location, email, user IDs, photos, in-app messages, and
      crash/diagnostic data. State that it is encrypted in transit and that
      users can request deletion. It has to agree with the privacy policy and
      with what the code actually does - a mismatch is a common rejection.
      Supabase is a processor: that counts as "collected", not "shared".
- [ ] **Content rating questionnaire** (IARC, free). Answer honestly for
      user-generated content, user-to-user messaging and location sharing.
      Expect a teen rating, not "Everyone".
- [ ] **Target audience and content.** 13+, matching the Children clause in
      the policy copy. Do not tick any child age band, or the Families policy
      applies and the bar rises sharply.
- [ ] **App access.** If anything sits behind the OTP login, supply working
      demo credentials. Reviewers reject what they cannot reach.
- [ ] **Ads declaration**: no ads. **Financial features**: none. **Health**:
      none. **Government app**: no. No other special declaration applies.

#### 3c. Policies this app is specifically exposed to

- **User-generated content.** A social app has to ship in-app reporting of
  content *and* users, in-app blocking, a published acceptable-use policy, and
  a real process for acting on reports. Reporting and blocking exist
  (`src/app/event/[id].tsx`, `src/app/user/[id].tsx`), the policy exists in the
  Terms, and `profiles.is_admin` is the enforcement hook. What is written down
  nowhere is the process - how fast reports get looked at, and by whom. Write
  that down before review.
- **Location.** Foreground-only `ACCESS_FINE_LOCATION` needs a prominent
  in-app disclosure shown *before* the system permission prompt, on top of the
  privacy-policy disclosure. We deliberately do **not** request
  `ACCESS_BACKGROUND_LOCATION`, which is what triggers the written declaration
  and video review - keep it that way.
- **Real-world meetings.** The Terms already carry the "meeting people carries
  real-world risk" line. Keep it; it is the right disclosure for this app.

#### 3d. Gaps in the current legal copy

`src/app/legal.tsx` reads well and covers collection, use, sharing, location,
diagnostics, retention, deletion, children and contact. Publishing as a
physical person in Europe makes the policy a GDPR controller notice as well,
and three things are missing:

- [x] **Name the controller.** Done 2026-09-27 - `OPERATOR` plus the new
      `OPERATOR_ADDRESS` render in the policy intro. The street line is still
      missing; see section 2.
- [ ] **Legal basis and user rights.** State the basis for each purpose
      (contract for running the service, legitimate interest for safety and
      diagnostics, consent for location) and list the rights: access,
      rectification, erasure, portability, objection, and complaint to a
      supervisory authority.
- [ ] **International transfers.** Say where Supabase stores the data and, if
      that is outside the EEA, on what transfer mechanism.

Moldova's own data-protection law (Law 133) tracks GDPR closely, so one policy
written to the GDPR standard covers both.

#### 3e. Release-build mechanics

- [ ] Enrol in **Play App Signing**; register the SHA-1 Play shows after the
      first upload as a new Android OAuth client (see "Release build" below).
- [ ] Bump `versionCode` - `android/app/build.gradle` still has
      `versionCode 1`.
- [ ] Confirm the **target API level** meets Play's current minimum for new
      apps. It rises every August. Expo SDK 57 should already be at or above
      it; verify, do not assume.
- [ ] **Audit the release manifest for permissions we never use** (see Known
      issues 4).
- [ ] Store listing assets: 512x512 icon, 1024x500 feature graphic, at least
      two phone screenshots, short description (80 chars), full description,
      category, and a public contact email.

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
4. **The merged Android manifest declares permissions the app never uses.**
   `android/app/src/main/AndroidManifest.xml` carries `RECORD_AUDIO` and
   `SYSTEM_ALERT_WINDOW`, neither of which backs any feature - they arrive with
   the dev-client tooling. Microphone is a sensitive permission that has to be
   justified and declared in Data safety, and "display over other apps" invites
   review scrutiny. Before submitting, dump the **release** merged manifest and
   check whether they survive; if they do, strip them with a
   `tools:node="remove"` entry from a config plugin.

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
- Discovery filters, external event seeding, phone/SMS verification, an iOS App
  Store release. iOS *testing* is now possible without paying Apple — an unsigned
  dev client from `codemagic.yaml`, sideloaded with a free Apple ID; see
  `docs/ios-free-sideload.md`. Push and Google sign-in do not work that way, so
  both still have to be verified on Android.

---

## Release build, when it comes

The debug SHA-1 above covers local builds only. A release build signed by EAS or
Play App Signing has a **different** fingerprint and needs its own Android OAuth
client with the same package name. With Play App Signing, register the SHA-1
Play shows you *after* the first upload, not the local one. Expect Google
sign-in to work in dev and fail in the store build until this is done.
