ALTER TABLE app.users ADD COLUMN avatar_url varchar(500);

ALTER TABLE app.player_profiles
  ADD COLUMN preferred_display_name varchar(120),
  ADD COLUMN avatar_url varchar(500);

CREATE TABLE app.partner_businesses (
  id uuid PRIMARY KEY,
  name varchar(160) NOT NULL,
  category varchar(30) NOT NULL CHECK (category IN ('CHOPERIA','RESTAURANT','SPORTS_BAR','OTHER')),
  zone varchar(180) NOT NULL,
  image_url varchar(500),
  status varchar(20) NOT NULL CHECK (status IN ('DRAFT','PUBLISHED','ARCHIVED')),
  created_by uuid NOT NULL REFERENCES app.users(id),
  updated_by uuid NOT NULL REFERENCES app.users(id),
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  version bigint NOT NULL DEFAULT 0
);

CREATE INDEX idx_partner_businesses_public
  ON app.partner_businesses (status, category, name);
