CREATE TABLE app.audit_events (
  id uuid PRIMARY KEY,
  occurred_at timestamptz NOT NULL,
  actor_user_id uuid REFERENCES app.users(id),
  organization_id uuid,
  action varchar(80) NOT NULL,
  resource_type varchar(80) NOT NULL,
  resource_id uuid,
  result varchar(30) NOT NULL,
  correlation_id varchar(100),
  source_ip_hash varchar(128),
  metadata_json jsonb
);
CREATE INDEX idx_audit_actor_time ON app.audit_events(actor_user_id, occurred_at DESC);
