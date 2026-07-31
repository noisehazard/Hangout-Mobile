import { toast } from '@/lib/toast';

export function needsVerification(profile: { verified: boolean } | null): boolean {
  return !profile?.verified;
}

export function promptToVerify(): void {
  toast.info('Verify your email in the You tab to create or join hangouts.');
}
