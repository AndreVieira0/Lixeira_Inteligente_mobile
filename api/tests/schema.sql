\set ON_ERROR_STOP on
BEGIN;
CREATE FUNCTION pg_temp.assert_true(ok boolean, label text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN IF ok IS DISTINCT FROM true THEN RAISE EXCEPTION 'FAIL: %', label; END IF; END; $$;
CREATE FUNCTION pg_temp.expect_error(statement text, expected text) RETURNS void LANGUAGE plpgsql AS $$
DECLARE actual text;
BEGIN
  BEGIN EXECUTE statement; EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS actual = RETURNED_SQLSTATE;
    IF actual = expected THEN RETURN; END IF;
    RAISE EXCEPTION 'Expected %, got %: %', expected, actual, statement;
  END;
  RAISE EXCEPTION 'Expected failure: %', statement;
END; $$;

INSERT INTO public."user" (id,name,email) VALUES ('u1','Ana','ana@example.test'),('u2','Bia','bia@example.test');
SELECT pg_temp.expect_error($q$INSERT INTO public."user" (id,name,email) VALUES ('u3','Ana','ANA@example.test')$q$,'23505');
INSERT INTO app.bins (id,owner_id,device_id,name) VALUES
 ('10000000-0000-4000-8000-000000000001','u1','BIN-001','Coordenacao'),
 ('10000000-0000-4000-8000-000000000002','u1','BIN-002','Biblioteca'),
 ('10000000-0000-4000-8000-000000000003','u2','BIN-003','Patio');
SELECT pg_temp.assert_true((SELECT count(*) = 2 FROM app.bin_current_state WHERE owner_id='u1'),'varias lixeiras por conta');
SELECT pg_temp.assert_true((SELECT level_percent IS NULL AND battery_percent IS NULL AND last_seen_at IS NULL FROM app.bin_current_state WHERE device_id='BIN-002'),'ausencia de leitura nao e zero');
SELECT pg_temp.expect_error($q$INSERT INTO app.bins(owner_id,device_id,name) VALUES ('missing','BIN-004','X')$q$,'23503');
SELECT pg_temp.expect_error($q$INSERT INTO app.bins(owner_id,device_id,name) VALUES ('u2','BIN-001','X')$q$,'23505');
SELECT pg_temp.expect_error($q$INSERT INTO app.bins(owner_id,device_id,name) VALUES ('u1','BIN-004','   ')$q$,'23514');
SELECT pg_temp.expect_error($q$UPDATE app.bins SET device_id='NEW-ID' WHERE device_id='BIN-001'$q$,'23514');
SELECT pg_temp.expect_error($q$UPDATE app.bins SET owner_id='u2' WHERE device_id='BIN-001'$q$,'23514');
UPDATE app.bins SET name='Novo nome',location='Bloco A' WHERE device_id='BIN-001';
SELECT pg_temp.assert_true((SELECT id='10000000-0000-4000-8000-000000000001'::uuid FROM app.bins WHERE name='Novo nome'),'nome preserva identidade');

INSERT INTO app.measurements VALUES
 ('10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001',90,NULL,'2026-10-14 10:00Z','2026-10-14 10:01Z'),
 ('10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000002',15,70,'2026-10-14 11:00Z','2026-10-14 11:01Z'),
 ('10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000003',85,80,'2026-10-14 09:00Z','2026-10-14 12:00Z');
SELECT pg_temp.assert_true((SELECT level_percent=15 AND battery_percent=70 AND last_seen_at='2026-10-14 12:00Z'::timestamptz FROM app.bin_current_state WHERE device_id='BIN-001'),'esvaziamento e atraso preservam leitura atual e comunicacao');
SELECT pg_temp.expect_error($q$INSERT INTO app.measurements (bin_id,event_id,level_percent,measured_at) VALUES ('10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000002',55,now())$q$,'23505');
SELECT pg_temp.expect_error($q$INSERT INTO app.measurements (bin_id,event_id,level_percent,measured_at) VALUES ('10000000-0000-4000-8000-000000000001',gen_random_uuid(),101,now())$q$,'23514');
SELECT pg_temp.expect_error($q$INSERT INTO app.measurements (bin_id,event_id,level_percent,battery_percent,measured_at) VALUES ('10000000-0000-4000-8000-000000000001',gen_random_uuid(),0,-1,now())$q$,'23514');
SELECT pg_temp.expect_error($q$INSERT INTO app.measurements (bin_id,event_id,level_percent,measured_at) VALUES ('10000000-0000-4000-8000-000000000001',gen_random_uuid(),'NaN',now())$q$,'23514');
SELECT pg_temp.expect_error($q$INSERT INTO app.measurements (bin_id,event_id,level_percent,measured_at) VALUES ('10000000-0000-4000-8000-000000000001',gen_random_uuid(),0,now()+interval '1 day')$q$,'23514');
SELECT pg_temp.expect_error($q$DELETE FROM public."user" WHERE id='u1'$q$,'23503');

INSERT INTO app.device_credentials(bin_id,secret_hash) VALUES ('10000000-0000-4000-8000-000000000001',repeat('a',64));
SELECT pg_temp.expect_error($q$INSERT INTO app.device_credentials(bin_id,secret_hash) VALUES ('10000000-0000-4000-8000-000000000001',repeat('b',64))$q$,'23505');
UPDATE app.device_credentials SET revoked_at=clock_timestamp();
INSERT INTO app.device_credentials(bin_id,secret_hash) VALUES ('10000000-0000-4000-8000-000000000001',repeat('b',64));
SELECT pg_temp.assert_true((SELECT count(*)=1 FROM app.device_credentials WHERE revoked_at IS NULL),'rotacao de credencial');
SELECT pg_temp.expect_error($q$INSERT INTO app.device_credentials(bin_id,secret_hash) VALUES ('10000000-0000-4000-8000-000000000002','senha-em-texto')$q$,'23514');

-- Retencao: manter a leitura atual mesmo que seja antiga.
DELETE FROM app.measurements m WHERE received_at < '2027-01-01Z'::timestamptz
AND NOT EXISTS (SELECT 1 FROM app.bin_current_state s WHERE s.bin_id=m.bin_id AND s.event_id=m.event_id)
AND EXISTS (SELECT 1 FROM app.measurements newer WHERE newer.bin_id=m.bin_id AND newer.received_at > m.received_at);
SELECT pg_temp.assert_true((SELECT level_percent=15 AND last_seen_at='2026-10-14 12:00Z'::timestamptz FROM app.bin_current_state WHERE device_id='BIN-001'),'retencao preserva atual e ultima comunicacao');
SELECT pg_temp.assert_true((SELECT count(*)=2 FROM app.measurements),'retencao remove somente evento antigo nao protegido');

INSERT INTO public.session(id,"userId",token,"expiresAt") VALUES ('s1','u2','test-session',now()+interval '1 day');
DELETE FROM app.bins WHERE owner_id='u2';
DELETE FROM public."user" WHERE id='u2';
SELECT pg_temp.assert_true((SELECT count(*)=0 FROM public.session WHERE "userId"='u2'),'sessao removida junto da conta sem lixeiras');
ROLLBACK;
SELECT 'PASS: schema, integridade, ordenacao, credenciais e retencao' AS result;
