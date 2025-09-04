CREATE USER gov-ai WITH PASSWORD 'gov-ai'; -- # pragma: allowlist-secret
ALTER USER gov-ai CREATEDB;
CREATE DATABASE gov_ai_local;
GRANT ALL PRIVILEGES ON DATABASE gov_ai_local TO gov-ai;

ALTER DATABASE gov_ai_local OWNER TO gov-ai;
--needed to create extension
ALTER ROLE gov-ai SUPERUSER;