-- =====================================================================
-- ТОКТОБО KG — Соода негизи (2-этап, A бөлүгү)
-- schema.sql, bonus.sql, telegram_bot.sql'дан кийин иштетилет.
--
-- Бул миграция КОШУМЧА гана: эч бир таблица же тилке өчүрүлбөйт,
-- учурдагы функциялардын аталышы жана параметрлери сакталат,
-- ошондуктан азыр иштеп жаткан сайт жана Telegram бот бузулбайт.
--
-- Камтыйт: кардарлар (CRM), заказ тарыхы, төлөмдөр, склад кыймылы,
-- өздүк наркы, аудио, каалоолор, сервердеги себет, промокоддор,
-- топтомдор, баннерлер, AI сүйлөшүүлөрү, билдирүүлөр кезеги, жөндөөлөр.
-- Файлды кайра иштетсе да зыяны жок.
-- =====================================================================

create extension if not exists pg_trgm with schema extensions;

-- ---------- Жардамчы: телефонду бирдей форматка келтирүү (996XXXXXXXXX) ----------
create or replace function public.normalize_phone(p text)
returns text language plpgsql immutable set search_path = public as $$
declare d text := regexp_replace(coalesce(p, ''), '\D', '', 'g');
begin
  if d like '00%' then d := substr(d, 3); end if;
  if length(d) = 10 and d like '0%' then d := '996' || substr(d, 2);
  elsif length(d) = 9 then d := '996' || d; end if;
  return d;
end $$;

-- =====================================================================
-- 1. Китептер: склад, кошумча маалымат, аудио, издөө
-- =====================================================================
alter table public.books add column if not exists stock_qty        int  not null default 0 check (stock_qty >= 0);
alter table public.books add column if not exists low_stock_at     int  not null default 3 check (low_stock_at >= 0);
alter table public.books add column if not exists compare_at_price int  check (compare_at_price is null or compare_at_price >= 0);
alter table public.books add column if not exists isbn             text;
alter table public.books add column if not exists publisher        text;
alter table public.books add column if not exists year             int  check (year is null or year between 1000 and 2100);
alter table public.books add column if not exists pages            int  check (pages is null or pages > 0);
alter table public.books add column if not exists preview_path     text;
alter table public.books add column if not exists audio_mode       text not null default 'none' check (audio_mode in ('none','free','paid'));
alter table public.books add column if not exists audio_price      int  not null default 0 check (audio_price >= 0);
alter table public.books add column if not exists is_archived      boolean not null default false;
alter table public.books add column if not exists search tsvector
  generated always as (
    setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(author, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(description, '')), 'C')
  ) stored;
create index if not exists books_search_idx     on public.books using gin (search);
create index if not exists books_title_trgm_idx on public.books using gin (title extensions.gin_trgm_ops);
create index if not exists books_author_trgm_idx on public.books using gin (author extensions.gin_trgm_ops);

-- Өздүк наркы: books таблицасы ачык окулгандыктан, нарк өзүнчө, админге гана көрүнгөн таблицада
create table if not exists public.book_costs (
  book_id     uuid primary key references public.books(id) on delete cascade,
  cost_price  int  not null check (cost_price >= 0),
  updated_at  timestamptz not null default now()
);
alter table public.book_costs enable row level security;
drop policy if exists bc_admin on public.book_costs;
create policy bc_admin on public.book_costs for all
  using (public.my_role() = 'admin') with check (public.my_role() = 'admin');

-- Аудиокитеп бөлүмдөрү (файлдар жабык Storage'да; бул жерде тизме гана)
create table if not exists public.audio_tracks (
  id            uuid primary key default gen_random_uuid(),
  book_id       uuid not null references public.books(id) on delete cascade,
  title         text not null,
  file_path     text not null,
  duration_sec  int  check (duration_sec is null or duration_sec >= 0),
  sort          int  not null default 0,
  created_at    timestamptz not null default now()
);
create index if not exists audio_tracks_book_idx on public.audio_tracks (book_id, sort);
alter table public.audio_tracks enable row level security;
drop policy if exists at_sel on public.audio_tracks;
create policy at_sel on public.audio_tracks for select using (
  public.is_staff() or exists (select 1 from public.books b where b.id = book_id and b.is_published));
drop policy if exists at_staff on public.audio_tracks;
create policy at_staff on public.audio_tracks for all using (public.is_staff()) with check (public.is_staff());

-- =====================================================================
-- 2. Кардарлар (CRM) — сайт жана Telegram заказдары бир жазууга биригет
-- =====================================================================
create table if not exists public.customers (
  id          uuid primary key default gen_random_uuid(),
  phone       text not null unique,                 -- normalize_phone() форматында
  name        text,
  user_id     uuid references auth.users(id) on delete set null,
  tg_chat_id  bigint,
  lang        text check (lang is null or lang in ('ky','uz','ru')),
  note        text check (note is null or length(note) <= 2000),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists customers_user_idx on public.customers (user_id);
alter table public.customers enable row level security;
drop policy if exists cu_sel on public.customers;
create policy cu_sel on public.customers for select using (user_id = auth.uid() or public.is_staff());
drop policy if exists cu_staff on public.customers;
create policy cu_staff on public.customers for update using (public.is_staff()) with check (public.is_staff());

-- =====================================================================
-- 3. Заказдар: төлөм абалы өзүнчө, жеткирүү жана арзандатуу талаалары
-- =====================================================================
alter table public.orders add column if not exists customer_id    uuid references public.customers(id) on delete set null;
alter table public.orders add column if not exists payment_status text not null default 'unpaid'
  check (payment_status in ('unpaid','awaiting','paid','refunded'));
alter table public.orders add column if not exists paid_at        timestamptz;
alter table public.orders add column if not exists paid_by        uuid references auth.users(id);
alter table public.orders add column if not exists subtotal       int check (subtotal is null or subtotal >= 0);
alter table public.orders add column if not exists discount_total int not null default 0 check (discount_total >= 0);
alter table public.orders add column if not exists delivery_fee   int not null default 0 check (delivery_fee >= 0);
alter table public.orders add column if not exists promo_code_id  uuid;
alter table public.orders add column if not exists city           text;
alter table public.orders add column if not exists delivery_note  text;
create index if not exists orders_customer_idx on public.orders (customer_id, created_at desc);
create index if not exists orders_created_idx  on public.orders (created_at desc);

-- Статус тизмеси кеңейтилет: эски маанилер да (pending, qr_sent) убактылуу жарактуу,
-- жаңы код чыкканда (B бөлүгү) алар new/awaiting'ге которулат.
alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders add constraint orders_status_check
  check (status in ('pending','qr_sent','new','confirmed','preparing','shipped','delivered','cancelled'));
alter table public.orders drop constraint if exists orders_source_check;
alter table public.orders add constraint orders_source_check
  check (source in ('site','telegram','whatsapp','admin'));
alter table public.order_items drop constraint if exists order_items_kind_check;
alter table public.order_items add constraint order_items_kind_check
  check (kind in ('paper','ebook','audio'));

-- Мурунку заказдар: тастыкталгандар төлөнгөн деп белгиленет (эски эреже ушундай болчу)
update public.orders set payment_status = 'paid', paid_at = coalesce(paid_at, handled_at), paid_by = coalesce(paid_by, handled_by)
 where status = 'confirmed' and payment_status = 'unpaid';
update public.orders set payment_status = 'awaiting' where status = 'qr_sent' and payment_status = 'unpaid';

-- Заказ түшкөндө кардар жазуусу автоматтык түзүлөт же табылат
create or replace function public.orders_link_customer()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_phone text := normalize_phone(new.phone); v_id uuid;
begin
  if new.customer_id is not null or length(v_phone) < 9 then return new; end if;
  insert into customers (phone, name, user_id, tg_chat_id)
  values (v_phone, nullif(trim(new.name), ''), new.user_id, new.tg_chat_id)
  on conflict (phone) do update set
    name       = coalesce(customers.name, excluded.name),
    user_id    = coalesce(customers.user_id, excluded.user_id),
    tg_chat_id = coalesce(customers.tg_chat_id, excluded.tg_chat_id),
    updated_at = now()
  returning id into v_id;
  new.customer_id := v_id;
  return new;
end $$;
revoke execute on function public.orders_link_customer() from public, anon, authenticated;
drop trigger if exists orders_link_customer on public.orders;
create trigger orders_link_customer before insert on public.orders
  for each row execute function public.orders_link_customer();

-- Мурунку заказдарды кардарларга байлоо
insert into public.customers (phone, name, user_id, tg_chat_id)
select distinct on (public.normalize_phone(o.phone))
       public.normalize_phone(o.phone), nullif(trim(o.name), ''), o.user_id, o.tg_chat_id
  from public.orders o
 where o.customer_id is null and length(public.normalize_phone(o.phone)) >= 9
 order by public.normalize_phone(o.phone), o.created_at
on conflict (phone) do nothing;
update public.orders o set customer_id = c.id
  from public.customers c
 where o.customer_id is null and c.phone = public.normalize_phone(o.phone);

-- ---------- Заказ тарыхы: ким, качан, эмнени өзгөрттү ----------
create table if not exists public.order_events (
  id          bigint generated always as identity primary key,
  order_id    uuid not null references public.orders(id) on delete cascade,
  kind        text not null check (kind in ('created','status','payment','note')),
  from_value  text,
  to_value    text,
  actor       uuid references auth.users(id),
  note        text,
  created_at  timestamptz not null default now()
);
create index if not exists order_events_order_idx on public.order_events (order_id, created_at);
alter table public.order_events enable row level security;
drop policy if exists oe_sel on public.order_events;
create policy oe_sel on public.order_events for select using (
  public.is_staff() or exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));
-- түз жазуу жок: тарых триггер аркылуу гана толот

create or replace function public.orders_log_event()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into order_events (order_id, kind, to_value, actor) values (new.id, 'created', new.status, auth.uid());
  else
    if new.status is distinct from old.status then
      insert into order_events (order_id, kind, from_value, to_value, actor) values (new.id, 'status', old.status, new.status, auth.uid());
    end if;
    if new.payment_status is distinct from old.payment_status then
      insert into order_events (order_id, kind, from_value, to_value, actor) values (new.id, 'payment', old.payment_status, new.payment_status, auth.uid());
    end if;
  end if;
  return new;
end $$;
revoke execute on function public.orders_log_event() from public, anon, authenticated;
drop trigger if exists orders_log_insert on public.orders;
create trigger orders_log_insert after insert on public.orders
  for each row execute function public.orders_log_event();
drop trigger if exists orders_log_update on public.orders;
create trigger orders_log_update after update of status, payment_status on public.orders
  for each row execute function public.orders_log_event();

-- ---------- Төлөмдөр: азыр кол менен тастыктоо, кийин автоматтык провайдерлер ----------
create table if not exists public.payments (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references public.orders(id) on delete cascade,
  method        text not null check (method in ('mbank','cash','online')),
  provider      text not null default 'manual',
  amount        int  not null check (amount >= 0),
  status        text not null default 'pending' check (status in ('pending','paid','failed','refunded')),
  reference     text,
  confirmed_by  uuid references auth.users(id),
  confirmed_at  timestamptz,
  raw           jsonb,
  created_at    timestamptz not null default now()
);
create index if not exists payments_order_idx on public.payments (order_id);
-- бир заказга кол менен тастыкталган бир гана төлөм (баскыч эки жолу басылса кайталанбайт)
create unique index if not exists payments_manual_once on public.payments (order_id)
  where provider = 'manual' and status = 'paid';
alter table public.payments enable row level security;
drop policy if exists pay_sel on public.payments;
create policy pay_sel on public.payments for select using (
  public.is_staff() or exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));

-- ---------- set_order_status: мурункудай иштейт + төлөм абалын жана төлөм жазуусун толтурат ----------
-- (аталышы, параметрлери жана эски статустары өзгөргөн жок)
create or replace function public.set_order_status(p_order uuid, p_status text)
returns void language plpgsql security definer set search_path = public as $$
declare o orders; v_prev text;
begin
  if not is_staff() then raise exception 'forbidden'; end if;
  if p_status not in ('pending','qr_sent','confirmed','cancelled') then raise exception 'bad_status'; end if;
  select status into v_prev from orders where id = p_order for update;
  if not found then raise exception 'not_found'; end if;
  if v_prev = 'cancelled' and p_status <> 'cancelled' then raise exception 'already_cancelled'; end if;
  update orders set status = p_status, handled_by = auth.uid(), handled_at = now(),
         payment_status = case
           when p_status = 'confirmed' then 'paid'
           when p_status = 'qr_sent' and payment_status = 'unpaid' then 'awaiting'
           else payment_status end,
         paid_at = case when p_status = 'confirmed' then coalesce(paid_at, now()) else paid_at end,
         paid_by = case when p_status = 'confirmed' then coalesce(paid_by, auth.uid()) else paid_by end
   where id = p_order returning * into o;
  if p_status = 'confirmed' then
    insert into payments (order_id, method, provider, amount, status, confirmed_by, confirmed_at)
    values (o.id, o.pay_method, 'manual', o.total, 'paid', auth.uid(), now())
    on conflict do nothing;
  end if;
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

-- Сатылган учурдагы өздүк нарк (пайда отчёту үчүн; кардарга көрүнбөйт)
create table if not exists public.order_item_costs (
  order_item_id uuid primary key references public.order_items(id) on delete cascade,
  unit_cost     int not null check (unit_cost >= 0)
);
alter table public.order_item_costs enable row level security;
drop policy if exists oic_admin on public.order_item_costs;
create policy oic_admin on public.order_item_costs for select using (public.my_role() = 'admin');

-- =====================================================================
-- 4. Склад кыймылы
-- =====================================================================
create table if not exists public.stock_movements (
  id          bigint generated always as identity primary key,
  book_id     uuid not null references public.books(id) on delete cascade,
  delta       int  not null check (delta <> 0),
  reason      text not null check (reason in ('incoming','sale','return','adjustment','writeoff')),
  unit_cost   int  check (unit_cost is null or unit_cost >= 0),
  order_id    uuid references public.orders(id) on delete set null,
  note        text,
  created_by  uuid references auth.users(id),
  created_at  timestamptz not null default now()
);
create index if not exists stock_movements_book_idx on public.stock_movements (book_id, created_at desc);
alter table public.stock_movements enable row level security;
drop policy if exists sm_sel on public.stock_movements;
create policy sm_sel on public.stock_movements for select using (public.is_staff());
-- түз жазуу жок: калдык adjust_stock аркылуу гана өзгөрөт

-- Калдыкты өзгөртүүнүн жалгыз жолу. Кирешеде (incoming) нарк берилсе, орточо өздүк нарк жаңыланат.
create or replace function public.adjust_stock(
  p_book uuid, p_delta int, p_reason text, p_unit_cost int default null, p_note text default null)
returns int language plpgsql security definer set search_path = public as $$
declare v_old int; v_new int; v_cost int;
begin
  if not is_staff() then raise exception 'forbidden'; end if;
  if p_reason not in ('incoming','return','adjustment','writeoff') then raise exception 'bad_reason'; end if;
  if coalesce(p_delta, 0) = 0 then raise exception 'bad_delta'; end if;
  if p_reason in ('incoming','return') and p_delta < 0 then raise exception 'bad_delta'; end if;
  if p_reason = 'writeoff' and p_delta > 0 then raise exception 'bad_delta'; end if;
  if p_unit_cost is not null and p_unit_cost < 0 then raise exception 'bad_cost'; end if;

  select stock_qty into v_old from books where id = p_book for update;
  if not found then raise exception 'book_not_found'; end if;
  v_new := v_old + p_delta;
  if v_new < 0 then raise exception 'insufficient_stock'; end if;

  update books set stock_qty = v_new, updated_at = now() where id = p_book;
  insert into stock_movements (book_id, delta, reason, unit_cost, note, created_by)
  values (p_book, p_delta, p_reason, p_unit_cost, nullif(left(trim(coalesce(p_note, '')), 500), ''), auth.uid());

  if p_reason = 'incoming' and p_unit_cost is not null then
    select cost_price into v_cost from book_costs where book_id = p_book;
    insert into book_costs (book_id, cost_price)
    values (p_book, case when v_cost is null or v_old = 0 then p_unit_cost
                         else round((v_old::numeric * v_cost + p_delta::numeric * p_unit_cost) / v_new)::int end)
    on conflict (book_id) do update set cost_price = excluded.cost_price, updated_at = now();
  end if;
  return v_new;
end $$;
revoke execute on function public.adjust_stock(uuid, int, text, int, text) from public, anon;
grant execute on function public.adjust_stock(uuid, int, text, int, text) to authenticated;

-- =====================================================================
-- 5. Дүкөн: каалоолор, сервердеги себет, промокоддор, топтомдор, баннерлер
-- =====================================================================
create table if not exists public.wishlist_items (
  user_id     uuid not null references auth.users(id) on delete cascade,
  book_id     uuid not null references public.books(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, book_id)
);
alter table public.wishlist_items enable row level security;
drop policy if exists wl_own on public.wishlist_items;
create policy wl_own on public.wishlist_items for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create table if not exists public.carts (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null unique references auth.users(id) on delete cascade,
  updated_at   timestamptz not null default now(),
  reminded_at  timestamptz
);
create table if not exists public.cart_items (
  cart_id  uuid not null references public.carts(id) on delete cascade,
  book_id  uuid not null references public.books(id) on delete cascade,
  kind     text not null check (kind in ('paper','ebook','audio')),
  qty      int  not null default 1 check (qty between 1 and 50),
  primary key (cart_id, book_id, kind)
);
alter table public.carts enable row level security;
alter table public.cart_items enable row level security;
drop policy if exists cart_own on public.carts;
create policy cart_own on public.carts for all using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists cart_staff on public.carts;
create policy cart_staff on public.carts for select using (public.is_staff());
drop policy if exists ci_own on public.cart_items;
create policy ci_own on public.cart_items for all
  using (exists (select 1 from public.carts c where c.id = cart_id and c.user_id = auth.uid()))
  with check (exists (select 1 from public.carts c where c.id = cart_id and c.user_id = auth.uid()));
drop policy if exists ci_staff on public.cart_items;
create policy ci_staff on public.cart_items for select using (public.is_staff());

create table if not exists public.promo_codes (
  id            uuid primary key default gen_random_uuid(),
  code          text not null unique check (code = upper(code) and length(code) between 3 and 32),
  kind          text not null check (kind in ('percent','fixed')),
  value         int  not null check (value > 0),
  min_total     int  not null default 0 check (min_total >= 0),
  max_uses      int  check (max_uses is null or max_uses > 0),
  used_count    int  not null default 0,
  per_customer  int  not null default 1 check (per_customer > 0),
  starts_at     timestamptz,
  ends_at       timestamptz,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  constraint percent_max check (kind <> 'percent' or value <= 100)
);
alter table public.promo_codes enable row level security;
drop policy if exists promo_staff on public.promo_codes;
create policy promo_staff on public.promo_codes for all using (public.is_staff()) with check (public.is_staff());
-- кардар кодду түз окуй албайт: текшерүү сервердеги функция аркылуу жүрөт (B бөлүгү)

do $$ begin
  alter table public.orders add constraint orders_promo_code_fkey
    foreign key (promo_code_id) references public.promo_codes(id) on delete set null;
exception when duplicate_object then null; end $$;

create table if not exists public.promo_redemptions (
  id             uuid primary key default gen_random_uuid(),
  promo_code_id  uuid not null references public.promo_codes(id) on delete cascade,
  order_id       uuid not null unique references public.orders(id) on delete cascade,
  customer_id    uuid references public.customers(id) on delete set null,
  amount         int  not null check (amount >= 0),
  created_at     timestamptz not null default now()
);
alter table public.promo_redemptions enable row level security;
drop policy if exists pr_sel on public.promo_redemptions;
create policy pr_sel on public.promo_redemptions for select using (public.is_staff());

create table if not exists public.collections (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique check (slug ~ '^[a-z0-9-]{2,60}$'),
  title_ky      text not null,
  title_uz      text not null,
  title_ru      text not null,
  sort          int  not null default 0,
  is_published  boolean not null default true,
  created_at    timestamptz not null default now()
);
create table if not exists public.collection_books (
  collection_id uuid not null references public.collections(id) on delete cascade,
  book_id       uuid not null references public.books(id) on delete cascade,
  sort          int  not null default 0,
  primary key (collection_id, book_id)
);
alter table public.collections enable row level security;
alter table public.collection_books enable row level security;
drop policy if exists col_sel on public.collections;
create policy col_sel on public.collections for select using (is_published or public.is_staff());
drop policy if exists col_staff on public.collections;
create policy col_staff on public.collections for all using (public.is_staff()) with check (public.is_staff());
drop policy if exists cb_sel on public.collection_books;
create policy cb_sel on public.collection_books for select using (
  public.is_staff() or exists (select 1 from public.collections c where c.id = collection_id and c.is_published));
drop policy if exists cb_staff on public.collection_books;
create policy cb_staff on public.collection_books for all using (public.is_staff()) with check (public.is_staff());

create table if not exists public.banners (
  id           uuid primary key default gen_random_uuid(),
  title_ky     text not null,
  title_uz     text not null,
  title_ru     text not null,
  subtitle_ky  text,
  subtitle_uz  text,
  subtitle_ru  text,
  image_path   text,
  href         text,
  sort         int  not null default 0,
  starts_at    timestamptz,
  ends_at      timestamptz,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now()
);
alter table public.banners enable row level security;
drop policy if exists ban_sel on public.banners;
create policy ban_sel on public.banners for select using (
  public.is_staff() or (is_active and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at > now())));
drop policy if exists ban_staff on public.banners;
create policy ban_staff on public.banners for all using (public.is_staff()) with check (public.is_staff());

-- =====================================================================
-- 6. AI сатуу агенти, билдирүүлөр кезеги, жөндөөлөр
-- =====================================================================
create table if not exists public.ai_conversations (
  id           uuid primary key default gen_random_uuid(),
  channel      text not null check (channel in ('web','telegram','whatsapp')),
  user_id      uuid references auth.users(id) on delete set null,
  customer_id  uuid references public.customers(id) on delete set null,
  tg_chat_id   bigint,
  visitor_id   text,
  lang         text check (lang is null or lang in ('ky','uz','ru')),
  status       text not null default 'open' check (status in ('open','handoff','closed')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists ai_conv_updated_idx on public.ai_conversations (updated_at desc);
create table if not exists public.ai_messages (
  id               bigint generated always as identity primary key,
  conversation_id  uuid not null references public.ai_conversations(id) on delete cascade,
  role             text not null check (role in ('user','assistant','tool','system')),
  content          text not null,
  meta             jsonb,
  created_at       timestamptz not null default now()
);
create index if not exists ai_msg_conv_idx on public.ai_messages (conversation_id, id);
alter table public.ai_conversations enable row level security;
alter table public.ai_messages enable row level security;
drop policy if exists aic_sel on public.ai_conversations;
create policy aic_sel on public.ai_conversations for select using (user_id = auth.uid() or public.is_staff());
drop policy if exists aim_sel on public.ai_messages;
create policy aim_sel on public.ai_messages for select using (
  public.is_staff() or exists (select 1 from public.ai_conversations c where c.id = conversation_id and c.user_id = auth.uid()));
-- жазуу сервер тарабындагы функциялар аркылуу гана (7-этап)

create table if not exists public.notification_outbox (
  id          bigint generated always as identity primary key,
  channel     text not null check (channel in ('telegram','whatsapp')),
  recipient   text not null,
  template    text not null,
  payload     jsonb not null default '{}',
  order_id    uuid references public.orders(id) on delete set null,
  status      text not null default 'queued' check (status in ('queued','sent','failed','skipped')),
  attempts    int  not null default 0,
  last_error  text,
  created_at  timestamptz not null default now(),
  sent_at     timestamptz
);
create index if not exists outbox_queue_idx on public.notification_outbox (status, created_at);
alter table public.notification_outbox enable row level security;
drop policy if exists nob_sel on public.notification_outbox;
create policy nob_sel on public.notification_outbox for select using (public.is_staff());

-- Дүкөн жөндөөлөрү (жеткирүү эрежелери, сегмент чектери ж.б.). is_public = сайтка көрүнөт.
create table if not exists public.shop_settings (
  key         text primary key,
  value       jsonb not null,
  is_public   boolean not null default false,
  updated_at  timestamptz not null default now()
);
alter table public.shop_settings enable row level security;
drop policy if exists ss_sel on public.shop_settings;
create policy ss_sel on public.shop_settings for select using (is_public or public.is_staff());
drop policy if exists ss_admin on public.shop_settings;
create policy ss_admin on public.shop_settings for all
  using (public.my_role() = 'admin') with check (public.my_role() = 'admin');

-- =====================================================================
-- 7. Отчёт көрүнүштөрү (security_invoker: RLS эрежелери сакталат — кызматкер гана баарын көрөт)
-- =====================================================================
create or replace view public.customer_stats with (security_invoker = true) as
select c.id, c.phone, c.name, c.user_id, c.tg_chat_id, c.created_at,
       count(o.id)                                              as orders_count,
       count(o.id) filter (where o.payment_status = 'paid')     as paid_orders,
       coalesce(sum(o.total) filter (where o.payment_status = 'paid'), 0)::int as total_spent,
       max(o.created_at)                                        as last_order_at,
       case
         when max(o.created_at) is null or max(o.created_at) < now() - interval '90 days' then 'inactive'
         when count(o.id) filter (where o.payment_status = 'paid') >= 5
           or coalesce(sum(o.total) filter (where o.payment_status = 'paid'), 0) >= 10000 then 'vip'
         when count(o.id) >= 2 then 'regular'
         else 'new'
       end as segment
  from public.customers c
  left join public.orders o on o.customer_id = c.id and o.status <> 'cancelled'
 group by c.id;

create or replace view public.sales_daily with (security_invoker = true) as
select (o.created_at at time zone 'Asia/Bishkek')::date as day,
       count(*)                                           as orders,
       count(*) filter (where o.payment_status = 'paid')  as paid_orders,
       coalesce(sum(o.total) filter (where o.payment_status = 'paid'), 0)::int as revenue,
       count(*) filter (where o.status = 'cancelled')     as cancelled
  from public.orders o
 group by 1;

create or replace view public.low_stock with (security_invoker = true) as
select b.id, b.title, b.author, b.stock_qty, b.low_stock_at
  from public.books b
 where b.paper_price is not null and not b.is_archived and b.stock_qty <= b.low_stock_at;

-- Отчёттор кызматкерлерге гана: катталбаган колдонуучуга уруксат берилбейт
revoke all on public.customer_stats, public.sales_daily, public.low_stock from anon;
