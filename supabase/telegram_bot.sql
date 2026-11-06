-- =====================================================================
-- ТОКТОБО KG — Telegram бот (Edge Function: supabase/functions/telegram-bot)
-- schema.sql жана bonus.sql'дан кийин иштетиңиз.
-- Жашыруун маанилер Vault'ка кол менен кошулат (ЭЧ КАЧАН репозиторийге жазбаңыз):
--   select vault.create_secret('<BOT_TOKEN>', 'telegram_bot_token');
--   select vault.create_secret(encode(extensions.gen_random_bytes(24),'hex'), 'bot_webhook_secret');
--   select vault.create_secret(encode(extensions.gen_random_bytes(24),'hex'), 'bot_internal_secret');
--   select vault.create_secret(lpad((floor(random()*1000000))::int::text,6,'0'), 'bot_admin_code');
-- Анан webhook: setWebhook(url=<project>/functions/v1/telegram-bot, secret_token=bot_webhook_secret)
-- =====================================================================
create extension if not exists pg_net with schema extensions;

alter table public.orders alter column user_id drop not null;
alter table public.orders add column if not exists source text not null default 'site' check (source in ('site','telegram'));
alter table public.orders add column if not exists tg_chat_id bigint;

create table if not exists public.bot_sessions (
  chat_id bigint primary key, lang text, cart jsonb not null default '[]', step text,
  draft jsonb not null default '{}', updated_at timestamptz not null default now()
);
create table if not exists public.bot_admins (chat_id bigint primary key, name text, created_at timestamptz not null default now());
alter table public.bot_sessions enable row level security;
alter table public.bot_admins enable row level security;

create or replace function public.bot_secrets()
returns jsonb language sql stable security definer set search_path = public, vault as $$
  select coalesce(jsonb_object_agg(name, decrypted_secret), '{}'::jsonb) from vault.decrypted_secrets
   where name in ('telegram_bot_token','bot_webhook_secret','bot_internal_secret','bot_admin_code');
$$;
revoke execute on function public.bot_secrets() from public, anon, authenticated;
grant execute on function public.bot_secrets() to service_role;

create or replace function public.bot_place_order(p_chat bigint, p_items jsonb, p_name text, p_phone text, p_address text, p_pay text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_order uuid; v_num bigint; v_total int := 0; it jsonb; b books; v_qty int;
begin
  if p_pay not in ('mbank','cash') then raise exception 'bad_pay'; end if;
  if coalesce(trim(p_name),'') = '' or length(regexp_replace(coalesce(p_phone,''), '\D', '', 'g')) < 9 then raise exception 'bad_contact'; end if;
  if coalesce(trim(p_address),'') = '' then raise exception 'need_address'; end if;
  if jsonb_array_length(p_items) = 0 then raise exception 'empty'; end if;
  insert into orders (user_id, name, phone, address, pay_method, total, source, tg_chat_id)
  values (null, left(trim(p_name),120), left(trim(p_phone),40), left(trim(p_address),300), p_pay, 0, 'telegram', p_chat)
  returning id, number into v_order, v_num;
  for it in select * from jsonb_array_elements(p_items) loop
    select * into b from books where id = (it->>'book_id')::uuid and is_published and paper_price is not null;
    if not found then raise exception 'book_not_found'; end if;
    v_qty := greatest(1, least(50, coalesce((it->>'qty')::int, 1)));
    insert into order_items (order_id, book_id, title, kind, qty, unit_price) values (v_order, b.id, b.title, 'paper', v_qty, b.paper_price);
    v_total := v_total + b.paper_price * v_qty;
  end loop;
  update orders set total = v_total where id = v_order;
  return jsonb_build_object('id', v_order, 'number', v_num, 'total', v_total);
end $$;
revoke execute on function public.bot_place_order(bigint, jsonb, text, text, text, text) from public, anon, authenticated;
grant execute on function public.bot_place_order(bigint, jsonb, text, text, text, text) to service_role;

-- set_order_status: сайт аккаунту жок (бот) заказдар үчүн бонус/доступ өткөрүлүп жиберилет
create or replace function public.set_order_status(p_order uuid, p_status text)
returns void language plpgsql security definer set search_path = public as $$
declare o orders; v_prev text;
begin
  if not is_staff() then raise exception 'forbidden'; end if;
  if p_status not in ('pending','qr_sent','confirmed','cancelled') then raise exception 'bad_status'; end if;
  select status into v_prev from orders where id = p_order for update;
  if not found then raise exception 'not_found'; end if;
  if v_prev = 'cancelled' and p_status <> 'cancelled' then raise exception 'already_cancelled'; end if;
  update orders set status = p_status, handled_by = auth.uid(), handled_at = now() where id = p_order returning * into o;
  if p_status = 'confirmed' and o.user_id is not null then
    insert into entitlements (user_id, book_id, source, order_id, granted_by)
    select o.user_id, oi.book_id, 'order', o.id, auth.uid()
      from order_items oi where oi.order_id = o.id and oi.kind = 'ebook' and oi.book_id is not null
    on conflict (user_id, book_id) do update set revoked_at = null, order_id = excluded.order_id, source = 'order';
    if o.bonus_earned > 0 then
      insert into bonus_ledger (user_id, order_id, amount, reason) values (o.user_id, o.id, o.bonus_earned, 'purchase') on conflict do nothing;
    end if;
  elsif p_status = 'cancelled' and v_prev <> 'cancelled' and o.user_id is not null then
    if o.bonus_used > 0 then
      insert into bonus_ledger (user_id, order_id, amount, reason) values (o.user_id, o.id, o.bonus_used, 'refund') on conflict do nothing;
    end if;
    if exists (select 1 from bonus_ledger where order_id = o.id and reason = 'purchase') then
      insert into bonus_ledger (user_id, order_id, amount, reason) values (o.user_id, o.id, -o.bonus_earned, 'revoke') on conflict do nothing;
    end if;
  end if;
end $$;
revoke execute on function public.set_order_status(uuid, text) from public, anon;
grant execute on function public.set_order_status(uuid, text) to authenticated;

create or replace function public.notify_bot()
returns trigger language plpgsql security definer set search_path = public, extensions, vault as $$
declare v_secret text;
begin
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'bot_internal_secret';
  if v_secret is null then return new; end if;
  if tg_op = 'UPDATE' and (new.status is not distinct from old.status or new.tg_chat_id is null) then return new; end if;
  perform net.http_post(
    url := 'https://klbgikzurrychyovsnbd.supabase.co/functions/v1/telegram-bot',
    body := jsonb_build_object('event', case when tg_op = 'INSERT' then 'new_order' else 'status' end, 'order_id', new.id),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-internal-secret', v_secret));
  return new;
end $$;
revoke execute on function public.notify_bot() from public, anon, authenticated;
drop trigger if exists orders_notify_insert on public.orders;
create trigger orders_notify_insert after insert on public.orders for each row execute function public.notify_bot();
drop trigger if exists orders_notify_status on public.orders;
create trigger orders_notify_status after update of status on public.orders for each row execute function public.notify_bot();
