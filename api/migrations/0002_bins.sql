BEGIN;
CREATE SCHEMA app;

CREATE TABLE app.bins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id text NOT NULL REFERENCES public."user"(id) ON DELETE RESTRICT,
  device_id text NOT NULL UNIQUE,
  name text NOT NULL,
  location text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  disabled_at timestamptz,
  CONSTRAINT bins_device_id_valid CHECK (device_id ~ '^[A-Za-z0-9][A-Za-z0-9_-]{2,63}$'),
  CONSTRAINT bins_name_valid CHECK (char_length(btrim(name)) BETWEEN 1 AND 80),
  CONSTRAINT bins_location_valid CHECK (location IS NULL OR char_length(btrim(location)) BETWEEN 1 AND 100)
);
CREATE INDEX bins_owner_idx ON app.bins (owner_id, created_at, id);

CREATE FUNCTION app.touch_bin() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id OR NEW.device_id IS DISTINCT FROM OLD.device_id THEN
    RAISE EXCEPTION 'A identidade do dispositivo e imutavel' USING ERRCODE = '23514';
  END IF;
  IF NEW.owner_id IS DISTINCT FROM OLD.owner_id THEN
    RAISE EXCEPTION 'Transferencia de propriedade fora do escopo do MVP' USING ERRCODE = '23514';
  END IF;
  NEW.updated_at := clock_timestamp();
  RETURN NEW;
END;
$$;
CREATE TRIGGER bins_before_update BEFORE UPDATE ON app.bins
FOR EACH ROW EXECUTE FUNCTION app.touch_bin();

CREATE TABLE app.device_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bin_id uuid NOT NULL REFERENCES app.bins(id) ON DELETE CASCADE,
  secret_hash text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  CONSTRAINT credentials_hash_valid CHECK (secret_hash ~ '^[0-9a-f]{64}$'),
  CONSTRAINT credentials_dates_valid CHECK (revoked_at IS NULL OR revoked_at >= created_at)
);
CREATE UNIQUE INDEX credentials_one_active_idx ON app.device_credentials (bin_id) WHERE revoked_at IS NULL;
CREATE INDEX credentials_bin_idx ON app.device_credentials (bin_id);

CREATE TABLE app.measurements (
  bin_id uuid NOT NULL REFERENCES app.bins(id) ON DELETE CASCADE,
  event_id uuid NOT NULL,
  level_percent numeric(5,2) NOT NULL,
  battery_percent numeric(5,2),
  measured_at timestamptz NOT NULL,
  received_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (bin_id, event_id),
  CONSTRAINT measurements_level_valid CHECK (level_percent BETWEEN 0 AND 100),
  CONSTRAINT measurements_battery_valid CHECK (battery_percent IS NULL OR battery_percent BETWEEN 0 AND 100),
  CONSTRAINT measurements_time_finite CHECK (isfinite(measured_at) AND isfinite(received_at)),
  CONSTRAINT measurements_future_limit CHECK (measured_at <= received_at + interval '5 minutes')
);
CREATE INDEX measurements_latest_idx ON app.measurements (bin_id, measured_at DESC, received_at DESC, event_id DESC);
CREATE INDEX measurements_received_idx ON app.measurements (bin_id, received_at DESC);
CREATE INDEX measurements_retention_idx ON app.measurements (received_at);

-- Estado atual derivado: uma linha por lixeira, mesmo sem medicao.
-- A API SEMPRE filtra owner_id usando a sessao validada no servidor.
CREATE VIEW app.bin_current_state AS
SELECT b.id AS bin_id, b.owner_id, b.device_id, b.name, b.location, b.disabled_at,
       latest.event_id, latest.level_percent, latest.battery_percent,
       latest.measured_at, latest.received_at,
       communication.received_at AS last_seen_at
FROM app.bins b
LEFT JOIN LATERAL (
  SELECT m.event_id, m.level_percent, m.battery_percent, m.measured_at, m.received_at
  FROM app.measurements m WHERE m.bin_id = b.id
  ORDER BY m.measured_at DESC, m.received_at DESC, m.event_id DESC LIMIT 1
) latest ON true
LEFT JOIN LATERAL (
  SELECT m.received_at FROM app.measurements m WHERE m.bin_id = b.id
  ORDER BY m.received_at DESC LIMIT 1
) communication ON true;

-- Sem acesso por roles anonimas ou cliente. Provisionar role da API na APP-04.
REVOKE ALL ON SCHEMA app FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA app FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA app FROM PUBLIC;
COMMIT;
