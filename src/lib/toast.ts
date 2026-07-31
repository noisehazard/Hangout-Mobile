export type ToastVariant = 'error' | 'success' | 'info';

export type ToastPayload = {
  message: string;
  variant: ToastVariant;
};

type Listener = (payload: ToastPayload) => void;

let listener: Listener | null = null;

export function subscribeToasts(next: Listener | null): void {
  listener = next;
}

function show(message: string, variant: ToastVariant): void {
  listener?.({ message, variant });
}

export const toast = {
  error: (message: string) => show(message, 'error'),
  success: (message: string) => show(message, 'success'),
  info: (message: string) => show(message, 'info'),
};
