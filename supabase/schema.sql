-- =====================================================================
-- ТОКТОБО KG — Supabase схемасы
-- Supabase Dashboard → SQL Editor → ушул файлды толук иштетиңиз.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------- Ролдор жана профиль ----------
do $$ begin
  create type public.user_role as enum ('reader', 'staff', 'admin');
exception when duplicate_object then null; end $$;

create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  phone       text,
  role        public.user_role not null default 'reader',
  lang        text not null default 'ky' check (lang in ('ky','uz','ru')),
  daily_goal  int  not null default 15 check (daily_goal between 5 and 240),
  created_at  timestamptz not null default now()
);

-- Жаңы колдонуучу катталганда профиль автоматтык түзүлөт
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Кызматкерби? (RLS ичинде колдонулат)
create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('staff','admin'));
$$;

-- ---------- Категориялар ----------
create table if not exists public.categories (
  id       text primary key,
  name_ky  text not null,
  name_uz  text not null,
  name_ru  text not null,
  sort     int  not null default 0
);

insert into public.categories (id, name_ky, name_uz, name_ru, sort) values
  ('classic', 'Классика', 'Klassika', 'Классика', 1),
  ('modern',  'Заманбап проза', 'Zamonaviy nasr', 'Современная проза', 2),
  ('epos',    'Эпос жана уламыш', 'Epos va afsona', 'Эпос и легенды', 3),
  ('poetry',  'Поэзия', 'She''riyat', 'Поэзия', 4),
  ('history', 'Тарых', 'Tarix', 'История', 5),
  ('selfdev', 'Өнүгүү жана психология', 'Rivojlanish va psixologiya', 'Саморазвитие и психология', 6),
  ('kids',    'Балдар үчүн', 'Bolalar uchun', 'Детям', 7)
on conflict (id) do nothing;

-- ---------- Китептер ----------
create table if not exists public.books (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  author        text not null,
  category_id   text references public.categories(id),
  lang          text not null default 'ky' check (lang in ('ky','uz','ru')),
  description   text,
  cover_path    text,                       -- storage: covers/<path>
  paper_price   int  check (paper_price is null or paper_price >= 0),  -- null = кагаз нускасы сатылбайт
  ebook_mode    text not null default 'none' check (ebook_mode in ('none','free','paid')),
  ebook_price   int  not null default 0 check (ebook_price >= 0),
  file_path     text,                       -- storage: books/<path> (жабык)
  file_type     text check (file_type in ('pdf','epub')),
  is_published  boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint paid_needs_price check (ebook_mode <> 'paid' or ebook_price > 0)
);
create index if not exists books_created_idx on public.books (created_at desc);

-- ---------- Онлайн окуу доступу ----------
create table if not exists public.entitlements (
  user_id     uuid not null references auth.users(id) on delete cascade,
  book_id     uuid not null references public.books(id) on delete cascade,
  source      text not null check (source in ('free','order','manual')),
  order_id    uuid,
  granted_by  uuid references auth.users(id),
  created_at  timestamptz not null default now(),
  revoked_at  timestamptz,
  primary key (user_id, book_id)
);

create or replace function public.has_access(p_book uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.entitlements
                 where user_id = auth.uid() and book_id = p_book and revoked_at is null);
$$;

-- ---------- Заказдар ----------
create table if not exists public.orders (
  id            uuid primary key default gen_random_uuid(),
  number        bigint generated always as identity,
  user_id       uuid not null references auth.users(id) on delete cascade,
  name          text not null,
  phone         text not null,
  address       text,
  comment       text,
  pay_method    text not null check (pay_method in ('mbank','cash')),
  status        text not null default 'pending'
                check (status in ('pending','qr_sent','confirmed','cancelled')),
  total         int  not null check (total >= 0),
  created_at    timestamptz not null default now(),
  handled_by    uuid references auth.users(id),
  handled_at    timestamptz
);
create index if not exists orders_status_idx on public.orders (status, created_at desc);

create table if not exists public.order_items (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders(id) on delete cascade,
  book_id     uuid references public.books(id) on delete set null,
  title       text not null,          -- аталыштын көчүрмөсү (китеп өчсө да заказ тарыхы сакталат)
  kind        text not null check (kind in ('paper','ebook')),
  qty         int  not null default 1 check (qty between 1 and 50),
  unit_price  int  not null check (unit_price >= 0)
);

-- ---------- Окуу маалыматы ----------
create table if not exists public.reading_days (
  user_id  uuid not null references auth.users(id) on delete cascade,
  day      date not null,
  seconds  int  not null default 0,
  primary key (user_id, day)
);

create table if not exists public.reading_progress (
  user_id     uuid not null references auth.users(id) on delete cascade,
  book_id     uuid not null references public.books(id) on delete cascade,
  location    text,          -- PDF: бет номери, EPUB: CFI
  percent     numeric(5,2) not null default 0,
  finished    boolean not null default false,
  updated_at  timestamptz not null default now(),
  primary key (user_id, book_id)
);

create table if not exists public.bookmarks (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  book_id    uuid not null references public.books(id) on delete cascade,
  location   text not null,
  label      text,
  created_at timestamptz not null default now()
);

create table if not exists public.notes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  book_id    uuid not null references public.books(id) on delete cascade,
  location   text not null,
  body       text not null check (length(body) <= 5000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.quiz_results (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  book_id    uuid references public.books(id) on delete set null,
  score      int not null,
  total      int not null,
  created_at timestamptz not null default now()
);

-- AI коучтун күнүмдүк лимити (кыянаттыктан коргоо)
create table if not exists public.ai_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  day     date not null default ((now() at time zone 'Asia/Bishkek')::date),
  count   int  not null default 0,
  primary key (user_id, day)
);

-- =====================================================================
-- RPC функциялар (баа жана доступ серверде гана эсептелет)
-- =====================================================================

-- Акысыз китепти ачуу
create or replace function public.claim_free_book(p_book uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if not exists (select 1 from books where id = p_book and ebook_mode = 'free' and is_published) then
    raise exception 'not_free';
  end if;
  insert into entitlements (user_id, book_id, source)
  values (auth.uid(), p_book, 'free')
  on conflict (user_id, book_id) do update set revoked_at = null;
end $$;

-- Заказ берүү: items = [{"book_id": "...", "kind": "paper"|"ebook", "qty": 1}]
create or replace function public.place_order(
  p_items jsonb, p_name text, p_phone text, p_address text, p_comment text, p_pay text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_order uuid; v_total int := 0; it jsonb; b books; v_price int; v_qty int; v_has_paper boolean := false;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if p_pay not in ('mbank','cash') then raise exception 'bad_pay'; end if;
  if coalesce(trim(p_name),'') = '' or length(regexp_replace(coalesce(p_phone,''), '\D', '', 'g')) < 9 then
    raise exception 'bad_contact';
  end if;
  if jsonb_array_length(p_items) = 0 then raise exception 'empty'; end if;

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
  end loop;

  if v_has_paper and coalesce(trim(p_address),'') = '' then raise exception 'need_address'; end if;
  update orders set total = v_total where id = v_order;
  -- байланыш маалыматын профилге сактап коёбуз
  update profiles set full_name = coalesce(full_name, trim(p_name)), phone = coalesce(phone, trim(p_phone)) where id = auth.uid();
  return v_order;
end $$;

-- Кызматкер: заказдын статусун өзгөртүү. 'confirmed' болгондо электрондук китептер ачылат.
create or replace function public.set_order_status(p_order uuid, p_status text)
returns void language plpgsql security definer set search_path = public as $$
declare o orders;
begin
  if not is_staff() then raise exception 'forbidden'; end if;
  if p_status not in ('pending','qr_sent','confirmed','cancelled') then raise exception 'bad_status'; end if;
  update orders set status = p_status, handled_by = auth.uid(), handled_at = now()
   where id = p_order returning * into o;
  if not found then raise exception 'not_found'; end if;
  if p_status = 'confirmed' then
    insert into entitlements (user_id, book_id, source, order_id, granted_by)
    select o.user_id, oi.book_id, 'order', o.id, auth.uid()
      from order_items oi where oi.order_id = o.id and oi.kind = 'ebook' and oi.book_id is not null
    on conflict (user_id, book_id) do update set revoked_at = null, order_id = excluded.order_id, source = 'order';
  end if;
end $$;

-- Окуу убактысын кошуу (бир чакырууда эң көп 120 сек)
create or replace function public.add_reading_seconds(p_seconds int)
returns int language plpgsql security definer set search_path = public as $$
declare v int;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  insert into reading_days (user_id, day, seconds)
  values (auth.uid(), (now() at time zone 'Asia/Bishkek')::date, greatest(0, least(p_seconds, 120)))
  on conflict (user_id, day) do update set seconds = reading_days.seconds + excluded.seconds
  returning seconds into v;
  return v;
end $$;

-- AI лимит: чакырууну санайт жана жаңы санды кайтарат
create or replace function public.bump_ai_usage()
returns int language plpgsql security definer set search_path = public as $$
declare v int;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  insert into ai_usage (user_id, day, count) values (auth.uid(), (now() at time zone 'Asia/Bishkek')::date, 1)
  on conflict (user_id, day) do update set count = ai_usage.count + 1
  returning count into v;
  return v;
end $$;

-- =====================================================================
-- Row Level Security
-- =====================================================================
alter table public.profiles         enable row level security;
alter table public.categories       enable row level security;
alter table public.books            enable row level security;
alter table public.entitlements     enable row level security;
alter table public.orders           enable row level security;
alter table public.order_items      enable row level security;
alter table public.reading_days     enable row level security;
alter table public.reading_progress enable row level security;
alter table public.bookmarks        enable row level security;
alter table public.notes            enable row level security;
alter table public.quiz_results     enable row level security;
alter table public.ai_usage         enable row level security;

-- profiles: өзүн көрөт/өзгөртөт (ролду өзгөртө албайт); кызматкер баарын көрөт
drop policy if exists profiles_sel on public.profiles;
create policy profiles_sel on public.profiles for select using (id = auth.uid() or public.is_staff());
drop policy if exists profiles_upd on public.profiles;
create or replace function public.my_role()
returns public.user_role language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid();
$$;
create policy profiles_upd on public.profiles for update using (id = auth.uid())
  with check (id = auth.uid() and role = public.my_role());
drop policy if exists profiles_admin on public.profiles;
create policy profiles_admin on public.profiles for update using (public.my_role() = 'admin');

-- categories: баары окуйт
drop policy if exists cat_sel on public.categories;
create policy cat_sel on public.categories for select using (true);
drop policy if exists cat_staff on public.categories;
create policy cat_staff on public.categories for all using (public.is_staff()) with check (public.is_staff());

-- books: жарыяланганын баары көрөт; кызматкер башкарат
drop policy if exists books_sel on public.books;
create policy books_sel on public.books for select using (is_published or public.is_staff());
drop policy if exists books_staff on public.books;
create policy books_staff on public.books for all using (public.is_staff()) with check (public.is_staff());

-- entitlements: өзүнүкүн көрөт; түзүү/жабуу кызматкерде же RPC аркылуу
drop policy if exists ent_sel on public.entitlements;
create policy ent_sel on public.entitlements for select using (user_id = auth.uid() or public.is_staff());
drop policy if exists ent_staff on public.entitlements;
create policy ent_staff on public.entitlements for all using (public.is_staff()) with check (public.is_staff());

-- orders: өзүнүкүн көрөт; түзүү place_order аркылуу; кызматкер баарын
drop policy if exists ord_sel on public.orders;
create policy ord_sel on public.orders for select using (user_id = auth.uid() or public.is_staff());
drop policy if exists ord_staff on public.orders;
create policy ord_staff on public.orders for update using (public.is_staff()) with check (public.is_staff());
drop policy if exists oi_sel on public.order_items;
create policy oi_sel on public.order_items for select using (
  public.is_staff() or exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));

-- жеке окуу маалыматы: ээси гана
drop policy if exists rd_own on public.reading_days;
create policy rd_own on public.reading_days for select using (user_id = auth.uid());
drop policy if exists rp_own on public.reading_progress;
create policy rp_own on public.reading_progress for all using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists bm_own on public.bookmarks;
create policy bm_own on public.bookmarks for all using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists nt_own on public.notes;
create policy nt_own on public.notes for all using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists qr_own on public.quiz_results;
create policy qr_own on public.quiz_results for all using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists ai_own on public.ai_usage;
create policy ai_own on public.ai_usage for select using (user_id = auth.uid());

-- =====================================================================
-- Storage: covers (ачык), books (жабык — доступу барлар гана окуйт)
-- =====================================================================
insert into storage.buckets (id, name, public) values ('covers', 'covers', true)
  on conflict (id) do nothing;
insert into storage.buckets (id, name, public, file_size_limit) values ('books', 'books', false, 104857600)
  on conflict (id) do nothing;

drop policy if exists covers_read on storage.objects;
create policy covers_read on storage.objects for select using (bucket_id = 'covers');
drop policy if exists covers_write on storage.objects;
create policy covers_write on storage.objects for all
  using (bucket_id = 'covers' and public.is_staff()) with check (bucket_id = 'covers' and public.is_staff());

drop policy if exists books_files_write on storage.objects;
create policy books_files_write on storage.objects for all
  using (bucket_id = 'books' and public.is_staff()) with check (bucket_id = 'books' and public.is_staff());
drop policy if exists books_files_read on storage.objects;
create policy books_files_read on storage.objects for select using (
  bucket_id = 'books' and (
    public.is_staff() or exists (
      select 1 from public.books b
       where b.file_path = storage.objects.name and public.has_access(b.id))));

-- =====================================================================
-- Биринчи админди дайындоо (катталгандан кийин, email'иңизди жазыңыз):
-- update public.profiles set role = 'admin'
--  where id = (select id from auth.users where email = 'sizdin@email.kg');
-- =====================================================================

-- ---------- Функцияларга уруксат (коопсуздук) ----------
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.add_reading_seconds(int) from public, anon;
revoke execute on function public.bump_ai_usage() from public, anon;
revoke execute on function public.claim_free_book(uuid) from public, anon;
revoke execute on function public.place_order(jsonb, text, text, text, text, text) from public, anon;
revoke execute on function public.set_order_status(uuid, text) from public, anon;
grant execute on function public.add_reading_seconds(int) to authenticated;
grant execute on function public.bump_ai_usage() to authenticated;
grant execute on function public.claim_free_book(uuid) to authenticated;
grant execute on function public.place_order(jsonb, text, text, text, text, text) to authenticated;
grant execute on function public.set_order_status(uuid, text) to authenticated;

-- ---------- Топ китептер (жеке маалыматсыз, саноо гана) ----------
create or replace function public.top_books(p_days int default 1, p_limit int default 10)
returns table(book_id uuid, readers bigint)
language sql stable security definer set search_path = public as $$
  select rp.book_id, count(distinct rp.user_id) as readers
    from reading_progress rp
    join books b on b.id = rp.book_id and b.is_published
   where rp.updated_at > now() - make_interval(days => greatest(1, least(p_days, 365)))
   group by rp.book_id
   order by readers desc, rp.book_id
   limit greatest(1, least(p_limit, 50));
$$;
revoke execute on function public.top_books(int, int) from public;
grant execute on function public.top_books(int, int) to anon, authenticated;

-- ---------- Катталганда аты профилге; ээсинин email'и автоматтык админ ----------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, nullif(left(trim(new.raw_user_meta_data->>'full_name'), 80), ''),
    case when lower(new.email) = 'axiy8945@gmail.com' then 'admin'::public.user_role else 'reader'::public.user_role end)
  on conflict (id) do nothing;
  return new;
end $$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
