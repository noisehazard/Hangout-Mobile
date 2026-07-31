# HangoutAI

Broadcast that something is happening near you — or that you're up for going out — so other
people can see it on a map and join. The first screen is an Airbnb-style map with "cloud"
bubbles showing events and how many people are there or willing to go, including whether a group
is open to meeting new people.

## Status

MVP scaffold with a bottom tab bar, now backed by **Supabase**. Identity is
**anonymous by default** — every install gets a real account with no sign-up step — with an
optional upgrade to an email-linked account (6-digit code, no password). Google/Apple sign-in is
planned for a later cycle.

- **Discover** — an interactive map with cloud-bubble markers, rendered with **Leaflet +
  OpenStreetMap inside a WebView**. Shows **real events created by users within 30km**, clustered
  into one bubble when zoomed out; tap a bubble for a bottom sheet with details and an "I'm in!"
  button that joins the event. Events **auto-expire** (TTL) so the map only shows things that are
  actually still happening.
- **Create** — post a real hangout (title, details, vibe chips, "open to strangers") that other
  nearby users can discover.
- **Friends** — a mock friend list with live-presence dots (still local/mock).
- **You** — your profile: anonymous by default, with an option to save your account to an email
  address.

**Where the map centers:** in local development it centers on **Chișinău, Moldova** and skips the
GPS prompt; in production it asks for location permission and centers on the user (falling back to
Chișinău if denied or slow). Nearby events are queried *around* whatever the center is.

## Run it

```bash
npm install       # if you haven't already
npx expo start
```

Then open the project in **Expo Go** on an Android phone (scan the QR code), or press `a` to
open it in a local Android emulator.

### Backend setup

The app needs a Supabase project to talk to:

1. Create a free project at https://supabase.com.
2. Authentication → Providers: enable **Anonymous sign-ins** and **Email**.
3. SQL Editor: run the files in `supabase/migrations/` in numerical order. They are
   idempotent, so re-running one is safe.
4. Create a `.env` in the project root with your project's values (the **publishable/anon**
   key — never the secret key):

   ```
   EXPO_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
   ```

Without a valid `.env`, the app throws on startup by design.

Extensions used: `postgis` (geo radius) and `pg_cron` (hourly cleanup of expired events).

#### Email verification

Creating and joining a hangout both require a **verified** account, so email delivery is a hard
dependency. Two things must be set up:

- **Email template** — the anonymous→email upgrade verifies a 6-digit code, not a link. Add the
  `{{ .Token }}` variable to Authentication → Email Templates → **Change Email Address**. Without
  it the email only contains a link and the in-app code entry has nothing to check against.
- **Custom SMTP** — Supabase's built-in sender is rate-limited to a few messages an hour and only
  delivers to your own team addresses. Custom SMTP is free: Authentication → Emails → SMTP
  Settings. Gmail works (enable 2-Step Verification, create a 16-character **App Password**, then
  host `smtp.gmail.com`, port `465`); so does Brevo (300/day free).

#### Testing friends locally

Friends need two accounts. Set a handle on yours, then seed a second profile and an accepted
friendship (replace `<your-uid>`):

```sql
insert into auth.users (id, is_anonymous, aud, role)
values ('00000000-0000-0000-0000-0000000000f2', true, 'authenticated', 'authenticated');
update public.profiles set handle = 'tester'
where id = '00000000-0000-0000-0000-0000000000f2';
insert into public.friendships (requester_id, addressee_id, status)
values ('<your-uid>', '00000000-0000-0000-0000-0000000000f2', 'accepted');
```

### Local emulator scripts (Windows)

The Android SDK, JDK, and emulator live under `D:\Android` (see the scripts for exact paths).
Three helpers wrap the whole flow:

```bash
bash scripts/run-dev.sh     # boot the emulator (hardware GPU), start Metro, launch the app
bash scripts/stop-dev.sh    # stop the emulator and Metro
bash scripts/shot.sh [out]  # save a screenshot of the emulator
```

`run-dev.sh` is idempotent — it skips whatever is already running. The emulator AVD is
`HangoutPixel`; it's configured for hardware GPU and 4 GB RAM for smooth performance.

> **Why Leaflet instead of react-native-maps?** react-native-maps uses Google Maps, whose tiles
> fail to authorize under Expo Go's shared API key (blank map). Leaflet with OpenStreetMap tiles
> needs no API key and renders in Expo Go out of the box. The map lives in a WebView
> (`src/components/LeafletMap.tsx`) and talks to React Native via `postMessage`. If you later want
> native Google/Apple maps, swap this component for react-native-maps in a development build with
> your own API key.

## Project layout

```
src/
  app/
    _layout.tsx            # providers + bottom tab navigator (Discover/Create/Friends/You)
    index.tsx              # Discover — the map screen
    create.tsx             # Create — mock "post a hangout" form
    friends.tsx            # Friends — mock friend list
    profile.tsx            # You — mock guest profile
  components/
    LeafletMap.tsx         # Leaflet + OSM map in a WebView (cloud bubbles + clustering)
    EventBottomSheet.tsx   # event details sheet
  data/mockEvents.ts       # mock events generated around a center + region constants
  hooks/useUserLocation.ts # dev→Chișinău, prod→GPS with 8s timeout fallback
  types/event.ts           # HangoutEvent type
  theme.ts                 # shared colors + spacing
```

## What's next

Push notifications (client registration), richer discovery (list view, search, filters), and
Google/Apple sign-in. `FEATURES.md` tracks what currently ships.
