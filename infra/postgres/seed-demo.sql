\set ON_ERROR_STOP on
BEGIN;

-- The demo organization is disposable. Rebuild only its operational data so
-- manually created venues, spaces, schedules and reservations do not leak into tests.
-- The seed can run before the backend has applied the newest Flyway migration.
-- Use dynamic SQL so PostgreSQL does not resolve an optional table eagerly.
DO $seed$
BEGIN
  IF to_regclass('app.match_join_orders') IS NOT NULL THEN
    EXECUTE $sql$
      DELETE FROM app.match_join_orders
      WHERE match_id IN (
        SELECT id FROM app.sports_matches
        WHERE organization_id = '20000000-0000-0000-0000-000000000001'
      )
    $sql$;
  END IF;
END
$seed$;
DELETE FROM app.payment_status_history
WHERE payment_order_id IN (
  SELECT payment.id
  FROM app.payment_orders payment
  JOIN app.reservations reservation ON reservation.id = payment.reservation_id
  WHERE reservation.organization_id = '20000000-0000-0000-0000-000000000001'
);
DELETE FROM app.payment_orders
WHERE reservation_id IN (
  SELECT id FROM app.reservations
  WHERE organization_id = '20000000-0000-0000-0000-000000000001'
);
DELETE FROM app.match_participants
WHERE match_id IN (
  SELECT id FROM app.sports_matches
  WHERE organization_id = '20000000-0000-0000-0000-000000000001'
);
DELETE FROM app.sports_matches
WHERE organization_id = '20000000-0000-0000-0000-000000000001';
DELETE FROM app.reservation_status_history
WHERE organization_id = '20000000-0000-0000-0000-000000000001';
DELETE FROM app.reservations
WHERE organization_id = '20000000-0000-0000-0000-000000000001';
DELETE FROM app.availability_exceptions
WHERE organization_id = '20000000-0000-0000-0000-000000000001';
DELETE FROM app.availability_rules
WHERE organization_id = '20000000-0000-0000-0000-000000000001';
DELETE FROM app.sport_space_amenities
WHERE organization_id = '20000000-0000-0000-0000-000000000001';
DELETE FROM app.venue_amenities
WHERE organization_id = '20000000-0000-0000-0000-000000000001';
DELETE FROM app.sport_spaces
WHERE organization_id = '20000000-0000-0000-0000-000000000001';
DELETE FROM app.venues
WHERE organization_id = '20000000-0000-0000-0000-000000000001';
DELETE FROM app.organization_invitations
WHERE organization_id = '20000000-0000-0000-0000-000000000001';
DELETE FROM app.organization_memberships
WHERE organization_id = '20000000-0000-0000-0000-000000000001';
DELETE FROM app.organizations
WHERE id = '20000000-0000-0000-0000-000000000001';

INSERT INTO app.users (id, identity_subject, email, email_verified, display_name, status, created_at, updated_at, version)
VALUES
  ('10000000-0000-0000-0000-000000000001', :'player_subject', :'player_email', true, 'Jugador Local', 'ACTIVE', now(), now(), 0),
  ('10000000-0000-0000-0000-000000000006', :'organizer_subject', :'organizer_email', true, 'Organizador Local', 'ACTIVE', now(), now(), 0),
  ('10000000-0000-0000-0000-000000000002', :'owner_subject', :'owner_email', true, 'Propietario Demo', 'ACTIVE', now(), now(), 0),
  ('10000000-0000-0000-0000-000000000003', :'admin_subject', :'admin_email', true, 'Administrador Demo', 'ACTIVE', now(), now(), 0),
  ('10000000-0000-0000-0000-000000000004', :'operator_subject', :'operator_email', true, 'Operador Demo', 'ACTIVE', now(), now(), 0),
  ('10000000-0000-0000-0000-000000000005', :'platform_admin_subject', :'platform_admin_email', true, 'Administrador Plataforma', 'ACTIVE', now(), now(), 0)
ON CONFLICT (identity_subject) DO UPDATE SET email = EXCLUDED.email, email_verified = true,
  display_name = EXCLUDED.display_name, status = 'ACTIVE', updated_at = now();

INSERT INTO app.player_profiles (user_id, home_district_code, bio, visibility, onboarding_status)
SELECT users.id, demo.district_code, demo.bio, demo.visibility, 'COMPLETE'
FROM (VALUES
  (:'player_subject', 'PIURA', 'Jugador disponible para partidos en Piura.', 'PUBLIC'),
  (:'organizer_subject', 'PIURA', 'Organizador de partidos abiertos en Piura.', 'PUBLIC'),
  (:'owner_subject', 'PIURA', 'Propietario del complejo deportivo de demostración.', 'PARTICIPANTS'),
  (:'admin_subject', 'CASTILLA', 'Administrador de la organización de demostración.', 'PARTICIPANTS'),
  (:'operator_subject', 'VEINTISEIS_DE_OCTUBRE', 'Operador de reservas y atención.', 'PARTICIPANTS'),
  (:'platform_admin_subject', 'PIURA', 'Administración excepcional de la plataforma.', 'PRIVATE')
) AS demo(identity_subject, district_code, bio, visibility)
JOIN app.users users ON users.identity_subject = demo.identity_subject
ON CONFLICT (user_id) DO UPDATE SET home_district_code = EXCLUDED.home_district_code,
  bio = EXCLUDED.bio, visibility = EXCLUDED.visibility, onboarding_status = 'COMPLETE';

INSERT INTO app.capability_requests (
  id, user_id, capability, status, reason, reviewed_by, review_note,
  created_at, reviewed_at, updated_at, version)
VALUES
  ('a0000000-0000-0000-0000-000000000001',
   '10000000-0000-0000-0000-000000000001', 'MATCH_ORGANIZER', 'PENDING',
   'Quiero organizar partidos abiertos de futbol 7 en Piura.', null, null,
   now(), null, now(), 0),
  ('a0000000-0000-0000-0000-000000000002',
   '10000000-0000-0000-0000-000000000004', 'VENUE_OWNER', 'PENDING',
   'Quiero publicar y administrar horarios de mi cancha.', null, null,
   now(), null, now(), 0),
  ('a0000000-0000-0000-0000-000000000003',
   '10000000-0000-0000-0000-000000000006', 'MATCH_ORGANIZER', 'APPROVED',
   'Organizador local habilitado para validar el flujo completo.',
   '10000000-0000-0000-0000-000000000005', 'Cuenta local de demostración aprobada.',
   now(), now(), now(), 0)
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, reason = EXCLUDED.reason,
  reviewed_by = EXCLUDED.reviewed_by, reviewed_at = EXCLUDED.reviewed_at,
  review_note = EXCLUDED.review_note, updated_at = now();

INSERT INTO app.organizations (id, name, slug, status, created_by, created_at, updated_at, version, timezone)
VALUES ('20000000-0000-0000-0000-000000000001', 'Complejo Deportivo Pulso Piura',
  'complejo-deportivo-pulso-piura', 'ACTIVE',
  (SELECT id FROM app.users WHERE identity_subject = :'owner_subject'), now(), now(), 0, 'America/Lima')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = 'ACTIVE', updated_at = now(), timezone = 'America/Lima';

INSERT INTO app.organization_memberships (id, organization_id, user_id, role, status, created_at, revoked_at, version)
VALUES
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', (SELECT id FROM app.users WHERE identity_subject = :'owner_subject'), 'OWNER', 'ACTIVE', now(), null, 0),
  ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', (SELECT id FROM app.users WHERE identity_subject = :'admin_subject'), 'ADMIN', 'ACTIVE', now(), null, 0),
  ('30000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001', (SELECT id FROM app.users WHERE identity_subject = :'operator_subject'), 'OPERATOR', 'ACTIVE', now(), null, 0)
ON CONFLICT (organization_id, user_id) DO UPDATE SET role = EXCLUDED.role, status = 'ACTIVE', revoked_at = null;

INSERT INTO app.venues (id, organization_id, name, slug, public_slug, address, district_code,
  latitude, longitude, public_phone, status, created_by, created_at, updated_at, version)
VALUES
  ('40000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Pulso Arena Piura', 'pulso-arena-piura', 'pulso-arena-piura-demo', 'Av. Los Ejidos 450, Piura', 'PIURA', -5.181900, -80.638800, '999111222', 'PUBLISHED', (SELECT id FROM app.users WHERE identity_subject = :'owner_subject'), now(), now(), 0),
  ('40000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', 'Pulso Club Castilla', 'pulso-club-castilla', 'pulso-club-castilla-demo', 'Av. Progreso 820, Castilla', 'CASTILLA', -5.204300, -80.621200, '999333444', 'PUBLISHED', (SELECT id FROM app.users WHERE identity_subject = :'owner_subject'), now(), now(), 0)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, address = EXCLUDED.address,
  district_code = EXCLUDED.district_code, latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  public_phone = EXCLUDED.public_phone, status = 'PUBLISHED', updated_at = now();

INSERT INTO app.sport_spaces (id, organization_id, venue_id, name, sport_code, format_code, capacity,
  surface_type, indoor, status, created_by, created_at, updated_at, version)
VALUES
  ('50000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'Cancha Norte Fútbol 7', 'FOOTBALL', 'FOOTBALL_7', 14, 'SYNTHETIC_GRASS', false, 'PUBLISHED', (SELECT id FROM app.users WHERE identity_subject = :'owner_subject'), now(), now(), 0),
  ('50000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'Cancha Vóley Mixto', 'VOLLEYBALL', 'VOLLEYBALL_6', 12, 'POLISHED_CONCRETE', false, 'PUBLISHED', (SELECT id FROM app.users WHERE identity_subject = :'owner_subject'), now(), now(), 0),
  ('50000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000002', 'Cancha Castilla Fútbol 5', 'FOOTBALL', 'FOOTBALL_5', 10, 'SYNTHETIC_GRASS', false, 'PUBLISHED', (SELECT id FROM app.users WHERE identity_subject = :'owner_subject'), now(), now(), 0)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, capacity = EXCLUDED.capacity,
  surface_type = EXCLUDED.surface_type, indoor = EXCLUDED.indoor, status = 'PUBLISHED', updated_at = now();

INSERT INTO app.venue_amenities (id, organization_id, venue_id, amenity_code) VALUES
  ('60000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'PARKING'),
  ('60000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'LOCKER_ROOMS'),
  ('60000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000002', 'SHOWERS')
ON CONFLICT (venue_id, amenity_code) DO NOTHING;

INSERT INTO app.sport_space_amenities (id, organization_id, sport_space_id, amenity_code) VALUES
  ('70000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 'LED_LIGHTING'),
  ('70000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 'BIBS_INCLUDED'),
  ('70000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000002', 'BALLS_INCLUDED'),
  ('70000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000003', 'LED_LIGHTING')
ON CONFLICT (sport_space_id, amenity_code) DO NOTHING;

INSERT INTO app.availability_rules (id, organization_id, sport_space_id, day_of_week, start_local_time,
  end_local_time, slot_minutes, price_minor, currency, valid_from, valid_to, status,
  created_by, created_at, updated_at, version)
SELECT md5(space.id::text || ':' || weekdays.day_of_week::text)::uuid,
  '20000000-0000-0000-0000-000000000001', space.id, weekdays.day_of_week,
  time '08:00', time '23:00', 60, space.price_minor, 'PEN', current_date, null, 'ACTIVE',
  (SELECT id FROM app.users WHERE identity_subject = :'owner_subject'), now(), now(), 0
FROM (VALUES
  ('50000000-0000-0000-0000-000000000001'::uuid, 9000::bigint),
  ('50000000-0000-0000-0000-000000000002'::uuid, 6000::bigint),
  ('50000000-0000-0000-0000-000000000003'::uuid, 7000::bigint)
) AS space(id, price_minor)
CROSS JOIN generate_series(1, 7) AS weekdays(day_of_week)
ON CONFLICT (id) DO UPDATE SET start_local_time = EXCLUDED.start_local_time,
  end_local_time = EXCLUDED.end_local_time, slot_minutes = EXCLUDED.slot_minutes,
  price_minor = EXCLUDED.price_minor, currency = 'PEN', valid_from = EXCLUDED.valid_from,
  valid_to = null, status = 'ACTIVE', updated_at = now();

INSERT INTO app.reservations (
  id, organization_id, sport_space_id, customer_user_id, starts_at, ends_at, status,
  total_minor, deposit_minor, currency, expires_at, idempotency_key, request_fingerprint,
  created_at, updated_at, version)
VALUES (
  '80000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001',
  '50000000-0000-0000-0000-000000000001',
  (SELECT id FROM app.users WHERE identity_subject = :'organizer_subject'),
  ((current_date + 1 + time '20:00') AT TIME ZONE 'America/Lima'),
  ((current_date + 1 + time '21:00') AT TIME ZONE 'America/Lima'),
  'CONFIRMED', 9000, 0, 'PEN', null, 'demo-match-reservation', repeat('a', 64),
  now(), now(), 0)
ON CONFLICT (id) DO UPDATE SET
  starts_at = EXCLUDED.starts_at,
  ends_at = EXCLUDED.ends_at,
  status = 'CONFIRMED',
  expires_at = null,
  updated_at = now();

INSERT INTO app.sports_matches (
  id, public_slug, organization_id, reservation_id, sport_space_id, organizer_user_id,
  title, sport_code, format_code, skill_level, min_players, max_players, organizer_counts,
  price_minor, currency, visibility, cancellation_policy, starts_at, ends_at, status,
  published_at, created_at, updated_at, version)
VALUES (
  '90000000-0000-0000-0000-000000000001', 'futbol-7-los-ejidos-demo',
  '20000000-0000-0000-0000-000000000001',
  '80000000-0000-0000-0000-000000000001',
  '50000000-0000-0000-0000-000000000001',
  (SELECT id FROM app.users WHERE identity_subject = :'organizer_subject'),
  'Fútbol 7 · Los Ejidos', 'FOOTBALL', 'FOOTBALL_7', 'INTERMEDIATE', 8, 10, false,
  1500, 'PEN', 'PUBLIC', 'Cancelación permitida hasta dos horas antes del partido.',
  ((current_date + 1 + time '20:00') AT TIME ZONE 'America/Lima'),
  ((current_date + 1 + time '21:00') AT TIME ZONE 'America/Lima'),
  'PUBLISHED', now(), now(), now(), 0)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  starts_at = EXCLUDED.starts_at,
  ends_at = EXCLUDED.ends_at,
  status = 'PUBLISHED',
  visibility = 'PUBLIC',
  published_at = COALESCE(app.sports_matches.published_at, now()),
  updated_at = now();

COMMIT;
