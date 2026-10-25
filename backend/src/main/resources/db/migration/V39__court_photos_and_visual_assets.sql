CREATE TABLE app.sport_space_photos (
    id uuid PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES app.organizations(id),
    space_id uuid NOT NULL,
    storage_key varchar(64) NOT NULL UNIQUE,
    caption varchar(200) NOT NULL DEFAULT '',
    cover boolean NOT NULL DEFAULT false,
    position integer NOT NULL CHECK (position >= 0),
    created_at timestamptz NOT NULL DEFAULT now(),
    FOREIGN KEY (space_id, organization_id) REFERENCES app.sport_spaces(id, organization_id)
);
CREATE UNIQUE INDEX sport_space_photo_cover ON app.sport_space_photos(space_id) WHERE cover;
CREATE INDEX sport_space_photos_order ON app.sport_space_photos(space_id, position, id);
CREATE TABLE app.platform_visual_assets (
    slot varchar(32) PRIMARY KEY CHECK (slot IN ('home-matches','home-venues','activity','create','complexes')),
    storage_key varchar(64) NOT NULL UNIQUE,
    updated_at timestamptz NOT NULL DEFAULT now()
);
