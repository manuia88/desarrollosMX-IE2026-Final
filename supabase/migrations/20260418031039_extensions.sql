-- Extensions Postgres para DMX v5 Final
-- FASE 01 / MÓDULO 1.A.1
-- Ref: docs/02_PLAN_MAESTRO/FASE_01_BD_FUNDACION.md §1.A.1

create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;
create extension if not exists pg_trgm;
create extension if not exists btree_gin;
create extension if not exists btree_gist;
create extension if not exists unaccent;
create extension if not exists vector;
create extension if not exists pgsodium;
create extension if not exists pg_partman;
create extension if not exists postgis;
