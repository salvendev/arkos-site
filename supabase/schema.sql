-- ARKOS — Schéma PostgreSQL pour Supabase
-- À exécuter une seule fois dans Supabase Studio → SQL Editor.
-- Ce schéma reproduit database/schema.sql (SQLite) pour Supabase/Postgres.

create table if not exists public.users (
    id          bigint generated always as identity primary key,
    name        text not null,
    email       text not null unique,
    password_hash text not null,
    role        text not null default 'user',
    created_at  text not null,
    last_login  text
);

create table if not exists public.minecraft_players (
    id          bigint generated always as identity primary key,
    pseudo      text not null unique,
    uuid        text not null unique,
    first_connection text,
    last_connection text,
    playtime    text,
    money       bigint not null default 0,
    votes       integer not null default 0,
    grade       text not null default 'Joueur',
    job         text,
    sanctions   text,
    online      integer not null default 0
);

create table if not exists public.grades (
    id          bigint generated always as identity primary key,
    name        text not null unique,
    color       text not null,
    price       double precision not null default 0,
    benefits    text,
    permissions text
);

create table if not exists public.permissions (
    id          bigint generated always as identity primary key,
    grade_id    bigint not null references public.grades(id) on delete cascade,
    permission  text not null
);

create table if not exists public.products (
    id          bigint generated always as identity primary key,
    category    text not null,
    name        text not null,
    description text,
    price       double precision not null default 0,
    discount    integer not null default 0,
    image       text
);

create table if not exists public.orders (
    id          bigint generated always as identity primary key,
    user_id     bigint,
    product_id  bigint,
    amount      double precision not null default 0,
    status      text not null default 'pending',
    created_at  text not null,
    foreign key (user_id) references public.users(id) on delete set null,
    foreign key (product_id) references public.products(id) on delete set null
);

create table if not exists public.vote_sites (
    id              bigint generated always as identity primary key,
    name            text not null,
    reward          text,
    reward_command  text,
    link            text not null,
    status          text not null default 'Disponible',
    cooldown_minutes integer not null default 1440
);

create table if not exists public.votes (
    id          bigint generated always as identity primary key,
    player_id   bigint,
    site_id     bigint,
    voted_at    text not null,
    reward      text,
    foreign key (player_id) references public.minecraft_players(id) on delete set null,
    foreign key (site_id) references public.vote_sites(id) on delete set null
);

create table if not exists public.news (
    id          bigint generated always as identity primary key,
    title       text not null,
    summary     text,
    content     text,
    image       text,
    category    text,
    author      text,
    published   integer not null default 1,
    published_at text
);

create table if not exists public.events (
    id          bigint generated always as identity primary key,
    name        text not null,
    description text,
    image       text,
    event_date  text,
    rewards     text,
    status      text not null default 'draft'
);

create table if not exists public.tickets (
    id          bigint generated always as identity primary key,
    player_name text,
    category    text not null,
    subject     text not null,
    status      text not null default 'Ouvert',
    priority    text not null default 'Moyenne',
    history_count integer not null default 0,
    assignee    text,
    created_at  text not null
);

create table if not exists public.notifications (
    id          bigint generated always as identity primary key,
    message     text not null,
    level       text not null default 'info',
    created_at  text not null
);

create table if not exists public.admin_logs (
    id          bigint generated always as identity primary key,
    actor       text not null,
    action      text not null,
    created_at  text not null
);

create table if not exists public.server_status (
    id          integer primary key,
    online      integer not null default 0,
    version     text,
    players_online integer not null default 0,
    players_max integer not null default 0,
    bedrock_port text,
    uptime      text,
    cpu         integer not null default 0,
    ram         integer not null default 0,
    storage     integer not null default 0,
    motd        text,
    updated_at  text
);

create table if not exists public.metrics (
    id          bigint generated always as identity primary key,
    metric_type text not null,
    metric_date text not null,
    value       double precision not null default 0
);
