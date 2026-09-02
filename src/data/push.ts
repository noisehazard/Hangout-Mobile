import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import {
  pushUnavailableReason,
  resolveProjectId,
  type PushUnavailableReason,
} from '@/lib/push';
import { supabase } from '@/lib/supabase';

export const ANDROID_CHANNEL_ID = 'default';

export type PushRegistration =
  | { status: 'registered'; token: string }
  | { status: 'denied'; canAskAgain: boolean }
  | { status: 'unavailable'; reason: PushUnavailableReason };

/**
 * How a notification is presented while the app is in the foreground. Called at
 * module load from the root layout, alongside installErrorReporting().
 */
export function installPushHandler(): void {
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

  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
  const { error } = await supabase.rpc('register_push_token', {
    p_token: token,
    p_platform: Platform.OS,
  });
  if (error) throw error;
  return { status: 'registered', token };
}

/** Drops this device's token so a signed-out account stops receiving its pushes. */
export async function unregisterPushToken(token: string): Promise<void> {
  const { error } = await supabase.from('push_tokens').delete().eq('token', token);
  if (error) throw error;
}
