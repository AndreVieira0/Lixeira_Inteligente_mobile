BEGIN;
-- This private database belongs to this application. Runtime credentials are
-- provisioned separately; no passwords are stored in migrations.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'lixeira_api') THEN
    CREATE ROLE lixeira_api NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
  ELSIF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'lixeira_api'
    AND (rolcanlogin OR rolsuper OR rolcreatedb OR rolcreaterole OR rolreplication OR rolbypassrls)) THEN
    RAISE EXCEPTION 'Existing lixeira_api role is not a restricted group role';
  END IF;
END;
$$;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public, app TO lixeira_api;
GRANT SELECT ON public."user", public.session TO lixeira_api;
-- Better Auth removes an expired session when resolving its cookie.
GRANT DELETE ON public.session TO lixeira_api;
GRANT SELECT ON app.bins, app.bin_current_state TO lixeira_api;
GRANT UPDATE (name, location) ON app.bins TO lixeira_api;
CREATE INDEX bins_owner_cursor_idx ON app.bins (owner_id, id);
COMMIT;
