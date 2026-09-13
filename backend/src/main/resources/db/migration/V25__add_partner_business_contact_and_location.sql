ALTER TABLE app.partner_businesses
  ADD COLUMN description varchar(500),
  ADD COLUMN contact_phone varchar(30),
  ADD COLUMN latitude numeric(9, 6),
  ADD COLUMN longitude numeric(9, 6),
  ADD CONSTRAINT chk_partner_businesses_latitude
    CHECK (latitude IS NULL OR latitude BETWEEN -90 AND 90),
  ADD CONSTRAINT chk_partner_businesses_longitude
    CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180),
  ADD CONSTRAINT chk_partner_businesses_coordinate_pair
    CHECK ((latitude IS NULL) = (longitude IS NULL));

-- Los registros creados antes de incorporar contacto y coordenadas vuelven a borrador
-- para que no permanezcan públicos con acciones incompletas.
UPDATE app.partner_businesses
SET status = 'DRAFT', updated_at = now(), version = version + 1
WHERE status = 'PUBLISHED'
  AND (contact_phone IS NULL OR latitude IS NULL);

ALTER TABLE app.partner_businesses
  ADD CONSTRAINT chk_partner_businesses_published_complete
    CHECK (
      status <> 'PUBLISHED'
      OR (
        contact_phone IS NOT NULL
        AND btrim(contact_phone) <> ''
        AND latitude IS NOT NULL
        AND longitude IS NOT NULL
      )
    );
