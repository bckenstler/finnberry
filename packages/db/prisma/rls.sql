-- Closes the database to everything except the app's own connection.
--
-- Supabase serves every table in the public schema over an auto-generated
-- REST API, to anyone holding the project's anon key, unless Row Level
-- Security is enabled on the table. Finnberry reads and writes only through
-- Prisma, which connects as the table owner and is not subject to RLS, so
-- every table gets RLS with no policies: the API roles can reach nothing.
--
-- Safe to run repeatedly, and on plain Postgres where the Supabase roles and
-- publication do not exist. `pnpm db:push` runs it after every schema push so
-- that new tables are covered.

DO $$
DECLARE
  target record;
BEGIN
  FOR target IN
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', target.tablename);
  END LOOP;

  -- Defense in depth: the Supabase API roles also lose their table grants,
  -- for existing tables and for tables this role creates later.
  FOR target IN
    SELECT rolname FROM pg_roles WHERE rolname IN ('anon', 'authenticated')
  LOOP
    EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA public FROM %I', target.rolname);
    EXECUTE format('REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM %I', target.rolname);
    EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM %I', target.rolname);
    EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM %I', target.rolname);
  END LOOP;

  -- Nothing subscribes to row changes, so no table should be broadcast.
  FOR target IN
    SELECT tablename
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public'
  LOOP
    EXECUTE format('ALTER PUBLICATION supabase_realtime DROP TABLE public.%I', target.tablename);
  END LOOP;
END
$$;
