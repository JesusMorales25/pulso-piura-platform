CREATE TABLE app.users (
  id uuid PRIMARY KEY,
  identity_subject varchar(128) NOT NULL UNIQUE,
  email varchar(320),
  email_verified boolean NOT NULL DEFAULT false,
  display_name varchar(120) NOT NULL,
  status varchar(30) NOT NULL CHECK (status IN ('ACTIVE','SUSPENDED','DELETED')),
  last_login_at timestamptz,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  version bigint NOT NULL DEFAULT 0
);
CREATE INDEX idx_users_email_lower ON app.users (lower(email)) WHERE email IS NOT NULL;

CREATE TABLE app.player_profiles (
  user_id uuid PRIMARY KEY REFERENCES app.users(id),
  home_district_code varchar(30),
  bio varchar(500),
  visibility varchar(30) NOT NULL CHECK (visibility IN ('PRIVATE','PARTICIPANTS','PUBLIC')),
  onboarding_status varchar(30) NOT NULL CHECK (onboarding_status IN ('PENDING','COMPLETE'))
);

CREATE TABLE app.user_consents (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES app.users(id),
  terms_version varchar(30) NOT NULL,
  privacy_version varchar(30) NOT NULL,
  accepted_at timestamptz NOT NULL,
  UNIQUE(user_id, terms_version, privacy_version)
);
