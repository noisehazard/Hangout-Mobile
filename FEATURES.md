# Hangout — Implemented Features

A living record of what the app currently does. **Update this file whenever functionality is added, changed, or removed.**

_Last updated: 2026-08-16 (metrics, rate limits, repeat hangout)_

## Overview

Hangout is an Android-first (Expo / React Native) app for broadcasting and discovering hangouts happening *now* at a location, shown on a live map, with friends and open discovery both first-class. Backend is Supabase (Postgres + PostGIS, Auth, Storage, Realtime, RLS).

Four bottom tabs: **Discover**, **Create**, **Friends**, **You**.

- **Feedback** — actions report their outcome in a toast above the tab bar.
  Messages our own SQL raised (Postgres `P0001`) are shown verbatim; any other
  database or network error shows a plain fallback and is logged instead.
  Confirmations (delete, block, remove friend) stay as dialogs.

## Identity & accounts

- **Anonymous by default** — a session is created on first open; the app never sits signed-out.
- **Email upgrade** — anonymous users can attach an email and confirm a **6-digit OTP** to become *verified*, preserving the same account/profile (`You` tab). Requires custom SMTP configured in Supabase, and the `{{ .Token }}` variable in the *Change Email Address* template — without it the mail carries only a link and the in-app code entry has nothing to match.
- **Google sign-in** — "Continue with Google" on the You tab links a Google identity to the **existing anonymous account** via `linkIdentity`, so the handle, hosted events and friendships survive. Google supplies a pre-confirmed email, which trips the verification trigger and sets `verified` with no email delivery involved. Needs Supabase *manual linking* enabled, and an Android OAuth client per signing key — the debug and EAS release keystores have different SHA-1s, and a missing one fails with `DEVELOPER_ERROR` (code 10). Hidden in Expo Go, which cannot load the native module.
- **Verified-to-act gating** — anyone can browse; **creating or joining** an event requires a verified account, enforced server-side and prompted in the UI.
- **Handles** — every profile has a unique, case-insensitive handle; editable on the You tab and during onboarding.
- **Profile photo** — set, replace, or remove an avatar from the You tab (square-cropped, stored in a per-user `avatars` bucket). Avatars appear in the friends list, attendee lists, and blocked-users screen.
- **Roles/flags** — profiles carry `verified`, `banned`, and `is_admin`. Banned users cannot create or join.
- **Account deletion** — a "Delete account" action on the You tab (double-confirmed) permanently removes the account and all owned data (profile, events, messages, friends, etc.), then re-anonymizes.

## Legal & distribution

- **Privacy Policy + Terms** — in-app `/legal` screen (linked from You → "Privacy & Terms"). Template text; bracketed fields (`[DATE]`, `[CONTACT EMAIL]`, `[JURISDICTION]`) must be filled/reviewed before launch. Google Play also requires the policy at a **public URL**, which is not yet hosted.
- **Support** — You → "Help & feedback" opens a pre-addressed email with the user's handle, app version, and device attached. Contact details and the legal copy's operator/jurisdiction live in `src/lib/contact.ts`; the operator and governing law are still placeholders and Play review will reject them.
- **EAS build config** — `eas.json` with `development` (dev client, for push testing), `preview` (internal APK), and `production` (Play app-bundle) profiles; `app.json` has Android package `com.hangout.app`. Actual builds require an Expo account (`npx eas build --profile <name> --platform android`).

## Onboarding

- First-run flow (once per install): **welcome → pick a handle → enable location**. Steps are skippable. (Notification priming deferred until push lands.)

## Discover (map)

- **Leaflet + OpenStreetMap** map in a WebView (no API key). Centers on **Chișinău** in development; GPS in production (with fallback).
- Event **cloud bubbles**, clustered when close; tapping opens a bottom sheet with event card(s).
- **Opening animation** — on first launch, the 3 most popular events pop in as clouds in a triangle, then fly to their real map pins as the map fades up.
- **Dev test events** (`Test 1/2/3`) are always shown first in development (`__DEV__` only).
- Bottom sheet closes on outside tap or when opening details.
- **Vibe filter** — a chip bar (Drinks, Sports, Coffee, Music, Food, Chill) filters the map's bubbles to one vibe; tap the active chip to clear. Client-side over the loaded events.

## Events

- **Repeat a hangout** — the host's options menu offers "Repeat this hangout" (tomorrow / next week, same time), re-posting the same place and details with the original duration preserved. Past start times are never offered.
- **Create / edit / delete** (host only) with title, description, optional photo, theme/vibe, start time, and an end time / TTL (auto-cleaned hourly).
- **Location picker** with place search + reverse geocoding; drag-to-move pin.
- **Per-event location privacy** — host chooses **Exact** or **Approximate** (default Approximate). Approximate events show a **deterministic fuzzed point** (~±330 m) and an area circle + note to non-members; the true spot is revealed to the host, accepted friends, and anyone who has joined.
- **Visibility** — each hangout is **Public** (on the map for everyone), **Friends only** (on the map only for the host's friends), or **Invite only** (off the map; only the host and invited friends can see or join). Enforced server-side via `can_access_event`.
- **Event detail** — map, description, host, time, theme, openness, friends-going count, who's-going, chat, share, join, and (host) edit/delete.
- **Share links** — a Share button on event detail sends `<share host>/e/<id>` (plus a `?k=` token for non-public events), which deep-links into the app via the `hangout://` scheme. The host comes from `EXPO_PUBLIC_SHARE_HOST` and defaults to a placeholder — no domain is registered and the landing site that performs the redirect is still to be built, so shared links do not resolve yet. The token is a **doorknob**: two `security definer` RPCs check it once at the door, and after joining the caller is an ordinary attendee, so `can_access_event` and every RLS policy are untouched. Blocks, bans, expiry, the verified-to-join gate and location fuzzing all still apply to a link holder. The host mints a token on first share (confirmed for friends/private events) and can revoke it from the options menu, which rotates it and kills every link already sent. The `https` redirect site is not hosted yet, so links currently resolve only for people who already have the app.
- **Join** ("I'm in") — verified users; **Who's going** attendee list is shown to verified users only (everyone sees the count).

## Friends

- Add by **@handle**, incoming **requests** (accept/decline), friends list with **presence** ("At <event>" when a friend is hosting/attending a live event) and **friends-going** counts on events.
- Remove a friend.
- **Event invites** — invite an accepted friend to an event; invitee sees an **Event invites** section on the Friends tab and can **Join** (joins the event) or **Ignore**. Invite screen reachable from the event detail.
- **Public profiles** — tap anyone (attendee list, friends, chat) to open their profile: avatar, handle, verified badge, member-since, and mutual-friends count, with relationship-aware actions (add / accept / remove friend, block, report).
- **Activity feed** — a bell button on the Friends tab opens `/activity`, a time-sorted feed of friends hosting or joining live/upcoming hangouts; tap a row for the event, tap an avatar for the profile.

## Notifications

- **Push notifications** — a nudge for a friend request, an accepted request, a hangout
  invite, and a new message in a hangout you joined. Delivery is Expo Push: the
  `notification_outbox` triggers (migration 0016) queue a row, the `send-push` Edge
  Function drains it, and the device registers its Expo token through
  `register_push_token` (0015).
- **Opt-in, not on launch** — the app never shows the system prompt at start-up. It
  re-registers silently only when permission is already granted; You → **Notifications**
  is where you actually turn them on, after a screen explaining what you get. If
  notifications were hard-blocked, that screen offers **Open settings** instead. In Expo Go
  or on an emulator it says so rather than failing silently.
- **Tap to open** — each notification carries a `data.url`, and tapping one opens that
  screen (friends, a profile, a hangout), including from a cold start. The path is checked
  against an allowlist of in-app routes first, so a payload can't push the app somewhere
  unexpected.

## Chat

- **Realtime chat** per event (Supabase Realtime), for people who've joined.

## Safety & moderation

- **Block** a user (from the event menu) — symmetric: blocked users disappear from each other's map, attendee lists, chat, and friends, and can't friend each other; blocking also severs any friendship.
- **Manage blocked users** — a **Blocked users** screen (`/blocked`, linked from the You tab) lists everyone you've blocked and lets you unblock them.
- **Report** an event or user (canned reasons) from the event menu.
- **Admin** (profiles with `is_admin`) — a **Reports** screen (`/admin`, linked from the You tab) to remove an event, ban a user, or dismiss a report.
- **Soft-launch metrics** — the `/admin` screen leads with the five metrics from the supply plan (live hangouts per day, share of app opens with something in radius, hosts other than you in 14 days, repeat attendance, joins per hangout), each against its target and coloured green/red. A dash means no data yet, which is deliberately distinct from zero. The `metrics-digest` Edge Function emails the same numbers weekly; it counts non-admin hosts, since a service-role call has no `auth.uid()`.
- **Rate limits** — `check_rate_limit` caps event creation at 10/hour and joins at 40/hour per account, raising a user-facing message. Helpers exist for messages, friend requests and reports.
- **Diagnostics** — handled and unhandled client errors are logged to `client_errors` (account id, device model, OS version, error detail), readable only by admins and auto-deleted after 30 days. The `error-alert` Edge Function emails crashes immediately and a daily digest of everything else. Disclosed in the in-app privacy policy.

## Not yet implemented (roadmap)

- **Google sign-in release keys** — each signing key needs its own Android OAuth client in Google Cloud (debug + EAS release are different). Google config changes take minutes to propagate.
- **Push notifications** (WS6) — all three code slices are done (DB foundation, `send-push` Edge Function, client). Remaining is deployment and device work, none of it code: deploy `send-push` + wire the Database Webhook on `notification_outbox` INSERT, fix the `google-services.json` package mismatch (see below), and verify delivery on a real device.
- **Polish pass** (WS7) — error feedback and failure states ✅ (toasts, server-authored
  messages, Discover empty/error states). Remaining: a visual pass after real-device testing.
- **Distribution** (WS8) — code side done (account deletion, legal screen, EAS profiles, package id). Remaining is running the EAS builds and the Google Play internal-testing setup (needs Expo + Play accounts).
- Deferred: discovery filters, external event seeding/scrapers, phone/SMS verification, iOS.

## Backend (Supabase)

Migrations live in `supabase/migrations/` and are applied by pasting them into the Supabase SQL editor (idempotent / re-runnable):

- `0001_foundation` — profiles, events, attendees, RLS, `nearby_events`/`create_event`/`join_event`, hourly cleanup cron.
- `0002_event_location_time` — location name + start time.
- `0003_richer_events` — messages/chat, photos storage, `get_event`, `update_event`.
- `0004_friends` — handles, friendships + friend RPCs, `friends_going`.
- `0005_verification_gating` — `verified`/`banned`/`is_admin`, verification sync trigger, gated create/join, `list_attendees`.
- `0006_location_privacy` — `location_precision`, fuzz functions, `can_see_exact`, viewer-aware reads.
- `0007_safety` — blocks, reports, admin RPCs, block filtering across reads/chat/friends.
- `0008_event_invites` — `event_invites` + invite RPCs.
- `0009_account_deletion` — `delete_my_account()` self-service deletion.
- `0010_my_events` — `my_events()` (events you host or joined) + `leave_event()`.
- `0011_list_blocked` — `list_blocked()` for the manage-blocked screen.
- `0012_avatars` — public `avatars` storage bucket with owner-scoped write policies.
- `0013_public_profile` — `get_public_profile()` relationship- and block-aware profile RPC.
- `0014_friend_activity` — `friend_activity()` feed of friends hosting/joining live events.
- `0015_push_tokens` — device push-token store + `register_push_token`.
- `0016_notification_outbox` — durable notification queue + enqueue triggers (friend request/accept, invite, message).
- `0017_event_visibility` — public/friends/private visibility, `can_access_event` + access-based RLS, visibility on reads and create/edit.
- `0018_event_access_row` — `can_access_event_row(host_id, visibility, id)`; the events SELECT policy now decides from the row's own columns (the by-id lookup broke `INSERT ... RETURNING` in `create_event`).
- `0019_client_errors` — client-side error log (insert-only for users, admin-only reads, 30-day retention) plus the `error_digest()` summary RPC.
- `0021_metrics` — `app_opens` (insert-own, admin-read) + `record_app_open`, `soft_launch_metrics()` for the in-app admin panel and `admin_metrics_for_digest()` for the service-role weekly email.
- `0022_rate_limits` — `check_rate_limit(action, max, window)` wired into `create_event` (10/h) and `join_event` (40/h), an end-after-start guard on create, and `duplicate_event(id, starts_at)` which re-posts your own hangout preserving its duration.
- `0020_event_link_access` — `events.link_token` plus `enable_event_link` / `disable_event_link` (host-only) and the `security definer` pair `get_event_by_link` / `join_event_by_link`. Both are revoked from `public` and re-granted to `authenticated` — Postgres grants EXECUTE to PUBLIC by default, so revoking from `anon` alone leaves them open.

**Push setup:** the Android package is `com.hangout.app`, matching the existing Firebase registration, and `app.json` points `android.googleServicesFile` at `google-services.json`. Because the package changed, the Google **Android** OAuth client has to be re-created in Google Cloud (package + debug SHA-1) or Google sign-in will fail on device; the web client id used by `linkGoogle` is unaffected.

**Setup notes:** custom SMTP is required for verification emails (see the root `README.md`); set `is_admin = true` on your own profile to access the admin Reports screen.

## Design docs

Design specs and per-work-stream plans are kept locally, outside version control.
