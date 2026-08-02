import Constants from 'expo-constants';
import * as Device from 'expo-device';

import { ErrorReport, setErrorReporter } from '@/lib/errors';
import { supabase } from '@/lib/supabase';

export const MAX_MESSAGE_LENGTH = 500;

export type ErrorRow = {
  profile_id: string | null;
  tag: string;
  code: string | null;
  message: string | null;
  fatal: boolean;
  app_version: string | null;
  os_name: string | null;
  os_version: string | null;
  device_model: string | null;
};

const APP_VERSION = Constants.expoConfig?.version ?? null;
const OS_NAME = Device.osName ?? null;
const OS_VERSION = Device.osVersion ?? null;
const DEVICE_MODEL = Device.modelName ?? null;

export function buildErrorRow(
  report: ErrorReport & { fatal?: boolean },
  profileId: string | null,
): ErrorRow {
  return {
    profile_id: profileId,
    tag: report.tag,
    code: report.code,
    message: report.message === null ? null : report.message.slice(0, MAX_MESSAGE_LENGTH),
    fatal: report.fatal ?? false,
    app_version: APP_VERSION,
    os_name: OS_NAME,
    os_version: OS_VERSION,
    device_model: DEVICE_MODEL,
  };
}

export function reportError(report: ErrorReport & { fatal?: boolean }): void {
  void (async () => {
    try {
      const { data } = await supabase.auth.getSession();
      const profileId = data.session?.user.id ?? null;
      if (!profileId) return;
      await supabase.from('client_errors').insert(buildErrorRow(report, profileId));
    } catch (e) {
      console.warn('[telemetry] failed to log error', e);
    }
  })();
}

declare const ErrorUtils:
  | {
      getGlobalHandler(): (error: Error, isFatal?: boolean) => void;
      setGlobalHandler(handler: (error: Error, isFatal?: boolean) => void): void;
    }
  | undefined;

export function installErrorReporting(): void {
  setErrorReporter(reportError);

  if (typeof ErrorUtils === 'undefined') return;
  const previous = ErrorUtils.getGlobalHandler();
  ErrorUtils.setGlobalHandler((error, isFatal) => {
    reportError({
      tag: 'unhandled',
      code: null,
      message: error?.message ?? String(error),
      fatal: true,
    });
    previous(error, isFatal);
  });
}
