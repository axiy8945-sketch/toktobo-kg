-- =====================================================================
-- ТОКТОБО KG — Бонус системасы
--   * Ар бир сатылып алынган китепке 20 бонус (кагаз: ар бир нуска, электрондук: 1)
--   * Бонус кызматкер заказды тастыктаганда түшөт
--   * 1 бонус = 1 сом; заказдын эң көп 50%ы бонус менен төлөнөт
--   * Заказ жокко чыгарылса: колдонулган бонус кайтарылат, берилген бонус алынат
-- =====================================================================

create table if not exists public.bonus_ledger (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  order_id    uuid references public.orders(id) on delete set null,
  amount      int  not null,                       -- + түшкөн, − жумшалган
  reason      text not null check (reason in ('purchase','spend','refund','revoke','manual')),
  created_at  timestamptz not null default now()
);
create index if not exists bonus_ledger_user_idx on public.bonus_ledger (user_id, created_at desc);
-- бир заказга ар бир себеп бир гана жолу (кайра басылса эки эсе түшпөйт)
create unique index if not exists bonus_ledger_once on public.bonus_ledger (order_id, reason)
  where reason in ('purchase','spend','refund','revoke');

alter table public.orders add column if not exists bonus_used int not null default 0 check (bonus_used >= 0);
alter table public.orders add column if not exists bonus_earned int not null default 0 check (bonus_earned >= 0);

alter table public.bonus_ledger enable row level security;
drop policy if exists bl_sel on public.bonus_ledger;
create policy bl_sel on public.bonus_ledger for select using (user_id = auth.uid() or public.is_staff());
-- түз жазуу жок: бонус функциялар аркылуу гана өзгөрөт

create or replace function public.bonus_balance(p_user uuid default null)
returns int language sql stable security definer set search_path = public as $$
  select coalesce(sum(amount), 0)::int from bonus_ledger
   where user_id = coalesce(p_user, auth.uid())
     and (p_user is null or p_user = auth.uid() or is_staff());
$$;

-- ---------- Заказ берүү (бонус колдонуу менен) ----------
drop function if exists public.place_order(jsonb, text, text, text, text, text);
create or replace function public.place_order(
  p_items jsonb, p_name text, p_phone text, p_address text, p_comment text, p_pay text, p_use_bonus int default 0)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_order uuid; v_total int := 0; it jsonb; b books; v_price int; v_qty int; v_has_paper boolean := false;
  v_units int := 0; v_balance int; v_use int := 0;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if p_pay not in ('mbank','cash') then raise exception 'bad_pay'; end if;
  if coalesce(trim(p_name),'') = '' or length(regexp_replace(coalesce(p_phone,''), '\D', '', 'g')) < 9 then
    raise exception 'bad_contact';
  end if;
  if jsonb_array_length(p_items) = 0 then raise exception 'empty'; end if;

  -- бир колдонуучунун эки заказы бир убакта бир эле бонусту жумшабашы үчүн
  perform pg_advisory_xact_lock(hashtext('bonus:' || auth.uid()::text));

  insert into orders (user_id, name, phone, address, comment, pay_method, total)
  values (auth.uid(), trim(p_name), trim(p_phone), nullif(trim(p_address),''), nullif(trim(p_comment),''), p_pay, 0)
  returning id into v_order;

  for it in select * from jsonb_array_elements(p_items) loop
    select * into b from books where id = (it->>'book_id')::uuid and is_published;
    if not found then raise exception 'book_not_found'; end if;
    if it->>'kind' = 'paper' then
      if b.paper_price is null then raise exception 'no_paper'; end if;
      v_price := b.paper_price; v_qty := greatest(1, least(50, coalesce((it->>'qty')::int, 1)));
      v_has_paper := true;
    elsif it->>'kind' = 'ebook' then
      if b.ebook_mode <> 'paid' then raise exception 'not_paid_ebook'; end if;
      v_price := b.ebook_price; v_qty := 1;
    else raise exception 'bad_kind'; end if;
    insert into order_items (order_id, book_id, title, kind, qty, unit_price)
    values (v_order, b.id, b.title, it->>'kind', v_qty, v_price);
    v_total := v_total + v_price * v_qty;
    v_units := v_units + v_qty;
  end loop;

  if v_has_paper and coalesce(trim(p_address),'') = '' then raise exception 'need_address'; end if;

  -- бонус: баланстан, сурагандан жана заказдын 50%ынан ашпайт
  v_balance := bonus_balance();
  v_use := greatest(0, least(coalesce(p_use_bonus, 0), v_balance, v_total / 2));
  if v_use > 0 then
    insert into bonus_ledger (user_id, order_id, amount, reason) values (auth.uid(), v_order, -v_use, 'spend');
  end if;

  update orders set total = v_total - v_use, bonus_used = v_use, bonus_earned = v_units * 20 where id = v_order;
  update profiles set full_name = coalesce(full_name, trim(p_name)), phone = coalesce(phone, trim(p_phone)) where id = auth.uid();
  return v_order;
end $$;

-- ---------- Статус: тастыктоо → бонус түшөт; жокко чыгаруу → кайтаруу ----------
create or replace function public.set_order_status(p_order uuid, p_status text)
returns void language plpgsql security definer set search_path = public as $$
declare o orders; v_prev text;
begin
  if not is_staff() then raise exception 'forbidden'; end if;
  if p_status not in ('pending','qr_sent','confirmed','cancelled') then raise exception 'bad_status'; end if;
  select status into v_prev from orders where id = p_order for update;
  if not found then raise exception 'not_found'; end if;
  if v_prev = 'cancelled' and p_status <> 'cancelled' then raise exception 'already_cancelled'; end if;

  update orders set status = p_status, handled_by = auth.uid(), handled_at = now()
   where id = p_order returning * into o;

  if p_status = 'confirmed' then
    insert into entitlements (user_id, book_id, source, order_id, granted_by)
    select o.user_id, oi.book_id, 'order', o.id, auth.uid()
      from order_items oi where oi.order_id = o.id and oi.kind = 'ebook' and oi.book_id is not null
    on conflict (user_id, book_id) do update set revoked_at = null, order_id = excluded.order_id, source = 'order';
    if o.bonus_earned > 0 then
      insert into bonus_ledger (user_id, order_id, amount, reason)
      values (o.user_id, o.id, o.bonus_earned, 'purchase') on conflict do nothing;
    end if;
  elsif p_status = 'cancelled' and v_prev <> 'cancelled' then
    if o.bonus_used > 0 then
      insert into bonus_ledger (user_id, order_id, amount, reason)
      values (o.user_id, o.id, o.bonus_used, 'refund') on conflict do nothing;
    end if;
    if exists (select 1 from bonus_ledger where order_id = o.id and reason = 'purchase') then
      insert into bonus_ledger (user_id, order_id, amount, reason)
      values (o.user_id, o.id, -o.bonus_earned, 'revoke') on conflict do nothing;
    end if;
  end if;
end $$;

revoke execute on function public.place_order(jsonb, text, text, text, text, text, int) from public, anon;
grant execute on function public.place_order(jsonb, text, text, text, text, text, int) to authenticated;
revoke execute on function public.set_order_status(uuid, text) from public, anon;
grant execute on function public.set_order_status(uuid, text) to authenticated;
revoke execute on function public.bonus_balance(uuid) from public, anon;
grant execute on function public.bonus_balance(uuid) to authenticated;
