ALTER TABLE app.partner_businesses
  DROP CONSTRAINT IF EXISTS chk_partner_businesses_published_complete;

ALTER TABLE app.partner_businesses
  ADD CONSTRAINT chk_partner_businesses_published_contact
    CHECK (
      status <> 'PUBLISHED'
      OR (contact_phone IS NOT NULL AND btrim(contact_phone) <> '')
    );
