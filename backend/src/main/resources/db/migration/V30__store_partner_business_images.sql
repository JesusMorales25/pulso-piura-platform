ALTER TABLE app.partner_businesses
  ADD COLUMN image_content bytea,
  ADD COLUMN image_content_type varchar(50);

ALTER TABLE app.partner_businesses
  ADD CONSTRAINT chk_partner_businesses_image_pair
    CHECK ((image_content IS NULL) = (image_content_type IS NULL));
