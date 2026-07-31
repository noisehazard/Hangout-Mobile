create or replace function public.can_access_event_row(
  p_host_id uuid, p_visibility text, p_event_id uuid
)
returns boolean language sql stable security definer set search_path = public as $$
  select p_host_id = auth.uid()
      or p_visibility = 'public'
      or (p_visibility = 'friends' and exists (
            select 1 from public.friendships f
            where f.status = 'accepted'
              and ((f.requester_id = auth.uid() and f.addressee_id = p_host_id)
                or (f.requester_id = p_host_id and f.addressee_id = auth.uid()))))
      or (p_visibility = 'private' and exists (
            select 1 from public.event_invites i
            where i.event_id = p_event_id and i.invitee_id = auth.uid()));
$$;

create or replace function public.can_access_event(p_event_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.events e
    where e.id = p_event_id
      and public.can_access_event_row(e.host_id, e.visibility, e.id)
  );
$$;

drop policy if exists "accessible events readable" on public.events;
create policy "accessible events readable"
  on public.events for select to authenticated
  using (public.can_access_event_row(host_id, visibility, id));
