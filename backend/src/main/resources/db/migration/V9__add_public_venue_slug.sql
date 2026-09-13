ALTER TABLE app.venues ADD COLUMN public_slug varchar(120);

UPDATE app.venues
SET public_slug = slug || '-' || left(replace(id::text, '-', ''), 8);

ALTER TABLE app.venues
  ALTER COLUMN public_slug SET NOT NULL,
  ADD CONSTRAINT uq_venues_public_slug UNIQUE (public_slug);

