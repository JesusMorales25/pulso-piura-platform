ALTER TABLE app.organizations ADD COLUMN district_code varchar(60), ADD COLUMN address varchar(240);
CREATE UNIQUE INDEX uq_organizations_name_location ON app.organizations
 (lower(regexp_replace(btrim(name), '\s+', ' ', 'g')),
  lower(regexp_replace(btrim(district_code), '\s+', ' ', 'g')),
  lower(regexp_replace(btrim(address), '\s+', ' ', 'g')))
 WHERE district_code IS NOT NULL AND address IS NOT NULL AND status = 'ACTIVE';

-- Preserve legacy rows; guard new writes without deleting or renaming existing complexes.
CREATE FUNCTION app.guard_venue_location_duplicate() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE identity_key text;
BEGIN
  IF NEW.status = 'ARCHIVED' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND NEW.name = OLD.name AND NEW.address = OLD.address
     AND NEW.district_code = OLD.district_code AND NEW.status = OLD.status THEN RETURN NEW; END IF;
  identity_key := lower(regexp_replace(btrim(NEW.name), '\s+', ' ', 'g')) || '|' ||
                  lower(regexp_replace(btrim(NEW.district_code), '\s+', ' ', 'g')) || '|' ||
                  lower(regexp_replace(btrim(NEW.address), '\s+', ' ', 'g'));
  PERFORM pg_advisory_xact_lock(hashtextextended(identity_key, 0));
  IF EXISTS (SELECT 1 FROM app.venues v WHERE v.id <> NEW.id AND v.status <> 'ARCHIVED'
      AND lower(regexp_replace(btrim(v.name), '\s+', ' ', 'g')) = lower(regexp_replace(btrim(NEW.name), '\s+', ' ', 'g'))
      AND lower(regexp_replace(btrim(v.district_code), '\s+', ' ', 'g')) = lower(regexp_replace(btrim(NEW.district_code), '\s+', ' ', 'g'))
      AND lower(regexp_replace(btrim(v.address), '\s+', ' ', 'g')) = lower(regexp_replace(btrim(NEW.address), '\s+', ' ', 'g'))) THEN
    RAISE EXCEPTION 'Ya existe un complejo con este nombre y ubicación' USING ERRCODE = '23505', CONSTRAINT = 'uq_venue_location';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER guard_venue_location_duplicate BEFORE INSERT OR UPDATE ON app.venues
 FOR EACH ROW EXECUTE FUNCTION app.guard_venue_location_duplicate();
