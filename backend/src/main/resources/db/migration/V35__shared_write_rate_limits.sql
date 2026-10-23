CREATE TABLE app.security_rate_windows (
    actor_hash varchar(64) NOT NULL,
    window_start bigint NOT NULL,
    attempts integer NOT NULL CHECK (attempts > 0),
    PRIMARY KEY (actor_hash, window_start)
);
CREATE INDEX security_rate_windows_expiry ON app.security_rate_windows(window_start);
