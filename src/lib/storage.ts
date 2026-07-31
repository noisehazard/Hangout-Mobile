import { supabase } from '@/lib/supabase';
import { decode } from 'base64-arraybuffer';

const BUCKET = 'event-photos';

export function photoObjectPath(id?: string): string {
  const name = id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `${name}.jpg`;
}

export async function uploadEventPhoto(base64: string): Promise<string> {
  const path = photoObjectPath();
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, decode(base64), { contentType: 'image/jpeg', upsert: false });
  if (error) throw error;
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

const AVATAR_BUCKET = 'avatars';

export function avatarObjectPath(userId: string): string {
  return `${userId}/avatar.jpg`;
}

export function withCacheBuster(url: string): string {
  return `${url}?v=${Date.now()}`;
}

export async function uploadAvatar(userId: string, base64: string): Promise<string> {
  const path = avatarObjectPath(userId);
  const { error } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, decode(base64), { contentType: 'image/jpeg', upsert: true });
  if (error) throw error;
  const publicUrl = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path).data.publicUrl;
  return withCacheBuster(publicUrl);
}

export async function removeAvatar(userId: string): Promise<void> {
  const { error } = await supabase.storage.from(AVATAR_BUCKET).remove([avatarObjectPath(userId)]);
  if (error) throw error;
}
