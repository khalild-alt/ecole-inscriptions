-- ============================================================
-- SCHEMA COMPLET — Gestion des Inscriptions Scolaires
-- À exécuter dans Supabase > SQL Editor > New query
-- ============================================================

-- ── 1. Extensions ────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ── 2. Table des profils utilisateurs ───────────────────────
-- Étend auth.users avec rôle et établissement
create table public.profils (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text not null,
  nom           text,
  prenom        text,
  role          text not null check (role in ('superadmin', 'admin', 'operateur')),
  etablissement_id uuid,  -- null pour superadmin
  created_at    timestamptz default now()
);

-- ── 3. Table des établissements ──────────────────────────────
create table public.etablissements (
  id          uuid primary key default uuid_generate_v4(),
  nom         text not null,
  ville       text,
  actif       boolean default true,
  created_at  timestamptz default now()
);

-- Ajouter la contrainte FK après création des deux tables
alter table public.profils
  add constraint profils_etablissement_fk
  foreign key (etablissement_id) references public.etablissements(id) on delete set null;

-- ── 4. Table des années scolaires ───────────────────────────
create table public.annees_scolaires (
  id              uuid primary key default uuid_generate_v4(),
  etablissement_id uuid not null references public.etablissements(id) on delete cascade,
  label           text not null,  -- ex: "2025-2026"
  statut          text not null default 'ouverte' check (statut in ('ouverte', 'archivee')),
  created_at      timestamptz default now()
);

-- ── 5. Table des configurations ──────────────────────────────
create table public.configurations (
  id              uuid primary key default uuid_generate_v4(),
  annee_id        uuid not null unique references public.annees_scolaires(id) on delete cascade,
  salles          jsonb not null default '[]',
  regles_age      jsonb not null default '[]',
  mode_calcul_age text not null default 'annee' check (mode_calcul_age in ('annee','annee_mois','annee_mois_jour')),
  champs          jsonb not null default '[]',
  updated_at      timestamptz default now()
);

-- ── 6. Table des élèves ──────────────────────────────────────
create table public.eleves (
  id              uuid primary key default uuid_generate_v4(),
  annee_id        uuid not null references public.annees_scolaires(id) on delete cascade,
  etablissement_id uuid not null references public.etablissements(id) on delete cascade,
  donnees         jsonb not null default '{}',  -- champs dynamiques (prenom, nom, dateNaissance, etc.)
  age             integer,
  niveau_id       text,
  statut          text not null default 'attente' check (statut in ('attente','accepte','liste_attente')),
  force           boolean default false,
  date_inscription timestamptz default now(),
  created_at      timestamptz default now()
);

-- ── 7. Table des allocations ─────────────────────────────────
create table public.allocations (
  id              uuid primary key default uuid_generate_v4(),
  annee_id        uuid not null references public.annees_scolaires(id) on delete cascade,
  affectations    jsonb not null default '{}',
  mode            text not null default 'B' check (mode in ('A','B')),
  calculated_at   timestamptz default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.profils           enable row level security;
alter table public.etablissements    enable row level security;
alter table public.annees_scolaires  enable row level security;
alter table public.configurations    enable row level security;
alter table public.eleves            enable row level security;
alter table public.allocations       enable row level security;

-- ── Helper : récupérer le rôle de l'utilisateur connecté ────
create or replace function public.get_role()
returns text language sql security definer stable as $$
  select role from public.profils where id = auth.uid()
$$;

-- ── Helper : récupérer l'établissement de l'utilisateur ─────
create or replace function public.get_etablissement_id()
returns uuid language sql security definer stable as $$
  select etablissement_id from public.profils where id = auth.uid()
$$;

-- ── Politiques : profils ─────────────────────────────────────
create policy "Voir son propre profil" on public.profils
  for select using (id = auth.uid() or get_role() = 'superadmin');

create policy "Superadmin gère tous les profils" on public.profils
  for all using (get_role() = 'superadmin');

create policy "Utilisateur modifie son profil" on public.profils
  for update using (id = auth.uid());

-- ── Politiques : établissements ──────────────────────────────
create policy "Superadmin gère les établissements" on public.etablissements
  for all using (get_role() = 'superadmin');

create policy "Admin/opérateur voit son établissement" on public.etablissements
  for select using (
    get_role() = 'superadmin' or
    id = get_etablissement_id()
  );

-- ── Politiques : années scolaires ───────────────────────────
create policy "Voir années de son établissement" on public.annees_scolaires
  for select using (
    get_role() = 'superadmin' or
    etablissement_id = get_etablissement_id()
  );

create policy "Admin crée/modifie les années" on public.annees_scolaires
  for insert with check (
    get_role() in ('superadmin','admin') and
    (get_role() = 'superadmin' or etablissement_id = get_etablissement_id())
  );

create policy "Admin modifie les années" on public.annees_scolaires
  for update using (
    get_role() in ('superadmin','admin') and
    (get_role() = 'superadmin' or etablissement_id = get_etablissement_id())
  );

-- ── Politiques : configurations ──────────────────────────────
create policy "Voir config de son établissement" on public.configurations
  for select using (
    get_role() = 'superadmin' or
    annee_id in (
      select id from public.annees_scolaires
      where etablissement_id = get_etablissement_id()
    )
  );

create policy "Admin modifie la config" on public.configurations
  for all using (
    get_role() in ('superadmin','admin') and (
      get_role() = 'superadmin' or
      annee_id in (
        select id from public.annees_scolaires
        where etablissement_id = get_etablissement_id()
      )
    )
  );

-- ── Politiques : élèves ──────────────────────────────────────
create policy "Voir élèves de son établissement" on public.eleves
  for select using (
    get_role() = 'superadmin' or
    etablissement_id = get_etablissement_id()
  );

create policy "Admin/opérateur ajoute des élèves (année ouverte)" on public.eleves
  for insert with check (
    get_role() in ('superadmin','admin','operateur') and
    etablissement_id = get_etablissement_id() and
    annee_id in (
      select id from public.annees_scolaires
      where etablissement_id = get_etablissement_id() and statut = 'ouverte'
    )
  );

create policy "Admin/opérateur modifie élèves (année ouverte)" on public.eleves
  for update using (
    get_role() in ('superadmin','admin','operateur') and
    etablissement_id = get_etablissement_id() and
    annee_id in (
      select id from public.annees_scolaires
      where etablissement_id = get_etablissement_id() and statut = 'ouverte'
    )
  );

create policy "Admin supprime élèves (année ouverte)" on public.eleves
  for delete using (
    get_role() in ('superadmin','admin') and
    etablissement_id = get_etablissement_id() and
    annee_id in (
      select id from public.annees_scolaires
      where etablissement_id = get_etablissement_id() and statut = 'ouverte'
    )
  );

-- ── Politiques : allocations ─────────────────────────────────
create policy "Voir allocations de son établissement" on public.allocations
  for select using (
    get_role() = 'superadmin' or
    annee_id in (
      select id from public.annees_scolaires
      where etablissement_id = get_etablissement_id()
    )
  );

create policy "Admin gère les allocations (année ouverte)" on public.allocations
  for all using (
    get_role() in ('superadmin','admin') and
    annee_id in (
      select id from public.annees_scolaires
      where etablissement_id = get_etablissement_id() and statut = 'ouverte'
    )
  );

-- ============================================================
-- FONCTION : Créer un utilisateur avec profil
-- Appelée par le superadmin depuis l'app
-- ============================================================
create or replace function public.creer_utilisateur(
  p_email         text,
  p_password      text,
  p_nom           text,
  p_prenom        text,
  p_role          text,
  p_etablissement_id uuid default null
)
returns json language plpgsql security definer as $$
declare
  v_user_id uuid;
begin
  -- Créer l'utilisateur dans auth.users via admin API
  -- (Cette fonction est appelée côté serveur uniquement)
  insert into auth.users (
    id, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) values (
    uuid_generate_v4(),
    p_email,
    crypt(p_password, gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    json_build_object('nom', p_nom, 'prenom', p_prenom),
    now(), now()
  ) returning id into v_user_id;

  -- Créer le profil
  insert into public.profils (id, email, nom, prenom, role, etablissement_id)
  values (v_user_id, p_email, p_nom, p_prenom, p_role, p_etablissement_id);

  return json_build_object('id', v_user_id, 'email', p_email);
end;
$$;

-- ============================================================
-- FONCTION : Copier la config d'une année vers une autre
-- ============================================================
create or replace function public.copier_config(
  p_annee_source_id uuid,
  p_annee_dest_id   uuid
)
returns void language plpgsql security definer as $$
declare
  v_config record;
begin
  select * into v_config from public.configurations where annee_id = p_annee_source_id;
  if found then
    insert into public.configurations (annee_id, salles, regles_age, mode_calcul_age, champs)
    values (p_annee_dest_id, v_config.salles, v_config.regles_age, v_config.mode_calcul_age, v_config.champs)
    on conflict (annee_id) do update
      set salles = v_config.salles,
          regles_age = v_config.regles_age,
          mode_calcul_age = v_config.mode_calcul_age,
          champs = v_config.champs,
          updated_at = now();
  end if;
end;
$$;

-- ============================================================
-- TRIGGER : créer le profil automatiquement à l'inscription
-- ============================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profils (id, email, nom, prenom, role)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'nom',
    new.raw_user_meta_data->>'prenom',
    coalesce(new.raw_user_meta_data->>'role', 'operateur')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- DONNÉES INITIALES : superadmin
-- À personnaliser avec ton email et mot de passe
-- ============================================================
-- NB : Le superadmin sera créé via l'interface Supabase Auth
-- puis son profil mis à jour manuellement ci-dessous.
-- Remplace 'TON-UUID-ICI' après avoir créé le compte dans Auth.

-- insert into public.profils (id, email, nom, prenom, role)
-- values ('TON-UUID-ICI', 'khalil.drira@gmail.com', 'Drira', 'Khalil', 'superadmin')
-- on conflict (id) do update set role = 'superadmin';
