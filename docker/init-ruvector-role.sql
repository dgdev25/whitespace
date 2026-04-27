-- Create ruvector role if it doesn't exist
DO $$ BEGIN
  CREATE ROLE ruvector WITH LOGIN PASSWORD 'ruvector';
EXCEPTION WHEN DUPLICATE_OBJECT THEN
  NULL;
END $$;
