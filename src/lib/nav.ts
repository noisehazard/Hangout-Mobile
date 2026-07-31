import { type Href, router } from 'expo-router';

export function openUserProfile(id: string): void {
  router.push({ pathname: '/user/[id]', params: { id } } as unknown as Href);
}
