CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  created_at integer NOT NULL DEFAULT (unixepoch()),
  username text UNIQUE NOT NULL,
  password_hash blob NOT NULL,
  is_admin integer NOT NULL DEFAULT false,
  version integer NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS tokens (
  hash blob PRIMARY KEY,
  user_id integer,
  expiry integer not null,
  scope text NOT NULL,
  family blob NOT NULL,
  is_revoked integer NOT NULL DEFAULT false,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
