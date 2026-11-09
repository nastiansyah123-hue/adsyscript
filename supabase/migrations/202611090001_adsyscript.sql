create extension if not exists btree_gist with schema extensions;
set search_path = public, extensions;

create table public.rooms (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
 name text not null check (length(name) between 1 and 80), audience text not null default 'Umum',
 style text not null default 'Santai & informatif', duration integer not null default 60 check(duration between 15 and 180),
 target integer not null default 5 check(target=5), brief text not null default '',
 color text not null default 'orange' check(color in ('orange','green','blue','purple')), enabled boolean not null default false,
 created_at timestamptz not null default now(), unique(id,owner_id)
);
create table public.categories (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
 room_id uuid not null, name text not null check(length(name) between 1 and 100), brief text not null default '',
 created_at timestamptz not null default now(), foreign key(room_id,owner_id) references public.rooms(id,owner_id) on delete cascade,
 unique(id,room_id,owner_id)
);
create unique index categories_unique_name on public.categories(room_id,lower(name));
create table public.topics (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
 room_id uuid not null, category_id uuid not null, name text not null check(length(name) between 1 and 200),
 start_date date not null, end_date date not null, check(end_date>=start_date),
 created_at timestamptz not null default now(),
 foreign key(category_id,room_id,owner_id) references public.categories(id,room_id,owner_id) on delete cascade,
 unique(id,room_id,category_id,owner_id),
 exclude using gist(room_id with =, daterange(start_date,end_date,'[]') with &&)
);
create table public.contents (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
 room_id uuid not null, category_id uuid not null, topic_id uuid not null,
 title text not null check(length(title) between 1 and 180), body text not null check(length(body) between 1 and 12000),
 day date not null, status text not null default 'draft' check(status in ('draft','ready')),
 created_at timestamptz not null default now(),
 foreign key(topic_id,room_id,category_id,owner_id) references public.topics(id,room_id,category_id,owner_id) on delete cascade
);
create index rooms_owner on public.rooms(owner_id);
create index categories_owner on public.categories(owner_id);
create index topics_owner on public.topics(owner_id);
create index contents_owner_day on public.contents(owner_id,day desc);
create index contents_room_day on public.contents(room_id,day);
create table public.user_credentials (
 owner_id uuid primary key references auth.users(id) on delete cascade,
 api_key_encrypted text not null, last_four text not null, updated_at timestamptz not null default now()
);
create table public.generation_jobs (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
 room_id uuid not null, day date not null, status text not null default 'pending' check(status in ('pending','running','complete','failed')),
 lease_token uuid, lease_until timestamptz, count integer not null default 0, error text,
 updated_at timestamptz not null default now(),
 foreign key(room_id,owner_id) references public.rooms(id,owner_id) on delete cascade, unique(room_id,day)
);

alter table public.rooms enable row level security;
alter table public.categories enable row level security;
alter table public.topics enable row level security;
alter table public.contents enable row level security;
alter table public.user_credentials enable row level security;
alter table public.generation_jobs enable row level security;
create policy rooms_own on public.rooms for all to authenticated using((select auth.uid())=owner_id) with check((select auth.uid())=owner_id);
create policy categories_own on public.categories for all to authenticated using((select auth.uid())=owner_id) with check((select auth.uid())=owner_id);
create policy topics_own on public.topics for all to authenticated using((select auth.uid())=owner_id) with check((select auth.uid())=owner_id);
create policy contents_read_own on public.contents for select to authenticated using((select auth.uid())=owner_id and created_at>now()-interval '30 days');
create policy contents_update_own on public.contents for update to authenticated using((select auth.uid())=owner_id and created_at>now()-interval '30 days') with check((select auth.uid())=owner_id);
create policy contents_delete_own on public.contents for delete to authenticated using((select auth.uid())=owner_id);
create policy jobs_read_own on public.generation_jobs for select to authenticated using((select auth.uid())=owner_id);
revoke all on public.user_credentials from anon,authenticated;
revoke all on public.generation_jobs from anon,authenticated;
grant select on public.generation_jobs to authenticated;
revoke all on public.contents from anon,authenticated;
grant select,delete on public.contents to authenticated;
grant update(title,body,status) on public.contents to authenticated;
grant all on public.rooms,public.categories,public.topics,public.contents,public.user_credentials,public.generation_jobs to service_role;
grant select,insert,update,delete on public.rooms,public.categories,public.topics to authenticated;
revoke all on public.rooms,public.categories,public.topics from anon;

-- Service-only transaction: only one worker may own a room's daily generation.
create function public.claim_generation(p_room_id uuid,p_day date) returns jsonb
language plpgsql security definer set search_path=public as $$
declare r public.rooms; j public.generation_jobs; n integer; token uuid;
begin
 select * into r from public.rooms where id=p_room_id;
 if not found then raise exception 'Workroom tidak ditemukan'; end if;
 insert into public.generation_jobs(owner_id,room_id,day) values(r.owner_id,r.id,p_day) on conflict(room_id,day) do nothing;
 select * into j from public.generation_jobs where room_id=r.id and day=p_day for update;
 select count(*) into n from public.contents where room_id=r.id and day=p_day;
 if n>=5 then return jsonb_build_object('claimed',false,'reason','complete','count',n); end if;
 if j.status='running' and j.lease_until>now() then return jsonb_build_object('claimed',false,'reason','running'); end if;
 token=gen_random_uuid();
 update public.generation_jobs set status='running',lease_token=token,lease_until=now()+interval '4 minutes',error=null,updated_at=now() where id=j.id;
 return jsonb_build_object('claimed',true,'job_id',j.id,'lease_token',token,'remaining',5-n);
end $$;
create function public.complete_generation(p_job_id uuid,p_lease_token uuid,p_topic_id uuid,p_contents jsonb) returns integer
language plpgsql security definer set search_path=public as $$
declare j public.generation_jobs; t public.topics; n integer; item jsonb; total integer;
begin
 select * into j from public.generation_jobs where id=p_job_id for update;
 if not found or j.lease_token is distinct from p_lease_token or j.status<>'running' then raise exception 'Lease generation tidak valid'; end if;
 select * into t from public.topics where id=p_topic_id and room_id=j.room_id and owner_id=j.owner_id and start_date<=j.day and end_date>=j.day;
 if not found then raise exception 'Jadwal kategori berubah. Buat ulang konten.'; end if;
 if jsonb_typeof(p_contents)<>'array' then raise exception 'Format naskah tidak valid'; end if;
 select count(*) into total from public.contents where room_id=j.room_id and day=j.day;
 n=jsonb_array_length(p_contents);
 if n<>5-total or n<1 then raise exception 'Jumlah naskah tidak sesuai target harian'; end if;
 for item in select * from jsonb_array_elements(p_contents) loop
  insert into public.contents(owner_id,room_id,category_id,topic_id,title,body,day)
  values(j.owner_id,j.room_id,t.category_id,t.id,item->>'title',item->>'body',j.day);
 end loop;
 update public.generation_jobs set status='complete',count=5,error=null,lease_until=null,updated_at=now() where id=j.id;
 return n;
end $$;
create function public.prune_archives() returns bigint
language plpgsql security definer set search_path=public as $$
declare n bigint;
begin
 delete from public.contents where created_at<now()-interval '30 days';get diagnostics n=row_count;
 delete from public.generation_jobs where day<current_date-30;
 return n;
end $$;
revoke all on function public.claim_generation(uuid,date) from public,anon,authenticated;
revoke all on function public.complete_generation(uuid,uuid,uuid,jsonb) from public,anon,authenticated;
revoke all on function public.prune_archives() from public,anon,authenticated;
grant execute on function public.claim_generation(uuid,date) to service_role;
grant execute on function public.complete_generation(uuid,uuid,uuid,jsonb) to service_role;
grant execute on function public.prune_archives() to service_role;

create function public.create_category(p_room_id uuid,p_name text,p_brief text,p_focus boolean,p_start date,p_end date) returns uuid
language plpgsql security invoker set search_path=public as $$
declare category uuid;
begin
 insert into public.categories(owner_id,room_id,name,brief) values(auth.uid(),p_room_id,p_name,p_brief) returning id into category;
 if p_focus then insert into public.topics(owner_id,room_id,category_id,name,start_date,end_date) values(auth.uid(),p_room_id,category,p_name,p_start,p_end); end if;
 return category;
end $$;
revoke all on function public.create_category(uuid,text,text,boolean,date,date) from public,anon;
grant execute on function public.create_category(uuid,text,text,boolean,date,date) to authenticated;
