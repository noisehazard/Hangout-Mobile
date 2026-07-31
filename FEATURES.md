# HangoutAI — Implemented Features

A living record of what the app currently does. **Update this file whenever functionality is added, changed, or removed.**

_Last updated: 2026-07-29 (error feedback polish)_

## Overview

HangoutAI is an Android-first (Expo / React Native) app for broadcasting and discovering hangouts happening *now* at a location, shown on a live map, with friends and open discovery both first-class. Backend is Supabase (Postgres + PostGIS, Auth, Storage, Realtime, RLS).

Four bottom tabs: **Discover**, **Create**, **Friends**, **You**.

- **Feedback** — actions report their outcome in a toast above the tab bar.
  Messages our own SQL raised (Postgres `P0001`) are shown verbatim; any other
  database or network error shows a plain fallback and is logged instead.
  Confirmations (delete, block, remove friend) stay as dialogs.

## Identity & accounts

- **Anonymous by default** — a session is created on first open; the app never sits signed-out.
- **Email upgrade** — anonymous users can attach an email and confirm a **6-digit OTP** to become *verified*, preserving the same account/profile (`You` tab). Requires custom SMTP configured in Supabase.
- **Verified-to-act gating** — anyone can browse; **creating or joining** an event requires a verified account, enforced server-side and prompted in the UI.
- **Handles** — every profile has a unique, case-insensitive handle; editable on the You tab and during onboarding.
- **Profile photo** — set, replace, or remove an avatar from the You tab (square-cropped, stored in a per-user `avatars` bucket). Avatars appear in the friends list, attendee lists, and blocked-users screen.
- **Roles/flags** — profiles carry `verified`, `banned`, and `is_admin`. Banned users cannot create or join.
- **Account deletion** — a "Delete account" action on the You tab (double-confirmed) permanently removes the account and all owned data (profile, events, messages, friends, etc.), then re-anonymizes.

## Legal & distribution

- **Privacy Policy + Terms** — in-app `/legal` screen (linked from You → "Privacy & Terms"). Template text; bracketed fields (`[DATE]`, `[ENTITY]`, `[CONTACT EMAIL]`, `[JURISDICTION]`) must be filled/reviewed before launch.
- **EAS build config** — `eas.json` with `development` (dev client, for push testing), `preview` (internal APK), and `production` (Play app-bundle) profiles; `app.json` has Android package `com.hangoutai.app`. Actual builds require an Expo account (`npx eas build --profile <name> --platform android`).

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

- **Create / edit / delete** (host only) with title, description, optional photo, theme/vibe, start time, and an end time / TTL (auto-cleaned hourly).
- **Location picker** with place search + reverse geocoding; drag-to-move pin.
- **Per-event location privacy** — host chooses **Exact** or **Approximate** (default Approximate). Approximate events show a **deterministic fuzzed point** (~±330 m) and an area circle + note to non-members; the true spot is revealed to the host, accepted friends, and anyone who has joined.
- **Visibility** — each hangout is **Public** (on the map for everyone), **Friends only** (on the map only for the host's friends), or **Invite only** (off the map; only the host and invited friends can see or join). Enforced server-side via `can_access_event`.
- **Event detail** — map, description, host, time, theme, openness, friends-going count, who's-going, chat, join, and (host) edit/delete.
- **Join** ("I'm in") — verified users; **Who's going** attendee list is shown to verified users only (everyone sees the count).

## Friends

- Add by **@handle**, incoming **requests** (accept/decline), friends list with **presence** ("At <event>" when a friend is hosting/attending a live event) and **friends-going** counts on events.
- Remove a friend.
- **Event invites** — invite an accepted friend to an event; invitee sees an **Event invites** section on the Friends tab and can **Join** (joins the event) or **Ignore**. Invite screen reachable from the event detail.
- **Public profiles** — tap anyone (attendee list, friends, chat) to open their profile: avatar, handle, verified badge, member-since, and mutual-friends count, with relationship-aware actions (add / accept / remove friend, block, report).
- **Activity feed** — a bell button on the Friends tab opens `/activity`, a time-sorted feed of friends hosting or joining live/upcoming hangouts; tap a row for the event, tap an avatar for the profile.

## Chat

- **Realtime chat** per event (Supabase Realtime), for people who've joined.

## Safety & moderation

- **Block** a user (from the event menu) — symmetric: blocked users disappear from each other's map, attendee lists, chat, and friends, and can't friend each other; blocking also severs any friendship.
- **Manage blocked users** — a **Blocked users** screen (`/blocked`, linked from the You tab) lists everyone you've blocked and lets you unblock them.
- **Report** an event or user (canned reasons) from the event menu.
- **Admin** (profiles with `is_admin`) — a **Reports** screen (`/admin`, linked from the You tab) to remove an event, ban a user, or dismiss a report.

## Not yet implemented (roadmap)

- **Push notifications** (WS6) — DB foundation ✅ (`push_tokens` + `notification_outbox` + enqueue triggers) and send path ✅ (`send-push` Edge Function drains the outbox to the Expo Push API, prunes dead tokens). Remaining: deploy the function + wire the Database Webhook, and client registration/receive via `expo-notifications` (slice 3, needs `eas init` projectId + a dev build).
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

**Setup notes:** custom SMTP is required for verification emails (see the root `README.md`); set `is_admin = true` on your own profile to access the admin Reports screen.

## Design docs

Design specs and per-work-stream plans are kept locally, outside version control.
