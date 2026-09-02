import { type Href, router, useRootNavigationState } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useEffect, useRef } from 'react';

import { registerForPushNotifications } from '@/data/push';
import { useAuth } from '@/lib/auth';
import { hrefFromNotificationData } from '@/lib/push';

/**
 * Keeps the device's push token pointed at the signed-in account and opens the
 * right screen when a notification is tapped.
 *
 * Registration here is silent: it only refreshes the token when permission has
 * already been granted, so nobody sees a system prompt on app start. The opt-in
 * prompt lives on the Notifications screen.
 */
export function usePushNotifications(): void {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const navigationState = useRootNavigationState();
  const navigationReady = Boolean(navigationState?.key);
  const response = Notifications.useLastNotificationResponse();
  const handled = useRef<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      try {
        const result = await registerForPushNotifications();
        if (!cancelled && result.status === 'unavailable') {
          console.warn('[push] not registering:', result.reason);
        }
      } catch (e) {
        console.warn('[push] token registration failed', e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    // Covers both a tap while running and a cold start from a notification, so
    // we must wait for the navigator to exist before pushing a route.
    if (!response || !navigationReady) return;
    const id = response.notification.request.identifier;
    if (handled.current === id) return;
    handled.current = id;

    const href = hrefFromNotificationData(response.notification.request.content.data);
    if (href) router.push(href as Href);
  }, [response, navigationReady]);
}
