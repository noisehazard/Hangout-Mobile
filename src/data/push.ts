import Constants, { ExecutionEnvironment } from 'expo-constants';
// Type-only: erased at compile time, so it never triggers a runtime require.
import type { NotificationResponse } from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

import {
  isMissingPushEntitlement,
  pushUnavailableReason,
  resolveProjectId,
  type PushUnavailableReason,
} from '@/lib/push';
import { supabase } from '@/lib/supabase';

export const ANDROID_CHANNEL_ID = 'default';

/**
 * Loaded lazily and never at module scope.
 *
 * Importing expo-notifications *throws* on Android in Expo Go — remote
 * notifications were removed from it in SDK 53. Because the root layout imports
 * this module for installPushHandler(), a static import took the entire app
 * down before any runtime guard could run. Every caller below checks
 * pushBlockedReason() first, so this is only reached where the module exists.
 */
function loadNotifications() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('expo-notifications') as typeof import('expo-notifications');
}

export type PushRegistration =
  | { status: 'registered'; token: string }
  | { status: 'denied'; canAskAgain: boolean }
  | { status: 'unavailable'; reason: PushUnavailableReason };

/**
 * How a notification is presented while the app is in the foreground. Called at
 * module load from the root layout, alongside installErrorReporting().
 */
export function installPushHandler(): void {
  if (pushBlockedReason()) return;
  const Notifications = loadNotifications();
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

function currentEnvironment(): { isDevice: boolean; isExpoGo: boolean } {
  return {
    isDevice: Device.isDevice,
    isExpoGo: Constants.executionEnvironment === ExecutionEnvironment.StoreClient,
  };
}

export function pushBlockedReason(): PushUnavailableReason | null {
  return pushUnavailableReason(currentEnvironment());
}

/** Android 13+ wants the channel to exist before the permission prompt. */
async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  const Notifications = loadNotifications();
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: 'Hangout activity',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#208AEF',
  });
}

export type PushPermissionState = { granted: boolean; canAskAgain: boolean };

export async function pushPermissionState(): Promise<PushPermissionState> {
  if (pushBlockedReason()) return { granted: false, canAskAgain: false };
  const Notifications = loadNotifications();
  const permissions = await Notifications.getPermissionsAsync();
  return { granted: permissions.granted, canAskAgain: permissions.canAskAgain };
}

/**
 * Registers this device's Expo push token against the signed-in account.
 *
 * `ask: false` (the default) never shows a system prompt — it registers only if
 * permission is already granted, so app start stays quiet. The Notifications
 * screen passes `ask: true` when the user actually opts in.
 */
export async function registerForPushNotifications(
  options: { ask?: boolean } = {},
): Promise<PushRegistration> {
  const reason = pushBlockedReason();
  if (reason) return { status: 'unavailable', reason };

  const Notifications = loadNotifications();
  await ensureAndroidChannel();

  let permissions = await Notifications.getPermissionsAsync();
  if (!permissions.granted) {
    if (!options.ask || !permissions.canAskAgain) {
      return { status: 'denied', canAskAgain: permissions.canAskAgain };
    }
    permissions = await Notifications.requestPermissionsAsync();
    if (!permissions.granted) {
      return { status: 'denied', canAskAgain: permissions.canAskAgain };
    }
  }

  const projectId = resolveProjectId(Constants);
  if (!projectId) return { status: 'unavailable', reason: 'no-project-id' };

  let token: string;
  try {
    ({ data: token } = await Notifications.getExpoPushTokenAsync({ projectId }));
  } catch (error) {
    // A free-Apple-ID sideload has no push entitlement; degrade instead of
    // taking the Notifications screen down with it.
    if (isMissingPushEntitlement(error)) {
      return { status: 'unavailable', reason: 'no-entitlement' };
    }
    throw error;
  }
  const { error } = await supabase.rpc('register_push_token', {
    p_token: token,
    p_platform: Platform.OS,
  });
  if (error) throw error;
  return { status: 'registered', token };
}

export type NotificationTap = { identifier: string; data: unknown };

/**
 * Subscribes to notification taps, covering both a tap while the app runs and a
 * cold start from a notification. Returns an unsubscribe function.
 *
 * This lives here rather than in the hook so that every expo-notifications
 * access sits behind the availability guard — the hook form,
 * useLastNotificationResponse, cannot be called conditionally.
 */
export function subscribeToNotificationTaps(onTap: (tap: NotificationTap) => void): () => void {
  if (pushBlockedReason()) return () => {};

  const Notifications = loadNotifications();
  let active = true;

  const emit = (response: NotificationResponse | null) => {
    if (!active || !response) return;
    onTap({
      identifier: response.notification.request.identifier,
      data: response.notification.request.content.data,
    });
  };

  // Cold start: the tap that launched the app has already happened.
  Notifications.getLastNotificationResponseAsync().then(emit).catch(() => {});
  const subscription = Notifications.addNotificationResponseReceivedListener(emit);

  return () => {
    active = false;
    subscription.remove();
  };
}

/** Drops this device's token so a signed-out account stops receiving its pushes. */
export async function unregisterPushToken(token: string): Promise<void> {
  const { error } = await supabase.from('push_tokens').delete().eq('token', token);
  if (error) throw error;
}
