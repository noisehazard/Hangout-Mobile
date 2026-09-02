import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Onboarding } from '@/components/Onboarding';
import { ToastHost } from '@/components/Toast';
import { installPushHandler } from '@/data/push';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { AuthProvider } from '@/lib/auth';
import { useOnboarding } from '@/lib/onboarding';
import { installErrorReporting } from '@/lib/telemetry';

installErrorReporting();
installPushHandler();

/** Needs to sit inside AuthProvider, since push registration follows the session. */
function PushBridge() {
  usePushNotifications();
  return null;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { loading: onbLoading, onboarded, complete } = useOnboarding();
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <BottomSheetModalProvider>
            <AuthProvider>
              <PushBridge />
              <Stack screenOptions={{ headerShown: false }} />
              {!onbLoading && !onboarded && <Onboarding onDone={complete} />}
              <StatusBar style="auto" />
            </AuthProvider>
          </BottomSheetModalProvider>
          <ToastHost />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
