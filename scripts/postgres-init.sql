CREATE USER govai WITH PASSWORD 'govai'; -- # pragma: allowlist-secret
ALTER USER govai CREATEDB;
CREATE DATABASE gov_ai_local;
GRANT ALL PRIVILEGES ON DATABASE gov_ai_local TO govai;

ALTER DATABASE gov_ai_local OWNER TO govai;
--needed to create extension
ALTER ROLE govai SUPERUSER;