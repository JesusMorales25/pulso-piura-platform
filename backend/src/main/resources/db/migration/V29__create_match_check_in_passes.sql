CREATE TABLE app.match_check_in_passes (
  participant_id uuid PRIMARY KEY REFERENCES app.match_participants(id) ON DELETE CASCADE,
  token_hash char(64) NOT NULL UNIQUE,
  issued_at timestamptz NOT NULL,
  valid_until timestamptz NOT NULL,
  consumed_at timestamptz,
  consumed_by uuid REFERENCES app.users(id),
  CONSTRAINT chk_match_check_in_pass_times CHECK (issued_at < valid_until),
  CONSTRAINT chk_match_check_in_pass_consumption CHECK (
    (consumed_at IS NULL AND consumed_by IS NULL) OR
    (consumed_at IS NOT NULL AND consumed_by IS NOT NULL)
  )
);

CREATE INDEX idx_match_check_in_passes_validity
  ON app.match_check_in_passes (valid_until)
  WHERE consumed_at IS NULL;
