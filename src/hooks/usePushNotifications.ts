import { type Href, router, useRootNavigationState } from 'expo-router';
import { useEffect, useRef } from 'react';

import { registerForPushNotifications, subscribeToNotificationTaps } from '@/data/push';
import { useAuth } from '@/lib/auth';
import { hrefFromNotificationData } from '@/lib/push';

/**
 * Keeps the device's push token pointed at the signed-in account and opens the
 * right screen when a notification is tapped.
 *
 * Registration here is silent: it only refreshes the token when permission has
 * already been granted, so nobody sees a system prompt on app start. The opt-in
 * prompt lives on the Notifications screen.
 *
 * Nothing in this file imports expo-notifications — that module throws on
 * import in Expo Go, so all access to it is funnelled through @/data/push,
 * which loads it lazily behind an availability check.
 */
export function usePushNotifications(): void {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const navigationState = useRootNavigationState();
  const navigationReady = Boolean(navigationState?.key);
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
    // Wait for the navigator to exist — a cold start from a notification would
    // otherwise push a route before there is anywhere to push it to.
    if (!navigationReady) return;

    return subscribeToNotificationTaps(({ identifier, data }) => {
      if (handled.current === identifier) return;
      handled.current = identifier;
      const href = hrefFromNotificationData(data);
      if (href) router.push(href as Href);
    });
  }, [navigationReady]);
}
