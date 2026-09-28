ALTER TABLE app.venues
  ADD COLUMN admin_rating numeric(2,1),
  ADD COLUMN admin_rating_count integer;

ALTER TABLE app.venues
  ADD CONSTRAINT chk_venues_admin_rating_range
    CHECK (admin_rating IS NULL OR (admin_rating >= 0 AND admin_rating <= 5)),
  ADD CONSTRAINT chk_venues_admin_rating_count
    CHECK (admin_rating_count IS NULL OR admin_rating_count >= 0),
  ADD CONSTRAINT chk_venues_admin_rating_pair
    CHECK ((admin_rating IS NULL) = (admin_rating_count IS NULL));
